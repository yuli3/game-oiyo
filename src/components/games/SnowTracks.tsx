import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { PUZZLES, STAGE_COUNT, TRACKS_SLUG, extend, grab, isComplete, newBoard, solved, starsFor, type TrackBoard } from "../../lib/games/snow-tracks";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; strokes: string; start: string; win: string; again: string; next: string; reset: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; names: string[]; result: string;
}> = {
  ko: {
    stage: "{0}단계", strokes: "손질 {0}번", start: "굴에서 먹이까지 손가락으로 이어요", win: "모든 발자국이 이어졌어요!", again: "다시 하기", next: "다음 단계", reset: "눈 다시 덮기",
    names: ["토끼", "여우", "노루", "까치", "멧돼지", "다람쥐", "수달"], result: "손질 {0}번으로 완성",
    help: "동물마다 굴에서 출발해 자기 먹이까지 밤새 걸어갔어요. 굴을 누르고 손가락을 움직여 발자국 길을 그리세요. 길은 위·아래·옆으로만 가고, 서로 겹치거나 엇갈리지 않으며, 나무를 뺀 눈밭을 빈칸 없이 모두 지나야 해요. 미리 찍힌 발자국은 그 동물의 길이 지나가는 곳이에요. 답은 하나뿐이에요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", strokes: "{0} strokes", start: "Drag from a burrow to its food", win: "Every trail is joined up!", again: "Play again", next: "Next stage", reset: "Fresh snow",
    names: ["Rabbit", "Fox", "Deer", "Magpie", "Boar", "Squirrel", "Otter"], result: "Solved in {0} strokes",
    help: "Each animal walked from its burrow to its own food overnight. Press a burrow and drag to draw its trail. Trails go up, down or sideways, never overlap or cross, and together cover every patch of snow except the trees. Footprints already in the snow show whose trail passes there. Each puzzle has exactly one answer.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}面", strokes: "{0}回なぞり", start: "巣穴からエサまで指でつなごう", win: "足あとが全部つながった！", again: "もう一度", next: "次の面", reset: "雪をならす",
    names: ["ウサギ", "キツネ", "ノロジカ", "カササギ", "イノシシ", "リス", "カワウソ"], result: "{0}回で完成",
    help: "動物たちは夜のあいだに巣穴から自分のエサまで歩きました。巣穴を押して指を動かし、足あとの道を描きましょう。道は上下左右にだけ進み、重なったり交差したりせず、木以外の雪原をすべて通ります。最初からある足あとは、その動物の道が通る場所です。答えはひとつだけ。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}关", strokes: "画了{0}笔", start: "用手指从洞口连到食物", win: "所有脚印都连上了！", again: "再玩一次", next: "下一关", reset: "重新铺雪",
    names: ["兔子", "狐狸", "狍子", "喜鹊", "野猪", "松鼠", "水獭"], result: "{0}笔完成",
    help: "每只动物夜里都从自己的洞口走到自己的食物。按住洞口拖动手指，画出脚印路线。路线只能上下左右走，不能重叠或交叉，并且要走遍除树以外的所有雪地。雪里原有的脚印表示那只动物的路线会经过那里。每题只有一个答案。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", strokes: "{0} tracés", start: "Glissez d'un terrier à sa nourriture", win: "Toutes les traces sont reliées !", again: "Rejouer", next: "Niveau suivant", reset: "Neige fraîche",
    names: ["Lapin", "Renard", "Chevreuil", "Pie", "Sanglier", "Écureuil", "Loutre"], result: "Résolu en {0} tracés",
    help: "Chaque animal a marché cette nuit de son terrier jusqu'à sa nourriture. Appuyez sur un terrier et glissez pour tracer son chemin. Les chemins vont en haut, en bas ou de côté, ne se chevauchent ni ne se croisent, et couvrent ensemble toute la neige sauf les arbres. Les empreintes déjà dans la neige montrent quel chemin passe là. Chaque grille n'a qu'une solution.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", strokes: "{0} trazos", start: "Arrastra de una madriguera a su comida", win: "¡Todas las huellas están unidas!", again: "Otra vez", next: "Siguiente nivel", reset: "Nieve nueva",
    names: ["Conejo", "Zorro", "Corzo", "Urraca", "Jabalí", "Ardilla", "Nutria"], result: "Resuelto en {0} trazos",
    help: "Cada animal caminó de noche desde su madriguera hasta su comida. Pulsa una madriguera y arrastra para dibujar su rastro. Los rastros van arriba, abajo o de lado, no se solapan ni se cruzan y entre todos cubren toda la nieve salvo los árboles. Las huellas que ya hay en la nieve indican qué rastro pasa por ahí. Cada puzle tiene una sola solución.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snow-tracks:muted";
const W = 360;
const H = 420;
const GRID = 344;

export const TRAIL_COLORS = ["#e64980", "#f76707", "#8d5524", "#1c7ed6", "#5c940d", "#ae3ec9", "#0ca678"];

const ANIMAL_ART: PixelArt[] = [
  { palette: { w: "#ffffff", p: "#f783ac", k: "#212529", g: "#dee2e6" }, rows: [".w...w..", ".wp..wp.", ".ww.ww..", "wwwwwww.", "wkwwwkw.", "wwwpwww.", ".wwwwwg.", "..g..g.."] },
  { palette: { o: "#f76707", w: "#fff4e6", k: "#212529" }, rows: ["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "wwwkwww.", ".wwwww..", "..ooooww", "...o..ww"] },
  { palette: { b: "#a0522d", d: "#6f3a1d", w: "#fff4e6", k: "#212529" }, rows: ["d.d..d.d", ".d....d.", "..bbbb..", ".bkbbkb.", ".bbbbbb.", "..bwwb..", "..bbbb..", "..b..b.."] },
  { palette: { k: "#1b1f3b", w: "#ffffff", b: "#1c7ed6" }, rows: ["..kkk...", ".kkwk...", "kkkkkk..", ".wwwkkbb", ".wwwkkbb", "..kkk.bb", "...k....", "..kk...."] },
  { palette: { b: "#5c4033", d: "#3b2a20", p: "#e8a0a0", w: "#fff4e6" }, rows: ["........", ".d....d.", "bbbbbbb.", "bdbbbdbb", "bbbbbppw", "bbbbbbb.", ".b.b.b..", ".d.d.d.."] },
  { palette: { r: "#c2410c", d: "#7c2d12", w: "#fff4e6", k: "#212529" }, rows: ["r....rr.", ".r..rrrr", ".rrrrrrr", "rkrrrrr.", "rrwrrr..", ".rrrr...", ".rr.rr..", "........"] },
  { palette: { b: "#5c4033", w: "#e9ecef", k: "#212529" }, rows: ["........", ".bbbbb..", "bkbbbkb.", "bbwwwbb.", ".bwkwb..", ".bbbbb..", "bbbbbbbb", "b.....bb"] },
];
const FOOD_ART: PixelArt[] = [
  { palette: { g: "#2f9e44", o: "#f76707" }, rows: ["..g.g..", "...g...", "..ooo..", "..ooo..", "...oo..", "...o...", "...o..."] },
  { palette: { r: "#e03131", g: "#2f9e44", w: "#ffc9c9" }, rows: ["...g...", "..g.g..", ".rr.rr.", "rwrrwrr", "rrr.rrr", ".r...r."] },
  { palette: { g: "#2f9e44", l: "#8ce99a" }, rows: ["g..g..g", ".g.g.g.", ".lgggl.", "..ggg..", "...g..."] },
  { palette: { o: "#fd7e14", g: "#2f9e44", y: "#ffd43b" }, rows: ["...gg..", "..oooo.", ".oyoooo", ".oooooo", "..oooo."] },
  { palette: { p: "#ae3ec9", d: "#862e9c", y: "#ffe066" }, rows: ["..pppp..", ".pdpppp.", "pppppppy", ".ppppdp.", "..pppp.."] },
  { palette: { b: "#8a5a3b", c: "#c09060", d: "#5c3d2e" }, rows: ["..ddd..", ".ccccc.", ".bbbbb.", ".bbbbb.", "..bbb..", "...b..."] },
  { palette: { s: "#74c0fc", d: "#339af0", k: "#212529" }, rows: [".....s.", "ssssss.", "sksssss", "ssssss.", ".....s."] },
];
const PINE: PixelArt = {
  palette: { g: "#2b6a4a", d: "#1f4d36", w: "#ffffff", t: "#6b4426" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t..."],
};
const HOLE: PixelArt = { palette: { k: "#343a40", d: "#495057", w: "#f1f3f5" }, rows: [".wwwww.", "wdddddw", "dkkkkkd", "dkkkkkd", ".ddddd."] };

export default function SnowTracks({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [won, setWon] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<TrackBoard>(newBoard(0));
  const drag = useRef<null | { id: number; animal: number; last: { x: number; y: number } }>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const puzzle = PUZZLES[stage];
  const cell = Math.floor(GRID / Math.max(puzzle.w, puzzle.h));
  const ox = Math.floor((W - cell * puzzle.w) / 2);
  const oy = 8;
  const stars = won ? starsFor(strokes, puzzle) : 0;
  useRunRecord(TRACKS_SLUG, won, stars, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    boardRef.current = newBoard(s);
    drag.current = null;
    parts.current = [];
    setStrokes(0);
    setWon(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TRACKS_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      stepParticles(parts.current, dt, 40);
      const b = boardRef.current;
      const p = b.puzzle;
      const cs = Math.floor(GRID / Math.max(p.w, p.h));
      const gx = Math.floor((W - cs * p.w) / 2);
      const gy = 8;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#dbe4f0";
        ctx.fillRect(0, 0, W, H);
        const at = (i: number) => ({ x: gx + (i % p.w) * cs + cs / 2, y: gy + Math.floor(i / p.w) * cs + cs / 2 });
        // snow tiles
        for (let i = 0; i < p.w * p.h; i++) {
          const x = gx + (i % p.w) * cs;
          const y = gy + Math.floor(i / p.w) * cs;
          ctx.fillStyle = (i + Math.floor(i / p.w)) % 2 ? "#ffffff" : "#f3f7fc";
          ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = "#e7eef7";
          ctx.fillRect(x + ((i * 7) % (cs - 6)), y + ((i * 13) % (cs - 6)), 3, 2);
        }
        ctx.strokeStyle = "#c9d6e6";
        ctx.lineWidth = 1;
        for (let k = 0; k <= p.w; k++) {
          ctx.beginPath();
          ctx.moveTo(gx + k * cs + 0.5, gy);
          ctx.lineTo(gx + k * cs + 0.5, gy + p.h * cs);
          ctx.stroke();
        }
        for (let k = 0; k <= p.h; k++) {
          ctx.beginPath();
          ctx.moveTo(gx, gy + k * cs + 0.5);
          ctx.lineTo(gx + p.w * cs, gy + k * cs + 0.5);
          ctx.stroke();
        }
        const spriteScale = Math.max(3, Math.floor(cs / 12));
        // clue footprints pressed in the snow
        for (let i = 0; i < p.clue.length; i++) {
          const a = p.clue[i];
          if (a < 0) continue;
          const q = at(i);
          ctx.fillStyle = TRAIL_COLORS[a];
          ctx.globalAlpha = 0.35;
          ctx.fillRect(q.x - cs / 2 + 3, q.y - cs / 2 + 3, cs - 6, cs - 6);
          ctx.globalAlpha = 1;
          for (const [dx, dy] of [[-6, -6], [4, -2], [-4, 6], [6, 8]]) ctx.fillRect(Math.round(q.x + dx * (cs / 44)) - 2, Math.round(q.y + dy * (cs / 44)) - 3, 5, 6);
        }
        // trails: a thick band with footprints, in travel order
        b.trails.forEach((t, a) => {
          if (t.length < 2) return;
          ctx.strokeStyle = TRAIL_COLORS[a];
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = Math.max(10, cs * 0.42);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          t.forEach((cellIdx, k) => {
            const q = at(cellIdx);
            if (k === 0) ctx.moveTo(q.x, q.y);
            else ctx.lineTo(q.x, q.y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = TRAIL_COLORS[a];
          for (let k = 1; k < t.length; k++) {
            const q0 = at(t[k - 1]);
            const q1 = at(t[k]);
            const dx = Math.sign(q1.x - q0.x);
            const dy = Math.sign(q1.y - q0.y);
            for (const f of [0.3, 0.7]) {
              const x = q0.x + (q1.x - q0.x) * f;
              const y = q0.y + (q1.y - q0.y) * f;
              const side = f < 0.5 ? -1 : 1;
              ctx.fillRect(Math.round(x + dy * side * 4) - 2, Math.round(y + dx * side * 4) - 2, 4, 4);
            }
          }
        });
        // trees, burrows and food
        for (let i = 0; i < p.tree.length; i++) {
          if (!p.tree[i]) continue;
          const q = at(i);
          drawSprite(ctx, PINE, q.x, q.y, { scale: spriteScale });
        }
        for (let a = 0; a < p.animals; a++) {
          const d = at(p.den[a]);
          drawSprite(ctx, HOLE, d.x, d.y + cs * 0.22, { scale: Math.max(2, spriteScale - 1) });
          const t = b.trails[a];
          const head = at(t[t.length - 1]);
          const done = isComplete(b, a);
          const f = at(p.food[a]);
          ctx.fillStyle = TRAIL_COLORS[a];
          ctx.globalAlpha = done ? 0.25 : 0.55;
          ctx.fillRect(f.x - cs / 2 + 2, f.y - cs / 2 + 2, cs - 4, 4);
          ctx.globalAlpha = 1;
          if (!done) drawSprite(ctx, FOOD_ART[a], f.x, f.y, { scale: spriteScale });
          const bob = drag.current?.animal === a ? Math.sin(now / 90) * 2 : 0;
          drawSprite(ctx, ANIMAL_ART[a], head.x, head.y - cs * 0.06 + bob, { scale: spriteScale });
          // colour tab on the burrow so pairs read at a glance
          ctx.fillStyle = TRAIL_COLORS[a];
          ctx.fillRect(d.x - cs / 2 + 2, d.y - cs / 2 + 2, cs - 4, 4);
        }
        // legend strip
        const ly = gy + p.h * cs + 14;
        const slot = W / p.animals;
        for (let a = 0; a < p.animals; a++) {
          const x = slot * a + slot / 2;
          drawSprite(ctx, ANIMAL_ART[a], x - 10, ly + 14, { scale: 3 });
          ctx.fillStyle = isComplete(b, a) ? "#2b8a3e" : "#adb5bd";
          ctx.fillRect(Math.round(x + 10), ly + 8, 10, 10);
          if (isComplete(b, a)) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(Math.round(x + 12), ly + 12, 6, 2);
          }
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cellAt = (x: number, y: number) => {
    const p = boardRef.current.puzzle;
    const cs = Math.floor(GRID / Math.max(p.w, p.h));
    const gx = Math.floor((W - cs * p.w) / 2);
    const cx = Math.floor((x - gx) / cs);
    const cy = Math.floor((y - 8) / cs);
    if (cx < 0 || cy < 0 || cx >= p.w || cy >= p.h) return -1;
    return cy * p.w + cx;
  };
  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const finishCheck = () => {
    const b = boardRef.current;
    if (solved(b)) {
      setWon(true);
      setCleared(markStageCleared(TRACKS_SLUG, b.puzzle.stage, STAGE_COUNT));
      for (let a = 0; a < b.puzzle.animals; a++) {
        const i = b.puzzle.food[a];
        spawnBurst(parts.current, ox + (i % b.puzzle.w) * cell + cell / 2, oy + Math.floor(i / b.puzzle.w) * cell + cell / 2, ["#ffd43b", "#ffffff", "#a5d8ff"], 10, 90, a * 19);
      }
      sfx("win");
    }
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (won || drag.current) return;
    const p = toField(e);
    const i = cellAt(p.x, p.y);
    if (i < 0) return;
    setTouched(true);
    const a = grab(boardRef.current, i);
    if (a < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, animal: a, last: p };
    boardRef.current.moves++;
    setStrokes(boardRef.current.moves);
    sfx("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toField(e);
    const b = boardRef.current;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - d.last.x, p.y - d.last.y) / (cell / 3)));
    for (let k = 1; k <= steps; k++) {
      const i = cellAt(d.last.x + ((p.x - d.last.x) * k) / steps, d.last.y + ((p.y - d.last.y) * k) / steps);
      if (i < 0) continue;
      const wasDone = isComplete(b, d.animal);
      if (extend(b, d.animal, i)) {
        haptics.current?.fire("tap");
        if (!wasDone && isComplete(b, d.animal)) sfx("success");
      }
    }
    d.last = p;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    finishCheck();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="snow-tracks"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{`${puzzle.w}×${puzzle.h}`}</Badge>
        <Badge variant="outline">{fill(c.strokes, strokes)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} disabled={won} aria-label={c.reset}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{c.names.slice(0, puzzle.animals).join(" · ")}</p>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !won ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {won ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, strokes)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
