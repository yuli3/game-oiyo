import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  createSliceMasterLevel,
  type Knife,
  type SliceMasterGame,
  type SliceObstacle,
  stepSliceMaster,
  tapFlipKnife,
} from "@/lib/games/slice-master";
import { useGameJuicePro, useDynamicDifficultyPro } from "@/lib/games/engine-suite-unified";
import { useArcadePortal } from "@/lib/games/arcade-portal";
import { SLICE_MASTER_SPRITES } from "@/lib/games/sprites";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "@/lib/games/share-card";
import { Maximize2, Minimize2, Share2, Check, Sparkles, Award, Wrench, X } from "lucide-react";
import { INITIAL_SLICE_QUESTS, type SliceQuest } from "@/lib/games/slice-master-quests";
import { SLICE_COMMS_LOGS, SLICE_SPEAKERS } from "@/lib/games/slice-master-lore";
import {
  buildSliceMetaModifiers,
  getSliceUpgradeCost,
  loadSliceMetaState,
  purchaseSliceMetaUpgrade,
  saveSliceMetaState,
  SLICE_META_UPGRADES,
  type SlicePlayerMetaState,
} from "@/lib/games/slice-master-meta";
import { nativeHaptics } from "@/lib/haptics/native-bridge";
import { GameStatTile } from "../ui/game/GameStatTile";

interface SliceMasterProps {
  locale?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SliceMasterAudio — Acoustic ASMR sound synthesizer
 * ────────────────────────────────────────────────────────────────────────── */
class SliceMasterAudio {
  private ctx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  private ensure() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Air whoosh swish on knife flip */
  playSwish() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.07);
    filter.Q.setValueAtTime(3, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /** Crisp ASMR fruit slice with combo pitch escalation */
  playSlice(combo: number = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const baseFreq = pentatonic[Math.min(combo - 1, pentatonic.length - 1)];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    const noiseLen = Math.floor(ctx.sampleRate * 0.03);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuf;

    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "highpass";
    nFilter.frequency.setValueAtTime(2400, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.15, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    nSrc.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(ctx.destination);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
    nSrc.start(now);
  }

  /** Solid thud when knife sticks cleanly into the board/floor */
  playStick() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Metallic clatter on hazard hit or flat landing */
  playHazardClank() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    [420, 780, 1140].forEach((freq, i) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.015);
      gain.gain.setValueAtTime(0.18, now + i * 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.015 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.015);
      osc.stop(now + i * 0.015 + 0.15);
    });
  }

  /** Celebratory fanfares on reaching bonus board */
  playVictory() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
    notes.forEach((freq, i) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.2, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.2);
    });
  }

  destroy() {
    this.ctx?.close().catch(() => {});
  }
}

export function SliceMaster({ locale = "ko" }: SliceMasterProps) {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: (locale as any) || "ko" });
  const [level, setLevel] = useState(1);
  const [metaState, setMetaState] = useState<SlicePlayerMetaState>(() => loadSliceMetaState());
  const [quests, setQuests] = useState<SliceQuest[]>(() => INITIAL_SLICE_QUESTS);
  const [showForgeModal, setShowForgeModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);

  const modifiers = buildSliceMetaModifiers(metaState);
  const [game, setGame] = useState<SliceMasterGame>(() => createSliceMasterLevel(1, modifiers));
  const [bestScore, setBestScore] = useState(0);
  const { addTrauma, shakeCssVars } = useGameJuicePro();
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const { reportSuccess, reportFailure } = useDynamicDifficultyPro();

  const gameRef = useRef<SliceMasterGame>(game);
  gameRef.current = game;

  const audioRef = useRef<SliceMasterAudio | null>(null);

  // Sync quest progress on score/slice/center/finish
  const checkQuests = useCallback((st: SliceMasterGame) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.completed) return q;
        let cur = q.current;
        if (q.id === "perfect_center") cur = st.perfectCenterCount;
        else if (q.id === "fever_combo") cur = Math.max(cur, st.combo);
        else if (q.id === "golden_pinata") cur = st.hasEncounteredGolden && st.stonesEarned >= 15 ? 1 : 0;
        else if (q.id === "master_course") cur = st.status === "completed" ? 1 : 0;

        const completed = cur >= q.target;
        if (completed && !q.completed) {
          nativeHaptics.trigger("success");
        }
        return { ...q, current: cur, completed };
      })
    );
  }, []);

  const handleClaimQuest = (questId: string) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || !q.completed || q.claimed) return;

    setQuests((prev) => prev.map((item) => (item.id === questId ? { ...item, claimed: true } : item)));
    setMetaState((prev) => {
      const next = { ...prev, sharpnessStones: prev.sharpnessStones + q.rewardStones };
      saveSliceMetaState(next);
      return next;
    });
    nativeHaptics.trigger("success");
  };

  const handlePurchaseUpgrade = (upgradeId: string) => {
    const res = purchaseSliceMetaUpgrade(metaState, upgradeId);
    if (res.success) {
      setMetaState(res.nextState);
      nativeHaptics.trigger("heavy");
    } else {
      nativeHaptics.trigger("error");
    }
  };

  const handleShareCard = useCallback(async () => {
    nativeHaptics.trigger("light");
    const canvas = createShareCardCanvas({
      title: "Slice Master 3D",
      score: `${game.score} PTS`,
      customStats: [
        { label: "Level", value: `Stage ${level}` },
        { label: "Sliced", value: `${game.sliceCount}` },
        { label: "Stones", value: `${metaState.sharpnessStones} 🪨` },
      ],
      slug: "slice-master",
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `slice-master-lvl${level}.png`);
    }
  }, [game.score, game.sliceCount, level, metaState.sharpnessStones]);

  // Initialize Web Audio Synthesizer
  useEffect(() => {
    audioRef.current = new SliceMasterAudio();
    return () => {
      audioRef.current?.destroy();
    };
  }, []);

  // Main high-performance RAF loop (60 FPS)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const current = gameRef.current;
      if (current.status === "flying" || current.hitStopRemaining > 0) {
        const step = stepSliceMaster(current, dt);

        if (step.slicedObstacles.length > 0) {
          audioRef.current?.playSlice(step.state.combo);
          nativeHaptics.trigger(step.state.combo >= 3 ? "heavy" : "medium");
          addTrauma(0.28);
        }

        if (step.stuckFloor) {
          audioRef.current?.playStick();
          nativeHaptics.trigger("light");
        }

        if (step.hitHazard) {
          audioRef.current?.playHazardClank();
          nativeHaptics.trigger("error");
          addTrauma(0.6);
          reportFailure();
        }

        if (step.hitTarget) {
          audioRef.current?.playVictory();
          nativeHaptics.trigger("success");
          addTrauma(0.45);
          reportSuccess();

          // Sync earned stones to player meta state
          setMetaState((prev) => {
            const next = { ...prev, sharpnessStones: prev.sharpnessStones + step.state.stonesEarned };
            saveSliceMetaState(next);
            return next;
          });
        }

        checkQuests(step.state);
        setGame(step.state);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [reportSuccess, reportFailure, checkQuests, addTrauma]);

  // Update best score
  useEffect(() => {
    if (game.score > bestScore) {
      setBestScore(game.score);
    }
  }, [game.score, bestScore]);

  // User input handling (Click / Tap / Spacebar)
  const handleFlip = useCallback(() => {
    const current = gameRef.current;
    if (current.status === "gameover") {
      // Restart current level
      const mods = buildSliceMetaModifiers(metaState);
      const nextGame = createSliceMasterLevel(level, mods);
      setGame(nextGame);
      return;
    }

    if (current.status === "completed") {
      // Advance to next level
      const nextLvl = level + 1;
      setLevel(nextLvl);
      const mods = buildSliceMetaModifiers(metaState);
      const nextGame = createSliceMasterLevel(nextLvl, mods);
      setGame(nextGame);
      return;
    }

    audioRef.current?.playSwish();
    nativeHaptics.trigger("light");
    const nextGame = tapFlipKnife(current);
    setGame(nextGame);
  }, [level, metaState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip]);

  const activeComms = SLICE_COMMS_LOGS[game.activeCommsLogId] || SLICE_COMMS_LOGS.start;
  const speaker = SLICE_SPEAKERS[activeComms.speakerId] || SLICE_SPEAKERS.hanzo;

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-4xl mx-auto flex flex-col items-center select-none overflow-hidden rounded-none sm:rounded-2xl border-x-0 sm:border border-border bg-card shadow-2xl transition-all duration-300 ${
        isImmersive ? "fixed inset-0 z-50 max-w-none rounded-none border-none h-screen bg-background" : "w-full h-full min-h-135 max-h-210"
      }`}
    >
      {/* ──────────────── Top HUD Bar ──────────────── */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border z-10">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm tracking-wide text-foreground">
            STAGE {level}
          </span>
          {game.combo > 1 && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-chart-4/20 text-chart-4 border border-chart-4/30 animate-pulse">
              {game.combo}x COMBO!
            </span>
          )}
        </div>

        {/* Tactical Sub-Modals & Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowQuestModal(true)}
          >
            <Award className="w-3.5 h-3.5 text-chart-4 mr-1" />
            <span className="hidden sm:inline">장인 의뢰</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForgeModal(true)}
          >
            <Wrench className="w-3.5 h-3.5 text-primary mr-1" />
            <span className="hidden sm:inline">대장간 연구</span>
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleShareCard}
            title="공유 카드"
          >
            {shareCardCopied ? <Check className="w-4 h-4 text-chart-2" /> : <Share2 className="w-4 h-4" />}
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={togglePortal}
            title="전체화면"
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ──────────────── Comms Lore Dialogue Strip ──────────────── */}
      <div className="w-full px-4 py-1.5 bg-muted/20 border-b border-border/50 flex items-center gap-2 text-xs z-10">
        <span className="text-base">{speaker.avatar}</span>
        <span className="font-bold text-foreground shrink-0">{speaker.name.ko || speaker.name.en}:</span>
        <span className="text-muted-foreground truncate">{activeComms.message.ko || activeComms.message.en}</span>
      </div>

      {/* ──────────────── Stat Tiles Bar ──────────────── */}
      <div className="w-full grid grid-cols-4 gap-2 px-3 py-2 bg-muted/10 border-b border-border/30 z-10">
        <GameStatTile label="현재 점수" value={`${game.score}`} icon="🎯" />
        <GameStatTile label="최고 점수" value={`${bestScore}`} icon="🏆" />
        <GameStatTile label="절단 사물" value={`${game.sliceCount}`} icon="🍎" />
        <GameStatTile label="보유 연마석" value={`${metaState.sharpnessStones} 🪨`} icon="✨" />
      </div>

      {/* ──────────────── Main SVG Viewport ──────────────── */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          handleFlip();
        }}
        style={{
          "--shake-x": shakeCssVars["--shake-x"],
          "--shake-y": shakeCssVars["--shake-y"],
          "--shake-rot": shakeCssVars["--shake-rot"],
        } as React.CSSProperties}
        className="relative w-full flex-1 cursor-pointer overflow-hidden flex items-center justify-center bg-muted/5 select-none touch-none transform translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot)"
      >
        <svg
          viewBox={`${game.cameraX} 0 800 450`}
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="slice-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-border/40" strokeWidth="0.8" />
            </pattern>
            {/* Subtle Gradient for Slicing Line */}
            <linearGradient id="blade-glow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect x={game.cameraX} y="0" width="800" height="450" fill="url(#slice-grid)" />

          {/* Floor & Chopping Board Base */}
          <rect
            x={game.cameraX - 100}
            y="360"
            width="1000"
            height="90"
            className="fill-muted/70 stroke-border"
            strokeWidth="2"
          />
          {/* Wood Cutting Mat Grain Lines */}
          <line
            x1={game.cameraX - 100}
            y1="362"
            x2={game.cameraX + 900}
            y2="362"
            className="stroke-primary/40"
            strokeWidth="3"
          />

          {/* Finish Line Indicator */}
          <g transform={`translate(${game.finishX + 30}, 270)`}>
            <line x1="0" y1="0" x2="0" y2="90" className="stroke-chart-4" strokeWidth="2" strokeDasharray="4 4" />
            <text x="0" y="-12" textAnchor="middle" fontSize="11" fontWeight="bold" className="fill-chart-4">
              FINISH LINE
            </text>
          </g>

          {/* Render All Obstacles (Fruits, Wood, Hazards, Target) */}
          {game.obstacles.map((obs) => (
            <RenderObstacleSvg key={obs.id} obstacle={obs} />
          ))}

          {/* Render Knife with 3D Shadow & High-Gloss Blade */}
          <RenderKnifeSvg knife={game.knife} />
        </svg>

        {/* Overlay Modals for Game Over / Victory */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <span className="text-5xl mb-2">💥</span>
            <h2 className="text-2xl font-black tracking-tight text-foreground mb-1">
              칼날이 튕겨나갔습니다!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              칼자루로 바닥에 떨어지거나 장애물에 부딪혔습니다. 칼날 각도를 유지하세요!
            </p>
            <div className="flex gap-3">
              <Button onClick={handleFlip} size="lg">
                다시 도전하기 (Tap / Space)
              </Button>
            </div>
          </div>
        )}

        {game.status === "completed" && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
            <span className="text-5xl mb-2">🎯</span>
            <h2 className="text-2xl font-black tracking-tight text-foreground mb-1">
              과녁 정중앙 명중!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              스테이지를 완벽히 통과했습니다! 획득 연마석: +{game.stonesEarned} 🪨
            </p>
            <div className="flex gap-3">
              <Button onClick={handleFlip} size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                다음 스테이지로 (Stage {level + 1})
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── Footer Action / Controls Bar ──────────────── */}
      <div className="w-full p-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>🖱️ 화면 탭 또는 [스페이스바]로 칼을 뒤집어 날리세요</span>
        <span className="font-medium">ASMR Knife Slicing 3D</span>
      </div>

      {/* ──────────────── 대장간 명검 각성 연구소 모달 ──────────────── */}
      {showForgeModal && (
        <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-5 shadow-2xl flex flex-col max-h-5/6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚔️</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">대장간 명검 각성 연구소</h3>
                  <p className="text-xs text-muted-foreground">보유 연마석: {metaState.sharpnessStones} 🪨</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgeModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {Object.values(SLICE_META_UPGRADES).map((def) => {
                const currentLvl = metaState.upgrades[def.id] || 0;
                const cost = getSliceUpgradeCost(def.id, currentLvl);
                const isMax = currentLvl >= def.maxLevel;
                const canAfford = metaState.sharpnessStones >= cost;

                return (
                  <div
                    key={def.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{def.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{def.name.ko}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            Lv.{currentLvl}/{def.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{def.desc.ko}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePurchaseUpgrade(def.id)}
                      disabled={isMax || !canAfford}
                      className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isMax ? "최대 레벨" : `${cost} 🪨 연마`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── 장인 작전 지령 모달 ──────────────── */}
      {showQuestModal && (
        <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-5 shadow-2xl flex flex-col max-h-5/6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📜</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">장인 한조의 작전 지령</h3>
                  <p className="text-xs text-muted-foreground">도검 수련 의뢰를 완수하고 연마석을 획득하세요</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {quests.map((q) => {
                const pct = Math.min(100, Math.round((q.current / q.target) * 100));
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                  >
                    <div className="flex-1 mr-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-foreground">{q.title.ko}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {q.current}/{q.target}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{q.desc.ko}</p>
                      <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                        <div
                          style={{ "--prog-pct": `${pct}%` } as React.CSSProperties}
                          className="h-full bg-primary transition-all duration-300 w-(--prog-pct)"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClaimQuest(q.id)}
                      disabled={!q.completed || q.claimed}
                      className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-chart-4 hover:bg-chart-4/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {q.claimed ? "수령 완료" : q.completed ? `+${q.rewardStones} 🪨 보상` : "진행 중"}
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

/* ────────────────────────────────────────────────────────────────────────────
 * RenderObstacleSvg — CodePen Floating Block Quarter-view Slice Effect
 * ────────────────────────────────────────────────────────────────────────── */
function RenderObstacleSvg({ obstacle }: { obstacle: SliceObstacle }) {
  const { x, y, width, height, type, label, sliced, color, mutation } = obstacle;

  // Finish Target: Huge Dartboard / Bell
  if (type === "finish_target") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="12"
          className={sliced ? "fill-primary/60 stroke-primary" : "fill-card stroke-chart-4"}
          strokeWidth="3"
        />
        <circle cx={width / 2} cy={height / 2} r="20" className="fill-chart-4/20 stroke-chart-4" strokeWidth="2" />
        <circle cx={width / 2} cy={height / 2} r="8" className="fill-chart-4" />
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          className="fill-foreground"
        >
          {label.split(" ")[0]}
        </text>
      </g>
    );
  }

  // Metal Hazard: Spiked Cogwheel
  if (type === "metal_hazard") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle
          cx={width / 2}
          cy={height / 2}
          r={width / 2 - 2}
          className="fill-muted stroke-destructive"
          strokeWidth="3"
        />
        <text
          x={width / 2}
          y={height / 2 + 5}
          textAnchor="middle"
          fontSize="18"
          className="fill-foreground pointer-events-none"
        >
          ⚙️
        </text>
      </g>
    );
  }

  // Fruit or Mutated item with CodePen 3D Quarter-view Slicing Split
  const fruitSprite =
    mutation === "golden"
      ? SLICE_MASTER_SPRITES.orange
      : label.includes("수박")
      ? SLICE_MASTER_SPRITES.watermelon
      : label.includes("오렌지") || label.includes("사과") || label.includes("레몬")
      ? SLICE_MASTER_SPRITES.orange
      : undefined;

  if (fruitSprite) {
    if (sliced) {
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Top Half flying left-up with 3D cut bevel */}
          <g transform="translate(-10, -12) rotate(-16)">
            <image
              href={fruitSprite}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid meet"
              clipPath="polygon(0 0, 100% 0, 100% 50%, 0 50%)"
            />
            {/* 3D Meat Bevel */}
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={width / 2 - 4}
              ry="3"
              className={mutation === "golden" ? "fill-chart-4" : "fill-primary/60"}
            />
          </g>
          {/* Bottom Half falling right-down */}
          <g transform="translate(10, 8) rotate(14)">
            <image
              href={fruitSprite}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid meet"
              clipPath="polygon(0 50%, 100% 50%, 100% 100%, 0 100%)"
            />
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={width / 2 - 4}
              ry="3"
              className={mutation === "golden" ? "fill-chart-4" : "fill-primary/60"}
            />
          </g>
        </g>
      );
    }

    return (
      <g transform={`translate(${x}, ${y})`}>
        {mutation === "golden" && (
          <circle cx={width / 2} cy={height / 2} r={width / 2 + 4} className="fill-chart-4/30 animate-pulse" />
        )}
        <image
          href={fruitSprite}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    );
  }

  // Wood / Diamond / Bomb Block
  if (sliced) {
    return (
      <g transform={`translate(${x}, ${y})`} style={{ "--item-color": color } as React.CSSProperties}>
        <g transform="translate(-8, -12) rotate(-14)">
          <rect
            x="0"
            y="0"
            width={width}
            height={height / 2}
            rx="4"
            fill="var(--item-color)"
            className="stroke-border"
            strokeWidth="1.5"
          />
        </g>
        <g transform="translate(8, 8) rotate(12)">
          <rect
            x="0"
            y={height / 2}
            width={width}
            height={height / 2}
            rx="4"
            fill="var(--item-color)"
            className="stroke-border"
            strokeWidth="1.5"
          />
        </g>
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`} style={{ "--item-color": color } as React.CSSProperties}>
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="8"
        fill="var(--item-color)"
        className="stroke-border"
        strokeWidth="1.5"
      />
      <text
        x={width / 2}
        y={height / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        className="fill-foreground"
      >
        {label.split(" ")[0]}
      </text>
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * RenderKnifeSvg — 3D High-Gloss Chef Knife with Dynamic Floor Shadow
 * ────────────────────────────────────────────────────────────────────────── */
function RenderKnifeSvg({ knife }: { knife: Knife }) {
  const { x, y, angle } = knife;
  const deg = (angle * 180) / Math.PI;
  const shadowOpacity = Math.max(0.1, 1 - (360 - y) / 300);

  return (
    <>
      {/* Floor Shadow */}
      <ellipse
        cx={x}
        cy="360"
        rx={Math.max(8, 24 * shadowOpacity)}
        ry="3.5"
        className="fill-foreground"
        opacity={shadowOpacity * 0.35}
      />

      {/* 3D Japanese Chef Knife: Rotated around knife handle pivot */}
      <g transform={`translate(${x}, ${y}) rotate(${deg})`}>
        <image
          href={SLICE_MASTER_SPRITES.knife}
          x="-8"
          y="-22"
          width="72"
          height="44"
          preserveAspectRatio="xMidYMid meet"
          className="drop-shadow-md"
        />
      </g>
    </>
  );
}

export default SliceMaster;
