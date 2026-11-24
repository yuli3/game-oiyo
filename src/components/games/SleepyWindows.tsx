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
import { STAGE_COUNT, WINDOWS_SLUG, WINDOWS_STAGES, litCount, newBlock, starsFor, tap, type Block } from "../../lib/games/sleepy-windows";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; taps: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    taps: "누른 횟수 {0}/{1}",
    start: "불 켜진 창문을 눌러 재워요!",
    win: "모두 잠들었어요!",
    lose: "누를 수 있는 횟수를 다 썼어요",
    result: "{0}번 만에 재웠어요",
    help: "잘 시간인데 아파트에 아직 불 켜진 창문이 있어요. 창문을 누르면 그 창문과 위·아래·왼쪽·오른쪽 이웃 창문의 불이 함께 바뀌어요(켜진 건 꺼지고, 꺼진 건 켜져요). 정해진 횟수 안에 모든 창문의 불을 끄면 통과, 적게 누를수록 별이 늘어요. 요령은 '불 쫓아 내리기'예요. 위층부터 차례로, 불이 켜진 창문 바로 아래 창문을 누르면 그 층이 모두 꺼져요. 맨 아래층에 불이 남으면 그 모양에 맞춰 맨 위층 창문 몇 개를 누르고 다시 내려와요. 키보드는 화살표로 고르고 Space로 눌러요.",
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
    taps: "Taps {0}/{1}",
    start: "Tap a lit window to put it to sleep!",
    win: "Everyone's asleep!",
    lose: "Out of taps",
    result: "All asleep in {0} taps",
    help: "It's bedtime, but some windows in the block are still lit. Tap a window and its light flips — along with the neighbours above, below, left and right (lit ones go dark, dark ones light up). Put every window to sleep within the taps to pass; fewer taps, more stars. The knack is chasing the lights down: floor by floor from the top, tap the window right under each lit one and that floor goes dark. If the bottom floor is left lit, tap a few top-floor windows to match its pattern and chase down again. Keys: arrows to choose, Space to tap.",
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
    taps: "タップ {0}/{1}",
    start: "明かりのついた窓をタップして寝かせよう！",
    win: "みんな眠った！",
    lose: "タップ回数がなくなった",
    result: "{0}回で寝かせた",
    help: "寝る時間なのに、マンションにまだ明かりのついた窓があります。窓をタップするとその窓と上下左右のとなりの窓の明かりがいっしょに切り替わります（ついていれば消え、消えていればつく）。決まった回数のうちに全部の窓を消せばクリア、少ない回数ほど星が増えます。コツは「明かりを追い下ろす」こと。上の階から順に、明かりのついた窓の真下の窓を押すとその階が全部消えます。いちばん下の階に明かりが残ったら、その形に合わせていちばん上の階の窓をいくつか押して、また下ろします。キーボードは矢印で選び、Spaceで押します。",
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
    taps: "点击 {0}/{1}",
    start: "点亮着灯的窗户让它睡觉！",
    win: "大家都睡着了！",
    lose: "点击次数用完了",
    result: "用 {0} 次让大家入睡",
    help: "到睡觉时间了，公寓里还有亮着灯的窗户。点一扇窗，它和上下左右邻居窗户的灯会一起切换（亮的变暗，暗的变亮）。在规定次数内让所有窗户熄灯即过关，点得越少星越多。诀窍是“追灯往下”：从顶层开始逐层，点每扇亮灯窗户正下方的那扇，这一层就全暗了。最底层还剩灯时，按它的样子点几扇顶层窗户，再往下追一遍。键盘用方向键选择，空格点击。",
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
    taps: "Touches {0}/{1}",
    start: "Touchez une fenêtre allumée pour l'endormir !",
    win: "Tout le monde dort !",
    lose: "Plus de touches",
    result: "Tout dort en {0} touches",
    help: "C'est l'heure de dormir, mais des fenêtres de l'immeuble sont encore allumées. Touchez une fenêtre : sa lumière bascule, ainsi que celles des voisines du dessus, du dessous, de gauche et de droite (allumées elles s'éteignent, éteintes elles s'allument). Éteignez toutes les fenêtres dans la limite pour réussir ; moins de touches, plus d'étoiles. L'astuce : chasser la lumière vers le bas. Étage par étage depuis le haut, touchez la fenêtre juste sous chaque fenêtre allumée, et l'étage s'éteint. S'il reste de la lumière en bas, touchez quelques fenêtres du dernier étage selon ce motif et recommencez la descente. Touches : flèches pour choisir, Espace pour toucher.",
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
    taps: "Toques {0}/{1}",
    start: "¡Toca una ventana encendida para dormirla!",
    win: "¡Todos duermen!",
    lose: "Sin toques",
    result: "Todo dormido en {0} toques",
    help: "Es hora de dormir, pero aún hay ventanas encendidas en el edificio. Toca una ventana y su luz cambia, junto con las vecinas de arriba, abajo, izquierda y derecha (las encendidas se apagan y las apagadas se encienden). Apaga todas las ventanas dentro del límite para superar el nivel; menos toques, más estrellas. El truco es perseguir la luz hacia abajo: piso a piso desde arriba, toca la ventana justo debajo de cada encendida y ese piso queda a oscuras. Si queda luz en el último piso, toca unas ventanas del piso de arriba según ese dibujo y vuelve a bajar. Teclas: flechas para elegir, Espacio para tocar.",
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

const MUTE_KEY = "oiyo:sleepy-windows:muted";
const W = 360;
const H = 560;
const WW = 46; // a window
const WH = 50;
const GAP = 12;
const TOP = 96;

export default function SleepyWindows({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; taps: number }>(null);
  const [taps, setTaps] = useState(0);
  const blockRef = useRef<Block | null>(null);
  const presses = useRef<number[]>([]);
  const cursor = useRef(0);
  const keyed = useRef(false);
  const glow = useRef<number[]>([]);
  const st = WINDOWS_STAGES[stage];

  useRunRecord(WINDOWS_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    blockRef.current = newBlock(WINDOWS_STAGES[s]);
    presses.current = [];
    cursor.current = 0;
    keyed.current = false;
    glow.current = [];
    setTaps(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(WINDOWS_SLUG, STAGE_COUNT);
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
      const b = blockRef.current;
      if (!b) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const { cols, rows } = b.stage;
      const bw = cols * WW + (cols + 1) * GAP;
      const bx = (W - bw) / 2;
      // taps are read once per frame
      for (const i of presses.current.splice(0)) {
        if (b.over) break;
        const before = litCount(b);
        tap(b, i);
        setTaps(b.taps);
        glow.current = new Array(cols * rows).fill(0);
        glow.current[i] = 1;
        sfx(litCount(b) < before ? "place" : "tap");
        if (b.over) {
          setOver({ won: b.won, stars: starsFor(b), taps: b.taps });
          if (b.won) {
            setCleared(markStageCleared(WINDOWS_SLUG, b.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 60, ["#fff3bf", "#ffd43b", "#d0bfff"], 30, 120, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      glow.current = glow.current.map((g) => Math.max(0, g - dt * 3));
      stepParticles(parts.current, dt, 60);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // night sky, moon and stars
        ctx.fillStyle = "#1b1f3b";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#3b3f6b";
        for (let k = 0; k < 40; k++) ctx.fillRect((k * 97) % W, (k * 53) % 90, 2, 2);
        ctx.fillStyle = "#fff9db";
        ctx.fillRect(300, 24, 30, 30);
        ctx.fillStyle = "#1b1f3b";
        ctx.fillRect(310, 20, 26, 26);
        // the block of flats
        const bh = rows * WH + (rows + 1) * GAP;
        ctx.fillStyle = "#495057";
        ctx.fillRect(bx - 6, TOP - 26, bw + 12, 26);
        ctx.fillStyle = "#868e96";
        ctx.fillRect(bx, TOP, bw, bh);
        ctx.fillStyle = "#343a40";
        ctx.fillRect(bx - 10, TOP + bh, bw + 20, 16);
        for (let i = 0; i < cols * rows; i++) {
          const x = bx + GAP + (i % cols) * (WW + GAP);
          const y = TOP + GAP + Math.floor(i / cols) * (WH + GAP);
          ctx.fillStyle = "#212529";
          ctx.fillRect(x - 3, y - 3, WW + 6, WH + 6);
          ctx.fillStyle = b.lit[i] ? "#ffe066" : "#2b3a67";
          ctx.fillRect(x, y, WW, WH);
          if (b.lit[i]) {
            // someone still up: a little figure at the window
            ctx.fillStyle = "#f59f00";
            ctx.fillRect(x + WW / 2 - 5, y + 18, 10, 10);
            ctx.fillRect(x + WW / 2 - 8, y + 28, 16, 22);
          } else {
            ctx.fillStyle = "#3b5bdb";
            ctx.fillRect(x + 6, y + 6, 8, 3);
          }
          ctx.fillStyle = "#212529";
          ctx.fillRect(x + WW / 2 - 1, y, 2, WH);
          const g = glow.current[i] ?? 0;
          if (g > 0) {
            ctx.strokeStyle = `rgba(255,255,255,${g})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 4, y - 4, WW + 8, WH + 8);
          }
          if (keyed.current && cursor.current === i) {
            ctx.strokeStyle = "#4dabf7";
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 5, y - 5, WW + 10, WH + 10);
          }
          ctx.lineWidth = 1;
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = blockRef.current;
    if (!b || b.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const { cols, rows } = b.stage;
    const bx = (W - (cols * WW + (cols + 1) * GAP)) / 2;
    const c = Math.floor((x - bx - GAP / 2) / (WW + GAP));
    const rr = Math.floor((y - TOP - GAP / 2) / (WH + GAP));
    if (c >= 0 && c < cols && rr >= 0 && rr < rows) {
      cursor.current = rr * cols + c;
      presses.current.push(cursor.current);
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const b = blockRef.current;
    if (!b || b.over) return;
    const { cols, rows } = b.stage;
    const r = Math.floor(cursor.current / cols);
    const c = cursor.current % cols;
    if (e.key === "ArrowUp") cursor.current = Math.max(0, r - 1) * cols + c;
    else if (e.key === "ArrowDown") cursor.current = Math.min(rows - 1, r + 1) * cols + c;
    else if (e.key === "ArrowLeft") cursor.current = r * cols + Math.max(0, c - 1);
    else if (e.key === "ArrowRight") cursor.current = r * cols + Math.min(cols - 1, c + 1);
    else if (e.key === " " || e.key === "Enter") presses.current.push(cursor.current);
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
      data-game="sleepy-windows"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.taps, taps, st.limit)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-16 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.taps)}</p> : null}
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
