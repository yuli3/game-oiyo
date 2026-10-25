import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CANNON_X,
  CANNON_Y,
  createInitialPeglinGame,
  firePeglinBall,
  type Peg,
  type PeglinGame,
  stepPeglinPhysics,
} from "@/lib/games/peglin-rogue";
import { addTrauma, createShakeState, triggerHaptic, updateShake } from "@/lib/games/juice-engine";
import { playSyntheticTone } from "@/lib/games/audio-mixer";

interface PeglinRogueProps {
  locale?: string;
}

export default function PeglinRogue({ locale = "ko" }: PeglinRogueProps) {
  const [game, setGame] = useState<PeglinGame>(() => createInitialPeglinGame(1));
  const [aimAngle, setAimAngle] = useState(Math.PI / 2); // default straight down
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  const gameRef = useRef<PeglinGame>(game);
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

  // Main 60 FPS physics loop
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
      if (current.status === "firing") {
        const step = stepPeglinPhysics(current, dt);

        if (step.pegHitCount > 0) {
          triggerHaptic("light");
          const pitchBase = 320 + (current.currentTurnDamage % 30) * 18;
          playSyntheticTone(audioCtxRef.current, {
            freq: pitchBase,
            duration: 0.06,
            type: "sine",
            gain: 0.1,
          });
        }

        if (step.bombExploded) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.45);
          triggerHaptic("heavy");
          playSyntheticTone(audioCtxRef.current, {
            freq: 120,
            duration: 0.25,
            type: "sawtooth",
            gain: 0.2,
          });
        }

        if (step.critActivated) {
          triggerHaptic("combo");
          playSyntheticTone(audioCtxRef.current, {
            freq: 880,
            duration: 0.15,
            type: "triangle",
            gain: 0.15,
          });
        }

        if (step.enemyDamaged > 0) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.5);
          triggerHaptic("combo");
        }

        if (step.playerDamaged > 0) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.6);
          triggerHaptic("heavy");
        }

        setGame(step.game);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [shakeOffset.x, shakeOffset.y]);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (game.status !== "aiming") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 480;
    const svgY = ((e.clientY - rect.top) / rect.height) * 420;

    const dx = svgX - CANNON_X;
    const dy = Math.max(10, svgY - CANNON_Y); // constrain downwards
    const angle = Math.atan2(dy, dx);
    // Limit angle between 20 deg and 160 deg downwards
    const clampedAngle = Math.max(Math.PI * 0.12, Math.min(Math.PI * 0.88, angle));
    setAimAngle(clampedAngle);
  };

  const handleFire = () => {
    if (game.status !== "aiming") return;
    const fired = firePeglinBall(game, aimAngle);
    setGame(fired);
    playSyntheticTone(audioCtxRef.current, { freq: 240, duration: 0.1, type: "sine" });
    triggerHaptic("medium");
  };

  const handleNextStage = () => {
    setGame(createInitialPeglinGame(game.stage + 1));
  };

  const handleRestart = () => {
    setGame(createInitialPeglinGame(1));
  };

  const { playerHp, maxPlayerHp, enemy, pegs, activeBall, currentTurnDamage, isCritActive } = game;

  // Aim trajectory line
  const aimTargetX = CANNON_X + Math.cos(aimAngle) * 60;
  const aimTargetY = CANNON_Y + Math.sin(aimAngle) * 60;

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
      {/* Top RPG Battle Bar */}
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
        {/* Player Status */}
        <div className="flex flex-col gap-1 w-32">
          <div className="flex justify-between text-xs font-bold">
            <span>🛡️ {locale === "ko" ? "용사" : "Hero"}</span>
            <span className="text-primary font-black">
              {playerHp}/{maxPlayerHp}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={
                {
                  "--player-hp-pct": `${Math.max(0, (playerHp / maxPlayerHp) * 100)}%`,
                } as React.CSSProperties
              }
              className="h-full w-(--player-hp-pct) bg-primary transition-all duration-300"
            />
          </div>
        </div>

        {/* Turn Damage Counter */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-muted-foreground">
            {locale === "ko" ? "누적 대미지" : "Turn Damage"}
          </span>
          <span className="text-2xl font-black text-foreground">
            {isCritActive ? Math.round(currentTurnDamage * 1.6) : currentTurnDamage}
            {isCritActive && (
              <span className="ml-1 text-xs text-primary font-bold">CRIT! 💥</span>
            )}
          </span>
        </div>

        {/* Enemy Status */}
        <div className="flex flex-col gap-1 w-36 text-right">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-destructive font-black">
              {enemy.hp}/{enemy.maxHp}
            </span>
            <span>
              {enemy.emoji} {enemy.name.split(" ")[0]}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={
                {
                  "--enemy-hp-pct": `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`,
                } as React.CSSProperties
              }
              className="h-full w-(--enemy-hp-pct) bg-destructive transition-all duration-300 ml-auto"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            ⚔️ {locale === "ko" ? `공격 예고: ${enemy.attack}` : `Intent: ${enemy.attack}`}
          </span>
        </div>
      </div>

      {/* Main Pachinko Peg Board SVG */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <svg
          viewBox="0 0 480 400"
          className="h-auto w-full touch-none select-none bg-muted/20"
          onPointerMove={handlePointerMove}
          onClick={handleFire}
        >
          {/* Peg Board Boundaries */}
          <rect
            x="8"
            y="8"
            width="464"
            height="384"
            rx="16"
            fill="none"
            className="stroke-border"
            strokeWidth="3"
          />

          {/* Pegs Grid */}
          {pegs.map((peg) => (
            <RenderPegSvg key={peg.id} peg={peg} />
          ))}

          {/* Aim Cannon & Trajectory Guide */}
          {game.status === "aiming" && (
            <g>
              <line
                x1={CANNON_X}
                y1={CANNON_Y}
                x2={aimTargetX}
                y2={aimTargetY}
                className="stroke-primary"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
              {/* Cannon Body */}
              <circle cx={CANNON_X} cy={CANNON_Y} r="12" className="fill-foreground stroke-card" strokeWidth="2" />
              <circle cx={CANNON_X} cy={CANNON_Y} r="4" className="fill-primary" />
            </g>
          )}

          {/* Active Pachinko Ball */}
          {activeBall && (
            <g transform={`translate(${activeBall.x}, ${activeBall.y})`}>
              <circle r={activeBall.radius} className="fill-foreground stroke-card" strokeWidth="1.5" />
              <circle cx="-1.5" cy="-1.5" r="1.5" className="fill-card" />
            </g>
          )}
        </svg>

        {/* Fire Button Trigger (Mobile Touch Friendly) */}
        {game.status === "aiming" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <Button onClick={handleFire} size="sm">
              {locale === "ko" ? "구슬 발사!" : "Drop Orb!"}
            </Button>
          </div>
        )}

        {/* Victory Modal */}
        {game.status === "won" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">🏆</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-primary">
              {locale === "ko" ? "몬스터 격퇴 완료!" : "Monster Defeated!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `${game.stage}스테이지 승리! 다음 몬스터에게 도전하세요.`
                : `Stage ${game.stage} Cleared! Face the next enemy.`}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="outline" size="lg">
                {locale === "ko" ? "처음부터" : "Restart"}
              </Button>
              <Button onClick={handleNextStage} size="lg">
                {locale === "ko" ? "다음 스테이지" : "Next Stage"}
              </Button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">💀</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-destructive">
              {locale === "ko" ? "용사가 쓰러졌습니다!" : "Hero Defeated!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `도달한 스테이지: ${game.stage}층`
                : `Reached Stage: ${game.stage}`}
            </p>
            <Button onClick={handleRestart} size="lg">
              {locale === "ko" ? "다시 도전" : "Try Again"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderPegSvg({ peg }: { peg: Peg }) {
  const { x, y, type, hit, radius } = peg;

  if (type === "bomb") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle
          r={radius}
          className={hit ? "fill-muted stroke-border" : "fill-destructive stroke-card"}
          strokeWidth="1.5"
          opacity={hit ? 0.3 : 1}
        />
        {!hit && <circle cx="-1" cy="-1" r="1.5" className="fill-card" />}
      </g>
    );
  }

  if (type === "crit") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle
          r={radius}
          className={hit ? "fill-muted stroke-border" : "fill-primary stroke-card"}
          strokeWidth="1.5"
          opacity={hit ? 0.3 : 1}
        />
        {!hit && <circle cx="-1" cy="-1" r="1.5" className="fill-card" />}
      </g>
    );
  }

  if (type === "refresh") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle
          r={radius}
          className={hit ? "fill-muted stroke-border" : "fill-success stroke-card"}
          strokeWidth="1.5"
          opacity={hit ? 0.3 : 1}
        />
        {!hit && <circle cx="-1" cy="-1" r="1.5" className="fill-card" />}
      </g>
    );
  }

  // Normal Peg
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r={radius}
        className={hit ? "fill-muted stroke-border" : "fill-foreground stroke-card"}
        strokeWidth="1.5"
        opacity={hit ? 0.25 : 0.9}
      />
      {!hit && <circle cx="-1" cy="-1" r="1.2" className="fill-card" />}
    </g>
  );
}
