import { useCallback, useEffect, useRef, useState } from "react";
import {
  initializeGrapplingBoss,
  stepGrapplingBoss,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  type GrapplingBossState,
} from "../../lib/games/grappling-boss";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";

export function GrapplingBoss() {
  const [gameState, setGameState] = useState<GrapplingBossState>(() => initializeGrapplingBoss());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef({
    moveAxis: 0 as -1 | 0 | 1,
    jump: false,
    fireHook: false,
    aimX: 400,
    aimY: 160,
    fireWeapon: false,
  });

  const getAudioContext = useAudioContext();
  const playTone = useCallback(
    (freq: number, type: OscillatorType = "sine", dur = 0.1) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    },
    [getAudioContext]
  );

  const { copied, shareText } = useClipboardShare();

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "a":
        case "arrowleft":
          inputRef.current.moveAxis = -1;
          break;
        case "d":
        case "arrowright":
          inputRef.current.moveAxis = 1;
          break;
        case "w":
        case "arrowup":
          inputRef.current.jump = true;
          playTone(400, "sine", 0.08);
          break;
        case " ":
          inputRef.current.fireHook = true;
          playTone(520, "triangle", 0.12);
          break;
        case "f":
          inputRef.current.fireWeapon = true;
          playTone(740, "square", 0.06);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "a":
        case "arrowleft":
          if (inputRef.current.moveAxis === -1) inputRef.current.moveAxis = 0;
          break;
        case "d":
        case "arrowright":
          if (inputRef.current.moveAxis === 1) inputRef.current.moveAxis = 0;
          break;
        case "w":
        case "arrowup":
          inputRef.current.jump = false;
          break;
        case " ":
          inputRef.current.fireHook = false;
          break;
        case "f":
          inputRef.current.fireWeapon = false;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playTone]);

  // Mouse aim tracker & click handler
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    inputRef.current.aimX = (e.clientX - rect.left) * scaleX;
    inputRef.current.aimY = (e.clientY - rect.top) * scaleY;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      // Left click fires weapon
      inputRef.current.fireWeapon = true;
      playTone(740, "square", 0.06);
    } else if (e.button === 2) {
      // Right click fires grapple hook
      inputRef.current.fireHook = true;
      playTone(520, "triangle", 0.12);
    }
  };

  // Main 60FPS simulation loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      setGameState((prev) => {
        const next = stepGrapplingBoss(prev, dt, {
          moveAxis: inputRef.current.moveAxis,
          jump: inputRef.current.jump,
          fireHook: inputRef.current.fireHook,
          aimX: inputRef.current.aimX,
          aimY: inputRef.current.aimY,
          fireWeapon: inputRef.current.fireWeapon,
        });

        // Clear pulse inputs
        inputRef.current.jump = false;
        inputRef.current.fireHook = false;
        inputRef.current.fireWeapon = false;

        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2D Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Dark subterranean cavern background
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);

    // Cavern stalactites texture
    ctx.fillStyle = "#18181b";
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, 24);
      ctx.lineTo(x + 40, 0);
      ctx.fill();
    }

    // Floor Spikes / Molten Lava at bottom
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(0, height - 12, width, 12);
    ctx.fillStyle = "#7f1d1d";
    for (let x = 0; x < width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, height - 12);
      ctx.lineTo(x + 8, height - 28);
      ctx.lineTo(x + 16, height - 12);
      ctx.fill();
    }

    // Ground safe walk ledge
    ctx.fillStyle = "#27272a";
    ctx.fillRect(30, height - 45, width - 60, 16);
    ctx.strokeStyle = "#52525b";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, height - 45, width - 60, 16);

    // 1. Render Arena Anchors (Grapple orbs)
    for (const anchor of gameState.anchors) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#0284c7";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glowing core
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Grapple Hook Rope / Chain
    const p = gameState.player;
    if (p.isHooked) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.anchorX, p.anchorY);
      ctx.lineTo(p.x, p.y - 12);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Hook tip at anchor
      ctx.beginPath();
      ctx.arc(p.anchorX, p.anchorY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#eab308";
      ctx.fill();
      ctx.restore();
    }

    // 3. Render Player Character
    ctx.save();
    ctx.translate(p.x, p.y);

    // Player body
    ctx.beginPath();
    ctx.arc(0, -14, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player cape swing effect
    ctx.beginPath();
    ctx.moveTo(-p.vx * 0.04, -8);
    ctx.lineTo(-p.vx * 0.06 - 8, 4);
    ctx.lineTo(p.vx * 0.02 + 4, 2);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.restore();

    // 4. Render Boss (Mechanical Beholder)
    const b = gameState.boss;

    // Render FABRIK Tentacles
    for (const tentacle of b.tentacles) {
      ctx.save();
      const joints = tentacle.joints;
      if (joints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(joints[0].x, joints[0].y);
        for (let i = 1; i < joints.length; i++) {
          ctx.lineTo(joints[i].x, joints[i].y);
        }
        ctx.strokeStyle = b.phase === 2 ? "#b91c1c" : "#71717a";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Mechanical joint knuckles
        for (const j of joints) {
          ctx.beginPath();
          ctx.arc(j.x, j.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#facc15";
          ctx.fill();
        }

        // Blade / Claws at tip
        const tip = joints[joints.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#e2e8f0";
        ctx.fill();
      }
      ctx.restore();
    }

    // Boss Main Body (Eyeball Mech)
    ctx.save();
    ctx.translate(b.x, b.y);

    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fillStyle = b.phase === 2 ? "#991b1b" : "#3f3f46";
    ctx.fill();
    ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#a1a1aa";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Giant Pupil looking at player
    const bToPdx = p.x - b.x;
    const bToPdy = p.y - b.y;
    const bDist = Math.max(1, Math.hypot(bToPdx, bToPdy));
    const pupilOffset = 15;
    const px = (bToPdx / bDist) * pupilOffset;
    const py = (bToPdy / bDist) * pupilOffset;

    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fillStyle = b.phase === 2 ? "#b91c1c" : "#0284c7";
    ctx.fill();

    // Boss Health Bar in World
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(-45, -55, 90, 8);
    ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#22c55e";
    ctx.fillRect(-45, -55, 90 * (b.hp / b.maxHp), 8);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(-45, -55, 90, 8);

    ctx.restore();

    // 5. Render Projectiles
    for (const proj of gameState.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.isHostile ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = proj.isHostile ? "#ef4444" : "#38bdf8";
      ctx.fill();
      ctx.restore();
    }

    // 6. Crosshair at Aim position
    ctx.save();
    ctx.beginPath();
    ctx.arc(inputRef.current.aimX, inputRef.current.aimY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [gameState]);

  const handleReset = () => {
    setGameState(initializeGrapplingBoss());
    playTone(440, "sine", 0.15);
  };

  const handleShare = () => {
    shareText(
      `Terraria Grappling Arena: Fought the Mechanical Beholder, Score: ${gameState.score}, Boss HP: ${gameState.boss.hp}/1000! Play free: https://game.oiyo.net/grappling-boss`
    );
    playTone(660, "triangle", 0.1);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-background text-foreground rounded-xl border border-border shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Grappling Boss Arena: Beholder</h1>
          <p className="text-xs text-muted-foreground">
            Verlet pendulum swing momentum & 2D FABRIK inverse kinematics boss tentacles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {copied ? "Copied!" : "Share Battle"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry Arena
          </button>
        </div>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          label="Player Health"
          value={`${Math.max(0, Math.floor(gameState.playerHp))}%`}
          highlight={gameState.playerHp < 30}
        />
        <GameStatTile
          label="Beholder HP"
          value={`${Math.max(0, Math.floor(gameState.boss.hp))} / 1000`}
          highlight={gameState.boss.phase === 2}
        />
        <GameStatTile
          label="Boss Phase"
          value={gameState.boss.phase === 2 ? "Phase 2 (ENRAGED)" : "Phase 1 (Aerial)"}
          highlight={gameState.boss.phase === 2}
        />
        <GameStatTile
          label="Arena Score"
          value={`${gameState.score} pts`}
        />
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card flex justify-center">
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full max-w-full aspect-video block cursor-crosshair"
        />

        {/* Floating Log Banner */}
        <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-xs px-2.5 py-1 rounded text-xs text-card-foreground border border-border pointer-events-none">
          {gameState.activeLog}
        </div>

        {/* Hook indicator */}
        {gameState.player.isHooked && (
          <div className="absolute bottom-2 left-2 bg-primary/20 text-primary border border-primary px-2 py-0.5 rounded text-xs font-bold pointer-events-none">
            ⛓️ GRAPPLE HOOKED
          </div>
        )}

        {/* Victory / Defeat Overlay */}
        {(gameState.status === "victory" || gameState.status === "defeated") && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-3">
            <h2 className="text-2xl font-black">
              {gameState.status === "victory" ? "🏆 Beholder Annihilated!" : "💀 Slain in the Arena"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {gameState.status === "victory"
                ? `Sensational grapple combat! Felled the Mechanical Beholder with score ${gameState.score}!`
                : "You were crushed by the FABRIK tentacles or consumed by the lava spikes. Master your hook swings!"}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 font-bold text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Challenge Again
            </button>
          </div>
        )}
      </div>

      {/* Controls & Action Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border border-border text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1">Movement:</span>
          <button
            type="button"
            onClick={() => {
              inputRef.current.moveAxis = -1;
              setTimeout(() => {
                inputRef.current.moveAxis = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            ◀ Left (A)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.moveAxis = 1;
              setTimeout(() => {
                inputRef.current.moveAxis = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Right (D) ▶
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.jump = true;
              playTone(400, "sine", 0.08);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Jump / Slingshot (W)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              inputRef.current.fireHook = true;
              playTone(520, "triangle", 0.12);
            }}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Hook (Space / Right-Click)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.fireWeapon = true;
              playTone(740, "square", 0.06);
            }}
            className="px-3 py-1.5 rounded bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-colors"
          >
            Fire Weapon (F / Left-Click)
          </button>
        </div>
      </div>
    </div>
  );
}

export default GrapplingBoss;
