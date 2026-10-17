import { useState, useEffect, useRef, useCallback } from 'react';
import MiniGolfScene from './MiniGolfScene';
import {
  type MiniGolfState,
  createInitialGolfState,
  executePutt,
  setAim,
  updateGolfPhysics,
  advanceToNextHole,
  COURSES,
} from '../../lib/games/mini-golf';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import type { Locale } from '../../lib/i18n';
import {
  Play,
  RotateCcw,
  Flag,
  Trophy,
  ArrowRight,
  RotateCw,
  RotateCcw as RotateCounter,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Props {
  locale: Locale;
}

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  hole: string;
  par: string;
  strokes: string;
  totalScore: string;
  power: string;
  putt: string;
  nextHole: string;
  restart: string;
  holedTitle: string;
  holedSubtitle: string;
  finishedTitle: string;
  finalScore: string;
  aimLeft: string;
  aimRight: string;
  instructions: string;
}> = {
  ko: {
    title: "복셀 미니 골프 3D",
    subtitle: "Three.js 물리 기반 3D 입체 미니 골프 코스",
    hole: "홀",
    par: "기준 타수 (Par)",
    strokes: "현재 타수",
    totalScore: "총 타수",
    power: "퍼팅 파워",
    putt: "퍼팅 (Space)",
    nextHole: "다음 홀로",
    restart: "다시 도전",
    holedTitle: "홀인 성공!",
    holedSubtitle: "축하합니다! 공이 홀컵에 안착했습니다.",
    finishedTitle: "코스 완주 성공!",
    finalScore: "최종 성적표",
    aimLeft: "좌 조준 (←/A)",
    aimRight: "우 조준 (→/D)",
    instructions: "화면을 드래그하거나 방향키(A/D)로 조준하고, 파워를 조절한 뒤 퍼팅하여 홀컵에 넣으세요!",
  },
  en: {
    title: "Voxel Mini Golf 3D",
    subtitle: "Three.js physics-driven 3D voxel mini golf course",
    hole: "Hole",
    par: "Par",
    strokes: "Strokes",
    totalScore: "Total Strokes",
    power: "Putt Power",
    putt: "Putt (Space)",
    nextHole: "Next Hole",
    restart: "Play Again",
    holedTitle: "Hole In!",
    holedSubtitle: "Congratulations! The ball dropped into the cup.",
    finishedTitle: "Course Completed!",
    finalScore: "Final Scorecard",
    aimLeft: "Aim Left (←/A)",
    aimRight: "Aim Right (→/D)",
    instructions: "Drag to aim or use arrows (A/D), adjust power, and putt to sink the ball!",
  },
  ja: {
    title: "ボクセル ミニゴルフ 3D",
    subtitle: "Three.js 物理演算 3D立体ミニゴルフ",
    hole: "ホール",
    par: "規定打数 (Par)",
    strokes: "現在の打数",
    totalScore: "トータル打数",
    power: "パットパワー",
    putt: "パット (Space)",
    nextHole: "次のホールへ",
    restart: "もう一度プレイ",
    holedTitle: "カップイン！",
    holedSubtitle: "おめでとうございます！ボールがホールに入りました。",
    finishedTitle: "全ホール完走！",
    finalScore: "最終スコアカード",
    aimLeft: "左狙い (←/A)",
    aimRight: "右狙い (→/D)",
    instructions: "画面ドラッグや方向キー(A/D)で狙いを定め、パワーを調整してカップインを目指そう！",
  },
  zh: {
    title: "体素迷你高尔夫 3D",
    subtitle: "Three.js 物理驱动 3D 立体迷你高尔夫球场",
    hole: "球洞",
    par: "标准杆 (Par)",
    strokes: "当前击球数",
    totalScore: "总杆数",
    power: "推杆力度",
    putt: "推杆 (空格)",
    nextHole: "下一洞",
    restart: "重新开始",
    holedTitle: "进洞成功！",
    holedSubtitle: "恭喜！高尔夫球完美落入球洞。",
    finishedTitle: "全程完赛！",
    finalScore: "最终计分卡",
    aimLeft: "向左瞄准 (←/A)",
    aimRight: "向右瞄准 (→/D)",
    instructions: "拖拽屏幕或使用方向键(A/D)调整角度，设定力度后推球进洞！",
  },
  fr: {
    title: "Mini-Golf Voxel 3D",
    subtitle: "Parcours de mini-golf 3D propulsé par Three.js",
    hole: "Trou",
    par: "Par",
    strokes: "Coups",
    totalScore: "Total Coups",
    power: "Puissance",
    putt: "Putter (Espace)",
    nextHole: "Trou Suivant",
    restart: "Rejouer",
    holedTitle: "Balle dans le trou !",
    holedSubtitle: "Félicitations ! La balle est tombée dans la coupe.",
    finishedTitle: "Parcours Terminé !",
    finalScore: "Carte de Score Finale",
    aimLeft: "Viser Gauche (←/A)",
    aimRight: "Viser Droite (→/D)",
    instructions: "Glissez ou utilisez les touches (A/D) pour viser, réglez la force et puttez !",
  },
  es: {
    title: "Mini Golf Vóxel 3D",
    subtitle: "Campo de minigolf en 3D con físicas Three.js",
    hole: "Hoyo",
    par: "Par",
    strokes: "Golpes",
    totalScore: "Golpes Totales",
    power: "Potencia",
    putt: "Golpear (Espacio)",
    nextHole: "Siguiente Hoyo",
    restart: "Volver a jugar",
    holedTitle: "¡Bola Embocada!",
    holedSubtitle: "¡Enhorabuena! La bola ha entrado en el hoyo.",
    finishedTitle: "¡Recorrido Completado!",
    finalScore: "Tarjeta de Puntuación",
    aimLeft: "Apuntar Izquierda (←/A)",
    aimRight: "Apuntar Derecha (→/D)",
    instructions: "Arrastra o usa flechas (A/D) para apuntar, ajusta la potencia y golpea al hoyo.",
  },
};

export default function MiniGolf({ locale }: Props) {
  const [gameState, setGameState] = useState<MiniGolfState>(() => createInitialGolfState(0));
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const audioCtxRef = useRef<AudioContext | null>(null);

  const t = UI_TEXT[locale] ?? UI_TEXT.en;
  const currentHole = COURSES[gameState.currentHoleIndex] ?? COURSES[0];

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playPuttSound = useCallback(
    (power: number) => {
      if (isMutedRef.current) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const time = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140 + power * 120, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
        gain.gain.setValueAtTime(0.35 + power * 0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.15);
      } catch {
        // Audio optional
      }
    },
    [getAudioContext]
  );

  const playBounceSound = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const time = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.09);
    } catch {
      // Audio optional
    }
  }, [getAudioContext]);

  const playWaterSplashSound = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const time = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.2);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(700, time);
      filter.frequency.exponentialRampToValueAtTime(280, time + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(time);
    } catch {
      // Audio optional
    }
  }, [getAudioContext]);

  const playHoleInSound = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const time = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch {
      // Audio optional
    }
  }, [getAudioContext]);

  const playVictorySound = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const fanfare = [
        { f: 523.25, d: 0.15 },
        { f: 659.25, d: 0.15 },
        { f: 783.99, d: 0.15 },
        { f: 1046.5, d: 0.4 },
      ];
      let offset = 0;
      fanfare.forEach((n) => {
        const time = ctx.currentTime + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(n.f, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + n.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + n.d);
        offset += n.d * 0.85;
      });
    } catch {
      // Audio optional
    }
  }, [getAudioContext]);

  // Hook for Arcade Immersion Portal
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale,
    onEnter: () => {
      void getAudioContext();
    },
  });

  // Actions
  const handlePutt = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === "aiming") {
        playPuttSound(prev.aimPower);
        return executePutt(prev);
      }
      return prev;
    });
  }, [playPuttSound]);

  const handleNextHole = useCallback(() => {
    setGameState((prev) => advanceToNextHole(prev));
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(createInitialGolfState(0));
  }, []);

  const rotateAim = useCallback((deltaAngle: number) => {
    setGameState((prev) => setAim(prev, prev.aimAngle + deltaAngle));
  }, []);

  const changePower = useCallback((newPower: number) => {
    setGameState((prev) => setAim(prev, prev.aimAngle, newPower));
  }, []);

  // Game update loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (stateRef.current.status === "rolling") {
        setGameState((prev) => {
          const next = updateGolfPhysics(prev, dt);
          if (next.lastEvent === "wall_hit") {
            playBounceSound();
          } else if (next.lastEvent === "water_hazard") {
            playWaterSplashSound();
          }
          if (prev.status === "rolling" && next.status === "holed") {
            playHoleInSound();
          } else if (prev.status === "rolling" && next.status === "finished") {
            playVictorySound();
          }
          return next;
        });
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playBounceSound, playHoleInSound, playVictorySound, playWaterSplashSound]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (stateRef.current.status === "aiming") {
          handlePutt();
        } else if (stateRef.current.status === "holed") {
          handleNextHole();
        } else if (stateRef.current.status === "finished") {
          handleRestart();
        }
      } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        rotateAim(-0.06);
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        rotateAim(0.06);
      } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        setGameState((prev) => setAim(prev, prev.aimAngle, Math.min(1.0, prev.aimPower + 0.05)));
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setGameState((prev) => setAim(prev, prev.aimAngle, Math.max(0.1, prev.aimPower - 0.05)));
      } else if (e.code === "KeyF") {
        e.preventDefault();
        void togglePortal();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setIsMuted((m) => !m);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePutt, handleNextHole, handleRestart, rotateAim, togglePortal]);

  return (
    <div
      ref={containerRef}
      className={
        isImmersive
          ? "fixed inset-0 z-50 bg-background flex flex-col items-center justify-between p-3 sm:p-4 overflow-hidden select-none"
          : "w-full max-w-4xl mx-auto flex flex-col items-center select-none"
      }
    >
      {/* Top Bar with Portal / Immersion & Sound controls */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-foreground">⛳ {t.title}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            · {currentHole.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
            aria-label={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Header HUD */}
      <div className="w-full grid grid-cols-4 gap-2 sm:gap-4 mb-3">
        <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.hole}</span>
          <span className="text-base sm:text-xl font-black text-foreground">
            {currentHole.id} / {COURSES.length}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.par}</span>
          <span className="text-base sm:text-xl font-bold text-muted-foreground">
            Par {currentHole.par}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.strokes}</span>
          <span className="text-base sm:text-xl font-black text-primary font-mono">
            {gameState.strokesThisHole}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.totalScore}</span>
          <span className="text-base sm:text-xl font-black text-warning font-mono">
            {gameState.totalStrokes}
          </span>
        </div>
      </div>

      {/* 3D Viewport */}
      <div
        className={
          isImmersive
            ? "relative w-full flex-1 rounded-2xl overflow-hidden border border-border bg-background shadow-2xl min-h-0"
            : "relative w-full aspect-video rounded-2xl overflow-hidden border border-border bg-background shadow-2xl"
        }
      >
        <MiniGolfScene gameState={gameState} onAimDelta={rotateAim} />

        {/* Modal: Hole In */}
        {gameState.status === "holed" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <Flag className="w-12 h-12 text-primary animate-bounce mb-2" />
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1">{t.holedTitle}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t.holedSubtitle}</p>
            <div className="bg-card border border-border rounded-xl p-4 mb-6 text-center min-w-48">
              <span className="text-xs text-muted-foreground block mb-1">{currentHole.name}</span>
              <span className="text-2xl font-black text-primary font-mono">
                {gameState.strokesThisHole} {t.strokes} (Par {currentHole.par})
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextHole}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              <span>{t.nextHole}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal: Course Finished */}
        {gameState.status === "finished" && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <Trophy className="w-14 h-14 text-warning mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1">
              {t.finishedTitle}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{t.finalScore}</p>
            <div className="bg-card border border-border rounded-xl p-4 mb-6 min-w-60">
              <div className="flex justify-between items-center text-sm py-1 border-b border-border/40">
                <span className="text-muted-foreground">Total Par:</span>
                <span className="font-bold">{gameState.totalPar}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-muted-foreground">Total Strokes:</span>
                <span className="font-black text-primary text-lg font-mono">
                  {gameState.totalStrokes}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{t.restart}</span>
            </button>
          </div>
        )}
      </div>

      {/* Putting & Aim Controls Panel */}
      <div className="w-full mt-3 bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Aim direction adjustment */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => rotateAim(-0.08)}
            disabled={gameState.status !== "aiming"}
            className="p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground disabled:opacity-40 transition-colors"
            title={t.aimLeft}
            aria-label={t.aimLeft}
          >
            <RotateCounter className="w-5 h-5" />
          </button>
          <span className="text-xs text-muted-foreground px-2 font-medium">
            {t.aimLeft} / {t.aimRight}
          </span>
          <button
            type="button"
            onClick={() => rotateAim(0.08)}
            disabled={gameState.status !== "aiming"}
            className="p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground disabled:opacity-40 transition-colors"
            title={t.aimRight}
            aria-label={t.aimRight}
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Power Slider */}
        <div className="flex-1 w-full max-w-xs flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {t.power}
          </span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={gameState.aimPower}
            onChange={(e) => changePower(parseFloat(e.target.value))}
            disabled={gameState.status !== "aiming"}
            className="w-full accent-primary disabled:opacity-40 cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-primary w-10 text-right">
            {Math.round(gameState.aimPower * 100)}%
          </span>
        </div>

        {/* Putt Button */}
        <button
          type="button"
          onClick={handlePutt}
          disabled={gameState.status !== "aiming"}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{t.putt}</span>
        </button>
      </div>
    </div>
  );
}
