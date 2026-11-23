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
import { FIELD_H, FIELD_W, GROUND_Y, JEGI_SLUG, STAGES, STAGE_COUNT, WIN_POINTS, footAt, newYard, starsFor, steerTo, stepYard, tapAt, windAt, type Yard } from "../../lib/games/jegi-kick";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; kicks: string; best: string; perfect: string; solo: string; duo: string; goal: string; cleared: string; dropped: string;
  redWin: string; blueWin: string; again: string; next: string; help: string; help2: string; stages: string; full: string; exitFull: string;
  mute: string; unmute: string; start: string; wind: string; ice: string; two: string; magpie: string; score: string;
}> = {
  ko: {
    start: "톡 눌러 시작", stage: "{0}단계", kicks: "{0}번", best: "최고 {0}", perfect: "완벽!", solo: "혼자", duo: "둘이서", goal: "목표 {0}번", cleared: "목표 달성! 계속 차 보세요", dropped: "제기를 떨어뜨렸어요 · {0}번",
    redWin: "빨강 승리!", blueWin: "파랑 승리!", again: "다시 차기", next: "다음 단계", wind: "바람", ice: "빙판", two: "제기 2개", magpie: "까치", score: "{0} : {1}",
    help: "제기가 떨어지는 곳 아래를 톡 누르면 아이가 달려가 발로 찹니다. 제기가 발 높이에 왔을 때 눌러야 맞고, 발 한가운데에 맞으면 ‘완벽!’으로 곧게 높이 올라갑니다. 손가락을 끌면 아이가 따라 움직입니다.",
    help2: "둘이서: 휴대폰을 둘 사이에 두고 왼쪽 절반은 빨강, 오른쪽 절반은 파랑이 찹니다. 내 쪽 땅에 떨어지면 상대가 1점, 먼저 5점이면 승리.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    start: "Tap to start", stage: "Stage {0}", kicks: "{0} kicks", best: "Best {0}", perfect: "Perfect!", solo: "Solo", duo: "Two players", goal: "Goal {0}", cleared: "Goal reached! Keep it going", dropped: "Dropped it · {0} kicks",
    redWin: "Red wins!", blueWin: "Blue wins!", again: "Kick again", next: "Next stage", wind: "Wind", ice: "Ice", two: "2 jegis", magpie: "Magpies", score: "{0} : {1}",
    help: "Tap just under the falling jegi and the kid runs over and kicks it. Tap when it reaches foot height; a hit on the middle of the foot is a Perfect that flies straight and high. Drag to walk the kid along.",
    help2: "Two players: put the phone between you. Red kicks on the left half, blue on the right. If it lands on your side the other player scores; first to 5 wins.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    start: "タップでスタート", stage: "{0}面", kicks: "{0}回", best: "最高 {0}", perfect: "パーフェクト！", solo: "ひとりで", duo: "2人で", goal: "目標 {0}回", cleared: "目標達成！まだ続けよう", dropped: "落としました · {0}回",
    redWin: "赤の勝ち！", blueWin: "青の勝ち！", again: "もう一度", next: "次の面", wind: "風", ice: "氷", two: "チェギ2個", magpie: "カササギ", score: "{0} : {1}",
    help: "落ちてくるチェギの下をタップすると、子どもが走って足で蹴ります。足の高さに来たときに押すと当たり、足の真ん中に当たると「パーフェクト！」でまっすぐ高く上がります。指をドラッグすると子どもがついてきます。",
    help2: "2人で：スマホを2人の間に置き、左半分が赤、右半分が青。自分の側に落ちたら相手に1点、先に5点で勝ち。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    start: "点击开始", stage: "第{0}关", kicks: "{0}下", best: "最高 {0}", perfect: "完美！", solo: "单人", duo: "双人", goal: "目标 {0}下", cleared: "达成目标！继续踢", dropped: "毽子掉了 · {0}下",
    redWin: "红方获胜！", blueWin: "蓝方获胜！", again: "再踢一次", next: "下一关", wind: "风", ice: "冰面", two: "两个毽子", magpie: "喜鹊", score: "{0} : {1}",
    help: "在下落的毽子正下方轻点，小孩就会跑过去用脚踢。毽子落到脚的高度时点击才能踢中，踢在脚中间就是“完美！”，会笔直地飞得很高。拖动手指小孩会跟着走。",
    help2: "双人：把手机放在两人中间，左半边是红方，右半边是蓝方。毽子落在你这边，对方得1分，先得5分获胜。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    start: "Touchez pour commencer", stage: "Niveau {0}", kicks: "{0} frappes", best: "Record {0}", perfect: "Parfait !", solo: "Solo", duo: "À deux", goal: "Objectif {0}", cleared: "Objectif atteint ! Continuez", dropped: "Tombé · {0} frappes",
    redWin: "Rouge gagne !", blueWin: "Bleu gagne !", again: "Rejouer", next: "Niveau suivant", wind: "Vent", ice: "Glace", two: "2 jegis", magpie: "Pies", score: "{0} : {1}",
    help: "Touchez juste sous le jegi qui tombe : l'enfant court et le frappe du pied. Touchez quand il arrive à hauteur du pied ; au centre du pied, c'est un Parfait qui monte droit et haut. Glissez pour faire marcher l'enfant.",
    help2: "À deux : posez le téléphone entre vous. Rouge joue sur la moitié gauche, bleu sur la droite. S'il tombe de votre côté, l'autre marque ; le premier à 5 gagne.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    start: "Toca para empezar", stage: "Nivel {0}", kicks: "{0} toques", best: "Récord {0}", perfect: "¡Perfecto!", solo: "Solo", duo: "Dos jugadores", goal: "Meta {0}", cleared: "¡Meta lograda! Sigue", dropped: "Se cayó · {0} toques",
    redWin: "¡Gana Rojo!", blueWin: "¡Gana Azul!", again: "Otra vez", next: "Siguiente nivel", wind: "Viento", ice: "Hielo", two: "2 jegis", magpie: "Urracas", score: "{0} : {1}",
    help: "Toca justo debajo del jegi que cae y el niño corre a patearlo. Toca cuando llegue a la altura del pie; en el centro del pie es un Perfecto que sube recto y alto. Arrastra para mover al niño.",
    help2: "Dos jugadores: deja el móvil entre los dos. Rojo patea en la mitad izquierda y azul en la derecha. Si cae en tu lado, punto para el otro; gana quien llegue a 5.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:jegi-kick:muted";
const BEST_KEY = "oiyo:jegi-kick:best";

function kid(jacket: string, trim: string): { idle: PixelArt; kick: PixelArt; fall: PixelArt } {
  const palette = { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", r: jacket, w: trim, b: "#3b4a7a", o: "#5c3a21", p: "#f28b9b" };
  const head = [
    "....kkkk....",
    "...kkkkkk...",
    "...kssssk...",
    "...sesses...",
    "...pssssp...",
    "....ssss....",
    "..rrrrrrrr..",
    ".srrrwwrrrs.",
    ".s.rrwwrr.s.",
    "...rrrrrr...",
    "...bbbbbb...",
  ];
  return {
    idle: { palette, rows: [...head, "...bb..bb...", "...bb..bb...", "...bb..bb...", "..ooo..ooo.."] },
    kick: { palette, rows: [...head, "...bb.......", "...bb.......", "...bb.......", "..ooo......."] },
    fall: { palette, rows: [...head.slice(0, 6), "..rrrrrrrr..", "ssrrrwwrrrss", "...rrwwrr...", "...rrrrrr...", "...bbbbbb...", "..bb....bb..", ".bb......bb.", "oo........oo"] },
  };
}
const KID_RED = kid("#d9480f", "#ffe8a3");
const KID_BLUE = kid("#1c7ed6", "#e7f5ff");

const JEGI: PixelArt = {
  palette: { r: "#e03131", b: "#1971c2", w: "#fff9db", g: "#2f9e44", y: "#f2c94c", d: "#a6791c" },
  rows: [
    ".r..b..g.",
    ".rw.b.wg.",
    "..rwbwg..",
    "...rwg...",
    "...www...",
    "..yyyyy..",
    ".yyddyyy.",
    "..yyyyy..",
  ],
};

const MAGPIE_A: PixelArt = {
  palette: { k: "#111827", w: "#f9fafb", b: "#1e3a8a" },
  rows: ["bb........", ".bbk...kk.", "..kkkkkkkk", ".kwwwkkk..", "kkkk......"],
};
const MAGPIE_B: PixelArt = {
  palette: MAGPIE_A.palette,
  rows: ["..........", "...k...kk.", "bbkkkkkkkk", ".kwwwkkk..", "..bbk....."],
};

const HANOK: PixelArt = {
  palette: { r: "#3d3a4b", t: "#57536a", w: "#f1e6d0", d: "#8a5a3b", y: "#ffd27a", s: "#ffffff" },
  rows: [
    "....ssssssssssssssss....",
    "..ssrrrrrrrrrrrrrrrrss..",
    "rrrrttttttttttttttttrrrr",
    "..r..................r..",
    "...wwwwwwwwwwwwwwwwww...",
    "...wddwyywwddwwyywddw...",
    "...wddwyywwddwwyywddw...",
    "...wwwwwwwwwwwwwwwwww...",
    "..dddddddddddddddddddd..",
  ],
};

const LANTERN: PixelArt = {
  palette: { k: "#3b2a20", r: "#e03131", y: "#ffd43b", o: "#ff922b" },
  rows: ["..k..", ".rrr.", "rryrr", "ryyor", "rryrr", ".rrr.", "..y.."],
};

const SKY_DAY: BackdropSpec = { sky: ["#9fd3ff", "#c5e5ff", "#e8f4ff"], ground: ["#ffffff", "#e9f1f8", "#d5e3ef"], groundShare: 0.16, hills: "#b9cde0", orb: { x: 0.85, y: 0.1, r: 6, color: "#fff3bf", glow: "#ffe08a" }, seed: 81 };
const SKY_ICE: BackdropSpec = { sky: ["#b8e2ff", "#d7efff", "#f0f9ff"], ground: ["#cbe9ff", "#a9d8f5", "#8cc6ea"], groundShare: 0.16, hills: "#c2d8ea", orb: { x: 0.2, y: 0.12, r: 8, color: "#fffbe6" }, seed: 82 };
const SKY_NIGHT: BackdropSpec = { sky: ["#141a3a", "#22305e", "#3a4a80"], stars: 0.6, ground: ["#c9d3e6", "#a9b6cf", "#8d9cbb"], groundShare: 0.16, hills: "#2a3766", orb: { x: 0.78, y: 0.12, r: 10, color: "#fff9db", glow: "#ffe8a3" }, seed: 83 };
const SKY_DUO: BackdropSpec = { sky: ["#ffd8a8", "#ffe8cc", "#fff4e6"], ground: ["#ffffff", "#eef2f6", "#dde5ee"], groundShare: 0.16, hills: "#e3c9a8", orb: { x: 0.5, y: 0.1, r: 10, color: "#fff3bf", glow: "#ffc078" }, seed: 84 };

interface Pop { x: number; y: number; text: string; t: number; color: string }

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // storage blocked
  }
}

export default function JegiKick({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [duo, setDuo] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ kicks: 0, perfects: 0, score: [0, 0] as [number, number] });
  const [over, setOver] = useState(false);
  const [reached, setReached] = useState(false);
  const [best, setBest] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yardRef = useRef<Yard>(newYard(0, 1));
  const reachedRef = useRef(false);
  const startedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const pointers = useRef(new Map<number, number>());
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const angles = useRef<number[]>([0, 0]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  useRunRecord(JEGI_SLUG, over && !duo, hud.kicks, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number, two: boolean) => {
    setStage(s);
    setDuo(two);
    yardRef.current = newYard(s, Math.floor(Math.random() * 1e6), two);
    parts.current = [];
    pops.current = [];
    pointers.current.clear();
    reachedRef.current = false;
    startedRef.current = false;
    setStarted(false);
    setReached(false);
    setOver(false);
    setHud({ kicks: 0, perfects: 0, score: [0, 0] });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(JEGI_SLUG, STAGE_COUNT);
    setCleared(done);
    setBest(readBest());
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
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const y = yardRef.current;
      const wasOver = y.over;
      let changed = false;
      for (let k = 0; k < (startedRef.current ? 2 : 0); k++) {
        const ev = stepYard(y, dt / 2);
        for (const kk of ev.kicked) {
          const j = y.jegis[kk.jegi];
          changed = true;
          spawnBurst(parts.current, j.x, j.y + 6, kk.perfect ? ["#ffd43b", "#ffffff", "#fff3bf"] : ["#ffffff", "#dee2e6"], kk.perfect ? 14 : 6, kk.perfect ? 150 : 80, Math.floor(now) + kk.jegi);
          if (kk.perfect) {
            pops.current.push({ x: j.x, y: j.y - 14, text: copyRef.current.perfect, t: 0.8, color: "#f59f00" });
            sfx("success");
          } else sfx("tap");
        }
        if (ev.bird !== null) sfx("fail");
        if (ev.point !== null) {
          changed = true;
          sfx(y.over ? "win" : "place");
        }
        if (ev.dropped.length && !y.twoPlayer) {
          for (const ji of ev.dropped) spawnBurst(parts.current, y.jegis[ji].x, GROUND_Y, ["#ffffff", "#e9f1f8"], 16, 120, Math.floor(now) + 7);
        }
      }
      if (!y.twoPlayer && !reachedRef.current && y.kicks >= STAGES[y.stage].target) {
        reachedRef.current = true;
        setReached(true);
        setCleared(markStageCleared(JEGI_SLUG, y.stage, STAGE_COUNT));
        pops.current.push({ x: FIELD_W / 2, y: 200, text: copyRef.current.cleared, t: 1.6, color: "#2f9e44" });
        sfx("combo");
      }
      if (!wasOver && y.over) {
        changed = true;
        setOver(true);
        if (!y.twoPlayer) {
          sfx(reachedRef.current ? "win" : "lose");
          setBest((b) => {
            if (y.kicks > b) {
              writeBest(y.kicks);
              return y.kicks;
            }
            return b;
          });
        }
      }
      if (changed) setHud({ kicks: y.kicks, perfects: y.perfects, score: [y.score[0], y.score[1]] });
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const s = STAGES[y.stage];
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, y.twoPlayer ? SKY_DUO : s.night ? SKY_NIGHT : s.ice ? SKY_ICE : SKY_DAY, 4);
        drawSprite(ctx, HANOK, 90, GROUND_Y - 120, { scale: 3, alpha: 0.85 });
        drawSprite(ctx, HANOK, 290, GROUND_Y - 112, { scale: 2, alpha: 0.7 });
        if (s.night && !y.twoPlayer) {
          for (const lx of [40, 160, 250, 330]) drawSprite(ctx, LANTERN, lx, 70 + Math.sin(y.time * 2 + lx) * 3, { scale: 3 });
        }
        if (s.ice && !y.twoPlayer) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          for (let k = 0; k < 6; k++) ctx.fillRect(20 + k * 60, GROUND_Y + 14 + (k % 2) * 10, 26, 2);
        }
        // wind streaks
        const wind = windAt(y);
        if (Math.abs(wind) > 8) {
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          for (let k = 0; k < 6; k++) {
            const yy = 90 + k * 70;
            const x = ((((y.time * (60 + Math.abs(wind))) * Math.sign(wind) + k * 89) % (FIELD_W + 60)) + FIELD_W + 60) % (FIELD_W + 60) - 30;
            ctx.fillRect(Math.round(x), yy, 14 + Math.min(30, Math.abs(wind) / 4), 2);
          }
        }
        if (y.twoPlayer) {
          ctx.fillStyle = "rgba(120,80,40,0.55)";
          for (let yy = GROUND_Y - 70; yy < FIELD_H; yy += 10) ctx.fillRect(FIELD_W / 2 - 1, yy, 3, 6);
          ctx.fillStyle = "#e03131";
          ctx.font = "bold 36px monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(y.score[0]), FIELD_W * 0.25, 60);
          ctx.fillStyle = "#1c7ed6";
          ctx.fillText(String(y.score[1]), FIELD_W * 0.75, 60);
        }
        for (const b of y.birds) drawSprite(ctx, Math.sin(b.flap) > 0 ? MAGPIE_A : MAGPIE_B, b.x, b.y, { scale: 3, flipX: b.vx > 0 });
        // kids
        y.kids.forEach((k, i) => {
          const art = i === 0 ? KID_RED : KID_BLUE;
          if (k.fallen > 0) {
            drawSprite(ctx, art.fall, k.x, GROUND_Y - 14, { scale: 3, rotate: (k.foot > 0 ? 1 : -1) * Math.PI / 2 });
            for (let n = 0; n < 3; n++) {
              const a = y.time * 6 + (n * Math.PI * 2) / 3;
              ctx.fillStyle = "#ffd43b";
              ctx.fillRect(Math.round(k.x + Math.cos(a) * 16) - 2, Math.round(GROUND_Y - 34 + Math.sin(a) * 5) - 2, 4, 4);
            }
          } else {
            const f = footAt(k);
            const kicking = f !== null || k.swing >= 0;
            drawSprite(ctx, kicking ? art.kick : art.idle, k.x, GROUND_Y - 30, { scale: 4, flipX: k.foot < 0 });
            if (kicking) {
              // the swinging leg: hip to foot, drawn in chunky pixels
              const fx = f ? f.x : k.x + k.foot * 10;
              const fy = f ? f.y : GROUND_Y - 12;
              const hx = k.x + k.foot * 6;
              const hy = GROUND_Y - 18;
              for (let n = 0; n <= 4; n++) {
                const px = hx + ((fx - hx) * n) / 4;
                const py = hy + ((fy - hy) * n) / 4;
                ctx.fillStyle = "#3b4a7a";
                ctx.fillRect(Math.round(px) - 4, Math.round(py) - 4, 8, 8);
              }
              ctx.fillStyle = "#5c3a21";
              ctx.fillRect(Math.round(fx) - 6 + k.foot * 2, Math.round(fy) - 2, 12, 6);
            }
          }
        });
        // jegis
        y.jegis.forEach((j, i) => {
          const target = Math.atan2(-j.vx, j.vy);
          let a = angles.current[i] ?? 0;
          let d = target - a;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          a += d * Math.min(1, dt * 10);
          angles.current[i] = a;
          if (!j.down) {
            ctx.fillStyle = "rgba(0,0,0,0.12)";
            const sh = Math.max(4, 14 - (GROUND_Y - j.y) / 40);
            ctx.fillRect(Math.round(j.x - sh / 2), GROUND_Y + 8, Math.round(sh), 3);
          }
          drawSprite(ctx, JEGI, j.x, j.y, { scale: 3, rotate: j.down ? Math.PI / 2 : a });
        });
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillText(p.text, p.x + 1, p.y - (0.8 - p.t) * 30 + 1);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (0.8 - p.t) * 30);
        }
        if (!y.twoPlayer) {
          ctx.font = "bold 40px monospace";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(String(y.kicks), FIELD_W / 2, 64);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * FIELD_W;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const y = yardRef.current;
    if (y.over) return;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
      cues.current?.play("tap");
      return;
    }
    const idx = tapAt(y, toX(e));
    pointers.current.set(e.pointerId, idx);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const idx = pointers.current.get(e.pointerId);
    if (idx === undefined) return;
    steerTo(yardRef.current, idx, toX(e));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const s = STAGES[stage];
  const stars = starsFor(hud.kicks, s.target);
  const tags = [s.wind > 0 ? c.wind : null, s.magpies > 0 ? c.magpie : null, s.ice ? c.ice : null, s.jegis === 2 ? c.two : null].filter(Boolean) as string[];
  const resultText = duo ? (hud.score[0] >= WIN_POINTS ? c.redWin : c.blueWin) : fill(c.dropped, hud.kicks);

  return (
    <div
      ref={containerRef}
      data-game="jegi-kick"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {duo ? (
          <Badge variant="secondary">{c.duo} · {fill(c.score, hud.score[0], hud.score[1])}</Badge>
        ) : (
          <>
            <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
            <Badge variant={reached ? "default" : "outline"}>{fill(c.goal, s.target)}</Badge>
            {best > 0 ? <Badge variant="outline">{fill(c.best, best)}</Badge> : null}
            {tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
          </>
        )}
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
        <button type="button" className={!duo ? "game-btn game-btn-live flex min-h-11 items-center justify-center gap-1 text-sm font-bold" : "game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold"} onClick={() => start(stage, false)}>
          <User className="size-4" />
          <span>{c.solo}</span>
        </button>
        <button type="button" className={duo ? "game-btn game-btn-live flex min-h-11 items-center justify-center gap-1 text-sm font-bold" : "game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold"} onClick={() => start(stage, true)}>
          <Users className="size-4" />
          <span>{c.duo}</span>
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!started && !over ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{resultText}</p>
            {!duo ? <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, duo)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              {!duo ? (
                <Button className="min-h-12" disabled={!reached} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1, false)}>
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
