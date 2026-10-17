import React, { useState, useEffect, useRef, useCallback } from 'react';
import SpacePinballScene from './SpacePinballScene';
import {
  type PinballGameState,
  createInitialPinballState,
  launchBall,
  setFlipperState,
  updatePinballPhysics,
} from '../../lib/games/space-pinball';
import type { Locale } from '../../lib/i18n';
import { Play, RotateCcw, Trophy, CircleDot, Zap, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';

interface Props {
  locale: Locale;
}

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  launch: string;
  restart: string;
  score: string;
  highScore: string;
  balls: string;
  leftFlipper: string;
  rightFlipper: string;
  gameOver: string;
  finalScore: string;
  instructions: string;
}> = {
  ko: {
    title: "스페이스 핀볼 3D",
    subtitle: "Three.js 물리 기반 네온 우주 핀볼 아케이드",
    launch: "볼 발사 (Space)",
    restart: "다시 시작",
    score: "점수",
    highScore: "최고 점수",
    balls: "남은 볼",
    leftFlipper: "왼쪽 플리퍼 (A / ←)",
    rightFlipper: "오른쪽 플리퍼 (D / →)",
    gameOver: "게임 종료",
    finalScore: "최종 획득 점수",
    instructions: "스페이스바로 볼을 쏘아 올리고, A / D 키나 화면 양쪽 터치로 플리퍼를 쳐서 범퍼를 타격하세요!",
  },
  en: {
    title: "Space Pinball 3D",
    subtitle: "Three.js physics-driven neon arcade pinball machine",
    launch: "Launch Ball (Space)",
    restart: "Play Again",
    score: "Score",
    highScore: "High Score",
    balls: "Balls Left",
    leftFlipper: "Left Flipper (A / ←)",
    rightFlipper: "Right Flipper (D / →)",
    gameOver: "Game Over",
    finalScore: "Final Score",
    instructions: "Launch with Spacebar, use A/D or touch sides to trigger flippers and hit bumpers for high scores!",
  },
  ja: {
    title: "スペースピンボール 3D",
    subtitle: "Three.js 物理演算 ネオン宇宙ピンボール",
    launch: "ボール発射 (Space)",
    restart: "もう一度プレイ",
    score: "スコア",
    highScore: "ハイスコア",
    balls: "残機",
    leftFlipper: "左フリッパー (A / ←)",
    rightFlipper: "右フリッパー (D / →)",
    gameOver: "ゲームオーバー",
    finalScore: "最終スコア",
    instructions: "スペースでボールを発射し、A/Dキーや画面タッチでフリッパーを操作してハイスコアを目指しましょう！",
  },
  zh: {
    title: "太空弹珠台 3D",
    subtitle: "Three.js 物理驱动 霓虹太空弹球街机",
    launch: "发射弹球 (空格)",
    restart: "再玩一次",
    score: "得分",
    highScore: "最高分",
    balls: "剩余弹球",
    leftFlipper: "左挡板 (A / ←)",
    rightFlipper: "右挡板 (D / →)",
    gameOver: "游戏结束",
    finalScore: "最终得分",
    instructions: "按空格键发射弹球，使用 A/D 键或轻触屏幕两侧操作挡板击打发光缓冲器！",
  },
  fr: {
    title: "Flipper Spatial 3D",
    subtitle: "Flipper d'arcade spatial 3D propulsé par Three.js",
    launch: "Lancer la bille (Espace)",
    restart: "Rejouer",
    score: "Score",
    highScore: "Meilleur Score",
    balls: "Billes",
    leftFlipper: "Batte Gauche (A / ←)",
    rightFlipper: "Batte Droite (D / →)",
    gameOver: "Partie Terminée",
    finalScore: "Score Final",
    instructions: "Lancez la bille avec Espace et actionnez les batteurs avec A/D ou en touchant les côtés !",
  },
  es: {
    title: "Pinball Espacial 3D",
    subtitle: "Máquina de pinball espacial 3D con físicas Three.js",
    launch: "Lanzar Bola (Espacio)",
    restart: "Jugar de nuevo",
    score: "Puntuación",
    highScore: "Récord",
    balls: "Bolas",
    leftFlipper: "Paleta Izquierda (A / ←)",
    rightFlipper: "Paleta Derecha (D / →)",
    gameOver: "Fin de la Partida",
    finalScore: "Puntuación Final",
    instructions: "¡Lanza la bola con Espacio y usa A/D o toques en pantalla para accionar las paletas!",
  },
};

export default function SpacePinball({ locale }: Props) {
  const [gameState, setGameState] = useState<PinballGameState>(() => createInitialPinballState());
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('space_pinball_muted') === 'true';
    } catch {
      return false;
    }
  });

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });

  const t = UI_TEXT[locale] ?? UI_TEXT.en;

  const playSound = useCallback((type: 'flipper' | 'bumper' | 'launch' | 'gameover') => {
    if (muted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'flipper') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'bumper') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'launch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.45);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // AudioContext unavailable
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('space_pinball_muted', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Handle launch
  const handleLaunch = useCallback(() => {
    playSound('launch');
    setGameState((prev) => launchBall(prev, 1));
  }, [playSound]);

  // Handle flipper action
  const handleFlipper = useCallback((side: "left" | "right", isPressed: boolean) => {
    if (isPressed) playSound('flipper');
    setGameState((prev) => setFlipperState(prev, side, isPressed));
  }, [playSound]);

  // Handle restart
  const handleRestart = useCallback(() => {
    playSound('launch');
    setGameState((prev) => createInitialPinballState(prev.highScore));
  }, [playSound]);

  // Game update loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (stateRef.current.status === "playing" && stateRef.current.ball.active) {
        setGameState((prev) => {
          const next = updatePinballPhysics(prev, dt);
          if (next.score > prev.score) {
            playSound('bumper');
          }
          if (next.status === "gameover" && prev.status !== "gameover") {
            playSound('gameover');
          }
          return next;
        });
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playSound]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
      if (e.key === 'f' || e.key === 'F') {
        togglePortal();
      }
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (stateRef.current.status === "idle") {
          handleLaunch();
        } else if (stateRef.current.status === "gameover") {
          handleRestart();
        }
      } else if (e.code === "KeyA" || e.code === "ArrowLeft") {
        e.preventDefault();
        handleFlipper("left", true);
      } else if (e.code === "KeyD" || e.code === "ArrowRight") {
        e.preventDefault();
        handleFlipper("right", true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        handleFlipper("left", false);
      } else if (e.code === "KeyD" || e.code === "ArrowRight") {
        handleFlipper("right", false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleLaunch, handleFlipper, handleRestart, toggleMute, togglePortal]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none ${
        isImmersive
          ? 'fixed inset-0 z-50 bg-background w-screen h-dvh overflow-hidden p-2 sm:p-4 justify-between'
          : 'w-full max-w-4xl mx-auto'
      }`}
    >
      {/* Header HUD */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 mb-3">
        <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">{t.score}</span>
            <span className="text-lg sm:text-2xl font-black text-primary font-mono">
              {gameState.score.toLocaleString()}
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">{t.balls}</span>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3].map((b) => (
                <CircleDot
                  key={b}
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    b <= gameState.ballsLeft ? "text-primary" : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span>{t.highScore}</span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-warning font-mono">
              {gameState.highScore.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-2 sm:p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-sm"
            title="Mute / Unmute (M)"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="p-2 sm:p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-sm"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className={`relative w-full rounded-2xl overflow-hidden border border-border bg-background shadow-2xl ${
        isImmersive ? 'flex-1 min-h-0' : 'aspect-video'
      }`}>
        <SpacePinballScene gameState={gameState} />

        {/* Overlay for Idle / Game Over */}
        {gameState.status === "idle" && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <Zap className="w-12 h-12 text-primary animate-pulse mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
              {t.title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {t.instructions}
            </p>
            <button
              type="button"
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t.launch}</span>
            </button>
          </div>
        )}

        {gameState.status === "gameover" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <h2 className="text-3xl font-black text-destructive mb-2">{t.gameOver}</h2>
            <p className="text-sm text-muted-foreground mb-2">{t.finalScore}</p>
            <span className="text-4xl font-black text-foreground font-mono mb-6">
              {gameState.score.toLocaleString()}
            </span>
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

        {/* Mobile touch trigger buttons */}
        <div className="absolute inset-x-0 bottom-0 h-28 flex pointer-events-auto sm:hidden">
          <button
            type="button"
            onTouchStart={() => handleFlipper("left", true)}
            onTouchEnd={() => handleFlipper("left", false)}
            onMouseDown={() => handleFlipper("left", true)}
            onMouseUp={() => handleFlipper("left", false)}
            className="flex-1 bg-primary/10 active:bg-primary/30 border-r border-border/40 flex items-center justify-center text-xs font-bold text-primary"
          >
            ◀ LEFT
          </button>
          <button
            type="button"
            onTouchStart={() => handleFlipper("right", true)}
            onTouchEnd={() => handleFlipper("right", false)}
            onMouseDown={() => handleFlipper("right", true)}
            onMouseUp={() => handleFlipper("right", false)}
            className="flex-1 bg-primary/10 active:bg-primary/30 flex items-center justify-center text-xs font-bold text-primary"
          >
            RIGHT ▶
          </button>
        </div>
      </div>

      {/* Desktop Controls Hint */}
      <div className="w-full mt-4 flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>{t.leftFlipper}</span>
        <span>Space: {t.launch}</span>
        <span>{t.rightFlipper}</span>
      </div>
    </div>
  );
}
