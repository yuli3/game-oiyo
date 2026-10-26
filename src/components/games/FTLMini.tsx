import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FTLEngine,
  type ShipRoom,
  type ShipWeapon,
  type CrewMember,
  type Projectile,
} from '../../lib/games/ftl-mini';
import { Button } from '../ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Shield,
  Crosshair,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface SpaceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const FTLMini: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FTLEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<SpaceParticle[]>([]);

  // Selection state
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Synced Snapshot
  const [playerHull, setPlayerHull] = useState(30);
  const [playerMaxHull, setPlayerMaxHull] = useState(30);
  const [playerShields, setPlayerShields] = useState(1);
  const [playerMaxShields, setPlayerMaxShields] = useState(1);
  const [playerEvasion, setPlayerEvasion] = useState(15);
  const [playerFtl, setPlayerFtl] = useState(0);
  const [playerFreePower, setPlayerFreePower] = useState(1);
  const [playerTotalPower, setPlayerTotalPower] = useState(10);

  const [enemyName, setEnemyName] = useState('Rebel Scout');
  const [enemyHull, setEnemyHull] = useState(12);
  const [enemyMaxHull, setEnemyMaxHull] = useState(12);
  const [enemyShields, setEnemyShields] = useState(1);
  const [enemyMaxShields, setEnemyMaxShields] = useState(1);

  const [scrap, setScrap] = useState(30);
  const [missiles, setMissiles] = useState(8);
  const [sector, setSector] = useState(1);

  const [playerRooms, setPlayerRooms] = useState<ShipRoom[]>([]);
  const [enemyRooms, setEnemyRooms] = useState<ShipRoom[]>([]);
  const [playerWeapons, setPlayerWeapons] = useState<ShipWeapon[]>([]);
  const [playerCrew, setPlayerCrew] = useState<CrewMember[]>([]);

  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  // Web Audio Context for retro FTL SFX
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((type: 'laser' | 'missile' | 'shield' | 'explosion' | 'jump' | 'alarm') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'missile') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(350, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'shield') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'explosion') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Audio fallback
    }
  }, [soundEnabled]);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new FTLEngine();
    syncSnapshot();
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (engineRef.current) {
        const eng = engineRef.current;
        const prevHull = eng.player.hull;
        const prevEnemyHull = eng.enemy.hull;
        const prevProjCount = eng.projectiles.length;

        eng.update(dt);

        if (eng.projectiles.length > prevProjCount) {
          const newest = eng.projectiles[eng.projectiles.length - 1];
          playSfx(newest.weaponType === 'missile' ? 'missile' : 'laser');
        }

        if (eng.player.hull < prevHull) {
          playSfx('explosion');
        }
        if (eng.enemy.hull < prevEnemyHull) {
          playSfx('explosion');
        }

        renderCanvas(eng, dt);
        syncSnapshot();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playSfx]);

  const syncSnapshot = () => {
    const eng = engineRef.current;
    if (!eng) return;

    setPlayerHull(eng.player.hull);
    setPlayerMaxHull(eng.player.maxHull);
    setPlayerShields(eng.player.shields);
    setPlayerMaxShields(eng.player.maxShields);
    setPlayerEvasion(eng.player.evasion);
    setPlayerFtl(Math.round(eng.player.ftlCharge * 100));
    setPlayerFreePower(eng.player.reactorPower);
    setPlayerTotalPower(eng.player.totalReactor);

    setEnemyName(eng.enemy.name);
    setEnemyHull(eng.enemy.hull);
    setEnemyMaxHull(eng.enemy.maxHull);
    setEnemyShields(eng.enemy.shields);
    setEnemyMaxShields(eng.enemy.maxShields);

    setScrap(eng.scrap);
    setMissiles(eng.missiles);
    setSector(eng.sector);

    setPlayerRooms([...eng.player.rooms]);
    setEnemyRooms([...eng.enemy.rooms]);
    setPlayerWeapons([...eng.player.weapons]);
    setPlayerCrew([...eng.player.crew]);

    setGameOver(eng.gameOver);
    setVictory(eng.victory);
  };

  const handleRestart = () => {
    engineRef.current = new FTLEngine();
    setSelectedCrewId(null);
    setSelectedWeaponId(null);
    syncSnapshot();
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    engineRef.current.isPaused = !engineRef.current.isPaused;
    setIsPaused(engineRef.current.isPaused);
  };

  const cycleGameSpeed = () => {
    if (!engineRef.current) return;
    const next = gameSpeed === 1 ? 2 : 1;
    engineRef.current.gameSpeed = next;
    setGameSpeed(next);
  };

  const handleAllocatePower = (roomId: string, delta: number) => {
    if (!engineRef.current) return;
    engineRef.current.allocatePower(roomId, delta);
    syncSnapshot();
  };

  const handleSelectCrew = (crewId: string) => {
    if (selectedCrewId === crewId) {
      setSelectedCrewId(null);
    } else {
      setSelectedCrewId(crewId);
      setSelectedWeaponId(null);
    }
  };

  const handleSelectWeapon = (weaponId: string) => {
    if (selectedWeaponId === weaponId) {
      setSelectedWeaponId(null);
    } else {
      setSelectedWeaponId(weaponId);
      setSelectedCrewId(null);
    }
  };

  const handleJump = () => {
    if (!engineRef.current) return;
    const ok = engineRef.current.jumpSector();
    if (ok) {
      playSfx('jump');
      syncSnapshot();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked a Player Room (for crew movement orders)
    if (selectedCrewId) {
      for (const room of eng.player.rooms) {
        const rx = 10 + room.gridX * 9;
        const ry = 30 + room.gridY * 18;
        if (clickX >= rx && clickX <= rx + 8 && clickY >= ry && clickY <= ry + 16) {
          eng.orderCrewMove(selectedCrewId, room.id);
          setSelectedCrewId(null);
          syncSnapshot();
          return;
        }
      }
    }

    // Check if clicked an Enemy Room (for weapon targeting orders)
    if (selectedWeaponId) {
      for (const room of eng.enemy.rooms) {
        const rx = 65 + room.gridX * 9;
        const ry = 32 + room.gridY * 18;
        if (clickX >= rx && clickX <= rx + 8 && clickY >= ry && clickY <= ry + 16) {
          eng.targetWeapon(selectedWeaponId, room.id);
          setSelectedWeaponId(null);
          syncSnapshot();
          return;
        }
      }
    }
  };

  /**
   * 60fps HTML5 Canvas Render Loop
   */
  const renderCanvas = (eng: FTLEngine, dt: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // Screen Shake
    if (eng.screenShake > 0) {
      const dx = (Math.random() - 0.5) * eng.screenShake * 3;
      const dy = (Math.random() - 0.5) * eng.screenShake * 3;
      ctx.translate(dx, dy);
    }

    // 1. Deep Space Background with Stars
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Distant Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 45; i++) {
      const sx = (i * 127.3) % w;
      const sy = (i * 311.9) % h;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // 2. Render Player Ship (Left side)
    renderShip(ctx, eng.player, 10, 30, w, h, true, selectedCrewId);

    // 3. Render Enemy Ship (Right side)
    renderShip(ctx, eng.enemy, 65, 32, w, h, false, selectedWeaponId);

    // 4. Render Projectiles in Flight
    for (const p of eng.projectiles) {
      renderProjectile(ctx, p, w, h);
    }

    // 5. Render Space Particles & Explosions
    renderParticles(ctx, dt);

    // 6. Floating Damage Texts
    renderFloatingTexts(ctx, eng, w, h);

    ctx.restore();
  };

  const renderShip = (
    ctx: CanvasRenderingContext2D,
    ship: FTLEngine['player'],
    basePctX: number,
    basePctY: number,
    w: number,
    h: number,
    isPlayer: boolean,
    activeSelectionId: string | null
  ) => {
    const shipW = w * 0.38;
    const shipH = h * 0.48;
    const startX = (basePctX / 100) * w;
    const startY = (basePctY / 100) * h;

    // Ship Outer Hull Frame
    ctx.fillStyle = isPlayer ? '#1e293b' : '#3f1c1c';
    ctx.strokeStyle = isPlayer ? '#38bdf8' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX - 10, startY - 10, shipW + 20, shipH + 20, 16);
    ctx.fill();
    ctx.stroke();

    // Shield Energy Bubble
    if (ship.shields > 0) {
      const pulse = Math.sin(Date.now() * 0.005) * 3;
      ctx.strokeStyle = isPlayer ? 'rgba(56, 189, 248, 0.65)' : 'rgba(248, 113, 113, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        startX + shipW / 2,
        startY + shipH / 2,
        shipW / 2 + 16 + pulse,
        shipH / 2 + 16 + pulse,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Rooms
    for (const room of ship.rooms) {
      const rx = (basePctX / 100) * w + room.gridX * (w * 0.09);
      const ry = (basePctY / 100) * h + room.gridY * (h * 0.16);
      const rw = w * 0.082;
      const rh = h * 0.14;

      // Room floor
      ctx.fillStyle = room.damage > 0 ? 'rgba(239, 68, 68, 0.25)' : '#0f172a';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = room.damage >= room.level ? '#ef4444' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);

      // System Name / Label
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, rx + rw / 2, ry + 14);

      // Power Level Indicators (small pips at bottom)
      const pipW = 5;
      for (let p = 0; p < room.level; p++) {
        const px = rx + 6 + p * 8;
        const py = ry + rh - 10;
        ctx.fillStyle = p < room.powered ? (p >= room.level - room.damage ? '#ef4444' : '#22c55e') : '#334155';
        ctx.fillRect(px, py, pipW, 6);
      }

      // Fire Animation Overlay
      if (room.fire > 0) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
        const flameH = Math.min(rh, (room.fire / 100) * rh);
        ctx.fillRect(rx + 2, ry + rh - flameH - 2, rw - 4, flameH);
        ctx.font = '12px sans-serif';
        ctx.fillText('🔥', rx + rw / 2, ry + rh / 2);
      }

      // Target selection highlight
      if (!isPlayer && activeSelectionId) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);
      }
    }

    // Crew members inside ship
    for (const crew of ship.crew) {
      const room = ship.rooms.find(r => r.id === crew.roomId);
      if (!room) continue;

      let cx = (basePctX / 100) * w + room.gridX * (w * 0.09) + w * 0.041;
      let cy = (basePctY / 100) * h + room.gridY * (h * 0.16) + h * 0.07;

      if (crew.targetRoomId) {
        const targetRoom = ship.rooms.find(r => r.id === crew.targetRoomId);
        if (targetRoom) {
          const tx = (basePctX / 100) * w + targetRoom.gridX * (w * 0.09) + w * 0.041;
          const ty = (basePctY / 100) * h + targetRoom.gridY * (h * 0.16) + h * 0.07;
          cx += (tx - cx) * crew.moveProgress;
          cy += (ty - cy) * crew.moveProgress;
        }
      }

      // Crew sprite circle
      ctx.fillStyle = crew.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Crew HP bar
      const hpRatio = crew.hp / crew.maxHp;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 8, cy - 13, 16, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 8, cy - 13, 16 * hpRatio, 3);
    }
  };

  const renderProjectile = (ctx: CanvasRenderingContext2D, p: Projectile, w: number, h: number) => {
    const px = (p.currentX / 100) * w;
    const py = (p.currentY / 100) * h;

    ctx.save();
    if (p.weaponType === 'laser') {
      ctx.fillStyle = p.sourceShip === 'player' ? '#38bdf8' : '#f87171';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // Laser trail
      ctx.strokeStyle = p.sourceShip === 'player' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(248, 113, 113, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (p.sourceShip === 'player' ? 12 : -12), py);
      ctx.stroke();
    } else {
      // Missile
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚀', px, py);
    }
    ctx.restore();
  };

  const renderParticles = (ctx: CanvasRenderingContext2D, dt: number) => {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const renderFloatingTexts = (ctx: CanvasRenderingContext2D, eng: FTLEngine, w: number, h: number) => {
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    for (const ft of eng.floatingTexts) {
      const fx = (ft.x / 100) * w;
      const fy = (ft.y / 100) * h;
      const alpha = Math.max(0, ft.duration / ft.maxDuration);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, fx + 1, fy + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
    }
    ctx.restore();
  };

  const hullPct = Math.round((playerHull / playerMaxHull) * 100);
  const enemyHullPct = Math.round((enemyHull / enemyMaxHull) * 100);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 gap-4 select-none">
      {/* Top Combat HUD */}
      <div className="flex flex-wrap items-center justify-between w-full bg-card/80 border border-border p-3 rounded-xl backdrop-blur-md gap-3">
        {/* Player Hull & Shields */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col min-w-32">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-primary">USS Antigravity</span>
              <span>{playerHull}/{playerMaxHull}</span>
            </div>
            <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden mt-1 border border-border/40">
              <div
                className="bg-primary h-full transition-all duration-150 rounded-full w-(--hull-w)"
                style={{ '--hull-w': `${hullPct}%` } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-info">
            <Shield className="size-4" />
            <span>{playerShields}/{playerMaxShields}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Eva: {playerEvasion}%</span>
            <span>⚡ {playerFreePower}/{playerTotalPower}</span>
          </div>
        </div>

        {/* Resources & Sector */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-warning">🔩 {scrap} Scrap</span>
          <span className="text-destructive">🚀 {missiles} Missiles</span>
          <span className="text-foreground">Sector {sector}</span>
        </div>

        {/* Enemy Status HUD */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col min-w-28 text-right">
            <span className="text-xs font-bold text-destructive">{enemyName}</span>
            <span className="text-xs text-muted-foreground">{enemyHull}/{enemyMaxHull} HP</span>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-1 border border-border/40">
              <div
                className="bg-destructive h-full transition-all duration-150 rounded-full w-(--ehull-w)"
                style={{ '--ehull-w': `${enemyHullPct}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 ml-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={togglePause}
            >
              {isPaused ? <Play className="size-4 text-primary" /> : <Pause className="size-4" />}
            </Button>

            <Button
              variant={gameSpeed === 2 ? 'default' : 'outline'}
              size="sm"
              onClick={cycleGameSpeed}
            >
              <Zap className="size-3.5" /> {gameSpeed}x
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="size-4 text-primary" />
              ) : (
                <VolumeX className="size-4 text-muted-foreground" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRestart}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Spaceship Tactical Combat Canvas */}
      <div className="relative w-full aspect-3/2 bg-card rounded-2xl border-2 border-border shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={960}
          height={640}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Selection Hint Prompt */}
        {(selectedCrewId || selectedWeaponId) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/90 border border-primary/50 px-4 py-1.5 rounded-full shadow-lg text-xs font-bold text-primary flex items-center gap-1.5 pointer-events-none animate-bounce">
            <Sparkles className="size-3.5" />
            {selectedCrewId
              ? 'Click any Player room to dispatch crew member'
              : 'Click any Enemy room to target weapon'}
          </div>
        )}

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-4 z-30">
            {victory ? (
              <>
                <h2 className="text-3xl font-black text-primary tracking-wider">
                  SECTOR CLEARED
                </h2>
                <p className="text-muted-foreground text-xs max-w-sm text-center">
                  The enemy flagship was incinerated. You escaped with valuable scrap.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black text-destructive tracking-wider">HULL BREACH - SHIP LOST</h2>
                <p className="text-muted-foreground text-xs max-w-sm text-center">
                  Your ship was torn apart by enemy fire in Sector {sector}.
                </p>
              </>
            )}
            <Button onClick={handleRestart} size="lg">
              <RotateCcw className="size-4" /> Recommission Starship
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Command Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
        {/* 1. Reactor Power Management */}
        <div className="flex flex-col bg-card/60 border border-border p-3 rounded-xl gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Reactor Systems
            </span>
            <span className="text-xs text-primary font-bold">
              ⚡ {playerFreePower} Free
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {playerRooms.map(room => (
              <div
                key={room.id}
                className="flex items-center justify-between bg-muted/40 px-2 py-1 rounded text-xs"
              >
                <span className="font-semibold text-foreground">{room.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-mono">
                    {room.powered}/{room.level}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAllocatePower(room.id, -1)}
                    className="size-5 flex items-center justify-center bg-card border border-border rounded text-xs font-bold hover:bg-muted"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAllocatePower(room.id, 1)}
                    className="size-5 flex items-center justify-center bg-primary/20 text-primary border border-primary/40 rounded text-xs font-bold hover:bg-primary/30"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Weapon Battery & Targeting */}
        <div className="flex flex-col bg-card/60 border border-border p-3 rounded-xl gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Weapon Arsenal
            </span>
            <span className="text-xs text-muted-foreground">Click to target</span>
          </div>

          <div className="flex flex-col gap-2">
            {playerWeapons.map(weapon => {
              const isSelected = selectedWeaponId === weapon.id;
              const chargePct = Math.round(weapon.chargeProgress * 100);
              const targetRoom = enemyRooms.find(r => r.id === weapon.targetRoomId);

              return (
                <button
                  key={weapon.id}
                  type="button"
                  onClick={() => handleSelectWeapon(weapon.id)}
                  className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/20 ring-2 ring-primary/40'
                      : 'border-border/60 bg-muted/40 hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{weapon.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Crosshair className="size-3" />
                      {targetRoom ? targetRoom.name : 'No Target'}
                    </span>
                  </div>

                  {/* Charge progress bar */}
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1.5 border border-border/40">
                    <div
                      className="bg-primary h-full transition-all duration-100 rounded-full w-(--charge-w)"
                      style={{ '--charge-w': `${chargePct}%` } as React.CSSProperties}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Crew Roster & FTL Jump */}
        <div className="flex flex-col bg-card/60 border border-border p-3 rounded-xl gap-2 justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Crew Manifest
              </span>
              <span className="text-xs text-muted-foreground">Click to move</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {playerCrew.map(crew => {
                const isSelected = selectedCrewId === crew.id;
                const currentRoom = playerRooms.find(r => r.id === crew.roomId);

                return (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => handleSelectCrew(crew.id)}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/20 ring-2 ring-primary/40'
                        : 'border-border/60 bg-muted/40 hover:bg-muted/70'
                    }`}
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full inline-block bg-(--crew-c)"
                        style={{ '--crew-c': crew.color } as React.CSSProperties}
                      />
                      {crew.name}
                    </span>
                    <span className="text-muted-foreground">
                      {currentRoom ? currentRoom.name : 'Transit'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FTL Jump Action */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-xs font-bold text-info">
                <span>FTL Drive</span>
                <span>{playerFtl}%</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-1 border border-border/40">
                <div
                  className="bg-info h-full transition-all duration-150 rounded-full w-(--ftl-w)"
                  style={{ '--ftl-w': `${playerFtl}%` } as React.CSSProperties}
                />
              </div>
            </div>

            <Button
              size="sm"
              variant={playerFtl >= 100 ? 'default' : 'outline'}
              disabled={playerFtl < 100}
              onClick={handleJump}
            >
              FTL Jump
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
