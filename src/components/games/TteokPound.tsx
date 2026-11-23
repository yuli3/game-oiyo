import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, User, Users, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import {
  SAFE_POS, STAGES, STAGE_COUNT, TTEOK_SLUG, newMortar, pressMallet, releaseMallet, setTurner, starsFor, stepMortar, type Mortar, type StrikeResult,
} from "../../lib/games/tteok-pound";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const W = 360;
const H = 600;

const COPY: Record<L, {
  stage: string; goal: string; time: string; combo: string; solo: string; duo: string; win: string; lose: string; timeUp: string; again: string; next: string;
  help: string; help2: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; start: string; mallet: string; fold: string;
  hits: Record<StrikeResult, string>; fake: string; snap: string;
}> = {
  ko: {
    start: "누르고 있으면 떡메를 들어요", stage: "{0}단계", goal: "{0}/{1}번", time: "{0}초", combo: "{0}연속", solo: "혼자", duo: "둘이서",
    win: "쫄깃한 떡 완성!", lose: "손을 너무 많이 쳤어요", timeUp: "시간이 다 됐어요", again: "다시 하기", next: "다음 단계", mallet: "떡메", fold: "뒤집기",
    hits: { perfect: "척!", good: "좋아", weak: "살살…", unfolded: "안 뒤집었어요", ouch: "아야!" }, fake: "속임수", snap: "빠른 손",
    help: "누르고 있으면 떡메가 올라가고, 손을 떼면 내려칩니다. 짝꿍 손이 떡을 뒤집은 뒤 완전히 빠졌을 때 쳐야 하고, 손이 빠지자마자 치면 ‘척!’ 완벽 판정이에요. 손이 떡 위에서 머뭇거릴 때는 아직 위험해요.",
    help2: "둘이서: 왼쪽 절반을 누르면 떡메, 오른쪽 절반을 누르고 있으면 손이 들어가 떡을 뒤집습니다. 둘이 박자를 맞춰 목표만큼 쳐 보세요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    start: "Hold to lift the mallet", stage: "Stage {0}", goal: "{0}/{1}", time: "{0}s", combo: "{0} in a row", solo: "Solo", duo: "Two players",
    win: "Chewy rice cake done!", lose: "Too many squashed hands", timeUp: "Time's up", again: "Play again", next: "Next stage", mallet: "Mallet", fold: "Fold",
    hits: { perfect: "Thwack!", good: "Nice", weak: "Too soft…", unfolded: "Not folded", ouch: "Ouch!" }, fake: "Fake-outs", snap: "Quick hands",
    help: "Hold to lift the mallet and let go to bring it down. Strike only after your partner's hand has folded the dough and pulled fully away; strike right as it leaves for a perfect Thwack. A hand hovering over the dough is still in danger.",
    help2: "Two players: hold the left half for the mallet; hold the right half to put the hand in and fold. Find a rhythm together and reach the goal.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    start: "押し続けると杵が上がります", stage: "{0}面", goal: "{0}/{1}回", time: "{0}秒", combo: "{0}連続", solo: "ひとりで", duo: "2人で",
    win: "もちもちのお餅ができた！", lose: "手を打ちすぎました", timeUp: "時間切れ", again: "もう一度", next: "次の面", mallet: "杵", fold: "返し",
    hits: { perfect: "ペッタン！", good: "いいね", weak: "弱い…", unfolded: "返してない", ouch: "いたっ！" }, fake: "フェイント", snap: "素早い手",
    help: "押し続けると杵が上がり、離すと振り下ろします。相方の手が餅を返して完全に離れてから打ちましょう。離れた瞬間に打つと「ペッタン！」で完璧。餅の上で手が迷っているときはまだ危険です。",
    help2: "2人で：左半分を押すと杵、右半分を押し続けると手が入って餅を返します。2人で息を合わせて目標回数まで打ちましょう。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    start: "按住就会举起木槌", stage: "第{0}关", goal: "{0}/{1}下", time: "{0}秒", combo: "{0}连击", solo: "单人", duo: "双人",
    win: "软糯年糕做好了！", lose: "砸到手太多次了", timeUp: "时间到", again: "再玩一次", next: "下一关", mallet: "木槌", fold: "翻面",
    hits: { perfect: "啪！", good: "不错", weak: "太轻了…", unfolded: "还没翻", ouch: "哎哟！" }, fake: "假动作", snap: "快手",
    help: "按住举起木槌，松手砸下去。等搭档的手把年糕翻好并完全离开后再砸；手一离开就砸是“啪！”完美判定。手在年糕上方犹豫时仍然危险。",
    help2: "双人：按住左半边是木槌，按住右半边是手伸进去翻年糕。两人配合节奏，砸够目标次数。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    start: "Maintenez pour lever le maillet", stage: "Niveau {0}", goal: "{0}/{1}", time: "{0} s", combo: "{0} d'affilée", solo: "Solo", duo: "À deux",
    win: "Gâteau de riz bien moelleux !", lose: "Trop de mains écrasées", timeUp: "Temps écoulé", again: "Rejouer", next: "Niveau suivant", mallet: "Maillet", fold: "Pli",
    hits: { perfect: "Paf !", good: "Bien", weak: "Trop doux…", unfolded: "Pas plié", ouch: "Aïe !" }, fake: "Feintes", snap: "Mains rapides",
    help: "Maintenez pour lever le maillet, relâchez pour frapper. Frappez seulement quand la main de votre partenaire a plié la pâte et s'est bien retirée ; frappez au moment où elle part pour un Paf parfait. Une main qui hésite au-dessus de la pâte est encore en danger.",
    help2: "À deux : maintenez la moitié gauche pour le maillet, la moitié droite pour plonger la main et plier. Trouvez le rythme ensemble pour atteindre l'objectif.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    start: "Mantén pulsado para levantar el mazo", stage: "Nivel {0}", goal: "{0}/{1}", time: "{0} s", combo: "{0} seguidos", solo: "Solo", duo: "Dos jugadores",
    win: "¡Pastel de arroz listo!", lose: "Demasiados golpes en la mano", timeUp: "Se acabó el tiempo", again: "Otra vez", next: "Siguiente nivel", mallet: "Mazo", fold: "Doblar",
    hits: { perfect: "¡Pum!", good: "Bien", weak: "Muy flojo…", unfolded: "Sin doblar", ouch: "¡Ay!" }, fake: "Amagues", snap: "Manos rápidas",
    help: "Mantén pulsado para levantar el mazo y suelta para golpear. Golpea solo cuando la mano de tu compañero haya doblado la masa y se haya retirado del todo; golpea justo cuando se va para un ¡Pum! perfecto. Una mano que duda sobre la masa sigue en peligro.",
    help2: "Dos jugadores: mantén la mitad izquierda para el mazo y la derecha para meter la mano y doblar. Busquen el ritmo juntos hasta la meta.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:tteok-pound:muted";

const POUNDER: PixelArt = {
  palette: { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", r: "#c92a2a", y: "#ffd43b", w: "#fff4e6", b: "#5c4033", p: "#f28b9b" },
  rows: [
    "...kkkkk...",
    "..kkkkkkk..",
    "..kssssss..",
    "..sesssess.",
    "..psssssp..",
    "...sssss...",
    ".wwwrrrwww.",
    "wwwwrrrwwww",
    "wwwwrrrwwws",
    ".wwwrrrwww.",
    "..yyyyyyy..",
    "..yyyyyyy..",
    "..yyy.yyy..",
    "..bb...bb..",
  ],
};

const PARTNER: PixelArt = {
  palette: { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", g: "#2b8a3e", w: "#fff4e6", n: "#364fc7", p: "#f28b9b" },
  rows: [
    "...kkkkk...",
    "..kkkkkkkk.",
    "..ssssssk..",
    ".ssessess..",
    "..psssssp..",
    "...sssss...",
    ".wwwgggwww.",
    "wwwwgggwwww",
    "wwwwgggwwww",
    ".wwwgggwww.",
    "..nnnnnnn..",
    "..nnnnnnn..",
    "..nnn.nnn..",
    "..kk...kk..",
  ],
};

const HAND: PixelArt = { palette: { s: "#f3c9a0", d: "#d9a47a" }, rows: [".ssss.", "ssssss", "sssssd", "ssssd.", ".sss.."] };

const MORTAR: PixelArt = {
  palette: { b: "#8a5a3b", d: "#6b4426", l: "#a8744f", k: "#4a2e1c" },
  rows: [
    "llllllllllllllllllllll",
    "bbbbbbbbbbbbbbbbbbbbbb",
    "dbbbbbbbbbbbbbbbbbbbbd",
    ".dbbbbbbbbbbbbbbbbbbd.",
    "..dddddddddddddddddd..",
    "....k............k....",
    "...kk............kk...",
  ],
};

const SKIES: BackdropSpec[] = [
  { sky: ["#a5d8ff", "#d0ebff", "#f1f8ff"], ground: ["#f8f0e3", "#eadbc4", "#dcc6a6"], groundShare: 0.3, hills: "#c3d4e2", orb: { x: 0.85, y: 0.1, r: 5, color: "#fff3bf", glow: "#ffe08a" }, seed: 61 },
  { sky: ["#ffd8a8", "#ffe8cc", "#fff4e6"], ground: ["#f8f0e3", "#eadbc4", "#dcc6a6"], groundShare: 0.3, hills: "#e8c6a0", orb: { x: 0.2, y: 0.12, r: 9, color: "#fff4e6", glow: "#ffa94d" }, seed: 62 },
  { sky: ["#141a3a", "#22305e", "#3a4a80"], stars: 0.6, ground: ["#d6cbb8", "#c2b49c", "#a99a80"], groundShare: 0.3, hills: "#2a3766", orb: { x: 0.8, y: 0.1, r: 11, color: "#fff9db", glow: "#ffe8a3" }, seed: 63 },
];

interface Pop { x: number; y: number; text: string; t: number; color: string }

const DOUGH = { x: 198, y: 452 };
const PIVOT = { x: 104, y: 400 };
const ANGLE_DOWN = Math.atan2(DOUGH.y - 8 - PIVOT.y, DOUGH.x - PIVOT.x);
const ANGLE_UP = -2.3;
const HAND_AWAY = { x: 300, y: 338 };

export default function TteokPound({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [duo, setDuo] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ pounds: 0, combo: 0, hearts: 3, timeLeft: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: 0 | 1 | 2 | 3; timeUp: boolean }>(null);
  const [started, setStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mortarRef = useRef<Mortar>(newMortar(0, 1));
  const startedRef = useRef(false);
  const roles = useRef(new Map<number, "mallet" | "turner">());
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const squash = useRef(0);
  const shake = useRef(0);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  const sp = STAGES[stage];
  useRunRecord(TTEOK_SLUG, Boolean(over?.won) && !duo, hud.pounds, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number, two: boolean) => {
    setStage(s);
    setDuo(two);
    mortarRef.current = newMortar(s, Math.floor(Math.random() * 1e6), two);
    parts.current = [];
    pops.current = [];
    roles.current.clear();
    startedRef.current = false;
    setStarted(false);
    setOver(null);
    setHud({ pounds: 0, combo: 0, hearts: STAGES[s].hearts, timeLeft: STAGES[s].limit });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TTEOK_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT), false);
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSecond = -1;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const m = mortarRef.current;
      const spec = STAGES[m.stage];
      if (startedRef.current && !m.over) {
        const ev = stepMortar(m, dt);
        if (ev.fold) spawnBurst(parts.current, DOUGH.x + 10, DOUGH.y - 6, ["#ffffff", "#f8f9fa"], 4, 40, Math.floor(now));
        if (ev.strike) {
          const copy = copyRef.current;
          const color = ev.strike === "perfect" ? "#f59f00" : ev.strike === "good" ? "#2f9e44" : ev.strike === "ouch" ? "#e03131" : "#868e96";
          pops.current.push({ x: DOUGH.x, y: DOUGH.y - 70, text: copy.hits[ev.strike], t: 0.9, color });
          if (ev.strike === "perfect" || ev.strike === "good") {
            squash.current = 1;
            shake.current = ev.strike === "perfect" ? 6 : 3;
            spawnBurst(parts.current, DOUGH.x, DOUGH.y - 4, ev.strike === "perfect" ? ["#ffffff", "#ffd43b", "#fff3bf"] : ["#ffffff", "#f1f3f5"], ev.strike === "perfect" ? 16 : 8, 140, Math.floor(now));
            sfx(ev.strike === "perfect" ? "success" : "place");
            if (m.combo > 0 && m.combo % 5 === 0) sfx("combo");
          } else if (ev.strike === "ouch") {
            shake.current = 8;
            sfx("fail");
          } else sfx("tap");
          setHud((h) => ({ ...h, pounds: m.pounds, combo: m.combo, hearts: m.hearts }));
        }
        const sec = Math.max(0, Math.ceil(spec.limit - m.time));
        if (sec !== lastSecond) {
          lastSecond = sec;
          setHud((h) => ({ ...h, timeLeft: sec }));
        }
        if (m.over) {
          const timeUp = !m.won && m.hearts > 0;
          setOver({ won: m.won, stars: starsFor(m), timeUp });
          if (m.won && !m.twoPlayer) setCleared(markStageCleared(TTEOK_SLUG, m.stage, STAGE_COUNT));
          sfx(m.won ? "win" : "lose");
        }
      }
      squash.current = Math.max(0, squash.current - dt * 5);
      shake.current = Math.max(0, shake.current - dt * 30);
      stepParticles(parts.current, dt, 260);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        if (shake.current > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake.current), 0);
        drawBackdrop(ctx, W, H, SKIES[Math.min(2, Math.floor(m.stage / 10))], 4);
        // straw mat
        ctx.fillStyle = "#d8b878";
        ctx.fillRect(40, 476, 280, 18);
        ctx.fillStyle = "#c4a060";
        for (let x = 44; x < 316; x += 8) ctx.fillRect(x, 476, 2, 18);
        // partner kneeling on the right, pounder standing on the left
        drawSprite(ctx, PARTNER, 300, 420, { scale: 4, flipX: true });
        drawSprite(ctx, POUNDER, 70, 430, { scale: 4 });
        drawSprite(ctx, MORTAR, DOUGH.x, DOUGH.y + 18, { scale: 5 });
        // dough: lumpy at first, smooth and glossy near the goal
        const done = Math.min(1, m.pounds / spec.target);
        const sq = squash.current;
        const dw = 70 + sq * 18;
        const dh = 22 - sq * 8;
        const body = done > 0.66 ? "#ffffff" : done > 0.33 ? "#f8f6f0" : "#efe9dc";
        for (const [color, pad] of [["#b8a98a", 3], [body, 0]] as const) {
          ctx.fillStyle = color;
          for (let yy = 0; yy < dh + pad; yy += 4) {
            const ww = (dw + pad * 2) * Math.sqrt(Math.max(0, 1 - ((yy - dh - pad) / (dh + pad)) ** 2));
            ctx.fillRect(Math.round(DOUGH.x - ww / 2), Math.round(DOUGH.y - yy), Math.round(ww), 4);
          }
        }
        const lumps = Math.round((1 - done) * 7);
        ctx.fillStyle = "#e2d8c3";
        for (let n = 0; n < lumps; n++) ctx.fillRect(DOUGH.x - 28 + n * 9, DOUGH.y - 8 - ((n * 5) % 9), 4, 4);
        if (done > 0.66) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(DOUGH.x - 14, DOUGH.y - dh + 4, 10, 2);
        }
        // the partner's arm and hand
        const hx = DOUGH.x + 18 + (HAND_AWAY.x - DOUGH.x - 18) * m.hand;
        const hy = DOUGH.y - 8 + (HAND_AWAY.y - DOUGH.y + 8) * m.hand;
        const sx = 286;
        const sy = 392;
        ctx.fillStyle = "#2b8a3e";
        for (let n = 0; n <= 6; n++) {
          const px = sx + ((hx + 10 - sx) * n) / 6;
          const py = sy + ((hy - sy) * n) / 6;
          ctx.fillRect(Math.round(px) - 5, Math.round(py) - 5, 10, 10);
        }
        const danger = m.hand < SAFE_POS;
        drawSprite(ctx, HAND, hx, hy, { scale: 4, flipX: true });
        if (danger && (m.falling || m.lift > 0.3)) {
          ctx.fillStyle = "rgba(224,49,49,0.8)";
          ctx.fillRect(Math.round(hx) - 2, Math.round(hy) - 34, 4, 12);
          ctx.fillRect(Math.round(hx) - 2, Math.round(hy) - 18, 4, 4);
        }
        // the mallet: shaft from the pounder's hands, head at the end
        const ang = ANGLE_DOWN + (ANGLE_UP - ANGLE_DOWN) * m.lift;
        const len = 100;
        ctx.fillStyle = "#a8744f";
        for (let n = 0; n <= 10; n++) {
          const px = PIVOT.x + Math.cos(ang) * len * (n / 10);
          const py = PIVOT.y + Math.sin(ang) * len * (n / 10);
          ctx.fillRect(Math.round(px) - 3, Math.round(py) - 3, 6, 6);
        }
        ctx.save();
        ctx.translate(Math.round(PIVOT.x + Math.cos(ang) * len), Math.round(PIVOT.y + Math.sin(ang) * len));
        ctx.rotate(ang);
        ctx.fillStyle = "#6b4426";
        ctx.fillRect(-12, -22, 28, 44);
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(-10, -20, 24, 40);
        ctx.fillStyle = "#4a2e1c";
        ctx.fillRect(-10, -6, 24, 3);
        ctx.fillRect(-10, 4, 24, 3);
        ctx.restore();
        drawParticles(ctx, parts.current);
        ctx.restore();
        // HUD in the sky: progress bar + hearts
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(40, 24, 280, 14);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(42, 26, Math.round(276 * done), 10);
        for (let n = 0; n < spec.hearts; n++) {
          ctx.fillStyle = n < m.hearts ? "#e03131" : "rgba(0,0,0,0.25)";
          ctx.fillRect(150 + n * 22, 48, 14, 12);
        }
        if (m.combo >= 3) {
          ctx.textAlign = "center";
          ctx.font = "bold 22px monospace";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillText(fill(copyRef.current.combo, m.combo), W / 2, 100);
        }
        if (m.twoPlayer) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.textAlign = "center";
          ctx.fillText(copyRef.current.mallet, W * 0.25, H - 24);
          ctx.fillText(copyRef.current.fold, W * 0.75, H - 24);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          for (let yy = 500; yy < H; yy += 12) ctx.fillRect(W / 2 - 1, yy, 2, 6);
        }
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillText(p.text, p.x + 1, p.y - (0.9 - p.t) * 30 + 1);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (0.9 - p.t) * 30);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mortarRef.current;
    if (m.over) return;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const role = m.twoPlayer && x > W / 2 ? "turner" : "mallet";
    for (const r of roles.current.values()) if (r === role) return;
    roles.current.set(e.pointerId, role);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (role === "turner") setTurner(m, true);
    else pressMallet(m);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const role = roles.current.get(e.pointerId);
    if (!role) return;
    roles.current.delete(e.pointerId);
    const m = mortarRef.current;
    if (role === "turner") setTurner(m, false);
    else releaseMallet(m);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const resultText = over ? (over.won ? c.win : over.timeUp ? c.timeUp : c.lose) : "";
  const liveBtn = "game-btn game-btn-live flex min-h-11 items-center justify-center gap-1 text-sm font-bold";
  const idleBtn = "game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold";

  return (
    <div
      ref={containerRef}
      data-game="tteok-pound"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {!duo ? <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge> : <Badge variant="secondary">{c.duo}</Badge>}
        <Badge variant="outline">{fill(c.goal, hud.pounds, sp.target)}</Badge>
        {!duo ? <Badge variant="outline">{fill(c.time, hud.timeLeft)}</Badge> : null}
        {!duo && sp.fake > 0 ? <Badge variant="outline">{c.fake}</Badge> : null}
        {!duo && sp.snap > 0 ? <Badge variant="outline">{c.snap}</Badge> : null}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={!duo ? liveBtn : idleBtn} onClick={() => start(stage, false)}>
          <User className="size-4" />
          <span>{c.solo}</span>
        </button>
        <button type="button" className={duo ? liveBtn : idleBtn} onClick={() => start(stage, true)}>
          <Users className="size-4" />
          <span>{c.duo}</span>
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!started && !over ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/4 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/3 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{resultText}</p>
            {over.won && !duo ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, duo)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              {!duo ? (
                <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1, false)}>
                  <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
                </Button>
              ) : (
                <Button className="min-h-12" onClick={() => start(stage, false)}>
                  <span>{c.solo}</span>
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>
      <p className="text-xs text-muted-foreground">{c.help2}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i, false)} />
        </div>
      </details>
    </div>
  );
}
