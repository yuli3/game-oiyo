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
import { FLOOD_SLUG, FLOOD_STAGES, STAGE_COUNT, newCanvas, paint, starsFor, type Canvas } from "../../lib/games/paint-flood";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; start: string; win: string; lose: string; used: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", moves: "붓질 {0}/{1}", start: "아래 물감을 눌러 왼쪽 위부터 번져 가요!", win: "캔버스가 한 색이 됐어요!", lose: "붓질을 다 썼어요", used: "{0}번 만에 칠했어요",
    again: "다시 하기", next: "다음 단계",
    help: "색색의 칸으로 된 캔버스에서 내 물감은 왼쪽 위 칸에서 시작해요(하얀 테두리 부분). 아래 물감을 누르면 내 물감 전체가 그 색으로 바뀌고, 맞닿은 같은 색 칸을 모두 빨아들여 넓어져요. 정해진 붓질 안에 캔버스 전체를 한 색으로 만들면 통과예요. 지금 가장 많이 번질 색보다, 다음에 크게 이어질 색을 고르는 게 요령이에요. 적은 붓질로 끝낼수록 별이 늘어요. 키보드는 숫자 1~6으로 색을 골라요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", moves: "Strokes {0}/{1}", start: "Tap a paint below to spread from the top-left!", win: "The canvas is one colour!", lose: "Out of strokes", used: "Painted in {0} strokes",
    again: "Try again", next: "Next stage",
    help: "Your paint starts in the top-left square of a canvas of coloured squares (inside the white outline). Tap a paint below and your whole patch turns that colour, soaking up every touching square of it. Turn the whole canvas one colour within the strokes to pass. The trick is to pick the colour that opens up the most next time, not just the most right now. Fewer strokes, more stars. Keys: 1–6 to pick a colour.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", moves: "ひと塗り {0}/{1}", start: "下の絵の具をタップして左上から広げよう！", win: "キャンバスが1色になった！", lose: "塗れる回数がなくなった", used: "{0}回で塗れた",
    again: "もう一度", next: "次の面",
    help: "色とりどりのマスのキャンバスで、自分の絵の具は左上のマスから始まります（白い枠の部分）。下の絵の具をタップすると自分の範囲全体がその色になり、となり合う同じ色のマスをすべて吸い込んで広がります。決まった回数のうちにキャンバス全体を1色にすればクリア。いま一番広がる色より、次に大きくつながる色を選ぶのがコツです。少ない回数で終えるほど星が増えます。キーボードは数字1〜6で色を選びます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", moves: "笔数 {0}/{1}", start: "点下方颜料，从左上角开始晕染！", win: "画布变成一种颜色了！", lose: "笔数用完了", used: "用了 {0} 笔",
    again: "再来一次", next: "下一关",
    help: "在彩色方格组成的画布上，你的颜料从左上角开始（白框内）。点下方的颜料，你的整片区域就变成那个颜色，并吸收所有相邻的同色方格扩大。在规定笔数内把整张画布变成一种颜色即过关。诀窍是选下一步能连成大片的颜色，而不只是眼下吸收最多的。笔数越少星越多。键盘用数字1~6选颜色。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", moves: "Coups {0}/{1}", start: "Touchez une peinture pour l'étaler depuis le coin !", win: "La toile est d'une seule couleur !", lose: "Plus de coups de pinceau", used: "Peint en {0} coups",
    again: "Réessayer", next: "Niveau suivant",
    help: "Votre peinture part de la case en haut à gauche d'une toile de cases colorées (dans le cadre blanc). Touchez une peinture en bas : toute votre zone prend cette couleur et absorbe chaque case voisine de la même couleur. Rendez toute la toile d'une seule couleur dans le nombre de coups pour réussir. L'astuce : choisir la couleur qui ouvrira le plus au coup suivant, pas seulement maintenant. Moins de coups, plus d'étoiles. Touches 1 à 6 pour choisir.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", moves: "Pinceladas {0}/{1}", start: "¡Toca una pintura para extenderla desde la esquina!", win: "¡El lienzo es de un solo color!", lose: "Sin pinceladas", used: "Pintado en {0} pinceladas",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Tu pintura empieza en la casilla de arriba a la izquierda de un lienzo de casillas de colores (dentro del borde blanco). Toca una pintura abajo y toda tu zona toma ese color, absorbiendo cada casilla vecina del mismo color. Deja todo el lienzo de un color dentro de las pinceladas para superar el nivel. El truco es elegir el color que más abrirá en la siguiente, no solo ahora. Menos pinceladas, más estrellas. Teclas 1 a 6 para elegir.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:paint-flood:muted";
const W = 360;
const H = 560;
const BOARD = 336;
const BX = 12;
const BY = 40;
const SWATCH_Y = 450;
const PAINTS = ["#e03131", "#1971c2", "#f59f00", "#2f9e44", "#9c36b5", "#0c8599"];

export default function PaintFlood({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; moves: number }>(null);
  const [touched, setTouched] = useState(false);
  const [moves, setMoves] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStateRef = useRef<Canvas | null>(null);
  const picks = useRef<number[]>([]);
  const wave = useRef(0); // the ripple of the last stroke
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const st = FLOOD_STAGES[stage];

  useRunRecord(FLOOD_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    canvasStateRef.current = newCanvas(FLOOD_STAGES[s]);
    picks.current = [];
    parts.current = [];
    wave.current = 0;
    setMoves(0);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(FLOOD_SLUG, STAGE_COUNT);
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
      const cv = canvasStateRef.current;
      if (!cv) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const n = cv.stage.size;
      const cell = Math.floor(BOARD / n);
      const ox = BX + (BOARD - cell * n) / 2;
      // picks are read once per frame
      for (const colour of picks.current.splice(0)) {
        if (cv.over) break;
        const got = paint(cv, colour);
        if (got < 0) continue;
        setMoves(cv.moves);
        wave.current = 1;
        if (got >= 4) {
          spawnBurst(parts.current, ox + 8, BY + 8, [PAINTS[colour], "#fff"], Math.min(30, got), 140, 3);
          sfx("combo");
        } else sfx(got > 0 ? "place" : "tap");
        if (cv.over) {
          setOver({ won: cv.won, stars: starsFor(cv), moves: cv.moves });
          if (cv.won) {
            setCleared(markStageCleared(FLOOD_SLUG, cv.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      wave.current = Math.max(0, wave.current - dt * 2);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#f1e3c8";
        ctx.fillRect(0, 0, W, H);
        // the easel frame
        ctx.fillStyle = "#a87545";
        ctx.fillRect(BX - 8, BY - 8, BOARD + 16, BOARD + 16);
        for (let i = 0; i < n * n; i++) {
          const x = ox + (i % n) * cell;
          const y = BY + Math.floor(i / n) * cell;
          ctx.fillStyle = PAINTS[cv.cells[i]];
          ctx.fillRect(x, y, cell, cell);
          if (!cv.owned[i]) {
            // a little paper grain on squares not yet soaked up
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(x + 2, y + 2, Math.max(2, Math.floor(cell / 4)), 2);
          }
        }
        // the patch's outline
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < n * n; i++) {
          if (!cv.owned[i]) continue;
          const r = Math.floor(i / n);
          const k = i % n;
          const x = ox + k * cell;
          const y = BY + r * cell;
          if (r === 0 || !cv.owned[i - n]) ctx.fillRect(x, y, cell, 2);
          if (r === n - 1 || !cv.owned[i + n]) ctx.fillRect(x, y + cell - 2, cell, 2);
          if (k === 0 || !cv.owned[i - 1]) ctx.fillRect(x, y, 2, cell);
          if (k === n - 1 || !cv.owned[i + 1]) ctx.fillRect(x + cell - 2, y, 2, cell);
        }
        if (wave.current > 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.25 * wave.current})`;
          for (let i = 0; i < n * n; i++) if (cv.owned[i]) ctx.fillRect(ox + (i % n) * cell, BY + Math.floor(i / n) * cell, cell, cell);
        }
        // the paint pots
        for (let k = 0; k < cv.stage.colours; k++) {
          const sw = Math.floor((W - 24) / cv.stage.colours);
          const x = 12 + k * sw;
          const now = cv.cells[0] === k;
          ctx.fillStyle = "#495057";
          ctx.fillRect(x + 4, SWATCH_Y, sw - 8, 84);
          ctx.fillStyle = PAINTS[k];
          ctx.fillRect(x + 8, SWATCH_Y + (now ? 30 : 4), sw - 16, now ? 50 : 76);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(x + 10, SWATCH_Y + (now ? 32 : 6), 6, 20);
          ctx.fillStyle = "#212529";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(k + 1), x + sw / 2, SWATCH_Y + 100);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasStateRef.current;
    if (!cv || cv.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (y >= SWATCH_Y - 10) {
      const sw = Math.floor((W - 24) / cv.stage.colours);
      const k = Math.floor((x - 12) / sw);
      if (k >= 0 && k < cv.stage.colours) picks.current.push(k);
      return;
    }
    // a tap on the canvas paints with that square's colour
    const n = cv.stage.size;
    const cell = Math.floor(BOARD / n);
    const ox = BX + (BOARD - cell * n) / 2;
    const col = Math.floor((x - ox) / cell);
    const row = Math.floor((y - BY) / cell);
    if (col >= 0 && col < n && row >= 0 && row < n) picks.current.push(cv.cells[row * n + col]);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const k = Number(e.key) - 1;
    if (!(k >= 0 && k < st.colours)) return;
    e.preventDefault();
    setTouched(true);
    picks.current.push(k);
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
      data-game="paint-flood"
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
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-28 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.used, over.moves)}</p> : null}
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
