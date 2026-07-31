import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import {
  clearBrickBreakerSave,
  loadBrickBreakerSave,
  storeBrickBreakerSave,
} from "../../lib/games/brick-breaker-save";
import {
  BRICK_BREAKER_BOARD,
  BRICK_BREAKER_TIME,
  brickBreakerNextGoal,
  brickBreakerRecordExtra,
  createBrickBreakerState,
  launchBrickBreakerBall,
  levelFromBrickBreakerRecord,
  moveBrickBreakerPaddle,
  stepBrickBreaker,
  type BrickBreakerState,
} from "../../lib/games/brick-breaker";
import { getPrefersReducedMotion, subscribeToReducedMotion } from "../../lib/games/reduced-motion";

/* ────────────────────────────────────────────────────────────────────────────
 * Brick Breaker — a mobile-first canvas Breakout/Arkanoid. Drag (touch) or move
 * the mouse to steer the paddle; clear all bricks to advance levels. Self-contained
 * (one component per game, 6 locales inline, PB via records.ts, rAF loop).
 * ────────────────────────────────────────────────────────────────────────── */

const W = BRICK_BREAKER_BOARD.width;
const H = BRICK_BREAKER_BOARD.height;
const GAME_KEY = "brick-breaker";

type Phase = "menu" | "playing" | "over";
interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number }
type GS = BrickBreakerState & { particles: Particle[] };
interface Debrief { bricks: number; maxCombo: number; nextGoal: number }

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; level: string; lives: string;
  gameOver: string; restart: string; newBest: string; levelClear: string;
  bestLevel: string; combo: string; pbAhead: string; pbBehind: string; tiedBest: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "벽돌깨기", subtitle: "패들로 공을 튕겨 벽돌을 모두 부숴라", tapStart: "탭하여 시작", controls: "손가락·마우스 또는 ← → 키로 패들을 움직이고 Space 키로 공을 발사하세요.", score: "점수", best: "최고", level: "레벨", lives: "생명", gameOver: "게임 오버", restart: "즉시 다시 하기", newBest: "🎉 신기록!", levelClear: "레벨 클리어!", bestLevel: "최고 레벨", combo: "콤보", pbAhead: "최고 기록보다 앞섬", pbBehind: "최고 기록까지", tiedBest: "최고 기록과 동점" },
  en: { title: "Brick Breaker", subtitle: "Bounce the ball off the paddle and smash every brick", tapStart: "Tap to start", controls: "Move with touch, mouse, or ← → keys; press Space to launch.", score: "Score", best: "Best", level: "Level", lives: "Lives", gameOver: "Game Over", restart: "Play again now", newBest: "🎉 New best!", levelClear: "Level clear!", bestLevel: "Best level", combo: "Combo", pbAhead: "Ahead of your best", pbBehind: "To your best", tiedBest: "Tied your best" },
  ja: { title: "ブロック崩し", subtitle: "パドルでボールを弾いてブロックを全部壊せ", tapStart: "タップで開始", controls: "タッチ、マウス、← →キーで移動し、Spaceキーで発射します。", score: "スコア", best: "ベスト", level: "レベル", lives: "残機", gameOver: "ゲームオーバー", restart: "すぐ再挑戦", newBest: "🎉 新記録！", levelClear: "レベルクリア！", bestLevel: "最高レベル", combo: "コンボ", pbAhead: "ベストを更新中", pbBehind: "ベストまで", tiedBest: "ベストと同点" },
  fr: { title: "Casse-briques", subtitle: "Renvoyez la balle avec la raquette et cassez toutes les briques", tapStart: "Touchez pour commencer", controls: "Déplacez-vous au toucher, à la souris ou avec ← → ; Espace lance la balle.", score: "Score", best: "Record", level: "Niveau", lives: "Vies", gameOver: "Partie terminée", restart: "Rejouer maintenant", newBest: "🎉 Nouveau record !", levelClear: "Niveau terminé !", bestLevel: "Meilleur niveau", combo: "Combo", pbAhead: "Record dépassé de", pbBehind: "Jusqu'au record", tiedBest: "Record égalé" },
  es: { title: "Rompeladrillos", subtitle: "Rebota la bola con la paleta y rompe todos los ladrillos", tapStart: "Toca para empezar", controls: "Muévete con el dedo, ratón o ← →; pulsa Espacio para lanzar.", score: "Puntos", best: "Récord", level: "Nivel", lives: "Vidas", gameOver: "Fin del juego", restart: "Jugar otra vez ya", newBest: "🎉 ¡Nuevo récord!", levelClear: "¡Nivel superado!", bestLevel: "Mejor nivel", combo: "Combo", pbAhead: "Superas tu récord por", pbBehind: "Para tu récord", tiedBest: "Récord igualado" },
  zh: { title: "打砖块", subtitle: "用挡板弹球，击碎所有砖块", tapStart: "点击开始", controls: "用触控、鼠标或 ← → 键移动挡板，按空格键发球。", score: "得分", best: "最佳", level: "关卡", lives: "生命", gameOver: "游戏结束", restart: "立即再玩", newBest: "🎉 新纪录！", levelClear: "过关！", bestLevel: "最高关卡", combo: "连击", pbAhead: "领先最佳", pbBehind: "距最佳", tiedBest: "追平最佳" },
};

type BB2I18n = {
  launch: string; pause: string; resume: string; paused: string;
  soundOn: string; soundOff: string; bricks: string; maxCombo: string;
  nextGoal: string; ready: string; lifeLost: string; restored: string;
};

const BB2_T: Record<Locale, BB2I18n> = {
  ko: { launch: "공 발사", pause: "일시정지", resume: "계속하기", paused: "일시정지됨", soundOn: "사운드 켜짐", soundOff: "사운드 꺼짐", bricks: "부순 벽돌", maxCombo: "최대 콤보", nextGoal: "다음 목표", ready: "발사 준비", lifeLost: "생명 감소", restored: "이전 게임을 일시정지 상태로 복원했습니다" },
  en: { launch: "Launch ball", pause: "Pause", resume: "Resume", paused: "Paused", soundOn: "Sound on", soundOff: "Sound off", bricks: "Bricks broken", maxCombo: "Max combo", nextGoal: "Next goal", ready: "Ready to launch", lifeLost: "Life lost", restored: "Previous game restored in pause" },
  ja: { launch: "ボール発射", pause: "一時停止", resume: "再開", paused: "一時停止中", soundOn: "サウンドオン", soundOff: "サウンドオフ", bricks: "壊したブロック", maxCombo: "最大コンボ", nextGoal: "次の目標", ready: "発射準備", lifeLost: "残機減少", restored: "前回のゲームを一時停止状態で復元しました" },
  fr: { launch: "Lancer la balle", pause: "Pause", resume: "Reprendre", paused: "En pause", soundOn: "Son activé", soundOff: "Son coupé", bricks: "Briques cassées", maxCombo: "Combo max", nextGoal: "Prochain objectif", ready: "Prêt à lancer", lifeLost: "Vie perdue", restored: "Partie précédente restaurée en pause" },
  es: { launch: "Lanzar bola", pause: "Pausa", resume: "Continuar", paused: "En pausa", soundOn: "Sonido activado", soundOff: "Sonido desactivado", bricks: "Ladrillos rotos", maxCombo: "Combo máximo", nextGoal: "Siguiente objetivo", ready: "Listo para lanzar", lifeLost: "Vida perdida", restored: "Partida anterior restaurada en pausa" },
  zh: { launch: "发射球", pause: "暂停", resume: "继续", paused: "已暂停", soundOn: "声音开启", soundOff: "声音关闭", bricks: "击碎砖块", maxCombo: "最高连击", nextGoal: "下一目标", ready: "准备发射", lifeLost: "失去生命", restored: "已以暂停状态恢复上一局" },
};

interface Props { locale: Locale }

const BrickBreaker: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const bb2 = BB2_T[locale] ?? BB2_T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [bestLevel, setBestLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [toast, setToast] = useState("");
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [liveSummary, setLiveSummary] = useState("");
  const [debrief, setDebrief] = useState<Debrief>({ bricks: 0, maxCombo: 0, nextGoal: 100 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const startingBestRef = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const lastHudUpdateRef = useRef(0);
  const destroyedRef = useRef(0);
  const maxComboRef = useRef(0);
  const restartRef = useRef<HTMLButtonElement | null>(null);
  const lastSaveAtRef = useRef(0);
  const restoredRef = useRef(false);
  const qualityRef = useRef<"high" | "balanced">("high");

  useEffect(() => {
    const b = getBest(GAME_KEY);
    const value = b?.value ?? 0;
    setBest(value);
    setBestLevel(levelFromBrickBreakerRecord(b?.extra));
    startingBestRef.current = value;
    reducedMotionRef.current = getPrefersReducedMotion();
    return subscribeToReducedMotion((value) => { reducedMotionRef.current = value; });
  }, []);

  pausedRef.current = paused;
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    if (phase === "over") restartRef.current?.focus();
  }, [phase]);

  const playTone = useCallback((frequency: number, duration = 0.06, type: OscillatorType = "sine", volume = 0.03) => {
    const audio = audioRef.current;
    if (!audio || !soundEnabledRef.current) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearBrickBreakerSave();
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    const saved = recordBest(GAME_KEY, finalScore, "score", brickBreakerRecordExtra(levelRef.current));
    setBest(saved.value);
    setBestLevel(levelFromBrickBreakerRecord(saved.extra));
    setDebrief({
      bricks: destroyedRef.current,
      maxCombo: maxComboRef.current,
      nextGoal: brickBreakerNextGoal(finalScore, saved.value),
    });
    setIsNewBest(beat && finalScore > 0);
    if (beat && finalScore > 0 && !reducedMotionRef.current) confetti({ particleCount: 70, spread: 68, origin: { y: 0.6 } });
    setPhase("over");
  }, []);

  const loop = useCallback((now?: number) => {
    const gs = gsRef.current; const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const padY = BRICK_BREAKER_BOARD.paddleY;
    const frameNow = now ?? performance.now();
    const deltaMs = lastFrame.current === null ? 0 : frameNow - lastFrame.current;
    const scale = pausedRef.current ? 0 : Math.min(Math.max(0, deltaMs), BRICK_BREAKER_TIME.maxDeltaMs) / BRICK_BREAKER_TIME.fixedStepMs;
    lastFrame.current = frameNow;
    const events = pausedRef.current ? [] : stepBrickBreaker(gs, deltaMs);
    for (const event of events) {
      if (event.type === "brick-hit") {
        scoreRef.current = gs.score;
        maxComboRef.current = Math.max(maxComboRef.current, gs.combo);
        if (event.destroyed) destroyedRef.current += 1;
        playTone(event.destroyed ? 330 + Math.min(gs.combo, 8) * 24 : 180, 0.045, event.destroyed ? "square" : "triangle", 0.018);
        if (event.destroyed && !reducedMotionRef.current) {
          const particleCount = qualityRef.current === "balanced" ? 3 : 5;
          for (let index = 0; index < particleCount; index += 1) {
            const angle = (Math.PI * 2 * index) / particleCount;
            gs.particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * 1.4, vy: Math.sin(angle) * 1.4, life: 1, hue: event.hue });
          }
          const particleCap = qualityRef.current === "balanced" ? 60 : 120;
          if (gs.particles.length > particleCap) gs.particles.splice(0, gs.particles.length - particleCap);
        }
      }
      if (event.type === "level-clear") {
        levelRef.current = event.level;
        playTone(523, 0.12, "triangle", 0.045);
        window.setTimeout(() => playTone(659, 0.14, "triangle", 0.04), 80);
        setLiveSummary(`${t.level} ${event.level}. ${bb2.ready}.`);
        setToast(t.levelClear);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(""), reducedMotionRef.current ? 800 : 1200);
      }
      if (event.type === "life-lost") {
        playTone(82, 0.2, "sawtooth", 0.05);
        setLiveSummary(`${bb2.lifeLost}. ${t.lives} ${event.lives}. ${bb2.ready}.`);
      }
      if (event.type === "game-over") {
        playTone(65, 0.28, "sawtooth", 0.055);
        endGame(event.score);
        return;
      }
    }
    if (frameNow - lastHudUpdateRef.current >= 100 || events.some((event) => event.type === "life-lost" || event.type === "level-clear")) {
      setScore((current) => current === gs.score ? current : gs.score);
      setLevel((current) => current === gs.level ? current : gs.level);
      setLives((current) => current === gs.lives ? current : gs.lives);
      setCombo((current) => current === gs.combo ? current : gs.combo);
      lastHudUpdateRef.current = frameNow;
    }
    if (!pausedRef.current && !gs.gameOver && frameNow - lastSaveAtRef.current >= 1_000) {
      storeBrickBreakerSave({
        state: gs,
        destroyedBricks: destroyedRef.current,
        maxCombo: maxComboRef.current,
        savedAtEpochMs: Date.now(),
      });
      lastSaveAtRef.current = frameNow;
    }

    // draw
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
    for (const br of gs.bricks) {
      if (br.hits <= 0) continue;
      ctx.fillStyle = br.flashUntil > gs.elapsedMs
        ? "#ffffff"
        : `hsl(${br.hue} ${br.maxHits > 1 ? 78 : 65}% ${br.maxHits > 1 ? 68 : 55}%)`;
      const inset = !reducedMotionRef.current && br.flashUntil > gs.elapsedMs ? -1 : 1;
      ctx.fillRect(br.x + inset, br.y + inset, br.w - inset * 2, BRICK_BREAKER_BOARD.brickHeight - inset * 2);
      if (br.maxHits > 1) {
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(br.x + 3, br.y + 3, br.w - 6, BRICK_BREAKER_BOARD.brickHeight - 6);
      }
    }
    if (!reducedMotionRef.current) {
      gs.particles = gs.particles.filter((particle) => {
        particle.x += particle.vx * scale;
        particle.y += particle.vy * scale;
        particle.life -= 0.07 * scale;
        if (particle.life <= 0) return false;
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = `hsl(${particle.hue} 80% 65%)`;
        ctx.fillRect(particle.x, particle.y, 3, 3);
        return true;
      });
      ctx.globalAlpha = 1;
    }
    // paddle
    ctx.fillStyle = gs.paddleFlashUntil > gs.elapsedMs ? "#ffffff" : "#8b5cf6";
    const paddleLift = !reducedMotionRef.current && gs.paddleFlashUntil > gs.elapsedMs ? 2 : 0;
    ctx.fillRect(gs.padX - gs.padW / 2, padY - paddleLift, gs.padW, 10 + paddleLift);
    // ball
    ctx.beginPath(); ctx.fillStyle = "#c4b5fd";
    ctx.arc(gs.bx, gs.by, BRICK_BREAKER_BOARD.ballRadius, 0, Math.PI * 2); ctx.fill();

    rafRef.current = requestAnimationFrame(loop);
  }, [bb2.lifeLost, bb2.ready, endGame, playTone, t.level, t.levelClear, t.lives]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadBrickBreakerSave();
    if (!saved) return;
    const gs: GS = { ...saved.state, particles: [] };
    gsRef.current = gs;
    scoreRef.current = gs.score;
    levelRef.current = gs.level;
    destroyedRef.current = saved.destroyedBricks;
    maxComboRef.current = saved.maxCombo;
    qualityRef.current = window.matchMedia("(pointer: coarse)").matches ? "balanced" : "high";
    setScore(gs.score); setLives(gs.lives); setLevel(gs.level); setCombo(gs.combo);
    setPaused(true); setLiveSummary(bb2.restored); setPhase("playing");
    lastFrame.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [bb2.restored, loop]);

  const begin = useCallback(() => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    const currentBest = getBest(GAME_KEY);
    clearBrickBreakerSave();
    startingBestRef.current = currentBest?.value ?? 0;
    const gs: GS = {
      ...createBrickBreakerState(),
      particles: [],
    };
    gsRef.current = gs;
    scoreRef.current = 0; levelRef.current = 1;
    destroyedRef.current = 0; maxComboRef.current = 0; lastHudUpdateRef.current = 0;
    lastSaveAtRef.current = 0;
    qualityRef.current = window.matchMedia("(pointer: coarse)").matches ? "balanced" : "high";
    setScore(0); setLives(3); setLevel(1); setCombo(0); setIsNewBest(false); setToast("");
    setPaused(false); setLiveSummary(bb2.ready);
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastFrame.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [bb2.ready, loop]);

  useEffect(() => {
    const persistActive = () => {
      const state = gsRef.current;
      if (!state || phaseRef.current !== "playing" || state.gameOver) return;
      storeBrickBreakerSave({ state, destroyedBricks: destroyedRef.current, maxCombo: maxComboRef.current, savedAtEpochMs: Date.now() });
    };
    const resetFrameClock = () => {
      lastFrame.current = null;
      if (document.hidden) persistActive();
    };
    document.addEventListener("visibilitychange", resetFrameClock);
    return () => {
      persistActive();
      document.removeEventListener("visibilitychange", resetFrameClock);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      void audioRef.current?.close();
    };
  }, []);

  const steer = useCallback((clientX: number) => {
    const canvas = canvasRef.current; const gs = gsRef.current;
    if (!canvas || !gs) return;
    const rect = canvas.getBoundingClientRect();
    moveBrickBreakerPaddle(gs, ((clientX - rect.left) / rect.width) * W);
  }, []);

  const steerByKeyboard = useCallback((direction: -1 | 1) => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    moveBrickBreakerPaddle(gs, gs.padX + direction * 24);
  }, []);

  const launch = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing" || pausedRef.current || gs.launched) return;
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    launchBrickBreakerBall(gs);
    playTone(440, 0.08, "triangle", 0.035);
    setLiveSummary(`${bb2.launch}. ${t.level} ${gs.level}.`);
    canvasRef.current?.focus();
  }, [bb2.launch, playTone, t.level]);

  const togglePause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setPaused((current) => {
      const next = !current;
      lastFrame.current = null;
      setLiveSummary(next ? bb2.paused : bb2.resume);
      const state = gsRef.current;
      if (next && state) storeBrickBreakerSave({ state, destroyedBricks: destroyedRef.current, maxCombo: maxComboRef.current, savedAtEpochMs: Date.now() });
      return next;
    });
  }, [bb2.paused, bb2.resume]);

  const scoreGap = startingBestRef.current - score;
  const recordComparison = scoreGap > 0
    ? `${t.pbBehind}: ${scoreGap}`
    : scoreGap < 0
      ? `${t.pbAhead}: ${Math.abs(scoreGap)}`
      : t.tiedBest;

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best} · {t.bestLevel}: {bestLevel}</div>
        </div>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${W}px` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-2xl border border-border touch-none [cursor:none] bg-[#0b1020]"
          style={{ aspectRatio: `${W} / ${H}` }}
          tabIndex={0}
          role="application"
          aria-label={`${t.title}. ${t.controls}`}
          onPointerMove={(e) => phaseRef.current === "playing" && steer(e.clientX)}
          onPointerDown={(e) => { if (phaseRef.current === "playing") steer(e.clientX); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === " " || event.key === "p" || event.key === "P" || event.key === "Escape") event.preventDefault();
            if (event.key === "ArrowLeft") steerByKeyboard(-1);
            if (event.key === "ArrowRight") steerByKeyboard(1);
            if (event.key === " ") launch();
            if (event.key === "p" || event.key === "P" || event.key === "Escape") togglePause();
          }}
        />

        {phase === "playing" && paused && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55 text-xl font-black text-white">
            {bb2.paused}
          </div>
        )}

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-2 text-[11px] font-bold text-white/90" aria-hidden="true">
            <span>{t.level} {level}</span>
            <span>{"❤️".repeat(Math.max(0, lives))}</span>
            {combo > 1 && <span className="rounded bg-white/15 px-1.5 text-amber-200">{combo}× {t.combo}</span>}
          </div>
        )}
        {toast && phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-lg font-black text-violet-300">{toast}</div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-violet-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.level}: {level}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/80">
                  <span>{bb2.bricks}: <b>{debrief.bricks}</b></span>
                  <span>{bb2.maxCombo}: <b>{debrief.maxCombo}×</b></span>
                  <span className="col-span-2 text-amber-200">{bb2.nextGoal}: {debrief.nextGoal}</span>
                </div>
                <div className="text-xs font-bold text-amber-200">{recordComparison}</div>
              </>
            )}
            {phase === "menu" && (
              <>
                <div className="text-4xl">🧱</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            <button ref={phase === "over" ? restartRef : undefined} onClick={begin} className="min-h-11 rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600">
              {phase === "over" ? t.restart : t.tapStart}
            </button>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={launch} disabled={paused || Boolean(gsRef.current?.launched)} className="min-h-11 rounded-xl bg-primary px-2 text-xs font-bold text-primary-foreground disabled:opacity-45">
            {bb2.launch}
          </button>
          <button type="button" onClick={togglePause} className="min-h-11 rounded-xl border border-border bg-card px-2 text-xs font-bold">
            {paused ? bb2.resume : bb2.pause}
          </button>
          <button type="button" onClick={() => setSoundEnabled((value) => !value)} aria-label={soundEnabled ? bb2.soundOn : bb2.soundOff} aria-pressed={soundEnabled} className="min-h-11 rounded-xl border border-border bg-card px-2 text-lg">
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveSummary}</div>
    </div>
  );
};

export default BrickBreaker;
