import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  changeRunnerLane,
  createInitialSubwayRunnerGame,
  jumpRunner,
  type RunnerObstacle,
  type RunnerPlayer,
  slideRunner,
  stepSubwayRunner,
  type SubwayRunnerGame,
} from "@/lib/games/subway-runner";
import { addTrauma, createShakeState, triggerHaptic, updateShake } from "@/lib/games/juice-engine";
import { playSyntheticTone } from "@/lib/games/audio-mixer";

interface SubwayRunnerProps {
  locale?: string;
}

export default function SubwayRunner({ locale = "ko" }: SubwayRunnerProps) {
  const [game, setGame] = useState<SubwayRunnerGame>(() => createInitialSubwayRunnerGame());
  const [bestScore, setBestScore] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  const gameRef = useRef<SubwayRunnerGame>(game);
  gameRef.current = game;

  const shakeStateRef = useRef(createShakeState());
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  // Main high-performance 60 FPS physics loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;

      // Update screen shake
      if (shakeStateRef.current.trauma > 0.001) {
        const { state, offset } = updateShake(shakeStateRef.current, dt, time / 1000);
        shakeStateRef.current = state;
        setShakeOffset({ x: offset.x, y: offset.y });
      } else if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        setShakeOffset({ x: 0, y: 0 });
      }

      const current = gameRef.current;
      if (current.status === "running") {
        const step = stepSubwayRunner(current, dt);

        if (step.collectedCoinCount > 0) {
          triggerHaptic("light");
          const coinFreq = 587.33 + (step.game.coins % 8) * 60;
          playSyntheticTone(audioCtxRef.current, {
            freq: coinFreq,
            duration: 0.07,
            type: "sine",
            gain: 0.12,
          });
        }

        if (step.crashed) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.85);
          triggerHaptic("heavy");
          playSyntheticTone(audioCtxRef.current, {
            freq: 110,
            duration: 0.35,
            type: "sawtooth",
            gain: 0.25,
          });
        }

        if (step.game.score > bestScore) {
          setBestScore(step.game.score);
        }

        setGame(step.game);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [bestScore, shakeOffset.x, shakeOffset.y]);

  // Keyboard controls (A/D/W/S and Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameRef.current.status !== "running") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        setGame((prev) => changeRunnerLane(prev, -1));
        triggerHaptic("light");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        setGame((prev) => changeRunnerLane(prev, 1));
        triggerHaptic("light");
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
        e.preventDefault();
        setGame((prev) => jumpRunner(prev));
        playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.08, type: "triangle" });
        triggerHaptic("medium");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setGame((prev) => slideRunner(prev));
        playSyntheticTone(audioCtxRef.current, { freq: 220, duration: 0.08, type: "sawtooth" });
        triggerHaptic("medium");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Touch swipe handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameRef.current.status !== "running") return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) return; // ignore tiny tap

    if (absDx > absDy) {
      if (dx < 0) {
        setGame((prev) => changeRunnerLane(prev, -1));
        triggerHaptic("light");
      } else {
        setGame((prev) => changeRunnerLane(prev, 1));
        triggerHaptic("light");
      }
    } else {
      if (dy < 0) {
        setGame((prev) => jumpRunner(prev));
        playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.08, type: "triangle" });
        triggerHaptic("medium");
      } else {
        setGame((prev) => slideRunner(prev));
        playSyntheticTone(audioCtxRef.current, { freq: 220, duration: 0.08, type: "sawtooth" });
        triggerHaptic("medium");
      }
    }
  };

  const handleRestart = () => {
    setGame(createInitialSubwayRunnerGame());
  };

  const { player, obstacles, score, coins, speed, distance } = game;

  return (
    <div
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
      className="mx-auto flex w-full max-w-xl translate-x-(--shake-x) translate-y-(--shake-y) flex-col items-center gap-4 p-4 select-none"
    >
      {/* Header HUD */}
      <div className="flex w-full items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {locale === "ko" ? "러너 빌더 3D" : "Subway Mini-Parkour"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {locale === "ko"
              ? "좌우 스와이프 차선 변경, 점프와 슬라이딩으로 무한 질주!"
              : "Swipe left/right to change lanes, jump and slide to sprint indefinitely!"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "점수" : "Score"}
            </span>
            <span className="text-xl font-black text-primary">{score}</span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "코인" : "Coins"}
            </span>
            <span className="text-xl font-black text-foreground">🪙 {coins}</span>
          </div>
        </div>
      </div>

      {/* Main 3D Runner SVG Viewport */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          viewBox="0 0 500 400"
          className="h-auto w-full touch-none select-none bg-muted/30"
        >
          <defs>
            {/* Speed Warp Tunnel Gradient */}
            <linearGradient id="tunnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-muted)" stopOpacity="0.8" />
              <stop offset="40%" stopColor="var(--color-card)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-background)" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Background Subway Tunnel & Track Floor */}
          <rect x="0" y="0" width="500" height="400" fill="url(#tunnelGrad)" />

          {/* 3D Perspective Tracks: 3 lanes */}
          {/* Horizon at y = 140, base width = 420, horizon width = 60 */}
          {/* Left Track */}
          <polygon
            points="40,390 220,140 230,140 100,390"
            className="fill-muted stroke-border"
            strokeWidth="1.5"
            opacity="0.8"
          />
          {/* Center Track */}
          <polygon
            points="180,390 245,140 255,140 320,390"
            className="fill-muted stroke-border"
            strokeWidth="1.5"
            opacity="0.8"
          />
          {/* Right Track */}
          <polygon
            points="400,390 270,140 280,140 460,390"
            className="fill-muted stroke-border"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Speed line accents */}
          <line x1="20" y1="360" x2="210" y2="150" className="stroke-primary/30" strokeWidth="2" strokeDasharray="20 40" />
          <line x1="480" y1="360" x2="290" y2="150" className="stroke-primary/30" strokeWidth="2" strokeDasharray="20 40" />

          {/* Sort obstacles from back (z high) to front (z low) */}
          {obstacles
            .filter((o) => o.z >= 0 && o.z <= 120 && !o.collected)
            .sort((a, b) => b.z - a.z)
            .map((obs) => (
              <RenderObstacle3D key={obs.id} obstacle={obs} />
            ))}

          {/* Render Player Character in 3D */}
          <RenderPlayer3D player={player} />
        </svg>

        {/* Speed & Distance HUD Overlay */}
        <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-0.5">
          <span className="text-xs font-bold text-muted-foreground">
            {distance.toFixed(0)}m 질주 중
          </span>
          <span className="text-xs font-semibold text-primary">
            ⚡ {speed.toFixed(1)} m/s
          </span>
        </div>

        {/* Mobile On-Screen Controls */}
        <div className="absolute bottom-3 inset-x-4 flex justify-between items-center pointer-events-auto">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGame((prev) => changeRunnerLane(prev, -1));
                triggerHaptic("light");
              }}
            >
              ◀
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGame((prev) => changeRunnerLane(prev, 1));
                triggerHaptic("light");
              }}
            >
              ▶
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGame((prev) => jumpRunner(prev));
                playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.08, type: "triangle" });
                triggerHaptic("medium");
              }}
            >
              ▲ 점프
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGame((prev) => slideRunner(prev));
                playSyntheticTone(audioCtxRef.current, { freq: 220, duration: 0.08, type: "sawtooth" });
                triggerHaptic("medium");
              }}
            >
              ▼ 슬라이딩
            </Button>
          </div>
        </div>

        {/* Game Over Modal */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">💥</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-destructive">
              {locale === "ko" ? "충돌했습니다!" : "Crashed!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `최종 점수: ${score}점 (질주 거리: ${distance.toFixed(0)}m, 코인: ${coins}개)`
                : `Final Score: ${score} (${distance.toFixed(0)}m, Coins: ${coins})`}
            </p>
            <Button onClick={handleRestart} size="lg">
              {locale === "ko" ? "다시 질주하기" : "Run Again"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 3D Perspective Projection Helper:
 * Projects (laneX, heightY, distanceZ) to 2D SVG canvas (x, y, scale)
 */
function project3D(laneX: number, heightY: number, distanceZ: number): { x: number; y: number; scale: number } {
  const fov = 35;
  const scale = Math.max(0.08, Math.min(1.4, fov / (distanceZ + fov)));
  const laneSpacing = 160;

  const horizonY = 140;
  const groundY = 360;

  const x = 250 + laneX * laneSpacing * scale;
  const y = groundY - (groundY - horizonY) * (1 - scale) - heightY * 40 * scale;

  return { x, y, scale };
}

function RenderPlayer3D({ player }: { player: RunnerPlayer }) {
  const { x: laneX, y: jumpY, isSliding } = player;
  // Player is fixed at z = 2.5
  const { x, y, scale } = project3D(laneX, jumpY, 2.5);

  const shadowScale = Math.max(0.2, 1 - jumpY * 0.4);

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Floor Shadow */}
      <ellipse
        cx="0"
        cy={jumpY * 40 * scale + 15}
        rx={16 * scale * shadowScale}
        ry={4 * scale * shadowScale}
        className="fill-foreground"
        opacity="0.35"
      />

      {isSliding ? (
        // Sliding posture (low flat profile)
        <g transform={`scale(${scale})`}>
          <rect x="-18" y="-10" width="36" height="16" rx="6" className="fill-primary stroke-card" strokeWidth="2" />
          <circle cx="12" cy="-4" r="6" className="fill-foreground" />
          {/* Spark trail */}
          <line x1="-22" y1="6" x2="-32" y2="8" className="stroke-chart-5" strokeWidth="2" />
        </g>
      ) : (
        // Running or jumping posture
        <g transform={`scale(${scale})`}>
          {/* Body */}
          <rect x="-12" y="-32" width="24" height="28" rx="6" className="fill-primary stroke-card" strokeWidth="2" />
          {/* Head & Cap */}
          <circle cx="0" cy="-38" r="9" className="fill-foreground stroke-card" strokeWidth="1.5" />
          <path d="M -9 -41 L 6 -45 L 8 -41 Z" className="fill-chart-5" />
          {/* Hoverboard / Shoes */}
          <rect x="-14" y="-3" width="28" height="6" rx="3" className="fill-chart-3 stroke-card" strokeWidth="1" />
        </g>
      )}
    </g>
  );
}

function RenderObstacle3D({ obstacle }: { obstacle: RunnerObstacle }) {
  const { lane, z, type } = obstacle;
  const { x, y, scale } = project3D(lane, 0, z);

  if (type === "coin") {
    return (
      <g transform={`translate(${x}, ${y - 12 * scale}) scale(${scale})`}>
        <circle r="10" className="fill-chart-3 stroke-card" strokeWidth="2" />
        <circle r="6" className="fill-chart-5" />
        <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-card">
          ★
        </text>
      </g>
    );
  }

  if (type === "barrier_jump") {
    // Low hurdle barrier
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        {/* Posts */}
        <line x1="-24" y1="0" x2="-24" y2="-18" className="stroke-card" strokeWidth="4" />
        <line x1="24" y1="0" x2="24" y2="-18" className="stroke-card" strokeWidth="4" />
        {/* Warning Plank */}
        <rect x="-26" y="-18" width="52" height="10" rx="2" className="fill-destructive stroke-card" strokeWidth="1.5" />
        <line x1="-16" y1="-18" x2="-8" y2="-8" className="stroke-card" strokeWidth="2" />
        <line x1="8" y1="-18" x2="16" y2="-8" className="stroke-card" strokeWidth="2" />
      </g>
    );
  }

  if (type === "barrier_slide") {
    // High overhead barrier
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        {/* Tall Posts */}
        <line x1="-26" y1="0" x2="-26" y2="-36" className="stroke-card" strokeWidth="4" />
        <line x1="26" y1="0" x2="26" y2="-36" className="stroke-card" strokeWidth="4" />
        {/* Overhead Barrier Block */}
        <rect x="-28" y="-36" width="56" height="16" rx="3" className="fill-chart-5 stroke-card" strokeWidth="1.5" />
        <text x="0" y="-25" textAnchor="middle" fontSize="7" fontWeight="bold" className="fill-foreground">
          ▼ SLIDE ▼
        </text>
      </g>
    );
  }

  // Train Block
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <rect x="-30" y="-45" width="60" height="45" rx="6" className="fill-muted-foreground stroke-card" strokeWidth="2" />
      {/* Train Windshield */}
      <rect x="-22" y="-40" width="44" height="16" rx="2" className="fill-info stroke-card" strokeWidth="1" />
      {/* Train Headlights */}
      <circle cx="-16" cy="-14" r="4" className="fill-chart-3" />
      <circle cx="16" cy="-14" r="4" className="fill-chart-3" />
    </g>
  );
}
