import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createShadowStealthGame,
  stepShadowStealth,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  INPUT_UP,
  INPUT_DOWN,
  INPUT_LEFT,
  INPUT_RIGHT,
  INPUT_SHURIKEN,
  INPUT_SMOKE,
  INPUT_TAKEDOWN,
  type ShadowStealthGameState,
} from '../../lib/games/shadow-stealth';
import { useAudioContext } from '../../lib/games/use-audio-context';
import { useClipboardShare } from '../../lib/games/use-clipboard-share';
import { GameStatTile } from '../ui/game/GameStatTile';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export default function ShadowStealth() {
  const [gameState, setGameState] = useState<ShadowStealthGameState>(() =>
    createShadowStealthGame(20261031)
  );
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const inputStateRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    shuriken: false,
    smoke: false,
    takedown: false,
  });

  const getAudioContext = useAudioContext();
  const { copied, shareText } = useClipboardShare();

  const playTone = useCallback(
    (freq: number, type: OscillatorType = 'sine', dur = 0.08) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // Audio suspended
      }
    },
    [getAudioContext]
  );

  const playShurikenSfx = useCallback(() => {
    playTone(750, 'triangle', 0.05);
  }, [playTone]);

  const playSmokeSfx = useCallback(() => {
    playTone(180, 'square', 0.2);
  }, [playTone]);

  const playVictorySfx = useCallback(() => {
    playTone(523.25, 'sine', 0.12);
    setTimeout(() => playTone(659.25, 'sine', 0.15), 100);
    setTimeout(() => playTone(783.99, 'sine', 0.25), 220);
  }, [playTone]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          inputStateRef.current.up = true;
          break;
        case 's':
        case 'arrowdown':
          inputStateRef.current.down = true;
          break;
        case 'a':
        case 'arrowleft':
          inputStateRef.current.left = true;
          break;
        case 'd':
        case 'arrowright':
          inputStateRef.current.right = true;
          break;
        case ' ':
        case 'f':
          inputStateRef.current.shuriken = true;
          playShurikenSfx();
          break;
        case 'e':
          inputStateRef.current.smoke = true;
          playSmokeSfx();
          break;
        case 'q':
          inputStateRef.current.takedown = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          inputStateRef.current.up = false;
          break;
        case 's':
        case 'arrowdown':
          inputStateRef.current.down = false;
          break;
        case 'a':
        case 'arrowleft':
          inputStateRef.current.left = false;
          break;
        case 'd':
        case 'arrowright':
          inputStateRef.current.right = false;
          break;
        case ' ':
        case 'f':
          inputStateRef.current.shuriken = false;
          break;
        case 'e':
          inputStateRef.current.smoke = false;
          break;
        case 'q':
          inputStateRef.current.takedown = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playShurikenSfx, playSmokeSfx]);

  // Main canvas animation & 60fps simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let hasTriggeredVictorySound = false;

    const loop = () => {
      const current = stateRef.current;

      if (!current.isGameOver && !current.isVictory) {
        let mask = 0;
        if (inputStateRef.current.up) mask |= INPUT_UP;
        if (inputStateRef.current.down) mask |= INPUT_DOWN;
        if (inputStateRef.current.left) mask |= INPUT_LEFT;
        if (inputStateRef.current.right) mask |= INPUT_RIGHT;
        if (inputStateRef.current.shuriken) mask |= INPUT_SHURIKEN;
        if (inputStateRef.current.smoke) mask |= INPUT_SMOKE;
        if (inputStateRef.current.takedown) mask |= INPUT_TAKEDOWN;

        stepShadowStealth(current, mask, 1 / 60);

        if (current.isVictory && !hasTriggeredVictorySound) {
          hasTriggeredVictorySound = true;
          playVictorySfx();
        }
      }

      // -------------------------------------------------------------
      // 2D Tactical Stealth Canvas Rendering
      // -------------------------------------------------------------
      const width = canvas.width;
      const height = canvas.height;

      // Fortress tatami floor
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, width, height);

      // Render Shadow Zones
      current.shadows.forEach((shadow) => {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
        ctx.strokeStyle = '#0284c7';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeRect(shadow.x, shadow.y, shadow.w, shadow.h);
        ctx.setLineDash([]);
      });

      // Render Walls & Partitions
      current.walls.forEach((wall) => {
        ctx.fillStyle = '#44403c';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      });

      // Render Secret Scroll
      if (!current.player.hasScroll) {
        const sc = current.scrollLocation;
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📜', sc.x, sc.y + 3);
        ctx.restore();
      }

      // Render Extraction Boat
      const ex = current.escapeLocation;
      ctx.fillStyle = current.player.hasScroll ? '#22c55e' : '#64748b';
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛶', ex.x, ex.y + 4);

      // Render Samurai Guards with dynamic FOV vision cones
      current.guards.forEach((guard) => {
        if (guard.state === 'unconscious') {
          // Sleeping guard
          ctx.save();
          ctx.translate(guard.x, guard.y);
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💤', 0, -10);
          ctx.restore();
          return;
        }

        // Draw Vision Cone
        ctx.save();
        ctx.translate(guard.x, guard.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const halfFov = guard.fovRad * 0.5;
        ctx.arc(0, 0, guard.viewRange, guard.facingRad - halfFov, guard.facingRad + halfFov);
        ctx.closePath();

        const isAlert = guard.state === 'chase';
        const isSuspicious = guard.state === 'suspicious';
        ctx.fillStyle = isAlert
          ? 'rgba(239, 68, 68, 0.35)'
          : isSuspicious
          ? 'rgba(234, 179, 8, 0.25)'
          : 'rgba(245, 158, 11, 0.15)';
        ctx.fill();

        ctx.strokeStyle = isAlert ? '#ef4444' : isSuspicious ? '#eab308' : '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Guard body
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Facing direction visor
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
          Math.cos(guard.facingRad) * 6,
          Math.sin(guard.facingRad) * 6,
          2.5,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Status exclamation badge
        if (isAlert) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', 0, -14);
        } else if (guard.suspicionGauge > 10) {
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', 0, -14);
        }
        ctx.restore();
      });

      // Render Smoke Clouds
      current.smokeClouds.forEach((smoke) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      // Render Flying Shurikens
      current.shurikens.forEach((s) => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Ninja Player
      const p = current.player;
      ctx.save();
      ctx.translate(p.x, p.y);

      // Shadow concealment aura
      if (p.isInShadow) {
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
      }

      // Shinobi body
      ctx.fillStyle = p.isInShadow ? '#0284c7' : '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.isInShadow ? '#38bdf8' : '#71717a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mask slit
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(Math.cos(p.facingRad) * 5, Math.sin(p.facingRad) * 5, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playVictorySfx]);

  // Periodic state sync
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState({ ...stateRef.current });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = () => {
    const fresh = createShadowStealthGame(Date.now());
    stateRef.current = fresh;
    setGameState(fresh);
  };

  const handleShareReplay = () => {
    const token = gameState.replayToken || 'Replay Token pending';
    const text = `🥷 [Shinobi Infiltration Report]\n• Mission: Infiltrate Shogun Fortress\n• Score: ${gameState.score}\n• Scroll Recovered: ${gameState.player.hasScroll ? 'Yes' : 'No'}\n• Escaped: ${gameState.isVictory ? 'Flawless Extraction' : 'In Progress'}\n• Ghost Tape Token: ${token}\nPlay on game.oiyo.net!`;
    shareText(text);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto p-2">
      {/* Top Telemetry Stat Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          icon="👁️"
          label="Alert Status"
          value={gameState.alertLevel > 50 ? 'HIGH ALARM' : gameState.alertLevel > 15 ? 'SUSPICIOUS' : 'STEALTH'}
          highlight={gameState.alertLevel > 50}
        />
        <GameStatTile
          icon="📜"
          label="Secret Scroll"
          value={gameState.player.hasScroll ? 'ACQUIRED' : 'LOCATE SCROLL'}
          highlight={gameState.player.hasScroll}
        />
        <GameStatTile
          icon="🗡️"
          label="Shuriken / Smoke"
          value={`${gameState.player.shurikens} / ${gameState.player.smokeBombs}`}
        />
        <GameStatTile
          icon="🏆"
          label="Infiltration Score"
          value={`${gameState.score}`}
        />
      </div>

      {/* Main Tactical Canvas */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video w-full bg-background flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={ARENA_WIDTH}
            height={ARENA_HEIGHT}
            className="w-full h-full object-contain"
          />

          <div className="absolute top-2 left-2 flex gap-1 items-center bg-background/80 backdrop-blur-sm rounded p-1">
            <Badge variant="outline">
              {gameState.player.isInShadow ? '🌑 Hidden in Shadow' : '☀️ Exposed to Light'}
            </Badge>
            <Badge variant="outline">
              Guards: {gameState.guards.filter((g) => g.state !== 'unconscious').length} Active
            </Badge>
          </div>

          {gameState.isVictory && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <h3 className="text-xl font-bold text-foreground">Flawless Extraction!</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                You stole the Secret Scroll and escaped the Shogun Fortress unseen. Deterministic ghost replay tape compiled!
              </p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={handleShareReplay}>
                  {copied ? 'Replay Copied!' : 'Copy Ghost Replay Token'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRestart}>
                  Play Again
                </Button>
              </div>
            </div>
          )}

          {gameState.isGameOver && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <h3 className="text-xl font-bold text-destructive">Shinobi Apprehended!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                The Samurai Guards cornered you in the corridor.
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={handleRestart}>
                  Retry Infiltration
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Controls & Mission Brief */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Shinobi Field Controls & Ninja Tools
                </h2>
                <p className="text-xs text-muted-foreground">
                  Stick to darkened alcoves. Use shurikens for distractions and smoke bombs to block guard line-of-sight.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShareReplay}>
                  {copied ? 'Copied!' : 'Share Run Stats'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/40 border border-border">
                <span className="font-semibold block text-foreground">Move</span>
                <span className="text-muted-foreground">WASD or Arrow Keys</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border border-border">
                <span className="font-semibold block text-foreground">Shuriken Distraction</span>
                <span className="text-muted-foreground">Space or F key</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border border-border">
                <span className="font-semibold block text-foreground">Smoke Bomb Screen</span>
                <span className="text-muted-foreground">E key (Blocks Guard LOS)</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border border-border">
                <span className="font-semibold block text-foreground">Silent Takedown</span>
                <span className="text-muted-foreground">Q key (from behind guard)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
