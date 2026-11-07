import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { getSpriteUrl } from "../../lib/games/sprites";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "../../lib/games/share-card";
import { celebrate } from "../../lib/games/celebration";
import { Maximize2, Minimize2, Camera, Check, ScrollText, Wrench, X, ShieldAlert } from "lucide-react";
import {
  initializeVikingLongship,
  stepVikingLongship,
  type VikingLongshipState,
} from "../../lib/games/viking-longship";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { GameStatTile } from "../ui/game/GameStatTile";
import {
  type VikingLongshipQuest,
  loadVikingLongshipQuests,
  saveVikingLongshipQuests,
} from "../../lib/games/viking-longship-quests";
import {
  type VikingLongshipDialogue,
  pickVikingLongshipDialogue,
} from "../../lib/games/viking-longship-lore";
import {
  type VikingLongshipMetaSave,
  type VikingUpgradeDef,
  VIKING_UPGRADES,
  loadVikingLongshipMeta,
  saveVikingLongshipMeta,
  getVikingUpgradeCost,
  computeVikingLongshipModifiers,
} from "../../lib/games/viking-longship-meta";

function TiltVikingButton({
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

export function VikingLongship({ locale = "ko" }: { locale?: string }) {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal();
  const [gameState, setGameState] = useState<VikingLongshipState>(() => initializeVikingLongship());
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wakeHistoryRef = useRef<Array<{ x: number; y: number; alpha: number; size: number }>>([]);
  const inputRef = useRef({
    rudder: 0 as -1 | 0 | 1,
    trimDelta: 0,
    fireHarpoon: false,
    toggleAnchor: false,
    toggleOars: false,
    interactIsland: false,
    repairShip: false,
  });

  // 6대 상용 심화 시스템 상태
  const [quests, setQuests] = useState<VikingLongshipQuest[]>(loadVikingLongshipQuests);
  const [metaSave, setMetaSave] = useState<VikingLongshipMetaSave>(loadVikingLongshipMeta);
  const metaMods = useMemo(() => computeVikingLongshipModifiers(metaSave), [metaSave]);
  const [emergencyRepairsRemaining, setEmergencyRepairsRemaining] = useState<number>(() => metaMods.emergencyRepairs);
  const [loreDialogue, setLoreDialogue] = useState<VikingLongshipDialogue>(() => pickVikingLongshipDialogue("voyage_start"));
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // 퀘스트 진척도 갱신
  const updateQuestProgress = useCallback((questId: string, delta: number, isAbsolute = false) => {
    setQuests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== questId) return q;
        const newProg = isAbsolute ? delta : q.progress + delta;
        return {
          ...q,
          progress: Math.min(q.maxProgress, Math.max(q.progress, newProg)),
        };
      });
      saveVikingLongshipQuests(next);
      return next;
    });
  }, []);

  // 퀘스트 보상 수령
  const handleClaimQuest = useCallback((questId: string) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || q.isClaimed || q.progress < q.maxProgress) return;

    setQuests((prev) => {
      const next = prev.map((item) => (item.id === questId ? { ...item, isClaimed: true } : item));
      saveVikingLongshipQuests(next);
      return next;
    });

    setMetaSave((prev) => {
      const next = {
        ...prev,
        walletSilver: prev.walletSilver + q.rewardSilver,
      };
      saveVikingLongshipMeta(next);
      return next;
    });

    MobileHapticsPro.success();
  }, [quests]);

  // 조선소 영구 업그레이드
  const handleBuyUpgrade = useCallback((upgradeId: string) => {
    const def = VIKING_UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return;
    const currentLv = metaSave.upgradeLevels[upgradeId] || 0;
    if (currentLv >= def.maxLevel) return;
    const cost = getVikingUpgradeCost(def, currentLv);
    if (metaSave.walletSilver < cost) return;

    setMetaSave((prev) => {
      const next = {
        ...prev,
        walletSilver: prev.walletSilver - cost,
        upgradeLevels: {
          ...prev.upgradeLevels,
          [upgradeId]: currentLv + 1,
        },
      };
      saveVikingLongshipMeta(next);
      return next;
    });

    MobileHapticsPro.medium();
  }, [metaSave]);

  // 비상 수리 키트 발동
  const handleEmergencyRepair = useCallback(() => {
    if (emergencyRepairsRemaining <= 0) return;
    setEmergencyRepairsRemaining((prev) => prev - 1);
    setGameState((prev) => ({
      ...prev,
      hullHp: Math.min(prev.maxHullHp + metaMods.maxHpBonus, prev.hullHp + 45),
      activeLog: " 긴급 수리 키트로 선체 +45 HP를 즉시 복구했습니다!",
    }));
    MobileHapticsPro.heavy();
    if (containerRef?.current) {
      celebrate(containerRef.current, { preset: "sparks", scale: 1.2 });
    }
  }, [emergencyRepairsRemaining, metaMods.maxHpBonus, containerRef]);

  const getAudioContext = useAudioContext();
  const playVikingSound = useCallback(
    (type: "splash" | "sail" | "harpoon" | "rune" | "oars") => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "splash") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === "sail") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(260, now + 0.2);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === "harpoon") {
        osc.type = "square";
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === "rune") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.09);
        osc.frequency.setValueAtTime(659.25, now + 0.18);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "oars") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    },
    [getAudioContext]
  );

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
          playVikingSound("splash");
          break;
        case "r":
          inputRef.current.toggleOars = true;
          playVikingSound("oars");
          break;
        case "f":
          inputRef.current.fireHarpoon = true;
          playVikingSound("harpoon");
          break;
        case "e":
          inputRef.current.interactIsland = true;
          playVikingSound("rune");
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

        // 6대 심화 시스템: 룬스톤 발견 이벤트
        if (next.runestonesFound > prev.runestonesFound) {
          updateQuestProgress("quest_runestone_voyage", next.runestonesFound, true);
          setLoreDialogue(pickVikingLongshipDialogue("island_explore"));
          const silverBonus = Math.round(50 * metaMods.silverDredgeMult);
          setMetaSave((s) => {
            const nextSave = {
              ...s,
              walletSilver: s.walletSilver + silverBonus,
              totalIslandsExplored: s.totalIslandsExplored + 1,
            };
            saveVikingLongshipMeta(nextSave);
            return nextSave;
          });
          MobileHapticsPro.success();
        }

        // 6대 심화 시스템: 몬스터 처치 이벤트
        if (next.monsters.length < prev.monsters.length) {
          updateQuestProgress("quest_sea_slayer", 1, false);
          const silverBonus = Math.round(60 * metaMods.silverDredgeMult);
          setMetaSave((s) => {
            const nextSave = {
              ...s,
              walletSilver: s.walletSilver + silverBonus,
              totalMonstersDefeated: s.totalMonstersDefeated + 1,
            };
            saveVikingLongshipMeta(nextSave);
            return nextSave;
          });
          MobileHapticsPro.heavy();
        }

        // 6대 심화 시스템: 자원 수확 이벤트
        const prevRes = prev.wood + prev.iron;
        const nextRes = next.wood + next.iron;
        if (nextRes > prevRes) {
          const diff = nextRes - prevRes;
          updateQuestProgress("quest_timber_salvage", diff, false);
          const silverBonus = Math.round(diff * 4 * metaMods.silverDredgeMult);
          setMetaSave((s) => {
            const nextSave = { ...s, walletSilver: s.walletSilver + silverBonus };
            saveVikingLongshipMeta(nextSave);
            return nextSave;
          });
          MobileHapticsPro.medium();
        }

        // 6대 심화 시스템: 비프로스트 승리 이벤트
        if (next.status === "victory" && prev.status !== "victory") {
          updateQuestProgress("quest_bifrost_ascent", 1, true);
          setLoreDialogue(pickVikingLongshipDialogue("bifrost_victory"));
          const silverBonus = Math.round(200 * metaMods.silverDredgeMult);
          setMetaSave((s) => {
            const nextSave = {
              ...s,
              walletSilver: s.walletSilver + silverBonus,
              totalVoyagesCompleted: s.totalVoyagesCompleted + 1,
            };
            saveVikingLongshipMeta(nextSave);
            return nextSave;
          });
          MobileHapticsPro.success();
          if (containerRef?.current) {
            celebrate(containerRef.current, { preset: "sparks", scale: 1.4 });
          }
        }

        // 6대 심화 시스템: 선체 위기 이벤트
        if (next.hullHp < 30 && prev.hullHp >= 30) {
          setLoreDialogue(pickVikingLongshipDialogue("storm_danger"));
          MobileHapticsPro.selection();
        }

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

    // Update & draw Water Foam Wake Particles
    if (gameState.speed > 1) {
      const sternX = gameState.shipX + Math.sin(gameState.headingRad) * 22;
      const sternY = gameState.shipY - Math.cos(gameState.headingRad) * 22;
      wakeHistoryRef.current.push({
        x: sternX + (Math.random() - 0.5) * 8,
        y: sternY + (Math.random() - 0.5) * 8,
        alpha: 0.55,
        size: Math.random() * 5 + 3,
      });
    }

    wakeHistoryRef.current = wakeHistoryRef.current
      .map((p) => ({ ...p, alpha: p.alpha - 0.025, size: p.size + 0.35 }))
      .filter((p) => p.alpha > 0);

    for (const p of wakeHistoryRef.current) {
      ctx.fillStyle = `rgba(240, 249, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Render Longship (Viking Drakkar)
    ctx.save();
    ctx.translate(gameState.shipX, gameState.shipY);
    ctx.rotate(gameState.headingRad);

    // Soft drop shadow on water
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(2, 4, 11, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ship Hull Outer (Dark Oak Wood)
    ctx.fillStyle = "#582f0e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#ca8a04";
    ctx.stroke();

    // Inner Wooden Deck (Deck Planks)
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deck plank lines
    ctx.strokeStyle = "rgba(40, 20, 10, 0.4)";
    ctx.lineWidth = 1;
    for (let dy = -16; dy <= 16; dy += 6) {
      ctx.beginPath();
      ctx.moveTo(-6, dy);
      ctx.lineTo(6, dy);
      ctx.stroke();
    }

    // Viking Round Shields on Gunwales (3 on left, 3 on right)
    const shieldColors = ["#eab308", "#dc2626", "#2563eb"];
    for (let i = 0; i < 3; i++) {
      const sy = -10 + i * 10;
      const sColor = shieldColors[i];

      // Left Shield
      ctx.fillStyle = sColor;
      ctx.beginPath();
      ctx.arc(-8.5, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Right Shield
      ctx.fillStyle = sColor;
      ctx.beginPath();
      ctx.arc(8.5, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Dragon Prow (Front Dragon Head carving)
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-4, -22);
    ctx.lineTo(4, -22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#854d0e";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dragon Prow Eyes/Horns
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(-2, -26, 1, 0, Math.PI * 2);
    ctx.arc(2, -26, 1, 0, Math.PI * 2);
    ctx.fill();

    // Stern Rudder (Steering oar reacting to rudder input)
    ctx.save();
    ctx.translate(6, 24);
    ctx.rotate(inputRef.current.rudder * 0.35);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(-1.5, 0, 3, 10);
    ctx.restore();

    // Oars on sides if engaged
    if (gameState.oarsEngaged) {
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.8;
      const oarSwing = Math.sin(gameState.gameTimeSec * 9) * 5;
      for (let y = -8; y <= 12; y += 10) {
        ctx.beginPath();
        ctx.moveTo(-8, y);
        ctx.lineTo(-22, y + oarSwing);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(22, y - oarSwing);
        ctx.stroke();
      }
    }

    // Main Mast & 3D Billowing Crimson Viking Sail
    ctx.save();
    ctx.rotate(gameState.sailTrimRad);

    // Mast crossbeam
    ctx.fillStyle = "#451a03";
    ctx.fillRect(-16, -3, 32, 2.5);

    // Billowing Sail (curved with wind bulge)
    const billow = Math.min(8, Math.max(2, gameState.speed * 0.6 + 3));
    ctx.fillStyle = "#dc2626"; // Crimson
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(0, -2 - billow, 16, -2);
    ctx.lineTo(16, 6);
    ctx.quadraticCurveTo(0, 6 - billow, -16, 6);
    ctx.closePath();
    ctx.fill();

    // White stripes on sail
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 3;
    for (const sx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(sx, -2);
      ctx.quadraticCurveTo(sx, -2 - billow * 0.7, sx, 6);
      ctx.stroke();
    }
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
    MobileHapticsPro.click();
    setGameState(initializeVikingLongship());
    playTone(440, "sine", 0.15);
  };

  const handleShareCard = useCallback(async () => {
    MobileHapticsPro.click();
    const canvas = await createShareCardCanvas({
      title: "VIKING LONGSHIP",
      subtitle: gameState.status === "victory" ? "발할라 비프로스트 도달 성공!" : "발할라 해양 탐험 항해기",
      score: `${gameState.runestonesFound}/${gameState.requiredRunestones}`,
      slug: "viking-longship",
      customStats: [
        { label: "고대 룬스톤", value: `${gameState.runestonesFound} / ${gameState.requiredRunestones}개` },
        { label: "선체 내구도", value: `${Math.max(0, Math.floor(gameState.hullHp))}%` },
        { label: "항해 속도", value: `${gameState.speed.toFixed(1)} kts` },
      ],
      playerTitle: "VALHALLA VIKING CHIEFTAIN",
    });

    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `viking-longship-runestones-${gameState.runestonesFound}.png`);
    }
  }, [gameState.hullHp, gameState.requiredRunestones, gameState.runestonesFound, gameState.speed, gameState.status]);

  useEffect(() => {
    if (gameState.status === "victory") {
      MobileHapticsPro.success();
      if (containerRef.current) {
        celebrate(containerRef.current, { preset: "sparks" });
      }
    } else if (gameState.status === "shipwrecked") {
      MobileHapticsPro.heavy();
    }
  }, [gameState.status]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-background text-foreground rounded-xl border border-border shadow-sm transition-all ${
        isImmersive
          ? "fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md max-w-none w-full h-full p-6 justify-center"
          : ""
      }`}
    >
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Viking Longship: Valhalla Seas</h1>
          <p className="text-xs text-muted-foreground">
            Aero-dynamic sailing, Voronoi archipelagos, sea serpents & runestones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 비상 수리 키트 버튼 */}
          {emergencyRepairsRemaining > 0 && gameState.status === "sailing" && (
            <TiltVikingButton
              type="button"
              onClick={handleEmergencyRepair}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1"
              title="Emergency Planks"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>긴급 수리 ({emergencyRepairsRemaining})</span>
            </TiltVikingButton>
          )}

          {/* 퀘스트 지령 버튼 */}
          <TiltVikingButton
            type="button"
            onClick={() => setIsQuestModalOpen(true)}
            className="relative px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
            title="Quests"
          >
            <ScrollText className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">항해 지령</span>
            {quests.some((q) => !q.isClaimed && q.progress >= q.maxProgress) && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-5 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
              </span>
            )}
          </TiltVikingButton>

          {/* 조선소 강화 버튼 */}
          <TiltVikingButton
            type="button"
            onClick={() => setIsMetaModalOpen(true)}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 transition-colors flex items-center gap-1"
            title="Shipyard Upgrades"
          >
            <Wrench className="w-3.5 h-3.5 text-warning" />
            <span>🪙 {metaSave.walletSilver}</span>
          </TiltVikingButton>

          <TiltVikingButton
            type="button"
            onClick={handleShareCard}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Camera className="w-3.5 h-3.5" />}
            <span>{isCopied ? "복사 완료!" : "항해 카드 공유"}</span>
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New Expedition ↺
          </TiltVikingButton>
          <button
            type="button"
            onClick={togglePortal}
            className="p-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted/80 transition-colors"
            title={isImmersive ? "포털 축소" : "100dvh 전체화면"}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 노르드 선원 통신 대사 HUD 바 */}
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
        <span className="text-base select-none" aria-hidden="true">
          {loreDialogue.avatar}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-primary">{loreDialogue.name[locale] || loreDialogue.name.ko}</span>
            <span className="text-muted-foreground text-xs opacity-75">
              • {loreDialogue.title[locale] || loreDialogue.title.ko}
            </span>
          </div>
          <p className="truncate text-foreground text-xs">{loreDialogue.text[locale] || loreDialogue.text.ko}</p>
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
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-3 z-20">
            <div className="relative mb-1 flex items-center justify-center">
              <img
                src={getSpriteUrl("trophy")}
                alt="3D Trophy"
                className="w-16 h-16 drop-shadow-xl animate-bounce"
              />
            </div>
            <h2 className="text-2xl font-black">
              {gameState.status === "victory" ? "🏆 Welcomed to Valhalla!" : "💀 Drakkar Shipwrecked"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {gameState.status === "victory"
                ? "You activated all 3 ancient runestones and navigated through the Bifrost Gateway! Eternal glory awaits."
                : "Your hull was crushed or your crew succumbed to the icy abyss. Try again, chieftain."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <TiltVikingButton
                type="button"
                onClick={handleReset}
                className="px-5 py-2 font-bold text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
              >
                Set Sail Again ↺
              </TiltVikingButton>
              <TiltVikingButton
                type="button"
                onClick={handleShareCard}
                className="px-4 py-2 font-semibold text-sm rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4 text-primary" /> : <Camera className="w-4 h-4" />}
                <span>{isCopied ? "복사 완료!" : "항해 기록 공유"}</span>
              </TiltVikingButton>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Action Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border border-border text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1">Controls:</span>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.rudder = -1;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.rudder = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors shadow-xs"
          >
            ◀ Port (A)
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.rudder = 1;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.rudder = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors shadow-xs"
          >
            Starboard (D) ▶
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.trimDelta = 1.0;
              MobileHapticsPro.light();
              setTimeout(() => {
                inputRef.current.trimDelta = 0;
              }, 250);
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors shadow-xs"
          >
            Trim Sail (W)
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.toggleOars = true;
              MobileHapticsPro.medium();
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors shadow-xs"
          >
            {gameState.oarsEngaged ? "Rest Oars (R)" : "Row Oars (R)"}
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.toggleAnchor = true;
              MobileHapticsPro.medium();
            }}
            className="px-2 py-1 rounded border border-border bg-card hover:bg-accent transition-colors shadow-xs"
          >
            Anchor (Space)
          </TiltVikingButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.fireHarpoon = true;
              MobileHapticsPro.heavy();
            }}
            className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-colors shadow-xs"
          >
            Harpoon (F)
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.interactIsland = true;
              MobileHapticsPro.medium();
            }}
            className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-xs"
          >
            Explore Island (E)
          </TiltVikingButton>
          <TiltVikingButton
            type="button"
            onClick={() => {
              inputRef.current.repairShip = true;
              MobileHapticsPro.medium();
            }}
            className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-colors shadow-xs"
          >
            Repair (C) [10 Timber]
          </TiltVikingButton>
        </div>
      </div>

      {/* 퀘스트 지령 모달 */}
      {isQuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-black">바이킹 항해 생존 지령서</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 flex flex-col gap-3">
              {quests.map((q) => {
                const canClaim = !q.isClaimed && q.progress >= q.maxProgress;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{q.title[locale] || q.title.ko}</span>
                        <span className="text-xs font-bold text-warning">+{q.rewardSilver} 🪙</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.desc[locale] || q.desc.ko}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300 w-(--prog-pct)"
                            style={{ "--prog-pct": `${Math.min(100, (q.progress / q.maxProgress) * 100)}%` } as React.CSSProperties}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {q.progress}/{q.maxProgress}
                        </span>
                      </div>
                    </div>

                    <div>
                      {q.isClaimed ? (
                        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          수령 완료
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canClaim}
                          onClick={() => handleClaimQuest(q.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            canClaim
                              ? "bg-primary text-primary-foreground shadow hover:opacity-90"
                              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          }`}
                        >
                          보상 수령
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 바이킹 조선소 5대 영구 강화 모달 */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-warning" />
                <h3 className="text-base font-black">에이릭의 바이킹 조선소</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                  <span>🪙 {metaSave.walletSilver}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMetaModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="my-4 flex max-h-96 flex-col gap-2.5 overflow-y-auto pr-1">
              {VIKING_UPGRADES.map((upg) => {
                const currentLv = metaSave.upgradeLevels[upg.id] || 0;
                const isMax = currentLv >= upg.maxLevel;
                const cost = getVikingUpgradeCost(upg, currentLv);
                const canAfford = !isMax && metaSave.walletSilver >= cost;

                return (
                  <div
                    key={upg.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none" aria-hidden="true">{upg.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{upg.name[locale] || upg.name.ko}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                            Lv.{currentLv}/{upg.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{upg.desc[locale] || upg.desc.ko}</p>
                      </div>
                    </div>

                    <div>
                      {isMax ? (
                        <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                          MAX
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleBuyUpgrade(upg.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                            canAfford
                              ? "bg-warning text-warning-foreground shadow hover:opacity-90"
                              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <span>강화</span>
                          <span className="font-mono">({cost}🪙)</span>
                        </button>
                      )}
                    </div>
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

export default VikingLongship;
