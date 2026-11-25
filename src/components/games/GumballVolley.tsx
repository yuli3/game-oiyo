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
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { BALL_R, CELL, COLS, DT, FLOOR, PLUS, ROWS, STAGE_COUNT, VOLLEY_SLUG, VOLLEY_STAGES, X0, Y0, clampAim, newShop, settle, starsFor, volley, type Shop, type VolleyResult } from "../../lib/games/gumball-volley";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; volleys: string; balls: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    volleys: "발사 {0}",
    balls: "껌볼 {0}개",
    start: "끌어서 겨누고 놓으면 껌볼이 날아가요!",
    win: "블록을 모두 터뜨렸어요!",
    lose: "블록이 계산대에 닿았어요",
    result: "{0}번 쏴서 모두 터뜨렸어요",
    help: "숫자가 적힌 사탕 블록들이 계산대 위에 매달려 있어요. 화면을 누른 채 끌어 방향을 정하고 놓으면, 껌볼이 줄줄이 날아가 벽과 블록에 튕겨요. 한 번 맞을 때마다 블록의 숫자가 1씩 줄고, 0이 되면 터져요. + 방울을 맞히면 다음 발사부터 껌볼이 하나 늘어요. 한 번 쏘고 나면 블록이 한 칸씩 내려와요. 블록이 계산대에 닿기 전에 모두 터뜨리면 통과, 적게 쏠수록 별이 늘어요. 요령은 블록 사이 틈으로 껌볼을 들여보내 위쪽에서 여러 번 튕기게 하는 것과, 가장 아래 블록부터 줄이는 것이에요. 키보드는 ←→로 겨누고 Space로 쏴요.",
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
    volleys: "Volley {0}",
    balls: "{0} gumballs",
    start: "Drag to aim, let go to fire the gumballs!",
    win: "Every block popped!",
    lose: "A block reached the counter",
    result: "All popped in {0} volleys",
    help: "Numbered candy blocks hang over the counter. Press and drag to aim, let go, and a volley of gumballs shoots out one after another, bouncing off the walls and the blocks. Every hit takes one off a block's number; at zero it pops. Hit a + bubble for an extra gumball from the next volley on. After each volley the blocks come down a row. Pop them all before one reaches the counter to pass; fewer volleys, more stars. The knack is sending the gumballs through a gap so they bounce around above the blocks, and wearing down the lowest blocks first. Keys: ← → to aim, Space to fire.",
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
    volleys: "発射 {0}",
    balls: "ガムボール {0}個",
    start: "ドラッグでねらい、離すとガムボールが飛ぶよ！",
    win: "ブロックを全部割った！",
    lose: "ブロックがカウンターに届いた",
    result: "{0}回の発射で全部割った",
    help: "数字の書かれたキャンディブロックがカウンターの上にぶら下がっています。画面を押したままドラッグして向きを決めて離すと、ガムボールが次々に飛び出し、壁やブロックにはね返ります。1回当たるごとにブロックの数字が1減り、0になると割れます。+の泡に当てると次の発射からガムボールが1個増えます。1回撃つとブロックが1段下がります。ブロックがカウンターに届く前に全部割ればクリア、少ない発射ほど星が増えます。コツはブロックのすき間からガムボールを入れて上で何度もはね返らせることと、いちばん下のブロックから減らすこと。キーボードは←→でねらい、Spaceで撃ちます。",
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
    volleys: "发射 {0}",
    balls: "口香糖球 {0} 个",
    start: "拖动瞄准，松手发射口香糖球！",
    win: "所有方块都打爆了！",
    lose: "方块碰到柜台了",
    result: "发射 {0} 次全部打爆",
    help: "写着数字的糖果方块挂在柜台上方。按住屏幕拖动定方向，松手后口香糖球一个接一个飞出，在墙和方块之间反弹。每击中一次，方块上的数字减1，到0就爆开。打到+泡泡，从下一次发射起多一个球。每发射一次，方块就往下移一格。在方块碰到柜台前全部打爆即过关，发射次数越少星越多。诀窍是让球从方块间的空隙钻上去，在上方来回反弹；并先削减最下面的方块。键盘用←→瞄准，空格发射。",
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
    volleys: "Salve {0}",
    balls: "{0} boules",
    start: "Glissez pour viser, lâchez pour tirer les boules !",
    win: "Tous les blocs ont éclaté !",
    lose: "Un bloc a touché le comptoir",
    result: "Tout éclaté en {0} salves",
    help: "Des blocs de bonbons numérotés pendent au-dessus du comptoir. Appuyez, glissez pour viser, lâchez : une salve de boules de chewing-gum part l'une après l'autre et rebondit sur les murs et les blocs. Chaque touche retire un au nombre d'un bloc ; à zéro, il éclate. Touchez une bulle + pour une boule de plus dès la salve suivante. Après chaque salve, les blocs descendent d'une rangée. Faites-les tous éclater avant qu'un bloc touche le comptoir pour réussir ; moins de salves, plus d'étoiles. L'astuce : glisser les boules dans un passage pour qu'elles rebondissent au-dessus des blocs, et user d'abord les blocs les plus bas. Touches : ← → pour viser, Espace pour tirer.",
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
    volleys: "Ráfaga {0}",
    balls: "{0} chicles",
    start: "¡Arrastra para apuntar y suelta para disparar los chicles!",
    win: "¡Todos los bloques reventados!",
    lose: "Un bloque llegó al mostrador",
    result: "Todo reventado en {0} ráfagas",
    help: "Bloques de caramelo numerados cuelgan sobre el mostrador. Pulsa, arrastra para apuntar y suelta: una ráfaga de bolas de chicle sale una tras otra y rebota en las paredes y los bloques. Cada golpe resta uno al número de un bloque; a cero, revienta. Da a una burbuja + para tener un chicle más desde la siguiente ráfaga. Tras cada ráfaga los bloques bajan una fila. Revienta todos antes de que uno llegue al mostrador para superar el nivel; menos ráfagas, más estrellas. El truco es colar los chicles por un hueco para que reboten por encima de los bloques, y desgastar primero los más bajos. Teclas: ← → para apuntar, Espacio para disparar.",
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

const MUTE_KEY = "oiyo:gumball-volley:muted";
const W = 360;
const H = 560;
type Frame = { balls: Array<{ x: number; y: number }>; grid: number[] };
const COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac"];

export default function GumballVolley({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; volleys: number }>(null);
  const [volleys, setVolleys] = useState(0);
  const [balls, setBalls] = useState(0);
  const shopRef = useRef<Shop | null>(null);
  const aim = useRef(Math.PI / 2);
  const fire = useRef(false);
  const aiming = useRef(false);
  const keyed = useRef(false);
  const anim = useRef<null | { frames: Frame[]; t: number; res: VolleyResult }>(null);
  const shown = useRef<number[]>([]);
  const st = VOLLEY_STAGES[stage];

  useRunRecord(VOLLEY_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const sh = newShop(VOLLEY_STAGES[s]);
    shopRef.current = sh;
    aim.current = Math.PI / 2;
    fire.current = false;
    aiming.current = false;
    keyed.current = false;
    anim.current = null;
    shown.current = sh.grid.slice();
    setVolleys(0);
    setBalls(sh.balls);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(VOLLEY_SLUG, STAGE_COUNT);
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
      const s = shopRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // a volley is read once per frame: it is worked out at once, then played back
      if (fire.current && !anim.current && !s.over) {
        fire.current = false;
        const frames: Frame[] = [];
        let n = 0;
        const res = volley(s, aim.current, (bs) => {
          if (n++ % 2) return;
          frames.push({ balls: bs.filter((b) => b.live).map((b) => ({ x: b.x, y: b.y })), grid: s.grid.slice() });
        });
        anim.current = { frames, t: 0, res };
        sfx("tap");
      }
      let flying: Frame | null = null;
      if (anim.current) {
        const a = anim.current;
        const before = Math.floor(a.t / (2 * DT));
        a.t += dt * 1.5;
        const k = Math.min(a.frames.length - 1, Math.floor(a.t / (2 * DT)));
        flying = a.frames[k] ?? null;
        if (flying) {
          for (let i = 0; i < flying.grid.length; i++) {
            const was = shown.current[i];
            if (was > 0 && flying.grid[i] === 0) {
              const x = X0 + (i % COLS) * CELL + CELL / 2;
              const y = Y0 + Math.floor(i / COLS) * CELL + CELL / 2;
              spawnBurst(parts.current, x, y, [COLORS[i % COLORS.length], "#fff"], 10, 110, 3);
              sfx("success");
            } else if (was > 0 && flying.grid[i] < was && k !== before) sfx("place");
          }
          shown.current = flying.grid.slice();
        }
        if (k >= a.frames.length - 1) {
          anim.current = null;
          settle(s, a.res);
          shown.current = s.grid.slice();
          setVolleys(s.volleys);
          setBalls(s.balls);
          if (s.over) {
            setOver({ won: s.won, stars: starsFor(s), volleys: s.volleys });
            if (s.won) {
              setCleared(markStageCleared(VOLLEY_SLUG, s.stage.stage, STAGE_COUNT));
              spawnBurst(parts.current, W / 2, 260, COLORS, 30, 140, 3);
              sfx("win");
            } else sfx("lose");
          }
        }
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#fff4e6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffe8cc";
        ctx.fillRect(X0, Y0, COLS * CELL, ROWS * CELL);
        ctx.fillStyle = "#ffd8a8";
        for (let r = 0; r <= ROWS; r++) ctx.fillRect(X0, Y0 + r * CELL, COLS * CELL, 1);
        // the counter
        ctx.fillStyle = "#e8590c";
        ctx.fillRect(0, Y0 + ROWS * CELL, W, 6);
        ctx.fillStyle = "#d9480f";
        ctx.fillRect(0, FLOOR + BALL_R, W, H - FLOOR);
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < shown.current.length; i++) {
          const v = shown.current[i];
          if (!v) continue;
          const x = X0 + (i % COLS) * CELL;
          const y = Y0 + Math.floor(i / COLS) * CELL;
          if (v === PLUS) {
            ctx.strokeStyle = "#4dabf7";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + CELL / 2, y + CELL / 2, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#1c7ed6";
            ctx.fillRect(x + CELL / 2 - 6, y + CELL / 2 - 1.5, 12, 3);
            ctx.fillRect(x + CELL / 2 - 1.5, y + CELL / 2 - 6, 3, 12);
            ctx.lineWidth = 1;
            continue;
          }
          ctx.fillStyle = COLORS[(i * 3 + v) % COLORS.length];
          ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(x + 5, y + 5, CELL - 22, 5);
          ctx.fillStyle = "#212529";
          ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 1);
        }
        // the launcher, the aiming line, the gumballs in flight
        const lx = s.launchX;
        if (!anim.current && !s.over && (aiming.current || keyed.current)) {
          ctx.fillStyle = "rgba(33,37,41,0.55)";
          for (let k = 1; k < 14; k++) ctx.fillRect(Math.round(lx + Math.cos(aim.current) * k * 22) - 2, Math.round(FLOOR - Math.sin(aim.current) * k * 22) - 2, 4, 4);
        }
        if (flying) {
          ctx.fillStyle = "#f06595";
          for (const b of flying.balls) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (!anim.current) {
          ctx.fillStyle = "#f06595";
          ctx.beginPath();
          ctx.arc(lx, FLOOR, BALL_R + 1, 0, Math.PI * 2);
          ctx.fill();
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
  const aimAt = (p: { x: number; y: number }) => {
    const s = shopRef.current;
    if (!s) return;
    aim.current = clampAim(Math.atan2(FLOOR - p.y, p.x - s.launchX));
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = shopRef.current;
    if (!s || s.over || anim.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    aiming.current = true;
    aimAt(toField(e));
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (aiming.current) aimAt(toField(e));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aiming.current) return;
    aimAt(toField(e));
    aiming.current = false;
    fire.current = true;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = shopRef.current;
    if (!s || s.over) return;
    const step = e.shiftKey ? Math.PI / 360 : Math.PI / 72;
    if (e.key === "ArrowLeft") aim.current = clampAim(aim.current + step);
    else if (e.key === "ArrowRight") aim.current = clampAim(aim.current - step);
    else if (e.key === " " || e.key === "Enter") fire.current = !anim.current;
    else return;
    e.preventDefault();
    keyed.current = true;
    setTouched(true);
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
      data-game="gumball-volley"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.volleys, volleys)}</Badge>
        <Badge variant="outline">{fill(c.balls, balls)}</Badge>
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
          onPointerCancel={() => (aiming.current = false)}
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.volleys)}</p> : null}
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
