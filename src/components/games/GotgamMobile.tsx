import { useCallback, useEffect, useRef, useState } from "react";
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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { GOTGAM_SLUG, PUZZLES, STAGE_COUNT, freeHooks, hang, hookKey, newBoard, par, solved, starsFor, torques, type GotgamBoard, type GotgamPuzzle } from "../../lib/games/gotgam-mobile";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; start: string; win: string; result: string; again: string; next: string; undo: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; tilt: string;
}> = {
  ko: {
    stage: "{0}단계", moves: "옮긴 횟수 {0} · 기준 {1}", start: "바구니의 곶감을 끌어 고리에 걸어요", win: "모든 대나무가 수평이에요!", result: "{0}번 만에 맞췄어요", again: "다시 하기", next: "다음 단계", undo: "되돌리기", tilt: "아직 기울어요",
    help: "설 앞둔 처마 밑에 곶감을 말려요. 바구니의 곶감을 끌어 대나무 고리에 걸면, 대나무마다 양쪽의 '무게 × 거리'가 같아야 수평이 돼요. 큰 곶감은 3, 중간은 2, 작은 것은 1만큼 무거워요. 고리 위 숫자는 가운데 끈에서 떨어진 거리예요. 고리에 걸린 곶감을 다시 끌면 옮기거나 바구니로 돌려보낼 수 있어요. 뒤로 가면 대나무에 또 대나무가 매달리고, 이미 묶인 곶감(빨간 매듭)과 까치가 앉아 못 쓰는 고리가 나와요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", moves: "Moves {0} · par {1}", start: "Drag persimmons from the basket onto the hooks", win: "Every rod hangs level!", result: "Balanced in {0} moves", again: "Play again", next: "Next stage", undo: "Undo", tilt: "Still tilting",
    help: "Persimmons dry under the eaves before Seollal. Drag each one from the basket onto a hook on the bamboo rods. A rod hangs level only when weight × distance is equal on both sides. Big persimmons weigh 3, medium 2, small 1, and the number above each hook is its distance from the middle string. Drag a hung persimmon again to move it or send it back to the basket. Later rods hang from other rods, some persimmons are already tied on (red knot), and magpies sit on hooks you can't use.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", moves: "手数 {0} · 目安 {1}", start: "かごの干し柿を引いてフックに掛けよう", win: "竹がぜんぶ水平になった！", result: "{0}手でつり合った", again: "もう一度", next: "次の面", undo: "戻す", tilt: "まだ傾いている",
    help: "お正月(ソルラル)前、軒下で干し柿を干します。かごの干し柿を引いて竹のフックに掛けましょう。竹は左右の「重さ×距離」が同じときだけ水平になります。大きい柿は3、中くらいは2、小さいのは1の重さ。フックの上の数字は真ん中のひもからの距離です。掛けた柿をもう一度引けば、移したりかごへ戻したりできます。後半は竹に竹がぶら下がり、最初から結ばれた柿(赤い結び目)や、カササギが止まって使えないフックが出てきます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", moves: "步数 {0} · 标准 {1}", start: "把篮子里的柿饼拖到挂钩上", win: "所有竹竿都平衡了！", result: "{0}步达成平衡", again: "再玩一次", next: "下一关", undo: "撤销", tilt: "还在倾斜",
    help: "春节前在屋檐下晾柿饼。把篮子里的柿饼拖到竹竿的挂钩上。只有两边的「重量×距离」相等时，竹竿才会水平。大柿饼重3，中的重2，小的重1；挂钩上方的数字是它离中间绳子的距离。再拖动已挂好的柿饼可以移动，或放回篮子。后面会有竹竿挂在竹竿上，还有已经绑好的柿饼(红结)，以及喜鹊站着不能用的挂钩。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", moves: "Coups {0} · par {1}", start: "Glissez les kakis du panier vers les crochets", win: "Toutes les tiges sont à niveau !", result: "Équilibré en {0} coups", again: "Rejouer", next: "Niveau suivant", undo: "Annuler", tilt: "Ça penche encore",
    help: "Avant Seollal, des kakis sèchent sous l'avant-toit. Glissez chaque kaki du panier vers un crochet des tiges de bambou. Une tige n'est droite que si poids × distance est égal des deux côtés. Gros kaki = 3, moyen = 2, petit = 1 ; le chiffre au-dessus de chaque crochet est sa distance à la ficelle du milieu. Glissez un kaki suspendu pour le déplacer ou le remettre au panier. Plus loin, des tiges pendent d'autres tiges, certains kakis sont déjà noués (nœud rouge) et des pies occupent des crochets.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", moves: "Movimientos {0} · par {1}", start: "Arrastra los caquis de la cesta a los ganchos", win: "¡Todas las varas están niveladas!", result: "Equilibrado en {0} movimientos", again: "Otra vez", next: "Siguiente nivel", undo: "Deshacer", tilt: "Aún se inclina",
    help: "Antes de Seollal, los caquis se secan bajo el alero. Arrastra cada caqui de la cesta a un gancho de las varas de bambú. Una vara queda nivelada solo si peso × distancia es igual en ambos lados. El caqui grande pesa 3, el mediano 2 y el pequeño 1; el número sobre cada gancho es su distancia al cordel central. Arrastra un caqui colgado para moverlo o devolverlo a la cesta. Más adelante hay varas colgadas de otras varas, caquis ya atados (nudo rojo) y urracas en ganchos que no puedes usar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:gotgam-mobile:muted";
const W = 360;
const H = 560;
const MAIN = { x: 180, y: 128, unit: 40 };
const SUB_UNIT = 22;
const SUB_DROP = 104;
const STRING = 26;
const BASKET_Y = 492;
const SNAP = 34;

function persimmon(n: number): PixelArt {
  // n = body width in pixels; a round orange fruit with a dark calyx on top
  const rows: string[] = [];
  const r = n / 2;
  rows.push(".".repeat(Math.floor(r) - 1) + "gg" + ".".repeat(n - Math.floor(r) - 1));
  rows.push(".".repeat(Math.floor(r) - 2) + "gGGg" + ".".repeat(n - Math.floor(r) - 2));
  for (let y = 0; y < n - 1; y++) {
    let row = "";
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - (n - 1) / 2);
      if (d > r) row += ".";
      else if (d > r - 1) row += "d";
      else if (x < r - 1 && y < (n - 1) / 2 - 1 && x + y > r - 3) row += "h";
      else row += "o";
    }
    rows.push(row);
  }
  return { palette: { o: "#f76707", d: "#c2410c", h: "#ffa94d", g: "#2b8a3e", G: "#5c940d" }, rows };
}
const FRUIT: Record<number, PixelArt> = { 1: persimmon(6), 2: persimmon(8), 3: persimmon(10) };
const FRUIT_R: Record<number, number> = { 1: 10, 2: 13, 3: 16 };
const MAGPIE: PixelArt = {
  palette: { k: "#212529", w: "#f8f9fa", b: "#1864ab", y: "#495057" },
  rows: ["..kk....", ".kkkk...", "kkwkk...", "..kkkkbb", "..wwkkkb", "..wwwkk.", "...kk.kb", "...y..y."],
};
const KNOT: PixelArt = { palette: { r: "#e03131" }, rows: ["r.r", ".r.", "r.r"] };
const BASKET: PixelArt = {
  palette: { b: "#a0703c", d: "#7c4f25", l: "#c4955a" },
  rows: ["dddddddddddddddddddd", "blblblblblblblblblbl", "lblblblblblblblblblb", "blblblblblblblblblbl", ".dddddddddddddddddd."],
};

interface RodView { x: number; y: number; angle: number; unit: number }

function layout(p: GotgamPuzzle, angles: number[]): RodView[] {
  const out: RodView[] = [];
  for (const r of p.rods) {
    if (!r.parent) out[r.id] = { x: MAIN.x, y: MAIN.y, angle: angles[r.id] ?? 0, unit: MAIN.unit };
    else {
      const pv = out[r.parent.rod];
      const hx = pv.x + Math.cos(pv.angle) * r.parent.pos * pv.unit;
      const hy = pv.y + Math.sin(pv.angle) * r.parent.pos * pv.unit;
      out[r.id] = { x: hx, y: hy + SUB_DROP, angle: angles[r.id] ?? 0, unit: SUB_UNIT };
    }
  }
  return out;
}
function hookAt(v: RodView, pos: number): { x: number; y: number } {
  return { x: v.x + Math.cos(v.angle) * pos * v.unit, y: v.y + Math.sin(v.angle) * pos * v.unit };
}
function basketSpot(i: number, n: number): { x: number; y: number } {
  const gap = Math.min(44, 300 / Math.max(1, n));
  return { x: W / 2 - ((n - 1) * gap) / 2 + i * gap, y: BASKET_Y - 4 };
}

export default function GotgamMobile({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState<null | { stars: number; moves: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bRef = useRef<GotgamBoard>(newBoard(PUZZLES[0]));
  const hist = useRef<Array<Record<number, string | null>>>([]);
  const angles = useRef<number[]>([0, 0, 0]);
  const drag = useRef<null | { id: number; fruit: number; x: number; y: number; from: string | null }>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const puzzle = PUZZLES[stage];

  useRunRecord(GOTGAM_SLUG, Boolean(over), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    bRef.current = newBoard(PUZZLES[st]);
    hist.current = [];
    angles.current = [0, 0, 0];
    drag.current = null;
    parts.current = [];
    setMoves(0);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GOTGAM_SLUG, STAGE_COUNT);
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
      const t = now / 1000;
      const b = bRef.current;
      const p = b.puzzle;
      // rods swing toward the side that pulls harder
      const { torque } = torques(p, b.place);
      for (const r of p.rods) {
        const target = Math.max(-0.32, Math.min(0.32, torque[r.id] * 0.035));
        angles.current[r.id] += (target - angles.current[r.id]) * Math.min(1, dt * 5) + Math.sin(t * 1.3 + r.id) * 0.0004;
      }
      stepParticles(parts.current, dt, 90);
      const views = layout(p, angles.current);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // winter sky, a hanok eave across the top and a plank veranda below
        ctx.fillStyle = "#dbe4ff";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#edf2ff";
        for (let k = 0; k < 30; k++) ctx.fillRect((k * 83 + Math.floor(t * 8) * (k % 3)) % W, (k * 47 + t * (12 + (k % 4) * 5)) % 430, 3, 3);
        ctx.fillStyle = "#495057";
        ctx.fillRect(0, 0, W, 40);
        ctx.fillStyle = "#343a40";
        for (let x = 0; x < W; x += 24) ctx.fillRect(x, 32, 20, 14);
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(0, 46, W, 10);
        ctx.fillStyle = "#c0894a";
        ctx.fillRect(0, 456, W, H - 456);
        ctx.fillStyle = "#a9733c";
        for (let y = 470; y < H; y += 18) ctx.fillRect(0, y, W, 2);
        drawSprite(ctx, BASKET, W / 2, BASKET_Y + 18, { scale: 9 });

        // strings and rods
        const takenHooks = new Set(p.rods.filter((r) => r.parent).map((r) => hookKey(r.parent!.rod, r.parent!.pos)));
        ctx.fillStyle = "#212529";
        ctx.fillRect(MAIN.x - 1, 56, 2, MAIN.y - 56);
        for (const r of p.rods) {
          const v = views[r.id];
          if (r.parent) {
            const hp = hookAt(views[r.parent.rod], r.parent.pos);
            ctx.fillStyle = "#212529";
            ctx.fillRect(Math.round(hp.x) - 1, Math.round(hp.y), 2, Math.round(v.y - hp.y));
          }
          const span = Math.max(...r.hooks.map(Math.abs)) * v.unit + 12;
          ctx.save();
          ctx.translate(v.x, v.y);
          ctx.rotate(v.angle);
          ctx.fillStyle = "#5c940d";
          ctx.fillRect(-span, -3, span * 2, 6);
          ctx.fillStyle = "#82c91e";
          ctx.fillRect(-span, -3, span * 2, 2);
          ctx.fillStyle = "#2b8a3e";
          for (let x = -span + 18; x < span; x += 30) ctx.fillRect(Math.round(x), -3, 2, 6);
          ctx.restore();
          ctx.fillStyle = "#212529";
          ctx.fillRect(Math.round(v.x) - 3, Math.round(v.y) - 3, 6, 6);
          const level = Math.abs(torque[r.id]) === 0;
          ctx.fillStyle = level ? "#2f9e44" : "#e8590c";
          ctx.fillRect(Math.round(v.x) - 2, Math.round(v.y) - 2, 4, 4);
          for (const pos of r.hooks) {
            const k = hookKey(r.id, pos);
            if (takenHooks.has(k)) continue;
            const hp = hookAt(v, pos);
            ctx.fillStyle = "#868e96";
            ctx.fillRect(Math.round(hp.x) - 1, Math.round(hp.y) + 3, 2, 6);
            ctx.fillRect(Math.round(hp.x) - 3, Math.round(hp.y) + 8, 5, 2);
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "#495057";
            ctx.fillText(String(Math.abs(pos)), hp.x, hp.y - 7);
            if (p.blocked.includes(k)) drawSprite(ctx, MAGPIE, hp.x, hp.y + 18, { scale: 3, flipX: pos < 0 });
          }
        }

        // fruits: on hooks, in the basket, or in the hand
        const inBasket = p.fruits.filter((f) => !b.place[f.id] && drag.current?.fruit !== f.id);
        const drawFruit = (id: number, x: number, y: number, hung: boolean) => {
          const f = p.fruits[id];
          if (hung) {
            ctx.fillStyle = "#212529";
            ctx.fillRect(Math.round(x) - 1, Math.round(y - STRING), 2, STRING - FRUIT_R[f.w] + 4);
          }
          const fy = hung ? y + 2 : y;
          drawSprite(ctx, FRUIT[f.w], x, fy, { scale: 3 });
          if (p.locked[id] !== undefined) drawSprite(ctx, KNOT, x, fy - FRUIT_R[f.w] - 2, { scale: 3 });
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#fff";
          ctx.fillText(String(f.w), x, fy + 6);
        };
        for (const f of p.fruits) {
          const k = b.place[f.id];
          if (!k || drag.current?.fruit === f.id) continue;
          const [rid, pos] = k.split(":").map(Number);
          const hp = hookAt(views[rid], pos);
          drawFruit(f.id, hp.x, hp.y + STRING, true);
        }
        inBasket.forEach((f, i) => {
          const sp = basketSpot(i, inBasket.length);
          drawFruit(f.id, sp.x, sp.y, false);
        });
        const d = drag.current;
        if (d) {
          // show where it would land
          const hk = nearestHook(p, views, d.x, d.y);
          if (hk) {
            const hp = hookAt(views[hk.rod], hk.pos);
            ctx.strokeStyle = "#fab005";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(hp.x, hp.y + STRING, FRUIT_R[p.fruits[d.fruit].w] + 5, 0, Math.PI * 2);
            ctx.stroke();
          }
          drawFruit(d.fruit, d.x, d.y, false);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (over) return;
    const pt = toField(e);
    const b = bRef.current;
    const p = b.puzzle;
    const views = layout(p, angles.current);
    let best = -1;
    let bd = 30;
    const inBasket = p.fruits.filter((f) => !b.place[f.id]);
    for (const f of p.fruits) {
      if (p.locked[f.id] !== undefined) continue;
      const k = b.place[f.id];
      let at: { x: number; y: number };
      if (k) {
        const [rid, pos] = k.split(":").map(Number);
        const hp = hookAt(views[rid], pos);
        at = { x: hp.x, y: hp.y + STRING + 2 };
      } else at = basketSpot(inBasket.indexOf(f), inBasket.length);
      const dd = Math.hypot(at.x - pt.x, at.y - pt.y);
      if (dd < bd) {
        bd = dd;
        best = f.id;
      }
    }
    if (best < 0) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, fruit: best, x: pt.x, y: pt.y, from: b.place[best] };
    sfx("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const pt = toField(e);
    d.x = pt.x;
    d.y = pt.y;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const b = bRef.current;
    const p = b.puzzle;
    const views = layout(p, angles.current);
    const hk = nearestHook(p, views, d.x, d.y);
    const key = hk ? hookKey(hk.rod, hk.pos) : null;
    const snap = { ...b.place };
    if (!hang(b, d.fruit, key)) return;
    hist.current.push(snap);
    setMoves(b.moves);
    if (key) {
      const hp = hookAt(views[hk!.rod], hk!.pos);
      spawnBurst(parts.current, hp.x, hp.y + STRING, ["#ffa94d", "#ffffff"], 6, 60, b.moves * 7);
      sfx("place");
    }
    if (solved(b)) {
      const stars = starsFor(b.moves, p);
      setOver({ stars, moves: b.moves });
      setCleared(markStageCleared(GOTGAM_SLUG, p.stage, STAGE_COUNT));
      spawnBurst(parts.current, MAIN.x, MAIN.y, ["#f76707", "#ffd43b", "#ffffff", "#2b8a3e"], 40, 160, b.moves);
      sfx("win");
    }
  };
  const undo = () => {
    const prev = hist.current.pop();
    if (!prev || over) return;
    bRef.current.place = prev;
    setMoves(bRef.current.moves);
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
      data-game="gotgam-mobile"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves, par(puzzle))}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={undo} aria-label={c.undo}>
            <Undo2 className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (drag.current = null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p>
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

/** The free hook whose hanging spot is nearest the point, within snapping distance. */
function nearestHook(p: GotgamPuzzle, views: RodView[], x: number, y: number): { rod: number; pos: number } | null {
  let best: { rod: number; pos: number } | null = null;
  let bd = SNAP;
  for (const k of freeHooks(p)) {
    const [rod, pos] = k.split(":").map(Number);
    const hp = hookAt(views[rod], pos);
    const d = Math.min(Math.hypot(hp.x - x, hp.y + STRING - y), Math.hypot(hp.x - x, hp.y - y));
    if (d < bd) {
      bd = d;
      best = { rod, pos };
    }
  }
  return best;
}
