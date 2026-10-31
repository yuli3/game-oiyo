import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useDynamicDifficultyPro } from '@/lib/games/engine-suite-unified';
import {
  VampireSurvivorEngine,
  UPGRADE_CATALOG,
  type UpgradeId,
  type VampireSurvivorState,
} from '@/lib/games/vampire-survivor';
import { FloatingJoystick } from '@/lib/games/floating-joystick';
import { addTrauma, createShakeState, triggerHaptic, updateShake } from '@/lib/games/juice-engine';
import { playSyntheticTone } from '@/lib/games/audio-mixer';

interface VampireSurvivorProps {
  locale?: string;
}

export default function VampireSurvivor({ locale = 'ko' }: VampireSurvivorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef<VampireSurvivorEngine>(new VampireSurvivorEngine(2400));
  const joystickRef = useRef<FloatingJoystick>(new FloatingJoystick({ maxRadius: 50, deadzone: 8 }));
  const keysPressedRef = useRef<Record<string, boolean>>({});

  const [gameState, setGameState] = useState<VampireSurvivorState['gameState']>('playing');
  const [hud, setHud] = useState({
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    nextXp: 40,
    kills: 0,
    survivalTime: 0,
    offeredUpgrades: [] as UpgradeId[],
    upgrades: {} as Record<UpgradeId, number>,
  });

  const [joystickVisual, setJoystickVisual] = useState<{
    active: boolean;
    ox: number;
    oy: number;
    cx: number;
    cy: number;
  }>({ active: false, ox: 0, oy: 0, cx: 0, cy: 0 });

  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const shakeStateRef = useRef(createShakeState());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastHpRef = useRef<number>(100);

  const { modifiers, reportAction, reportHit, reportDeath, updateTime: updateDdaTime } =
    useDynamicDifficultyPro();

  // Initialize Web Audio
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Touch & Pointer controls for Floating Joystick
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    joystickRef.current.start(e.pointerId, x, y);
    setJoystickVisual({
      active: true,
      ox: x,
      oy: y,
      cx: x,
      cy: y,
    });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (joystickRef.current.move(e.pointerId, x, y)) {
      const s = joystickRef.current.getState();
      setJoystickVisual({
        active: true,
        ox: s.originX,
        oy: s.originY,
        cx: s.currentX,
        cy: s.currentY,
      });
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (joystickRef.current.end(e.pointerId)) {
      setJoystickVisual((prev) => ({ ...prev, active: false }));
    }
  }, []);

  // Choose Upgrade callback
  const handleSelectUpgrade = (upgradeId: UpgradeId) => {
    const engine = engineRef.current;
    engine.chooseUpgrade(upgradeId);
    reportAction();

    if (audioCtxRef.current) {
      playSyntheticTone(audioCtxRef.current, { freq: 587.33, duration: 0.1, type: 'triangle', gain: 0.2 });
      setTimeout(() => {
        if (audioCtxRef.current) {
          playSyntheticTone(audioCtxRef.current, { freq: 880.0, duration: 0.15, type: 'triangle', gain: 0.25 });
        }
      }, 100);
    }
    triggerHaptic('success');

    const s = engine.getState();
    setGameState(s.gameState);
    setHud({
      hp: s.playerHp,
      maxHp: s.playerMaxHp,
      level: s.playerLevel,
      xp: s.playerXp,
      nextXp: s.nextLevelXp,
      kills: s.killCount,
      survivalTime: Math.floor(s.survivalTime),
      offeredUpgrades: s.offeredUpgrades,
      upgrades: { ...s.upgrades },
    });
  };

  const handleRestart = () => {
    const engine = engineRef.current;
    engine.restart();
    lastHpRef.current = 100;
    const s = engine.getState();
    setGameState(s.gameState);
    setHud({
      hp: s.playerHp,
      maxHp: s.playerMaxHp,
      level: s.playerLevel,
      xp: s.playerXp,
      nextXp: s.nextLevelXp,
      kills: s.killCount,
      survivalTime: 0,
      offeredUpgrades: [],
      upgrades: { ...s.upgrades },
    });
  };

  // Main 60fps Game & Canvas Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let hudTimer = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const engine = engineRef.current;
      const curState = engine.getState();

      // Screen Shake
      if (shakeStateRef.current.trauma > 0.001) {
        const { state, offset } = updateShake(shakeStateRef.current, dt, time / 1000);
        shakeStateRef.current = state;
        setShakeOffset({ x: offset.x, y: offset.y });
      } else if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        setShakeOffset({ x: 0, y: 0 });
      }

      if (curState.gameState === 'playing') {
        // Compute movement input: Joystick or Keyboard
        let vx = 0;
        let vy = 0;

        const jState = joystickRef.current.getState();
        if (jState.active && jState.intensity > 0) {
          vx = jState.vectorX;
          vy = jState.vectorY;
        } else {
          const keys = keysPressedRef.current;
          if (keys['w'] || keys['arrowup']) vy -= 1;
          if (keys['s'] || keys['arrowdown']) vy += 1;
          if (keys['a'] || keys['arrowleft']) vx -= 1;
          if (keys['d'] || keys['arrowright']) vx += 1;
        }

        engine.movePlayer(vx, vy, dt);
        engine.update(dt);
        updateDdaTime(dt);

        // Throttle React state updates to ~10Hz
        hudTimer += dt;
        if (hudTimer > 0.1 || curState.gameState !== 'playing') {
          hudTimer = 0;
          const s = engine.getState();

          // HP 감소 감지 시 DDA 피격 리포트
          if (s.playerHp < lastHpRef.current) {
            reportHit();
          }
          lastHpRef.current = s.playerHp;

          if (s.gameState !== gameState) {
            setGameState(s.gameState);
            if (s.gameState === 'level_up') {
              if (audioCtxRef.current) {
                playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.1, type: 'sine', gain: 0.2 });
              }
              triggerHaptic('combo');
            } else if (s.gameState === 'game_over') {
              addTrauma(shakeStateRef.current, 0.6);
              triggerHaptic('heavy');
              reportDeath();
            }
          }
          setHud({
            hp: s.playerHp,
            maxHp: s.playerMaxHp,
            level: s.playerLevel,
            xp: s.playerXp,
            nextXp: s.nextLevelXp,
            kills: s.killCount,
            survivalTime: Math.floor(s.survivalTime),
            offeredUpgrades: s.offeredUpgrades,
            upgrades: { ...s.upgrades },
          });
        }
      }

      // Render Canvas
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Camera coordinates (centered on player)
      const p = engine.getState();
      const camX = p.playerX - width / 2;
      const camY = p.playerY - height / 2;

      ctx.save();
      ctx.translate(-camX, -camY);

      // 1. Grid Background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      const startX = Math.floor(camX / gridSize) * gridSize;
      const endX = startX + width + gridSize;
      const startY = Math.floor(camY / gridSize) * gridSize;
      const endY = startY + height + gridSize;

      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // 2. Arena Boundary
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, p.arenaWidth, p.arenaHeight);

      // 3. Garlic Aura
      if (p.upgrades.garlic_aura > 0) {
        const auraRadius = 60 + p.upgrades.garlic_aura * 15;
        const pulse = 1 + Math.sin(time * 0.005) * 0.05;
        ctx.beginPath();
        ctx.arc(p.playerX, p.playerY, auraRadius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 4. Holy Bible Orbit
      const books = engine.getBibleBookPositions();
      for (const b of books) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-7, -9, 14, 18);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-7, -9, 14, 18);
        ctx.restore();
      }

      // 5. XP Gems
      for (const gem of engine.gems) {
        ctx.save();
        ctx.translate(gem.x, gem.y);
        ctx.fillStyle = gem.color === 'red' ? '#ef4444' : gem.color === 'green' ? '#22c55e' : '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(0, -gem.radius);
        ctx.lineTo(gem.radius, 0);
        ctx.lineTo(0, gem.radius);
        ctx.lineTo(-gem.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 6. Projectiles
      for (const proj of engine.projectiles) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        if (proj.type === 'missile') {
          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (proj.type === 'knife') {
          ctx.fillStyle = '#e2e8f0';
          const angle = Math.atan2(proj.vy, proj.vx);
          ctx.rotate(angle);
          ctx.fillRect(-8, -2, 16, 4);
        } else if (proj.type === 'lightning') {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -30);
          ctx.lineTo(0, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Enemies
      for (const enemy of engine.enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        if (enemy.type === 'bat') {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'skeleton') {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'ghost') {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'golem') {
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mini HP bar for tanky enemies
        if (enemy.maxHp > 30) {
          const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(-12, -enemy.radius - 8, 24, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-12, -enemy.radius - 8, 24 * hpPct, 4);
        }

        ctx.restore();
      }

      // 8. Player Hero
      ctx.save();
      ctx.translate(p.playerX, p.playerY);

      // Facing indicator
      ctx.rotate(p.playerFacingAngle);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wand/Staff direction line
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();

      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, shakeOffset]);

  // Responsive canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const xpPercent = Math.min(100, Math.floor((hud.xp / hud.nextXp) * 100));
  const hpPercent = Math.max(0, Math.min(100, Math.floor((hud.hp / hud.maxHp) * 100)));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-150 select-none overflow-hidden rounded-xl border border-border bg-background touch-none translate-x-(--shake-x) translate-y-(--shake-y)"
      style={
        {
          '--shake-x': `${shakeOffset.x}px`,
          '--shake-y': `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
    >
      {/* 2D Viewport Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Top HUD: XP Bar */}
      <div className="absolute top-0 left-0 right-0 h-3 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-150 w-(--xp-w)"
          style={{ '--xp-w': `${xpPercent}%` } as React.CSSProperties}
        />
      </div>

      {/* Stats Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-card/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-mono">
          <span className="font-bold text-primary">Lv.{hud.level}</span>
          <span>⏱️ {formatTime(hud.survivalTime)}</span>
          <span>💀 {hud.kills}</span>
          <span
            className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
              modifiers.flowCategory === 'frustrated'
                ? 'bg-success/15 text-success'
                : modifiers.flowCategory === 'bored'
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-primary/15 text-primary'
            }`}
          >
            {modifiers.flowCategory === 'frustrated'
              ? 'DDA: Assist'
              : modifiers.flowCategory === 'bored'
                ? 'DDA: Intense'
                : 'DDA: Flow'}
          </span>
        </div>

        {/* Player HP Bar */}
        <div className="w-32 bg-card/85 backdrop-blur-sm p-1.5 rounded-lg border border-border">
          <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
            <span>HP</span>
            <span>{hud.hp}/{hud.maxHp}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive transition-all duration-100 w-(--hp-w)"
              style={{ '--hp-w': `${hpPercent}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Virtual Floating Joystick Indicator */}
      {joystickVisual.active && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-primary/40 bg-primary/10 transition-opacity w-24 h-24 left-(--joy-left) top-(--joy-top)"
          style={
            {
              '--joy-left': `${joystickVisual.ox - 48}px`,
              '--joy-top': `${joystickVisual.oy - 48}px`,
            } as React.CSSProperties
          }
        >
          {/* Knob */}
          <div
            className="absolute rounded-full bg-primary shadow-md w-9 h-9 left-(--knob-left) top-(--knob-top)"
            style={
              {
                '--knob-left': `${48 + (joystickVisual.cx - joystickVisual.ox) - 18}px`,
                '--knob-top': `${48 + (joystickVisual.cy - joystickVisual.oy) - 18}px`,
              } as React.CSSProperties
            }
          />
        </div>
      )}

      {/* Controls Hint */}
      <div className="absolute bottom-3 left-4 text-xs text-muted-foreground pointer-events-none bg-card/60 backdrop-blur-xs px-2 py-1 rounded">
        {locale === 'ko' ? '드래그 / WASD 키로 360° 이동 (자동 발사)' : 'Drag / WASD keys to move (Auto-aim)'}
      </div>

      {/* Level Up Upgrade Selection Modal */}
      {gameState === 'level_up' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-primary uppercase tracking-wider">Level Up!</span>
              <h2 className="text-lg font-bold text-foreground">
                {locale === 'ko' ? '무기 및 패시브 강화 선택' : 'Select an Upgrade'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'ko' ? '다음 강화 항목 중 하나를 선택하여 생존력을 높이세요.' : 'Choose one power to enhance your build.'}
              </p>
            </div>

            <div className="space-y-2">
              {hud.offeredUpgrades.map((id) => {
                const def = UPGRADE_CATALOG[id];
                const curLvl = hud.upgrades[id] ?? 0;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectUpgrade(id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/80 hover:border-primary transition-all text-left group"
                  >
                    <span className="text-2xl p-2 rounded-md bg-background border border-border">
                      {def.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {def.name}
                        </span>
                        <span className="text-xs font-mono text-primary font-bold">
                          {curLvl === 0 ? 'NEW' : `Lv.${curLvl} → Lv.${curLvl + 1}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {def.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'game_over' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="text-3xl">🪦</div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-destructive">
                {locale === 'ko' ? '사냥 실패' : 'Game Over'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'ko' ? '마물들의 거대한 파도에 삼켜졌습니다.' : 'You were overrun by the horde.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-lg text-xs font-mono">
              <div>
                <span className="text-muted-foreground block">생존 시간</span>
                <span className="text-sm font-bold text-foreground">{formatTime(hud.survivalTime)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">처치 수</span>
                <span className="text-sm font-bold text-foreground">{hud.kills} 마리</span>
              </div>
            </div>

            <Button onClick={handleRestart} className="w-full">
              {locale === 'ko' ? '다시 도전하기' : 'Try Again'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
