import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { LEVELS, LEVEL_COUNT, SUNRISE_SLUG, allowed, isWon, moveBy, occupancy, parse, reach, starsFor, type Dir, type Piece } from "../../lib/games/first-sunrise";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; par: string; undo: string; reset: string; next: string; won: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; shot: string;
}> = {
  ko: {
    stage: "{0}번째 새벽", moves: "이동 {0}", par: "최소 {0}", undo: "되돌리기", reset: "처음부터", next: "다음 새벽",
    won: "2027년 첫 해가 떴어요!", shot: "떠오른 해를 캡처해 새해 인사로 보내 보세요.",
    help: "구름을 손가락으로 끌어 밀어 보세요. 가로 구름은 옆으로, 세로 구름은 위아래로만 움직이고, 까치는 어느 쪽으로든 갈 수 있습니다. 산봉우리는 움직이지 않아요. 해는 위아래로만 움직여요. 해가 맨 윗줄에 닿도록 길을 열어 주세요.",
    stages: "새벽 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Dawn {0}", moves: "Moves {0}", par: "Best {0}", undo: "Undo", reset: "Restart", next: "Next dawn",
    won: "The first sun of 2027 is up!", shot: "Screenshot the sunrise and send it as a new-year greeting.",
    help: "Drag the clouds out of the way. Wide clouds slide sideways, tall clouds slide up and down, and the magpie can hop any way. Mountain peaks never move. The sun moves only up and down: clear a path until it touches the top row.",
    stages: "Pick a dawn", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}番目の夜明け", moves: "移動 {0}", par: "最短 {0}", undo: "戻す", reset: "最初から", next: "次の夜明け",
    won: "2027年の初日の出！", shot: "昇った太陽をスクショして年賀のあいさつに。",
    help: "雲を指でドラッグして動かしましょう。横長の雲は左右、縦長の雲は上下にだけ動き、カササギはどの方向にも動けます。山の峰は動きません。太陽は上下にしか動きません。いちばん上の段に届くよう道を開けましょう。",
    stages: "夜明けを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}个黎明", moves: "移动 {0}", par: "最少 {0}", undo: "撤销", reset: "重来", next: "下一个黎明",
    won: "2027年的第一轮太阳升起来了！", shot: "截下日出，当作新年问候发出去吧。",
    help: "用手指拖动云朵让开道路。横云只能左右移动，竖云只能上下移动，喜鹊可以往任意方向走。山峰不会动。太阳只能上下移动，帮它打开通道，直到碰到最上面一行。",
    stages: "选择黎明", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Aube {0}", moves: "Coups {0}", par: "Record {0}", undo: "Annuler", reset: "Recommencer", next: "Aube suivante",
    won: "Le premier soleil de 2027 est levé !", shot: "Faites une capture du lever de soleil pour vos vœux.",
    help: "Faites glisser les nuages pour libérer le passage. Les nuages larges glissent sur les côtés, les nuages hauts de haut en bas, et la pie peut sauter dans tous les sens. Les sommets ne bougent jamais. Le soleil ne bouge que de haut en bas : ouvrez-lui la voie jusqu'à la rangée du haut.",
    stages: "Choisir une aube", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Amanecer {0}", moves: "Movimientos {0}", par: "Mínimo {0}", undo: "Deshacer", reset: "Reiniciar", next: "Siguiente amanecer",
    won: "¡Salió el primer sol de 2027!", shot: "Haz una captura del amanecer y envíala como felicitación.",
    help: "Arrastra las nubes para abrir paso. Las nubes anchas se deslizan a los lados, las altas arriba y abajo, y la urraca puede saltar en cualquier dirección. Las cumbres no se mueven. El sol solo se mueve arriba y abajo: ábrele camino hasta la fila de arriba.",
    stages: "Elegir amanecer", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:first-sunrise:muted";
const CELL = 56;
const PX = 4; // screen pixels per art pixel
const ART = CELL / PX; // 14 art pixels per cell

const cloudCache = new Map<string, PixelArt>();
function cloudArt(w: number, h: number, tint: number): PixelArt {
  const key = `${w}x${h}:${tint}`;
  const hit = cloudCache.get(key);
  if (hit) return hit;
  const W = w * ART;
  const H = h * ART;
  const rows: string[] = [];
  const r = 5;
  const inside = (x: number, y: number): boolean => {
    if (x < 1 || y < 2 || x > W - 2 || y > H - 2) return false;
    const cx = Math.min(Math.max(x, 1 + r), W - 2 - r);
    const cy = Math.min(Math.max(y, 2 + r), H - 2 - r);
    if (Math.hypot(x - cx, y - cy) > r) return false;
    return true;
  };
  // puffs along the top edge
  const puff = (x: number, y: number): boolean => {
    const n = Math.max(1, Math.round(W / 9));
    for (let k = 0; k < n; k++) {
      const px = ((k + 0.5) / n) * W;
      if (Math.hypot(x - px, y - 5) < 4.5) return true;
    }
    return false;
  };
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const inBody = inside(x, y + 1) || (y < 9 && puff(x, y) && inside(x, 8));
      if (!inBody) { row += "."; continue; }
      const edge = !(inside(x - 1, y + 1) || (y < 9 && puff(x - 1, y) && inside(x - 1, 8))) || !(inside(x + 1, y + 1) || (y < 9 && puff(x + 1, y) && inside(x + 1, 8))) || !(inside(x, y + 2) || (y + 1 < 9 && puff(x, y + 1) && inside(x, 8))) || !(inside(x, y) || (y - 1 < 9 && y >= 1 && puff(x, y - 1) && inside(x, 8)));
      if (edge) row += "o";
      else if (y > H - 5) row += "s";
      else if (y < 7 && (x + y) % 3 === 0) row += "h";
      else row += "w";
    }
    rows.push(row);
  }
  const palettes = [
    { o: "#6b5b95", w: "#fdf4ff", s: "#d8c7f0", h: "#ffffff" },
    { o: "#7a5c8a", w: "#ffe8f0", s: "#f2c4d8", h: "#ffffff" },
    { o: "#5a6b95", w: "#eef4ff", s: "#c6d4f0", h: "#ffffff" },
  ];
  const art: PixelArt = { rows, palette: palettes[tint % palettes.length] };
  cloudCache.set(key, art);
  return art;
}

const SUN: PixelArt = (() => {
  const S = ART * 2;
  const rows: string[] = [];
  const c = (S - 1) / 2;
  for (let y = 0; y < S; y++) {
    let row = "";
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - c, y - c);
      const a = Math.atan2(y - c, x - c);
      if (d <= 9.5) {
        if ((Math.abs(x - c + 3.5) < 1 || Math.abs(x - c - 3.5) < 1) && Math.abs(y - c + 1.5) < 1.2) row += "k";
        else if (y > c + 2.5 && y < c + 4 && Math.abs(x - c) < 3.2) row += "m";
        else if (Math.abs(x - c + 6) < 1.5 && Math.abs(y - c - 2) < 1) row += "p";
        else if (Math.abs(x - c - 6) < 1.5 && Math.abs(y - c - 2) < 1) row += "p";
        else if (d > 8.4) row += "o";
        else if (x < c - 2 && y < c - 2 && d > 5) row += "h";
        else row += "y";
      } else if (d <= 13 && Math.abs(Math.sin(a * 6)) < 0.32) row += d > 11.5 ? "o" : "r";
      else row += ".";
    }
    rows.push(row);
  }
  return { rows, palette: { y: "#ffcc33", h: "#fff3a6", o: "#e8590c", r: "#ff922b", k: "#5c2b0b", m: "#c2410c", p: "#ff8787" } };
})();

const MAGPIE: PixelArt = {
  palette: { k: "#111827", w: "#f9fafb", b: "#1e40af", y: "#f59f00" },
  rows: [
    "..............",
    "..............",
    "........kkk...",
    ".......kkkkky.",
    ".......kwkk...",
    "bb....kkkk....",
    ".bbk.kkkkk....",
    "..bkkwwwkk....",
    "...kwwwwkk....",
    "....kwwkk.....",
    ".....kkk......",
    "......y.y.....",
    "..............",
    "..............",
  ],
};

const PEAK: PixelArt = {
  palette: { o: "#2b2440", m: "#4b3f6b", d: "#3a3157", s: "#ffffff", l: "#dfe7ff" },
  rows: [
    "......oo......",
    ".....osso.....",
    "....osslso....",
    "....oslsmo....",
    "...osmsmmmo...",
    "...ommmmdmo...",
    "..ommmdmmmmo..",
    "..omdmmmmdmo..",
    ".ommmmdmmmmmo.",
    ".ommdmmmmdmmo.",
    "ommmmmmdmmmmmo",
    "omdmmmmmmmmdmo",
    "ommmmdmmmmmmmo",
    "oooooooooooooo",
  ],
};

const SKY_NIGHT: BackdropSpec = { sky: ["#1b1d4a", "#3b2f6e", "#7a4f8f", "#d9779a", "#ffb38a"], stars: 0.6, seed: 91 };
const SKY_DAY: BackdropSpec = { sky: ["#6ec3ff", "#a3dbff", "#ffe7a3", "#ffc56b"], seed: 92 };

interface Drag {
  piece: number;
  id: number;
  sx: number;
  sy: number;
  axis: "h" | "v" | null;
  min: number; // most negative offset in cells
  max: number;
  off: number; // current offset in px
}

export default function FirstSunrise({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const level = LEVELS[index];
  const parsed = useMemo(() => parse(level), [level]);
  const [history, setHistory] = useState<number[][]>(() => [parse(LEVELS[0]).start.slice()]);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const drag = useRef<Drag | null>(null);
  const stateRef = useRef<number[]>(history[0]);
  const parts = useRef<PixelParticle[]>([]);
  const wonAt = useRef(0);
  const sunDraw = useRef<number | null>(null);

  const state = history[history.length - 1];
  const moves = history.length - 1;
  const won = isWon(parsed, state);
  const st = starsFor(moves, level.par);
  useRunRecord(SUNRISE_SLUG, won, 1000 + st * 300 + index * 20 - moves * 5);

  useEffect(() => { stateRef.current = state; }, [state]);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    const s = parse(LEVELS[i]).start.slice();
    setHistory([s]);
    stateRef.current = s;
    drag.current = null;
    parts.current = [];
    wonAt.current = 0;
    sunDraw.current = null;
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SUNRISE_SLUG, LEVEL_COUNT);
    setCleared(done);
    load(nextOpenStage(done, LEVEL_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const width = parsed.w * CELL;
  const height = parsed.h * CELL;

  const toBoard = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * width, y: ((e.clientY - rect.top) / rect.height) * height };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (won || drag.current) return;
    const p = toBoard(e);
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    if (cx < 0 || cy < 0 || cx >= parsed.w || cy >= parsed.h) return;
    const grid = occupancy(parsed, stateRef.current);
    const piece = grid[cy * parsed.w + cx];
    if (piece < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { piece, id: e.pointerId, sx: p.x, sy: p.y, axis: null, min: 0, max: 0, off: 0 };
    sfx("tap");
  };

  const lockAxis = (d: Drag, axis: "h" | "v") => {
    const s = stateRef.current;
    d.axis = axis;
    const neg: Dir = axis === "h" ? "left" : "up";
    const pos: Dir = axis === "h" ? "right" : "down";
    const pc = parsed.pieces[d.piece];
    d.min = allowed(pc, neg) ? -reach(parsed, s, d.piece, neg) : 0;
    d.max = allowed(pc, pos) ? reach(parsed, s, d.piece, pos) : 0;
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toBoard(e);
    const dx = p.x - d.sx;
    const dy = p.y - d.sy;
    const pc = parsed.pieces[d.piece];
    if (!d.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (pc.axis === "h") lockAxis(d, "h");
      else if (pc.axis === "v") lockAxis(d, "v");
      else lockAxis(d, Math.abs(dx) > Math.abs(dy) ? "h" : "v");
    }
    const raw = d.axis === "h" ? dx : dy;
    d.off = Math.max(d.min * CELL, Math.min(d.max * CELL, raw));
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.axis) return;
    const cells = Math.round(d.off / CELL);
    if (cells === 0) return;
    const dir: Dir = d.axis === "h" ? (cells > 0 ? "right" : "left") : cells > 0 ? "down" : "up";
    const next = moveBy(stateRef.current, d.piece, dir, Math.abs(cells));
    stateRef.current = next;
    setHistory((h) => [...h, next]);
    if (isWon(parsed, next)) {
      wonAt.current = performance.now();
      sfx("win");
      setCleared(markStageCleared(SUNRISE_SLUG, index, LEVEL_COUNT));
    } else sfx(parsed.pieces[d.piece].sun ? "success" : "place");
  };

  const undo = () => {
    if (history.length <= 1 || won) return;
    setHistory((h) => h.slice(0, -1));
    sfx("tap");
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const drawPiece = (ctx: CanvasRenderingContext2D, pc: Piece, i: number, x: number, y: number, t0: number) => {
      if (pc.sun) return;
      if (pc.axis === "free" && pc.w === 1 && pc.h === 1) {
        drawSprite(ctx, MAGPIE, x + CELL / 2, y + CELL / 2 + Math.sin(t0 * 4 + i) * 2, { scale: PX });
        return;
      }
      drawSprite(ctx, cloudArt(pc.w, pc.h, i % 3), x, y, { scale: PX, center: false });
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = canvasRef.current?.getContext("2d");
      const s = stateRef.current;
      if (ctx) {
        const t0 = now / 1000;
        ctx.imageSmoothingEnabled = false;
        const sunIdx = parsed.sunIndex;
        const sunY = s[sunIdx * 2 + 1];
        const progress = 1 - sunY / Math.max(1, parsed.h - 2);
        const finished = isWon(parsed, s);
        const after = finished ? Math.min(1, (now - wonAt.current) / 1400) : 0;
        drawBackdrop(ctx, width, height, SKY_NIGHT, PX);
        ctx.save();
        ctx.globalAlpha = Math.min(1, progress * 0.5 + after * 0.5);
        drawBackdrop(ctx, width, height, SKY_DAY, PX);
        ctx.restore();
        // faint grid
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let y = 1; y < parsed.h; y++) for (let x = 1; x < parsed.w; x++) ctx.fillRect(x * CELL - 2, y * CELL - 2, 4, 4);
        // top row glow: where the sun must reach
        ctx.fillStyle = `rgba(255,214,102,${0.18 + Math.sin(t0 * 2) * 0.08})`;
        ctx.fillRect(0, 0, width, 6);
        // rocks
        parsed.rocks.forEach((r, i) => {
          if (!r) return;
          drawSprite(ctx, PEAK, (i % parsed.w) * CELL + CELL / 2, Math.floor(i / parsed.w) * CELL + CELL / 2, { scale: PX });
        });
        // the sun, with a glow; drawn first so clouds sit in front
        const sx = s[sunIdx * 2] * CELL;
        let syPx = sunY * CELL;
        const dg = drag.current;
        if (dg && dg.piece === sunIdx && dg.axis) syPx += dg.off;
        if (finished) syPx += Math.sin(t0 * 1.5) * 3 * after;
        const glow = ctx.createRadialGradient(sx + CELL, syPx + CELL, 8, sx + CELL, syPx + CELL, CELL * 1.8);
        glow.addColorStop(0, `rgba(255,214,102,${0.55 + after * 0.3})`);
        glow.addColorStop(1, "rgba(255,214,102,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        drawSprite(ctx, SUN, sx + CELL, syPx + CELL + Math.sin(t0 * 2) * 1.5, { scale: PX });
        // pieces
        parsed.pieces.forEach((pc, i) => {
          if (pc.sun) return;
          let x = s[i * 2] * CELL;
          let y = s[i * 2 + 1] * CELL;
          if (dg && dg.piece === i && dg.axis) {
            if (dg.axis === "h") x += dg.off;
            else y += dg.off;
          }
          if (finished) x += (i % 2 ? 1 : -1) * after * after * width * 0.6;
          drawPiece(ctx, pc, i, x, y, t0);
        });
        if (dg && dg.axis) {
          const pc = parsed.pieces[dg.piece];
          let x = s[dg.piece * 2] * CELL;
          let y = s[dg.piece * 2 + 1] * CELL;
          if (dg.axis === "h") x += dg.off;
          else y += dg.off;
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, pc.w * CELL - 4, pc.h * CELL - 4);
        }
        if (finished) {
          if (sunDraw.current === null) {
            sunDraw.current = now;
            spawnBurst(parts.current, sx + CELL, CELL, ["#fff3a6", "#ffcc33", "#ff922b", "#ffffff"], 50, 260);
          }
          if (after >= 1 && parts.current.length < 20) spawnBurst(parts.current, Math.random() * width, Math.random() * height * 0.5, ["#fff3a6", "#ffffff"], 3, 50, Math.floor(now));
          // "2027" in big pixel digits on the bright sky
          ctx.save();
          ctx.globalAlpha = after;
          ctx.fillStyle = "#c2410c";
          ctx.font = `bold ${Math.round(CELL * 1.1)}px ui-monospace, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("2027", width / 2, Math.max(height * 0.55, CELL * 2.9));
          ctx.restore();
        }
        stepParticles(parts.current, dt, 90);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [parsed, width, height]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="first-sunrise"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, index + 1)} / {LEVEL_COUNT}</Badge>
        <Badge variant="outline">{fill(c.moves, moves)}</Badge>
        <Badge variant="outline">{fill(c.par, level.par)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-xl border-4 border-border"
        aria-label={c.help}
      />

      {won ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" role="status">
          <p className="text-lg font-bold">{c.won}</p>
          <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p>
          <p className="text-sm tabular-nums">{fill(c.moves, moves)} · {fill(c.par, level.par)}</p>
          <p className="text-xs text-muted-foreground">{c.shot}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
              <RotateCcw className="size-4" />
              <span>{c.reset}</span>
            </Button>
            <Button className="min-h-12" onClick={() => load(index >= LEVEL_COUNT - 1 ? 0 : index + 1)}>
              <span>{index >= LEVEL_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="game-btn flex min-h-12 items-center justify-center gap-1 text-sm font-bold disabled:opacity-40" onClick={undo} disabled={moves === 0}>
            <Undo2 className="size-4" />
            <span>{c.undo}</span>
          </button>
          <button type="button" className="game-btn flex min-h-12 items-center justify-center gap-1 text-sm font-bold" onClick={() => load(index)}>
            <RotateCcw className="size-4" />
            <span>{c.reset}</span>
          </button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={LEVEL_COUNT} current={index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
