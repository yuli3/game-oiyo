import { useCallback, useEffect, useRef, useState } from "react";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import {
  initializeChaosKitchen,
  stepChaosKitchen,
  KITCHEN_GRID,
  KITCHEN_WIDTH,
  KITCHEN_HEIGHT,
  type ChaosKitchenState,
} from "../../lib/games/chaos-kitchen";
import {
  loadKitchenQuests,
  saveKitchenQuests,
  claimKitchenQuestReward,
  type ChaosKitchenQuest,
} from "../../lib/games/chaos-kitchen-quests";
import {
  loadKitchenMetaSave,
  saveKitchenMetaSave,
  calculateKitchenModifiers,
  buyKitchenUpgrade,
  KITCHEN_UPGRADES,
  type KitchenMetaSave,
} from "../../lib/games/chaos-kitchen-meta";
import {
  KITCHEN_TRANSMISSIONS,
  type KitchenTransmission,
} from "../../lib/games/chaos-kitchen-lore";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";
import { CHAOS_KITCHEN_SPRITES } from "../../lib/games/sprites";

function TiltKitchenButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  return (
    <button
      type="button"
      style={{ "--card-tilt": transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.1);
        onClick();
      }}
      className={`${className ?? ""} will-change-transform transform-(--card-tilt)`}
    >
      {children}
    </button>
  );
}

export function ChaosKitchen({ lang = "ko" }: { lang?: string }) {
  const [gameState, setGameState] = useState<ChaosKitchenState>(() => initializeChaosKitchen());
  const [metaSave, setMetaSave] = useState<KitchenMetaSave>(() => loadKitchenMetaSave());
  const [quests, setQuests] = useState<ChaosKitchenQuest[]>(() => loadKitchenQuests());
  const [showQuests, setShowQuests] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [transmission, setTransmission] = useState<KitchenTransmission | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef({
    chef1Mask: 0,
    chef2Mask: 0,
  });

  const spritesRef = useRef<{
    burger: HTMLImageElement | null;
    knife: HTMLImageElement | null;
    tomato: HTMLImageElement | null;
    salad: HTMLImageElement | null;
    lettuce: HTMLImageElement | null;
    patty: HTMLImageElement | null;
    plate: HTMLImageElement | null;
    pan: HTMLImageElement | null;
  }>({
    burger: null,
    knife: null,
    tomato: null,
    salad: null,
    lettuce: null,
    patty: null,
    plate: null,
    pan: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const b = new Image(); b.src = CHAOS_KITCHEN_SPRITES.burger;
    const k = new Image(); k.src = CHAOS_KITCHEN_SPRITES.knife;
    const t = new Image(); t.src = CHAOS_KITCHEN_SPRITES.tomato;
    const s = new Image(); s.src = CHAOS_KITCHEN_SPRITES.salad;
    const l = new Image(); l.src = CHAOS_KITCHEN_SPRITES.lettuce;
    const p = new Image(); p.src = CHAOS_KITCHEN_SPRITES.patty;
    const pl = new Image(); pl.src = CHAOS_KITCHEN_SPRITES.plate;
    const pn = new Image(); pn.src = CHAOS_KITCHEN_SPRITES.pan;
    spritesRef.current = {
      burger: b,
      knife: k,
      tomato: t,
      salad: s,
      lettuce: l,
      patty: p,
      plate: pl,
      pan: pn,
    };
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

  const playChop = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }, [getAudioContext]);

  const { copied, shareText } = useClipboardShare();

  // Initial greeting lore transmission
  useEffect(() => {
    const opens = KITCHEN_TRANSMISSIONS.kitchen_open;
    if (opens && opens.length > 0) {
      setTransmission(opens[0]);
    }
  }, []);

  // Sync state changes with quests & lore transmissions
  const prevServedRef = useRef(0);
  const prevFireRef = useRef(false);

  useEffect(() => {
    // 1. Serving order event
    if (gameState.servedOrders > prevServedRef.current) {
      const diff = gameState.servedOrders - prevServedRef.current;
      prevServedRef.current = gameState.servedOrders;

      // Add earned stars to meta save
      const earnedStars = diff * 25;
      setMetaSave((prev) => {
        const next = {
          ...prev,
          goldStars: prev.goldStars + earnedStars,
          lifetimeDishesServed: prev.lifetimeDishesServed + diff,
        };
        saveKitchenMetaSave(next);
        return next;
      });

      // Update quests progress
      setQuests((prevQ) => {
        const nextQ = prevQ.map((q) => {
          if (q.id === "quest_salad_specialist" || q.id === "quest_steak_perfection") {
            return { ...q, progress: Math.min(q.maxProgress, q.progress + diff) };
          }
          if (q.id === "quest_michelin_combo") {
            return { ...q, progress: Math.min(q.maxProgress, gameState.comboCount) };
          }
          return q;
        });
        saveKitchenQuests(nextQ);
        return nextQ;
      });

      // Play serve sound and haptic
      playTone(587.33, "sine", 0.15);
      MobileHapticsPro.success();

      // Trigger delivery transmission
      const delivs = KITCHEN_TRANSMISSIONS.order_delivered;
      if (delivs && delivs.length > 0) {
        setTransmission(delivs[Math.floor(Math.random() * delivs.length)]);
      }
    }

    // 2. Fire alert event
    if (gameState.hasFire && !prevFireRef.current) {
      prevFireRef.current = true;
      MobileHapticsPro.heavy();
      playTone(220, "sawtooth", 0.3);

      const fires = KITCHEN_TRANSMISSIONS.fire_hazard;
      if (fires && fires.length > 0) {
        setTransmission(fires[0]);
      }
    } else if (!gameState.hasFire && prevFireRef.current) {
      prevFireRef.current = false;
      // Fire suppressed
      setMetaSave((prev) => {
        const next = { ...prev, lifetimeFiresExtinguished: prev.lifetimeFiresExtinguished + 1 };
        saveKitchenMetaSave(next);
        return next;
      });
      setQuests((prevQ) => {
        const nextQ = prevQ.map((q) => {
          if (q.id === "quest_fire_safety") {
            return { ...q, progress: Math.min(q.maxProgress, q.progress + 1) };
          }
          return q;
        });
        saveKitchenQuests(nextQ);
        return nextQ;
      });
    }

    // Win/Loss Haptics
    if (gameState.status === "cleared") {
      MobileHapticsPro.success();
      const shifts = KITCHEN_TRANSMISSIONS.shift_ended;
      if (shifts && shifts.length > 0) setTransmission(shifts[0]);
    } else if (gameState.status === "failed") {
      MobileHapticsPro.warning();
    }
  }, [gameState.servedOrders, gameState.comboCount, gameState.hasFire, gameState.status, playTone]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          inputRef.current.chef1Mask |= 1;
          MobileHapticsPro.light();
          break;
        case "s":
        case "arrowdown":
          inputRef.current.chef1Mask |= 2;
          MobileHapticsPro.light();
          break;
        case "a":
        case "arrowleft":
          inputRef.current.chef1Mask |= 4;
          MobileHapticsPro.light();
          break;
        case "d":
        case "arrowright":
          inputRef.current.chef1Mask |= 8;
          MobileHapticsPro.light();
          break;
        case " ":
          inputRef.current.chef1Mask |= 16;
          MobileHapticsPro.impact();
          playTone(440, "sine", 0.08);
          break;
        case "f":
          inputRef.current.chef1Mask |= 32;
          MobileHapticsPro.heavy();
          playChop();
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
  }, [playTone, playChop]);

  // Main 60FPS tick with Meta Modifiers
  const modifiers = calculateKitchenModifiers(metaSave);

  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      setGameState((prev) => {
        const next = stepChaosKitchen(
          prev,
          dt,
          {
            chef1Mask: inputRef.current.chef1Mask,
            chef2Mask: inputRef.current.chef2Mask,
          },
          modifiers
        );

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
  }, [modifiers.chopSpeedMult, modifiers.cookSpeedMult, modifiers.fireDelayMult, modifiers.moveSpeedMult, modifiers.starBonusMult]);

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
            if (spritesRef.current.tomato?.complete) {
              ctx.drawImage(spritesRef.current.tomato, px + 5, py + 5, tileW - 10, tileH - 10);
            } else {
              ctx.fillText("🍅", px + tileW / 2, py + tileH / 2 + 5);
            }
          } else if (tile === "crate_lettuce") {
            ctx.fillStyle = "#22c55e";
            if (spritesRef.current.lettuce?.complete) {
              ctx.drawImage(spritesRef.current.lettuce, px + 5, py + 5, tileW - 10, tileH - 10);
            } else {
              ctx.fillText("🥬", px + tileW / 2, py + tileH / 2 + 5);
            }
          } else if (tile === "crate_meat") {
            ctx.fillStyle = "#ea580c";
            if (spritesRef.current.patty?.complete) {
              ctx.drawImage(spritesRef.current.patty, px + 5, py + 5, tileW - 10, tileH - 10);
            } else {
              ctx.fillText("🥩", px + tileW / 2, py + tileH / 2 + 5);
            }
          } else if (tile === "plate_dispenser") {
            ctx.fillStyle = "#f8fafc";
            if (spritesRef.current.plate?.complete) {
              ctx.drawImage(spritesRef.current.plate, px + 5, py + 5, tileW - 10, tileH - 10);
            } else {
              ctx.fillText("🍽️", px + tileW / 2, py + tileH / 2 + 5);
            }
          } else if (tile === "cutting_board") {
            ctx.fillStyle = "#ca8a04";
            ctx.fillRect(px + 4, py + 4, tileW - 8, tileH - 8);
            if (spritesRef.current.knife && spritesRef.current.knife.complete) {
              ctx.drawImage(spritesRef.current.knife, px + 6, py + 6, tileW - 12, tileH - 12);
            } else {
              ctx.fillStyle = "#0f172a";
              ctx.fillText("🔪", px + tileW / 2, py + tileH / 2 + 5);
            }
          } else if (tile === "stove") {
            ctx.fillStyle = "#b91c1c";
            ctx.fillRect(px + 4, py + 4, tileW - 8, tileH - 8);
            if (spritesRef.current.pan?.complete) {
              ctx.drawImage(spritesRef.current.pan, px + 6, py + 6, tileW - 12, tileH - 12);
            } else {
              ctx.fillStyle = "#fef08a";
              ctx.fillText("🔥", px + tileW / 2, py + tileH / 2 + 5);
            }
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

    // 2. Render Counter Slot Items
    for (const [key, item] of gameState.counterSlots.entries()) {
      if (!item) continue;
      const [gx, gy] = key.split(",").map(Number);
      const cx = gx * tileW + tileW / 2;
      const cy = gy * tileH + tileH / 2;

      ctx.save();
      ctx.translate(cx, cy);

      // Item icon / 3D sprite
      if (item.type === "burger_dish" && spritesRef.current.burger?.complete) {
        ctx.drawImage(spritesRef.current.burger, -12, -12, 24, 24);
      } else if (item.type === "salad_dish" && spritesRef.current.salad?.complete) {
        ctx.drawImage(spritesRef.current.salad, -12, -12, 24, 24);
      } else if (item.type === "tomato_raw" && spritesRef.current.tomato?.complete) {
        ctx.drawImage(spritesRef.current.tomato, -10, -10, 20, 20);
      } else if (item.type === "lettuce_raw" && spritesRef.current.lettuce?.complete) {
        ctx.drawImage(spritesRef.current.lettuce, -10, -10, 20, 20);
      } else if (item.type === "meat_raw" && spritesRef.current.patty?.complete) {
        ctx.drawImage(spritesRef.current.patty, -10, -10, 20, 20);
      } else if (item.type === "plate_clean" && spritesRef.current.plate?.complete) {
        ctx.drawImage(spritesRef.current.plate, -10, -10, 20, 20);
      } else {
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
      }

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
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Held item floating above chef
      if (chef.heldItem) {
        if (chef.heldItem.type === "burger_dish" && spritesRef.current.burger?.complete) {
          ctx.drawImage(spritesRef.current.burger, -12, -34, 24, 24);
        } else if (chef.heldItem.type === "salad_dish" && spritesRef.current.salad?.complete) {
          ctx.drawImage(spritesRef.current.salad, -12, -34, 24, 24);
        } else if (chef.heldItem.type === "tomato_raw" && spritesRef.current.tomato?.complete) {
          ctx.drawImage(spritesRef.current.tomato, -10, -32, 20, 20);
        } else if (chef.heldItem.type === "lettuce_raw" && spritesRef.current.lettuce?.complete) {
          ctx.drawImage(spritesRef.current.lettuce, -10, -32, 20, 20);
        } else if (chef.heldItem.type === "meat_raw" && spritesRef.current.patty?.complete) {
          ctx.drawImage(spritesRef.current.patty, -10, -32, 20, 20);
        } else if (chef.heldItem.type === "plate_clean" && spritesRef.current.plate?.complete) {
          ctx.drawImage(spritesRef.current.plate, -10, -32, 20, 20);
        } else {
          ctx.font = "16px sans-serif";
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

          ctx.fillText(heldIcon, 0, -22);
        }
      }

      // Chopping progress indicator
      if (chef.isChopping) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(-12, 20, 24, 4);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-12, 20, 24 * chef.chopProgress, 4);
      }

      ctx.restore();
    }

    ctx.restore();
  }, [gameState]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto p-4 select-none">
      {/* 3-Chef Communication Transmission HUD */}
      {transmission && (
        <div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card shadow-sm text-sm transition-all animate-in fade-in">
          <span className="text-2xl">{transmission.speaker.avatar}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-xs">
                {transmission.speaker.name[lang] || transmission.speaker.name.ko}
              </span>
              <span className="text-xs text-muted-foreground">
                ({transmission.speaker.role[lang] || transmission.speaker.role.ko})
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {transmission.text[lang] || transmission.text.ko}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wider ${
              transmission.tag === "fire"
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : transmission.tag === "cheer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {transmission.tag.toUpperCase()}
          </span>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
        <GameStatTile
          label="Score"
          value={`¥${gameState.score.toLocaleString()}`}
          icon="💰"
        />
        <GameStatTile
          label="Combo"
          value={`x${gameState.comboCount}`}
          icon="⚡"
        />
        <GameStatTile
          label="Kitchen Stars"
          value={`⭐ ${metaSave.goldStars}`}
          icon="🌟"
        />
        <GameStatTile
          label="Status"
          value={gameState.hasFire ? "🚨 FIRE!" : gameState.status.toUpperCase()}
          icon="🍳"
        />
        <div className="flex flex-wrap items-center gap-2 col-span-2 sm:col-span-1">
          <a
            href="/prototypes/chaos-kitchen-unity/index.html"
            className="flex-1 py-2 px-2.5 rounded-md border border-primary/50 bg-primary/15 text-xs font-black text-primary hover:bg-primary/25 transition-colors text-center whitespace-nowrap"
          >
            🛰️ Unity 실시간 에디션
          </a>
          <TiltKitchenButton
            onClick={() => setShowQuests(true)}
            className="flex-1 py-2 px-2.5 rounded-md border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors"
          >
            📜 Quests
          </TiltKitchenButton>
          <TiltKitchenButton
            onClick={() => setShowUpgrades(true)}
            className="flex-1 py-2 px-2.5 rounded-md border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors"
          >
            🔬 Lab
          </TiltKitchenButton>
        </div>
      </div>

      {/* Orders Bar */}
      <div className="flex flex-wrap items-center gap-2 w-full p-2.5 rounded-lg border border-border bg-card">
        <span className="text-xs font-bold text-muted-foreground mr-1">ORDERS:</span>
        {gameState.orders.length === 0 ? (
          <span className="text-xs text-muted-foreground">Waiting for tickets...</span>
        ) : (
          gameState.orders.map((order) => {
            const pct = Math.max(0, (order.timeRemainingSec / order.maxTimeSec) * 100);
            return (
              <div
                key={order.id}
                className="flex flex-col gap-1 px-3 py-1.5 rounded border border-border bg-background min-w-28"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>
                    {order.recipe === "salad" ? "🥗 Salad" : order.recipe === "burger" ? "🍔 Burger" : "🥩 Steak"}
                  </span>
                  <span className="text-xs text-muted-foreground">¥{order.reward}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    style={{ "--progress-pct": `${pct}%` } as React.CSSProperties}
                    className={`h-full w-(--progress-pct) transition-all ${pct < 30 ? "bg-destructive" : pct < 60 ? "bg-warning" : "bg-primary"}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2D Kitchen Canvas */}
      <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden border border-border shadow-md bg-black">
        <canvas
          ref={canvasRef}
          width={640}
          height={448}
          className="w-full h-full object-contain"
        />

        {gameState.status !== "playing" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {gameState.status === "cleared" ? "🎉 3-Star Michelin Victory!" : "💀 Kitchen Overwhelmed"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {gameState.status === "cleared"
                ? `You served ${gameState.servedOrders} orders with ¥${gameState.score.toLocaleString()} revenue! Great teamwork!`
                : "Too many orders were burned or neglected. Re-sharpen knives and try again!"}
            </p>
            <div className="flex gap-2 mt-2">
              <TiltKitchenButton
                onClick={() => setGameState(initializeChaosKitchen())}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Play Again
              </TiltKitchenButton>
              <TiltKitchenButton
                onClick={() => shareText(`Chaos Kitchen Score: ¥${gameState.score.toLocaleString()}`)}
                className="px-4 py-2 rounded-md border border-border bg-card font-semibold hover:bg-accent transition-colors"
              >
                {copied ? "Copied!" : "Share"}
              </TiltKitchenButton>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <TiltKitchenButton
            onClick={() => {
              inputRef.current.chef1Mask |= 1;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~1;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Up (W)
          </TiltKitchenButton>
          <TiltKitchenButton
            onClick={() => {
              inputRef.current.chef1Mask |= 2;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~2;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Down (S)
          </TiltKitchenButton>
          <TiltKitchenButton
            onClick={() => {
              inputRef.current.chef1Mask |= 4;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~4;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Left (A)
          </TiltKitchenButton>
          <TiltKitchenButton
            onClick={() => {
              inputRef.current.chef1Mask |= 8;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~8;
              }, 200);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
          >
            Right (D)
          </TiltKitchenButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TiltKitchenButton
            onClick={() => {
              inputRef.current.chef1Mask |= 16;
              MobileHapticsPro.impact();
              playTone(440, "sine", 0.08);
            }}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Pick / Place (Space)
          </TiltKitchenButton>
          <TiltKitchenButton
            onClick={() => {
              inputRef.current.chef1Mask |= 32;
              MobileHapticsPro.heavy();
              playChop();
              setTimeout(() => {
                inputRef.current.chef1Mask &= ~32;
              }, 300);
            }}
            className="px-3 py-1.5 rounded bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-colors"
          >
            Chop / Action (F)
          </TiltKitchenButton>
        </div>
      </div>

      {/* Quests Modal */}
      {showQuests && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-foreground">📜 Kitchen Michelin Directives</h4>
              <button
                type="button"
                onClick={() => setShowQuests(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {quests.map((q) => {
                const isReady = q.progress >= q.maxProgress && !q.isClaimed;
                return (
                  <div
                    key={q.id}
                    className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-sm font-bold text-foreground">
                          {q.title[lang] || q.title.ko}
                        </h5>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {q.desc[lang] || q.desc.ko}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-warning whitespace-nowrap">
                        +{q.rewardStars} ⭐
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          style={{
                            "--quest-pct": `${Math.min(100, (q.progress / q.maxProgress) * 100)}%`,
                          } as React.CSSProperties}
                          className="h-full w-(--quest-pct) bg-primary transition-all"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {q.progress}/{q.maxProgress}
                      </span>
                      {q.isClaimed ? (
                        <span className="text-xs font-semibold text-muted-foreground">Claimed</span>
                      ) : isReady ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = claimKitchenQuestReward(q.id, quests, (stars) => {
                              setMetaSave((prev) => {
                                const next = { ...prev, goldStars: prev.goldStars + stars };
                                saveKitchenMetaSave(next);
                                return next;
                              });
                            });
                            setQuests(updated);
                            saveKitchenQuests(updated);
                            MobileHapticsPro.success();
                          }}
                          className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          Claim
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">In Progress</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Upgrades Modal */}
      {showUpgrades && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-foreground">🔬 Kitchen Equipment Lab</h4>
                <span className="text-xs font-bold text-warning">
                  ⭐ {metaSave.goldStars}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgrades(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {Object.keys(KITCHEN_UPGRADES).map((key) => {
                const up = KITCHEN_UPGRADES[key];
                const currentLvlKey = `${key}Lvl` as keyof KitchenMetaSave;
                const currentLvl = (metaSave[currentLvlKey] as number) || 0;
                const cost = Math.round(up.cost * Math.pow(up.costMult, currentLvl));
                const isMax = currentLvl >= up.maxLevel;
                const canAfford = metaSave.goldStars >= cost && !isMax;

                return (
                  <div
                    key={key}
                    className="p-3 rounded-lg border border-border bg-background flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{up.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-foreground">
                            {up.name[lang] || up.name.ko}
                          </h5>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Lv.{currentLvl}/{up.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {up.desc[lang] || up.desc.ko}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        const res = buyKitchenUpgrade(key as keyof typeof KITCHEN_UPGRADES, metaSave);
                        if (res.success) {
                          setMetaSave(res.newSave);
                          MobileHapticsPro.success();
                        }
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
                        isMax
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : canAfford
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {isMax ? "MAX" : `⭐ ${cost}`}
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

export default ChaosKitchen;
