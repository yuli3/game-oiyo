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
} from "../../lib/games/cosmic-merge";
import { useArcadePortal } from "../../lib/games/arcade-portal";

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
  },
};

export const CosmicMerge: React.FC<Props> = ({ locale = "en" }) => {
  const t = COPY[locale] ?? COPY.en;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  // References for physics and animation loop
  const engineRef = useRef<Matter.Engine | null>(null);
  const dropperXRef = useRef<number>(ARENA_WIDTH / 2);
  const lastDropTimeRef = useRef<number>(0);
  const dangerTimerRef = useRef<number | null>(null);
  const particlesRef = useRef<StardustParticle[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
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

  // Hook for Arcade Immersion Portal
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale,
    onEnter: () => {
      void getAudioContext();
    },
  });

  // Spawn visual particle explosion
  const spawnMergeParticles = (x: number, y: number, color: string, tier: number) => {
    const count = 10 + tier * 2;
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
              shakeRef.current = Math.min(shakeRef.current + 3 + mergeResult.nextTier * 0.5, 12);
              playMergeSound(mergeResult.nextTier);
              vibrate(mergeResult.nextTier >= 7 ? [15, 20, 30] : 18);

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
    if (isGameOver || !engineRef.current) return;
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
  }, [currentTier, isGameOver, nextTier, playDropSound, vibrate]);

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
    e.preventDefault();
    void getAudioContext();
    updateDropperPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    updateDropperPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    updateDropperPosition(e.clientX);
    dropCurrentBody();
  };

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
  }, [currentTier, dropCurrentBody, initGame, isGameOver, toggleMute, togglePortal]);

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
        // Step physics engine
        Matter.Engine.update(engine, dt * 1000);

        // Check deadline violation
        const bodies = Matter.Composite.allBodies(engine.world);
        let crossingDeadline = false;

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

        if (crossingDeadline && !isGameOver) {
          setIsDanger(true);
          if (dangerTimerRef.current === null) {
            dangerTimerRef.current = currentTime;
          } else if (currentTime - dangerTimerRef.current > 2200) {
            setIsGameOver(true);
          }
        } else {
          setIsDanger(false);
          dangerTimerRef.current = null;
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

          // Apply screen shake
          if (shakeRef.current > 0) {
            const mag = shakeRef.current;
            ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
            shakeRef.current = Math.max(0, shakeRef.current - 0.4);
          }

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
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? "fixed inset-0 z-50 w-screen h-dvh bg-black m-0 p-0 rounded-none border-none select-none touch-none flex flex-col items-center justify-center overflow-hidden"
          : "relative w-full max-w-md mx-auto aspect-11/16 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl select-none touch-none"
      }
    >
      {/* 100% Canvas GPU Surface */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Top Floating HUD: Score, Next Preview, Portal & Sound Toggles */}
      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex items-center justify-between">
        {/* Score & Next Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3 py-1.5 rounded-xl border border-border/80 bg-background/85 backdrop-blur-md shadow-xs">
            <span className="text-xs uppercase tracking-wider text-muted-foreground block">{t.score}</span>
            <span className="text-sm font-black font-mono text-primary">{score.toLocaleString()}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl border border-border/80 bg-background/85 backdrop-blur-md shadow-xs flex items-center gap-1.5">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground block">{t.next}</span>
              <span className="text-xs font-bold text-foreground">{nextTierData.name[locale] ?? nextTierData.name.en}</span>
            </div>
            <svg className="w-5 h-5 shrink-0 drop-shadow-xs" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" fill={nextTierData.color} stroke="currentColor" className="text-border" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Right Buttons: Codex, Portal Fullscreen & Mute */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowCodex((s) => !s)}
            aria-pressed={showCodex}
            aria-label={t.codex}
            title={t.codex}
            className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/85 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1"
          >
            <span className="text-sm">📖</span>
            <span className="hidden sm:inline">{t.codex}</span>
          </button>

          <button
            type="button"
            onClick={togglePortal}
            aria-pressed={isImmersive}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/85 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1"
          >
            <span className="text-sm">{isImmersive ? "✕" : "⛶"}</span>
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? t.soundOn : t.soundOff}
            className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/85 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* Danger Warning Banner */}
      {isDanger && !isGameOver && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-pulse">
          <span className="px-3 py-1 rounded-full border border-destructive/60 bg-destructive/90 text-destructive-foreground text-xs font-black tracking-wide shadow-md">
            ⚠️ {t.deadline}
          </span>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-4 right-4 pointer-events-none text-center hidden sm:block">
        <span className="text-xs font-semibold text-muted-foreground/80 bg-background/70 backdrop-blur-xs px-3 py-1 rounded-full border border-border/50">
          {t.controlsHint}
        </span>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          <div className="max-w-xs w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-muted mb-2">
              <img src={COSMIC_MERGE_SPRITES.keyart} alt={t.title} className="h-24 w-full object-cover" />
            </div>
            <div className="w-14 h-14 bg-destructive/15 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-destructive/20">
              💥
            </div>

            <div className="text-xl font-black tracking-tight text-destructive">{t.gameover}</div>

            <div className="grid grid-cols-2 gap-2 py-1">
              <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                <span className="text-xs text-muted-foreground block mb-0.5">{t.score}</span>
                <span className="text-lg font-black text-foreground font-mono">{score.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                <span className="text-xs text-muted-foreground block mb-0.5">{t.best}</span>
                <span className="text-lg font-black text-primary font-mono">{bestScore.toLocaleString()}</span>
              </div>
            </div>

            {score >= bestScore && score > 0 && (
              <p className="text-xs font-black text-primary animate-bounce">{t.newBest}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareScore}
                className="flex-1 py-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground font-bold text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>📤</span>
                <span>{shareCopied ? t.copied : t.share}</span>
              </button>
              <button
                type="button"
                onClick={initGame}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-opacity active:scale-98"
              >
                {t.restart}
              </button>
            </div>
          </div>
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
  );
};

export default CosmicMerge;
