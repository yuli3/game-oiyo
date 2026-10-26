import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CrossyRoadEngine } from '../../lib/games/crossy-road';

export default function CrossyRoad3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CrossyRoadEngine>(new CrossyRoadEngine());

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [deathReason, setDeathReason] = useState<string>('');

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSound = useCallback((type: 'hop' | 'hit' | 'drown' | 'eagle' | 'bell') => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'hop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hit') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'drown') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'eagle') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.linearRampToValueAtTime(940, now + 0.15);
        osc.frequency.linearRampToValueAtTime(420, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'bell') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // safe audio
    }
  }, [initAudio]);

  const handleHop = useCallback((dx: number, dy: number) => {
    initAudio();
    const engine = engineRef.current;
    if (!engine.state.isAlive) return;

    const success = engine.hop(dx, dy);
    if (success) {
      playSound('hop');
      setScore(engine.state.score);
      setHighScore((prev) => Math.max(prev, engine.state.score));
    }
  }, [initAudio, playSound]);

  const handleRestart = useCallback(() => {
    initAudio();
    engineRef.current = new CrossyRoadEngine();
    setIsGameOver(false);
    setDeathReason('');
    setScore(0);
  }, [initAudio]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
        e.preventDefault();
        handleHop(0, 1);
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        handleHop(0, -1);
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleHop(-1, 0);
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleHop(1, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHop]);

  // Touch Swipe
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < 15) {
      // Tap -> Hop Forward
      handleHop(0, 1);
    } else if (absY > absX) {
      if (dy < 0) handleHop(0, 1); // swipe up
      else handleHop(0, -1); // swipe down
    } else {
      if (dx > 0) handleHop(1, 0); // swipe right
      else handleHop(-1, 0); // swipe left
    }
    touchStartRef.current = null;
  };

  // 60fps 3D Isometric Voxel Renderer
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let cameraLane = 2.0;

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const engine = engineRef.current;
      const wasAlive = engine.state.isAlive;
      engine.update(dt);

      if (wasAlive && !engine.state.isAlive) {
        setIsGameOver(true);
        if (engine.state.deathReason === 'car') playSound('hit');
        else if (engine.state.deathReason === 'drown') playSound('drown');
        else if (engine.state.deathReason === 'eagle') playSound('eagle');
        else if (engine.state.deathReason === 'train') playSound('hit');
        setDeathReason(
          engine.state.deathReason === 'car'
            ? '자동차에 치였습니다!'
            : engine.state.deathReason === 'drown'
            ? '차가운 강물에 빠졌습니다!'
            : engine.state.deathReason === 'eagle'
            ? '너무 오래 머물러 독수리에게 낚아채였습니다!'
            : '초고속 열차와 충돌했습니다!'
        );
      }

      // Smooth camera interpolation behind player
      cameraLane += (engine.state.playerLane - cameraLane) * dt * 4.5;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Projection parameters (Isometric 3D)
      const TILE_W = 42;
      const TILE_H = 22;
      const originX = w / 2;
      const originY = h * 0.75;

      const toIso = (gx: number, gy: number, gz = 0) => {
        const relY = gy - cameraLane;
        return {
          x: originX + gx * TILE_W * 0.95 - relY * 4,
          y: originY - relY * TILE_H * 1.6 - gz * 22,
        };
      };

      // Background Sky
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Render visible lanes (from cameraLane - 3 up to cameraLane + 16)
      const minLane = Math.floor(cameraLane - 3);
      const maxLane = Math.ceil(cameraLane + 16);

      for (let lIdx = minLane; lIdx <= maxLane; lIdx++) {
        const lane = engine.state.lanes.find((l) => l.index === lIdx);
        if (!lane) continue;

        // Base Lane Voxel Slab
        const pLeft = toIso(-6, lIdx);
        const pRight = toIso(6, lIdx);

        // Ground Color
        let groundColor = '#1e293b';
        let edgeColor = '#0f172a';
        if (lane.type === 'grass') {
          groundColor = lIdx % 2 === 0 ? '#15803d' : '#166534';
          edgeColor = '#14532d';
        } else if (lane.type === 'road') {
          groundColor = '#334155';
          edgeColor = '#1e293b';
        } else if (lane.type === 'river') {
          groundColor = '#0284c7';
          edgeColor = '#0369a1';
        } else if (lane.type === 'rail') {
          groundColor = '#52525b';
          edgeColor = '#3f3f46';
        }

        // Draw Lane Strip
        ctx.fillStyle = groundColor;
        ctx.beginPath();
        ctx.moveTo(pLeft.x, pLeft.y);
        ctx.lineTo(pRight.x, pRight.y);
        ctx.lineTo(pRight.x, pRight.y + TILE_H);
        ctx.lineTo(pLeft.x, pLeft.y + TILE_H);
        ctx.closePath();
        ctx.fill();

        // Lane Depth Edge
        ctx.fillStyle = edgeColor;
        ctx.fillRect(pLeft.x, pLeft.y + TILE_H, pRight.x - pLeft.x, 8);

        // Details on Lanes
        if (lane.type === 'road') {
          // Dashed road divider
          ctx.fillStyle = '#f8fafc';
          for (let x = -5; x <= 5; x += 2) {
            const dp = toIso(x, lIdx);
            ctx.fillRect(dp.x - 8, dp.y + 7, 16, 2.5);
          }

          // Vehicles
          if (lane.vehicles) {
            for (const v of lane.vehicles) {
              const vp = toIso(v.x, lIdx, 0.4);
              const vW = v.width * 26;
              const vH = 18;

              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.3)';
              ctx.fillRect(vp.x - vW / 2, vp.y + 6, vW, 10);

              // 3D Voxel Car Body
              ctx.fillStyle = v.color;
              ctx.fillRect(vp.x - vW / 2, vp.y - vH, vW, vH);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.strokeRect(vp.x - vW / 2, vp.y - vH, vW, vH);

              // Windshield
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(vp.x - vW / 4, vp.y - vH + 2, vW / 2, 7);

              // Headlights
              ctx.fillStyle = '#fef08a';
              if (v.speed > 0) {
                ctx.fillRect(vp.x + vW / 2 - 2, vp.y - 8, 3, 5);
              } else {
                ctx.fillRect(vp.x - vW / 2 - 1, vp.y - 8, 3, 5);
              }
            }
          }
        } else if (lane.type === 'river') {
          // Floating logs
          if (lane.logs) {
            for (const log of lane.logs) {
              const lp = toIso(log.x, lIdx, 0.2);
              const lW = log.width * 28;

              // Log Voxel Cylinder
              ctx.fillStyle = '#78350f';
              ctx.fillRect(lp.x - lW / 2, lp.y - 7, lW, 12);
              ctx.fillStyle = '#92400e';
              ctx.fillRect(lp.x - lW / 2 + 2, lp.y - 9, lW - 4, 3);
            }
          }
        } else if (lane.type === 'grass') {
          // Voxel Trees
          if (lane.trees) {
            for (const tx of lane.trees) {
              const tp = toIso(tx, lIdx, 0);
              // Trunk
              ctx.fillStyle = '#78350f';
              ctx.fillRect(tp.x - 3, tp.y - 12, 6, 14);
              // Foliage Voxel Cube
              ctx.fillStyle = '#15803d';
              ctx.fillRect(tp.x - 12, tp.y - 34, 24, 24);
              ctx.strokeStyle = '#166534';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(tp.x - 12, tp.y - 34, 24, 24);
            }
          }
        } else if (lane.type === 'rail') {
          // Train Rails & Signal
          const isWarning = (lane.trainWarningTimer || 99) < 1.5;
          if (isWarning) {
            // Flashing Red Signal
            const blink = Math.floor(time * 0.008) % 2 === 0;
            ctx.fillStyle = blink ? '#ef4444' : '#475569';
            const sigP = toIso(5.2, lIdx, 0.5);
            ctx.beginPath();
            ctx.arc(sigP.x, sigP.y - 10, 6, 0, Math.PI * 2);
            ctx.fill();
          }

          // Train Body if Active
          if (lane.trainActive && lane.trainX !== undefined) {
            const trainP = toIso(lane.trainX, lIdx, 0.6);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(trainP.x - 110, trainP.y - 28, 220, 26);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(trainP.x - 110, trainP.y - 16, 220, 4);

            // Windows
            ctx.fillStyle = '#38bdf8';
            for (let wx = -90; wx <= 90; wx += 24) {
              ctx.fillRect(trainP.x + wx, trainP.y - 25, 12, 8);
            }
          }
        }

        // Render Player Chicken if in this lane
        if (Math.round(engine.state.playerLane) === lIdx && engine.state.isAlive) {
          const hopArc = Math.sin(engine.state.hopProgress * Math.PI) * 0.8;
          const cp = toIso(engine.state.playerX, engine.state.playerLane, hopArc);

          // Shadow on ground
          const sp = toIso(engine.state.playerX, engine.state.playerLane, 0);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y + 8, 10 * (1 - hopArc * 0.3), 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Chicken Body (White Voxel Cube)
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cp.x - 8, cp.y - 18, 16, 16);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.strokeRect(cp.x - 8, cp.y - 18, 16, 16);

          // Red Crest
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cp.x - 4, cp.y - 24, 8, 6);

          // Yellow Beak
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(cp.x - 3, cp.y - 12, 6, 4);

          // Black Eyes
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(cp.x - 6, cp.y - 16, 2.5, 3);
          ctx.fillRect(cp.x + 3.5, cp.y - 16, 2.5, 3);
        }
      }

      // Eagle Swoop Animation
      if (engine.state.eagleActive) {
        const eagleP = toIso(engine.state.playerX, engine.state.playerLane, engine.state.eagleY);
        // Shadow growing on ground
        const gP = toIso(engine.state.playerX, engine.state.playerLane, 0);
        const shadowScale = Math.min(1.0, Math.max(0.2, (engine.state.eagleY + 10) / 10));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(gP.x, gP.y + 5, 25 * shadowScale, 14 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eagle Wings & Body
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(eagleP.x, eagleP.y);
        ctx.lineTo(eagleP.x - 32, eagleP.y - 14);
        ctx.lineTo(eagleP.x, eagleP.y + 12);
        ctx.lineTo(eagleP.x + 32, eagleP.y - 14);
        ctx.closePath();
        ctx.fill();

        // White Head
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(eagleP.x, eagleP.y + 10, 6, 0, Math.PI * 2);
        ctx.fill();

        // Yellow Beak
        ctx.fillStyle = '#eab308';
        ctx.fillRect(eagleP.x - 2, eagleP.y + 14, 4, 4);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [playSound]);

  return (
    <div className="flex flex-col items-center justify-center p-3 text-foreground max-w-4xl mx-auto select-none">
      {/* Top Header: Score HUD & Highest Record */}
      <div className="w-full bg-card/90 border border-border rounded-xl p-3 mb-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground tracking-wider">점수 (SCORE)</span>
            <div className="text-2xl font-black text-primary font-mono">{score}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">최고 기록</span>
            <div className="text-base font-bold text-warning font-mono">🏆 {highScore}</div>
          </div>

          <button
            onClick={handleRestart}
            className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold rounded-lg text-xs transition-all active:scale-95"
          >
            다시 시작 ↺
          </button>
        </div>
      </div>

      {/* Main 60fps 3D Isometric Voxel Canvas */}
      <div
        className="relative border border-border rounded-xl overflow-hidden shadow-2xl bg-card w-full max-w-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} width={640} height={420} className="w-full h-auto block cursor-pointer" />

        {/* Game Over Modal Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <span className="text-xs font-mono font-bold text-destructive tracking-widest uppercase mb-1">
              GAME OVER
            </span>
            <h2 className="text-3xl font-extrabold text-foreground mb-1">{deathReason}</h2>
            <div className="my-3 flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">도달 거리</div>
                <div className="text-2xl font-black text-primary font-mono">{score} m</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">최고 기록</div>
                <div className="text-2xl font-black text-warning font-mono">{highScore} m</div>
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="mt-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-lg text-sm transition-all"
            >
              다시 도전하기 ↺
            </button>
          </div>
        )}
      </div>

      {/* On-Screen Mobile Touch Controls */}
      <div className="w-full max-w-2xl mt-3 flex items-center justify-between gap-2">
        <div className="flex-1 text-xs text-muted-foreground bg-card/60 border border-border p-2.5 rounded-lg">
          💡 <strong className="text-foreground">조작법:</strong> 키보드 방향키 / WASD / 스페이스바(전진) 또는 화면을 위·아래·좌·우로 스와이프하거나 탭하세요! 너무 오래 멈춰 있으면 독수리가 덮칩니다!
        </div>

        {/* Quick D-Pad Buttons for Touch / Mobile users */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleHop(0, 1)}
            className="w-12 h-10 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg flex items-center justify-center active:scale-95 border border-border"
          >
            ⬆️
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => handleHop(-1, 0)}
              className="w-12 h-10 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg flex items-center justify-center active:scale-95 border border-border"
            >
              ⬅️
            </button>
            <button
              onClick={() => handleHop(0, -1)}
              className="w-12 h-10 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg flex items-center justify-center active:scale-95 border border-border"
            >
              ⬇️
            </button>
            <button
              onClick={() => handleHop(1, 0)}
              className="w-12 h-10 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg flex items-center justify-center active:scale-95 border border-border"
            >
              ➡️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
