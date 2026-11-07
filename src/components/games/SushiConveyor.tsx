import { useCallback, useEffect, useRef, useState } from "react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { useCardTiltPro } from "../../lib/games/engine-suite-unified";
import { SUSHI_CONVEYOR_SPRITES } from "../../lib/games/sprites";
import { Maximize2, Minimize2, Award, Wrench, X } from "lucide-react";
import {
  initializeSushiConveyor,
  stepSushiConveyor,
  conveyorSpline,
  SUSHI_RECIPES,
  type SushiConveyorState,
  type SushiType,
} from "../../lib/games/sushi-conveyor";
import { INITIAL_SUSHI_QUESTS, type SushiQuest } from "../../lib/games/sushi-conveyor-quests";
import { SUSHI_DIALOGUES } from "../../lib/games/sushi-conveyor-lore";
import {
  SUSHI_META_UPGRADE_DEFS,
  loadSushiMetaState,
  purchaseSushiMetaUpgrade,
  saveSushiMetaState,
  type SushiPlayerMetaState,
} from "../../lib/games/sushi-conveyor-meta";
import { nativeHaptics } from "../../lib/haptics/native-bridge";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { GameStatTile } from "../ui/game/GameStatTile";

function TiltSushiButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { transformCss, onPointerMove, onPointerLeave } = useCardTiltPro();
  return (
    <button
      style={{ "--card-tilt": transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transform-(--card-tilt) will-change-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SushiConveyor() {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal();
  const [metaState, setMetaState] = useState<SushiPlayerMetaState>(() => loadSushiMetaState());
  const [quests, setQuests] = useState<SushiQuest[]>(() => [...INITIAL_SUSHI_QUESTS]);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);

  const buildMetaModifiers = useCallback((meta: SushiPlayerMetaState) => {
    return {
      priceMultiplier: 1 + meta.upgrades.goldenRiceCooker * 0.1,
      extraFreshnessSec: meta.upgrades.knifeHoning * 5,
      speedBonus: meta.upgrades.expressBelt * 0.12,
      tipBonus: meta.upgrades.vipTatami * 0.25,
      goldenRate: meta.upgrades.agingFreezer * 0.04,
    };
  }, []);

  const [gameState, setGameState] = useState<SushiConveyorState>(() =>
    initializeSushiConveyor(buildMetaModifiers(loadSushiMetaState()))
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null); // Palm Run style background cache
  const sushiImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const inputRef = useRef<{
    craftSushi?: SushiType;
    buyUpgrade?: "beltSpeed" | "plateValue" | "autoPrep";
  }>({});

  // Sync meta state wasabi earnings from game
  useEffect(() => {
    if (gameState.wasabiEarned > 0) {
      setMetaState((prev) => {
        const next = { ...prev, wasabiCores: prev.wasabiCores + gameState.wasabiEarned };
        saveSushiMetaState(next);
        return next;
      });
      // reset in gameState
      setGameState((prev) => ({ ...prev, wasabiEarned: 0 }));
    }
  }, [gameState.wasabiEarned]);

  // Check quest progress in run
  useEffect(() => {
    setQuests((prevQuests) =>
      prevQuests.map((q) => {
        if (q.completed) return q;
        const progress = q.check(gameState);
        const completed = progress >= q.target;
        if (completed && !q.completed) {
          nativeHaptics.trigger("success");
        }
        return {
          ...q,
          current: Math.min(q.target, progress),
          completed,
        };
      })
    );
  }, [gameState]);

  // Preload sushi 3D sprites
  useEffect(() => {
    for (const [key, src] of Object.entries(SUSHI_CONVEYOR_SPRITES)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        sushiImagesRef.current[key] = img;
      };
    }
  }, []);

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

  // Keyboard shortcut listener for crafting (1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case "1":
          inputRef.current.craftSushi = "tuna";
          nativeHaptics.trigger("light");
          playTone(440, "sine", 0.08);
          break;
        case "2":
          inputRef.current.craftSushi = "salmon";
          nativeHaptics.trigger("light");
          playTone(493, "sine", 0.08);
          break;
        case "3":
          inputRef.current.craftSushi = "shrimp";
          nativeHaptics.trigger("light");
          playTone(554, "sine", 0.08);
          break;
        case "4":
          inputRef.current.craftSushi = "tamago";
          nativeHaptics.trigger("light");
          playTone(587, "sine", 0.08);
          break;
        case "5":
          inputRef.current.craftSushi = "unagi";
          nativeHaptics.trigger("light");
          playTone(659, "triangle", 0.1);
          break;
        case "6":
          inputRef.current.craftSushi = "golden_tuna";
          nativeHaptics.trigger("heavy");
          playTone(880, "sine", 0.15);
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

  // Pre-render static background (Palm Run architecture pattern)
  useEffect(() => {
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = 720;
    bgCanvas.height = 480;
    const bgCtx = bgCanvas.getContext("2d");
    if (!bgCtx) return;

    // Tatami wooden floor
    bgCtx.fillStyle = "#18181b";
    bgCtx.fillRect(0, 0, 720, 480);

    // Outer rich wooden counter bar
    bgCtx.save();
    bgCtx.lineWidth = 42;
    bgCtx.strokeStyle = "#451a03";
    bgCtx.lineCap = "round";
    bgCtx.lineJoin = "round";
    bgCtx.beginPath();
    const splineL = conveyorSpline.totalLength;
    for (let d = 0; d <= splineL; d += 15) {
      const pt = conveyorSpline.sampleAtDistance(d);
      if (d === 0) bgCtx.moveTo(pt.x, pt.y);
      else bgCtx.lineTo(pt.x, pt.y);
    }
    bgCtx.closePath();
    bgCtx.stroke();
    bgCtx.restore();

    // Center chef kitchen island
    bgCtx.save();
    bgCtx.fillStyle = "#27272a";
    bgCtx.beginPath();
    bgCtx.ellipse(360, 240, 160, 80, 0, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.strokeStyle = "#52525b";
    bgCtx.lineWidth = 2;
    bgCtx.stroke();
    bgCtx.restore();

    bgCanvasRef.current = bgCanvas;
  }, []);

  // 2D Canvas rendering of Conveyor Belt & Customers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Blit pre-cached background (Palm Run optimization)
    if (bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0);
    } else {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, width, height);
    }

    const splineL = conveyorSpline.totalLength;

    // Dynamic Conveyor Rail Track
    ctx.save();
    ctx.lineWidth = 20;
    ctx.strokeStyle = gameState.status === "fever" ? "#ca8a04" : "#1f2937";
    ctx.beginPath();
    for (let d = 0; d <= splineL; d += 15) {
      const pt = conveyorSpline.sampleAtDistance(d);
      if (d === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Moving Rail Slats
    ctx.lineWidth = 2;
    ctx.strokeStyle = gameState.status === "fever" ? "#fef08a" : "#4b5563";
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

    // Chef Avatar in Center
    ctx.save();
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
      ctx.fillStyle = seat.occupied ? "#3b82f6" : "#27272a";
      if (seat.customerType === "sumo") ctx.fillStyle = "#e11d48";
      else if (seat.customerType === "inspector") ctx.fillStyle = "#8b5cf6";
      else if (seat.customerType === "gourmet") ctx.fillStyle = "#d97706";
      ctx.fill();
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (seat.occupied) {
        // Customer emoji
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        let icon = "🧑";
        if (seat.customerType === "sumo") icon = "🥋";
        else if (seat.customerType === "inspector") icon = "📋";
        else if (seat.customerType === "gourmet") icon = "🎩";
        else if (seat.mood === "eating") icon = "😋";
        else if (seat.mood === "impatient") icon = "😤";
        ctx.fillText(icon, 0, 6);

        // Speech Bubble: Desired Sushi Plate
        if (seat.wantedSushi && seat.mood !== "eating") {
          ctx.save();
          ctx.translate(0, -32);
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.beginPath();
          ctx.roundRect(-22, -14, 44, 26, 6);
          ctx.fill();
          ctx.strokeStyle = seat.wantedSushi === "golden_tuna" ? "#fbbf24" : "#cbd5e1";
          ctx.lineWidth = seat.wantedSushi === "golden_tuna" ? 2 : 1;
          ctx.stroke();

          // Sushi Sprite icon in speech bubble
          const spr = sushiImagesRef.current[seat.wantedSushi];
          if (spr && spr.complete) {
            ctx.drawImage(spr, -10, -10, 20, 20);
          } else {
            ctx.fillStyle = SUSHI_RECIPES[seat.wantedSushi].color;
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
          }

          // Patience bar below bubble
          const pRatio = Math.max(0, seat.patienceTimerSec / seat.maxPatienceSec);
          ctx.fillStyle = pRatio > 0.5 ? "#22c55e" : pRatio > 0.25 ? "#eab308" : "#ef4444";
          ctx.fillRect(-18, 14, 36 * pRatio, 3);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // Render Moving Sushi Plates on the Belt
    for (const plate of gameState.activePlates) {
      const pt = conveyorSpline.sampleAtDistance(plate.distanceAlongSpline);
      ctx.save();
      ctx.translate(pt.x, pt.y);

      // Plate Rim
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = plate.isGolden ? "#fef08a" : "#f1f5f9";
      ctx.fill();
      ctx.strokeStyle = plate.isGolden ? "#eab308" : SUSHI_RECIPES[plate.sushiType].color;
      ctx.lineWidth = plate.isGolden ? 3 : 2;
      ctx.stroke();

      // Draw 3D Sushi Sprite
      const spr = sushiImagesRef.current[plate.sushiType];
      if (spr && spr.complete) {
        ctx.drawImage(spr, -12, -12, 24, 24);
      } else {
        ctx.fillStyle = SUSHI_RECIPES[plate.sushiType].color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, pt.headingRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Freshness Ring
      const freshRatio = Math.max(0, 1 - plate.freshnessTimeSec / plate.maxFreshnessSec);
      if (freshRatio < 0.35) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2 * freshRatio);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }, [gameState]);

  // Current Lore Dialogue
  const currentDialogue = SUSHI_DIALOGUES.find((d) => d.id === gameState.activeDialogueId) ?? SUSHI_DIALOGUES[0];

  const handleCraft = (type: SushiType) => {
    inputRef.current.craftSushi = type;
    nativeHaptics.trigger(type === "golden_tuna" ? "heavy" : "light");
    playTone(type === "golden_tuna" ? 880 : 520, "sine", 0.08);
  };

  const handleClaimQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === questId && q.completed && !q.claimed) {
          setMetaState((m) => {
            const next = { ...m, wasabiCores: m.wasabiCores + q.rewardWasabi };
            saveSushiMetaState(next);
            return next;
          });
          nativeHaptics.trigger("success");
          return { ...q, claimed: true };
        }
        return q;
      })
    );
  };

  const handlePurchaseMeta = (upgradeId: keyof SushiPlayerMetaState["upgrades"]) => {
    setMetaState((prev) => {
      const next = { ...prev };
      const success = purchaseSushiMetaUpgrade(next, upgradeId);
      if (success) {
        nativeHaptics.trigger("success");
        playTone(660, "sine", 0.12);
        // apply to running game
        setGameState((cur) => ({
          ...cur,
          metaModifiers: buildMetaModifiers(next),
        }));
      }
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-4xl mx-auto flex flex-col items-center bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden ${
        isImmersive ? "fixed inset-0 z-50 rounded-none border-none max-w-none justify-center" : "my-4"
      }`}
    >
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍣</span>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-primary">Ginza Sushi Conveyor</h2>
            <p className="text-xs text-muted-foreground">Tycoon & Spline Conveyor</p>
          </div>
        </div>

        {/* Wasabi Cores & Directives / Research Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuestModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-colors"
          >
            <Award className="w-3.5 h-3.5" />
            <span>지령 ({quests.filter((q) => q.completed && !q.claimed).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResearchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-chart-4/20 text-chart-4 border border-chart-4/40 hover:bg-chart-4/30 transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>설비연구 ({metaState.wasabiCores} 🍵)</span>
          </button>

          <button
            type="button"
            onClick={togglePortal}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Story & Lore Transmission HUD */}
      <div className="w-full px-4 py-1.5 bg-muted/20 border-b border-border/80 flex items-center gap-2 text-xs">
        <span className="font-bold text-primary whitespace-nowrap">[{currentDialogue.sender.ko}]</span>
        <span className="text-foreground/90 truncate">{currentDialogue.message.ko}</span>
      </div>

      {/* Stats Bar */}
      <div className="w-full grid grid-cols-4 gap-2 px-4 py-2 bg-muted/10 border-b border-border/40 text-center">
        <GameStatTile label="자금" value={`¥${gameState.cash}`} icon="💰" />
        <GameStatTile label="명성치" value={`${gameState.reputation}%`} icon="⭐" />
        <GameStatTile label="서빙 완료" value={`${gameState.totalServed}접시`} icon="🍣" />
        <GameStatTile
          label="상태"
          value={gameState.status === "fever" ? `🔥 피버 (${gameState.feverTimeSec.toFixed(0)}s)` : `콤보 x${gameState.comboCount}`}
          icon="⚡"
        />
      </div>

      {/* Canvas Spline Viewport */}
      <div className="relative w-full aspect-video max-h-120 bg-background flex items-center justify-center">
        <canvas ref={canvasRef} width={720} height={480} className="w-full h-full object-contain" />
      </div>

      {/* Crafting Action Pad */}
      <div className="w-full p-3 bg-muted/30 border-t border-border flex flex-wrap items-center justify-center gap-2">
        {(["tuna", "salmon", "shrimp", "tamago", "unagi", "golden_tuna"] as SushiType[]).map((type, idx) => {
          const recipe = SUSHI_RECIPES[type];
          const cost = Math.floor(recipe.price * 0.3);
          const isGold = type === "golden_tuna";

          return (
            <TiltSushiButton
              key={type}
              onClick={() => handleCraft(type)}
              disabled={gameState.cash < cost}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isGold
                  ? "bg-chart-4/20 text-chart-4 border-chart-4 hover:bg-chart-4/30"
                  : "bg-card text-foreground border-border hover:bg-muted"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="text-base">{isGold ? "👑" : idx === 0 ? "🐟" : idx === 1 ? "🍣" : idx === 2 ? "🦐" : idx === 3 ? "🍳" : "🍱"}</span>
              <div className="text-left">
                <div className="leading-tight">{recipe.name}</div>
                <div className="text-xs text-muted-foreground">¥{cost} 준비 (단축키 {idx + 1})</div>
              </div>
            </TiltSushiButton>
          );
        })}
      </div>

      {/* Quests / Directives Modal */}
      {showQuestModal && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">긴자 명인 작전 지령</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    q.claimed
                      ? "bg-muted/20 border-border/40 opacity-60"
                      : q.completed
                      ? "bg-primary/10 border-primary/60"
                      : "bg-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{q.title.ko}</span>
                    <span className="text-xs font-semibold text-chart-4">+{q.rewardWasabi} 🍵</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{q.description.ko}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-muted-foreground">
                      진행도: {q.current} / {q.target}
                    </div>
                    {q.completed && !q.claimed ? (
                      <button
                        type="button"
                        onClick={() => handleClaimQuest(q.id)}
                        className="px-2.5 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors"
                      >
                        보상 수령
                      </button>
                    ) : q.claimed ? (
                      <span className="text-xs text-muted-foreground font-semibold">수령 완료</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">진행 중</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Kitchen Research Lab Modal */}
      {showResearchModal && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-chart-4" />
                <h3 className="font-bold text-foreground">주방 5대 영구 설비 연구소</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-chart-4">{metaState.wasabiCores} 🍵 황금 와사비</span>
                <button
                  type="button"
                  onClick={() => setShowResearchModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {SUSHI_META_UPGRADE_DEFS.map((def) => {
                const currentLvl = metaState.upgrades[def.id];
                const isMax = currentLvl >= def.maxLevel;
                const cost = isMax ? 0 : def.costPerLevel[currentLvl];
                const canAfford = metaState.wasabiCores >= cost;

                return (
                  <div
                    key={def.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">{def.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{def.name.ko}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                            Lv.{currentLvl}/{def.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{def.desc.ko}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePurchaseMeta(def.id)}
                      disabled={isMax || !canAfford}
                      className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isMax ? "최대 레벨" : `${cost} 🍵 강화`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SushiConveyor;
