"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from 'lucide-react';
import { celebrate } from '../../lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';
import type { GravityRollerState } from '../../lib/games/gravity-roller';
import {
  createInitialState,
  setTilt,
  updatePhysics,
  LEVELS,
} from '../../lib/games/gravity-roller';
import { GravityRoller3DScene } from './GravityRoller3DScene';
import { useArcadePortal } from '../../lib/games/arcade-portal';

interface Props {
  locale?: string;
}

const TEXT: Record<string, Record<string, string>> = {
  ko: {
    title: '3D 중력 롤러 볼',
    subtitle: '미로 판을 기울여 구슬을 굴리고 보석을 모아 탈출 포털에 도달하세요',
    start: '게임 시작',
    restart: '다시 시도',
    nextLevel: '다음 스테이지',
    time: '남은 시간',
    score: '점수',
    gems: '보석',
    stage: '스테이지',
    cleared: '스테이지 클리어!',
    failed: '미션 실패!',
    trapMessage: '함정에 빠졌거나 시간이 초과되었습니다.',
    clearMessage: '목표 포털에 무사히 도달했습니다!',
    controls: '조작법: 키보드 방향키(↑↓←→) 또는 W/A/S/D 키로 판을 기울이세요. 모바일은 하단 방향 패드로 조작 가능합니다.',
  },
  en: {
    title: '3D Gravity Roller Ball',
    subtitle: 'Tilt the labyrinth board to guide the metallic sphere and reach the escape portal',
    start: 'Start Game',
    restart: 'Retry Stage',
    nextLevel: 'Next Stage',
    time: 'Time',
    score: 'Score',
    gems: 'Gems',
    stage: 'Stage',
    cleared: 'Stage Cleared!',
    failed: 'Mission Failed!',
    trapMessage: 'You fell into a trap or ran out of time.',
    clearMessage: 'You safely reached the exit portal!',
    controls: 'Controls: Use Arrow Keys (↑↓←→) or W/A/S/D to tilt the board. Mobile touch D-pad also available.',
  },
};

export default function GravityRoller3D({ locale = 'ko' }: Props) {
  const t = TEXT[locale] ?? TEXT.ko;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal();
  const [gameState, setGameState] = useState<GravityRollerState>(() => createInitialState(0));
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const handleShareCard = useCallback(async () => {
    const gemsCount = gameState.gems.filter((g) => g.collected).length;
    const canvas = createShareCardCanvas({
      title: "3D Gravity Roller",
      subtitle: gameState.status === 'cleared' ? "미로 탈출 성공" : "중력 롤러 미션 기록",
      score: `${gameState.score.toLocaleString()} PTS`,
      slug: "gravity-roller-3d",
      customStats: [
        { label: "STAGE", value: `STAGE ${gameState.currentLevelIndex + 1}` },
        { label: "GEMS", value: `${gemsCount}개` },
        { label: "TIME LEFT", value: `${Math.max(0, Math.round(gameState.timeRemaining))}s` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `gravity-roller-stage${gameState.currentLevelIndex + 1}.png`);
    }
  }, [gameState.score, gameState.status, gameState.currentLevelIndex, gameState.gems, gameState.timeRemaining]);

  const prevStatusRef = useRef(gameState.status);
  useEffect(() => {
    if (gameState.status !== prevStatusRef.current && containerRef.current) {
      if (gameState.status === 'cleared') {
        celebrate(containerRef.current, { preset: "coins" });
      } else if (gameState.status === 'failed') {
        celebrate(containerRef.current, { preset: "shards" });
      }
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status, containerRef]);
  const [muted, setMuted] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('gravity_roller_muted') === 'true';
      }
    } catch {}
    return false;
  });

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('gravity_roller_muted', String(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const keysPressed = useRef<Record<string, boolean>>({});

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Key listeners
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

      keysPressed.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePortal, toggleMute]);

  // Main game tick loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const keys = keysPressed.current;
      let targetPitch = 0;
      let targetRoll = 0;

      if (keys['arrowup'] || keys['w']) targetPitch -= 0.25;
      if (keys['arrowdown'] || keys['s']) targetPitch += 0.25;
      if (keys['arrowleft'] || keys['a']) targetRoll -= 0.25;
      if (keys['arrowright'] || keys['d']) targetRoll += 0.25;

      setGameState((prev) => {
        if (prev.status !== 'playing') return prev;
        const next = { ...prev };
        setTilt(next, targetPitch, targetRoll);
        updatePhysics(next, dt);
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleStart = () => {
    setGameState((prev) => ({
      ...prev,
      status: 'playing',
    }));
  };

  const handleRetry = () => {
    setGameState((prev) => {
      const next = createInitialState(prev.currentLevelIndex);
      next.status = 'playing';
      next.score = prev.score;
      next.highScore = prev.highScore;
      return next;
    });
  };

  const handleNextLevel = () => {
    setGameState((prev) => {
      const nextIdx = (prev.currentLevelIndex + 1) % LEVELS.length;
      const next = createInitialState(nextIdx);
      next.status = 'playing';
      next.score = prev.score;
      next.highScore = prev.highScore;
      return next;
    });
  };

  // Virtual D-pad helpers for mobile
  const handleTouchDir = (dir: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
    const keyMap = {
      up: 'arrowup',
      down: 'arrowdown',
      left: 'arrowleft',
      right: 'arrowright',
    };
    keysPressed.current[keyMap[dir]] = isPressed;
  };

  const collectedGemsCount = gameState.gems.filter((g) => g.collected).length;
  const totalGemsCount = gameState.gems.length;

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
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 sm:px-3 py-1.5">
            <span className="text-chart-1">⏱</span>
            <span className="text-muted-foreground">{t.time}:</span>
            <span className="font-bold text-foreground">{Math.ceil(gameState.timeRemaining)}s</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 sm:px-3 py-1.5">
            <span className="text-chart-1">💎</span>
            <span className="text-muted-foreground">{t.gems}:</span>
            <span className="font-bold text-foreground">{collectedGemsCount}/{totalGemsCount}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 sm:px-3 py-1.5">
            <span className="text-primary">★</span>
            <span className="text-muted-foreground">{t.score}:</span>
            <span className="font-bold text-foreground">{gameState.score}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 sm:px-3 py-1.5 text-primary">
            <span>{t.stage} {gameState.currentLevelIndex + 1}</span>
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

      {/* 3D Scene Viewport */}
      <GravityRoller3DScene
        state={gameState}
        className={
          isImmersive
            ? 'relative flex-1 w-full min-h-75 overflow-hidden rounded-2xl border border-border bg-card shadow-inner'
            : undefined
        }
      />

      {/* Interactive Controls & Modals */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {gameState.status === 'ready' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">
              스테이지 {gameState.currentLevelIndex + 1}: {LEVELS[gameState.currentLevelIndex % LEVELS.length].name}
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90"
            >
              {t.start}
            </button>
          </div>
        ) : gameState.status === 'cleared' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-3 text-center">
            <p className="text-base font-bold text-chart-1">{t.cleared}</p>
            <p className="text-xs text-muted-foreground">{t.clearMessage}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareCard}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-4 py-2 text-xs font-bold text-foreground transition-colors shadow-xs"
              >
                {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                {shareCardCopied ? "복사됨!" : "결과 카드 공유"}
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                {t.restart}
              </button>
              <button
                type="button"
                onClick={handleNextLevel}
                className="rounded-xl bg-primary px-6 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90"
              >
                {t.nextLevel}
              </button>
            </div>
          </div>
        ) : gameState.status === 'failed' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-3 text-center">
            <p className="text-base font-bold text-destructive">{t.failed}</p>
            <p className="text-xs text-muted-foreground">{t.trapMessage}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareCard}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-4 py-2 text-xs font-bold text-foreground transition-colors shadow-xs"
              >
                {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                {shareCardCopied ? "복사됨!" : "결과 카드 공유"}
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-xl bg-primary px-6 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90"
              >
                {t.restart}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">{t.controls}</p>
            {/* Mobile Virtual D-pad */}
            <div className="flex flex-col items-center gap-1 sm:hidden">
              <button
                type="button"
                onTouchStart={() => handleTouchDir('up', true)}
                onTouchEnd={() => handleTouchDir('up', false)}
                onMouseDown={() => handleTouchDir('up', true)}
                onMouseUp={() => handleTouchDir('up', false)}
                className="rounded-lg bg-muted px-4 py-2 text-xs font-bold text-foreground"
              >
                ▲
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onTouchStart={() => handleTouchDir('left', true)}
                  onTouchEnd={() => handleTouchDir('left', false)}
                  onMouseDown={() => handleTouchDir('left', true)}
                  onMouseUp={() => handleTouchDir('left', false)}
                  className="rounded-lg bg-muted px-4 py-2 text-xs font-bold text-foreground"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onTouchStart={() => handleTouchDir('down', true)}
                  onTouchEnd={() => handleTouchDir('down', false)}
                  onMouseDown={() => handleTouchDir('down', true)}
                  onMouseUp={() => handleTouchDir('down', false)}
                  className="rounded-lg bg-muted px-4 py-2 text-xs font-bold text-foreground"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onTouchStart={() => handleTouchDir('right', true)}
                  onTouchEnd={() => handleTouchDir('right', false)}
                  onMouseDown={() => handleTouchDir('right', true)}
                  onMouseUp={() => handleTouchDir('right', false)}
                  className="rounded-lg bg-muted px-4 py-2 text-xs font-bold text-foreground"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
