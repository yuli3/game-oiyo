import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { frameScale } from "../../lib/games/time-contracts";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  CAVE_GAP,
  CAVE_HEIGHT,
  CAVE_SHIP_RADIUS,
  CAVE_SHIP_X,
  CAVE_WALL_WIDTH,
  CAVE_WIDTH,
  createCaveDash,
  explainCaveDashDeath,
  flapCaveDash,
  stepCaveDash,
  type CaveDashDeath,
  type CaveDashState,
} from "../../lib/games/cave-dash";
import { clearCaveDashSave, loadCaveDashSave, storeCaveDashSave } from "../../lib/games/cave-dash-save";
import { blitSheetFrame, sheetFrameIndex } from "../../lib/games/sprite-sheet";
import { CAVE_DASH_EXHAUST_SHEET, CAVE_DASH_SHIP_HULL_SX, CAVE_DASH_SPRITES } from "../../lib/games/sprites";

type CaveArt = Record<keyof typeof CAVE_DASH_SPRITES, HTMLImageElement>;
function loadCaveArt(): CaveArt | null {
  if (typeof Image === "undefined") return null;
  const art = {} as CaveArt;
  for (const [key, src] of Object.entries(CAVE_DASH_SPRITES)) {
    const image = new Image();
    image.src = src;
    art[key as keyof CaveArt] = image;
  }
  return art;
}
function paintBox(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image?.complete || image.naturalWidth === 0 || width <= 0 || height <= 0) return false;
  const tileH = width * (image.naturalHeight / image.naturalWidth);
  let yy = y;
  while (yy < y + height) {
    const slice = Math.min(tileH, y + height - yy);
    const srcH = image.naturalHeight * (slice / tileH);
    ctx.drawImage(image, 0, 0, image.naturalWidth, srcH, x, yy, width, slice);
    yy += slice;
  }
  return true;
}
function paintShip(
  ctx: CanvasRenderingContext2D,
  art: CaveArt | null,
  shipW: number,
  shipH: number,
  exhaustFrame: number,
  reducedMotion: boolean,
) {
  const ship = art?.ship;
  if (!ship?.complete || ship.naturalWidth === 0) return false;
  const sx = Math.round(ship.naturalWidth * CAVE_DASH_SHIP_HULL_SX);
  const sw = ship.naturalWidth - sx;
  const hullW = shipW * (sw / ship.naturalWidth);
  const hullX = -hullW / 2;
  if (!reducedMotion && art?.exhaustSheet) {
    blitSheetFrame(ctx, art.exhaustSheet, CAVE_DASH_EXHAUST_SHEET, exhaustFrame, hullX - shipW * 0.38, -shipH * 0.28, shipW * 0.48, shipH * 0.56);
  }
  ctx.drawImage(ship, sx, 0, sw, ship.naturalHeight, hullX, -shipH / 2, hullW, shipH);
  return true;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Cave Dash — a one-tap endless flyer. Tap (or click / press) to give the ship a
 * lift; gravity pulls it down. Thread the gaps between walls, the pace ramps up,
 * chase distance. Self-contained (one component per game, 6 locales inline, PB via
 * records.ts, rAF loop). Mobile-first canvas.
 * ────────────────────────────────────────────────────────────────────────── */

const GAME_KEY = "cave-dash";
type Phase = "menu" | "playing" | "paused" | "over";

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; gameOver: string; restart: string; newBest: string; playArea: string; paused: string; resume: string;
  pause: string; soundOn: string; soundOff: string; flightTime: string; nextTarget: string; seconds: string; livePlaying: string;
  retrySame: string; retryNew: string; death: Record<CaveDashDeath, string>;
};

const T: Record<Locale, I18n> = {
  ko: { title: "케이브 대시", subtitle: "탭으로 상승, 벽 사이를 통과하라", tapStart: "탭하여 시작", controls: "화면을 탭(또는 클릭·스페이스)하면 위로 떠오릅니다. 놓으면 중력으로 내려갑니다. 벽 사이 틈을 통과하세요.", score: "점수", best: "최고", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", playArea: "케이브 대시 게임 영역", paused: "일시정지", resume: "계속하기", pause: "일시정지", soundOn: "소리 켜기", soundOff: "소리 끄기", flightTime: "비행 시간", nextTarget: "다음 목표", seconds: "초", livePlaying: "비행 중", retrySame: "같은 동굴", retryNew: "새 동굴", death: { ceiling: "천장에 부딪힘", floor: "바닥에 부딪힘", wall: "벽에 부딪힘" } },
  en: { title: "Cave Dash", subtitle: "Tap to rise, thread the gaps", tapStart: "Tap to start", controls: "Tap the screen (or click / press Space) to lift; gravity pulls you down. Fly through the gaps between walls.", score: "Score", best: "Best", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", playArea: "Cave Dash game area", paused: "Paused", resume: "Resume", pause: "Pause", soundOn: "Turn sound on", soundOff: "Turn sound off", flightTime: "Flight time", nextTarget: "Next target", seconds: "sec", livePlaying: "Flying", retrySame: "Same cave", retryNew: "New cave", death: { ceiling: "Hit the ceiling", floor: "Hit the floor", wall: "Hit a wall" } },
  ja: { title: "ケイブダッシュ", subtitle: "タップで上昇、壁の隙間を抜けろ", tapStart: "タップで開始", controls: "画面をタップ(またはクリック・スペース)すると上昇し、離すと重力で下降します。壁の隙間を通り抜けましょう。", score: "スコア", best: "ベスト", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", playArea: "ケイブダッシュのゲームエリア", paused: "一時停止", resume: "再開", pause: "一時停止", soundOn: "音をオン", soundOff: "音をオフ", flightTime: "飛行時間", nextTarget: "次の目標", seconds: "秒", livePlaying: "飛行中", retrySame: "同じ洞窟", retryNew: "新しい洞窟", death: { ceiling: "天井に衝突", floor: "床に衝突", wall: "壁に衝突" } },
  fr: { title: "Cave Dash", subtitle: "Touchez pour monter, passez les trous", tapStart: "Touchez pour commencer", controls: "Touchez l'écran (ou cliquez / Espace) pour monter ; la gravité vous fait descendre. Passez entre les murs.", score: "Score", best: "Record", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", playArea: "Zone de jeu Cave Dash", paused: "En pause", resume: "Reprendre", pause: "Pause", soundOn: "Activer le son", soundOff: "Couper le son", flightTime: "Temps de vol", nextTarget: "Prochain objectif", seconds: "s", livePlaying: "En vol", retrySame: "Même grotte", retryNew: "Nouvelle grotte", death: { ceiling: "Plafond", floor: "Sol", wall: "Mur" } },
  es: { title: "Cave Dash", subtitle: "Toca para subir, cruza los huecos", tapStart: "Toca para empezar", controls: "Toca la pantalla (o clic / Espacio) para subir; la gravedad te baja. Cruza los huecos entre los muros.", score: "Puntos", best: "Récord", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", playArea: "Área de juego de Cave Dash", paused: "En pausa", resume: "Continuar", pause: "Pausar", soundOn: "Activar sonido", soundOff: "Silenciar", flightTime: "Tiempo de vuelo", nextTarget: "Próximo objetivo", seconds: "s", livePlaying: "Volando", retrySame: "Misma cueva", retryNew: "Nueva cueva", death: { ceiling: "Techo", floor: "Suelo", wall: "Pared" } },
  zh: { title: "洞穴冲刺", subtitle: "点击上升，穿过缝隙", tapStart: "点击开始", controls: "点击屏幕(或点击鼠标/空格)上升，松开后重力下坠。穿过墙壁之间的缝隙。", score: "得分", best: "最佳", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", playArea: "洞穴冲刺游戏区域", paused: "已暂停", resume: "继续", pause: "暂停", soundOn: "开启声音", soundOff: "关闭声音", flightTime: "飞行时间", nextTarget: "下一目标", seconds: "秒", livePlaying: "飞行中", retrySame: "同一洞穴", retryNew: "新洞穴", death: { ceiling: "撞到顶部", floor: "撞到底部", wall: "撞到墙壁" } },
};

interface Props { locale: Locale }

const CaveDash: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const [finalFrames, setFinalFrames] = useState(0);
  const [death, setDeath] = useState<CaveDashDeath | null>(null);
  const seedRef = useRef<number | null>(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<CaveDashState | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;
  const scoreRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const lastFrame = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const artRef = useRef<CaveArt | null>(null);
  if (artRef.current === null) artRef.current = loadCaveArt();

  const playTone = useCallback((kind: "flap" | "point" | "crash") => {
    if (mutedRef.current || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioContext.current ?? new AudioContextClass();
    audioContext.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies = { flap: 330, point: 660, crash: 110 } as const;
    oscillator.type = kind === "crash" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(frequencies[kind], context.currentTime);
    if (kind === "point") oscillator.frequency.exponentialRampToValueAtTime(920, context.currentTime + 0.1);
    gain.gain.setValueAtTime(kind === "crash" ? 0.08 : 0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === "crash" ? 0.28 : 0.12));
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + (kind === "crash" ? 0.28 : 0.12));
  }, []);

  useEffect(() => {
    const b = getBest(GAME_KEY);
    setBest(b ? b.value : 0);
    const saved = loadCaveDashSave();
    if (saved) {
      gsRef.current = saved.state;
      scoreRef.current = saved.state.score;
      setScore(saved.state.score);
      phaseRef.current = "paused";
      setPhase("paused");
    }
  }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearCaveDashSave();
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    const saved = recordBest(GAME_KEY, finalScore, "score");
    setBest(saved.value);
    setFinalFrames(gsRef.current?.elapsedFrames ?? 0);
    setDeath(gsRef.current ? explainCaveDashDeath(gsRef.current) : null);
    setIsNewBest(beat && finalScore > 0);
    playTone("crash");
    if (beat && finalScore > 0 && !prefersReducedMotion) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    phaseRef.current = "over";
    setPhase("over");
  }, [playTone, prefersReducedMotion]);

  const loop = useCallback((now?: number) => {
    const current = gsRef.current; const canvas = canvasRef.current;
    if (!current || !canvas || phaseRef.current !== "playing") return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const frameNow = now ?? performance.now();
    const scale = frameScale(lastFrame.current, frameNow);
    lastFrame.current = frameNow;
    const gs = stepCaveDash(current, scale);
    gsRef.current = gs;
    if (gs.score !== scoreRef.current) { scoreRef.current = gs.score; setScore(gs.score); playTone("point"); }

    // draw
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, CAVE_WIDTH, CAVE_HEIGHT);
    // parallax stars
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 24; i++) ctx.fillRect((i * 97 - gs.elapsedFrames * 0.6) % CAVE_WIDTH + (((i * 97 - gs.elapsedFrames * 0.6) % CAVE_WIDTH) < 0 ? CAVE_WIDTH : 0), (i * 71) % CAVE_HEIGHT, 1.5, 1.5);
    const art = artRef.current;
    for (const wl of gs.walls) {
      if (!paintBox(ctx, art?.wall, wl.x, 0, CAVE_WALL_WIDTH, wl.gapY)) {
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(wl.x, 0, CAVE_WALL_WIDTH, wl.gapY);
      }
      const bottomY = wl.gapY + CAVE_GAP;
      const bottomH = CAVE_HEIGHT - bottomY;
      if (!paintBox(ctx, art?.wall, wl.x, bottomY, CAVE_WALL_WIDTH, bottomH)) {
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(wl.x, bottomY, CAVE_WALL_WIDTH, bottomH);
      }
    }
    const shipW = CAVE_SHIP_RADIUS * 3.6;
    const shipH = CAVE_SHIP_RADIUS * 2.1;
    ctx.save();
    ctx.translate(CAVE_SHIP_X, gs.y);
    ctx.rotate(Math.atan2(gs.vy, 8) * 0.35);
    const exhaustFrame = sheetFrameIndex(CAVE_DASH_EXHAUST_SHEET, (gs.elapsedFrames / 60) * 1000, prefersReducedMotion);
    if (!paintShip(ctx, art, shipW, shipH, exhaustFrame, prefersReducedMotion)) {
      ctx.beginPath(); ctx.fillStyle = "#c4b5fd";
      ctx.arc(0, 0, CAVE_SHIP_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(-2, -2, 4, 4);
    }
    ctx.restore();

    if (gs.status === "over") { endGame(gs.score); return; }
    rafRef.current = requestAnimationFrame(loop);
  }, [endGame, playTone, prefersReducedMotion]);

  const begin = useCallback((seedOverride?: number) => {
    clearCaveDashSave();
    const seed = seedOverride ?? (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now());
    seedRef.current = seed;
    gsRef.current = createCaveDash(seed);
    scoreRef.current = 0;
    setScore(0); setIsNewBest(false); setFinalFrames(0); setDeath(null);
    phaseRef.current = "playing";
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastFrame.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const flap = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    gsRef.current = flapCaveDash(gs);
    playTone("flap");
  }, [playTone]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing" || gsRef.current?.status !== "playing") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    storeCaveDashSave(gsRef.current);
    phaseRef.current = "paused";
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (!gsRef.current || gsRef.current.status !== "playing") return;
    lastFrame.current = null;
    phaseRef.current = "playing";
    setPhase("playing");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (gsRef.current?.status === "playing" && phaseRef.current !== "over") storeCaveDashSave(gsRef.current);
  }, []);

  useEffect(() => () => { void audioContext.current?.close(); }, []);

  useEffect(() => {
    if (phase !== "playing" && phase !== "paused") return;
    const timer = window.setInterval(() => {
      if (gsRef.current?.status === "playing") storeCaveDashSave(gsRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === "playing") {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (gsRef.current?.status === "playing") storeCaveDashSave(gsRef.current);
        phaseRef.current = "paused";
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // keyboard (space) support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phaseRef.current === "playing") flap();
        else if (phaseRef.current === "paused") resume();
        else begin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, begin, resume]);

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best}</div>
        </div>
      </div>

      <div className="mb-3 flex justify-end gap-2">
        {phase === "playing" && <button type="button" onClick={pause} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t.pause}</button>}
        <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? t.soundOn : t.soundOff} aria-pressed={!muted} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-base text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{muted ? "🔇" : "🔊"}</button>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${CAVE_WIDTH}px` }}>
        <canvas
          ref={canvasRef}
          width={CAVE_WIDTH}
          height={CAVE_HEIGHT}
          className="w-full rounded-2xl border border-border touch-none bg-[#0b1020] [cursor:pointer]"
          style={{ aspectRatio: `${CAVE_WIDTH} / ${CAVE_HEIGHT}` }}
          role="img"
          aria-label={t.playArea}
          onPointerDown={(e) => { e.preventDefault(); if (phaseRef.current === "playing") flap(); }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-2xl font-black text-white/90">{score}</div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-violet-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                {death && <div className="text-sm font-bold text-amber-200">{t.death[death]}</div>}
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
                <div className="grid w-full max-w-xs grid-cols-2 gap-2 text-left text-xs text-white/80">
                  <div className="rounded-xl bg-white/10 p-3"><span className="block text-white/60">{t.flightTime}</span><b>{Math.max(1, Math.round(finalFrames / 60))} {t.seconds}</b></div>
                  <div className="rounded-xl bg-white/10 p-3"><span className="block text-white/60">{t.nextTarget}</span><b>{Math.max(best, score) + 1}</b></div>
                </div>
              </>
            )}
            {phase === "paused" && <div className="text-xl font-black text-white">{t.paused}</div>}
            {phase === "menu" && (
              <>
                <div className="text-4xl">🚀</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {phase === "over" && <button type="button" onClick={() => seedRef.current !== null ? begin(seedRef.current) : begin()} disabled={seedRef.current === null} className="min-h-11 rounded-full border border-white/40 px-6 py-2.5 font-bold text-white disabled:opacity-40">{t.retrySame}</button>}
              <button type="button" onClick={phase === "paused" ? resume : () => begin()} className="min-h-11 rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600">
                {phase === "paused" ? t.resume : phase === "over" ? t.retryNew : t.tapStart}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{phase === "playing" ? `${t.livePlaying}. ${t.score} ${score}` : phase === "paused" ? t.paused : phase === "over" ? `${t.gameOver}. ${t.score} ${score}` : ""}</p>
    </div>
  );
};

export default CaveDash;
