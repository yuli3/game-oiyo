import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import CyberHighway3DScene from './CyberHighway3DScene';
import {
  type CyberHighwayState,
  createInitialCyberHighwayState,
  steerPlayer,
  activateNitro,
  deactivateNitro,
  updateCyberHighway,
} from '../../lib/games/cyber-highway';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';

function getPercentageWidthClass(pct: number): string {
  if (pct >= 95) return 'w-full';
  if (pct >= 90) return 'w-11/12';
  if (pct >= 80) return 'w-4/5';
  if (pct >= 75) return 'w-3/4';
  if (pct >= 66) return 'w-2/3';
  if (pct >= 60) return 'w-3/5';
  if (pct >= 50) return 'w-1/2';
  if (pct >= 40) return 'w-2/5';
  if (pct >= 33) return 'w-1/3';
  if (pct >= 25) return 'w-1/4';
  if (pct >= 20) return 'w-1/5';
  if (pct >= 10) return 'w-1/12';
  if (pct > 0) return 'w-1';
  return 'w-0';
}

function createCyberAudio() {
  let ctx: AudioContext | null = null;
  const getCtx = () => {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };

  return {
    playCrash() {
      const c = getCtx();
      if (!c) return;
      try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        osc.connect(gain).connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.35);
      } catch {}
    },
    playCoin() {
      const c = getCtx();
      if (!c) return;
      try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.connect(gain).connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.15);
      } catch {}
    },
    playNitro() {
      const c = getCtx();
      if (!c) return;
      try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, c.currentTime + 0.25);
        gain.gain.setValueAtTime(0.1, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
        osc.connect(gain).connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.25);
      } catch {}
    },
    close() {
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
      ctx = null;
    },
  };
}

export default function CyberHighway3D() {
  const [gameState, setGameState] = useState<CyberHighwayState>(createInitialCyberHighwayState);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('cyber_highway_muted') === 'true';
    } catch {
      return false;
    }
  });
  const stateRef = useRef<CyberHighwayState>(gameState);
  stateRef.current = gameState;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioRef = useRef<ReturnType<typeof createCyberAudio> | null>(null);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal();

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem('cyber_highway_muted', String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    audioRef.current = createCyberAudio();
    return () => {
      audioRef.current?.close();
    };
  }, []);

  // Main game loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      if (!stateRef.current.gameOver && !stateRef.current.paused) {
        const current = stateRef.current;
        const next = updateCyberHighway(current, dt);

        // Sound triggers
        if (!mutedRef.current) {
          if (next.hp < current.hp) {
            audioRef.current?.playCrash();
          } else if (next.credits > current.credits) {
            audioRef.current?.playCoin();
          } else if (next.isBoosting && !current.isBoosting) {
            audioRef.current?.playNitro();
          }
        }

        // Haptic feedback
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            if (next.hp < current.hp) {
              navigator.vibrate(next.gameOver ? [50, 50, 100] : [30, 30, 60]);
            } else if (next.credits > current.credits) {
              navigator.vibrate(15);
            } else if (next.isBoosting && !current.isBoosting) {
              navigator.vibrate(25);
            }
          } catch {}
        }

        setGameState(next);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        togglePortal();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setGameState((s) => steerPlayer(s, -1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setGameState((s) => steerPlayer(s, 1));
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setGameState((s) => activateNitro(s));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setGameState((s) => deactivateNitro(s));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleMute, togglePortal]);

  const handleRestart = useCallback(() => {
    setGameState(createInitialCyberHighwayState());
  }, []);

  const [shareCardCopied, setShareCardCopied] = useState(false);

  const handleShareCard = useCallback(async () => {
    try {
      const canvas = createShareCardCanvas({
        title: 'Cyber Highway 3D',
        subtitle: 'Neon Speed Racer · Cyberpunk 3D',
        score: `${gameState.score.toLocaleString()} pts`,
        slug: 'cyber-highway-3d',
        customStats: [
          { label: 'DISTANCE', value: `${Math.round(gameState.distance)}m` },
          { label: 'CREDITS', value: `🪙 ${gameState.credits}` },
          { label: 'SPEED', value: `${Math.round(gameState.speed * 60)} km/h` },
        ],
      });
      const success = await copyShareCardToClipboard(canvas);
      if (success) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2000);
      } else {
        downloadShareCard(canvas, `cyber-highway-${gameState.score}.png`);
      }
    } catch {}
  }, [gameState.credits, gameState.distance, gameState.score, gameState.speed]);

  const speedKmh = Math.round(gameState.speed * 3.6);

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
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 4.2, -6.5], fov: 60, rotation: [0.15, Math.PI, 0] }}
        className="w-full h-full"
      >
        <CyberHighway3DScene state={gameState} />
      </Canvas>

      {/* Top HUD: Speedometer, Shield, Nitro, Score, Sound */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none gap-2">
        {/* Speed & Controls Toggle */}
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-sm">
            <div className="text-xs text-muted-foreground font-medium">속도 (SPEED)</div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {speedKmh} <span className="text-xs font-semibold text-primary">KM/H</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              거리: <span className="font-bold text-foreground">{Math.round(gameState.distance)} m</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            className="pointer-events-auto min-h-11 px-3 rounded-xl border border-border bg-background/85 backdrop-blur-md text-xs font-bold text-foreground shadow-sm hover:bg-muted active:scale-95 transition-transform"
            title="Mute / Unmute (M)"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="pointer-events-auto min-h-11 px-3 rounded-xl border border-border bg-background/85 backdrop-blur-md text-xs font-bold text-foreground shadow-sm hover:bg-muted active:scale-95 transition-transform"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? '🗗' : '⛶'}
          </button>
        </div>

        {/* Shield (HP) & Nitro Bars */}
        <div className="flex-1 max-w-xs mx-2 rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-sm space-y-2">
          {/* HP Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-foreground">차량 내구도 (SHIELD)</span>
              <span className="font-bold text-primary">{gameState.hp}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${getPercentageWidthClass(gameState.hp)} ${
                  gameState.hp > 50 ? 'bg-primary' : gameState.hp > 25 ? 'bg-warning' : 'bg-destructive'
                }`}
              />
            </div>
          </div>

          {/* Nitro Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-foreground">니트로 부스트 (NITRO)</span>
              <span className="font-bold text-primary">{Math.round(gameState.nitro)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full bg-primary transition-all duration-150 ${getPercentageWidthClass(gameState.nitro)}`}
              />
            </div>
          </div>
        </div>

        {/* Score & Combo */}
        <div className="rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-sm text-right">
          <div className="text-xs text-muted-foreground font-medium">점수 (SCORE)</div>
          <div className="text-2xl font-black tracking-tight text-foreground">
            {gameState.score.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            크레딧: <span className="font-bold text-warning">🪙 {gameState.credits}</span>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controls (Impeccable minimum 48px touch targets) */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto touch-none">
        {/* Left / Right Steering Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); setGameState((s) => steerPlayer(s, -1)); }}
            className="w-16 h-16 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="좌측 차선 이동"
          >
            ◀
          </button>
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); setGameState((s) => steerPlayer(s, 1)); }}
            className="w-16 h-16 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-xl font-black text-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="우측 차선 이동"
          >
            ▶
          </button>
        </div>

        {/* Nitro Boost Button */}
        <div>
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); setGameState((s) => activateNitro(s)); }}
            onPointerUp={() => setGameState((s) => deactivateNitro(s))}
            onPointerLeave={() => setGameState((s) => deactivateNitro(s))}
            className={`px-6 h-16 rounded-2xl border font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
              gameState.isBoosting
                ? 'bg-primary text-primary-foreground border-primary ring-4 ring-primary/30'
                : 'bg-background/90 backdrop-blur-md border-border text-foreground'
            }`}
            aria-label="니트로 부스트"
          >
            ⚡ NITRO
          </button>
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-10">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-3xl font-black tracking-tight text-foreground">
              CRASH! GAME OVER
            </div>
            <p className="text-sm text-muted-foreground">
              교통 차량과 충돌하여 차량 쉴드가 모두 소진되었습니다.
            </p>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">최종 점수</span>
                <span className="text-lg font-black text-foreground">{gameState.score.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">주행 거리</span>
                <span className="text-lg font-black text-foreground">{Math.round(gameState.distance)}m</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">획득 크레딧</span>
                <span className="text-lg font-black text-warning">🪙 {gameState.credits}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
              >
                다시 도전하기 (RETRY)
              </button>
              <button
                type="button"
                onClick={handleShareCard}
                className="w-full py-3 rounded-xl border border-border bg-muted/60 text-foreground font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="size-4" />
                {shareCardCopied ? '기록 카드 복사 완료!' : 'Share Card 2.0 소셜 공유'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
