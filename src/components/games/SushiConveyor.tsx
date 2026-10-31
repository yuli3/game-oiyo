import { useCallback, useEffect, useRef, useState } from "react";
import {
  initializeSushiConveyor,
  stepSushiConveyor,
  conveyorSpline,
  SUSHI_RECIPES,
  type SushiConveyorState,
  type SushiType,
} from "../../lib/games/sushi-conveyor";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";

export function SushiConveyor() {
  const [gameState, setGameState] = useState<SushiConveyorState>(() => initializeSushiConveyor());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<{
    craftSushi?: SushiType;
    buyUpgrade?: "beltSpeed" | "plateValue" | "autoPrep";
  }>({});

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

  // Keyboard shortcut listener for crafting (1-5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case "1":
          inputRef.current.craftSushi = "tuna";
          playTone(440, "sine", 0.08);
          break;
        case "2":
          inputRef.current.craftSushi = "salmon";
          playTone(493, "sine", 0.08);
          break;
        case "3":
          inputRef.current.craftSushi = "shrimp";
          playTone(554, "sine", 0.08);
          break;
        case "4":
          inputRef.current.craftSushi = "tamago";
          playTone(587, "sine", 0.08);
          break;
        case "5":
          inputRef.current.craftSushi = "unagi";
          playTone(659, "triangle", 0.1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playTone]);

  // Main 60FPS tick
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      setGameState((prev) => {
        const next = stepSushiConveyor(prev, dt, {
          craftSushi: inputRef.current.craftSushi,
          buyUpgrade: inputRef.current.buyUpgrade,
        });

        // Reset single-frame inputs
        inputRef.current.craftSushi = undefined;
        inputRef.current.buyUpgrade = undefined;

        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2D Canvas rendering of Spline Conveyor Belt
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Warm Japanese Wooden Tatami / Restaurant Floor
    ctx.fillStyle = "#1e1e24";
    ctx.fillRect(0, 0, width, height);

    // Counter Bar Area (Outer Table Rim)
    ctx.save();
    ctx.lineWidth = 42;
    ctx.strokeStyle = "#451a03"; // Dark rich wood
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const splineL = conveyorSpline.totalLength;
    for (let d = 0; d <= splineL; d += 15) {
      const pt = conveyorSpline.sampleAtDistance(d);
      if (d === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Conveyor Rail Track
    ctx.lineWidth = 20;
    ctx.strokeStyle = gameState.status === "fever" ? "#ca8a04" : "#1f2937";
    ctx.stroke();

    // Moving Rail Slats (Conveyor Belt texture)
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4b5563";
    const moveOffset = (gameState.gameTimeSec * gameState.beltSpeedPxPerSec) % 20;
    for (let d = moveOffset; d <= splineL; d += 20) {
      const pt = conveyorSpline.sampleAtDistance(d);
      const nx = Math.cos(pt.headingRad + Math.PI / 2);
      const ny = Math.sin(pt.headingRad + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(pt.x - nx * 9, pt.y - ny * 9);
      ctx.lineTo(pt.x + nx * 9, pt.y + ny * 9);
      ctx.stroke();
    }
    ctx.restore();

    // Center Kitchen Stage & Chef
    ctx.save();
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.ellipse(360, 240, 160, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#52525b";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chef Avatar in Center
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(360, 240, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👨‍🍳", 360, 245);
    ctx.restore();

    // Render Customer Seats
    for (const seat of gameState.seats) {
      ctx.save();
      ctx.translate(seat.chairX, seat.chairY);

      // Chair Base
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = seat.occupied ? "#3b82f6" : "#3f3f46";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#71717a";
      ctx.stroke();

      if (seat.occupied) {
        // Customer Avatar
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(seat.mood === "eating" ? "😋" : seat.mood === "impatient" ? "😤" : "🧑", 0, 5);

        // Patience Meter (Arc around chair)
        const pRatio = seat.patienceTimerSec / seat.maxPatienceSec;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pRatio);
        ctx.strokeStyle = pRatio > 0.5 ? "#22c55e" : pRatio > 0.25 ? "#eab308" : "#ef4444";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Order Speech Bubble
        if (seat.wantedSushi && seat.mood !== "eating") {
          const recipe = SUSHI_RECIPES[seat.wantedSushi];
          ctx.save();
          ctx.translate(0, -32);
          // Bubble background
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(-24, -14, 48, 22, 6);
          ctx.fill();
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Bubble small tail
          ctx.beginPath();
          ctx.moveTo(-4, 8);
          ctx.lineTo(0, 14);
          ctx.lineTo(4, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mini Sushi Icon & Name
          ctx.fillStyle = recipe.color;
          ctx.beginPath();
          ctx.roundRect(-16, -10, 14, 8, 2);
          ctx.fill();

          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(seat.wantedSushi.slice(0, 3).toUpperCase(), 2, -3);

          ctx.restore();
        }
      }

      ctx.restore();
    }

    // Render Sushi Plates on Spline
    for (const plate of gameState.activePlates) {
      const sample = conveyorSpline.sampleAtDistance(plate.distanceAlongSpline);
      const recipe = SUSHI_RECIPES[plate.sushiType];

      ctx.save();
      ctx.translate(sample.x, sample.y);
      ctx.rotate(sample.headingRad);

      // Ceramic Plate Base
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = recipe.color;
      ctx.stroke();

      // Rice Bed (Shari)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(-7, -4, 14, 8, 3);
      ctx.fill();

      // Fish Topping (Neta)
      ctx.fillStyle = recipe.color;
      ctx.beginPath();
      ctx.roundRect(-8, -5, 16, 7, 2);
      ctx.fill();

      // Nori Seaweed Ribbon for Tamago & Unagi
      if (plate.sushiType === "tamago" || plate.sushiType === "unagi") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-2, -5, 4, 10);
      }

      // Freshness Ring
      const freshRatio = 1 - plate.freshnessTimeSec / plate.maxFreshnessSec;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2 * freshRatio);
      ctx.strokeStyle = freshRatio > 0.4 ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }, [gameState]);

  const handleCraft = (type: SushiType) => {
    inputRef.current.craftSushi = type;
    playTone(520, "sine", 0.08);
  };

  const handleUpgrade = (type: "beltSpeed" | "plateValue" | "autoPrep") => {
    inputRef.current.buyUpgrade = type;
    playTone(660, "triangle", 0.12);
  };

  const handleReset = () => {
    setGameState(initializeSushiConveyor());
    playTone(440, "sine", 0.15);
  };

  const handleShare = () => {
    shareText(
      `Conveyor Sushi Tycoon: Served ${gameState.totalServed} plates in Ginza, Revenue ¥${gameState.cash}! Play free: https://game.oiyo.net/sushi-conveyor`
    );
    playTone(700, "sine", 0.1);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-background text-foreground rounded-xl border border-border shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ginza Conveyor Sushi Tycoon</h1>
          <p className="text-xs text-muted-foreground">
            Zero-GC pooled sushi plates moving on an arc-length spline loop counter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {copied ? "Copied!" : "Share Result"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New Shift
          </button>
        </div>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          label="Cash & Revenue"
          value={`¥${gameState.cash}`}
          highlight={gameState.cash >= 2500}
        />
        <GameStatTile
          label="Reputation"
          value={`${gameState.reputation}%`}
          highlight={gameState.reputation > 90}
        />
        <GameStatTile
          label="Plates Served"
          value={`${gameState.totalServed} (Combo x${gameState.comboCount})`}
          highlight={gameState.status === "fever"}
        />
        <GameStatTile
          label="Belt Speed"
          value={`${gameState.beltSpeedPxPerSec} px/s`}
        />
      </div>

      {/* Conveyor Canvas Area */}
      <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card flex justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={480}
          className="w-full max-w-full aspect-video block"
        />

        {/* Floating Log Banner */}
        <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-xs px-2.5 py-1 rounded text-xs text-card-foreground border border-border pointer-events-none">
          {gameState.activeLog}
        </div>

        {/* Fever Indicator */}
        {gameState.status === "fever" && (
          <div className="absolute top-2 right-2 bg-chart-5/90 text-primary-foreground font-black px-3 py-1 rounded text-xs animate-pulse">
            🔥 FEVER MODE ({gameState.feverTimeSec.toFixed(1)}s) 2x Revenue
          </div>
        )}

        {/* Game Over / Day Cleared Overlay */}
        {(gameState.status === "bankrupt" || gameState.status === "day_cleared") && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-3">
            <h2 className="text-2xl font-black">
              {gameState.status === "day_cleared" ? "⭐ Ginza Star Rating Awarded!" : "💸 Restaurant Bankrupt"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {gameState.status === "day_cleared"
                ? `Sensational service! Served ${gameState.totalServed} guests and accumulated ¥${gameState.cash}.`
                : "Funds and reputation collapsed from discarded spoiled plates and angry customers."}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 font-bold text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Open Next Shift
            </button>
          </div>
        )}
      </div>

      {/* Chef Prep Bench: 5 Nigiri Types */}
      <div className="p-3 bg-muted/40 rounded-lg border border-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            Chef Prep Bench (Press 1-5 to craft):
          </span>
          <span className="text-xs text-muted-foreground">
            Active Plates on Belt: {gameState.activePlates.length} / 40
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(SUSHI_RECIPES) as SushiType[]).map((type, idx) => {
            const recipe = SUSHI_RECIPES[type];
            const cost = Math.floor(recipe.price * 0.3);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleCraft(type)}
                className="flex flex-col items-center p-2 rounded-lg border border-border bg-card hover:bg-accent transition-all text-left"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="font-bold text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-xs truncate">{recipe.name}</span>
                </div>
                <div className="flex items-center justify-between w-full mt-1.5 text-xs text-muted-foreground">
                  <span>-¥{cost}</span>
                  <span className="text-primary font-bold">+¥{recipe.price}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kitchen Upgrades */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleUpgrade("beltSpeed")}
          disabled={gameState.upgrades.beltSpeedLevel >= 5 || gameState.cash < gameState.upgrades.beltSpeedLevel * 300}
          className="p-2.5 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 transition-colors text-left"
        >
          <div className="font-bold text-xs">⚡ Faster Belt Motor (Lv.{gameState.upgrades.beltSpeedLevel}/5)</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {gameState.upgrades.beltSpeedLevel < 5
              ? `¥${gameState.upgrades.beltSpeedLevel * 300} (+20 px/s speed)`
              : "MAX LEVEL"}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleUpgrade("plateValue")}
          disabled={gameState.upgrades.plateValueLevel >= 5 || gameState.cash < gameState.upgrades.plateValueLevel * 350}
          className="p-2.5 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 transition-colors text-left"
        >
          <div className="font-bold text-xs">🍣 Premium Ingredients (Lv.{gameState.upgrades.plateValueLevel}/5)</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {gameState.upgrades.plateValueLevel < 5
              ? `¥${gameState.upgrades.plateValueLevel * 350} (+20% plate value)`
              : "MAX LEVEL"}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleUpgrade("autoPrep")}
          disabled={gameState.upgrades.autoPrepLevel >= 3 || gameState.cash < (gameState.upgrades.autoPrepLevel + 1) * 600}
          className="p-2.5 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 transition-colors text-left"
        >
          <div className="font-bold text-xs">🤖 Auto Rice Shaper (Lv.{gameState.upgrades.autoPrepLevel}/3)</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {gameState.upgrades.autoPrepLevel < 3
              ? `¥${(gameState.upgrades.autoPrepLevel + 1) * 600} (Auto-makes nigiri)`
              : "MAX LEVEL"}
          </div>
        </button>
      </div>
    </div>
  );
}

export default SushiConveyor;
