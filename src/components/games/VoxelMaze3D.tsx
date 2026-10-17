import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import VoxelMaze3DScene from './VoxelMaze3DScene';
import {
  VoxelMazeState,
  createInitialVoxelMazeState,
  movePlayer,
  updateVoxelMaze,
} from '../../lib/games/voxel-maze';

export default function VoxelMaze3D() {
  const [gameState, setGameState] = useState<VoxelMazeState>(createInitialVoxelMazeState);
  const stateRef = useRef<VoxelMazeState>(gameState);
  stateRef.current = gameState;

  // Game loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (!stateRef.current.gameOver && !stateRef.current.levelCleared && !stateRef.current.paused) {
        const next = updateVoxelMaze(stateRef.current, dt);
        setGameState(next);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        setGameState((s) => movePlayer(s, 'up'));
      } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        setGameState((s) => movePlayer(s, 'down'));
      } else if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
        setGameState((s) => movePlayer(s, 'left'));
      } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
        setGameState((s) => movePlayer(s, 'right'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(createInitialVoxelMazeState(1));
  }, []);

  const handleNextLevel = useCallback(() => {
    setGameState((s) => createInitialVoxelMazeState(s.level + 1));
  }, []);

  return (
    <div className="relative w-full aspect-16/10 min-h-120 max-h-180 rounded-2xl overflow-hidden border border-border bg-card shadow-lg select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [7, 16, 20], fov: 50 }}
        gl={{ antialias: true }}
      >
        <VoxelMaze3DScene state={gameState} />
      </Canvas>

      {/* Top HUD: Status & Timer */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none gap-4">
        {/* Keys & Objectives */}
        <div className="flex gap-2 rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span>🔑 열쇠:</span>
            <span className={gameState.isGateOpen ? 'text-primary' : 'text-foreground'}>
              {gameState.keysCollected} / {gameState.keysRequired}
            </span>
          </div>
          <div className="border-l border-border pl-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span>보석:</span>
            <span className="font-bold text-foreground">{gameState.gemsCollected}</span>
          </div>
        </div>

        {/* Time & Score */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2 shadow-xs">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">남은 시간</div>
            <div className={`text-base font-black font-mono ${gameState.timeLeft <= 15 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {Math.ceil(gameState.timeLeft)}초
            </div>
          </div>
          <div className="border-l border-border pl-3 text-right">
            <div className="text-xs text-muted-foreground">점수</div>
            <div className="text-base font-black text-primary font-mono">
              {gameState.score.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Touch D-Pad (Min 48px touch targets) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button
            type="button"
            onClick={() => setGameState((s) => movePlayer(s, 'up'))}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="위로 이동"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onClick={() => setGameState((s) => movePlayer(s, 'left'))}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="왼쪽 이동"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => setGameState((s) => movePlayer(s, 'down'))}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="아래로 이동"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => setGameState((s) => movePlayer(s, 'right'))}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="오른쪽 이동"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Level Cleared Modal */}
      {gameState.levelCleared && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-10">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
              🎉 탈출 성공! LEVEL CLEAR!
            </div>
            <p className="text-xs text-muted-foreground">
              모든 열쇠를 찾고 차원 전송 포탈에 성공적으로 도달했습니다.
            </p>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">총 점수</span>
                <span className="text-lg font-black text-foreground font-mono">{gameState.score.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">수집 보석</span>
                <span className="text-lg font-black text-primary font-mono">{gameState.gemsCollected}개</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextLevel}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              다음 스테이지 도전 (NEXT LEVEL)
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-10">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {gameState.gameOverReason === 'timeout' ? '시간 초과 — 탐사 실패' : '센티널 발각 — 탈출 실패'}
            </div>
            <p className="text-xs text-muted-foreground">
              {gameState.gameOverReason === 'timeout'
                ? '제한 시간이 모두 소진되어 미로 방화벽이 차단되었습니다.'
                : '순찰 중이던 센티널 드론에게 감지되어 체포되었습니다.'}
            </p>

            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground block mb-1">최종 점수</span>
              <span className="text-xl font-black text-foreground font-mono">{gameState.score.toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              처음부터 다시 시도 (RETRY)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
