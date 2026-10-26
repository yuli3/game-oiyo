import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IntoTheBreachEngine,
  type MechUnit,
  type VekEnemy,
} from '../../lib/games/into-the-breach';

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export default function IntoTheBreach() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<IntoTheBreachEngine>(new IntoTheBreachEngine());
  const [selectedMechId, setSelectedMechId] = useState<string>('mech-combat');
  const [actionMode, setActionMode] = useState<'move' | 'attack' | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  // HUD Reactive State
  const [powerGrid, setPowerGrid] = useState<number>(6);
  const [maxPowerGrid] = useState<number>(7);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [maxTurns] = useState<number>(4);
  const [gamePhase, setGamePhase] = useState<'player' | 'enemy' | 'victory' | 'defeat'>('player');
  const [mechsState, setMechsState] = useState<MechUnit[]>([]);
  const [screenShake, setScreenShake] = useState<number>(0);

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSound = useCallback((type: 'punch' | 'cannon' | 'artillery' | 'step' | 'power_lost' | 'victory') => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'step') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'punch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'cannon') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'artillery') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'power_lost') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.2);
        osc.frequency.linearRampToValueAtTime(110, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'victory') {
        [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.25, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.35);
        });
      }
    } catch {
      // Audio autoplay gracefully handled
    }
  }, [initAudio]);

  const particlesRef = useRef<VisualParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const syncStateFromEngine = useCallback(() => {
    const s = engineRef.current.state;
    setPowerGrid(s.powerGrid);
    setCurrentTurn(s.turn);
    setGamePhase(s.phase);
    setMechsState([...s.mechs]);
  }, []);

  // Isometric Grid Projection Helpers
  const TILE_W = 56;
  const TILE_H = 28;

  const toIso = useCallback((gx: number, gy: number, originX: number, originY: number) => {
    return {
      x: originX + (gx - gy) * (TILE_W / 2),
      y: originY + (gx + gy) * (TILE_H / 2),
    };
  }, []);

  const fromIso = useCallback((screenX: number, screenY: number, originX: number, originY: number) => {
    const dx = screenX - originX;
    const dy = screenY - originY;
    const gx = Math.floor((dy / (TILE_H / 2) + dx / (TILE_W / 2)) / 2);
    const gy = Math.floor((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
    return { x: gx, y: gy };
  }, []);

  // Select Mech Handler
  const handleSelectMech = useCallback((mechId: string) => {
    initAudio();
    setSelectedMechId(mechId);
    setActionMode(null);
  }, [initAudio]);

  // Execute Move Action
  const handleMoveAction = useCallback((targetX: number, targetY: number) => {
    const engine = engineRef.current;
    const success = engine.moveMech(selectedMechId, targetX, targetY);
    if (success) {
      playSound('step');
      setActionMode(null);
      syncStateFromEngine();
    }
  }, [selectedMechId, playSound, syncStateFromEngine]);

  // Execute Attack Action
  const handleAttackAction = useCallback((targetX: number, targetY: number) => {
    const engine = engineRef.current;
    const mech = engine.state.mechs.find((m) => m.id === selectedMechId);
    if (!mech) return;

    const startPower = engine.state.powerGrid;
    const success = engine.executeAttack(selectedMechId, targetX, targetY);

    if (success) {
      if (mech.mechClass === 'combat') playSound('punch');
      else if (mech.mechClass === 'cannon') playSound('cannon');
      else playSound('artillery');

      setScreenShake(8);
      setActionMode(null);
      syncStateFromEngine();

      if (engine.state.powerGrid < startPower) {
        playSound('power_lost');
      }

      if (engine.state.phase === 'defeat') {
        playSound('power_lost');
      }
    }
  }, [selectedMechId, playSound, syncStateFromEngine]);

  // End Turn
  const handleEndTurn = useCallback(() => {
    initAudio();
    const engine = engineRef.current;
    const startPower = engine.state.powerGrid;
    engine.endTurn();

    setScreenShake(6);
    syncStateFromEngine();

    if (engine.state.powerGrid < startPower) {
      playSound('power_lost');
    }

    if (engine.state.phase === 'victory') {
      playSound('victory');
    } else if (engine.state.phase === 'defeat') {
      playSound('power_lost');
    }
  }, [initAudio, playSound, syncStateFromEngine]);

  // Restart Mission
  const handleRestart = useCallback(() => {
    initAudio();
    engineRef.current = new IntoTheBreachEngine();
    setSelectedMechId('mech-combat');
    setActionMode(null);
    syncStateFromEngine();
  }, [initAudio, syncStateFromEngine]);

  // Canvas Mouse Click & Hover Interactions
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    initAudio();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const originX = canvas.width / 2;
    const originY = 110;
    const { x, y } = fromIso(clickX, clickY, originX, originY);

    if (x >= 0 && x < 8 && y >= 0 && y < 8) {
      const engine = engineRef.current;
      const clickedMech = engine.getMechAt(x, y);

      if (actionMode === 'move') {
        handleMoveAction(x, y);
      } else if (actionMode === 'attack') {
        handleAttackAction(x, y);
      } else if (clickedMech && !clickedMech.isDead) {
        setSelectedMechId(clickedMech.id);
      }
    }
  }, [actionMode, fromIso, handleAttackAction, handleMoveAction, initAudio]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const moveX = (e.clientX - rect.left) * scaleX;
    const moveY = (e.clientY - rect.top) * scaleY;

    const originX = canvas.width / 2;
    const originY = 110;
    const { x, y } = fromIso(moveX, moveY, originX, originY);

    if (x >= 0 && x < 8 && y >= 0 && y < 8) {
      setHoveredTile({ x, y });
    } else {
      setHoveredTile(null);
    }
  }, [fromIso]);

  // Animation Loop: 60fps Isometric Canvas Renderer
  useEffect(() => {
    syncStateFromEngine();
    let animId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const engine = engineRef.current;
      const originX = canvas.width / 2;
      const originY = 110;

      // Update screen shake
      setScreenShake((prev) => Math.max(0, prev - dt * 15));

      // Clear & Background
      ctx.save();
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake * 2;
        const shakeY = (Math.random() - 0.5) * screenShake * 2;
        ctx.translate(shakeX, shakeY);
      }

      // Draw Grid Base Island Drop Shadow & Depth
      ctx.beginPath();
      const rightCorner = toIso(8, 0, originX, originY);
      const bottomCorner = toIso(8, 8, originX, originY);
      const leftCorner = toIso(0, 8, originX, originY);

      // Deep cliffside
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(leftCorner.x, leftCorner.y);
      ctx.lineTo(bottomCorner.x, bottomCorner.y);
      ctx.lineTo(bottomCorner.x, bottomCorner.y + 40);
      ctx.lineTo(leftCorner.x, leftCorner.y + 40);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(bottomCorner.x, bottomCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y + 40);
      ctx.lineTo(bottomCorner.x, bottomCorner.y + 40);
      ctx.closePath();
      ctx.fill();

      // Get valid move and attack tiles for current mech
      const selectedMech = engine.state.mechs.find((m) => m.id === selectedMechId);
      const validMoves = actionMode === 'move' && selectedMech ? engine.getValidMoves(selectedMech) : [];
      const validAttacks = actionMode === 'attack' && selectedMech ? engine.getValidAttackTargets(selectedMech) : [];

      // Depth sorted render (y from 0 to 7, x from 0 to 7)
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const cell = engine.state.grid[y][x];
          const pos = toIso(x, y, originX, originY);

          // Draw Diamond Tile Surface
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x + TILE_W / 2, pos.y + TILE_H / 2);
          ctx.lineTo(pos.x, pos.y + TILE_H);
          ctx.lineTo(pos.x - TILE_W / 2, pos.y + TILE_H / 2);
          ctx.closePath();

          // Terrain coloring
          if (cell.terrain === 'water') {
            const wave = Math.sin(time * 0.003 + x + y) * 10;
            ctx.fillStyle = `rgb(14, ${60 + wave}, ${130 + wave})`;
          } else if (cell.terrain === 'mountain') {
            ctx.fillStyle = '#334155';
          } else if (cell.terrain === 'building') {
            ctx.fillStyle = '#1e293b';
          } else {
            // ground
            const isAlt = (x + y) % 2 === 0;
            ctx.fillStyle = isAlt ? '#1e293b' : '#172033';
          }
          ctx.fill();

          // Tile Outline
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Highlight Valid Moves
          const isMoveTile = validMoves.some((m) => m.x === x && m.y === y);
          if (isMoveTile) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Highlight Valid Attacks
          const isAttackTile = validAttacks.some((a) => a.x === x && a.y === y);
          if (isAttackTile) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Hovered tile indicator
          if (hoveredTile && hoveredTile.x === x && hoveredTile.y === y) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
          }

          // Render Terrain Extrusions (3D isometric height)
          if (cell.terrain === 'mountain') {
            const mH = 26;
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - mH);
            ctx.lineTo(pos.x + TILE_W / 3, pos.y + TILE_H / 2);
            ctx.lineTo(pos.x, pos.y + TILE_H / 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - mH);
            ctx.lineTo(pos.x, pos.y + TILE_H / 2);
            ctx.lineTo(pos.x - TILE_W / 3, pos.y + TILE_H / 2);
            ctx.closePath();
            ctx.fill();
          } else if (cell.terrain === 'building') {
            const bH = 28;
            // Left face
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(pos.x - TILE_W / 3, pos.y + TILE_H / 2);
            ctx.lineTo(pos.x, pos.y + TILE_H);
            ctx.lineTo(pos.x, pos.y + TILE_H - bH);
            ctx.lineTo(pos.x - TILE_W / 3, pos.y + TILE_H / 2 - bH);
            ctx.closePath();
            ctx.fill();

            // Right face
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y + TILE_H);
            ctx.lineTo(pos.x + TILE_W / 3, pos.y + TILE_H / 2);
            ctx.lineTo(pos.x + TILE_W / 3, pos.y + TILE_H / 2 - bH);
            ctx.lineTo(pos.x, pos.y + TILE_H - bH);
            ctx.closePath();
            ctx.fill();

            // Roof
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - bH + 2);
            ctx.lineTo(pos.x + TILE_W / 3, pos.y + TILE_H / 2 - bH);
            ctx.lineTo(pos.x, pos.y + TILE_H - bH);
            ctx.lineTo(pos.x - TILE_W / 3, pos.y + TILE_H / 2 - bH);
            ctx.closePath();
            ctx.fill();

            // Glowing Windows
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(pos.x - 8, pos.y + 6 - bH, 3, 4);
            ctx.fillRect(pos.x + 5, pos.y + 6 - bH, 3, 4);

            // Power icon indicator
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', pos.x, pos.y - bH - 2);
          }

          // Render Mechs at (x, y)
          const mech = engine.getMechAt(x, y);
          if (mech && !mech.isDead) {
            const isSelected = mech.id === selectedMechId;
            const mColor = mech.mechClass === 'combat' ? '#3b82f6' : mech.mechClass === 'cannon' ? '#eab308' : '#10b981';

            // Selection Aura
            if (isSelected) {
              ctx.strokeStyle = '#60a5fa';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(pos.x, pos.y + TILE_H / 2, TILE_W / 3, TILE_H / 3, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Mech Body
            ctx.fillStyle = mColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y + 2, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Mech Visor / Cockpit
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(pos.x - 4, pos.y - 1, 8, 3);

            // HP pips
            for (let i = 0; i < mech.maxHp; i++) {
              ctx.fillStyle = i < mech.hp ? '#22c55e' : '#475569';
              ctx.fillRect(pos.x - 9 + i * 7, pos.y - 14, 5, 4);
            }

            // Action exhausted overlay
            if (mech.hasAttacked) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
              ctx.beginPath();
              ctx.arc(pos.x, pos.y + 2, 12, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Render Veks at (x, y)
          const enemy = engine.getEnemyAt(x, y);
          if (enemy && !enemy.isDead) {
            const vColor = enemy.type === 'firefly' ? '#f97316' : enemy.type === 'hornet' ? '#dc2626' : '#9333ea';

            // Vek Spiky Body
            ctx.fillStyle = vColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y + 4, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fee2e2';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing Alien Eyes
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(pos.x - 5, pos.y + 2, 3, 3);
            ctx.fillRect(pos.x + 2, pos.y + 2, 3, 3);

            // HP pips
            for (let i = 0; i < enemy.maxHp; i++) {
              ctx.fillStyle = i < enemy.hp ? '#ef4444' : '#475569';
              ctx.fillRect(pos.x - 9 + i * 7, pos.y - 12, 5, 4);
            }
          }
        }
      }

      // Render Enemy Attack Intentions (Telegraph Laser Lines & Crosshairs)
      for (const enemy of engine.state.enemies) {
        if (!enemy.isDead && enemy.targetX !== undefined && enemy.targetY !== undefined) {
          const fromPos = toIso(enemy.x, enemy.y, originX, originY);
          const toPos = toIso(enemy.targetX, enemy.targetY, originX, originY);

          // Dotted Threat Line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(fromPos.x, fromPos.y + TILE_H / 2);
          ctx.lineTo(toPos.x, toPos.y + TILE_H / 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated Crosshair on Target Tile
          const pulse = Math.sin(time * 0.008) * 3;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(toPos.x, toPos.y + TILE_H / 2, 12 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Push Direction Arrow
          if (enemy.attackDir && (enemy.attackDir.dx !== 0 || enemy.attackDir.dy !== 0)) {
            const arrowDir = toIso(
              enemy.targetX + enemy.attackDir.dx * 0.6,
              enemy.targetY + enemy.attackDir.dy * 0.6,
              originX,
              originY
            );
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⏩', arrowDir.x, arrowDir.y + TILE_H / 2);
          }
        }
      }

      // Update & Render Floating Text
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.life -= dt;
        ft.y -= dt * 25;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        return ft.life > 0;
      });

      // Update & Render Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        return p.life > 0;
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    actionMode,
    fromIso,
    hoveredTile,
    screenShake,
    selectedMechId,
    syncStateFromEngine,
    toIso,
  ]);

  return (
    <div className="flex flex-col items-center justify-center p-3 text-foreground max-w-4xl mx-auto select-none">
      {/* Top Header: Power Grid & Mission Status */}
      <div className="w-full bg-card/90 border border-border rounded-xl p-3 mb-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground tracking-wider">전력망 (POWER GRID)</span>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: maxPowerGrid }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-6 h-5 rounded flex items-center justify-center font-bold text-xs ${
                    idx < powerGrid
                      ? 'bg-warning text-warning-foreground shadow-md shadow-warning/40 animate-pulse'
                      : 'bg-muted text-muted-foreground border border-border/50'
                  }`}
                >
                  ⚡
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">방어 작전</span>
            <div className="text-base font-bold text-primary">
              턴 {currentTurn} / {maxTurns}
            </div>
          </div>

          <button
            onClick={handleEndTurn}
            disabled={gamePhase !== 'player'}
            className="px-4 py-2 bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-destructive-foreground font-bold rounded-lg shadow-md transition-all active:scale-95 text-sm flex items-center gap-1.5"
          >
            <span>턴 종료 (END TURN)</span>
            <span>⏩</span>
          </button>
        </div>
      </div>

      {/* Main 60fps Isometric Canvas */}
      <div className="relative border border-border rounded-xl overflow-hidden shadow-2xl bg-card">
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="cursor-crosshair block"
        />

        {/* Phase Overlays */}
        {gamePhase === 'victory' && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-3xl font-extrabold text-primary mb-2">섬 방어 성공! (TIMELINE SAVED)</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-5">
              외계 벡(Vek)의 침공으로부터 민간인 전력망과 대도시를 완벽하게 사수했습니다!
            </p>
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-lg"
            >
              새 타임라인 방어하기 ↺
            </button>
          </div>
        )}

        {gamePhase === 'defeat' && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-3xl font-extrabold text-destructive mb-2">전력망 붕괴 (TIMELINE LOST)</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-5">
              도시의 전력망이 모두 파괴되었습니다. 타임라인을 포기하고 과거로 리셋해야 합니다.
            </p>
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-lg shadow-lg"
            >
              타임트래블 재도전 ↺
            </button>
          </div>
        )}
      </div>

      {/* Bottom Command Dashboard: Selected Mech Profile & Action Triggers */}
      <div className="w-full mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        {mechsState.map((mech) => {
          const isSelected = mech.id === selectedMechId;
          const isExhausted = mech.hasAttacked;
          return (
            <div
              key={mech.id}
              onClick={() => handleSelectMech(mech.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                  : 'border-border bg-card/60 hover:border-border/80'
              } ${mech.isDead ? 'opacity-40 grayscale' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-foreground">{mech.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-mono">
                  {mech.mechClass}
                </span>
              </div>

              {/* HP Bar */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs text-muted-foreground mr-1">HP</span>
                {Array.from({ length: mech.maxHp }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-sm ${
                      i < mech.hp ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Status & Action Buttons for Selected Mech */}
              {isSelected && !mech.isDead && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMode(actionMode === 'move' ? null : 'move');
                    }}
                    disabled={mech.hasMoved}
                    className={`flex-1 py-1 text-xs font-bold rounded ${
                      actionMode === 'move'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-primary disabled:opacity-40'
                    }`}
                  >
                    이동 (MOVE)
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMode(actionMode === 'attack' ? null : 'attack');
                    }}
                    disabled={mech.hasAttacked}
                    className={`flex-1 py-1 text-xs font-bold rounded ${
                      actionMode === 'attack'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-muted hover:bg-muted/80 text-destructive disabled:opacity-40'
                    }`}
                  >
                    공격 (ATTACK)
                  </button>
                </div>
              )}

              {isExhausted && !mech.isDead && (
                <div className="text-center text-xs text-muted-foreground mt-1 font-mono">행동 완료</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tactical Strategy Hints */}
      <div className="w-full mt-2 bg-card/60 border border-border rounded-lg p-2.5 text-xs text-muted-foreground flex items-center justify-between">
        <div>
          <span className="font-bold text-warning">💡 전술 팁:</span> 적을 직접 처치하지 못하더라도,{' '}
          <strong className="text-foreground">밀쳐내기(넉백)</strong>로 적의 공격 방향을 건물 밖으로 돌리거나 물/장애물로 밀어붙여 충돌 대미지를 입히세요!
        </div>
        <button
          onClick={handleRestart}
          className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded transition-colors"
        >
          재시작
        </button>
      </div>
    </div>
  );
}
