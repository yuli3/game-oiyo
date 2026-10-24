/**
 * CosmicMerge.tsx
 *
 * 100% Canvas GPU 120fps Cosmic Merge Drop (Suika-style 2D physics merge game).
 * Powered by Matter.js rigid-body physics, procedural Web Audio synth chords,
 * haptic rumble, spring squash & stretch, and Arcade Immersion Portal (100dvh + WakeLock).
 *
 * Date: 2026-10-17
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { celebrate } from "../../lib/games/celebration";
import { COSMIC_MERGE_SPRITES } from "../../lib/games/sprites";
import type { Locale } from "../../lib/i18n";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  clampDropperX,
  computeMergeResult,
  COSMIC_TIERS,
  DEADLINE_Y,
  DROP_COOLDOWN_MS,
  getNextDropTier,
  MAX_TIER_INDEX,
  calculateVortexEnergyGain,
  calculateVortexPull,
  VORTEX_DURATION_MS,
  VORTEX_MAX_ENERGY,
} from "../../lib/games/cosmic-merge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { GameShell } from "../ui/game/GameShell";
import { buildChallengeUrl } from "../../lib/games/seed-challenge";
import type { FlowPhase } from "../../lib/games/game-flow";
import { getGlobalBgmController } from "../../lib/games/bgm";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import {
  createScreenShakeEngine,
  addScreenShakeTrauma,
  stepScreenShake,
  sampleScreenShakeOffset,
  type ScreenShakeEngine,
} from "../../lib/games/screen-shake";

interface Props {
  locale?: Locale;
}

interface StardustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

interface FloatingScore {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface CelestialUserData {
  tier: number;
  createdAt: number;
  squash: number;
  isDead?: boolean;
}

const STORAGE_KEY = "cosmic-merge-best";

const PENTATONIC_FREQS = [
  261.63, // C4 - Asteroid
  293.66, // D4 - Moon
  329.63, // E4 - Mercury
  392.0,  // G4 - Mars
  440.0,  // A4 - Venus
  523.25, // C5 - Earth
  587.33, // D5 - Neptune
  659.25, // E5 - Uranus
  783.99, // G5 - Saturn
  880.0,  // A5 - Jupiter
  1046.5, // C6 - Sun
];

const COPY = {
  ko: {
    title: "코스믹 머지 드롭",
    score: "점수",
    best: "최고 점수",
    next: "다음 천체",
    deadline: "위험선",
    gameover: "성간 충돌 — 우주 붕괴",
    restart: "우주 재창조 (RESTART)",
    soundOn: "소리 켜기",
    soundOff: "소리 끄기",
    controlsHint: "터치/마우스로 조준 후 놓아서 드롭 · 같은 천체를 합쳐 태양을 만드세요!",
    newBest: "신기록 달성!",
    codex: "천체 도감",
    codexSubtitle: "태양계 11단계 진화 계보",
    share: "점수 공유",
    copied: "복사 완료!",
    close: "닫기",
    unlocked: "발견 완료",
    locked: "미지의 천체",
    vortex: "중력 볼텍스",
    vortexReady: "볼텍스 [V]",
    vortexActive: "볼텍스 가동 중",
  },
  en: {
    title: "Cosmic Merge Drop",
    score: "Score",
    best: "Best",
    next: "Next",
    deadline: "Deadline",
    gameover: "Supernova — Collapse",
    restart: "Recreate Universe (RESTART)",
    soundOn: "Unmute",
    soundOff: "Mute",
    controlsHint: "Aim and release to drop · Merge matching bodies to create the Sun!",
    newBest: "New High Score!",
    codex: "Cosmic Codex",
    codexSubtitle: "11-tier solar evolution hierarchy",
    share: "Share Score",
    copied: "Copied!",
    close: "Close",
    unlocked: "Discovered",
    locked: "Undiscovered",
    vortex: "Gravity Vortex",
    vortexReady: "Vortex [V]",
    vortexActive: "Vortex Active",
  },
  ja: {
    title: "コズミック・マージ・ドロップ",
    score: "スコア",
    best: "ハイスコア",
    next: "次",
    deadline: "限界線",
    gameover: "超新星爆発 — 崩壊",
    restart: "再挑戦 (RESTART)",
    soundOn: "音声オン",
    soundOff: "音声オフ",
    controlsHint: "ドラッグで狙って離してドロップ · 同じ星を合体させて太陽を作ろう！",
    newBest: "新記録達成！",
    codex: "天体図鑑",
    codexSubtitle: "太陽系11段階進化の系譜",
    share: "スコア共有",
    copied: "コピー完了！",
    close: "閉じる",
    unlocked: "発見済み",
    locked: "未発見の天体",
    vortex: "重力ボルテックス",
    vortexReady: "ボルテックス [V]",
    vortexActive: "ボルテックス発動中",
  },
  zh: {
    title: "宇宙合成消除",
    score: "得分",
    best: "最高分",
    next: "下一个",
    deadline: "危险线",
    gameover: "超新星爆发 — 宇宙崩塌",
    restart: "重新开始 (RESTART)",
    soundOn: "开启声音",
    soundOff: "静音",
    controlsHint: "拖动瞄准，松手掉落 · 合成相同天体，打造辉煌太阳！",
    newBest: "新纪录！",
    codex: "天体图鉴",
    codexSubtitle: "太阳系天体11级演化阶梯",
    share: "分享成绩",
    copied: "已复制！",
    close: "关闭",
    unlocked: "已发现",
    locked: "未知天体",
    vortex: "引力漩涡",
    vortexReady: "漩涡就绪 [V]",
    vortexActive: "漩涡爆发中",
  },
  fr: {
    title: "Cosmic Merge Drop",
    score: "Score",
    best: "Meilleur",
    next: "Suivant",
    deadline: "Limite",
    gameover: "Supernova — Effondrement",
    restart: "Recommencer (RESTART)",
    soundOn: "Activer le son",
    soundOff: "Couper le son",
    controlsHint: "Visez et relâchez pour lâcher · Fusionnez les astres identiques jusqu'au Soleil !",
    newBest: "Nouveau record !",
    codex: "Codex Cosmique",
    codexSubtitle: "Hiérarchie d'évolution en 11 niveaux",
    share: "Partager",
    copied: "Copié !",
    close: "Fermer",
    unlocked: "Découvert",
    locked: "Inconnu",
    vortex: "Vortex gravitationnel",
    vortexReady: "Vortex [V]",
    vortexActive: "Vortex actif",
  },
  es: {
    title: "Cosmic Merge Drop",
    score: "Puntuación",
    best: "Mejor",
    next: "Siguiente",
    deadline: "Límite",
    gameover: "Supernova — Colapso",
    restart: "Reiniciar (RESTART)",
    soundOn: "Activar sonido",
    soundOff: "Silenciar",
    controlsHint: "Apunta y suelta para soltar · ¡Fusiona astros iguales hasta crear el Sol!",
    newBest: "¡Nuevo récord!",
    codex: "Códice Cósmico",
    codexSubtitle: "Jerarquía de evolución en 11 niveles",
    share: "Compartir",
    copied: "¡Copiado!",
    close: "Cerrar",
    unlocked: "Descubierto",
    locked: "Desconocido",
    vortex: "Vórtice gravitatorio",
    vortexReady: "Vórtice [V]",
    vortexActive: "Vórtice activo",
  },
};

export const CosmicMerge: React.FC<Props> = ({ locale = "en" }) => {
  const t = COPY[locale] ?? COPY.en;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<FlowPhase>("title");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [currentTier, setCurrentTier] = useState<number>(0);
  const [nextTier, setNextTier] = useState<number>(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isDanger, setIsDanger] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [highestTierUnlocked, setHighestTierUnlocked] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  // Pillar 2: Chaos Modifier - Gravitational Singularity Vortex
  const [vortexEnergy, setVortexEnergy] = useState<number>(0);
  const [isVortexActive, setIsVortexActive] = useState<boolean>(false);
  const vortexActiveRef = useRef(false);
  const vortexEndTimeRef = useRef(0);
  const vortexEnergyRef = useRef(0);
  vortexEnergyRef.current = vortexEnergy;

  // References for physics and animation loop
  const phaseRef = useRef<FlowPhase>("title");
  phaseRef.current = phase;
  const isGameOverRef = useRef(false);
  isGameOverRef.current = isGameOver;

  const engineRef = useRef<Matter.Engine | null>(null);
  const dropperXRef = useRef<number>(ARENA_WIDTH / 2);
  const lastDropTimeRef = useRef<number>(0);
  const dangerTimerRef = useRef<number | null>(null);
  const particlesRef = useRef<StardustParticle[]>([]);
  const shockwavesRef = useRef<ShockwaveRing[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const shakeEngineRef = useRef<ScreenShakeEngine>(
    createScreenShakeEngine({ maxOffsetPx: 14, maxAngleDeg: 2.5, decayRate: 1.6 })
  );
  const shakeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const scoreRef = useRef(0);
  scoreRef.current = score;

  // Restore saved muted and highest discovered tier settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("cosmic-merge-muted");
      if (savedMute !== null) {
        setMuted(savedMute === "true");
      }
      const savedHighest = localStorage.getItem("cosmic-merge-highest-tier");
      if (savedHighest !== null) {
        setHighestTierUnlocked(parseInt(savedHighest, 10));
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("cosmic-merge-muted", String(next));
      }
      getGlobalBgmController("cosmic").setMuted(next);
      return next;
    });
  }, []);

  // Initialize and resume AudioContext on user action
  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Web Audio Synthesizer: pentatonic chords on merge, soft sine on drop
  const playDropSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio optional
    }
  }, [getAudioContext]);

  const playMergeSound = useCallback(
    (tier: number) => {
      if (mutedRef.current) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        const baseFreq = PENTATONIC_FREQS[Math.min(tier, PENTATONIC_FREQS.length - 1)];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = tier >= 8 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.22);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);

        // Extra harmony chord for high tiers
        if (tier >= 5) {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.type = "sine";
          chordOsc.frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime);
          chordOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.875, ctx.currentTime + 0.28);
          chordGain.gain.setValueAtTime(0.06, ctx.currentTime);
          chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
          chordOsc.connect(chordGain);
          chordGain.connect(ctx.destination);
          chordOsc.start();
          chordOsc.stop(ctx.currentTime + 0.28);
        }
      } catch {
        // Audio optional
      }
    },
    [getAudioContext]
  );

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Haptics optional
      }
    }
  }, []);

  // Web Audio Synthesizer: deep resonant vortex sweep
  const playVortexSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(160, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 1.2);
      filter.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 2.4);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(65, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 1.2);
      osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 2.4);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.4);
    } catch {
      // Audio optional
    }
  }, [getAudioContext]);

  // Activate Gravitational Singularity Vortex (Chaos Modifier)
  const activateVortex = useCallback(() => {
    if (vortexEnergyRef.current < VORTEX_MAX_ENERGY || vortexActiveRef.current) return;
    vortexActiveRef.current = true;
    vortexEndTimeRef.current = performance.now() + VORTEX_DURATION_MS;
    setIsVortexActive(true);
    setVortexEnergy(0);
    vibrate([30, 40, 50, 40, 30]);
    playVortexSound();
    getGlobalBgmController("cosmic").duck(VORTEX_DURATION_MS, 0.2);
  }, [playVortexSound, vibrate]);

  // Hook for Arcade Immersion Portal
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale,
    onEnter: () => {
      void getAudioContext();
    },
  });

  // Spawn visual particle explosion and shockwave ring
  const spawnMergeParticles = (x: number, y: number, color: string, tier: number) => {
    const nextTierRadius = COSMIC_TIERS[tier]?.radius ?? 30;
    shockwavesRef.current.push({
      x,
      y,
      radius: nextTierRadius * 0.4,
      maxRadius: nextTierRadius * 2.2,
      color,
      alpha: 0.85,
    });

    const count = 12 + tier * 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (2.5 + tier * 0.4);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 1,
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  // Add floating score text
  const addFloatingScore = (x: number, y: number, points: number, color: string) => {
    floatingScoresRef.current.push({
      x,
      y,
      text: `+${points}`,
      color,
      life: 1,
      maxLife: 35,
    });
  };

  // Create a Matter.js celestial body
  const createCelestialBody = (x: number, y: number, tierIndex: number): Matter.Body => {
    const tierData = COSMIC_TIERS[tierIndex];
    const body = Matter.Bodies.circle(x, y, tierData.radius, {
      restitution: 0.28,
      friction: 0.12,
      density: 0.002,
      label: "celestial",
    });

    const userData: CelestialUserData = {
      tier: tierIndex,
      createdAt: performance.now(),
      squash: 1.25, // initial spring entry pop
    };
    (body as unknown as { userData: CelestialUserData }).userData = userData;

    return body;
  };

  // Initialize Game & Matter Physics
  const initGame = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBestScore(parseInt(saved, 10) || 0);
    }

    setScore(0);
    setIsGameOver(false);
    setIsDanger(false);
    setVortexEnergy(0);
    setIsVortexActive(false);
    vortexActiveRef.current = false;
    vortexEndTimeRef.current = 0;
    particlesRef.current = [];
    floatingScoresRef.current = [];
    shakeRef.current = 0;
    dangerTimerRef.current = null;

    const initialCurrent = getNextDropTier();
    const initialNext = getNextDropTier();
    setCurrentTier(initialCurrent);
    setNextTier(initialNext);
    dropperXRef.current = ARENA_WIDTH / 2;

    // Create Matter Engine
    if (engineRef.current) {
      Matter.World.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
    }

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.25, scale: 0.001 },
    });

    // Create Arena Walls
    const wallThickness = 40;
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2 + 10, ARENA_HEIGHT / 2, wallThickness, ARENA_HEIGHT * 2, {
      isStatic: true,
      label: "wall",
      friction: 0.1,
      restitution: 0.2,
    });
    const rightWall = Matter.Bodies.rectangle(ARENA_WIDTH + wallThickness / 2 - 10, ARENA_HEIGHT / 2, wallThickness, ARENA_HEIGHT * 2, {
      isStatic: true,
      label: "wall",
      friction: 0.1,
      restitution: 0.2,
    });
    const floor = Matter.Bodies.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT + wallThickness / 2 - 10, ARENA_WIDTH * 2, wallThickness, {
      isStatic: true,
      label: "floor",
      friction: 0.3,
      restitution: 0.2,
    });

    Matter.Composite.add(engine.world, [leftWall, rightWall, floor]);

    // Handle collision merge events
    Matter.Events.on(engine, "collisionStart", (event) => {
      const pairs = event.pairs;
      for (const pair of pairs) {
        const bodyA = pair.bodyA as unknown as { label: string; userData?: CelestialUserData; position: { x: number; y: number } };
        const bodyB = pair.bodyB as unknown as { label: string; userData?: CelestialUserData; position: { x: number; y: number } };

        if (bodyA.label === "celestial" && bodyB.label === "celestial") {
          const userA = bodyA.userData;
          const userB = bodyB.userData;

          if (userA && userB && !userA.isDead && !userB.isDead && userA.tier === userB.tier) {
            const currentTierIndex = userA.tier;
            const mergeResult = computeMergeResult(currentTierIndex);

            if (mergeResult) {
              userA.isDead = true;
              userB.isDead = true;

              const midX = (bodyA.position.x + bodyB.position.x) / 2;
              const midY = (bodyA.position.y + bodyB.position.y) / 2;
              const nextTierData = COSMIC_TIERS[mergeResult.nextTier];

              // Schedule removal and spawn of merged body
              setTimeout(() => {
                if (!engineRef.current) return;
                Matter.Composite.remove(engineRef.current.world, pair.bodyA);
                Matter.Composite.remove(engineRef.current.world, pair.bodyB);

                const newBody = createCelestialBody(midX, midY, mergeResult.nextTier);
                Matter.Composite.add(engineRef.current.world, newBody);

                // Small upward bounce impulse
                Matter.Body.applyForce(newBody, newBody.position, {
                  x: (Math.random() - 0.5) * 0.005,
                  y: -0.012,
                });
              }, 0);

              // Effects
              spawnMergeParticles(midX, midY, nextTierData.color, mergeResult.nextTier);
              addFloatingScore(midX, midY, mergeResult.addedScore, nextTierData.color);
              const trauma = Math.min(0.85, 0.2 + (mergeResult.nextTier / MAX_TIER_INDEX) * 0.65);
              shakeEngineRef.current = addScreenShakeTrauma(shakeEngineRef.current, trauma);
              playMergeSound(mergeResult.nextTier);
              vibrate(mergeResult.nextTier >= 7 ? [15, 20, 30] : 18);

              // Sound ducking on merge
              getGlobalBgmController("cosmic").duck(220, 0.45);

              // Pillar 2 Chaos Depth: Vortex Energy Gain
              const energyGain = calculateVortexEnergyGain(mergeResult.nextTier);
              setVortexEnergy((prev) => Math.min(VORTEX_MAX_ENERGY, prev + energyGain));

              // Score & highest tier update
              setHighestTierUnlocked((prev) => {
                const next = Math.max(prev, mergeResult.nextTier);
                if (next > prev && typeof window !== "undefined") {
                  localStorage.setItem("cosmic-merge-highest-tier", String(next));
                }
                return next;
              });

              setScore((prev) => {
                const updated = prev + mergeResult.addedScore;
                if (typeof window !== "undefined") {
                  const currentBest = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
                  if (updated > currentBest) {
                    localStorage.setItem(STORAGE_KEY, String(updated));
                    setBestScore(updated);
                  }
                }
                return updated;
              });

              // Celebration when reaching Sun (Tier 10)
              if (mergeResult.nextTier === MAX_TIER_INDEX) {
                celebrate(canvasRef.current, { preset: "stardust", colors: ["#fbbf24", "#f97316", "#fff7ed"], origin: { x: 0.5, y: 0.45 }, scale: 1.2 });
              }
            }
          }
        }
      }
    });

    engineRef.current = engine;
  }, [playMergeSound, vibrate]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Handle Dropping celestial bodies
  const dropCurrentBody = useCallback(() => {
    if (phaseRef.current !== "play" || isGameOverRef.current || !engineRef.current) return;
    const now = performance.now();
    if (now - lastDropTimeRef.current < DROP_COOLDOWN_MS) return;

    lastDropTimeRef.current = now;
    const dropX = clampDropperX(dropperXRef.current, COSMIC_TIERS[currentTier].radius);
    const dropY = 55;

    const body = createCelestialBody(dropX, dropY, currentTier);
    Matter.Composite.add(engineRef.current.world, body);

    playDropSound();
    vibrate(10);

    // Roll next tiers
    setCurrentTier(nextTier);
    setNextTier(getNextDropTier());
  }, [currentTier, nextTier, playDropSound, vibrate]);

  // Pointer event handlers for touch/mouse targeting
  const updateDropperPosition = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const rawX = (clientX - rect.left) * scaleX;
    dropperXRef.current = clampDropperX(rawX, COSMIC_TIERS[currentTier].radius);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "play") return;
    e.preventDefault();
    void getAudioContext();
    updateDropperPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "play") return;
    e.preventDefault();
    updateDropperPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "play") return;
    e.preventDefault();
    updateDropperPosition(e.clientX);
    dropCurrentBody();
  };

  const handleStartGame = useCallback(() => {
    initGame();
    setPhase("play");
    const bgm = getGlobalBgmController("cosmic");
    bgm.start("cosmic");
    bgm.setMuted(mutedRef.current);
  }, [initGame]);

  const handlePause = useCallback(() => {
    setPhase("paused");
    getGlobalBgmController("cosmic").duck(999999, 0.3);
  }, []);

  const handleResume = useCallback(() => {
    setPhase("play");
    getGlobalBgmController("cosmic").duck(10, 1.0);
  }, []);

  const handleRetry = useCallback(() => {
    initGame();
    setPhase("play");
    const bgm = getGlobalBgmController("cosmic");
    bgm.start("cosmic");
    bgm.setMuted(mutedRef.current);
  }, [initGame]);

  const handleShareScore = useCallback(async () => {
    const highestName =
      COSMIC_TIERS[highestTierUnlocked]?.name[locale] ?? COSMIC_TIERS[highestTierUnlocked]?.name.en ?? "Asteroid";
    const shareText = `🌌 Cosmic Merge Drop\nScore: ${score.toLocaleString()} | Highest: ${highestName}\nhttps://game.oiyo.net/${locale}/cosmic-merge`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Cosmic Merge Drop",
          text: shareText,
          url: `https://game.oiyo.net/${locale}/cosmic-merge`,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        // Clipboard failed
      }
    }
  }, [highestTierUnlocked, locale, score]);

  const [shareCardCopied, setShareCardCopied] = useState(false);

  const handleShareCard = useCallback(async () => {
    try {
      const highestName =
        COSMIC_TIERS[highestTierUnlocked]?.name[locale] ??
        COSMIC_TIERS[highestTierUnlocked]?.name.en ??
        "Asteroid";

      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: "COSMIC MERGE",
        score,
        bestScore,
        slug: "cosmic-merge",
        seedCode: "COSMIC",
        customStats: [
          { label: "HIGHEST", value: highestName },
          { label: "VORTEX", value: `${vortexEnergy}%` },
        ],
      });

      const copied = await copyShareCardToClipboard(canvas);
      if (copied) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      } else {
        downloadShareCard(canvas, `oiyo-cosmic-merge-${score}pts.png`);
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  }, [t.title, score, bestScore, highestTierUnlocked, locale, vortexEnergy]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (isGameOver) {
          initGame();
        } else {
          dropCurrentBody();
        }
      } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        dropperXRef.current = clampDropperX(dropperXRef.current - 24, COSMIC_TIERS[currentTier].radius);
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        dropperXRef.current = clampDropperX(dropperXRef.current + 24, COSMIC_TIERS[currentTier].radius);
      } else if (e.code === "KeyV") {
        e.preventDefault();
        activateVortex();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        void togglePortal();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      } else if (e.code === "KeyC") {
        e.preventDefault();
        setShowCodex((s) => !s);
      } else if (e.code === "KeyR") {
        e.preventDefault();
        initGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activateVortex, currentTier, dropCurrentBody, initGame, isGameOver, toggleMute, togglePortal]);

  // Main 120fps continuous animation & physics tick loop
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        const bodies = Matter.Composite.allBodies(engine.world);
        let crossingDeadline = false;

        if (phaseRef.current === "play") {
          // Step physics engine
          Matter.Engine.update(engine, dt * 1000);

          // Update Gravitational Singularity Vortex (Chaos Modifier)
          if (vortexActiveRef.current) {
            const now = performance.now();
            if (now > vortexEndTimeRef.current) {
              vortexActiveRef.current = false;
              setIsVortexActive(false);
            } else {
              const vortexCenter = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT * 0.62 };
              for (const b of bodies) {
                const user = (b as unknown as { userData?: CelestialUserData }).userData;
                if (b.label === "celestial" && user && !user.isDead) {
                  const pull = calculateVortexPull(b.position, vortexCenter, 0.0035, user.tier);
                  Matter.Body.applyForce(b, b.position, { x: pull.fx, y: pull.fy });
                }
              }
              shakeRef.current = Math.max(shakeRef.current, 1.8);
            }
          }

          // Check deadline violation
          for (const b of bodies) {
            const user = (b as unknown as { userData?: CelestialUserData }).userData;
            if (b.label === "celestial" && user && !user.isDead) {
              // Relax squash animation
              if (user.squash > 1.0) {
                user.squash = Math.max(1.0, user.squash - dt * 2.5);
              }

              // Check if settled above deadline
              if (b.position.y - COSMIC_TIERS[user.tier].radius < DEADLINE_Y && currentTime - user.createdAt > 1500) {
                crossingDeadline = true;
              }
            }
          }

          if (crossingDeadline && !isGameOverRef.current) {
            setIsDanger(true);
            if (dangerTimerRef.current === null) {
              dangerTimerRef.current = currentTime;
            } else if (currentTime - dangerTimerRef.current > 2200) {
              setIsGameOver(true);
              setPhase("result");
              getGlobalBgmController("cosmic").duck(3000, 0.2);
            }
          } else {
            setIsDanger(false);
            dangerTimerRef.current = null;
          }
        }

        // Render Canvas
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const displayW = canvas.clientWidth;
          const displayH = canvas.clientHeight;

          if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
            canvas.width = displayW * dpr;
            canvas.height = displayH * dpr;
          }

          ctx.save();
          ctx.scale((displayW * dpr) / ARENA_WIDTH, (displayH * dpr) / ARENA_HEIGHT);

          // Apply Unity-style Trauma screen shake
          shakeEngineRef.current = stepScreenShake(shakeEngineRef.current, dt);
          const shakeOffset = sampleScreenShakeOffset(shakeEngineRef.current, currentTime / 1000);
          ctx.translate(shakeOffset.offsetX, shakeOffset.offsetY);
          ctx.rotate((shakeOffset.rotationDeg * Math.PI) / 180);

          // Background deep space
          ctx.fillStyle = "#040711";
          ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

          // Subtle background grid
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1;
          for (let x = 40; x < ARENA_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ARENA_HEIGHT);
            ctx.stroke();
          }
          for (let y = 40; y < ARENA_HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ARENA_WIDTH, y);
            ctx.stroke();
          }

          // Container side walls
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, 0, 10, ARENA_HEIGHT);
          ctx.fillRect(ARENA_WIDTH - 10, 0, 10, ARENA_HEIGHT);
          ctx.fillRect(0, ARENA_HEIGHT - 10, ARENA_WIDTH, 10);

          // Warning deadline line
          ctx.beginPath();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = crossingDeadline ? "#ef4444" : "#475569";
          ctx.lineWidth = crossingDeadline ? 2 : 1;
          ctx.moveTo(10, DEADLINE_Y);
          ctx.lineTo(ARENA_WIDTH - 10, DEADLINE_Y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Aiming guideline from dropper
          const currentRadius = COSMIC_TIERS[currentTier].radius;
          const currentX = clampDropperX(dropperXRef.current, currentRadius);
          ctx.beginPath();
          ctx.setLineDash([4, 6]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.moveTo(currentX, 60);
          ctx.lineTo(currentX, ARENA_HEIGHT - 15);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw dropper preview sphere at top
          const currentTierData = COSMIC_TIERS[currentTier];
          ctx.save();
          ctx.translate(currentX, 55);
          ctx.beginPath();
          ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = currentTierData.color;
          ctx.shadowColor = currentTierData.glow;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();

          // Draw Gravitational Singularity Vortex FX (Chaos Modifier)
          if (vortexActiveRef.current) {
            const vx = ARENA_WIDTH / 2;
            const vy = ARENA_HEIGHT * 0.62;
            const rot = currentTime * 0.005;

            ctx.save();
            ctx.translate(vx, vy);

            // Gravitational distortion ripples
            ctx.beginPath();
            ctx.arc(0, 0, 75 + Math.sin(currentTime * 0.01) * 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(192, 132, 252, 0.45)";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Swirling accretion spiral arms
            for (let arm = 0; arm < 3; arm++) {
              const baseAngle = rot + (arm * Math.PI * 2) / 3;
              ctx.beginPath();
              for (let r = 10; r < 75; r += 5) {
                const a = baseAngle + r * 0.08;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (r === 10) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.strokeStyle = arm === 0 ? "rgba(251, 191, 36, 0.75)" : "rgba(56, 189, 248, 0.75)";
              ctx.lineWidth = 2.5;
              ctx.stroke();
            }

            // Event horizon singularity core
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fillStyle = "#020617";
            ctx.shadowColor = "#c084fc";
            ctx.shadowBlur = 18;
            ctx.fill();
            ctx.strokeStyle = "#c084fc";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.restore();
          }

          // Draw all Matter.js celestial bodies
          for (const body of bodies) {
            const user = (body as unknown as { userData?: CelestialUserData }).userData;
            if (body.label === "celestial" && user && !user.isDead) {
              const tierData = COSMIC_TIERS[user.tier];
              const r = tierData.radius * user.squash;

              ctx.save();
              ctx.translate(body.position.x, body.position.y);
              ctx.rotate(body.angle);

              // Outer glow
              ctx.shadowColor = tierData.glow;
              ctx.shadowBlur = 10;

              // Outer circle
              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI * 2);
              ctx.fillStyle = tierData.color;
              ctx.fill();
              ctx.shadowBlur = 0;

              // Inner gradient/core highlight
              ctx.beginPath();
              ctx.arc(-r * 0.25, -r * 0.25, r * 0.45, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
              ctx.fill();

              // Special planetary features
              if (tierData.hasRing) {
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.5, r * 0.35, 0.3, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(253, 224, 71, 0.8)";
                ctx.lineWidth = 3;
                ctx.stroke();
              }

              // Star coronal flares for Sun
              if (tierData.isStar) {
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
                ctx.lineWidth = 4;
                ctx.stroke();
              }

              ctx.restore();
            }
          }

          // Draw expanding shockwave rings
          for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
            const sw = shockwavesRef.current[i];
            sw.radius += (sw.maxRadius - sw.radius) * 0.18 + 0.6;
            sw.alpha -= 0.045;
            if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
              shockwavesRef.current.splice(i, 1);
              continue;
            }
            ctx.save();
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = Math.max(0, sw.alpha);
            ctx.lineWidth = 3;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // Update & draw particles
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life += 1;

            const alpha = Math.max(0, 1 - p.life / p.maxLife);
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (p.life >= p.maxLife) {
              particlesRef.current.splice(i, 1);
            }
          }

          // Update & draw floating score texts
          for (let i = floatingScoresRef.current.length - 1; i >= 0; i--) {
            const fs = floatingScoresRef.current[i];
            fs.y -= 1.2;
            fs.life += 1;

            const alpha = Math.max(0, 1 - fs.life / fs.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = "bold 16px monospace";
            ctx.fillStyle = fs.color;
            ctx.textAlign = "center";
            ctx.fillText(fs.text, fs.x, fs.y);
            ctx.restore();

            if (fs.life >= fs.maxLife) {
              floatingScoresRef.current.splice(i, 1);
            }
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentTier, isGameOver]);

  const nextTierData = COSMIC_TIERS[nextTier];

  return (
    <GameShell
      title={t.title}
      subtitle={t.controlsHint}
      keyart={COSMIC_MERGE_SPRITES.keyart}
      phase={phase}
      score={score.toLocaleString()}
      best={bestScore.toLocaleString()}
      muted={muted}
      onToggleMute={toggleMute}
      isImmersive={isImmersive}
      onTogglePortal={togglePortal}
      containerRef={containerRef}
      onStart={handleStartGame}
      onPause={handlePause}
      onResume={handleResume}
      onRetry={handleRetry}
      resultTitle={t.gameover}
      resultStats={[
        { label: t.score, value: score.toLocaleString() },
        { label: t.best, value: bestScore.toLocaleString() },
      ]}
      onShare={handleShareScore}
      shareCopied={shareCopied}
      onShareCard={handleShareCard}
      shareCardCopied={shareCardCopied}
      challengeUrl={buildChallengeUrl({
        baseUrl: typeof window !== "undefined" ? window.location.origin : "https://game.oiyo.net",
        locale,
        slug: "cosmic-merge",
        seed: 1,
        score,
      })}
      controlsHint={t.controlsHint}
      extraHeaderActions={
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Next Planet Pill */}
          <div className="px-2.5 py-1.5 rounded-xl border border-border/80 bg-background/85 backdrop-blur-md shadow-xs flex items-center gap-1.5">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground block">{t.next}</span>
              <span className="text-xs font-bold text-foreground truncate max-w-24 block">
                {nextTierData.name[locale] ?? nextTierData.name.en}
              </span>
            </div>
            <svg className="w-4 h-4 shrink-0 drop-shadow-xs" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" fill={nextTierData.color} stroke="currentColor" className="text-border" strokeWidth="1" />
            </svg>
          </div>

          {/* Vortex Gauge / Trigger Button (Pillar 2 Chaos Modifier) */}
          {isVortexActive ? (
            <div className="animate-bounce px-2.5 py-1.5 rounded-xl border border-chart-2 bg-chart-2/20 text-chart-2 font-black text-xs">
              🌀 {t.vortexActive}
            </div>
          ) : vortexEnergy >= VORTEX_MAX_ENERGY ? (
            <button
              type="button"
              onClick={activateVortex}
              className="animate-pulse min-h-11 px-3 py-2 rounded-xl border border-primary bg-primary text-primary-foreground font-black text-xs shadow-md hover:bg-primary/90 transition-transform active:scale-95 flex items-center gap-1"
            >
              <span>🌀</span>
              <span>{t.vortexReady}</span>
            </button>
          ) : (
            <div className="px-2.5 py-1.5 rounded-xl border border-border bg-background/85 backdrop-blur-md text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
              <span>🌀</span>
              <span>{vortexEnergy}%</span>
            </div>
          )}

          {/* Codex Button */}
          <button
            type="button"
            onClick={() => setShowCodex((s) => !s)}
            aria-pressed={showCodex}
            aria-label={t.codex}
            title={t.codex}
            className="min-h-11 px-3 py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <span>📖</span>
            <span className="hidden sm:inline">{t.codex}</span>
          </button>
        </div>
      }
    >
      <div className="relative w-full h-full flex items-center justify-center bg-background overflow-hidden">
        {/* 100% Canvas GPU Surface */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-full max-h-full max-w-full aspect-11/16 block cursor-crosshair touch-none select-none"
        />

        {/* Danger Warning Banner */}
        {isDanger && phase === "play" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-pulse">
            <span className="px-3 py-1 rounded-full border border-destructive/60 bg-destructive/90 text-destructive-foreground text-xs font-black tracking-wide shadow-md">
              ⚠️ {t.deadline}
            </span>
          </div>
        )}

        {/* Cosmic Codex Modal */}
        {showCodex && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-30 animate-in fade-in duration-200 pointer-events-auto">
            <div className="max-w-md w-full max-h-full rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xl flex flex-col">
              {/* Codex Header */}
              <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
                <img src={COSMIC_MERGE_SPRITES.keyart} alt={t.title} className="h-28 w-full object-cover" />
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-1.5">
                    <span>📖</span>
                    <span>{t.codex}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{t.codexSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodex(false)}
                  className="p-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors text-xs font-bold"
                  aria-label={t.close}
                >
                  ✕
                </button>
              </div>

              {/* Tier list */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                {COSMIC_TIERS.map((tier) => {
                  const isUnlocked = highestTierUnlocked >= tier.id;
                  const tierName = tier.name[locale] ?? tier.name.en;
                  const tierFact = tier.fact[locale] ?? tier.fact.en;

                  return (
                    <div
                      key={tier.id}
                      className={
                        isUnlocked
                          ? "rounded-xl border border-border/80 bg-background/60 p-2.5 transition-all flex items-start gap-3"
                          : "rounded-xl border border-border/30 bg-muted/20 p-2.5 transition-all flex items-start gap-3 opacity-60"
                      }
                    >
                      {/* Planet Sphere Badge */}
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center mt-0.5 relative">
                        <svg className="w-10 h-10 shrink-0 drop-shadow-xs" viewBox="0 0 36 36" aria-hidden="true">
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill={isUnlocked ? tier.color : "#475569"}
                            stroke="currentColor"
                            className="text-border"
                            strokeWidth="1"
                          />
                          {isUnlocked && (
                            <circle cx="14" cy="14" r="5" fill="currentColor" className="text-white/35" />
                          )}
                          {tier.hasRing && isUnlocked && (
                            <ellipse
                              cx="18"
                              cy="18"
                              rx="17"
                              ry="4.5"
                              transform="rotate(-25 18 18)"
                              stroke="currentColor"
                              className="text-warning"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          )}
                        </svg>
                        {!isUnlocked && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            🔒
                          </span>
                        )}
                      </div>

                      {/* Planet Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-foreground truncate">
                            {tier.id + 1}. {isUnlocked ? tierName : t.locked}
                          </span>
                          <span className="text-xs font-mono font-bold text-primary shrink-0">
                            +{tier.score}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {isUnlocked ? tierFact : "???"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Codex Footer */}
              <div className="pt-3 border-t border-border/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCodex(false)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default CosmicMerge;
