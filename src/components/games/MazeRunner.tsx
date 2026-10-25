import React, { useState, useEffect, useRef, useCallback } from 'react';
import MazeRunnerScene from './MazeRunnerScene';
import {
  type MazeRunnerState,
  createInitialMazeRunnerState,
  tryMovePlayer,
  updateMazeRunner,
} from '../../lib/games/maze-runner';
import type { Locale } from '../../lib/i18n';
import { Play, RotateCcw, Trophy, Timer, Diamond, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Compass, Maximize2, Minimize2, Share2, Volume2, VolumeX } from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';

interface Props {
  locale: Locale;
}

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  restart: string;
  nextStage: string;
  score: string;
  highScore: string;
  stage: string;
  timeLeft: string;
  gems: string;
  escapedTitle: string;
  escapedDesc: string;
  timeoutTitle: string;
  timeoutDesc: string;
  instructions: string;
}> = {
  ko: {
    title: "미로 탈출 러너 3D",
    subtitle: "Three.js 3D 절차적 복셀 미로 탐험 & 탈출",
    restart: "다시 도전",
    nextStage: "다음 미로 탐험",
    score: "탐험 점수",
    highScore: "최고 점수",
    stage: "미로 스테이지",
    timeLeft: "남은 시간",
    gems: "보석 수집",
    escapedTitle: "미로 탈출 성공!",
    escapedDesc: "출구 포털에 도달하여 무사히 미로를 탈출했습니다. 시간 보너스가 지급되었습니다.",
    timeoutTitle: "시간 초과",
    timeoutDesc: "횃불이 꺼졌습니다. 미로 안에서 길을 잃었습니다. 다시 도전하세요!",
    instructions: "방향키(또는 W/A/S/D, 화면 하단 버튼)로 미로를 탐험하며 숨겨진 보석을 모으고 녹색 탈출 포털로 이동하세요!",
  },
  en: {
    title: "Voxel Maze Runner 3D",
    subtitle: "Procedural 3D voxel maze exploration and escape powered by Three.js",
    restart: "Try Again",
    nextStage: "Next Maze Stage",
    score: "Score",
    highScore: "High Score",
    stage: "Maze Stage",
    timeLeft: "Time Left",
    gems: "Gems Found",
    escapedTitle: "Maze Escaped!",
    escapedDesc: "You reached the beacon portal in time! Time bonus awarded.",
    timeoutTitle: "Time Expired",
    timeoutDesc: "Your torch extinguished in the dark maze. Try again!",
    instructions: "Use Arrow keys or W/A/S/D (or touch D-pad) to explore the maze, gather glowing gems, and escape through the green portal!",
  },
  ja: {
    title: "迷路脱出ランナー 3D",
    subtitle: "Three.js 3D自動生成ボクセル迷路探検＆脱出ゲーム",
    restart: "リトライ",
    nextStage: "次のステージへ",
    score: "スコア",
    highScore: "ハイスコア",
    stage: "迷路ステージ",
    timeLeft: "残り時間",
    gems: "宝石",
    escapedTitle: "脱出成功！",
    escapedDesc: "出口ポータルに到達しました！タイムボーナスを獲得しました。",
    timeoutTitle: "タイムアップ",
    timeoutDesc: "たいまつが消えてしまいました。もう一度挑戦しましょう！",
    instructions: "方向キー（W/A/S/D またはタッチ操作）で迷路を探索し、宝石を集めて緑色の脱出ポータルを目指そう！",
  },
  zh: {
    title: "3D 体素迷宫逃生",
    subtitle: "基于 Three.js 的 3D 程序化体素迷宫探险与逃生",
    restart: "重新挑战",
    nextStage: "进入下一迷宫",
    score: "探险得分",
    highScore: "最高分",
    stage: "迷宫关卡",
    timeLeft: "剩余时间",
    gems: "收集宝石",
    escapedTitle: "成功逃脱迷宫！",
    escapedDesc: "顺利抵达绿色传送门！已结算剩余时间奖励。",
    timeoutTitle: "时间耗尽",
    timeoutDesc: "火把熄灭了，迷失在漆黑的迷宫中。再试一次吧！",
    instructions: "使用方向键或 W/A/S/D（或屏幕虚拟按键）探险迷宫，收集沿途发光宝石并逃离迷宫！",
  },
  fr: {
    title: "Labyrinthe Voxel 3D",
    subtitle: "Exploration et évasion procédurale en voxel 3D avec Three.js",
    restart: "Recommencer",
    nextStage: "Labyrinthe suivant",
    score: "Score",
    highScore: "Meilleur score",
    stage: "Niveau",
    timeLeft: "Temps restant",
    gems: "Gemmes",
    escapedTitle: "Évasion réussie !",
    escapedDesc: "Vous avez atteint le portail à temps ! Bonus de temps accordé.",
    timeoutTitle: "Temps écoulé",
    timeoutDesc: "Votre torche s'est éteinte dans l'obscurité. Réessayez !",
    instructions: "Utilisez les flèches ou Z/Q/S/D pour explorer le labyrinthe, collecter les gemmes et rejoindre le portail vert !",
  },
  es: {
    title: "Laberinto Voxel 3D",
    subtitle: "Exploración y escape de laberinto voxel 3D procedural con Three.js",
    restart: "Reintentar",
    nextStage: "Siguiente laberinto",
    score: "Puntuación",
    highScore: "Récord",
    stage: "Nivel",
    timeLeft: "Tiempo",
    gems: "Gemas",
    escapedTitle: "¡Escape completado!",
    escapedDesc: "¡Alcanzaste el portal a tiempo! Bonificación de tiempo otorgada.",
    timeoutTitle: "Tiempo agotado",
    timeoutDesc: "Tu antorcha se ha apagado en la oscuridad. ¡Inténtalo de nuevo!",
    instructions: "¡Usa las flechas o W/A/S/D para explorar el laberinto, recolectar gemas y cruzar el portal verde!",
  },
};

export default function MazeRunner({ locale }: Props) {
  const t = UI_TEXT[locale] ?? UI_TEXT.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal();
  const [gameState, setGameState] = useState<MazeRunnerState>(() => createInitialMazeRunnerState(1));
  const [shareCopied, setShareCopied] = useState(false);
  const [muted, setMuted] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('maze_runner_3d_muted') === 'true';
      }
    } catch {}
    return false;
  });

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('maze_runner_3d_muted', String(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const handleShareCard = useCallback(async () => {
    const isEscaped = gameState.status === 'escaped';
    const canvas = createShareCardCanvas({
      title: "Maze Runner 3D",
      subtitle: isEscaped ? `Stage ${gameState.level} Escaped!` : "Labyrinth Escape Attempt",
      score: `${gameState.score.toLocaleString()} pts`,
      slug: "maze-runner",
      customStats: [
        { label: "Stage", value: `Level ${gameState.level}` },
        { label: "Gems", value: `${gameState.gemsCollected}/${gameState.totalGems}` },
        { label: "Time Left", value: `${Math.ceil(gameState.timeLeft)}s` },
        { label: "High Score", value: `${gameState.highScore.toLocaleString()} pts` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `maze-runner-stage-${gameState.level}.png`);
    }
  }, [gameState.status, gameState.level, gameState.score, gameState.gemsCollected, gameState.totalGems, gameState.timeLeft, gameState.highScore]);

  const moveQueueRef = useRef<{ dx: number; dz: number } | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePortal();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      let dx = 0;
      let dz = 0;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') dz = -1;
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') dz = 1;
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') dx = -1;
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') dx = 1;

      if (dx !== 0 || dz !== 0) {
        e.preventDefault();
        setGameState((prev) => tryMovePlayer(prev, dx, dz));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePortal, toggleMute]);

  // Game loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      setGameState((prev) => {
        let current = prev;
        if (moveQueueRef.current) {
          current = tryMovePlayer(current, moveQueueRef.current.dx, moveQueueRef.current.dz);
          moveQueueRef.current = null;
        }
        const next = updateMazeRunner(current, dt);
        if (prev.status !== 'escaped' && next.status === 'escaped') {
          if (containerRef.current) celebrate(containerRef.current, { preset: "shards" });
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const queueMove = (dx: number, dz: number) => {
    setGameState((prev) => tryMovePlayer(prev, dx, dz));
  };

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? 'fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-4 flex flex-col justify-between overflow-y-auto select-none touch-none'
          : 'mx-auto max-w-4xl space-y-4 select-none touch-none'
      }
    >
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="font-mono">{gameState.score.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Compass className="w-4 h-4 text-primary" />
            <span>{t.stage} {gameState.level}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Timer className={`w-4 h-4 ${gameState.timeLeft < 15 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
            <span className="font-mono">{Math.ceil(gameState.timeLeft)}s</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
            <Diamond className="w-4 h-4 text-primary fill-primary/30" />
            <span>{gameState.gemsCollected}/{gameState.totalGems}</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-border pl-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? portalLabels.unmute : portalLabels.mute}
              title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
              className="min-h-10 px-2.5 py-1.5 rounded-xl border border-border bg-background/85 text-xs font-bold text-foreground shadow-xs hover:bg-muted active:scale-95 transition-transform flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              <span className="hidden md:inline">{muted ? portalLabels.unmute : portalLabels.mute}</span>
            </button>
            <button
              type="button"
              onClick={togglePortal}
              aria-pressed={isImmersive}
              aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
              title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
              className="min-h-10 px-2.5 py-1.5 rounded-xl border border-border bg-background/85 text-xs font-bold text-foreground shadow-xs hover:bg-muted active:scale-95 transition-transform flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span className="hidden md:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3D Viewport */}
      <div
        className={
          isImmersive
            ? 'relative flex-1 w-full min-h-75 rounded-2xl overflow-hidden border border-border bg-background shadow-md'
            : 'relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-background shadow-md'
        }
      >
        <MazeRunnerScene state={gameState} />

        {/* Mini-map Overlay (Top Right) */}
        <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border shadow-sm pointer-events-none w-20 h-20 flex flex-col justify-between">
          {gameState.grid.map((row, z) => (
            <div key={z} className="flex flex-1 gap-px">
              {row.map((cell, x) => {
                const isPlayer = Math.round(gameState.playerX) === x && Math.round(gameState.playerZ) === z;
                const isExit = gameState.exitX === x && gameState.exitZ === z;
                const isGem = gameState.gems.some((g) => !g.collected && g.x === x && g.z === z);

                return (
                  <div
                    key={`${x}-${z}`}
                    className={`flex-1 rounded-xs ${
                      isPlayer
                        ? 'bg-warning'
                        : isExit
                          ? 'bg-success'
                          : isGem
                            ? 'bg-primary'
                            : cell === 1
                              ? 'bg-muted-foreground/30'
                              : 'bg-background/20'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Escaped Overlay */}
        {gameState.status === 'escaped' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 text-center pointer-events-auto">
            <Trophy className="w-12 h-12 text-warning mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-foreground">{t.escapedTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">{t.escapedDesc}</p>
            <p className="mt-2 text-sm text-foreground font-bold font-mono">
              {t.score}: {gameState.score.toLocaleString()}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void handleShareCard()}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/20 px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/30 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{shareCopied ? "복사됨!" : "공유 카드"}</span>
              </button>
              <button
                type="button"
                onClick={() => setGameState(createInitialMazeRunnerState(gameState.level + 1, gameState.highScore))}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{t.nextStage}</span>
              </button>
            </div>
          </div>
        )}

        {/* Timeout Overlay */}
        {gameState.status === 'timeout' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm p-4 text-center pointer-events-auto">
            <h3 className="text-2xl font-black text-destructive">{t.timeoutTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">{t.timeoutDesc}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void handleShareCard()}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/20 px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/30 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{shareCopied ? "복사됨!" : "공유 카드"}</span>
              </button>
              <button
                type="button"
                onClick={() => setGameState(createInitialMazeRunnerState(1, gameState.highScore))}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{t.restart}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile D-Pad Controls */}
      <div className="grid grid-cols-3 gap-2 touch-none select-none sm:pointer-fine:hidden p-3 bg-card rounded-xl border border-border max-w-xs mx-auto">
        <div />
        <button
          type="button"
          onClick={() => queueMove(0, -1)}
          className="p-4 rounded-xl bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div />

        <button
          type="button"
          onClick={() => queueMove(-1, 0)}
          className="p-4 rounded-xl bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => queueMove(0, 1)}
          className="p-4 rounded-xl bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowDown className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => queueMove(1, 0)}
          className="p-4 rounded-xl bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
