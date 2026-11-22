import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  BOMB, BUBBLE_SLUG, DANGER_ROW, EMPTY, FIELD_H, FIELD_W, LEVEL_COUNT, R, RAINBOW, ROW_H, SHOOTER, STONE,
  aimAngle, cellCenter, clampAngle, newGame, resolveShot, rowLength, stars, swap, traceShot, type GameState,
} from "../../lib/games/bubble-garden";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; shots: string; score: string; drop: string; swap: string; retry: string; next: string; won: string; lost: string;
  hint: string; rainbow: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; gardens: string[];
}> = {
  ko: {
    stage: "{0}번째 화단", shots: "쏜 방울 {0}", score: "점수 {0}", drop: "{0}번 더 빗나가면 천장이 내려와요", swap: "바꾸기", retry: "다시 하기", next: "다음 화단",
    won: "화단의 방울을 모두 터뜨렸어요!", lost: "방울이 선을 넘었어요", hint: "끌어서 겨누고 손을 떼면 쏩니다. 같은 색 3개 이상이 붙으면 터지고, 매달린 방울은 떨어집니다.",
    rainbow: "무지개 방울! 어느 색에도 붙어요", stages: "화단 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    gardens: ["앞마당", "장독대 옆", "개울가", "온실", "해바라기 밭", "연못", "돌담길"],
  },
  en: {
    stage: "Garden bed {0}", shots: "Shots {0}", score: "Score {0}", drop: "{0} more misses and the ceiling sinks", swap: "Swap", retry: "Try again", next: "Next bed",
    won: "Every bubble in the bed popped!", lost: "The bubbles crossed the line", hint: "Drag to aim, release to shoot. Three or more of a colour pop, and anything hanging below falls.",
    rainbow: "Rainbow bubble! It matches any colour", stages: "Pick a bed", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    gardens: ["Front yard", "By the crock terrace", "Creek side", "Greenhouse", "Sunflower patch", "Pond", "Stone-wall lane"],
  },
  ja: {
    stage: "{0}番目の花壇", shots: "発射 {0}", score: "スコア {0}", drop: "あと{0}回外すと天井が下がります", swap: "入れ替え", retry: "もう一度", next: "次の花壇",
    won: "花壇のしゃぼん玉を全部割りました！", lost: "しゃぼん玉が線を越えました", hint: "ドラッグで狙って離すと発射。同じ色が3つ以上つながると割れ、ぶら下がった玉は落ちます。",
    rainbow: "虹のしゃぼん玉！どの色にもくっつきます", stages: "花壇を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    gardens: ["前庭", "甕置き場のそば", "小川のほとり", "温室", "ひまわり畑", "池", "石垣の道"],
  },
  zh: {
    stage: "第{0}块花圃", shots: "发射 {0}", score: "得分 {0}", drop: "再落空{0}次天花板就会下降", swap: "交换", retry: "再来一次", next: "下一块花圃",
    won: "花圃里的泡泡全部戳破了！", lost: "泡泡越过了警戒线", hint: "拖动瞄准，松手发射。同色三个以上相连就会破，下面悬着的泡泡会掉落。",
    rainbow: "彩虹泡泡！能和任何颜色相连", stages: "选择花圃", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    gardens: ["前院", "酱缸台旁", "小溪边", "温室", "向日葵田", "池塘", "石墙小路"],
  },
  fr: {
    stage: "Parterre {0}", shots: "Tirs {0}", score: "Score {0}", drop: "Encore {0} ratés et le plafond descend", swap: "Échanger", retry: "Réessayer", next: "Parterre suivant",
    won: "Toutes les bulles du parterre ont éclaté !", lost: "Les bulles ont franchi la ligne", hint: "Glissez pour viser, relâchez pour tirer. Trois bulles d'une couleur éclatent et tout ce qui pend dessous tombe.",
    rainbow: "Bulle arc-en-ciel ! Elle s'accorde à toutes les couleurs", stages: "Choisir un parterre", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    gardens: ["Cour avant", "Près des jarres", "Bord du ruisseau", "Serre", "Champ de tournesols", "Étang", "Chemin de pierre"],
  },
  es: {
    stage: "Parterre {0}", shots: "Disparos {0}", score: "Puntos {0}", drop: "{0} fallos más y el techo baja", swap: "Cambiar", retry: "Reintentar", next: "Siguiente parterre",
    won: "¡Explotaste todas las burbujas del parterre!", lost: "Las burbujas cruzaron la línea", hint: "Arrastra para apuntar y suelta para disparar. Tres o más de un color explotan y lo que cuelga debajo cae.",
    rainbow: "¡Burbuja arcoíris! Encaja con cualquier color", stages: "Elegir parterre", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    gardens: ["Patio delantero", "Junto a las tinajas", "Orilla del arroyo", "Invernadero", "Campo de girasoles", "Estanque", "Sendero de piedra"],
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bubble-garden:muted";
const PALETTE = ["#ff6b81", "#4dabf7", "#ffd43b", "#69db7c", "#b197fc", "#ff922b"];

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number }
interface Faller { x: number; y: number; vy: number; v: number }
interface Flight { path: Array<{ x: number; y: number }>; t: number; total: number; v: number; onDone: () => void }

function drawSymbol(ctx: CanvasRenderingContext2D, v: number, x: number, y: number, r: number): void {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  const s = r * 0.42;
  ctx.beginPath();
  switch (v) {
    case 0: // flower
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.moveTo(x + Math.cos(a) * s * 0.55 + s * 0.32, y + Math.sin(a) * s * 0.55);
        ctx.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.32, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    case 1: // drop
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x + s, y + s * 0.2, x, y + s * 0.8);
      ctx.quadraticCurveTo(x - s, y + s * 0.2, x, y - s);
      ctx.fill();
      break;
    case 2: // star
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 ? s * 0.45 : s;
        if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 3: // leaf
      ctx.ellipse(x, y, s * 0.5, s, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 4: // moon
      ctx.arc(x, y, s * 0.8, 0.6, Math.PI * 2 - 0.6);
      ctx.arc(x + s * 0.45, y, s * 0.55, Math.PI * 2 - 0.9, 0.9, true);
      ctx.fill();
      break;
    case 5: // heart
      ctx.moveTo(x, y + s * 0.8);
      ctx.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.5, y - s, x, y - s * 0.35);
      ctx.bezierCurveTo(x + s * 0.5, y - s, x + s * 1.2, y - s * 0.1, x, y + s * 0.8);
      ctx.fill();
      break;
  }
}

function drawBubble(ctx: CanvasRenderingContext2D, v: number, x: number, y: number, r = R - 1): void {
  if (v === EMPTY) return;
  if (v === STONE) {
    ctx.fillStyle = "#868e96";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, y + r * 0.3);
    ctx.lineTo(x - r * 0.5, y - r * 0.8);
    ctx.lineTo(x + r * 0.6, y - r * 0.85);
    ctx.lineTo(x + r * 0.95, y + r * 0.2);
    ctx.lineTo(x + r * 0.3, y + r * 0.9);
    ctx.lineTo(x - r * 0.6, y + r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#adb5bd";
    ctx.fillRect(x - r * 0.3, y - r * 0.4, r * 0.5, r * 0.2);
    return;
  }
  if (v === BOMB) {
    ctx.fillStyle = "#343a40";
    ctx.beginPath();
    ctx.arc(x, y + 2, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e8590c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.3, y - r * 0.6);
    ctx.quadraticCurveTo(x + r * 0.7, y - r * 1.1, x + r * 0.9, y - r * 0.8);
    ctx.stroke();
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(x + r * 0.9, y - r * 0.8, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  let fillStyle: string | CanvasGradient;
  if (v === RAINBOW) {
    const g = ctx.createConicGradient(0, x, y);
    PALETTE.forEach((c, i) => g.addColorStop(i / PALETTE.length, c));
    g.addColorStop(1, PALETTE[0]);
    fillStyle = g;
  } else {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, PALETTE[v] ?? "#ccc");
    g.addColorStop(1, PALETTE[v] ?? "#ccc");
    fillStyle = g;
  }
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (v !== RAINBOW) drawSymbol(ctx, v, x, y + 1, r);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

export default function BubbleGarden({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [state, setState] = useState<GameState>(() => newGame(0));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [angle, setAngle] = useState(Math.PI / 2);
  const [aiming, setAiming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const particles = useRef<Particle[]>([]);
  const fallers = useRef<Faller[]>([]);
  const flight = useRef<Flight | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const angleRef = useRef(angle);
  angleRef.current = angle;
  const aimingRef = useRef(aiming);
  aimingRef.current = aiming;

  useRunRecord(BUBBLE_SLUG, state.status === "won", state.score);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setState(newGame(i));
    particles.current = [];
    fallers.current = [];
    flight.current = null;
    setBusy(false);
    setToast("");
  }, []);

  useEffect(() => {
    const done = loadClearedStages(BUBBLE_SLUG, LEVEL_COUNT);
    setCleared(done);
    load(nextOpenStage(done, LEVEL_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const shoot = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "play" || flight.current) return;
    const shot = traceShot(s.grid, angleRef.current, s.drops);
    if (!shot.cell) return;
    let total = 0;
    for (let i = 1; i < shot.path.length; i++) total += Math.hypot(shot.path[i].x - shot.path[i - 1].x, shot.path[i].y - shot.path[i - 1].y);
    setBusy(true);
    sfx("tap");
    flight.current = {
      path: shot.path, t: 0, total, v: s.current,
      onDone: () => {
        const res = resolveShot(stateRef.current, shot.cell);
        for (const [r, cc] of [...res.popped, ...res.exploded]) {
          const p = cellCenter(r, cc, s.drops);
          for (let k = 0; k < 7; k++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 60 + Math.random() * 120;
            particles.current.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, color: PALETTE[Math.max(0, s.grid[r]?.[cc] ?? 0)] ?? "#fff", r: 3 + Math.random() * 3 });
          }
        }
        for (const f of res.dropped) {
          const p = cellCenter(f.cell[0], f.cell[1], s.drops);
          fallers.current.push({ x: p.x, y: p.y, vy: -60 - Math.random() * 80, v: f.value });
        }
        if (res.state.status === "won") {
          sfx("win");
          setCleared(markStageCleared(BUBBLE_SLUG, res.state.level, LEVEL_COUNT));
        } else if (res.state.status === "lost") sfx("lose");
        else if (res.dropped.length >= 5 || res.rainbowEarned) sfx("combo");
        else if (res.popped.length) sfx("success");
        else sfx("place");
        setToast(res.rainbowEarned ? c.rainbow : "");
        setState(res.state);
        setBusy(false);
      },
    };
  }, [sfx, c.rainbow]);

  // render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = canvasRef.current?.getContext("2d");
      const s = stateRef.current;
      if (ctx) {
        const sky = ctx.createLinearGradient(0, 0, 0, FIELD_H);
        sky.addColorStop(0, "#e7f5ff");
        sky.addColorStop(0.7, "#f3fbe8");
        sky.addColorStop(1, "#c0eb75");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        // trellis ceiling
        const top = s.drops * ROW_H;
        ctx.fillStyle = "#8c6239";
        ctx.fillRect(0, 0, FIELD_W, Math.max(6, top + 4));
        ctx.fillStyle = "#a9773f";
        for (let x = 0; x < FIELD_W; x += 24) ctx.fillRect(x, Math.max(0, top - 6), 14, 10);
        // danger line
        const dy = R + DANGER_ROW * ROW_H - R;
        ctx.strokeStyle = "rgba(224,49,49,0.45)";
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.lineTo(FIELD_W, dy);
        ctx.stroke();
        ctx.setLineDash([]);
        // grass tufts
        ctx.fillStyle = "#94d82d";
        for (let x = 6; x < FIELD_W; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x, FIELD_H);
          ctx.lineTo(x + 5, FIELD_H - 14 - (x % 5) * 2);
          ctx.lineTo(x + 10, FIELD_H);
          ctx.fill();
        }
        // board
        for (let r = 0; r < s.grid.length; r++) for (let cc = 0; cc < rowLength(r); cc++) {
          const v = s.grid[r][cc];
          if (v === EMPTY) continue;
          const p = cellCenter(r, cc, s.drops);
          drawBubble(ctx, v, p.x, p.y);
        }
        // aim guide
        if (s.status === "play" && !flight.current) {
          const shot = traceShot(s.grid, angleRef.current, s.drops);
          ctx.strokeStyle = aimingRef.current ? "rgba(73,80,87,0.65)" : "rgba(73,80,87,0.3)";
          ctx.setLineDash([2, 8]);
          ctx.lineCap = "round";
          ctx.lineWidth = 4;
          ctx.beginPath();
          let len = 0;
          ctx.moveTo(shot.path[0].x, shot.path[0].y);
          for (let i = 1; i < shot.path.length && len < 520; i++) {
            ctx.lineTo(shot.path[i].x, shot.path[i].y);
            len += Math.hypot(shot.path[i].x - shot.path[i - 1].x, shot.path[i].y - shot.path[i - 1].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          if (shot.cell && aimingRef.current) {
            const p = cellCenter(shot.cell[0], shot.cell[1], s.drops);
            ctx.strokeStyle = "rgba(73,80,87,0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, R - 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // shooter: a little watering can nozzle
        ctx.save();
        ctx.translate(SHOOTER.x, SHOOTER.y);
        ctx.rotate(-angleRef.current + Math.PI / 2);
        ctx.fillStyle = "#5c940d";
        ctx.fillRect(-6, -R * 2.1, 12, R * 1.6);
        ctx.restore();
        ctx.fillStyle = "#74b816";
        ctx.beginPath();
        ctx.arc(SHOOTER.x, SHOOTER.y + 4, R * 1.35, Math.PI, 0);
        ctx.fill();
        if (!flight.current && s.status === "play") drawBubble(ctx, s.current, SHOOTER.x, SHOOTER.y);
        if (s.status === "play") {
          ctx.globalAlpha = 0.9;
          drawBubble(ctx, s.next, SHOOTER.x + R * 3.4, SHOOTER.y + 6, R * 0.7);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(73,80,87,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(SHOOTER.x + R * 3.4, SHOOTER.y + 6, R * 0.95, 0, Math.PI * 2);
          ctx.stroke();
        }
        // flying bubble
        const f = flight.current;
        if (f) {
          f.t += dt * 900;
          let remaining = Math.min(f.t, f.total);
          let pos = f.path[0];
          for (let i = 1; i < f.path.length; i++) {
            const seg = Math.hypot(f.path[i].x - f.path[i - 1].x, f.path[i].y - f.path[i - 1].y);
            if (remaining <= seg) {
              const k = seg === 0 ? 1 : remaining / seg;
              pos = { x: f.path[i - 1].x + (f.path[i].x - f.path[i - 1].x) * k, y: f.path[i - 1].y + (f.path[i].y - f.path[i - 1].y) * k };
              break;
            }
            remaining -= seg;
            pos = f.path[i];
          }
          drawBubble(ctx, f.v, pos.x, pos.y);
          if (f.t >= f.total) {
            flight.current = null;
            f.onDone();
          }
        }
        // falling bubbles and pop sparks
        fallers.current = fallers.current.filter((b) => b.y < FIELD_H + R);
        for (const b of fallers.current) {
          b.vy += 900 * dt;
          b.y += b.vy * dt;
          drawBubble(ctx, b.v, b.x, b.y);
        }
        particles.current = particles.current.filter((p) => p.life > 0);
        for (const p of particles.current) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 200 * dt;
          ctx.globalAlpha = Math.max(0, p.life / 0.6);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.status !== "play" || busy) return;
    const p = toField(e);
    // tapping the waiting bubble swaps
    if (Math.hypot(p.x - (SHOOTER.x + R * 3.4), p.y - (SHOOTER.y + 6)) < R * 1.4) {
      setState((s) => swap(s));
      sfx("tap");
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setAiming(true);
    setAngle(aimAngle(p.x, p.y));
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.status !== "play") return;
    if (e.pointerType === "mouse" || aiming) setAngle(aimAngle(toField(e).x, toField(e).y));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aiming) return;
    setAiming(false);
    const p = toField(e);
    if (p.y < SHOOTER.y - R) shoot();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { setAngle((a) => clampAngle(a + 0.05)); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setAngle((a) => clampAngle(a - 0.05)); e.preventDefault(); }
    else if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") { shoot(); e.preventDefault(); }
    else if (e.key.toLowerCase() === "x") setState((s) => swap(s));
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const missesLeft = state.missesPerDrop - state.misses;
  const st = stars(state);

  return (
    <div
      ref={containerRef}
      data-game="bubble-garden"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, state.level + 1)} / {LEVEL_COUNT}</Badge>
        <Badge variant="outline">{c.gardens[state.level % c.gardens.length]}</Badge>
        <Badge variant="outline">{fill(c.score, state.score)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setAiming(false)}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.hint}
        />
        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-bold shadow">{toast}</span>
          </div>
        ) : null}
      </div>

      {state.status === "play" ? (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="tabular-nums">{fill(c.shots, state.shots)}</span>
            <span className="ml-auto">{fill(c.drop, missesLeft)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="min-h-12" disabled={busy} onClick={() => { setState((s) => swap(s)); sfx("tap"); }}>
              <ArrowLeftRight className="size-4" />
              {c.swap}
            </Button>
            <Button variant="outline" className="min-h-12" onClick={() => load(state.level)}>
              <RotateCcw className="size-4" />
              {c.retry}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{c.hint}</p>
        </>
      ) : (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-lg font-bold">{state.status === "won" ? c.won : c.lost}</p>
          {state.status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm tabular-nums">{fill(c.score, state.score)} · {fill(c.shots, state.shots)}</p>
          {state.status === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(state.level)}>{c.retry}</Button>
              <Button className="min-h-12" onClick={() => load(state.level >= LEVEL_COUNT - 1 ? 0 : state.level + 1)}>
                {state.level >= LEVEL_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(state.level)}>{c.retry}</Button>
          )}
        </div>
      )}

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={LEVEL_COUNT} current={state.level} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
