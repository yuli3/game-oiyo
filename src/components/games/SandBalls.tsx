import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Truck,
  Sparkles,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Zap,
} from "lucide-react";
import { SandBallsEngine, type SandBallsState } from "../../lib/games/sand-balls";

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

export default function SandBalls() {
  const [engine] = useState(() => new SandBallsEngine(400, 600, 8));
  const [gameState, setGameState] = useState<SandBallsState>(() => engine.getState());
  const [isMuted, setIsMuted] = useState(false);
  const [isCarving, setIsCarving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const truckOffsetRef = useRef<number>(0);

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Sound synthesis
  const playSound = useCallback((type: "carve" | "clack" | "gate" | "truck_horn" | "win") => {
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

      if (type === "carve") {
        // Sand scratching crunch
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1400;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } else if (type === "clack") {
        // Marble bounce chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600 + Math.random() * 400, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      } else if (type === "gate") {
        // Multiplier portal warp chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      } else if (type === "truck_horn") {
        // Truck dual honk
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = "sawtooth";
        osc2.type = "sawtooth";
        osc1.frequency.setValueAtTime(220, t);
        osc2.frequency.setValueAtTime(277.18, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.42);
        osc2.stop(t + 0.42);
      } else if (type === "win") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(329.63, t);
        osc.frequency.setValueAtTime(440, t + 0.12);
        osc.frequency.setValueAtTime(554.37, t + 0.24);
        osc.frequency.setValueAtTime(659.25, t + 0.36);

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

  const handleReset = (nextLevel = 1) => {
    const fresh = engine.initLevel(nextLevel, 400, 600, 8);
    Object.assign(engine.getState(), fresh);
    setGameState({ ...engine.getState() });
    particlesRef.current = [];
    truckOffsetRef.current = 0;
    playSound("clack");
  };

  const performCarve = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    engine.carve(x, y, 22);
    playSound("carve");

    // Spawn digging dust particles
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 30,
        vy: -10 - Math.random() * 20,
        color: "#fbbf24",
        size: 1.5 + Math.random() * 2.5,
        life: 0.3,
        maxLife: 0.3,
      });
    }
  }, [engine, playSound]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsCarving(true);
    performCarve(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isCarving) return;
    performCarve(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsCarving(false);
  };

  // Main 60fps Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = (time: number) => {
      const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05);
      lastTimeRef.current = time;

      if (gameState.status === "playing") {
        const nextState = engine.update(dt);
        setGameState({ ...nextState });
        if (nextState.status === "victory") {
          playSound("truck_horn");
          playSound("win");
        }
      }

      // 1. Draw Background Sky / Trench Depth
      ctx.fillStyle = "#1e293b"; // Dark trench background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Sand Layer (Where not dug)
      const { cellSize, gridCols, gridRows, dugMask } = gameState;
      ctx.fillStyle = "#d97706"; // Warm amber sand
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (!dugMask[r][c]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }

      // Sand textured highlights
      ctx.fillStyle = "#f59e0b";
      for (let r = 0; r < gridRows; r += 2) {
        for (let c = 0; c < gridCols; c += 2) {
          if (!dugMask[r][c]) {
            ctx.fillRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4);
          }
        }
      }

      // 3. Draw Peg Obstacles
      for (const peg of gameState.pegs) {
        ctx.save();
        ctx.translate(peg.x, peg.y);

        // Wooden post shadow
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.arc(0, 0, peg.radius, 0, Math.PI * 2);
        ctx.fill();

        // Metallic rivet
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(-2, -2, peg.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Draw Multiplier Gates
      for (const gate of gameState.gates) {
        ctx.save();
        ctx.translate(gate.x, gate.y);

        // Neon portal box
        ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
        ctx.fillRect(-gate.w / 2, -gate.h / 2, gate.w, gate.h);
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 2;
        ctx.strokeRect(-gate.w / 2, -gate.h / 2, gate.w, gate.h);

        // Gate banner text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`x${gate.value}`, 0, 0);

        ctx.restore();
      }

      // 5. Draw 3D Shaded Physics Balls
      for (const ball of gameState.balls) {
        if (ball.collected) continue;

        ctx.save();
        ctx.translate(ball.x, ball.y);

        // Ball 3D Radial Gradient Shading
        const grad = ctx.createRadialGradient(
          -ball.radius * 0.3,
          -ball.radius * 0.3,
          ball.radius * 0.1,
          0,
          0,
          ball.radius
        );

        if (ball.isColored) {
          grad.addColorStop(0, "#ffffff"); // Specular highlight
          grad.addColorStop(0.35, ball.color);
          grad.addColorStop(1, "#0f172a"); // Ambient shadow
        } else {
          // Grey neutral ball
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.4, "#94a3b8");
          grad.addColorStop(1, "#334155");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 6. Draw Delivery Truck at Bottom
      const truckY = canvas.height - 45;
      if (gameState.status === "victory") {
        truckOffsetRef.current += 160 * dt; // Drive away on win
      }
      const truckX = canvas.width / 2 + truckOffsetRef.current;

      ctx.save();
      ctx.translate(truckX, truckY);

      // Flatbed container
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(-65, -18, 90, 26);
      ctx.strokeStyle = "#0369a1";
      ctx.lineWidth = 2;
      ctx.strokeRect(-65, -18, 90, 26);

      // Truck cabin
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(25, -28, 38, 36);
      ctx.fillStyle = "#e0f2fe"; // windshield
      ctx.fillRect(45, -24, 14, 16);

      // Wheels
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(-40, 10, 8, 0, Math.PI * 2);
      ctx.arc(0, 10, 8, 0, Math.PI * 2);
      ctx.arc(45, 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(-40, 10, 3, 0, Math.PI * 2);
      ctx.arc(0, 10, 3, 0, Math.PI * 2);
      ctx.arc(45, 10, 3, 0, Math.PI * 2);
      ctx.fill();

      // Load gauge inside flatbed
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${gameState.collectedCount} / ${gameState.truckCapacity}`, -20, 0);

      ctx.restore();

      // 7. Render Digging Dust Particles
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
  }, [gameState, playSound]);

  const loadPercent = Math.min(100, Math.round((gameState.collectedCount / gameState.truckCapacity) * 100));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-lg">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20 text-warning">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-none tracking-tight">샌드 볼스 3D</h2>
            <p className="text-xs text-muted-foreground mt-1">
              실시간 모래 절삭 지형 & 구체 물리 낙하 시뮬레이션
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Reset */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={() => handleReset(gameState.level)}
            aria-label="재시작"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main HUD Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Level */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">LEVEL</span>
          <p className="text-xl font-black tracking-tight text-primary">STAGE {gameState.level}</p>
        </div>

        {/* Collected */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">LOAD CAPACITY</span>
          <p className="text-xl font-black tracking-tight text-warning">
            {gameState.collectedCount} / {gameState.truckCapacity}
          </p>
        </div>

        {/* Total Active Balls */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">BALLS IN PLAY</span>
          <p className="text-xl font-black tracking-tight text-foreground">
            {gameState.balls.filter((b) => !b.collected).length}
          </p>
        </div>

        {/* Colored % */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">TRUCK FILL</span>
          <p className="text-xl font-black tracking-tight text-success">{loadPercent}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1 text-primary">
            <Zap className="h-3.5 w-3.5" />
            트럭 적재 게이지
          </span>
          <span className="text-muted-foreground">{loadPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-150 w-(--truck-w)"
            style={{ "--truck-w": `${loadPercent}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative mx-auto aspect-2/3 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-black shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="h-full w-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Victory Screen */}
        {gameState.status === "victory" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-xs text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success mb-2">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-foreground">TRUCK FULL & DEPARTED!</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              모든 구체를 안전하게 모래에서 구출하여 적재함을 가득 채웠습니다!
            </p>
            <div className="my-3 grid grid-cols-2 gap-4 border border-border rounded-lg p-3 bg-card/60 text-left">
              <div>
                <p className="text-xs text-muted-foreground">SAVED BALLS</p>
                <p className="text-lg font-bold text-success">{gameState.collectedCount} 개</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ACCURACY</p>
                <p className="text-lg font-bold text-warning">{loadPercent}%</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              onClick={() => handleReset(gameState.level + 1)}
            >
              다음 스테이지 도전
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>플레이 팁: 화면을 손가락/마우스로 문질러 모래를 파내세요. 회색 볼을 채색 볼과 접촉시키면 함께 활성화됩니다!</span>
        </div>
      </div>
    </div>
  );
}
