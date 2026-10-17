import React, { useState, useEffect, useRef, useCallback } from 'react';
import BlockBreakerScene from './BlockBreakerScene';
import {
  type BlockBreakerState,
  createInitialBlockBreakerState,
  launchBall,
  movePaddle,
  fireLasers,
  updateBlockBreaker,
  nextLevel,
  PLAY_WIDTH,
} from '../../lib/games/block-breaker';
import type { Locale } from '../../lib/i18n';
import {
  Play,
  RotateCcw,
  Trophy,
  Heart,
  ArrowLeft,
  ArrowRight,
  Zap,
  Target,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';

interface Props {
  locale: Locale;
}

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  launch: string;
  restart: string;
  nextLevel: string;
  score: string;
  highScore: string;
  lives: string;
  level: string;
  combo: string;
  fire: string;
  gameOver: string;
  stageClear: string;
  instructions: string;
}> = {
  ko: {
    title: "블록 브레이커 3D",
    subtitle: "Three.js 3D 복셀 벽돌깨기 아케이드",
    launch: "볼 발사 (Space)",
    restart: "다시 시작",
    nextLevel: "다음 스테이지",
    score: "점수",
    highScore: "최고 점수",
    lives: "생명",
    level: "스테이지",
    combo: "연속 콤보",
    fire: "레이저 발사 (F / 발사)",
    gameOver: "게임 종료",
    stageClear: "스테이지 클리어!",
    instructions: "좌우 화살표나 마우스/터치로 패들을 움직여 볼을 튕겨내고 모든 복셀 블록을 파괴하세요!",
  },
  en: {
    title: "Block Breaker 3D",
    subtitle: "Three.js 3D Voxel Brick Breaker Arcade",
    launch: "Launch Ball (Space)",
    restart: "Play Again",
    nextLevel: "Next Stage",
    score: "Score",
    highScore: "High Score",
    lives: "Lives",
    level: "Stage",
    combo: "Combo",
    fire: "Fire Laser (F / Fire)",
    gameOver: "Game Over",
    stageClear: "Stage Cleared!",
    instructions: "Move paddle with Arrow keys or mouse/touch, bounce the ball, and demolish all voxel bricks!",
  },
  ja: {
    title: "ブロックブレイカー 3D",
    subtitle: "Three.js 3Dボクセルブロック崩しアーケード",
    launch: "ボール発射 (Space)",
    restart: "もう一度プレイ",
    nextLevel: "次のステージ",
    score: "スコア",
    highScore: "ハイスコア",
    lives: "ライフ",
    level: "ステージ",
    combo: "コンボ",
    fire: "レーザー発射 (F)",
    gameOver: "ゲームオーバー",
    stageClear: "ステージクリア！",
    instructions: "左右キーまたはマウス・タッチでパドルを操作し、ボールを打ち返して全ブロックを破壊しよう！",
  },
  zh: {
    title: "3D 打砖块街机",
    subtitle: "基于 Three.js 的 3D 体素弹球打砖块",
    launch: "发球 (空格键)",
    restart: "重新开始",
    nextLevel: "进入下一关",
    score: "得分",
    highScore: "最高分",
    lives: "生命",
    level: "关卡",
    combo: "连击",
    fire: "发射激光 (F 键)",
    gameOver: "游戏结束",
    stageClear: "关卡突破成功！",
    instructions: "使用左右方向键或鼠标/触控拖动挡板反弹小球，击碎所有立体体素方块！",
  },
  fr: {
    title: "Casse-Briques 3D",
    subtitle: "Jeu d'arcade voxel 3D propulsé par Three.js",
    launch: "Lancer la balle (Espace)",
    restart: "Rejouer",
    nextLevel: "Niveau suivant",
    score: "Score",
    highScore: "Meilleur score",
    lives: "Vies",
    level: "Niveau",
    combo: "Combo",
    fire: "Tir laser (F)",
    gameOver: "Partie terminée",
    stageClear: "Niveau réussi !",
    instructions: "Déplacez la raquette avec les flèches ou au toucher, renvoyez la balle et détruisez toutes les briques !",
  },
  es: {
    title: "Rompebloques 3D",
    subtitle: "Arcade de romper ladrillos voxel 3D con Three.js",
    launch: "Lanzar bola (Espacio)",
    restart: "Jugar de nuevo",
    nextLevel: "Siguiente nivel",
    score: "Puntuación",
    highScore: "Récord",
    lives: "Vidas",
    level: "Nivel",
    combo: "Combo",
    fire: "Disparo láser (F)",
    gameOver: "Fin de partida",
    stageClear: "¡Nivel superado!",
    instructions: "¡Mueve la pala con las flechas o arrastrando en pantalla para rebotar la bola y demoler todos los bloques!",
  },
};

export default function BlockBreaker({ locale }: Props) {
  const t = UI_TEXT[locale] ?? UI_TEXT.en;
  const [gameState, setGameState] = useState<BlockBreakerState>(() => createInitialBlockBreakerState());
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('block_breaker_muted') === 'true';
    } catch {
      return false;
    }
  });

  const inputRef = useRef({ moveX: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });

  // Web Audio procedural sound synthesizer
  const playSound = useCallback((type: 'bounce' | 'brick' | 'laser' | 'die' | 'clear') => {
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

      if (type === 'bounce') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'brick') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'clear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch {
      // AudioContext unavailable
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('block_breaker_muted', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setGameState((prev) => {
          if (prev.status === 'ready') {
            playSound('bounce');
            return launchBall(prev);
          }
          if (prev.laserAmmo > 0) {
            playSound('laser');
            return fireLasers(prev);
          }
          return prev;
        });
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (gameState.laserAmmo > 0) {
          playSound('laser');
          setGameState((prev) => fireLasers(prev));
        } else {
          togglePortal();
        }
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        if (gameState.laserAmmo > 0) {
          playSound('laser');
          setGameState((prev) => fireLasers(prev));
        }
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.moveX = -1;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.moveX = 1;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        (e.code === 'ArrowLeft' || e.code === 'KeyA') && inputRef.current.moveX === -1 ||
        (e.code === 'ArrowRight' || e.code === 'KeyD') && inputRef.current.moveX === 1
      ) {
        inputRef.current.moveX = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.laserAmmo, playSound, toggleMute, togglePortal]);

  // Pointer drag on viewport
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width; // 0 to 1
    const targetPaddleX = (normalizedX - 0.5) * PLAY_WIDTH;
    setGameState((prev) => movePaddle(prev, targetPaddleX));
  }, []);

  // Physics loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      setGameState((prev) => {
        let current = prev;
        if (inputRef.current.moveX !== 0) {
          const speed = 12.0;
          current = movePaddle(current, current.paddleX + inputRef.current.moveX * speed * dt);
        }
        const updated = updateBlockBreaker(current, dt);

        if (updated.score > prev.score) {
          playSound('brick');
        }
        if (updated.lives < prev.lives) {
          playSound('die');
        }
        if (prev.status !== 'cleared' && updated.status === 'cleared') {
          playSound('clear');
        }
        if (prev.balls.length > 0 && updated.balls.length > 0) {
          for (let i = 0; i < updated.balls.length; i++) {
            const bPrev = prev.balls[i];
            const bNext = updated.balls[i];
            if (bPrev && bNext && bPrev.vy < 0 && bNext.vy > 0 && Math.abs(bNext.y - 0.7) < 0.35) {
              playSound('bounce');
              break;
            }
          }
        }

        return updated;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playSound]);

  return (
    <div
      ref={containerRef}
      className={`mx-auto w-full transition-all duration-200 ${
        isImmersive
          ? 'fixed inset-0 z-50 flex flex-col justify-between bg-background p-3 sm:p-5 h-dvh w-screen overflow-hidden'
          : 'max-w-4xl space-y-4'
      }`}
    >
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="font-mono">{gameState.score.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Target className="w-4 h-4 text-primary" />
            <span>{t.level} {gameState.level}</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
            <span>x{gameState.lives}</span>
          </div>

          {gameState.laserAmmo > 0 && (
            <div className="flex items-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
              <Zap className="w-4 h-4" />
              <span>x{gameState.laserAmmo}</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            title="Mute / Unmute (M)"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={togglePortal}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Arena */}
      <div
        ref={viewportRef}
        onPointerMove={handlePointerMove}
        className={`relative w-full rounded-2xl overflow-hidden border border-border bg-background shadow-md cursor-ew-resize ${
          isImmersive ? 'flex-1 min-h-0' : 'aspect-video max-h-160'
        }`}
      >
        <BlockBreakerScene state={gameState} />

        {/* Ready Overlay */}
        {gameState.status === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-xs p-4 text-center pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                playSound('bounce');
                setGameState((prev) => launchBall(prev));
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-black text-primary-foreground shadow-xl hover:bg-primary/90 transition-transform active:scale-95"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>{t.launch}</span>
            </button>
            <p className="mt-3 text-xs text-foreground/80 font-medium max-w-md">{t.instructions}</p>
          </div>
        )}

        {/* Cleared Overlay */}
        {gameState.status === 'cleared' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 text-center pointer-events-auto">
            <Trophy className="w-12 h-12 text-warning mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-foreground">{t.stageClear}</h3>
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              {t.score}: {gameState.score.toLocaleString()}
            </p>
            <button
              type="button"
              onClick={() => setGameState((prev) => nextLevel(prev))}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t.nextLevel}</span>
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState.status === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm p-4 text-center pointer-events-auto">
            <h3 className="text-2xl font-black text-destructive">{t.gameOver}</h3>
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              {t.score}: {gameState.score.toLocaleString()}
            </p>
            <button
              type="button"
              onClick={() => setGameState(createInitialBlockBreakerState(gameState.highScore))}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{t.restart}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-3 gap-2 touch-none select-none sm:pointer-fine:hidden p-3 bg-card rounded-xl border border-border">
        <button
          type="button"
          onPointerDown={() => { inputRef.current.moveX = -1; }}
          onPointerUp={() => { inputRef.current.moveX = 0; }}
          className="p-4 rounded-xl bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => {
            setGameState((prev) => {
              if (prev.status === 'ready') {
                playSound('bounce');
                return launchBall(prev);
              }
              if (prev.laserAmmo > 0) {
                playSound('laser');
                return fireLasers(prev);
              }
              return prev;
            });
          }}
          className="p-4 rounded-xl bg-primary text-primary-foreground font-bold flex justify-center items-center active:opacity-90"
        >
          {gameState.status === 'ready' ? <Play className="w-6 h-6 fill-current" /> : <Zap className="w-6 h-6" />}
        </button>

        <button
          type="button"
          onPointerDown={() => { inputRef.current.moveX = 1; }}
          onPointerUp={() => { inputRef.current.moveX = 0; }}
          className="p-4 rounded-xl bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
