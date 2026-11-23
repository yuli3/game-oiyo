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
  BLOCK, FIELD_H, FIELD_W, SNOWBALL_SLUG, STAGES, STAGE_COUNT, covered, handOf, newField, predict, setAiming, starsFor, stepField, throwBall,
  velocityFromDrag, type Field, type Kid,
} from "../../lib/games/snowball-fight";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; left: string; solo: string; duo: string; win: string; lose: string; redWin: string; blueWin: string; again: string; next: string;
  help: string; help2: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; start: string; wind: string; tough: string; hit: string;
}> = {
  ko: {
    start: "당겼다 놓으면 던져요", stage: "{0}단계", left: "남은 친구 {0}", solo: "혼자", duo: "둘이서", win: "언덕을 차지했어요!", lose: "눈덩이에 맞았어요",
    redWin: "빨강 승리!", blueWin: "파랑 승리!", again: "다시 하기", next: "다음 단계", wind: "바람", tough: "두 방", hit: "맞았다!",
    help: "화면 어디든 누른 채 뒤로 당기면 일어서서 조준하고, 놓으면 눈덩이를 던집니다. 조준하는 동안에만 일어서니 몸을 드러내는 시간이 짧을수록 안전해요. 친구들은 눈벽 뒤에 숨었다가 고개를 내밀 때만 맞힐 수 있고, 눈벽은 맞을 때마다 조금씩 부서집니다.",
    help2: "둘이서: 휴대폰을 둘 사이에 두고 왼쪽 절반은 빨강, 오른쪽 절반은 파랑이 당겨서 던집니다. 하트 3개를 먼저 잃으면 집니다.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    start: "Pull back and let go to throw", stage: "Stage {0}", left: "{0} left", solo: "Solo", duo: "Two players", win: "You took the hill!", lose: "You got snowed",
    redWin: "Red wins!", blueWin: "Blue wins!", again: "Play again", next: "Next stage", wind: "Wind", tough: "Two hits", hit: "Got one!",
    help: "Press anywhere and pull back to stand up and aim, then let go to throw. You only stand while aiming, so the less time you show yourself the safer you are. The kids can only be hit when they pop up from behind their snow walls, and every wall crumbles a little with each hit.",
    help2: "Two players: put the phone between you. Red pulls and throws on the left half, blue on the right. Lose all 3 hearts and you lose.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    start: "引いて離すと投げます", stage: "{0}面", left: "残り {0}人", solo: "ひとりで", duo: "2人で", win: "丘を取りました！", lose: "雪玉に当たりました",
    redWin: "赤の勝ち！", blueWin: "青の勝ち！", again: "もう一度", next: "次の面", wind: "風", tough: "2発", hit: "命中！",
    help: "画面のどこかを押して後ろに引くと立ち上がって狙い、離すと雪玉を投げます。立つのは狙っている間だけなので、体を出す時間が短いほど安全です。友だちは雪の壁から顔を出したときだけ当てられ、壁は当たるたびに少しずつ崩れます。",
    help2: "2人で：スマホを2人の間に置き、左半分は赤、右半分は青が引いて投げます。ハート3つを先に失うと負けです。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    start: "往后拉再松手就能扔", stage: "第{0}关", left: "还剩 {0}人", solo: "单人", duo: "双人", win: "占领了山坡！", lose: "被雪球打中了",
    redWin: "红方获胜！", blueWin: "蓝方获胜！", again: "再玩一次", next: "下一关", wind: "风", tough: "要打两次", hit: "打中了！",
    help: "按住屏幕任意位置往后拉，就会站起来瞄准，松手扔出雪球。只有瞄准时才会站起来，露出身体的时间越短越安全。小伙伴们只有从雪墙后探出头时才能打中，雪墙每被打中一次就会碎掉一点。",
    help2: "双人：把手机放在两人中间，左半边红方、右半边蓝方拉动扔雪球。先失去3颗心的一方输。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    start: "Tirez puis relâchez pour lancer", stage: "Niveau {0}", left: "Encore {0}", solo: "Solo", duo: "À deux", win: "La colline est à vous !", lose: "Touché par une boule",
    redWin: "Rouge gagne !", blueWin: "Bleu gagne !", again: "Rejouer", next: "Niveau suivant", wind: "Vent", tough: "Deux coups", hit: "Touché !",
    help: "Appuyez n'importe où et tirez vers l'arrière pour vous lever et viser, puis relâchez pour lancer. Vous ne restez debout que pendant la visée : moins vous vous montrez, plus vous êtes à l'abri. Les enfants ne peuvent être touchés que lorsqu'ils sortent de derrière leur mur de neige, et chaque mur s'effrite un peu à chaque coup.",
    help2: "À deux : posez le téléphone entre vous. Rouge tire et lance sur la moitié gauche, bleu sur la droite. Celui qui perd ses 3 cœurs perd.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    start: "Tira hacia atrás y suelta para lanzar", stage: "Nivel {0}", left: "Quedan {0}", solo: "Solo", duo: "Dos jugadores", win: "¡Conquistaste la colina!", lose: "Te dieron con una bola",
    redWin: "¡Gana Rojo!", blueWin: "¡Gana Azul!", again: "Otra vez", next: "Siguiente nivel", wind: "Viento", tough: "Dos golpes", hit: "¡Le diste!",
    help: "Toca en cualquier parte y tira hacia atrás para ponerte de pie y apuntar; suelta para lanzar. Solo estás de pie mientras apuntas, así que cuanto menos te asomes, más seguro estás. A los niños solo se les puede dar cuando asoman tras su muro de nieve, y cada muro se desmorona un poco con cada golpe.",
    help2: "Dos jugadores: deja el móvil entre los dos. Rojo tira y lanza en la mitad izquierda, azul en la derecha. Quien pierda sus 3 corazones pierde.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snowball-fight:muted";

function kidArt(coat: string, hat: string): { stand: PixelArt; duck: PixelArt; throwing: PixelArt } {
  const palette = { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", c: coat, h: hat, w: "#ffffff", p: "#f28b9b", b: "#3b3f5c", m: "#e9ecef" };
  const head = ["...ww...", "..hhhh..", ".hhhhhh.", ".kssssk.", ".sesess.", ".psssps.", "..ssss.."];
  return {
    stand: { palette, rows: [...head, ".cccccc.", "scccccms", "s.cccc.s", "..cccc..", "..bbbb..", "..b..b..", "..b..b..", ".kk..kk."] },
    throwing: { palette, rows: [...head, ".ccccccs", "scccccms", "s.cccc..", "..cccc..", "..bbbb..", "..b..b..", "..b..b..", ".kk..kk."] },
    duck: { palette, rows: [...head, "cccccccc", "cccccccc"] },
  };
}
const RED = kidArt("#d9480f", "#c92a2a");
const BLUE = kidArt("#1c7ed6", "#1864ab");
const GREEN = kidArt("#2f9e44", "#e67700");

const HEART: PixelArt = { palette: { r: "#e03131", w: "#ffc9c9" }, rows: [".rr.rr.", "rwrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."] };
const HEART_EMPTY: PixelArt = { palette: { r: "#adb5bd" }, rows: [".rr.rr.", "r..r..r", "r.....r", ".r...r.", "..r.r..", "...r..."] };

const PINE: PixelArt = {
  palette: { g: "#2b6a4a", d: "#1f4d36", w: "#ffffff", t: "#6b4426" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t...", "...t..."],
};

const SKIES: BackdropSpec[] = [
  { sky: ["#8fc9ff", "#bfe0ff", "#e8f4ff"], hills: "#cfe0ef", orb: { x: 0.18, y: 0.1, r: 5, color: "#fff3bf", glow: "#ffe08a" }, seed: 91 },
  { sky: ["#a5b4fc", "#c7d2fe", "#e0e7ff"], hills: "#c9d3ec", seed: 92 },
  { sky: ["#ffb38a", "#ffd0a8", "#ffe8cc"], hills: "#e8c6b0", orb: { x: 0.8, y: 0.16, r: 9, color: "#fff4e6", glow: "#ffa94d" }, seed: 93 },
  { sky: ["#5c6ac4", "#8794dd", "#b8c0ef"], hills: "#7a86c9", seed: 94 },
  { sky: ["#141a3a", "#22305e", "#3a4a80"], stars: 0.6, hills: "#2a3766", orb: { x: 0.82, y: 0.1, r: 9, color: "#fff9db", glow: "#ffe8a3" }, seed: 95 },
  { sky: ["#0b1026", "#1b2450", "#2f3c78"], stars: 0.9, hills: "#1f2a58", orb: { x: 0.2, y: 0.12, r: 10, color: "#fff9db", glow: "#ffe8a3" }, seed: 96 },
];
const SKY_DUO: BackdropSpec = { sky: ["#ffd8a8", "#ffe8cc", "#fff4e6"], hills: "#e3c9a8", orb: { x: 0.5, y: 0.1, r: 6, color: "#fff3bf", glow: "#ffc078" }, seed: 97 };

interface Pop { x: number; y: number; text: string; t: number; color: string }
interface Aim { who: 0 | 1; x0: number; y0: number; x: number; y: number }

function standingNow(f: Field, k: Kid): boolean {
  if (k.side === 1 && !f.twoPlayer) return k.up || k.hp <= 0;
  return f.aiming[k.side] || !covered(f, k);
}

export default function SnowballFight({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [duo, setDuo] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ left: 0, hearts: [3, 3] as [number, number] });
  const [over, setOver] = useState<null | 0 | 1>(null);
  const [started, setStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<Field>(newField(0, 1));
  const startedRef = useRef(false);
  const aims = useRef(new Map<number, Aim>());
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  const sp = STAGES[stage];
  const heartsLeft = hud.hearts[0];
  useRunRecord(SNOWBALL_SLUG, over === 0 && !duo, heartsLeft, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const sync = useCallback(() => {
    const f = fieldRef.current;
    setHud({ left: f.enemies.filter((e) => e.hp > 0).length, hearts: [f.players[0]?.hp ?? 0, f.players[1]?.hp ?? 0] });
  }, []);

  const start = useCallback((s: number, two: boolean) => {
    setStage(s);
    setDuo(two);
    fieldRef.current = newField(s, Math.floor(Math.random() * 1e6), two);
    parts.current = [];
    pops.current = [];
    aims.current.clear();
    startedRef.current = false;
    setStarted(false);
    setOver(null);
    sync();
  }, [sync]);

  useEffect(() => {
    const done = loadClearedStages(SNOWBALL_SLUG, STAGE_COUNT);
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
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const f = fieldRef.current;
      if (startedRef.current && !f.over) {
        const ev = stepField(f, dt);
        for (const h of ev.hitKid) {
          spawnBurst(parts.current, h.x, h.y, ["#ffffff", "#e7f5ff", "#d0ebff"], 14, 130, Math.floor(now) + h.who);
          const mine = f.twoPlayer || h.side === 1;
          if (mine && !f.twoPlayer) pops.current.push({ x: h.x, y: h.y - 16, text: copyRef.current.hit, t: 0.8, color: "#2f9e44" });
          sfx(mine && !f.twoPlayer ? "success" : f.twoPlayer ? "place" : "fail");
        }
        for (const s of ev.splash) spawnBurst(parts.current, s.x, s.y, ["#ffffff", "#dee2e6"], 6, 70, Math.floor(now) + Math.round(s.x));
        if (ev.hitKid.length) sync();
        if (f.over) {
          setOver(f.winner);
          sync();
          if (!f.twoPlayer && f.winner === 0) {
            setCleared(markStageCleared(SNOWBALL_SLUG, f.stage, STAGE_COUNT));
            sfx("win");
          } else sfx(f.twoPlayer ? "win" : "lose");
        }
      }
      stepParticles(parts.current, dt, 220);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, f.twoPlayer ? SKY_DUO : SKIES[Math.min(SKIES.length - 1, Math.floor(f.stage / 5))], 4);
        drawSprite(ctx, PINE, 20, f.twoPlayer ? 470 : 300, { scale: 4, alpha: 0.6 });
        drawSprite(ctx, PINE, 330, f.twoPlayer ? 466 : 120, { scale: 3, alpha: 0.55 });
        // ground columns
        for (let col = 0; col < f.ground.length; col++) {
          const g = f.ground[col];
          ctx.fillStyle = "#f8fbff";
          ctx.fillRect(col * BLOCK, g, BLOCK, FIELD_H - g);
          ctx.fillStyle = "#d6e4f0";
          ctx.fillRect(col * BLOCK, g + 10, BLOCK, FIELD_H - g - 10);
          ctx.fillStyle = "#b9cde0";
          ctx.fillRect(col * BLOCK, g + 40, BLOCK, FIELD_H - g - 40);
        }
        // snow blocks
        for (let r = 0; r < f.rows; r++) for (let col = 0; col < f.cols; col++) {
          if (!f.snow[r * f.cols + col]) continue;
          const above = r > 0 && f.snow[(r - 1) * f.cols + col];
          ctx.fillStyle = above ? "#e3eef8" : "#ffffff";
          ctx.fillRect(col * BLOCK, r * BLOCK, BLOCK, BLOCK);
          ctx.fillStyle = "#c5d8ea";
          ctx.fillRect(col * BLOCK, r * BLOCK + BLOCK - 1, BLOCK, 1);
        }
        // wind
        if (Math.abs(f.wind) > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          for (let k = 0; k < 5; k++) {
            const yy = 60 + k * 60;
            const span = FIELD_W + 60;
            const x = ((((f.time * (50 + Math.abs(f.wind))) * Math.sign(f.wind) + k * 97) % span) + span) % span - 30;
            ctx.fillRect(Math.round(x), yy, 12 + Math.abs(f.wind) / 5, 2);
          }
        }
        // kids
        const drawKid = (k: Kid, art: ReturnType<typeof kidArt>) => {
          if (k.hp <= 0 && !(k.side === 1 && !f.twoPlayer)) return;
          const flip = k.side === 1;
          if (k.hp <= 0) {
            drawSprite(ctx, art.duck, k.x, k.feet - 10, { scale: 3, rotate: Math.PI / 2, alpha: 0.7 });
            return;
          }
          const flash = k.hitFlash > 0 && Math.floor(k.hitFlash * 20) % 2 === 0;
          const alpha = flash ? 0.4 : 1;
          if (standingNow(f, k)) {
            const throwing = k.side === 1 && !f.twoPlayer ? k.throwAt < 0 : f.aiming[k.side];
            drawSprite(ctx, throwing ? art.throwing : art.stand, k.x, k.feet - 22, { scale: 3, flipX: flip, alpha });
          } else {
            drawSprite(ctx, art.duck, k.x, k.feet - 13, { scale: 3, flipX: flip, alpha });
          }
        };
        f.enemies.forEach((e) => drawKid(e, GREEN));
        f.players.forEach((p, i) => drawKid(p, i === 0 ? RED : BLUE));
        // aim guides
        for (const a of aims.current.values()) {
          const k = f.players[a.who];
          if (!k || k.hp <= 0) continue;
          const v = velocityFromDrag(a.x - a.x0, a.y - a.y0);
          const h = handOf(k);
          const pts = predict(f, h.x, h.y, v.vx, v.vy, 0.55);
          ctx.fillStyle = a.who === 0 ? "rgba(224,49,49,0.85)" : "rgba(28,126,214,0.85)";
          pts.forEach(([x, y], n) => {
            if (n % 3) return;
            ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
          });
        }
        // balls
        for (const b of f.balls) {
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(Math.round(b.x) - 4, Math.round(b.y) - 3, 8, 7);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(Math.round(b.x) - 4, Math.round(b.y) - 4, 7, 6);
        }
        drawParticles(ctx, parts.current);
        // hearts
        f.players.forEach((p, i) => {
          for (let n = 0; n < p.maxHp; n++) {
            const x = i === 0 ? 18 + n * 24 : FIELD_W - 18 - n * 24;
            drawSprite(ctx, n < p.hp ? HEART : HEART_EMPTY, x, 22, { scale: 3 });
          }
        });
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillText(p.text, p.x + 1, p.y - (0.8 - p.t) * 30 + 1);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (0.8 - p.t) * 30);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx, sync]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const f = fieldRef.current;
    if (f.over) return;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    const p = toField(e);
    const who: 0 | 1 = f.twoPlayer && p.x > FIELD_W / 2 ? 1 : 0;
    for (const a of aims.current.values()) if (a.who === who) return; // one finger per player
    aims.current.set(e.pointerId, { who, x0: p.x, y0: p.y, x: p.x, y: p.y });
    setAiming(f, who, true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = aims.current.get(e.pointerId);
    if (!a) return;
    const p = toField(e);
    a.x = p.x;
    a.y = p.y;
  };
  const release = (e: React.PointerEvent<HTMLCanvasElement>, fire: boolean) => {
    const a = aims.current.get(e.pointerId);
    if (!a) return;
    aims.current.delete(e.pointerId);
    const f = fieldRef.current;
    setAiming(f, a.who, false);
    if (!fire) return;
    const v = velocityFromDrag(a.x - a.x0, a.y - a.y0);
    if (Math.hypot(v.vx, v.vy) < 140) return;
    if (throwBall(f, a.who, v.vx, v.vy)) sfx("tap");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const stars = over === 0 && !duo ? starsFor(heartsLeft, sp.hearts) : 0;
  const resultText = duo ? (over === 0 ? c.redWin : c.blueWin) : over === 0 ? c.win : c.lose;
  const liveBtn = "game-btn game-btn-live flex min-h-11 items-center justify-center gap-1 text-sm font-bold";
  const idleBtn = "game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold";

  return (
    <div
      ref={containerRef}
      data-game="snowball-fight"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {duo ? (
          <Badge variant="secondary">{c.duo}</Badge>
        ) : (
          <>
            <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
            <Badge variant="outline">{fill(c.left, hud.left)}</Badge>
            {sp.wind !== 0 ? <Badge variant="outline">{c.wind} {sp.wind > 0 ? "→" : "←"}</Badge> : null}
            {sp.hp > 1 ? <Badge variant="outline">{c.tough}</Badge> : null}
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
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={(e) => release(e, true)}
          onPointerCancel={(e) => release(e, false)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!started && over === null ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over !== null ? (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{resultText}</p>
            {!duo && over === 0 ? <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, duo)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              {!duo ? (
                <Button className="min-h-12" disabled={over !== 0} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1, false)}>
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
