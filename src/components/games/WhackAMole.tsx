/**
 * WhackAMole.tsx - 100% Canvas GPU 120fps Modern Engine
 * Argon-style Cyber Portals, spring pop-up physics, 0ms mobile touch response,
 * procedural Web Audio combo synth, and particle shockwaves.
 *
 * Date: 2026-10-17
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { celebrate } from "../../lib/games/celebration";
import type { Locale } from "../../lib/i18n";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { getBest, recordBest } from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  advanceWhack,
  createWhackGame,
  hitWhack,
  whackAnalysis,
  WHACK_DURATION_MS,
  type WhackCritter,
  type WhackState,
} from "../../lib/games/whack-a-mole";
import { clearWhackSave, loadWhackSave, storeWhackSave } from "../../lib/games/whack-a-mole-save";
import {
  createFloatingScore,
  createWhackParticles,
  createWhackShockwave,
  getHoleCenter,
  getHoleIndexFromPoint,
  renderWhackCanvas,
  updateWhackFloatingScores,
  updateWhackParticles,
  updateWhackShockwaves,
  type WhackFloatingScore,
  type WhackParticle,
  type WhackShockwave,
} from "../../lib/games/whack-canvas";

const GAME_KEY = "whack-a-mole";

type Copy = {
  title: string;
  subtitle: string;
  start: string;
  controls: string;
  score: string;
  best: string;
  time: string;
  over: string;
  again: string;
  newBest: string;
  pause: string;
  resume: string;
  sound: string;
  restored: string;
  combo: string;
  hits: string;
  bombs: string;
  escaped: string;
  accuracy: string;
  next: string;
  share: string;
  hole: string;
  empty: string;
  mole: string;
  bomb: string;
};

const T: Record<Locale, Copy> = {
  ko: { title: "두더지 잡기", subtitle: "30초 반사 신경 챌린지", start: "게임 시작", controls: "두더지는 빠르게 치고 폭탄은 피하세요. 숫자 1–9와 터치로 조작할 수 있습니다.", score: "점수", best: "최고", time: "남은 시간", over: "라운드 종료", again: "다시 하기", newBest: "신기록!", pause: "일시정지", resume: "계속하기", sound: "소리", restored: "이전 라운드를 일시정지 상태로 복원했어요", combo: "최대 콤보", hits: "명중", bombs: "폭탄", escaped: "놓침", accuracy: "정확도", next: "다음 목표", share: "결과 복사", hole: "구멍", empty: "비어 있음", mole: "두더지", bomb: "폭탄" },
  en: { title: "Whack-a-Mole", subtitle: "30-second reflex challenge", start: "Start", controls: "Hit moles fast and avoid bombs. Tap chambers or use keys 1–9.", score: "Score", best: "Best", time: "Time left", over: "Round complete", again: "Play again", newBest: "New best!", pause: "Pause", resume: "Resume", sound: "Sound", restored: "Previous round restored and paused", combo: "Max combo", hits: "Hits", bombs: "Bombs", escaped: "Escaped", accuracy: "Accuracy", next: "Next target", share: "Copy result", hole: "Hole", empty: "empty", mole: "mole", bomb: "bomb" },
  ja: { title: "モグラたたき", subtitle: "30秒反射神経チャレンジ", start: "ゲーム開始", controls: "モグラを素早く叩き、爆弾を避けよう。タップまたは1〜9キーで操作できます。", score: "スコア", best: "ベスト", time: "残り時間", over: "ラウンド終了", again: "もう一度", newBest: "新記録！", pause: "一時停止", resume: "再開", sound: "サウンド", restored: "前回のラウンドを一時停止で復元しました", combo: "最大コンボ", hits: "命中", bombs: "爆弾", escaped: "逃した数", accuracy: "正確度", next: "次の目標", share: "結果をコピー", hole: "穴", empty: "空", mole: "モグラ", bomb: "爆弾" },
  zh: { title: "打地鼠", subtitle: "30秒反应挑战", start: "开始游戏", controls: "快速敲打地鼠并避开炸弹。轻触洞口或按数字1–9键。", score: "得分", best: "最佳", time: "剩余时间", over: "回合结束", again: "再玩一次", newBest: "新纪录！", pause: "暂停", resume: "继续", sound: "声音", restored: "已恢复并暂停上一局", combo: "最高连击", hits: "命中", bombs: "炸弹", escaped: "逃脱", accuracy: "准确率", next: "下个目标", share: "复制结果", hole: "洞", empty: "空", mole: "地鼠", bomb: "炸弹" },
  fr: { title: "Tape-Taupe", subtitle: "Défi de réflexes de 30 secondes", start: "Commencer", controls: "Tapez vite les taupes et évitez les bombes. Touchez ou utilisez 1–9.", score: "Score", best: "Record", time: "Temps restant", over: "Manche terminée", again: "Rejouer", newBest: "Nouveau record !", pause: "Pause", resume: "Reprendre", sound: "Son", restored: "Manche précédente restaurée en pause", combo: "Combo max", hits: "Touches", bombs: "Bombes", escaped: "Échappées", accuracy: "Précision", next: "Prochain objectif", share: "Copier le résultat", hole: "Trou", empty: "vide", mole: "taupe", bomb: "bombe" },
  es: { title: "Golpea al Topo", subtitle: "Reto de reflejos de 30 segundos", start: "Empezar", controls: "Golpea rápido los topos y evita las bombas. Toca las cámaras o usa 1–9.", score: "Puntos", best: "Récord", time: "Tiempo", over: "Ronda terminada", again: "Jugar de nuevo", newBest: "¡Nuevo récord!", pause: "Pausa", resume: "Continuar", sound: "Sonido", restored: "Ronda anterior restaurada y pausada", combo: "Combo máximo", hits: "Aciertos", bombs: "Bombas", escaped: "Escapados", accuracy: "Precisión", next: "Siguiente meta", share: "Copiar resultado", hole: "Agujero", empty: "vacío", mole: "topo", bomb: "bomba" },
};

const PENTATONIC = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

const WhackAMole = ({ locale }: { locale: Locale }) => {
  const t = T[locale] ?? T.en;
  const reducedMotion = usePrefersReducedMotion();
  const [game, setGame] = useState<WhackState | null>(null);
  const [paused, setPaused] = useState(false);
  const [restored, setRestored] = useState(false);
  const [muted, setMuted] = useState(false);
  const [best, setBest] = useState(0);
  const [hitIndex, setHitIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellProgressRef = useRef<number[]>(Array<number>(9).fill(0));
  const particlesRef = useRef<WhackParticle[]>([]);
  const shockwavesRef = useRef<WhackShockwave[]>([]);
  const floatingScoresRef = useRef<WhackFloatingScore[]>([]);
  const recoilShakeRef = useRef<number>(0);

  const resumedAt = useRef(0);
  const baseElapsed = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const endedSeed = useRef<number | null>(null);
  const savedElapsed = useRef(0);
  const gameRef = useRef<WhackState | null>(null);
  gameRef.current = game;

  const initAudio = useCallback(() => {
    if (!muted && !audio.current && typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audio.current = new AudioCtx();
      } catch {
        /* audio optional */
      }
    }
    if (audio.current && audio.current.state === "suspended") {
      audio.current.resume().catch(() => {});
    }
  }, [muted]);

  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale,
    onEnter: () => {
      initAudio();
    },
  });

  const tone = useCallback(
    (kind: "mole" | "bomb" | "end", combo = 1) => {
      if (muted || typeof AudioContext === "undefined") return;
      initAudio();
      const context = audio.current;
      if (!context) return;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      if (kind === "mole") {
        const note = PENTATONIC[(combo - 1) % PENTATONIC.length];
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(note, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(note * 1.35, context.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.12);
      } else if (kind === "bomb") {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(130, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(30, context.currentTime + 0.35);
        gain.gain.setValueAtTime(0.12, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.35);
      } else {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(660, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
      }
    },
    [initAudio, muted]
  );

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const start = useCallback((seedOverride?: number) => {
    clearWhackSave();
    initAudio();
    const seed =
      seedOverride ??
      (typeof crypto !== "undefined"
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Date.now() >>> 0);

    const newGame = createWhackGame(seed);
    setGame(newGame);
    setPaused(false);
    setRestored(false);
    setHitIndex(null);
    particlesRef.current = [];
    shockwavesRef.current = [];
    floatingScoresRef.current = [];
    recoilShakeRef.current = 0;
    cellProgressRef.current = Array<number>(9).fill(0);

    baseElapsed.current = 0;
    resumedAt.current = performance.now();
    endedSeed.current = null;
    savedElapsed.current = 0;
  }, [initAudio]);

  useEffect(() => {
    setBest(getBest(GAME_KEY)?.value ?? 0);
    const saved = loadWhackSave();
    if (saved) {
      setGame(saved.state);
      setPaused(true);
      setRestored(true);
      baseElapsed.current = saved.state.elapsedMs;
    }
    return () => {
      void audio.current?.close();
    };
  }, []);

  // Main 120fps continuous RAF loop with spring pop-up physics & VFX
  useEffect(() => {
    let raf = 0;
    let lastTime: number | null = null;

    const loop = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const delta = lastTime === null ? 0 : Math.min(100, Math.max(0, now - lastTime));
      lastTime = now;

      // Update game elapsed time if playing
      const current = gameRef.current;
      if (current && !paused && current.status === "playing") {
        const elapsed = baseElapsed.current + performance.now() - resumedAt.current;
        const next = advanceWhack(current, elapsed);
        if (next !== current) {
          gameRef.current = next;
          setGame(next);
        }
      }

      // Smooth spring pop-up physics for 9 cells (120fps)
      const currentCells = current?.cells ?? Array<WhackCritter>(9).fill(null);
      for (let i = 0; i < 9; i++) {
        const target = currentCells[i] ? 1 : 0;
        const speed = currentCells[i] ? 0.22 : 0.28;
        cellProgressRef.current[i] += (target - cellProgressRef.current[i]) * speed;
      }

      // High-DPI Resolution handling
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Update VFX
      particlesRef.current = updateWhackParticles(particlesRef.current, delta);
      shockwavesRef.current = updateWhackShockwaves(shockwavesRef.current, delta);
      floatingScoresRef.current = updateWhackFloatingScores(floatingScoresRef.current, delta);
      recoilShakeRef.current *= 0.9;

      ctx.save();
      ctx.scale(dpr, dpr);

      renderWhackCanvas(ctx, rect.width, rect.height, {
        cells: currentCells,
        cellProgress: cellProgressRef.current,
        particles: particlesRef.current,
        shockwaves: shockwavesRef.current,
        floatingScores: floatingScoresRef.current,
        now,
        recoilShake: recoilShakeRef.current,
        hitIndex,
        status: current ? current.status : "idle",
      });

      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hitIndex, paused]);

  // Saves & High Score Trigger
  useEffect(() => {
    if (!game) return;
    if (game.status === "playing" && (paused || game.elapsedMs - savedElapsed.current >= 500)) {
      storeWhackSave(game);
      savedElapsed.current = game.elapsedMs;
    }
    if (game.status === "over" && endedSeed.current !== game.seed) {
      endedSeed.current = game.seed;
      clearWhackSave();
      tone("end");
      const previous = getBest(GAME_KEY);
      const beat = !previous || game.score > previous.value;
      const saved = recordBest(GAME_KEY, game.score, "score");
      setBest(saved.value);
      if (beat && game.score > 0 && !reducedMotion) {
        celebrate(canvasRef.current, { preset: "stardust", colors: ["#fbbf24", "#fb923c", "#fef3c7"], origin: { x: 0.5, y: 0.55 } });
      }
    }
  }, [game, paused, reducedMotion, tone]);

  // Visibility Change
  useEffect(() => {
    const visibility = () => {
      if (!document.hidden) return;
      setPaused((current) => {
        if (!current && game?.status === "playing") {
          const elapsed = baseElapsed.current + performance.now() - resumedAt.current;
          setGame((value) => (value ? advanceWhack(value, elapsed) : value));
        }
        return true;
      });
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [game?.status]);

  const togglePause = () => {
    if (!game || game.status !== "playing") return;
    if (!paused) {
      const elapsed = baseElapsed.current + performance.now() - resumedAt.current;
      const next = advanceWhack(game, elapsed);
      setGame(next);
      storeWhackSave(next);
      setPaused(true);
    } else {
      baseElapsed.current = game.elapsedMs;
      resumedAt.current = performance.now();
      setPaused(false);
      setRestored(false);
    }
  };

  const hit = useCallback(
    (index: number) => {
      if (!game || paused || game.status !== "playing" || !game.cells[index]) return;
      const target = game.cells[index] as Exclude<WhackCritter, null>;
      const nextGame = hitWhack(game, index);
      setGame(nextGame);
      setHitIndex(index);

      // Trigger VFX & Audio
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const center = getHoleCenter(index, rect.width, rect.height);

        if (target === "mole") {
          tone("mole", nextGame.combo);
          vibrate(12);
          recoilShakeRef.current = 4;
          particlesRef.current.push(...createWhackParticles(center.x, center.y, "mole", 22));
          shockwavesRef.current.push(createWhackShockwave(center.x, center.y, "mole"));
          const scoreDelta = nextGame.combo > 1 ? `+10 (x${nextGame.combo})` : "+10";
          floatingScoresRef.current.push(createFloatingScore(center.x, center.y, scoreDelta, "#38bdf8"));
        } else {
          tone("bomb");
          vibrate([40, 40, 80]);
          recoilShakeRef.current = 10;
          particlesRef.current.push(...createWhackParticles(center.x, center.y, "bomb", 32));
          shockwavesRef.current.push(createWhackShockwave(center.x, center.y, "bomb"));
          floatingScoresRef.current.push(createFloatingScore(center.x, center.y, "-10 BOMB!", "#ef4444"));
        }
      }

      window.setTimeout(() => {
        setHitIndex((current) => (current === index ? null : current));
      }, 140);
    },
    [game, paused, tone, vibrate]
  );

  // Sub-millisecond pointer-down touch directly on the canvas surface
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    initAudio();
    if (!game || paused || game.status !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const index = getHoleIndexFromPoint(clickX, clickY, rect.width, rect.height);
    if (index !== null) {
      hit(index);
    }
  };

  // Keyboard 1..9 handling
  useEffect(() => {
    const numberKeys = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 9) {
        event.preventDefault();
        hit(index);
      }
    };
    window.addEventListener("keydown", numberKeys);
    return () => window.removeEventListener("keydown", numberKeys);
  }, [hit]);

  const analysis = game ? whackAnalysis(game) : null;
  const timeLeft = game ? Math.max(0, Math.ceil((WHACK_DURATION_MS - game.elapsedMs) / 1000)) : 30;

  const share = async () => {
    if (!game || !analysis) return;
    try {
      await navigator.clipboard.writeText(
        `OIYO Whack-a-Mole · ${game.score} · ${analysis.accuracy}% · combo ${analysis.maxCombo}`
      );
    } catch {
      /* best effort */
    }
  };

  return (
    <div className="not-prose my-10 mx-auto max-w-sm select-none rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="text-right text-xs font-bold">
          <p>
            {t.score}: <b className="text-primary">{game?.score ?? 0}</b>
          </p>
          <p className="text-muted-foreground">
            {t.best}: {best}
          </p>
        </div>
      </header>

      {game?.status === "playing" && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <span>
            {t.time} <b className={timeLeft <= 5 ? "text-red-500" : "text-primary"}>{timeLeft}s</b>
          </span>
          <span>
            {t.combo} ×{game.maxCombo}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={togglePause} className="min-h-11 rounded-xl border border-border px-3 font-bold">
              {paused ? `▶ ${t.resume}` : `Ⅱ ${t.pause}`}
            </button>
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-pressed={muted}
              className="min-h-11 rounded-xl border border-border px-3 font-bold"
            >
              {muted ? "🔇" : "🔊"} {t.sound}
            </button>
          </div>
        </div>
      )}

      {(paused || restored) && game?.status === "playing" && (
        <p role="status" className="mb-3 text-center text-xs font-bold text-muted-foreground">
          {restored ? t.restored : t.pause}
        </p>
      )}

      {/* 100% Canvas GPU 120fps Whack Arena */}
      <div
        ref={containerRef}
        className={
          isImmersive
            ? "fixed inset-0 z-50 w-screen h-dvh bg-black m-0 p-0 rounded-none border-none select-none touch-none flex flex-col items-center justify-center overflow-hidden"
            : "relative aspect-square w-full rounded-2xl border border-border overflow-hidden touch-none select-none bg-[#040711] shadow-xl"
        }
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className={isImmersive ? "max-w-[100dvh] max-h-screen aspect-square w-full h-full block cursor-crosshair touch-none" : "w-full h-full block cursor-crosshair touch-none"}
          aria-label={t.title}
        />

        {/* Top Controls: Immersion Portal Toggle */}
        <div className="absolute top-3 right-3 z-10 pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={togglePortal}
            aria-pressed={isImmersive}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex items-center gap-1.5"
          >
            <span className="text-sm">{isImmersive ? "✕" : "⛶"}</span>
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>

        {(!game || game.status === "over") && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/90 px-5 text-center backdrop-blur-sm"
            role={game ? "status" : undefined}
            aria-live="polite"
          >
            {!game ? (
              <>
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-primary/20">
                  <span className="text-3xl">⚡</span>
                </div>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{t.controls}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-primary">
                  {game.score > 0 && game.score >= best ? t.newBest : t.over}
                </p>
                <p className="text-2xl font-black">
                  {game.score} {t.score}
                </p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {t.hits} <b>{analysis?.hits}</b>
                  </span>
                  <span>
                    {t.accuracy} <b>{analysis?.accuracy}%</b>
                  </span>
                  <span>
                    {t.bombs} <b>{analysis?.bombs}</b>
                  </span>
                  <span>
                    {t.combo} <b>×{analysis?.maxCombo}</b>
                  </span>
                  <span>
                    {t.escaped} <b>{analysis?.escaped}</b>
                  </span>
                  <span>
                    {t.next} <b>{Math.max(best + 1, game.score + 1)}</b>
                  </span>
                </div>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => start()}
                className="min-h-11 rounded-full bg-primary px-7 font-black text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
              >
                {game ? t.again : t.start}
              </button>
              {game && (
                <button
                  type="button"
                  onClick={() => start(game.seed)}
                  className="min-h-11 rounded-full border border-border px-5 text-sm font-bold shadow-xs hover:bg-muted transition-colors"
                >
                  {locale === "ko"
                    ? "같은 판"
                    : locale === "ja"
                    ? "同じ盤"
                    : locale === "zh"
                    ? "同一局"
                    : locale === "fr"
                    ? "Même manche"
                    : locale === "es"
                    ? "Misma ronda"
                    : "Same round"}
                </button>
              )}
              {game && (
                <button
                  type="button"
                  onClick={share}
                  className="min-h-11 rounded-full border border-border px-5 text-sm font-bold shadow-xs hover:bg-muted transition-colors"
                >
                  {t.share}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {game ? `${t.score} ${game.score}, ${t.time} ${timeLeft}` : ""}
      </p>
    </div>
  );
};

export default WhackAMole;
