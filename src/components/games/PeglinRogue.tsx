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
import { useArcadePortal } from "@/lib/games/arcade-portal";
import { celebrate } from "@/lib/games/celebration";
import { loadHighScore, saveHighScore } from "@/lib/games/game-save";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "@/lib/games/share-card";
import { useCardTiltPro, MobileHapticsPro, useGameJuicePro, RetroChiptuneSynth, getRetroChiptuneBgm } from "@/lib/games/engine-suite-unified";
import { getSpriteUrl, PEGLIN_ROGUE_SPRITES } from "@/lib/games/sprites";
import { Maximize2, Minimize2, Share2, Check, RotateCcw, Target, Volume2, VolumeX } from "lucide-react";

function TiltPeglinButton({
  children,
  onClick,
  className = "",
  disabled = false,
  title,
  ariaLabel,
  ariaPressed,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  type?: "button" | "submit";
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type={type}
      onClick={() => {
        triggerPop(0.15);
        onClick?.();
      }}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transition-transform duration-100 ease-out active:scale-95 disabled:pointer-events-none disabled:opacity-50 transform-(--card-tilt) ${className}`}
      style={{ "--card-tilt": transformCss || "none" } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

interface PeglinRogueProps {
  locale?: string;
}

export default function PeglinRogue({ locale = "ko" }: PeglinRogueProps) {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal();
  const [copied, setCopied] = useState(false);
  const [game, setGame] = useState<PeglinGame>(() => createInitialPeglinGame(1));
  const [highScore, setHighScore] = useState(() => loadHighScore("peglin-rogue", 0));
  const [aimAngle, setAimAngle] = useState(Math.PI / 2); // default straight down

  useEffect(() => {
    if (game.status === "won" || game.status === "gameover") {
      const score = game.stage * 1000 + (game.enemy.maxHp - game.enemy.hp);
      const { isNewBest, bestScore } = saveHighScore("peglin-rogue", score);
      if (isNewBest) setHighScore(bestScore);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oiyo:game-score", { detail: { slug: "peglin-rogue", score } }));
      }
    }
  }, [game.status, game.stage, game.enemy.hp, game.enemy.maxHp]);
  const { addTrauma, shakeCssVars } = useGameJuicePro();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Retro Chiptune BGM loop
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (soundEnabled && game.status !== "gameover" && game.status !== "won") {
      bgm.playTheme("gothic-rogue");
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [soundEnabled, game.status]);

  const gameRef = useRef<PeglinGame>(game);
  gameRef.current = game;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const victoryHandledRef = useRef(false);
  const gameOverHandledRef = useRef(false);

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

      const current = gameRef.current;
      if (current.status === "firing") {
        const step = stepPeglinPhysics(current, dt);

        if (step.pegHitCount > 0) {
          MobileHapticsPro.light();
          addTrauma(0.12);
          const pitchBase = 320 + (current.currentTurnDamage % 30) * 18;
          if (audioCtxRef.current) {
            RetroChiptuneSynth.playBlip(audioCtxRef.current, pitchBase);
          }
        }

        if (step.bombExploded) {
          addTrauma(0.55);
          MobileHapticsPro.heavy();
          if (audioCtxRef.current) {
            RetroChiptuneSynth.playExplosion(audioCtxRef.current);
          }
        }

        if (step.critActivated) {
          addTrauma(0.25);
          MobileHapticsPro.medium();
          if (audioCtxRef.current) {
            RetroChiptuneSynth.playPowerup(audioCtxRef.current);
          }
        }

        if (step.enemyDamaged > 0) {
          addTrauma(0.4);
          MobileHapticsPro.heavy();
          if (audioCtxRef.current) {
            RetroChiptuneSynth.playHit(audioCtxRef.current);
          }
        }

        if (step.playerDamaged > 0) {
          addTrauma(0.65);
          MobileHapticsPro.heavy();
          if (audioCtxRef.current) {
            RetroChiptuneSynth.playHit(audioCtxRef.current);
          }
        }

        setGame(step.game);
      } else if (current.status === "won" && !victoryHandledRef.current) {
        victoryHandledRef.current = true;
        addTrauma(0.5);
        MobileHapticsPro.heavy();
        if (audioCtxRef.current) {
          RetroChiptuneSynth.playPowerup(audioCtxRef.current);
        }
        celebrate(containerRef.current, { preset: "stardust" });
      } else if (current.status === "gameover" && !gameOverHandledRef.current) {
        gameOverHandledRef.current = true;
        addTrauma(0.7);
        MobileHapticsPro.error();
        if (audioCtxRef.current) {
          RetroChiptuneSynth.playGameOver(audioCtxRef.current);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [addTrauma]);

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
    if (audioCtxRef.current) {
      RetroChiptuneSynth.playLaser(audioCtxRef.current);
    }
    MobileHapticsPro.medium();
  };

  const handleNextStage = () => {
    victoryHandledRef.current = false;
    gameOverHandledRef.current = false;
    MobileHapticsPro.medium();
    setGame(createInitialPeglinGame(game.stage + 1));
  };

  const handleRestart = () => {
    victoryHandledRef.current = false;
    gameOverHandledRef.current = false;
    MobileHapticsPro.medium();
    setGame(createInitialPeglinGame(1));
  };

  const handleShare = async () => {
    MobileHapticsPro.medium();
    const canvas = createShareCardCanvas({
      title: "Peglin Rogue Pachinko",
      slug: "peglin-rogue",
      score: `Stage ${game.stage}`,
      subtitle: `Hero HP: ${game.playerHp}/${game.maxPlayerHp} • VS ${game.enemy.name}`,
    });
    const success = await copyShareCardToClipboard(canvas);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `peglin-rogue-stage${game.stage}.png`);
    }
  };

  const { playerHp, maxPlayerHp, enemy, pegs, activeBall, currentTurnDamage, isCritActive } = game;

  // Aim trajectory line
  const aimTargetX = CANNON_X + Math.cos(aimAngle) * 60;
  const aimTargetY = CANNON_Y + Math.sin(aimAngle) * 60;

  const shakeX = shakeCssVars["--shake-x"];
  const shakeY = shakeCssVars["--shake-y"];
  const shakeRot = shakeCssVars["--shake-rot"];

  return (
    <div
      ref={containerRef}
      style={
        {
          "--shake-x": shakeX,
          "--shake-y": shakeY,
          "--shake-rot": shakeRot,
        } as React.CSSProperties
      }
      className={`select-none transition-colors duration-200 translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot) ${
        isImmersive
          ? "fixed inset-0 z-50 bg-background flex flex-col justify-between p-3 sm:p-4 overflow-y-auto"
          : "mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-3 sm:p-4"
      }`}
    >
      {/* Top Controls & Status Bar */}
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm gap-2">
        {/* Player Status */}
        <div className="flex flex-col gap-1 w-28 sm:w-32">
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
        <div className="flex flex-col gap-1 w-32 sm:w-36 text-right">
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

        <div className="flex items-center gap-1.5">
          <TiltPeglinButton
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground"
            ariaLabel={soundEnabled ? (locale === "ko" ? "사운드 끄기" : "Mute Sound") : (locale === "ko" ? "사운드 켜기" : "Unmute Sound")}
          >
            {soundEnabled ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
          </TiltPeglinButton>

          <TiltPeglinButton
            onClick={handleShare}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground"
            ariaLabel="Share Battle Record"
          >
            {copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
          </TiltPeglinButton>

          <TiltPeglinButton
            onClick={togglePortal}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground"
            ariaLabel={isImmersive ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </TiltPeglinButton>
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
              <image
                href={PEGLIN_ROGUE_SPRITES.orb}
                x={-activeBall.radius * 1.8}
                y={-activeBall.radius * 1.8}
                width={activeBall.radius * 3.6}
                height={activeBall.radius * 3.6}
                className="select-none pointer-events-none filter drop-shadow-md"
              />
            </g>
          )}
        </svg>

        {/* Fire Button Trigger (Mobile Touch Friendly) */}
        {game.status === "aiming" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <TiltPeglinButton
              onClick={handleFire}
              className="px-4 py-2 rounded-full bg-primary font-bold text-xs text-primary-foreground shadow-lg flex items-center gap-1.5"
            >
              <Target className="size-4" /> {locale === "ko" ? "구슬 발사!" : "Drop Orb!"}
            </TiltPeglinButton>
          </div>
        )}

        {/* Victory Modal */}
        {game.status === "won" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm animate-in zoom-in-95">
            <img
              src={PEGLIN_ROGUE_SPRITES.trophy}
              alt="Victory Trophy"
              width={80}
              height={80}
              className="size-20 object-contain animate-bounce drop-shadow-xl mb-3 select-none pointer-events-none"
              draggable={false}
            />
            <h3 className="mb-1 text-2xl font-black tracking-tight text-primary">
              {locale === "ko" ? "몬스터 격퇴 완료!" : "Monster Defeated!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `${game.stage}스테이지 승리! 다음 몬스터에게 도전하세요.`
                : `Stage ${game.stage} Cleared! Face the next enemy.`}
            </p>
            <div className="flex gap-3">
              <TiltPeglinButton
                onClick={handleRestart}
                className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted"
              >
                {locale === "ko" ? "처음부터" : "Restart"}
              </TiltPeglinButton>
              <TiltPeglinButton
                onClick={handleShare}
                className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted flex items-center gap-1.5"
              >
                {copied ? <Check className="size-4 text-primary" /> : <Share2 className="size-4" />} {locale === "ko" ? "기록 공유" : "Share"}
              </TiltPeglinButton>
              <TiltPeglinButton
                onClick={handleNextStage}
                className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow"
              >
                {locale === "ko" ? "다음 스테이지" : "Next Stage"}
              </TiltPeglinButton>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <img
              src={getSpriteUrl("star", 64)}
              alt="Stage Record"
              width={64}
              height={64}
              className="size-12 object-contain drop-shadow-md mb-2 opacity-80"
            />
            <h3 className="mb-1 text-2xl font-black tracking-tight text-destructive">
              {locale === "ko" ? "용사가 쓰러졌습니다!" : "Hero Defeated!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `도달한 스테이지: ${game.stage}층`
                : `Reached Stage: ${game.stage}`}
            </p>
            <div className="flex items-center gap-3">
              <TiltPeglinButton
                onClick={handleRestart}
                className="px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow flex items-center gap-1.5"
              >
                <RotateCcw className="size-4" /> {locale === "ko" ? "다시 도전" : "Try Again"}
              </TiltPeglinButton>
              <TiltPeglinButton
                onClick={handleShare}
                className="px-4 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted flex items-center gap-1.5"
              >
                {copied ? <Check className="size-4 text-primary" /> : <Share2 className="size-4" />} {locale === "ko" ? "기록 공유" : "Share"}
              </TiltPeglinButton>
            </div>
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
          r={radius * 1.3}
          className={hit ? "fill-muted stroke-border" : "fill-destructive/20 stroke-destructive"}
          strokeWidth="1.5"
          opacity={hit ? 0.3 : 1}
        />
        <circle
          r={radius * 0.85}
          className={hit ? "fill-muted" : "fill-destructive"}
          opacity={hit ? 0.3 : 1}
        />
        {!hit && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            className="select-none pointer-events-none"
          >
            💣
          </text>
        )}
      </g>
    );
  }

  if (type === "crit") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <image
          href={PEGLIN_ROGUE_SPRITES.pegCrit}
          x={-radius * 1.5}
          y={-radius * 1.5}
          width={radius * 3}
          height={radius * 3}
          opacity={hit ? 0.35 : 1}
          className="select-none pointer-events-none filter drop-shadow-xs"
        />
      </g>
    );
  }

  if (type === "refresh") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <image
          href={PEGLIN_ROGUE_SPRITES.pegRefresh}
          x={-radius * 1.5}
          y={-radius * 1.5}
          width={radius * 3}
          height={radius * 3}
          opacity={hit ? 0.35 : 1}
          className="select-none pointer-events-none filter drop-shadow-xs"
        />
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
