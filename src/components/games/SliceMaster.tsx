import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createSliceMasterLevel,
  type Knife,
  type SliceMasterGame,
  type SliceObstacle,
  stepSliceMaster,
  tapFlipKnife,
} from "@/lib/games/slice-master";
import { addTrauma, createShakeState, triggerHaptic, updateShake } from "@/lib/games/juice-engine";
import { playSyntheticTone } from "@/lib/games/audio-mixer";

interface SliceMasterProps {
  locale?: string;
}

export default function SliceMaster({ locale = "ko" }: SliceMasterProps) {
  const [level, setLevel] = useState(1);
  const [game, setGame] = useState<SliceMasterGame>(() => createSliceMasterLevel(1));
  const [bestScore, setBestScore] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  const gameRef = useRef<SliceMasterGame>(game);
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

  // Main high-performance RAF loop (60 FPS)
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

      // Update physics if flying
      const current = gameRef.current;
      if (current.status === "flying" || current.hitStopRemaining > 0) {
        const step = stepSliceMaster(current, dt);

        if (step.slicedObstacles.length > 0) {
          // Trigger juice
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.35);
          triggerHaptic("medium");

          // Play ASMR slice sound with pitch variance
          playSyntheticTone(audioCtxRef.current, {
            freq: 440,
            duration: 0.08,
            type: "triangle",
          });
        }

        if (step.hitTarget) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.7);
          triggerHaptic("combo");
          playSyntheticTone(audioCtxRef.current, {
            freq: 660,
            duration: 0.25,
            type: "sine",
          });
        }

        if (step.hitHazard) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.8);
          triggerHaptic("heavy");
          playSyntheticTone(audioCtxRef.current, {
            freq: 120,
            duration: 0.3,
            type: "sawtooth",
          });
        }

        if (step.stuckFloor) {
          triggerHaptic("light");
          playSyntheticTone(audioCtxRef.current, {
            freq: 260,
            duration: 0.05,
            type: "sine",
          });
        }

        if (step.state.score > bestScore) {
          setBestScore(step.state.score);
        }

        setGame(step.state);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [bestScore, shakeOffset.x, shakeOffset.y]);

  const handleTap = () => {
    if (game.status === "gameover" || game.status === "completed") {
      return;
    }

    const flipped = tapFlipKnife(game);
    setGame(flipped);

    // Flip whoosh
    playSyntheticTone(audioCtxRef.current, {
      freq: 320,
      duration: 0.05,
      type: "sine",
    });
    triggerHaptic("light");
  };

  const handleRestart = () => {
    const fresh = createSliceMasterLevel(level);
    setGame(fresh);
  };

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setGame(createSliceMasterLevel(nextLvl));
  };

  const knife = game.knife;
  const cameraX = game.cameraX;

  return (
    <div
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
      className="mx-auto flex w-full max-w-2xl translate-x-(--shake-x) translate-y-(--shake-y) flex-col items-center gap-4 p-4 select-none"
    >
      {/* Header HUD */}
      <div className="flex w-full items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {locale === "ko" ? "슬라이스 마스터 3D" : "Slice Master 3D"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {locale === "ko"
              ? "탭하여 칼을 회전시키고 장애물을 베어내세요!"
              : "Tap to flip the knife and slice through everything!"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "점수" : "Score"}
            </span>
            <span className="text-xl font-black text-primary">{game.score}</span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "최고" : "Best"}
            </span>
            <span className="text-xl font-black text-foreground">{bestScore}</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage SVG Viewport */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg cursor-pointer"
        onClick={handleTap}
      >
        <svg
          viewBox="0 0 600 400"
          className="h-auto w-full touch-none select-none bg-muted/30"
        >
          <defs>
            {/* Knife Blade Metallic Gradient */}
            <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-sidebar)" />
              <stop offset="50%" stopColor="var(--color-border)" />
              <stop offset="100%" stopColor="var(--color-muted-foreground)" />
            </linearGradient>

            {/* Target Gradient */}
            <radialGradient id="targetGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-destructive)" />
              <stop offset="40%" stopColor="var(--color-sidebar)" />
              <stop offset="70%" stopColor="var(--color-destructive)" />
              <stop offset="100%" stopColor="var(--color-sidebar)" />
            </radialGradient>
          </defs>

          {/* Camera World Group */}
          <g transform={`translate(${-cameraX}, 0)`}>
            {/* Floor Plane */}
            <rect x="0" y="360" width="8000" height="40" className="fill-muted stroke-border" strokeWidth="2" />
            <line x1="0" y1="360" x2="8000" y2="360" className="stroke-primary/40" strokeWidth="3" />

            {/* Obstacles */}
            {game.obstacles.map((obs) => (
              <RenderObstacleSvg key={obs.id} obstacle={obs} />
            ))}

            {/* Knife */}
            <RenderKnifeSvg knife={knife} />
          </g>
        </svg>

        {/* Level & Combo HUD Overlay */}
        <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? `레벨 ${level}` : `Level ${level}`}
          </span>
          {game.combo > 1 && (
            <span className="animate-pulse text-lg font-black text-primary drop-shadow">
              {game.combo}x COMBO! 🔥
            </span>
          )}
        </div>

        {/* Tap Prompt */}
        {game.status === "stuck" && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-background/85 px-4 py-1.5 text-xs font-bold shadow backdrop-blur-sm">
            {locale === "ko" ? "화면을 탭하여 점프 & 회전!" : "Tap screen to flip knife!"}
          </div>
        )}

        {/* Game Over Modal */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">💥</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-destructive">
              {locale === "ko" ? "칼이 튕겨나갔습니다!" : "Knife Failed!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `최종 점수: ${game.score}점 (슬라이스: ${game.sliceCount}회)`
                : `Final Score: ${game.score} (${game.sliceCount} sliced)`}
            </p>
            <Button onClick={handleRestart} size="lg">
              {locale === "ko" ? "다시 도전" : "Try Again"}
            </Button>
          </div>
        )}

        {/* Level Complete Modal */}
        {game.status === "completed" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">🎯</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-primary">
              {locale === "ko" ? "과녁 명중! 레벨 클리어!" : "Target Hit! Stage Clear!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `보너스 획득! 총 ${game.score}점`
                : `Bonus Earned! Total: ${game.score}`}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="outline" size="lg">
                {locale === "ko" ? "다시 플레이" : "Replay"}
              </Button>
              <Button onClick={handleNextLevel} size="lg">
                {locale === "ko" ? "다음 레벨" : "Next Level"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderObstacleSvg({ obstacle }: { obstacle: SliceObstacle }) {
  const { x, y, width, height, type, label, color, sliced } = obstacle;

  if (type === "finish_target") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Target Stand */}
        <line x1={width / 2} y1={height} x2={width / 2} y2={height + 20} className="stroke-muted-foreground" strokeWidth="6" />
        {/* Target Board */}
        <circle cx={width / 2} cy={height / 2} r={width / 2} fill="url(#targetGrad)" className="stroke-destructive" strokeWidth="2" />
        <text
          x={width / 2}
          y={height / 2 + 4}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          className="fill-foreground"
        >
          1000
        </text>
      </g>
    );
  }

  if (type === "metal_hazard") {
    return (
      <g transform={`translate(${x + width / 2}, ${y + height / 2})`}>
        {/* Spiked Gear */}
        <circle r={width / 2 - 2} className="fill-muted-foreground stroke-foreground" strokeWidth="2" />
        <line x1={-width / 2} y1="0" x2={width / 2} y2="0" className="stroke-foreground" strokeWidth="4" />
        <line x1="0" y1={-height / 2} x2="0" y2={height / 2} className="stroke-foreground" strokeWidth="4" />
        <circle r="4" className="fill-border" />
      </g>
    );
  }

  // Fruit or Wood
  if (sliced) {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        style={{ "--item-color": color } as React.CSSProperties}
      >
        {/* Sliced Top Half */}
        <g transform="translate(-4, -10) rotate(-12)">
          <rect
            x="0"
            y="0"
            width={width}
            height={height / 2}
            rx="4"
            fill="var(--item-color)"
            className="stroke-border"
            strokeWidth="1"
          />
        </g>
        {/* Sliced Bottom Half */}
        <g transform="translate(4, 6) rotate(8)">
          <rect
            x="0"
            y={height / 2}
            width={width}
            height={height / 2}
            rx="4"
            fill="var(--item-color)"
            className="stroke-border"
            strokeWidth="1"
          />
        </g>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ "--item-color": color } as React.CSSProperties}
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="8"
        fill="var(--item-color)"
        className="stroke-border"
        strokeWidth="1.5"
      />
      <text
        x={width / 2}
        y={height / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        className="fill-foreground"
      >
        {label.split(" ")[0]}
      </text>
    </g>
  );
}

function RenderKnifeSvg({ knife }: { knife: Knife }) {
  const { x, y, angle } = knife;
  const deg = (angle * 180) / Math.PI;
  const shadowOpacity = Math.max(0.1, 1 - (360 - y) / 300);

  return (
    <>
      {/* Floor Shadow */}
      <ellipse
        cx={x}
        cy="360"
        rx={Math.max(8, 22 * shadowOpacity)}
        ry="3"
        className="fill-foreground"
        opacity={shadowOpacity * 0.35}
      />

      {/* Knife Body: Pivot on handle base */}
      <g transform={`translate(${x}, ${y}) rotate(${deg})`}>
        {/* Handle */}
        <rect x="0" y="-4" width="16" height="8" rx="2" className="fill-muted-foreground stroke-foreground" strokeWidth="1" />
        {/* Guard */}
        <rect x="15" y="-7" width="3" height="14" rx="1" className="fill-primary" />
        {/* Steel Blade */}
        <polygon points="18,-5 54,0 18,5" fill="url(#bladeGrad)" className="stroke-border" strokeWidth="1" />
        <line x1="20" y1="-1" x2="48" y2="0" className="stroke-foreground" strokeWidth="1.2" />
      </g>
    </>
  );
}
