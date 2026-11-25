import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { EMPTY, SHELF_SLUG, SHELF_STAGES, SLOTS, STAGE_COUNT, freeSpot, move, newBakery, starsFor, type Bakery } from "../../lib/games/bakery-shelf";
import { BREAD_ART } from "../../lib/games/bakery-shelf-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    moves: "이동 {0}/{1}",
    start: "빵을 눌러 옮겨요!",
    win: "다 팔았어요!",
    lose: "이동 횟수를 다 썼어요",
    result: "{0}번 옮겨서 다 팔았어요",
    help: "빵집 진열대가 뒤죽박죽이에요. 선반마다 앞줄에 빵 세 개를 놓을 자리가 있고, 뒤에는 쟁반이 더 기다려요. 빵을 누른 다음 다른 선반의 빈자리를 누르면 옮겨져요. 끌어다 놓아도 돼요. 같은 빵 셋이 한 선반에 모이면 바로 팔리고, 앞줄이 비면 뒤 쟁반이 앞으로 나와요. 정해진 이동 안에 빵을 모두 팔면 통과, 적게 옮길수록 별이 많아요. 요령은 뒤에 쟁반이 쌓인 선반부터 비우는 것, 그리고 빈자리를 하나쯤 늘 남겨 두는 것이에요. 키보드는 화살표로 칸을 고르고 Space로 집고 놓아요.",
    again: "다시 하기",
    next: "다음 단계",
    stages: "단계 고르기",
    full: "전체화면",
    exitFull: "나가기",
    mute: "소리 끄기",
    unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}",
    moves: "Moves {0}/{1}",
    start: "Tap a bread to move it!",
    win: "Sold out!",
    lose: "Out of moves",
    result: "Sold out in {0} moves",
    help: "The bakery's display shelves are a muddle. Each shelf has three spots at the front, with more trays waiting behind. Tap a bread, then a free spot on another shelf, to move it; dragging works too. Three of the same bread on one shelf sell at once, and when a shelf's front is empty the next tray slides forward. Sell every bread within the moves to pass; the fewer moves, the more stars. The knack is clearing the shelves with trays stacked behind first, and always keeping a free spot or so. Keys: arrows choose a spot, Space picks up and puts down.",
    again: "Try again",
    next: "Next stage",
    stages: "Choose a stage",
    full: "Fullscreen",
    exitFull: "Exit",
    mute: "Mute",
    unmute: "Unmute",
  },
  ja: {
    stage: "{0}面",
    moves: "移動 {0}/{1}",
    start: "パンをタップして動かそう！",
    win: "完売！",
    lose: "移動回数がなくなった",
    result: "{0}回の移動で完売",
    help: "パン屋の陳列棚がごちゃごちゃです。どの棚も前の列にパンを3つ置ける場所があり、後ろにはトレーが待っています。パンをタップしてから別の棚の空いた場所をタップすると移動します。ドラッグでもOK。同じパンが1つの棚に3つそろうとすぐ売れ、前の列が空くと後ろのトレーが前に出ます。決まった移動回数で全部売ればクリア、少ない移動ほど星が多くなります。コツは後ろにトレーが積まれた棚から空けること、そして空きを1つくらいいつも残しておくこと。キーボードは矢印で場所を選び、Spaceで持ち上げて置きます。",
    again: "もう一度",
    next: "次の面",
    stages: "ステージ選択",
    full: "全画面",
    exitFull: "戻る",
    mute: "ミュート",
    unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关",
    moves: "移动 {0}/{1}",
    start: "点面包来移动！",
    win: "全部卖光！",
    lose: "移动次数用完了",
    result: "移动 {0} 次全部卖光",
    help: "面包店的货架乱成一团。每层货架前排有三个放面包的位置，后面还有托盘在等着。点一个面包，再点另一层货架的空位，就能把它移过去，拖动也可以。同一层货架上凑齐三个相同的面包会立刻卖掉，前排空了，后面的托盘就会往前移。在规定的移动次数内卖光所有面包即过关，移动越少星越多。诀窍是先清空后面堆着托盘的货架，并且总留一两个空位。键盘用方向键选位置，空格拿起和放下。",
    again: "再来一次",
    next: "下一关",
    stages: "选择关卡",
    full: "全屏",
    exitFull: "退出",
    mute: "静音",
    unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}",
    moves: "Coups {0}/{1}",
    start: "Touchez un pain pour le déplacer !",
    win: "Tout est vendu !",
    lose: "Plus de coups",
    result: "Tout vendu en {0} coups",
    help: "Les étagères de la boulangerie sont en désordre. Chaque étagère a trois places devant, et d'autres plateaux attendent derrière. Touchez un pain, puis une place libre sur une autre étagère, pour le déplacer ; on peut aussi le faire glisser. Trois pains pareils sur une étagère se vendent aussitôt, et quand le devant d'une étagère est vide, le plateau suivant avance. Vendez tout dans la limite de coups pour réussir ; moins de coups, plus d'étoiles. L'astuce : vider d'abord les étagères avec des plateaux derrière, et toujours garder une place libre ou deux. Touches : les flèches choisissent une place, Espace prend et pose.",
    again: "Réessayer",
    next: "Niveau suivant",
    stages: "Choisir un niveau",
    full: "Plein écran",
    exitFull: "Quitter",
    mute: "Couper le son",
    unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}",
    moves: "Movimientos {0}/{1}",
    start: "¡Toca un pan para moverlo!",
    win: "¡Todo vendido!",
    lose: "Sin movimientos",
    result: "Todo vendido en {0} movimientos",
    help: "Los estantes de la panadería están revueltos. Cada estante tiene tres huecos delante y más bandejas esperando detrás. Toca un pan y luego un hueco libre en otro estante para moverlo; también puedes arrastrarlo. Tres panes iguales en un estante se venden al momento, y cuando el frente de un estante queda vacío, la bandeja siguiente avanza. Vende todo dentro del límite de movimientos para superar el nivel; cuantos menos movimientos, más estrellas. El truco es vaciar primero los estantes con bandejas apiladas detrás y dejar siempre algún hueco libre. Teclas: las flechas eligen un hueco y Espacio coge y deja.",
    again: "Reintentar",
    next: "Siguiente nivel",
    stages: "Elegir nivel",
    full: "Pantalla completa",
    exitFull: "Salir",
    mute: "Silenciar",
    unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bakery-shelf:muted";
const W = 360;
const H = 560;
const TOP = 70;
const BOTTOM = 540;
const SHELF_W = 108;
const SPOT = 34;

/** Where shelf s sits: its left edge and the line its front spots stand on. */
function shelfAt(count: number, s: number) {
  const rows = Math.ceil(count / 3);
  const rowH = Math.min(160, (BOTTOM - TOP) / rows);
  const r = Math.floor(s / 3);
  const inRow = Math.min(3, count - r * 3);
  const c = s % 3;
  const gap = (W - inRow * SHELF_W) / (inRow + 1);
  const x = Math.round(gap + c * (SHELF_W + gap));
  const y = Math.round(TOP + (BOTTOM - TOP - rows * rowH) / 2 + (r + 1) * rowH - 22);
  return { x, y, rowH };
}

/** The shelf and spot under (x, y), or null. */
function spotAt(count: number, x: number, y: number): { s: number; i: number } | null {
  for (let s = 0; s < count; s++) {
    const g = shelfAt(count, s);
    if (x < g.x - 4 || x > g.x + SHELF_W + 4 || y < g.y - Math.min(110, g.rowH - 10) || y > g.y + 14) continue;
    const i = Math.max(0, Math.min(SLOTS - 1, Math.floor((x - g.x - 3) / SPOT)));
    return { s, i };
  }
  return null;
}

export default function BakeryShelf({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const [over, setOver] = useState<null | { won: boolean; stars: number; moves: number }>(null);
  const [moves, setMoves] = useState(0);
  const bakeryRef = useRef<Bakery | null>(null);
  const held = useRef<{ s: number; i: number } | null>(null);
  const cursor = useRef<{ s: number; i: number; shown: boolean }>({ s: 0, i: 0, shown: false });
  const drag = useRef<{ s: number; i: number } | null>(null);
  const sold = useRef<Array<{ s: number; t: number }>>([]);
  const st = SHELF_STAGES[stage];

  useRunRecord(SHELF_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    bakeryRef.current = newBakery(SHELF_STAGES[s]);
    held.current = null;
    drag.current = null;
    cursor.current = { s: 0, i: 0, shown: false };
    sold.current = [];
    setMoves(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SHELF_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
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
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const b = bakeryRef.current;
      if (!b) {
        raf = requestAnimationFrame(loop);
        return;
      }
      for (const f of sold.current) f.t -= dt;
      sold.current = sold.current.filter((f) => f.t > 0);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm bakery wall
        ctx.fillStyle = "#fff4e6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffe8cc";
        for (let x = 0; x < W; x += 30) ctx.fillRect(x, 0, 14, H);
        const n = b.front.length;
        for (let s = 0; s < n; s++) {
          const g = shelfAt(n, s);
          // the tray waiting behind, faded, and how many more
          const next = b.back[s][0];
          if (next) {
            next.forEach((v, i) => {
              if (v !== EMPTY) drawSprite(ctx, BREAD_ART[v], g.x + 3 + SPOT * i + SPOT / 2, g.y - 46, { scale: 2, alpha: 0.4 });
            });
          }
          if (b.back[s].length > 0) {
            ctx.fillStyle = "#8a5a2b";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`+${b.back[s].length}`, g.x + SHELF_W, g.y - 58);
          }
          // the shelf board
          const flash = sold.current.find((f) => f.s === s);
          ctx.fillStyle = flash ? "#ffd43b" : "#a0652d";
          ctx.fillRect(g.x, g.y, SHELF_W, 8);
          ctx.fillStyle = "#6f4219";
          ctx.fillRect(g.x, g.y + 8, SHELF_W, 4);
          b.front[s].forEach((v, i) => {
            const cx = g.x + 3 + SPOT * i + SPOT / 2;
            const isHeld = held.current?.s === s && held.current?.i === i;
            if (isHeld) {
              ctx.fillStyle = "rgba(51,154,240,0.3)";
              ctx.fillRect(cx - SPOT / 2 + 1, g.y - 34, SPOT - 2, 34);
            }
            if (v !== EMPTY) drawSprite(ctx, BREAD_ART[v], cx, g.y - 16 - (isHeld ? 6 : 0), { scale: 3 });
            if (cursor.current.shown && cursor.current.s === s && cursor.current.i === i) {
              ctx.strokeStyle = "#1c7ed6";
              ctx.lineWidth = 2;
              ctx.strokeRect(cx - SPOT / 2 + 1, g.y - 35, SPOT - 2, 35);
            }
          });
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const finish = (b: Bakery) => {
    setMoves(b.moves);
    if (!b.over) return;
    setOver({ won: b.won, stars: starsFor(b), moves: b.moves });
    if (b.won) {
      setCleared(markStageCleared(SHELF_SLUG, b.stage.stage, STAGE_COUNT));
      spawnBurst(parts.current, W / 2, H / 2, ["#ffd43b", "#ff8fb1", "#fff"], 30, 140, 3);
      sfx("win");
    } else sfx("lose");
  };
  /** Puts the held bread on shelf ts (spot ti if free, else the first free one). */
  const place = (ts: number, ti: number) => {
    const b = bakeryRef.current;
    const h = held.current;
    if (!b || !h || b.over) return;
    held.current = null;
    if (ts === h.s) return;
    const to = b.front[ts][ti] === EMPTY ? ti : freeSpot(b, ts);
    if (to < 0) {
      sfx("fail");
      return;
    }
    const before = b.sold;
    move(b, h.s, h.i, ts, to);
    if (b.sold > before) {
      sold.current.push({ s: ts, t: 0.4 });
      const g = shelfAt(b.front.length, ts);
      spawnBurst(parts.current, g.x + SHELF_W / 2, g.y - 16, ["#ffd43b", "#fff", "#ff8fb1"], 14, 110, 2);
      sfx("combo");
    } else sfx("place");
    finish(b);
  };
  /** A tap or key on a spot: pick up the bread there, or put the held one down. */
  const press = (s: number, i: number) => {
    const b = bakeryRef.current;
    if (!b || b.over) return;
    setTouched(true);
    if (held.current) {
      if (held.current.s === s && held.current.i === i) held.current = null;
      else if (held.current.s === s && b.front[s][i] !== EMPTY) held.current = { s, i };
      else place(s, i);
      return;
    }
    if (b.front[s][i] !== EMPTY) {
      held.current = { s, i };
      sfx("tap");
    }
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = bakeryRef.current;
    if (!b || b.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toField(e);
    const hit = spotAt(b.front.length, p.x, p.y);
    cursor.current.shown = false;
    if (!hit) {
      held.current = null;
      return;
    }
    const wasHeld = held.current;
    press(hit.s, hit.i);
    drag.current = !wasHeld && held.current ? hit : null;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = bakeryRef.current;
    const d = drag.current;
    drag.current = null;
    if (!b || !d || b.over) return;
    const p = toField(e);
    const hit = spotAt(b.front.length, p.x, p.y);
    // dropped on another shelf: that's a move; let go where it was picked up: it stays held for a tap
    if (hit && hit.s !== d.s) place(hit.s, hit.i);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const b = bakeryRef.current;
    if (!b || b.over) return;
    const n = b.front.length;
    const c = cursor.current;
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(k)) e.preventDefault();
    else return;
    setTouched(true);
    if (!c.shown) {
      c.shown = true;
      if (k !== " " && k !== "Enter") return;
    }
    const flat = c.s * SLOTS + c.i;
    if (k === "ArrowLeft" || k === "ArrowRight") {
      const f = Math.max(0, Math.min(n * SLOTS - 1, flat + (k === "ArrowLeft" ? -1 : 1)));
      c.s = Math.floor(f / SLOTS);
      c.i = f % SLOTS;
    } else if (k === "ArrowUp") c.s = Math.max(0, c.s - 3);
    else if (k === "ArrowDown") c.s = Math.min(n - 1, c.s + 3);
    else press(c.s, c.i);
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="bakery-shelf"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves, st.limit)}</Badge>
        <div className="ml-auto flex gap-1">
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
          tabIndex={0}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p> : null}
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
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
