import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Shield,
  Crosshair,
  Swords,
  Flame,
  Coins,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Home,
  CheckCircle2,
} from "lucide-react";
import {
  BadNorthEngine,
  type BadNorthState,
  type IslandTile,
  type SquadType,
} from "../../lib/games/bad-north";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export default function BadNorthTactics() {
  const [engine] = useState(() => new BadNorthEngine(9, 9));
  const [gameState, setGameState] = useState<BadNorthState>(() => engine.getState());
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Sound synthesis
  const playSound = useCallback((type: "horn" | "sword" | "bow" | "fire" | "win" | "splash") => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const t = ctx.currentTime;

      if (type === "horn") {
        // Deep medieval war horn
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(165, t);
        osc.frequency.exponentialRampToValueAtTime(147, t + 0.45);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.52);
      } else if (type === "sword") {
        // Clashing steel
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } else if (type === "bow") {
        // Arrow string release
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(480, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.06);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
      } else if (type === "splash") {
        // Water splash knockback
        const bufferSize = ctx.sampleRate * 0.12;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } else if (type === "win") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(261.63, t);
        osc.frequency.setValueAtTime(329.63, t + 0.12);
        osc.frequency.setValueAtTime(392.0, t + 0.24);
        osc.frequency.setValueAtTime(523.25, t + 0.36);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      }
    } catch {
      // AudioContext fallback
    }
  }, []);

  // Reset Island
  const handleReset = () => {
    const fresh = engine.generateIsland(9, 9);
    Object.assign(engine.getState(), fresh);
    setGameState({ ...engine.getState() });
    particlesRef.current = [];
    playSound("horn");
  };

  // Select Squad
  const handleSelectSquad = (squadId: string) => {
    engine.selectSquad(squadId);
    setGameState({ ...engine.getState() });
    playSound("sword");
  };

  // Handle Canvas Click to Reposition Squad
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState.gameStatus !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Convert screen isometric coords back to tile coordinates
    const originX = canvas.width / 2;
    const originY = 120;
    const tileW = 56;
    const tileH = 28;

    // Find closest land tile
    let closestTile: IslandTile | null = null;
    let minDist = Infinity;

    for (const t of gameState.tiles) {
      if (t.height === 0) continue; // 바다 제외

      const isoX = originX + (t.x - t.y) * (tileW / 2);
      const isoY = originY + (t.x + t.y) * (tileH / 2) - t.height * 14;

      const d = Math.hypot(clickX - isoX, clickY - isoY);
      if (d < minDist && d < 32) {
        minDist = d;
        closestTile = t;
      }
    }

    if (closestTile) {
      const moved = engine.moveSelectedSquad(closestTile.x, closestTile.y);
      if (moved) {
        playSound("bow");
        setGameState({ ...engine.getState() });
        // Target flag particle
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: 0,
          vy: -20,
          color: "#3b82f6",
          size: 6,
          life: 0.6,
          maxLife: 0.6,
        });
      }
    }
  };

  // Main 60fps 3D Isometric Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = (time: number) => {
      const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05);
      lastTimeRef.current = time;

      if (!isPaused && gameState.gameStatus === "playing") {
        const nextState = engine.update(dt * gameSpeed);
        setGameState({ ...nextState });
      }

      // Isometric Projection params
      const originX = canvas.width / 2; // 300
      const originY = 120;
      const tileW = 56;
      const tileH = 28;
      const heightStep = 14;

      const toIso = (x: number, y: number, height: number) => ({
        x: originX + (x - y) * (tileW / 2),
        y: originY + (x + y) * (tileH / 2) - height * heightStep,
      });

      // Clear Canvas & Sea Background
      ctx.fillStyle = "#0c4a6e"; // Deep sea ocean
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sea wave patterns
      const waveT = time * 0.002;
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      for (let wy = 20; wy < canvas.height; wy += 35) {
        ctx.beginPath();
        for (let wx = 0; wx < canvas.width; wx += 20) {
          const dy = Math.sin(wx * 0.04 + waveT + wy) * 3;
          if (wx === 0) ctx.moveTo(wx, wy + dy);
          else ctx.lineTo(wx, wy + dy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Draw Island Diorama Tiles (from back to front)
      const sortedTiles = [...gameState.tiles].sort((a, b) => a.x + a.y - (b.x + b.y));

      for (const t of sortedTiles) {
        if (t.height === 0) continue; // 바다는 배경으로 처리

        const { x: px, y: py } = toIso(t.x, t.y, t.height);

        // Tile colors: Sand (height 1) or Grass (height >= 2)
        const isSand = t.height === 1;
        const topColor = isSand ? "#fef08a" : t.height === 2 ? "#4ade80" : "#22c55e";
        const sideColor = isSand ? "#eab308" : "#64748b"; // stone cliff side

        // Draw Cliff Vertical Faces
        const cliffBottom = py + t.height * heightStep;
        ctx.fillStyle = sideColor;
        ctx.beginPath();
        ctx.moveTo(px - tileW / 2, py);
        ctx.lineTo(px, py + tileH / 2);
        ctx.lineTo(px, cliffBottom + tileH / 2);
        ctx.lineTo(px - tileW / 2, cliffBottom);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isSand ? "#ca8a04" : "#475569";
        ctx.beginPath();
        ctx.moveTo(px, py + tileH / 2);
        ctx.lineTo(px + tileW / 2, py);
        ctx.lineTo(px + tileW / 2, cliffBottom);
        ctx.lineTo(px, cliffBottom + tileH / 2);
        ctx.closePath();
        ctx.fill();

        // Draw Top Diamond
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(px, py - tileH / 2);
        ctx.lineTo(px + tileW / 2, py);
        ctx.lineTo(px, py + tileH / 2);
        ctx.lineTo(px - tileW / 2, py);
        ctx.closePath();
        ctx.fill();

        // Subtle grid border
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Selected squad destination highlight
        const selSquad = gameState.squads.find((s) => s.id === gameState.selectedSquadId);
        if (selSquad && Math.round(selSquad.targetX) === t.x && Math.round(selSquad.targetY) === t.y) {
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }

      // Draw Houses with Smoking Chimneys
      for (const h of gameState.houses) {
        if (h.destroyed) {
          // Ruins
          const { x: px, y: py } = toIso(h.x, h.y, 2);
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        const { x: px, y: py } = toIso(h.x, h.y, 2);

        // Cottage base & Thatched roof
        ctx.save();
        ctx.translate(px, py - 12);

        // Wall
        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(-10, -6, 20, 14);
        ctx.strokeStyle = "#78350f";
        ctx.strokeRect(-10, -6, 20, 14);

        // Roof
        ctx.fillStyle = h.isBurning ? "#ef4444" : "#b45309";
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, -6);
        ctx.lineTo(-14, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Chimney & Smoke
        ctx.fillStyle = "#475569";
        ctx.fillRect(4, -16, 4, 8);

        if (h.isBurning) {
          // Fire particles
          if (Math.random() < 0.4) {
            particlesRef.current.push({
              x: px + (Math.random() - 0.5) * 16,
              y: py - 20,
              vx: (Math.random() - 0.5) * 15,
              vy: -25 - Math.random() * 20,
              color: "#f97316",
              size: 3 + Math.random() * 3,
              life: 0.45,
              maxLife: 0.45,
            });
          }
        }

        // HP bar above house
        if (h.hp < 100) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(-12, -26, 24, 4);
          ctx.fillStyle = h.hp > 40 ? "#22c55e" : "#ef4444";
          ctx.fillRect(-12, -26, (h.hp / 100) * 24, 4);
        }

        ctx.restore();
      }

      // Draw Viking Longships
      for (const ship of gameState.ships) {
        if (ship.landed) continue;

        const { x: px, y: py } = toIso(ship.x, ship.y, 0);

        ctx.save();
        ctx.translate(px, py);

        // Longship Hull
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dragon Head Prow
        ctx.fillStyle = "#b45309";
        ctx.fillRect(-20, -6, 5, 8);

        // Striped Sail
        ctx.fillStyle = ship.type === "shield" ? "#3b82f6" : ship.type === "berserker" ? "#ef4444" : "#eab308";
        ctx.fillRect(-2, -18, 4, 14);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, -18, 2, 14);

        // Oars rowing
        const oarAngle = Math.sin(time * 0.008) * 0.35;
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 4);
        ctx.lineTo(-15 + oarAngle * 10, 12);
        ctx.moveTo(10, 4);
        ctx.lineTo(15 + oarAngle * 10, 12);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Raiders
      for (const r of gameState.raiders) {
        const { x: px, y: py } = toIso(r.x, r.y, 1);

        ctx.save();
        ctx.translate(px, py - 4);

        // Raider Body
        ctx.fillStyle = r.type === "berserker" ? "#ef4444" : r.type === "shield" ? "#3b82f6" : "#f97316";
        ctx.beginPath();
        ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Shield or Axe
        if (r.hasShield) {
          ctx.fillStyle = "#1e3a8a";
          ctx.beginPath();
          ctx.arc(4, -3, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (r.type === "berserker") {
          // Twin axes
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-5, -7);
          ctx.lineTo(-2, -1);
          ctx.moveTo(5, -7);
          ctx.lineTo(2, -1);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw Player Squads
      for (const sq of gameState.squads) {
        if (sq.count <= 0) continue;

        const isSelected = sq.id === gameState.selectedSquadId;
        const { x: px, y: py } = toIso(sq.x, sq.y, 2);

        ctx.save();
        ctx.translate(px, py - 4);

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(0, 2, 22, 12, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Squad Formation Units (draw miniature soldiers)
        const squadColor = sq.type === "infantry" ? "#2563eb" : sq.type === "archers" ? "#16a34a" : "#ca8a04";

        const countToDraw = Math.min(sq.count, 9);
        const offsets = [
          { x: 0, y: 0 },
          { x: -6, y: -3 },
          { x: 6, y: -3 },
          { x: -10, y: 0 },
          { x: 10, y: 0 },
          { x: -6, y: 3 },
          { x: 6, y: 3 },
          { x: -12, y: -2 },
          { x: 12, y: -2 },
        ];

        for (let i = 0; i < countToDraw; i++) {
          const off = offsets[i];
          ctx.fillStyle = squadColor;
          ctx.beginPath();
          ctx.arc(off.x, off.y - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Pikes bristle long spears when braced
          if (sq.type === "pikes" && sq.isBraced) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(off.x, off.y - 4);
            ctx.lineTo(off.x + 8, off.y - 12);
            ctx.stroke();
          }
        }

        // Squad Count Badge
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(-10, -18, 20, 10, 4);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${sq.count}`, 0, -10);

        ctx.restore();
      }

      // Draw Flying Arrow Projectiles
      for (const arrow of gameState.arrows) {
        const { x: currentIsoX, y: currentIsoY } = toIso(arrow.currentX, arrow.currentY, 2);
        // Parabolic height arc
        const arcY = Math.sin(arrow.progress * Math.PI) * arrow.arcHeight * 30;

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(currentIsoX, currentIsoY - arcY);
        ctx.lineTo(currentIsoX + 3, currentIsoY - arcY - 4);
        ctx.stroke();
      }

      // Render Particles
      const activeP: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= dt;
        if (p.life > 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          activeP.push(p);
        }
      }
      ctx.globalAlpha = 1.0;
      particlesRef.current = activeP;

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState, isPaused, gameSpeed]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-lg">
      {/* Top Header & Wave Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-none tracking-tight">배드 노스 미니</h2>
            <p className="text-xs text-muted-foreground mt-1">
              바이킹 침략선 상륙 저지 & 실시간 섬 방어 미니멀 RTS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Toggle */}
          <button
            type="button"
            className={`rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition ${
              gameSpeed === 2 ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
            }`}
            onClick={() => setGameSpeed((s) => (s === 1 ? 2 : 1))}
          >
            {gameSpeed}x SPEED
          </button>

          {/* Pause / Play */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? "재개" : "일시정지"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>

          {/* Mute */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Reset Island */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={handleReset}
            aria-label="섬 재생성 및 재시작"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main HUD Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Wave */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">WAVE</span>
          <p className="text-xl font-black tracking-tight text-primary">
            {gameState.wave} / {gameState.maxWave}
          </p>
        </div>

        {/* Houses Intact */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">HOUSES</span>
          <p className="text-xl font-black tracking-tight text-foreground flex items-center justify-center gap-1">
            <Home className="h-4 w-4 text-warning" />
            {gameState.houses.filter((h) => !h.destroyed).length} / {gameState.houses.length}
          </p>
        </div>

        {/* Raiders Left */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">ENEMIES LEFT</span>
          <p className="text-xl font-black tracking-tight text-destructive">
            {gameState.raiders.length + gameState.ships.filter((s) => !s.landed).length * 6}
          </p>
        </div>

        {/* Gold & Kills */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">GOLD / KILLS</span>
          <p className="text-xl font-black tracking-tight text-warning flex items-center justify-center gap-1">
            <Coins className="h-4 w-4" />
            {gameState.gold} ({gameState.totalKills}K)
          </p>
        </div>
      </div>

      {/* 3D Isometric Viewport */}
      <div className="relative mx-auto aspect-4/3 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-black shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          className="h-full w-full cursor-pointer touch-none"
          onClick={handleCanvasClick}
        />

        {/* Victory Screen */}
        {gameState.gameStatus === "victory" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-xs text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success mb-2">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-foreground">ISLAND DEFENDED!</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              모든 바이킹 침략선을 격퇴하고 평화로운 섬을 지켜냈습니다!
            </p>
            <div className="my-3 grid grid-cols-2 gap-4 border border-border rounded-lg p-3 bg-card/60 text-left">
              <div>
                <p className="text-xs text-muted-foreground">HOUSES SAVED</p>
                <p className="text-lg font-bold text-success">{gameState.housesSaved} 채</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">COINS REWARD</p>
                <p className="text-lg font-bold text-warning">+{gameState.gold} Gold</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              다음 섬 방어하기
            </button>
          </div>
        )}

        {/* Defeat Screen */}
        {gameState.gameStatus === "defeat" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-xs text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20 text-destructive mb-2">
              <Flame className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-destructive">ISLAND FALLEN</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              모든 가옥이 불타거나 방어 분대가 전멸하였습니다.
            </p>
            <button
              type="button"
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              섬 방어 재도전
            </button>
          </div>
        )}
      </div>

      {/* 3 Squad Command Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {gameState.squads.map((sq, idx) => {
          const isSelected = sq.id === gameState.selectedSquadId;
          const isDead = sq.count <= 0;

          return (
            <button
              key={sq.id}
              type="button"
              disabled={isDead}
              className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              } ${isDead ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={() => handleSelectSquad(sq.id)}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border">
                  {sq.type === "infantry" ? (
                    <Swords className="h-4 w-4 text-primary" />
                  ) : sq.type === "archers" ? (
                    <Crosshair className="h-4 w-4 text-success" />
                  ) : (
                    <Shield className="h-4 w-4 text-warning" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">
                      {sq.type === "infantry"
                        ? "보병 분대"
                        : sq.type === "archers"
                        ? "궁병 분대"
                        : "창병 분대"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">[{idx + 1}]</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sq.type === "infantry"
                      ? "밀치기 검술 (낙하 치명타)"
                      : sq.type === "archers"
                      ? "원거리 곡사 화살 사격"
                      : sq.isBraced
                      ? "방진 고정 (돌격 즉사 차단)"
                      : "이동 중 (정지 시 방진)"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-foreground">
                  {sq.count} / {sq.maxCount}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {sq.kills} Kills
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Tactics Tips */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>전술 가이드: 분대 클릭 후 섬 타일을 터치하여 이동. 창병은 정지 시 방진, 보병은 적을 바다로 밀쳐냅니다.</span>
        </div>
      </div>
    </div>
  );
}
