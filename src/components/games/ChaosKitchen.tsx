import { useCallback, useEffect, useRef, useState } from "react";
import {
  initializeChaosKitchen,
  stepChaosKitchen,
  KITCHEN_GRID,
  KITCHEN_WIDTH,
  KITCHEN_HEIGHT,
  type ChaosKitchenState,
} from "../../lib/games/chaos-kitchen";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";

export function ChaosKitchen() {
  const [gameState, setGameState] = useState<ChaosKitchenState>(() => initializeChaosKitchen());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef({
    chef1Mask: 0,
    chef2Mask: 0,
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          inputRef.current.chef1Mask |= 1;
          break;
        case "s":
        case "arrowdown":
          inputRef.current.chef1Mask |= 2;
          break;
        case "a":
        case "arrowleft":
          inputRef.current.chef1Mask |= 4;
          break;
        case "d":
        case "arrowright":
          inputRef.current.chef1Mask |= 8;
          break;
        case " ":
          inputRef.current.chef1Mask |= 16;
          playTone(440, "sine", 0.08);
          break;
        case "f":
          inputRef.current.chef1Mask |= 32;
          playTone(600, "triangle", 0.06);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          inputRef.current.chef1Mask &= ~1;
          break;
        case "s":
        case "arrowdown":
          inputRef.current.chef1Mask &= ~2;
          break;
        case "a":
        case "arrowleft":
          inputRef.current.chef1Mask &= ~4;
          break;
        case "d":
        case "arrowright":
          inputRef.current.chef1Mask &= ~8;
          break;
        case " ":
          inputRef.current.chef1Mask &= ~16;
          break;
        case "f":
          inputRef.current.chef1Mask &= ~32;
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

  // Main 60FPS tick
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      setGameState((prev) => {
        const next = stepChaosKitchen(prev, dt, {
          chef1Mask: inputRef.current.chef1Mask,
          chef2Mask: inputRef.current.chef2Mask,
        });

        // Single-pulse input clearance for space/f
        if (inputRef.current.chef1Mask & 16) {
          inputRef.current.chef1Mask &= ~16;
        }

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
    const tileW = width / KITCHEN_WIDTH;
    const tileH = height / KITCHEN_HEIGHT;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Render Kitchen Grid Tiles
    for (let y = 0; y < KITCHEN_HEIGHT; y++) {
      for (let x = 0; x < KITCHEN_WIDTH; x++) {
        const tile = KITCHEN_GRID[y][x];
        const px = x * tileW;
        const py = y * tileH;

        if (tile === "floor") {
          // Checkered kitchen floor
          ctx.fillStyle = (x + y) % 2 === 0 ? "#27272a" : "#3f3f46";
          ctx.fillRect(px, py, tileW, tileH);
        } else {
          // Counter / Station base
          ctx.fillStyle = "#18181b";
          ctx.fillRect(px, py, tileW, tileH);
          ctx.strokeStyle = "#52525b";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1, py + 1, tileW - 2, tileH - 2);

          // Tile-specific icon / label
          ctx.textAlign = "center";
          ctx.font = "bold 13px sans-serif";
          if (tile === "crate_tomato") {
            ctx.fillStyle = "#ef4444";
            ctx.fillText("🍅", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "crate_lettuce") {
            ctx.fillStyle = "#22c55e";
            ctx.fillText("🥬", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "crate_meat") {
            ctx.fillStyle = "#ea580c";
            ctx.fillText("🥩", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "plate_dispenser") {
            ctx.fillStyle = "#f8fafc";
            ctx.fillText("🍽️", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "cutting_board") {
            ctx.fillStyle = "#ca8a04";
            ctx.fillRect(px + 6, py + 6, tileW - 12, tileH - 12);
            ctx.fillStyle = "#0f172a";
            ctx.fillText("🔪", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "stove") {
            ctx.fillStyle = "#b91c1c";
            ctx.fillRect(px + 4, py + 4, tileW - 8, tileH - 8);
            ctx.fillStyle = "#fef08a";
            ctx.fillText("🔥", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "delivery") {
            ctx.fillStyle = "#0284c7";
            ctx.fillRect(px + 2, py + 2, tileW - 4, tileH - 4);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText("SERVE", px + tileW / 2, py + tileH / 2 + 4);
          } else if (tile === "trash") {
            ctx.fillStyle = "#71717a";
            ctx.fillText("🗑️", px + tileW / 2, py + tileH / 2 + 5);
          } else if (tile === "sink") {
            ctx.fillStyle = "#06b6d4";
            ctx.fillText("🚰", px + tileW / 2, py + tileH / 2 + 5);
          }
        }
      }
    }

    // 2. Render Counter Slot Items (Items placed on tables)
    for (const [key, item] of gameState.counterSlots.entries()) {
      if (!item) continue;
      const [gx, gy] = key.split(",").map(Number);
      const cx = gx * tileW + tileW / 2;
      const cy = gy * tileH + tileH / 2;

      ctx.save();
      ctx.translate(cx, cy);

      // Item icon
      ctx.textAlign = "center";
      ctx.font = "14px sans-serif";
      let icon = "📦";
      if (item.type === "tomato_raw") icon = "🍅";
      else if (item.type === "tomato_chopped") icon = "🥫";
      else if (item.type === "lettuce_raw") icon = "🥬";
      else if (item.type === "lettuce_chopped") icon = "🥗";
      else if (item.type === "meat_raw") icon = "🥩";
      else if (item.type === "meat_cooked") icon = "🍖";
      else if (item.type === "meat_burned") icon = "💀";
      else if (item.type === "plate_clean") icon = "🍽️";
      else if (item.type === "salad_dish") icon = "🥗";
      else if (item.type === "burger_dish") icon = "🍔";
      else if (item.type === "extinguisher") icon = "🧯";

      ctx.fillText(icon, 0, 5);

      // Cooking progress bar for stove
      if (item.isCooking) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(-14, 10, 28, 4);
        ctx.fillStyle = item.cookProgress > 1.5 ? "#ef4444" : "#eab308";
        ctx.fillRect(-14, 10, Math.min(28, 28 * (item.cookProgress / 1.0)), 4);
      }

      // Fire visual
      if (item.isOnFire) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText("🔥", 0, -12);
      }

      ctx.restore();
    }

    // 3. Render Chefs
    for (const chef of gameState.chefs) {
      const cx = chef.x * tileW + tileW / 2;
      const cy = chef.y * tileH + tileH / 2;

      ctx.save();
      ctx.translate(cx, cy);

      // Body circle
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = chef.id === "chef_1" ? "#2563eb" : "#16a34a";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Chef hat
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(chef.id === "chef_1" ? "1P" : "AI", 0, 4);

      // Facing indicator arrow
      ctx.beginPath();
      ctx.moveTo(chef.dirX * 18, chef.dirY * 18);
      ctx.lineTo(chef.dirX * 12 - chef.dirY * 4, chef.dirY * 12 + chef.dirX * 4);
      ctx.lineTo(chef.dirX * 12 + chef.dirY * 4, chef.dirY * 12 - chef.dirX * 4);
      ctx.closePath();
      ctx.fillStyle = "#facc15";
      ctx.fill();

      // Held item floating above chef
      if (chef.heldItem) {
        let heldIcon = "📦";
        if (chef.heldItem.type === "tomato_raw") heldIcon = "🍅";
        else if (chef.heldItem.type === "tomato_chopped") heldIcon = "🥫";
        else if (chef.heldItem.type === "lettuce_raw") heldIcon = "🥬";
        else if (chef.heldItem.type === "lettuce_chopped") heldIcon = "🥗";
        else if (chef.heldItem.type === "meat_raw") heldIcon = "🥩";
        else if (chef.heldItem.type === "meat_cooked") heldIcon = "🍖";
        else if (chef.heldItem.type === "plate_clean") heldIcon = "🍽️";
        else if (chef.heldItem.type === "salad_dish") heldIcon = "🥗";
        else if (chef.heldItem.type === "burger_dish") heldIcon = "🍔";
        else if (chef.heldItem.type === "extinguisher") heldIcon = "🧯";

        ctx.font = "14px sans-serif";
        ctx.fillText(heldIcon, 0, -22);
      }

      // Chopping gauge
      if (chef.isChopping) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(-12, -32, 24, 4);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-12, -32, 24 * chef.chopProgress, 4);
      }

      ctx.restore();
    }

    ctx.restore();
  }, [gameState]);

  const handleReset = () => {
    setGameState(initializeChaosKitchen());
    playTone(440, "sine", 0.15);
  };

  const handleShare = () => {
    shareText(
      `Chaos Kitchen Overcooked: Cleared shift with score ¥${gameState.score}, served ${gameState.servedOrders} orders! Play free: https://game.oiyo.net/chaos-kitchen`
    );
    playTone(660, "triangle", 0.1);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-background text-foreground rounded-xl border border-border shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Chaos Kitchen: Overcooked Rush</h1>
          <p className="text-xs text-muted-foreground">
            Dijkstra Flow-Field pathfinding & deterministic lockstep co-op kitchen simulation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {copied ? "Copied!" : "Share Shift"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Restart Kitchen
          </button>
        </div>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          label="Kitchen Revenue"
          value={`¥${gameState.score}`}
          highlight={gameState.score >= 1500}
        />
        <GameStatTile
          label="Orders Served"
          value={`${gameState.servedOrders} (Combo x${gameState.comboCount})`}
          highlight={gameState.comboCount >= 3}
        />
        <GameStatTile
          label="Failed Orders"
          value={`${gameState.failedOrders} / 5`}
          highlight={gameState.failedOrders >= 3}
        />
        <GameStatTile
          label="Kitchen State"
          value={gameState.hasFire ? "🚨 ON FIRE!" : "All Stations Clean"}
          highlight={gameState.hasFire}
        />
      </div>

      {/* Active Order Tickets Header */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Active Tickets:</span>
        {gameState.orders.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">No tickets in queue</span>
        ) : (
          gameState.orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border text-xs shadow-xs"
            >
              <span className="font-bold">
                {o.recipe === "salad" ? "🥗 Salad" : o.recipe === "burger" ? "🍔 Burger" : "🥩 Steak"}
              </span>
              <span className="text-muted-foreground">({Math.ceil(o.timeRemainingSec)}s)</span>
              <span className="text-primary font-semibold">¥{o.reward}</span>
            </div>
          ))
        )}
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card flex justify-center">
        <canvas
          ref={canvasRef}
          width={700}
          height={490}
          className="w-full max-w-full aspect-video block"
        />

        {/* Floating Log Banner */}
        <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-xs px-2.5 py-1 rounded text-xs text-card-foreground border border-border pointer-events-none">
          {gameState.activeLog}
        </div>

        {/* Game Clear / Failed Overlay */}
        {(gameState.status === "cleared" || gameState.status === "failed") && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-3">
            <h2 className="text-2xl font-black">
              {gameState.status === "cleared" ? "⭐ 3-Star Michelin Kitchen Cleared!" : "🔥 Kitchen Closed"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {gameState.status === "cleared"
                ? `Incredible teamwork! Served ${gameState.servedOrders} orders and earned ¥${gameState.score}.`
                : "The kitchen descended into unmanageable chaos and too many orders expired."}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 font-bold text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Controls & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border border-border text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1">Controls:</span>
          <button
            type="button"
            onClick={() => {
              inputRef.current.chef1Mask |= 1;
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~1;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Up (W)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.chef1Mask |= 2;
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~2;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Down (S)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.chef1Mask |= 4;
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~4;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Left (A)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.chef1Mask |= 8;
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~8;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Right (D)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              inputRef.current.chef1Mask |= 16;
              playTone(440, "sine", 0.08);
            }}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Pick / Place (Space)
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current.chef1Mask |= 32;
              playTone(600, "triangle", 0.08);
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~32;
              }, 300);
            }}
            className="px-3 py-1.5 rounded bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-colors"
          >
            Chop / Action (F)
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChaosKitchen;
