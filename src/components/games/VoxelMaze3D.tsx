import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { celebrate } from "../../lib/games/celebration";
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from 'lucide-react';
import VoxelMaze3DScene from './VoxelMaze3DScene';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';
import {
  type VoxelMazeState,
  createInitialVoxelMazeState,
  movePlayer,
  updateVoxelMaze,
} from '../../lib/games/voxel-maze';

export default function VoxelMaze3D() {
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal();
  const [gameState, setGameState] = useState<VoxelMazeState>(createInitialVoxelMazeState);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const stateRef = useRef<VoxelMazeState>(gameState);
  stateRef.current = gameState;

  const handleShareCard = useCallback(async () => {
    const s = stateRef.current;
    const canvas = createShareCardCanvas({
      title: "3D Voxel Maze",
      subtitle: s.levelCleared ? "미로 탈출 성공" : "미로 탐사 기록",
      score: `${s.score.toLocaleString()} PTS`,
      slug: "voxel-maze-3d",
      customStats: [
        { label: "GEMS", value: `${s.gemsCollected}개` },
        { label: "KEYS", value: `${s.keysCollected}/${s.keysRequired}개` },
        { label: "TIME LEFT", value: `${Math.round(s.timeLeft)}s` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `voxel-maze-${s.score}pts.png`);
    }
  }, []);

  const [muted, setMuted] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('voxel_maze_muted') === 'true';
      }
    } catch {}
    return false;
  });
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('voxel_maze_muted', String(muted));
      }
    } catch {}
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }, []);

  const playStepSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.04);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }, [getAudioContext]);

  const playKeySound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [1046.50, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  }, [getAudioContext]);

  const playGemSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }, [getAudioContext]);

  const playClearSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;
      const dur = idx === notes.length - 1 ? 0.5 : 0.2;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
  }, [getAudioContext]);

  const playFailSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }, [getAudioContext]);

  const doMove = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setGameState((s) => {
      if (s.gameOver || s.levelCleared || s.paused) return s;
      const next = movePlayer(s, dir);
      if (next.player.x !== s.player.x || next.player.z !== s.player.z) {
        playStepSound();
        vibrate(8);
      }
      return next;
    });
  }, [playStepSound, vibrate]);

  // Reactive sound & haptics for items and outcomes
  const prevKeysRef = useRef(gameState.keysCollected);
  const prevGemsRef = useRef(gameState.gemsCollected);
  const prevClearRef = useRef(gameState.levelCleared);
  const prevOverRef = useRef(gameState.gameOver);

  useEffect(() => {
    if (gameState.keysCollected > prevKeysRef.current) {
      playKeySound();
      vibrate([20, 30, 20]);
    }
    prevKeysRef.current = gameState.keysCollected;

    if (gameState.gemsCollected > prevGemsRef.current) {
      playGemSound();
      vibrate(15);
    }
    prevGemsRef.current = gameState.gemsCollected;

    if (gameState.levelCleared && !prevClearRef.current) {
      playClearSound();
      vibrate([40, 40, 40, 40, 100]);
      celebrate(containerRef.current, { preset: "shards", colors: ["#34d399", "#60a5fa", "#fde68a"], origin: { x: 0.25, y: 0.6 }, extraOrigins: [{ x: 0.75, y: 0.6 }] });
    }
    prevClearRef.current = gameState.levelCleared;

    if (gameState.gameOver && !prevOverRef.current) {
      playFailSound();
      vibrate([80, 40, 120]);
    }
    prevOverRef.current = gameState.gameOver;
  }, [gameState.keysCollected, gameState.gemsCollected, gameState.levelCleared, gameState.gameOver, playClearSound, playFailSound, playGemSound, playKeySound, vibrate]);

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

      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        doMove('up');
      } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        doMove('down');
      } else if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
        doMove('left');
      } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
        doMove('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doMove, togglePortal, toggleMute]);

  const handleRestart = useCallback(() => {
    setGameState(createInitialVoxelMazeState(1));
  }, []);

  const handleNextLevel = useCallback(() => {
    setGameState((s) => createInitialVoxelMazeState(s.level + 1));
  }, []);

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={`relative select-none touch-none overflow-hidden ${
        isImmersive
          ? 'fixed inset-0 z-50 w-screen h-dvh bg-card'
          : 'w-full aspect-16/10 min-h-120 max-h-180 rounded-2xl border border-border bg-card shadow-lg'
      }`}
    >
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

        {/* Time, Score & Sound */}
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? portalLabels.unmute : portalLabels.mute}
            title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
            className="pointer-events-auto min-h-11 px-3 py-2 rounded-xl border border-border bg-background/85 backdrop-blur-md shadow-xs text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-transform flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            <span className="hidden sm:inline">{muted ? portalLabels.unmute : portalLabels.mute}</span>
          </button>
          <button
            type="button"
            onClick={togglePortal}
            aria-pressed={isImmersive}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
            className="pointer-events-auto min-h-11 px-3 py-2 rounded-xl border border-border bg-background/85 backdrop-blur-md shadow-xs text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-transform flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
      </div>

      {/* Mobile Touch D-Pad (Min 48px touch targets, hidden on mice) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto touch-none sm:pointer-fine:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); doMove('up'); }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="위로 이동"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); doMove('left'); }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="왼쪽 이동"
          >
            ◀
          </button>
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); doMove('down'); }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-md active:scale-95 transition-transform"
            aria-label="아래로 이동"
          >
            ▼
          </button>
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); doMove('right'); }}
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareCard}
                className="flex-1 py-3.5 rounded-xl border border-border bg-card hover:bg-muted font-bold text-sm text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                {shareCardCopied ? "복사됨!" : "결과 공유"}
              </button>
              <button
                type="button"
                onClick={handleNextLevel}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
              >
                다음 스테이지 (NEXT LEVEL)
              </button>
            </div>
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareCard}
                className="flex-1 py-3.5 rounded-xl border border-border bg-card hover:bg-muted font-bold text-sm text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                {shareCardCopied ? "복사됨!" : "결과 공유"}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
              >
                다시 시도 (RETRY)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
