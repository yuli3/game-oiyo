import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Droplets,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  RefreshCw,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Coins,
  Maximize2,
  Minimize2,
  Share2,
  Check,
  Wrench,
  ScrollText,
  X,
  ShieldAlert,
} from "lucide-react";
import {
  PowerWashEngine,
  NOZZLE_SPECS,
  type NozzleType,
  type PowerWashState,
} from "../../lib/games/powerwash-3d";
import {
  INITIAL_POWERWASH_QUESTS,
  type PowerWashQuest,
} from "../../lib/games/powerwash-3d-quests";
import {
  pickPowerWashDialogue,
  type PowerWashDialogue,
  type PowerWashTrigger,
} from "../../lib/games/powerwash-3d-lore";
import {
  POWERWASH_UPGRADES,
  loadPowerWashMeta,
  savePowerWashMeta,
  computePowerWashModifiers,
  getPowerWashUpgradeCost,
  type PowerWashMetaSave,
} from "../../lib/games/powerwash-3d-meta";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { getSpriteUrl, POWER_WASH_SPRITES } from "../../lib/games/sprites";

function TiltWashButton({
  children,
  onClick,
  className = "",
  disabled = false,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={() => {
        triggerPop(0.12);
        onClick?.();
      }}
      disabled={disabled}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transition-all duration-150 transform-(--card-tilt) will-change-transform ${className}`}
      style={{ "--card-tilt": transformCss || "none" } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export function PowerWash3D() {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: "ko" });

  // 1. 메타 영구 세이브 로드 및 엔진 초기화
  const [metaSave, setMetaSave] = useState<PowerWashMetaSave>(() => loadPowerWashMeta());
  const [engine] = useState(() => {
    const save = loadPowerWashMeta();
    const mods = computePowerWashModifiers(save);
    return new PowerWashEngine(0, mods);
  });
  const [gameState, setGameState] = useState<PowerWashState>(() => engine.getState());

  // 2. 퀘스트 상태
  const [quests, setQuests] = useState<PowerWashQuest[]>(() => INITIAL_POWERWASH_QUESTS);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);

  // 3. 연구소 모달 상태
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // 4. 로어 통신 대사
  const [currentDialogue, setCurrentDialogue] = useState<PowerWashDialogue>(() =>
    pickPowerWashDialogue("game_start")
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isSpraying, setIsSpraying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [dingBanner, setDingBanner] = useState<{ name: string; reward: number; key: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<WaterParticle[]>([]);
  const cursorRef = useRef<{ x: number; y: number }>({ x: 300, y: 220 });
  const isSprayingRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const flashPartMapRef = useRef<Record<string, number>>({});
  const clearedCelebratedRef = useRef(false);
  const gunImgRef = useRef<HTMLImageElement | null>(null);
  const lastHapticTimeRef = useRef<number>(0);

  // 스프라이트 이미지 프리로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const img = new Image();
      img.src = POWER_WASH_SPRITES.gun;
      img.onload = () => {
        gunImgRef.current = img;
      };
    }
  }, []);

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // 메타 세이브 동기화
  const updateMetaSave = useCallback((updater: (prev: PowerWashMetaSave) => PowerWashMetaSave) => {
    setMetaSave((prev) => {
      const next = updater(prev);
      savePowerWashMeta(next);
      engine.setModifiers(computePowerWashModifiers(next));
      return next;
    });
  }, [engine]);

  // 대사 트리거 헬퍼
  const triggerDialogue = useCallback((trigger: PowerWashTrigger) => {
    setCurrentDialogue(pickPowerWashDialogue(trigger));
  }, []);

  // Web Audio Synthesizer
  const playSound = useCallback((type: "spray" | "ding" | "scan" | "win") => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const t = ctx.currentTime;

      if (type === "spray") {
        const bufferSize = Math.floor(ctx.sampleRate * 0.045);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = engine.getState().selectedNozzle === "0deg" ? 2400 : 1500;
        filter.Q.value = 1.2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.045);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } else if (type === "ding") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(1318.51, t); // E6
        osc2.frequency.setValueAtTime(2637.02, t); // E7 harmonic

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.56);
        osc2.stop(t + 0.56);
      } else if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.18);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.21);
      } else if (type === "win") {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t + idx * 0.1);
          gain.gain.setValueAtTime(0.25, t + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.1);
          osc.stop(t + idx * 0.1 + 0.36);
        });
      }
    } catch {
      // Ignore AudioContext restriction
    }
  }, [engine]);

  // 퀘스트 진행도 갱신
  const checkQuestProgress = useCallback(
    (type: "part" | "nozzles" | "mutant" | "stage") => {
      setQuests((prev) =>
        prev.map((q) => {
          if (q.isClaimed) return q;
          let newProg = q.progress;
          if (q.id === "quest_first_clean" && type === "part") {
            newProg = Math.min(q.maxProgress, newProg + 1);
          } else if (q.id === "quest_nozzle_switch" && type === "nozzles") {
            newProg = engine.getState().usedNozzles.length;
          } else if (q.id === "quest_mutant_purge" && type === "mutant") {
            newProg = Math.min(q.maxProgress, engine.getState().mutantStrippedCount);
          } else if (q.id === "quest_stage_master" && type === "stage") {
            newProg = 1;
          }
          return { ...q, progress: newProg };
        })
      );
    },
    [engine]
  );

  const handleClaimQuest = (questId: string) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || q.isClaimed || q.progress < q.maxProgress) return;

    setQuests((prev) =>
      prev.map((item) => (item.id === questId ? { ...item, isClaimed: true } : item))
    );
    updateMetaSave((prev) => ({
      ...prev,
      walletCash: prev.walletCash + q.rewardCash,
    }));
    MobileHapticsPro.mediumImpact();
    playSound("ding");
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const def = POWERWASH_UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return;
    const currentLv = metaSave.upgradeLevels[upgradeId] || 0;
    if (currentLv >= def.maxLevel) return;

    const cost = getPowerWashUpgradeCost(def, currentLv);
    if (metaSave.walletCash < cost) return;

    updateMetaSave((prev) => ({
      ...prev,
      walletCash: prev.walletCash - cost,
      upgradeLevels: {
        ...prev.upgradeLevels,
        [upgradeId]: currentLv + 1,
      },
    }));
    MobileHapticsPro.mediumImpact();
    playSound("ding");
  };

  const completedCount = gameState.parts.filter((p) => p.isCompleted).length;

  const handleShareScore = useCallback(async () => {
    MobileHapticsPro.mediumImpact();
    try {
      const canvas = await createShareCardCanvas({
        title: "파워워시 클린 3D",
        slug: "powerwash-3d",
        score: `${gameState.totalCleanPercent}% (${gameState.stageTitle})`,
        subtitle: `보상: $${gameState.cashEarned} | 완료: ${completedCount}/${gameState.parts.length}`,
      });
      const copied = await copyShareCardToClipboard(canvas);
      if (copied) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        downloadShareCard(canvas, "powerwash-score.png");
      }
    } catch {
      // fallback
    }
  }, [gameState.totalCleanPercent, gameState.stageTitle, gameState.cashEarned, completedCount, gameState.parts.length]);

  const handleSelectStage = (stageIdx: number) => {
    clearedCelebratedRef.current = false;
    const fresh = engine.initStage(stageIdx);
    Object.assign(engine.getState(), fresh);
    setGameState({ ...engine.getState() });
    particlesRef.current = [];
    setDingBanner(null);
    triggerDialogue("game_start");
  };

  const handleSelectNozzle = (nozzle: NozzleType) => {
    engine.selectNozzle(nozzle);
    setGameState({ ...engine.getState() });
    checkQuestProgress("nozzles");
    if (nozzle === "soap") {
      triggerDialogue("soap_applied");
    } else if (nozzle === "0deg") {
      triggerDialogue("mutant_spotted");
    }
  };

  const handleToggleOrientation = useCallback(() => {
    engine.toggleOrientation();
    setGameState({ ...engine.getState() });
  }, [engine]);

  const handleTriggerHighlight = useCallback(() => {
    engine.triggerDirtHighlight();
    setGameState({ ...engine.getState() });
    playSound("scan");
  }, [engine, playSound]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") handleSelectNozzle("0deg");
      else if (e.key === "2") handleSelectNozzle("15deg");
      else if (e.key === "3") handleSelectNozzle("40deg");
      else if (e.key === "4") handleSelectNozzle("soap");
      else if (e.key.toLowerCase() === "r" || e.key.toLowerCase() === "q") handleToggleOrientation();
      else if (e.key.toLowerCase() === "f" || e.key === "Tab") {
        e.preventDefault();
        handleTriggerHighlight();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleToggleOrientation, handleTriggerHighlight]);

  const updatePointerCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    cursorRef.current = { x, y };
    engine.updateHoveredPart(x, y);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsSpraying(true);
    isSprayingRef.current = true;
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsSpraying(false);
    isSprayingRef.current = false;
  };

  // Main 60fps Canvas Render & Wash Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let soundTick = 0;

    const render = (time: number) => {
      const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05);
      lastTimeRef.current = time;

      engine.update(dt);

      if (isSprayingRef.current && engine.getState().status === "washing") {
        const { x, y } = cursorRef.current;
        const prevMutants = engine.getState().mutantStrippedCount;
        const completed = engine.sprayAt(x, y, dt);

        if (engine.getState().mutantStrippedCount > prevMutants) {
          checkQuestProgress("mutant");
        }

        soundTick += dt;
        if (soundTick >= 0.05) {
          soundTick = 0;
          playSound("spray");

          // CoreHaptics 지속 분사 미세 진폭
          if (time - lastHapticTimeRef.current > 120) {
            lastHapticTimeRef.current = time;
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(8);
            }
          }
        }

        // Water splash droplets & foam
        const isSoap = engine.getState().selectedNozzle === "soap";
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 110;
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 14,
            y: y + (Math.random() - 0.5) * 14,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 20,
            size: isSoap ? 4 + Math.random() * 4 : 2 + Math.random() * 2.5,
            color: isSoap ? "#ffffff" : "#bae6fd",
            life: 0.25 + Math.random() * 0.15,
            maxLife: 0.4,
          });
        }

        if (completed) {
          flashPartMapRef.current[completed.id] = 1.0;
          setDingBanner({ name: completed.name, reward: completed.reward, key: Date.now() });
          playSound("ding");
          triggerDialogue("part_cleared");
          checkQuestProgress("part");

          // 파츠 완료 시 지갑 머니 추가
          updateMetaSave((prev) => ({
            ...prev,
            walletCash: prev.walletCash + completed.reward,
            totalPartsCleaned: prev.totalPartsCleaned + 1,
          }));

          // CoreHaptics 더블 펄스 진동
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([25, 40, 60]);
          }

          if (engine.getState().status === "stage_clear") {
            playSound("win");
            triggerDialogue("stage_cleared");
            checkQuestProgress("stage");
            updateMetaSave((prev) => ({
              ...prev,
              totalStagesCleared: prev.totalStagesCleared + 1,
            }));

            if (!clearedCelebratedRef.current) {
              clearedCelebratedRef.current = true;
              MobileHapticsPro.heavyImpact();
              celebrate(containerRef.current, { preset: "sparks" });
            }
          }
        }
      }

      const st = engine.getState();
      setGameState({ ...st });

      // 1. Draw 3D Studio Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 340);
      skyGrad.addColorStop(0, "#0f172a");
      skyGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 340);

      // Floor perspective grid
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      for (let gx = -100; gx <= canvas.width + 100; gx += 45) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + (gx - canvas.width / 2) * 0.4, 340);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }

      // 2. Render Each Object Sub-Part + Layered Dirt & Soap Grid + 특수 고착 오염
      const cellRes = 8;
      for (const part of st.parts) {
        ctx.save();

        // Base clean surface
        const partGrad = ctx.createLinearGradient(part.x, part.y, part.x, part.y + part.h);
        partGrad.addColorStop(0, part.baseColor);
        partGrad.addColorStop(1, part.accentColor);
        ctx.fillStyle = partGrad;

        ctx.beginPath();
        ctx.roundRect(part.x, part.y, part.w, part.h, 8);
        ctx.fill();

        // Hovered outline
        if (st.hoveredPartId === part.id) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Dirt cells
        for (let r = 0; r < part.gridRows; r++) {
          for (let c = 0; c < part.gridCols; c++) {
            const cellDirt = part.dirtGrid[r][c];
            if (cellDirt > 0) {
              const cx = part.x + c * cellRes;
              const cy = part.y + r * cellRes;
              const cw = Math.min(cellRes, part.x + part.w - cx);
              const ch = Math.min(cellRes, part.y + part.h - cy);
              const grimeType = part.grimeTypeGrid[r][c];

              if (st.isHighlightingDirt) {
                ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + cellDirt * 0.5})`;
              } else if (grimeType === "tar") {
                // 굳은 타르: 흑갈색
                ctx.fillStyle = `rgba(24, 24, 27, ${0.75 + cellDirt * 0.25})`;
              } else if (grimeType === "rust") {
                // 붉은 녹: 암적색
                ctx.fillStyle = `rgba(185, 28, 28, ${0.7 + cellDirt * 0.3})`;
              } else if (grimeType === "moss") {
                // 바이오 이끼: 진녹색
                ctx.fillStyle = `rgba(21, 128, 61, ${0.7 + cellDirt * 0.3})`;
              } else {
                // 일반 진흙
                ctx.fillStyle = `rgba(80, 50, 30, ${0.4 + cellDirt * 0.6})`;
              }
              ctx.fillRect(cx, cy, cw, ch);

              // 비누 거품 레이어
              if (part.soapGrid[r][c]) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                ctx.beginPath();
                ctx.arc(cx + cw / 2, cy + ch / 2, Math.min(cw, ch) * 0.45, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }

        // Flash burst on completion
        if (flashPartMapRef.current[part.id]) {
          const flashAlpha = flashPartMapRef.current[part.id];
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
          ctx.beginPath();
          ctx.roundRect(part.x, part.y, part.w, part.h, 8);
          ctx.fill();
          flashPartMapRef.current[part.id] -= dt * 2.2;
          if (flashPartMapRef.current[part.id] <= 0) {
            delete flashPartMapRef.current[part.id];
          }
        }

        ctx.restore();
      }

      // 3. Update & Draw Splash Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 220 * dt; // Gravity
        p.life -= dt;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 4. Render Nozzle Reticle & Pressure Spray Fan
      const curX = cursorRef.current.x;
      const curY = cursorRef.current.y;
      const spec = NOZZLE_SPECS[st.selectedNozzle];
      const rx = (st.orientation === "horizontal" ? spec.radiusX : spec.radiusY) * engine.getModifiers().radiusMult;
      const ry = (st.orientation === "horizontal" ? spec.radiusY : spec.radiusX) * engine.getModifiers().radiusMult;

      ctx.save();
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(curX, curY, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Center crosshair
      ctx.setLineDash([]);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(curX - 6, curY);
      ctx.lineTo(curX + 6, curY);
      ctx.moveTo(curX, curY - 6);
      ctx.lineTo(curX, curY + 6);
      ctx.stroke();

      // Spraying water stream
      if (isSprayingRef.current && st.status === "washing") {
        const streamGrad = ctx.createRadialGradient(curX, curY, 2, curX, curY, rx);
        streamGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
        streamGrad.addColorStop(0.5, spec.color + "99");
        streamGrad.addColorStop(1, "transparent");
        ctx.fillStyle = streamGrad;
        ctx.beginPath();
        ctx.ellipse(curX, curY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render 3D Gun Overlay
      if (gunImgRef.current) {
        ctx.drawImage(gunImgRef.current, curX + 18, curY + 18, 56, 56);
      }
      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [engine, playSound, checkQuestProgress, triggerDialogue, updateMetaSave]);

  const unclaimedQuestsCount = quests.filter((q) => !q.isClaimed && q.progress >= q.maxProgress).length;

  return (
    <div
      ref={containerRef}
      className={`mx-auto flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl transition-all duration-300 ${
        isImmersive ? "fixed inset-0 z-50 overflow-y-auto rounded-none p-6" : "max-w-4xl"
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Droplets className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-1.5">
              <span>파워워시 클린 3D</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                PRO 6-SYSTEM
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">{gameState.stageTitle}</p>
          </div>
        </div>

        {/* Global Controls & Modals */}
        <div className="flex items-center gap-2">
          {/* 정화 의뢰서 퀘스트 버튼 */}
          <TiltWashButton
            onClick={() => setIsQuestModalOpen(true)}
            className="relative flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            <ScrollText className="h-4 w-4 text-primary" />
            <span>정화 의뢰</span>
            {unclaimedQuestsCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground animate-pulse">
                {unclaimedQuestsCount}
              </span>
            )}
          </TiltWashButton>

          {/* 정비소 튜닝 연구소 버튼 */}
          <TiltWashButton
            onClick={() => setIsMetaModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            <Wrench className="h-4 w-4 text-warning" />
            <span>정비소 튜닝</span>
          </TiltWashButton>

          {/* 지갑 잔액 배지 */}
          <div className="flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
            <Coins className="h-3.5 w-3.5" />
            <span>${metaSave.walletCash}</span>
          </div>

          <TiltWashButton
            onClick={handleTriggerHighlight}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
            title="오염 하이라이트 스캔 (단축키: F / Tab)"
          >
            <Eye className="h-4 w-4 text-destructive" />
            <span className="hidden sm:inline">스캔 [F]</span>
          </TiltWashButton>

          <TiltWashButton
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
            title="노즐 각도 회전 (단축키: Q / R)"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">회전 [Q]</span>
          </TiltWashButton>

          <TiltWashButton
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-lg border border-border bg-muted/30 p-1.5 text-foreground hover:bg-muted"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
          </TiltWashButton>

          <TiltWashButton
            onClick={togglePortal}
            className="rounded-lg border border-border bg-muted/30 p-1.5 text-foreground hover:bg-muted"
          >
            {isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </TiltWashButton>
        </div>
      </div>

      {/* 스토리 로어 의뢰인 통신 HUD */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card border border-primary/30 text-2xl shadow-xs">
          {currentDialogue.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-primary">{currentDialogue.name.ko}</span>
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">
              {currentDialogue.title.ko}
            </span>
          </div>
          <p className="text-xs text-foreground mt-0.5 line-clamp-2">
            "{currentDialogue.text.ko}"
          </p>
        </div>
      </div>

      {/* Cleanliness Dashboard Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">CLEANLINESS</span>
            <p className="text-base font-black text-foreground">{gameState.totalCleanPercent}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">STAGE PAYOUT</span>
            <p className="text-base font-black text-foreground">${gameState.cashEarned}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">PARTS WASHED</span>
            <p className="text-base font-black text-foreground">
              {completedCount} / {gameState.parts.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">MUTANT STRIPPED</span>
            <p className="text-base font-black text-foreground">
              {gameState.mutantStrippedCount}개 박리
            </p>
          </div>
        </div>
      </div>

      {/* 3D Washing Viewport */}
      <div className="relative mx-auto aspect-4/3 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-black shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={440}
          className="h-full w-full cursor-none touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Iconic "DING!" Part Completed Toast */}
        {dingBanner && (
          <div
            key={dingBanner.key}
            className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 animate-bounce rounded-full border border-primary bg-card/90 px-4 py-1.5 text-xs font-bold text-primary shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-warning" />
            <span>DING! {dingBanner.name} 100% 세척 완료! (+${dingBanner.reward})</span>
          </div>
        )}

        {/* Stage Clear Overlay */}
        {gameState.status === "stage_clear" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-xs text-center z-10">
            <div className="relative flex size-20 items-center justify-center rounded-3xl bg-primary/20 p-2 mb-3 border border-primary/40 shadow-xl">
              <img
                src={getSpriteUrl('trophy', 128)}
                alt="Clear Trophy"
                className="size-14 object-contain animate-bounce"
                draggable={false}
              />
              <img
                src={POWER_WASH_SPRITES.gun}
                alt="Power Gun"
                className="absolute -bottom-2 -right-2 size-8 object-contain drop-shadow"
                draggable={false}
              />
            </div>
            <h3 className="text-2xl font-black text-foreground">JOB COMPLETE! 100% CLEAN</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {gameState.stageTitle}의 모든 찌든 때를 완벽하게 세척했습니다!
            </p>
            <div className="my-3 grid grid-cols-2 gap-4 border border-border rounded-lg p-3 bg-card/70 text-left w-full max-w-xs shadow-xs">
              <div>
                <p className="text-xs text-muted-foreground">PARTS WASHED</p>
                <p className="text-lg font-bold text-primary">
                  {gameState.parts.length} / {gameState.parts.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TOTAL PAYOUT</p>
                <p className="text-lg font-bold text-warning">${gameState.cashEarned}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TiltWashButton
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow hover:bg-muted"
                onClick={handleShareScore}
              >
                {isCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
                <span>{isCopied ? "복사됨!" : "기록 공유"}</span>
              </TiltWashButton>
              <TiltWashButton
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
                onClick={() => handleSelectStage((gameState.stageIndex + 1) % 3)}
              >
                다음 의뢰 오브젝트 세척하기
                <ChevronRight className="h-4 w-4" />
              </TiltWashButton>
            </div>
          </div>
        )}
      </div>

      {/* 4 Nozzle Selector Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["0deg", "15deg", "40deg", "soap"] as NozzleType[]).map((nozId, idx) => {
          const spec = NOZZLE_SPECS[nozId];
          const isSelected = gameState.selectedNozzle === nozId;
          const isSoap = nozId === "soap";
          return (
            <TiltWashButton
              key={nozId}
              className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/15 shadow-xs ring-1 ring-primary"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
              onClick={() => handleSelectNozzle(nozId)}
            >
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-card border border-border overflow-hidden">
                <img
                  src={isSoap ? POWER_WASH_SPRITES.foam : POWER_WASH_SPRITES.nozzle}
                  alt={spec.name}
                  className="size-8 object-contain"
                  draggable={false}
                />
                <span
                  className="absolute bottom-0 right-0 size-2.5 rounded-tl-xs bg-(--noz-col)"
                  style={{ "--noz-col": spec.color } as React.CSSProperties}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="text-xs font-bold text-foreground truncate">{spec.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">[{idx + 1}]</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {nozId === "0deg"
                    ? "초고압 찌든때/타르 분쇄"
                    : nozId === "15deg"
                    ? "표준 밸런스 부채꼴"
                    : nozId === "40deg"
                    ? "광역 빠른 먼지/이끼 제거"
                    : "비누 거품 도포 (녹 2.5배)"}
                </span>
              </div>
            </TiltWashButton>
          );
        })}
      </div>

      {/* Footer Instructions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>
            세척 팁: 비누 거품[4]을 먼저 뿌린 뒤 15°[2] 또는 40°[3] 노즐로 헹구면 찌든 때가 2.5배 빠르게 지워집니다. 덜 닦인 곳은 [F] 스캔!
          </span>
        </div>
      </div>

      {/* 퀘스트 모달 */}
      {isQuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-black">마을 정화 의뢰서</h3>
              </div>
              <TiltWashButton
                onClick={() => setIsQuestModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </TiltWashButton>
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
                        <span className="text-xs font-bold text-foreground">{q.title.ko}</span>
                        <span className="text-xs font-bold text-warning">+${q.rewardCash}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.desc.ko}</p>
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
                        <TiltWashButton
                          disabled={!canClaim}
                          onClick={() => handleClaimQuest(q.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            canClaim
                              ? "bg-primary text-primary-foreground shadow hover:opacity-90"
                              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          }`}
                        >
                          보상 수령
                        </TiltWashButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 정비소 튜닝 연구소 모달 */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-warning" />
                <h3 className="text-base font-black">정비공 마이크의 장비 튜닝소</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                  <Coins className="h-3.5 w-3.5" />
                  <span>${metaSave.walletCash}</span>
                </div>
                <TiltWashButton
                  onClick={() => setIsMetaModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </TiltWashButton>
              </div>
            </div>

            <div className="my-4 flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {POWERWASH_UPGRADES.map((def) => {
                const curLv = metaSave.upgradeLevels[def.id] || 0;
                const isMax = curLv >= def.maxLevel;
                const cost = getPowerWashUpgradeCost(def, curLv);
                const canAfford = !isMax && metaSave.walletCash >= cost;

                return (
                  <div
                    key={def.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-card border border-border text-xl">
                        {def.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{def.name.ko}</span>
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                            LV {curLv} / {def.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{def.desc.ko}</p>
                      </div>
                    </div>

                    <div>
                      {isMax ? (
                        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          MAX
                        </span>
                      ) : (
                        <TiltWashButton
                          disabled={!canAfford}
                          onClick={() => handleBuyUpgrade(def.id)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                            canAfford
                              ? "bg-warning text-warning-foreground shadow hover:opacity-90"
                              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>${cost}</span>
                        </TiltWashButton>
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

export default PowerWash3D;
