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
import { BEE_SLUG, BEE_STAGES, STAGE_COUNT, begin, end, extend, joined, newMeadow, starsFor, type Meadow } from "../../lib/games/bee-lines";
import { BEE_ART, PAIR_COLORS, flowerArt } from "../../lib/games/bee-lines-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; strokes: string; pairs: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    strokes: "획 {0}",
    pairs: "이은 꽃 {0}/{1}",
    start: "꽃에서 같은 꽃까지 길을 그어요!",
    win: "꽃밭이 꿀벌 길로 가득!",
    lose: "",
    result: "{0}획으로 다 이었어요",
    help: "꽃밭에 같은 색 꽃이 두 송이씩 피어 있어요. 꽃 하나를 누른 채 칸을 따라 끌어 같은 색 꽃까지 꿀벌 길을 이어요. 길은 서로 겹칠 수 없고, 새 길이 다른 길을 지나가면 그 길이 끊겨요. 모든 꽃을 짝지어 잇고 꽃밭의 모든 칸을 길로 채우면 통과예요. 적은 획으로 끝낼수록 별이 많아요. 요령은 구석과 가장자리에 붙은 꽃부터 잇는 것, 그리고 가까운 짝은 짧게 잇되 남는 칸이 생기지 않게 둘러 가는 것이에요. 그린 길의 중간을 누르면 거기서부터 다시 그릴 수 있어요. 키보드는 화살표로 칸을 고르고, Space로 그리기를 시작하고, 화살표로 길을 늘인 뒤 Enter로 마쳐요.",
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
    strokes: "Strokes {0}",
    pairs: "Joined {0}/{1}",
    start: "Draw a trail from a flower to its twin!",
    win: "The meadow's full of bee trails!",
    lose: "",
    result: "Joined in {0} strokes",
    help: "Pairs of flowers bloom across the meadow, two of each colour. Press a flower and drag square by square to its twin to draw a bee's trail. Trails can't cross, and a new trail drawn through another cuts it. Join every pair and fill every square with trails to pass; the fewer strokes, the more stars. The knack is joining flowers in corners and along the edges first, and letting close pairs wind around so no square is left over. Press the middle of a trail to carry on drawing from there. Keys: arrows choose a square, Space starts drawing, arrows lengthen the trail, Enter finishes.",
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
    strokes: "ひと筆 {0}",
    pairs: "つないだ花 {0}/{1}",
    start: "花から同じ花まで道を引こう！",
    win: "花畑がミツバチの道でいっぱい！",
    lose: "",
    result: "{0}筆で全部つないだ",
    help: "花畑に同じ色の花が2輪ずつ咲いています。花を押したままマスにそってドラッグし、同じ色の花までミツバチの道をつなぎます。道は重ねられず、新しい道がほかの道を通ると、その道は切れます。全部の花をつなぎ、花畑のすべてのマスを道で埋めればクリア。少ない筆数で終えるほど星が増えます。コツは角やふちにある花からつなぐこと、そして近い組は短くつなぎつつ、余るマスが出ないように回り道させること。引いた道の途中を押すと、そこから描き直せます。キーボードは矢印でマスを選び、Spaceで描き始め、矢印で道をのばしてEnterで終えます。",
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
    strokes: "笔数 {0}",
    pairs: "已连 {0}/{1}",
    start: "从一朵花画到同色的花！",
    win: "花田铺满了蜜蜂小路！",
    lose: "",
    result: "{0} 笔全部连好",
    help: "花田里每种颜色的花各开两朵。按住一朵花，沿着格子拖到同色的另一朵，画出蜜蜂小路。小路不能交叉，新画的路穿过别的路，那条路就会断开。把所有花都配对连起来，并让小路铺满花田的每一格即过关，笔数越少星越多。诀窍是先连角落和边上的花，离得近的一对可以绕一绕，别留下空格。按住画好的路中间，可以从那里接着画。键盘用方向键选格子，空格开始画，方向键延长小路，回车结束。",
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
    strokes: "Traits {0}",
    pairs: "Reliées {0}/{1}",
    start: "Tracez un chemin d'une fleur à sa jumelle !",
    win: "La prairie est pleine de chemins d'abeille !",
    lose: "",
    result: "Tout relié en {0} traits",
    help: "Des paires de fleurs poussent dans la prairie, deux de chaque couleur. Appuyez sur une fleur et glissez case par case jusqu'à sa jumelle pour tracer un chemin d'abeille. Les chemins ne se croisent pas, et un nouveau chemin qui en traverse un autre le coupe. Reliez toutes les paires et remplissez toutes les cases pour réussir ; moins de traits, plus d'étoiles. L'astuce : relier d'abord les fleurs des coins et des bords, et faire serpenter les paires proches pour ne laisser aucune case vide. Appuyez au milieu d'un chemin pour reprendre de là. Touches : les flèches choisissent une case, Espace commence le tracé, les flèches l'allongent, Entrée termine.",
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
    strokes: "Trazos {0}",
    pairs: "Unidas {0}/{1}",
    start: "¡Traza un camino de una flor a su gemela!",
    win: "¡El prado está lleno de caminos de abeja!",
    lose: "",
    result: "Todo unido en {0} trazos",
    help: "En el prado crecen parejas de flores, dos de cada color. Pulsa una flor y arrastra casilla a casilla hasta su gemela para trazar un camino de abeja. Los caminos no se cruzan, y uno nuevo que pasa por otro lo corta. Une todas las parejas y llena todas las casillas para superar el nivel; cuantos menos trazos, más estrellas. El truco es unir primero las flores de las esquinas y los bordes, y hacer que las parejas cercanas den un rodeo para no dejar casillas vacías. Pulsa el medio de un camino para seguir dibujando desde ahí. Teclas: las flechas eligen una casilla, Espacio empieza a trazar, las flechas alargan el camino y Intro termina.",
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

const MUTE_KEY = "oiyo:bee-lines:muted";
const W = 360;
const H = 560;
const TOP = 84;
const AREA = 400;

function layout(n: number) {
  const cell = Math.floor(Math.min(340 / n, AREA / n));
  return { cell, ox: Math.round((W - n * cell) / 2), oy: Math.round(TOP + (AREA - n * cell) / 2) };
}

export default function BeeLines({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; strokes: number }>(null);
  const [strokes, setStrokes] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const meadowRef = useRef<Meadow | null>(null);
  const cursor = useRef<{ i: number; shown: boolean }>({ i: 0, shown: false });
  const st = BEE_STAGES[stage];

  useRunRecord(BEE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    meadowRef.current = newMeadow(BEE_STAGES[s]);
    cursor.current = { i: 0, shown: false };
    setStrokes(0);
    setJoinedCount(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BEE_SLUG, STAGE_COUNT);
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
      const m = meadowRef.current;
      if (!m) {
        raf = requestAnimationFrame(loop);
        return;
      }
      stepParticles(parts.current, dt, 120);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const n = m.stage.n;
        const { cell, ox, oy } = layout(n);
        // a meadow of soft grass squares
        ctx.fillStyle = "#e6fcf5";
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < n * n; i++) {
          const x = ox + (i % n) * cell;
          const y = oy + Math.floor(i / n) * cell;
          const k = m.owner[i];
          ctx.fillStyle = ((i % n) + Math.floor(i / n)) % 2 ? "#b2f2bb" : "#c3fae8";
          ctx.fillRect(x, y, cell, cell);
          if (k >= 0) {
            ctx.fillStyle = PAIR_COLORS[k % PAIR_COLORS.length] + "33";
            ctx.fillRect(x, y, cell, cell);
          }
        }
        // the trails, thick lines from square to square
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        m.trails.forEach((t, k) => {
          if (t.length < 2) return;
          ctx.strokeStyle = PAIR_COLORS[k % PAIR_COLORS.length];
          ctx.lineWidth = Math.max(6, cell * 0.34);
          ctx.beginPath();
          t.forEach((i, j) => {
            const x = ox + (i % n) * cell + cell / 2;
            const y = oy + Math.floor(i / n) * cell + cell / 2;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        });
        const scale = Math.max(3, Math.floor(cell / 9));
        m.stage.pairs.forEach(([a, b], k) => {
          for (const i of [a, b]) drawSprite(ctx, flowerArt(PAIR_COLORS[k % PAIR_COLORS.length]), ox + (i % n) * cell + cell / 2, oy + Math.floor(i / n) * cell + cell / 2, { scale });
        });
        // the bee at the head of the trail being drawn
        if (m.drawing >= 0) {
          const t = m.trails[m.drawing];
          const i = t[t.length - 1];
          drawSprite(ctx, BEE_ART, ox + (i % n) * cell + cell / 2, oy + Math.floor(i / n) * cell + cell / 2 - cell / 3, { scale: Math.max(2, scale - 1) });
        }
        if (cursor.current.shown) {
          const i = cursor.current.i;
          ctx.strokeStyle = "#1c7ed6";
          ctx.lineWidth = 3;
          ctx.strokeRect(ox + (i % n) * cell + 2, oy + Math.floor(i / n) * cell + 2, cell - 4, cell - 4);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = meadowRef.current;
    if (!m) return -1;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) * W) / r.width;
    const fy = ((e.clientY - r.top) * H) / r.height;
    const { cell, ox, oy } = layout(m.stage.n);
    const cx = Math.floor((fx - ox) / cell);
    const cy = Math.floor((fy - oy) / cell);
    if (cx < 0 || cy < 0 || cx >= m.stage.n || cy >= m.stage.n) return -1;
    return cy * m.stage.n + cx;
  };
  const sync = (m: Meadow) => {
    setStrokes(m.strokes);
    setJoinedCount(m.stage.pairs.filter((_, k) => joined(m, k)).length);
  };
  /** Extends toward square i one neighbour at a time (a quick finger can skip squares). */
  const reach = (m: Meadow, i: number) => {
    const n = m.stage.n;
    for (let g = 0; g < n * 2 && m.drawing >= 0; g++) {
      const t = m.trails[m.drawing];
      const last = t[t.length - 1];
      if (last === i) return;
      const dx = (i % n) - (last % n);
      const dy = Math.floor(i / n) - Math.floor(last / n);
      const nextI = Math.abs(dx) >= Math.abs(dy) ? last + Math.sign(dx) : last + Math.sign(dy) * n;
      const before = t.length;
      if (!extend(m, nextI)) return;
      if (m.trails[m.drawing].length > before && joined(m, m.drawing)) sfx("place");
    }
  };
  const finish = (m: Meadow) => {
    const was = m.won;
    end(m);
    sync(m);
    if (m.won && !was) {
      setOver({ won: true, stars: starsFor(m), strokes: m.strokes });
      setCleared(markStageCleared(BEE_SLUG, m.stage.stage, STAGE_COUNT));
      spawnBurst(parts.current, W / 2, 280, ["#ffd43b", "#69db7c", "#fff"], 30, 140, 3);
      sfx("win");
    }
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = meadowRef.current;
    if (!m || m.won) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTouched(true);
    cursor.current.shown = false;
    const i = cellAt(e);
    if (i >= 0 && begin(m, i)) {
      sfx("tap");
      sync(m);
    }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = meadowRef.current;
    if (!m || m.drawing < 0) return;
    const i = cellAt(e);
    if (i >= 0) reach(m, i);
  };
  const onUp = () => {
    const m = meadowRef.current;
    if (!m || m.drawing < 0) return;
    finish(m);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const m = meadowRef.current;
    if (!m || m.won) return;
    const n = m.stage.n;
    const c = cursor.current;
    const k = e.key;
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!(k in d) && k !== " " && k !== "Enter") return;
    e.preventDefault();
    setTouched(true);
    if (!c.shown) {
      c.shown = true;
      if (k in d) return;
    }
    if (k in d) {
      const x = Math.max(0, Math.min(n - 1, (c.i % n) + d[k][0]));
      const y = Math.max(0, Math.min(n - 1, Math.floor(c.i / n) + d[k][1]));
      c.i = y * n + x;
      if (m.drawing >= 0) reach(m, c.i);
    } else if (k === " " && m.drawing < 0) {
      if (begin(m, c.i)) {
        sfx("tap");
        sync(m);
      }
    } else finish(m);
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
      data-game="bee-lines"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.pairs, joinedCount, st.pairs.length)}</Badge>
        <Badge variant="outline">{fill(c.strokes, strokes)}</Badge>
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
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
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
            <p className="text-lg font-bold">{c.win}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.strokes)}</p> : null}
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
