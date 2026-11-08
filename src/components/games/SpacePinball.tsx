import React, { useState, useEffect, useRef, useCallback } from 'react';
import SpacePinballScene from './SpacePinballScene';
import {
  type PinballGameState,
  createInitialPinballState,
  launchBall,
  setFlipperState,
  updatePinballPhysics,
  nudgeTable,
} from '../../lib/games/space-pinball';
import type { Locale } from '../../lib/i18n';
import { Play, RotateCcw, Trophy, CircleDot, Zap, Maximize2, Minimize2, Volume2, VolumeX, Share2, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import { getSpriteUrl, SPACE_PINBALL_UI_SPRITES } from '../../lib/games/sprites';
import { celebrate } from '../../lib/games/celebration';
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from '../../lib/games/share-card';
import { HitStopController } from '../../lib/games/game-juice';
import { loadHighScore, saveHighScore } from '../../lib/games/game-save';

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
  multiplier: string;
  combo: string;
  leftFlipper: string;
  rightFlipper: string;
  nudgeLeft: string;
  nudgeRight: string;
  tiltWarning: string;
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
    multiplier: "배율",
    combo: "콤보",
    leftFlipper: "왼쪽 플리퍼 (A / ←)",
    rightFlipper: "오른쪽 플리퍼 (D / →)",
    nudgeLeft: "테이블 툭치기 (Z)",
    nudgeRight: "테이블 툭치기 (/)",
    tiltWarning: "경고: 틸트 주의!",
    gameOver: "게임 종료",
    finalScore: "최종 획득 점수",
    instructions: "스페이스바로 볼을 쏘아 올리고, A / D 키나 화면 양쪽 터치로 플리퍼를 쳐서 범퍼와 슬링샷을 타격하세요! 상단 S-P-A 레인을 모두 밝히면 잭팟 배율이 상승합니다.",
  },
  en: {
    title: "Space Pinball 3D",
    subtitle: "Three.js physics-driven neon arcade pinball machine",
    launch: "Launch Ball (Space)",
    restart: "Play Again",
    score: "Score",
    highScore: "High Score",
    balls: "Balls Left",
    multiplier: "Multiplier",
    combo: "Combo",
    leftFlipper: "Left Flipper (A / ←)",
    rightFlipper: "Right Flipper (D / →)",
    nudgeLeft: "Nudge Left (Z)",
    nudgeRight: "Nudge Right (/)",
    tiltWarning: "WARNING: TILT DANGER!",
    gameOver: "Game Over",
    finalScore: "Final Score",
    instructions: "Launch with Spacebar, use A/D or touch sides to trigger flippers and hit bumpers & slingshots! Light up all S-P-A lanes for Jackpot Multipliers.",
  },
  ja: {
    title: "スペースピンボール 3D",
    subtitle: "Three.js 物理演算 ネオン宇宙ピンボール",
    launch: "ボール発射 (Space)",
    restart: "もう一度プレイ",
    score: "スコア",
    highScore: "ハイスコア",
    balls: "残機",
    multiplier: "倍率",
    combo: "コンボ",
    leftFlipper: "左フリッパー (A / ←)",
    rightFlipper: "右フリッパー (D / →)",
    nudgeLeft: "左ナッジ (Z)",
    nudgeRight: "右ナッジ (/)",
    tiltWarning: "警告: ティルト注意！",
    gameOver: "ゲームオーバー",
    finalScore: "最終スコア",
    instructions: "スペースでボールを発射し、A/Dキーや画面タッチでフ리ッパーを操作してバンパーを狙いましょう！S-P-Aレーン全点灯でジャックポット！",
  },
  zh: {
    title: "太空弹珠台 3D",
    subtitle: "Three.js 物理驱动 霓虹太空弹球街机",
    launch: "发射弹球 (空格)",
    restart: "再玩一次",
    score: "得分",
    highScore: "最高分",
    balls: "剩余弹球",
    multiplier: "倍率",
    combo: "连击",
    leftFlipper: "左挡板 (A / ←)",
    rightFlipper: "右挡板 (D / →)",
    nudgeLeft: "左推台 (Z)",
    nudgeRight: "右推台 (/)",
    tiltWarning: "警告：防倾倒！",
    gameOver: "游戏结束",
    finalScore: "最终得分",
    instructions: "按空格键发射弹球，使用 A/D 键或轻触屏幕两侧操作挡板击打缓冲器与弹弓！点亮全部 S-P-A 轨道赢取大奖乘数。",
  },
  fr: {
    title: "Flipper Spatial 3D",
    subtitle: "Flipper d'arcade spatial 3D propulsé par Three.js",
    launch: "Lancer la bille (Espace)",
    restart: "Rejouer",
    score: "Score",
    highScore: "Meilleur Score",
    balls: "Billes",
    multiplier: "Multiplicateur",
    combo: "Combo",
    leftFlipper: "Batte Gauche (A / ←)",
    rightFlipper: "Batte Droite (D / →)",
    nudgeLeft: "Secouer Gauche (Z)",
    nudgeRight: "Secouer Droite (/)",
    tiltWarning: "ATTENTION : TILT !",
    gameOver: "Partie Terminée",
    finalScore: "Score Final",
    instructions: "Lancez la bille avec Espace et actionnez les batteurs avec A/D ! Allumez les couloirs S-P-A pour décrocher le Jackpot Multiplicateur.",
  },
  es: {
    title: "Pinball Espacial 3D",
    subtitle: "Máquina de pinball espacial 3D con físicas Three.js",
    launch: "Lanzar Bola (Espacio)",
    restart: "Jugar de nuevo",
    score: "Puntuación",
    highScore: "Récord",
    balls: "Bolas",
    multiplier: "Multiplicador",
    combo: "Combo",
    leftFlipper: "Paleta Izquierda (A / ←)",
    rightFlipper: "Paleta Derecha (D / →)",
    nudgeLeft: "Empuje Izq (Z)",
    nudgeRight: "Empuje Der (/)",
    tiltWarning: "¡CUIDADO: TILT!",
    gameOver: "Fin de la Partida",
    finalScore: "Puntuación Final",
    instructions: "¡Lanza la bola con Espacio y usa A/D para accionar las paletas! Enciende todos los carriles S-P-A para activar el Jackpot.",
  },
};

function TiltPinballButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { transformCss, onPointerMove, onPointerLeave } = useCardTiltPro();
  return (
    <button
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transform-(--card-tilt) will-change-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function SpacePinball({ locale }: Props) {
  const [gameState, setGameState] = useState<PinballGameState>(() =>
    createInitialPinballState(loadHighScore('space-pinball', 0))
  );
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('space_pinball_muted') === 'true';
    } catch {
      return false;
    }
  });

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const hitStopRef = useRef(new HitStopController());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const t = UI_TEXT[locale] ?? UI_TEXT.en;

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "Space Pinball 3D",
      subtitle: "Neon Space Arcade Pinball",
      score: `${gameState.score.toLocaleString()} PTS`,
      slug: "space-pinball",
      customStats: [
        { label: "High Score", value: `${gameState.highScore.toLocaleString()}` },
        { label: "Multiplier", value: `x${gameState.multiplier}` },
        { label: "Best Combo", value: `x${gameState.combo}` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `space-pinball-${gameState.score}.png`);
    }
  }, [gameState.score, gameState.highScore, gameState.multiplier, gameState.combo]);

  const playSound = useCallback((
    type: 'flipper' | 'bumper' | 'slingshot' | 'lane' | 'jackpot' | 'launch' | 'tilt' | 'gameover',
    combo = 1
  ) => {
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
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'bumper') {
        const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
        const pitch = scale[Math.min(combo - 1, scale.length - 1)];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.4, now + 0.12);
        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'slingshot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'lane') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'jackpot') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.07);
          g.gain.setValueAtTime(0.22, now + idx * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.22);
        });
      } else if (type === 'launch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.24);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'tilt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
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
    MobileHapticsPro.heavy();
    setGameState((prev) => launchBall(prev, 1));
  }, [playSound]);

  // Handle flipper action
  const handleFlipper = useCallback((side: "left" | "right", isPressed: boolean) => {
    if (isPressed) {
      playSound('flipper');
      MobileHapticsPro.light();
    }
    setGameState((prev) => setFlipperState(prev, side, isPressed));
  }, [playSound]);

  // Handle table nudge
  const handleNudge = useCallback((dir: "left" | "right") => {
    MobileHapticsPro.medium();
    setGameState((prev) => nudgeTable(prev, dir));
  }, []);

  // Handle restart
  const handleRestart = useCallback(() => {
    playSound('launch');
    MobileHapticsPro.medium();
    setGameState((prev) => createInitialPinballState(prev.highScore));
  }, [playSound]);

  // Game update loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const { isFrozen } = hitStopRef.current.update(dt);
      if (isFrozen) return;

      if (stateRef.current.status === "playing" && stateRef.current.ball.active) {
        setGameState((prev) => {
          const next = updatePinballPhysics(prev, dt);

          if (next.lastEvent === "bumper") {
            playSound('bumper', next.combo);
            MobileHapticsPro.medium();
          } else if (next.lastEvent === "slingshot") {
            playSound('slingshot');
            MobileHapticsPro.heavy();
            hitStopRef.current.trigger(0.04);
          } else if (next.lastEvent === "lane") {
            playSound('lane');
            MobileHapticsPro.light();
          } else if (next.lastEvent === "jackpot") {
            playSound('jackpot');
            MobileHapticsPro.success();
            hitStopRef.current.trigger(0.08);
            if (containerRef.current) celebrate(containerRef.current, { preset: "stardust" });
          } else if (next.lastEvent === "tilt") {
            playSound('tilt');
            MobileHapticsPro.error();
          }

          if (next.score > next.highScore) {
            saveHighScore('space-pinball', next.score);
          }

          if (next.status === "gameover" && prev.status !== "gameover") {
            playSound('gameover');
            MobileHapticsPro.error();
            saveHighScore('space-pinball', next.score);
            if (containerRef.current) celebrate(containerRef.current, { preset: "sparks" });
          }
          return next;
        });
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playSound, containerRef]);

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
      } else if (e.code === "KeyZ") {
        e.preventDefault();
        handleNudge("left");
      } else if (e.code === "Slash" || e.code === "KeyC") {
        e.preventDefault();
        handleNudge("right");
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
  }, [handleLaunch, handleFlipper, handleNudge, handleRestart, toggleMute, togglePortal]);

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
        <div className="flex-1 grid grid-cols-4 gap-1.5 sm:gap-3">
          {/* Score & Combo */}
          <div className="bg-card border border-border rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            <span className="text-xs text-muted-foreground">{t.score}</span>
            <span className="text-base sm:text-2xl font-black text-primary font-mono tracking-tight">
              {gameState.score.toLocaleString()}
            </span>
            {gameState.combo > 1 && (
              <span className="absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold animate-pulse">
                x{gameState.combo}
              </span>
            )}
          </div>

          {/* Multiplier */}
          <div className="bg-card border border-border rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-xs text-muted-foreground">{t.multiplier}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className={`w-3.5 h-3.5 ${gameState.multiplier > 1 ? "text-warning fill-warning animate-bounce" : "text-muted-foreground"}`} />
              <span className={`text-base sm:text-2xl font-black font-mono ${gameState.multiplier > 1 ? "text-warning" : "text-foreground"}`}>
                x{gameState.multiplier}
              </span>
            </div>
          </div>

          {/* Balls */}
          <div className="bg-card border border-border rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center shadow-sm">
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

          {/* High Score */}
          <div className="bg-card border border-border rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span className="hidden sm:inline">{t.highScore}</span>
            </div>
            <span className="text-base sm:text-2xl font-black text-warning font-mono">
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

      {/* 3D Viewport with Overlays */}
      <div className={`relative w-full rounded-2xl overflow-hidden border border-border bg-background shadow-2xl ${
        isImmersive ? 'flex-1 min-h-0' : 'aspect-video'
      }`}>
        <SpacePinballScene gameState={gameState} />

        {/* Tilt Warning Banner */}
        {gameState.isTilted && (
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-black text-sm uppercase tracking-wider animate-bounce shadow-xl">
              <AlertTriangle className="w-4 h-4" />
              <span>{t.tiltWarning}</span>
            </div>
          </div>
        )}

        {/* Overlay for Idle / Game Over */}
        {gameState.status === "idle" && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img
                src={SPACE_PINBALL_UI_SPRITES.bumper}
                alt="Pinball Bumper"
                width={36}
                height={36}
                className="drop-shadow-sm opacity-90"
              />
              <img
                src={SPACE_PINBALL_UI_SPRITES.chromeBall}
                alt="Chrome Pinball"
                width={48}
                height={48}
                className="drop-shadow-xl animate-pulse"
              />
              <img
                src={SPACE_PINBALL_UI_SPRITES.flipper}
                alt="Neon Flipper"
                width={36}
                height={36}
                className="drop-shadow-sm opacity-90"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
              {t.title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {t.instructions}
            </p>
            <TiltPinballButton
              type="button"
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t.launch}</span>
            </TiltPinballButton>
          </div>
        )}

        {gameState.status === "gameover" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src={SPACE_PINBALL_UI_SPRITES.flipper}
                alt="Neon Flipper"
                width={38}
                height={38}
                className="drop-shadow-sm opacity-90"
              />
              <div className="relative flex size-20 items-center justify-center rounded-3xl bg-primary/20 p-2 border border-primary/40 shadow-xl">
                <img
                  src={SPACE_PINBALL_UI_SPRITES.trophy}
                  alt="Pinball Wizard Trophy"
                  className="size-14 object-contain animate-bounce"
                  loading="lazy"
                />
              </div>
              <img
                src={SPACE_PINBALL_UI_SPRITES.chromeBall}
                alt="Chrome Ball"
                width={38}
                height={38}
                className="drop-shadow-sm opacity-90"
              />
            </div>
            <h2 className="text-3xl font-black text-destructive mb-1">{t.gameOver}</h2>
            <p className="text-sm text-muted-foreground mb-2">{t.finalScore}</p>
            <span className="text-4xl font-black text-foreground font-mono mb-6">
              {gameState.score.toLocaleString()}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <TiltPinballButton
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{t.restart}</span>
              </TiltPinballButton>
              <TiltPinballButton
                type="button"
                onClick={handleShareCard}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/50 bg-primary/20 text-primary font-bold text-sm shadow-md hover:bg-primary/30 active:scale-95 transition-all"
                title={shareCardCopied ? "복사됨!" : "결과 카드 공유"}
              >
                {shareCardCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{shareCardCopied ? "복사 완료" : "결과 카드 공유"}</span>
              </TiltPinballButton>
            </div>
          </div>
        )}

        {/* Mobile touch trigger buttons (Flippers & Nudges) */}
        <div className="absolute inset-x-0 bottom-0 h-32 flex pointer-events-auto sm:hidden">
          {/* Nudge Left */}
          <button
            type="button"
            onClick={() => handleNudge("left")}
            className="w-14 bg-muted/40 active:bg-muted/70 border-r border-border/40 flex items-center justify-center text-xs font-bold text-muted-foreground"
            aria-label="Nudge Left"
          >
            NUDGE
          </button>

          {/* Left Flipper */}
          <button
            type="button"
            onTouchStart={() => handleFlipper("left", true)}
            onTouchEnd={() => handleFlipper("left", false)}
            onMouseDown={() => handleFlipper("left", true)}
            onMouseUp={() => handleFlipper("left", false)}
            className="flex-1 bg-primary/10 active:bg-primary/30 border-r border-border/40 flex items-center justify-center text-sm font-black text-primary"
          >
            ◀ LEFT
          </button>

          {/* Right Flipper */}
          <button
            type="button"
            onTouchStart={() => handleFlipper("right", true)}
            onTouchEnd={() => handleFlipper("right", false)}
            onMouseDown={() => handleFlipper("right", true)}
            onMouseUp={() => handleFlipper("right", false)}
            className="flex-1 bg-primary/10 active:bg-primary/30 border-r border-border/40 flex items-center justify-center text-sm font-black text-primary"
          >
            RIGHT ▶
          </button>

          {/* Nudge Right */}
          <button
            type="button"
            onClick={() => handleNudge("right")}
            className="w-14 bg-muted/40 active:bg-muted/70 flex items-center justify-center text-xs font-bold text-muted-foreground"
            aria-label="Nudge Right"
          >
            NUDGE
          </button>
        </div>
      </div>

      {/* Desktop Controls Hint */}
      <div className="w-full mt-3 flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>A / ← : {t.leftFlipper} · Z: {t.nudgeLeft}</span>
        <span className="font-semibold text-foreground">Space / Enter: {t.launch}</span>
        <span>D / → : {t.rightFlipper} · / : {t.nudgeRight}</span>
      </div>
    </div>
  );
}
