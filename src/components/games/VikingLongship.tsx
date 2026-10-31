import { useCallback, useEffect, useRef, useState } from "react";
import {
  initializeVikingLongship,
  stepVikingLongship,
  type VikingLongshipState,
} from "../../lib/games/viking-longship";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";

export function VikingLongship() {
  const [gameState, setGameState] = useState<VikingLongshipState>(() => initializeVikingLongship());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef({
    rudder: 0 as -1 | 0 | 1,
    trimDelta: 0,
    fireHarpoon: false,
    toggleAnchor: false,
    toggleOars: false,
    interactIsland: false,
    repairShip: false,
  });

  const getAudioContext = useAudioContext();
  const playTone = useCallback((freq: number, type: OscillatorType = "sine", dur = 0.1) => {
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
  }, [getAudioContext]);

  const { copied, shareText } = useClipboardShare();

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "a":
        case "arrowleft":
          inputRef.current.rudder = -1;
          break;
        case "d":
        case "arrowright":
          inputRef.current.rudder = 1;
          break;
        case "w":
        case "arrowup":
          inputRef.current.trimDelta = 0.8;
          break;
        case "s":
        case "arrowdown":
          inputRef.current.trimDelta = -0.8;
          break;
        case " ":
          inputRef.current.toggleAnchor = true;
          playTone(220, "sine", 0.15);
          break;
        case "r":
          inputRef.current.toggleOars = true;
          playTone(330, "triangle", 0.1);
          break;
        case "f":
          inputRef.current.fireHarpoon = true;
          playTone(520, "square", 0.08);
          break;
        case "e":
          inputRef.current.interactIsland = true;
          playTone(440, "sine", 0.12);
          break;
        case "c":
          inputRef.current.repairShip = true;
          playTone(392, "triangle", 0.15);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "a":
        case "arrowleft":
          if (inputRef.current.rudder === -1) inputRef.current.rudder = 0;
          break;
        case "d":
        case "arrowright":
          if (inputRef.current.rudder === 1) inputRef.current.rudder = 0;
          break;
        case "w":
        case "arrowup":
        case "s":
        case "arrowdown":
          inputRef.current.trimDelta = 0;
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

  // Main 60FPS simulation loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      setGameState((prev) => {
        const next = stepVikingLongship(prev, dt, {
          rudder: inputRef.current.rudder,
          trimDelta: inputRef.current.trimDelta,
          fireHarpoon: inputRef.current.fireHarpoon,
          toggleAnchor: inputRef.current.toggleAnchor,
          toggleOars: inputRef.current.toggleOars,
          interactIsland: inputRef.current.interactIsland,
          repairShip: inputRef.current.repairShip,
        });

        // Reset single-pulse inputs
        inputRef.current.fireHarpoon = false;
        inputRef.current.toggleAnchor = false;
        inputRef.current.toggleOars = false;
        inputRef.current.interactIsland = false;
        inputRef.current.repairShip = false;

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

    // Camera following the ship
    const cameraX = gameState.shipX - width / 2;
    const cameraY = gameState.shipY - height / 2;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Deep Nordic Ocean background
    ctx.fillStyle = "#0c1e33";
    ctx.fillRect(0, 0, width, height);

    // Dynamic wave currents
    ctx.strokeStyle = "rgba(40, 90, 140, 0.25)";
    ctx.lineWidth = 1.5;
    const waveOffset = (gameState.gameTimeSec * 15) % 40;
    for (let x = -40; x < width + 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x - waveOffset, 0);
      ctx.lineTo(x - waveOffset + 30, height);
      ctx.stroke();
    }

    ctx.translate(-cameraX, -cameraY);

    // Render Islands
    for (const isl of gameState.islands) {
      ctx.beginPath();
      ctx.arc(isl.worldX, isl.worldY, isl.radius, 0, Math.PI * 2);
      ctx.fillStyle = isl.biome === "glacier" || isl.biome === "taiga" ? "#2d4a3e" : "#3b5323";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#1b2a1a";
      ctx.stroke();

      // Island Name & Runestone
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(isl.name, isl.worldX, isl.worldY - isl.radius - 8);

      if (isl.hasRunestone) {
        ctx.beginPath();
        ctx.arc(isl.worldX, isl.worldY, 12, 0, Math.PI * 2);
        ctx.fillStyle = isl.runestoneClaimed ? "#eab308" : "#94a3b8";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText("ᚱ", isl.worldX, isl.worldY + 3);
      }
    }

    // Render Bifrost Portal
    if (gameState.bifrostPortal) {
      const portal = gameState.bifrostPortal;
      ctx.save();
      ctx.beginPath();
      ctx.arc(portal.worldX, portal.worldY, 32, 0, Math.PI * 2);
      ctx.fillStyle = portal.isActive ? "rgba(168, 85, 247, 0.4)" : "rgba(100, 116, 139, 0.2)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = portal.isActive ? "#c084fc" : "#475569";
      ctx.stroke();

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(portal.isActive ? "⚡ VALHALLA BIFROST" : "Dormant Gateway", portal.worldX, portal.worldY - 38);
      ctx.restore();
    }

    // Render Sea Monsters
    for (const m of gameState.monsters) {
      if (m.hp <= 0) continue;
      ctx.save();
      ctx.translate(m.worldX, m.worldY);

      if (m.type === "kraken") {
        ctx.fillStyle = "#be123c";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        // Tentacles
        ctx.strokeStyle = "#9f1239";
        ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3 + Math.sin(gameState.gameTimeSec * 4 + i) * 0.3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * 28, Math.sin(ang) * 28);
          ctx.stroke();
        }
      } else {
        // Sea Serpent
        ctx.fillStyle = "#047857";
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#065f46";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Health bar
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(-15, -24, 30, 4);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(-15, -24, 30 * (m.hp / m.maxHp), 4);

      ctx.restore();
    }

    // Render Harpoons
    for (const p of gameState.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.worldX, p.worldY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.restore();
    }

    // Render Longship
    ctx.save();
    ctx.translate(gameState.shipX, gameState.shipY);
    ctx.rotate(gameState.headingRad);

    // Ship Hull (Viking Drakkar)
    ctx.fillStyle = "#854d0e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ca8a04";
    ctx.stroke();

    // Dragon Prow (Front)
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(-4, -20);
    ctx.lineTo(4, -20);
    ctx.closePath();
    ctx.fill();

    // Oars on sides if engaged
    if (gameState.oarsEngaged) {
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.5;
      const oarSwing = Math.sin(gameState.gameTimeSec * 8) * 4;
      for (let y = -10; y <= 10; y += 8) {
        ctx.beginPath();
        ctx.moveTo(-9, y);
        ctx.lineTo(-20, y + oarSwing);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(9, y);
        ctx.lineTo(20, y - oarSwing);
        ctx.stroke();
      }
    }

    // Main Mast & Square Sail (Rotated by sailTrimRad)
    ctx.save();
    ctx.rotate(gameState.sailTrimRad);
    ctx.fillStyle = "#dc2626"; // Crimson Viking striped sail
    ctx.fillRect(-14, -4, 28, 6);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-14, -2, 28, 2);
    ctx.restore();

    ctx.restore(); // Longship restore

    ctx.restore(); // Camera restore

    // Wind HUD in top-right corner
    ctx.save();
    ctx.translate(width - 50, 50);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.stroke();

    // Wind arrow
    ctx.rotate(gameState.windAngleRad);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -14);
    ctx.lineTo(-5, -6);
    ctx.moveTo(0, -14);
    ctx.lineTo(5, -6);
    ctx.stroke();
    ctx.restore();
  }, [gameState]);

  const handleReset = () => {
    setGameState(initializeVikingLongship());
    playTone(440, "sine", 0.15);
  };

  const handleShare = () => {
    shareText(
      `Sailed the Drakkar Longship in Valhalla Seas! Runestones: ${gameState.runestonesFound}/3, Hull: ${gameState.hullHp}% https://game.oiyo.net/viking-longship`
    );
    playTone(660, "triangle", 0.1);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-background text-foreground rounded-xl border border-border shadow-sm">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Viking Longship: Valhalla Seas</h1>
          <p className="text-xs text-muted-foreground">
            Aero-dynamic sailing, Voronoi archipelagos, sea serpents & runestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {copied ? "Copied!" : "Share Voyage"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New Expedition
          </button>
        </div>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          label="Hull Integrity"
          value={`${Math.max(0, Math.floor(gameState.hullHp))}%`}
          highlight={gameState.hullHp < 35}
        />
        <GameStatTile
          label="Wind & Speed"
          value={`${gameState.speed.toFixed(1)} kts (${gameState.windSpeed} kts wind)`}
        />
        <GameStatTile
          label="Runestones"
          value={`${gameState.runestonesFound} / ${gameState.requiredRunestones}`}
          highlight={gameState.bifrostPortal.isActive}
        />
        <GameStatTile
          label="Supplies & Crew"
          value={`${Math.floor(gameState.foodSupplies)} Rations (${gameState.crewCount} crew)`}
        />
      </div>

      {/* Game Canvas Viewport */}
      <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card flex justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={420}
          className="w-full max-w-full aspect-video block"
        />

        {/* Floating status banner */}
        <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-xs px-2.5 py-1 rounded text-xs text-card-foreground border border-border pointer-events-none">
          {gameState.activeLog}
        </div>

        {/* Anchor Indicator */}
        {gameState.isAnchored && (
          <div className="absolute bottom-2 left-2 bg-warning/20 text-warning border border-warning px-2 py-0.5 rounded text-xs font-bold">
            ⚓ ANCHORED
          </div>
        )}

        {/* Victory / Defeat Overlay */}
        {(gameState.status === "victory" || gameState.status === "shipwrecked") && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-3">
            <h2 className="text-2xl font-black">
              {gameState.status === "victory" ? "🏆 Welcomed to Valhalla!" : "💀 Drakkar Shipwrecked"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {gameState.status === "victory"
                ? "You activated all 3 ancient runestones and navigated through the Bifrost Gateway! Eternal glory awaits."
                : "Your hull was crushed or your crew succumbed to the icy abyss. Try again, chieftain."}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 font-bold text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Set Sail Again
            </button>
          </div>
        )}
      </div>

      {/* Controls & Action Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border border-border text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1">Controls:</span>
          <button
            type="button"
            onClick={() => {
              inputRef.current.rudder = -1;
              setTimeout(() => {
                inputRef.current.rudder = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            ◀ Port (A)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.rudder = 1;
              setTimeout(() => {
                inputRef.current.rudder = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Starboard (D) ▶
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.trimDelta = 1.0;
              setTimeout(() => {
                inputRef.current.trimDelta = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Trim Sail (W)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.toggleOars = true;
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            {gameState.oarsEngaged ? "Rest Oars (R)" : "Row Oars (R)"}
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.toggleAnchor = true;
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Anchor (Space)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              inputRef.current.fireHarpoon = true;
            }}
            className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-colors"
          >
            Harpoon (F)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.interactIsland = true;
            }}
            className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Explore Island (E)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.repairShip = true;
            }}
            className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-colors"
          >
            Repair (C) [10 Timber]
          </button>
        </div>
      </div>
    </div>
  );
}

export default VikingLongship;
