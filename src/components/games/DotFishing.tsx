import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  BookOpen,
  Anchor,
  Compass,
  Coins,
  Sparkles,
  Waves,
  X,
  AlertTriangle,
  Award,
} from "lucide-react";
import {
  createFishingGame,
  startCast,
  triggerBite,
  hookFish,
  stepReelingTick,
  setFishingZone,
  buyRodUpgrade,
  buyBoatUpgrade,
  getAvailableZones,
  FISH_CATALOG,
  ROD_UPGRADES,
  BOAT_UPGRADES,
  FishingRng,
  type FishingGameState,
  type FishingZone,
} from "../../lib/games/dot-fishing";
import {
  RetroChiptuneSynth,
  getRetroChiptuneBgm,
  getSharedAudioContext,
  useGameJuicePro,
} from "../../lib/games/engine-suite-unified";
import { useArcadePortal } from "../../lib/games/arcade-portal";

const COPY = {
  ko: {
    title: "도트 피싱",
    sub: "아늑한 픽셀 바다에서 30종의 희귀 어류를 낚고 전설의 도감을 완성하세요",
    zone: "해역",
    gold: "골드",
    catches: "어획 수",
    castBtn: "찌 던지기 (Cast)",
    hookBtn: "챔질하기! (Hook!)",
    reelBtn: "릴 감기 (Hold Reel)",
    releaseBtn: "릴 놓기 (줄 풀기)",
    encyclopedia: "어류 도감 (30종)",
    shop: "장비 선착장",
    victoryTitle: "★ 전설의 마린 마스터 등극! ★",
    victoryDesc: "어류 도감 완성 또는 10,000골드 자산 돌파! 바다의 모든 비밀을 정복했습니다!",
    playAgain: "새로운 낚시 시작",
    hint: "조작: Space 또는 화면 버튼 길게 누르기 | 텐션 게이지가 빨간색(100)을 넘지 않도록 주의하세요!",
    zones: {
      shallow: "연안 해역 (Shallow)",
      coral: "산호초 (Coral)",
      deep: "원양 심해 (Deep)",
      abyss: "심연 해구 (Abyss)",
    },
  },
  en: {
    title: "Dot Fishing",
    sub: "Catch 30 unique species across 4 ocean zones and complete the legendary marine encyclopedia",
    zone: "Zone",
    gold: "Gold",
    catches: "Catches",
    castBtn: "Cast Line",
    hookBtn: "Hook Fish!",
    reelBtn: "Hold to Reel",
    releaseBtn: "Release Tension",
    encyclopedia: "Fish Encyclopedia",
    shop: "Harbor Shop",
    victoryTitle: "★ LEGENDARY OCEAN MASTER! ★",
    victoryDesc: "You completed the 30-species catalog or reached 10,000 Gold! The sea has bowed to you!",
    playAgain: "New Adventure",
    hint: "Controls: Space or Hold button | Keep tension balanced away from 100 to avoid line snap!",
    zones: {
      shallow: "Shallow Coast",
      coral: "Coral Reef",
      deep: "Deep Ocean",
      abyss: "Abyssal Trench",
    },
  },
  ja: {
    title: "ドットフィッシング",
    sub: "ドット絵の海で30種の魚を釣り上げ、伝説の魚類図鑑をコンプリートしよう",
    zone: "海域",
    gold: "ゴールド",
    catches: "釣獲数",
    castBtn: "竿を投げる",
    hookBtn: "アワセる！(Hook)",
    reelBtn: "リールを巻く",
    releaseBtn: "糸を緩める",
    encyclopedia: "魚類図鑑 (30種)",
    shop: "装備マリーナ",
    victoryTitle: "★ 伝説の海の覇者達成！ ★",
    victoryDesc: "全30種の魚を記録または総資産10,000ゴールドを達成！海を制覇しました！",
    playAgain: "新しい航海へ",
    hint: "操作: Spaceまたは長押し | テンションが100を超えると糸が切れるので注意！",
    zones: {
      shallow: "沿岸浅瀬",
      coral: "サンゴ礁",
      deep: "外洋深海",
      abyss: "深淵海溝",
    },
  },
  zh: {
    title: "点点钓鱼",
    sub: "在宁静的复古像素海洋中垂钓30种珍稀鱼类，点亮全套海洋图鉴",
    zone: "海域",
    gold: "金币",
    catches: "捕获数",
    castBtn: "抛投鱼竿",
    hookBtn: "立即提竿！",
    reelBtn: "收线收杆 (长按)",
    releaseBtn: "释放张力",
    encyclopedia: "鱼类全图鉴 (30种)",
    shop: "装备码头",
    victoryTitle: "★ 传奇海洋钓鱼大师！ ★",
    victoryDesc: "点亮30种鱼类图鉴或总资产突破10,000金币！征服了广袤汪洋！",
    playAgain: "重开新征程",
    hint: "操作: 空格键或按住按钮 | 保持钓线张力避免超过100导致断线！",
    zones: {
      shallow: "沿岸浅海",
      coral: "珊瑚浅礁",
      deep: "远洋深海",
      abyss: "深渊海沟",
    },
  },
  fr: {
    title: "Dot Fishing",
    sub: "Pêchez 30 espèces marines et complétez l'encyclopédie légendaire",
    zone: "Zone",
    gold: "Or",
    catches: "Prises",
    castBtn: "Lancer la ligne",
    hookBtn: "Ferrer !",
    reelBtn: "Mouliner (Maintenir)",
    releaseBtn: "Relâcher",
    encyclopedia: "Encyclopédie (30)",
    shop: "Port & Boutique",
    victoryTitle: "★ MAÎTRE DES OCÉANS ! ★",
    victoryDesc: "Encyclopédie complétée ou 10 000 pièces d'or atteintes !",
    playAgain: "Rejouer",
    hint: "Espace ou maintenir le bouton. Évitez d'atteindre 100% de tension !",
    zones: {
      shallow: "Côte peu profonde",
      coral: "Récif de corail",
      deep: "Haute mer",
      abyss: "Fosse abyssale",
    },
  },
  es: {
    title: "Dot Fishing",
    sub: "Pesca 30 especies marinas y completa la enciclopedia legendaria",
    zone: "Zona",
    gold: "Oro",
    catches: "Capturas",
    castBtn: "Lanzar caña",
    hookBtn: "¡Picar!",
    reelBtn: "Recoger sedal (Mantener)",
    releaseBtn: "Soltar tensión",
    encyclopedia: "Enciclopedia (30)",
    shop: "Tienda del puerto",
    victoryTitle: "★ ¡MAESTRO DE LOS OCÉANOS! ★",
    victoryDesc: "¡Enciclopedia completada o 10,000 de oro alcanzados!",
    playAgain: "Nueva pesca",
    hint: "Espacio o mantén presionado. ¡Controla la tensión antes de 100!",
    zones: {
      shallow: "Costa somera",
      coral: "Arrecife de coral",
      deep: "Alta mar",
      abyss: "Fosa abisal",
    },
  },
};

const VIRTUAL_WIDTH = 400;
const VIRTUAL_HEIGHT = 280;

export default function DotFishing({ locale = "en" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<FishingGameState>(() => createFishingGame(Date.now()));
  const [encyclopediaOpen, setEncyclopediaOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [isReelingInput, setIsReelingInput] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("dot_fishing_sound") !== "false";
      }
    } catch {}
    return true;
  });

  const { isImmersive, containerRef, togglePortal } = useArcadePortal({
    locale: (locale as any) || "en",
  });
  const { shakeCssVars, addTrauma } = useGameJuicePro();

  const rngRef = useRef<FishingRng>(new FishingRng(Date.now()));
  const animTimeRef = useRef<number>(0);

  // Sound effects
  const playSound = useCallback(
    (type: "cast" | "bite" | "hook" | "catch" | "snap" | "upgrade") => {
      if (!soundEnabled) return;
      try {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        switch (type) {
          case "cast":
            RetroChiptuneSynth.playJump(ctx);
            break;
          case "bite":
            RetroChiptuneSynth.playCoin(ctx);
            break;
          case "hook":
            RetroChiptuneSynth.playLaser(ctx);
            break;
          case "catch":
            RetroChiptuneSynth.playPowerup(ctx);
            setTimeout(() => {
              const c = getSharedAudioContext();
              if (c) RetroChiptuneSynth.playCoin(c);
            }, 160);
            break;
          case "snap":
            RetroChiptuneSynth.playHit(ctx);
            break;
          case "upgrade":
            RetroChiptuneSynth.playCoin(ctx);
            break;
        }
      } catch {}
    },
    [soundEnabled]
  );

  // Background music
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (soundEnabled && gameState.status !== "victory") {
      bgm.playTheme("calm-sea");
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [soundEnabled, gameState.status]);

  // Main game tick loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      animTimeRef.current += dt;

      setGameState((prev) => {
        if (prev.status === "waiting") {
          const nextTimer = prev.biteAlertTimer - dt * 1000;
          if (nextTimer <= 0) {
            playSound("bite");
            addTrauma(0.18);
            return triggerBite(prev, rngRef.current);
          }
          return { ...prev, biteAlertTimer: nextTimer };
        }

        if (prev.status === "biting") {
          const nextTimer = prev.biteAlertTimer - dt * 1000;
          if (nextTimer <= 0) {
            // Fish got away
            return {
              ...prev,
              status: "idle",
              activeFish: null,
              logMessage: "입질 시간이 지나 물고기가 미끼만 먹고 도망쳤습니다.",
            };
          }
          return { ...prev, biteAlertTimer: nextTimer };
        }

        if (prev.status === "reeling") {
          const next = stepReelingTick(prev, dt, isReelingInput, rngRef.current);
          if (next.status === "snapped") {
            playSound("snap");
            addTrauma(0.65);
          } else if (next.status === "caught" || next.status === "victory") {
            playSound("catch");
            addTrauma(0.35);
          }
          return next;
        }

        return prev;
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isReelingInput, playSound, addTrauma]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setGameState((prev) => {
          if (prev.status === "idle" || prev.status === "caught" || prev.status === "snapped") {
            playSound("cast");
            return startCast(prev, rngRef.current);
          }
          if (prev.status === "biting") {
            playSound("hook");
            addTrauma(0.2);
            return hookFish(prev);
          }
          return prev;
        });
        setIsReelingInput(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsReelingInput(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playSound, addTrauma]);

  // Canvas 2D render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Palette per zone
    const zoneColors: Record<FishingZone, { sky: string; water: string; deepWater: string }> = {
      shallow: { sky: "#7dd3fc", water: "#38bdf8", deepWater: "#0284c7" },
      coral: { sky: "#bae6fd", water: "#06b6d4", deepWater: "#0e7490" },
      deep: { sky: "#93c5fd", water: "#2563eb", deepWater: "#1e3a8a" },
      abyss: { sky: "#1e1b4b", water: "#0f172a", deepWater: "#020617" },
    };

    const palette = zoneColors[gameState.zone] || zoneColors.shallow;
    const tSec = animTimeRef.current;

    // 1. Sky & Sun
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 140);

    // Sun / Moon
    ctx.fillStyle = gameState.zone === "abyss" ? "#e2e8f0" : "#fef08a";
    ctx.beginPath();
    ctx.arc(330, 45, gameState.zone === "abyss" ? 14 : 18, 0, Math.PI * 2);
    ctx.fill();

    // Distant clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    const cloud1X = ((tSec * 15) % (VIRTUAL_WIDTH + 80)) - 40;
    ctx.fillRect(cloud1X, 25, 45, 12);
    ctx.fillRect(cloud1X + 8, 18, 30, 10);

    // 2. Sea Water
    const waterY = 125;
    ctx.fillStyle = palette.water;
    ctx.fillRect(0, waterY, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - waterY);

    // Deep water gradient effect
    ctx.fillStyle = palette.deepWater;
    ctx.fillRect(0, waterY + 70, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - (waterY + 70));

    // Animated pixel wave lines
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    for (let row = 0; row < 6; row++) {
      const yPos = waterY + 12 + row * 22;
      const waveSpeed = (row + 1) * 20;
      const offset = (tSec * waveSpeed) % 40;
      for (let x = -40; x < VIRTUAL_WIDTH + 40; x += 32) {
        ctx.fillRect(x + offset, yPos, 14, 2);
      }
    }

    // 3. Fisherman & Boat
    const boatX = 65;
    const boatY = waterY - 14 + Math.sin(tSec * 2.5) * 3;

    // Wooden boat hull
    ctx.fillStyle = gameState.boatLevel >= 3 ? "#475569" : "#78350f";
    ctx.beginPath();
    ctx.moveTo(boatX - 28, boatY);
    ctx.lineTo(boatX + 34, boatY);
    ctx.lineTo(boatX + 22, boatY + 14);
    ctx.lineTo(boatX - 22, boatY + 14);
    ctx.closePath();
    ctx.fill();

    // Fisherman
    ctx.fillStyle = "#3b82f6"; // Shirt
    ctx.fillRect(boatX - 2, boatY - 18, 12, 18);
    ctx.fillStyle = "#fed7aa"; // Head
    ctx.fillRect(boatX, boatY - 26, 8, 8);
    ctx.fillStyle = "#facc15"; // Straw hat
    ctx.fillRect(boatX - 4, boatY - 30, 16, 4);

    // Fishing rod
    const rodEndX = boatX + 48;
    const rodEndY = boatY - 38;
    ctx.strokeStyle = gameState.rodLevel >= 3 ? "#cbd5e1" : "#d97706";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boatX + 8, boatY - 16);
    ctx.lineTo(rodEndX, rodEndY);
    ctx.stroke();

    // 4. Bobber & Fishing Line
    if (gameState.status === "waiting" || gameState.status === "biting" || gameState.status === "reeling") {
      const bobberDistX = rodEndX + 90 + (100 - gameState.distance) * 0.4;
      const bobberY = waterY + 4 + Math.sin(tSec * 4) * 2;

      // Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rodEndX, rodEndY);
      // Curve line if reeling
      if (gameState.status === "reeling") {
        const midX = (rodEndX + bobberDistX) / 2;
        const midY = (rodEndY + bobberY) / 2 + (gameState.lineTension / 100) * 24;
        ctx.quadraticCurveTo(midX, midY, bobberDistX, bobberY);
      } else {
        ctx.lineTo(bobberDistX, bobberY);
      }
      ctx.stroke();

      // Bobber float
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(bobberDistX - 3, bobberY - 4, 6, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bobberDistX - 3, bobberY, 6, 4);

      // Splash ripples
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.ellipse(bobberDistX, bobberY + 4, 8, 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Bite '!' Alert
      if (gameState.status === "biting") {
        const bounceY = Math.sin(tSec * 16) * 5;
        ctx.fillStyle = "#facc15";
        ctx.fillRect(bobberDistX - 8, bobberY - 28 + bounceY, 16, 16);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 13px monospace";
        ctx.fillText("!", bobberDistX - 3, bobberY - 15 + bounceY);
      }

      // Reeling Fish splash
      if (gameState.status === "reeling" && gameState.activeFish) {
        ctx.fillStyle = gameState.activeFish.fish.color;
        const fishSplashX = bobberDistX + Math.sin(tSec * 10) * 8;
        const fishSplashY = bobberY + 8;
        ctx.beginPath();
        ctx.ellipse(fishSplashX, fishSplashY, 9, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [gameState]);

  const handleCastOrHook = () => {
    if (gameState.status === "idle" || gameState.status === "caught" || gameState.status === "snapped") {
      playSound("cast");
      setGameState((prev) => startCast(prev, rngRef.current));
    } else if (gameState.status === "biting") {
      playSound("hook");
      addTrauma(0.2);
      setGameState((prev) => hookFish(prev));
    }
  };

  const handleZoneChange = (zone: FishingZone) => {
    playSound("upgrade");
    setGameState((prev) => setFishingZone(prev, zone));
  };

  const currentRod = ROD_UPGRADES[gameState.rodLevel - 1] || ROD_UPGRADES[0];
  const nextRod = ROD_UPGRADES[gameState.rodLevel];
  const currentBoat = BOAT_UPGRADES[gameState.boatLevel - 1] || BOAT_UPGRADES[0];
  const nextBoat = BOAT_UPGRADES[gameState.boatLevel];
  const availableZones = getAvailableZones(gameState.boatLevel);

  const shakeX = shakeCssVars["--shake-x"] ?? "0px";
  const shakeY = shakeCssVars["--shake-y"] ?? "0px";
  const shakeRot = shakeCssVars["--shake-rot"] ?? "0deg";

  return (
    <div
      ref={containerRef}
      style={{
        "--shake-x": shakeX,
        "--shake-y": shakeY,
        "--shake-rot": shakeRot,
      } as React.CSSProperties}
      className={`relative mx-auto flex flex-col items-center justify-center p-2 sm:p-4 select-none translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot) ${
        isImmersive ? "fixed inset-0 z-50 bg-background w-screen h-screen overflow-y-auto" : "max-w-4xl"
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card/90 p-3 shadow-xs backdrop-blur-md mb-2">
        <div className="flex items-center gap-2">
          <Waves className="size-5 text-primary animate-pulse" />
          <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">{t.title}</h2>
          <span className="hidden sm:inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground border border-border">
            {t.zones[gameState.zone]}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-1 text-foreground border border-border">
            <Coins className="size-4 text-warning" />
            <span>{gameState.gold.toLocaleString()} G</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-1 text-foreground border border-border">
            <Anchor className="size-4 text-primary" />
            <span>
              {gameState.totalCatches} {t.catches}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEncyclopediaOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-2 py-1 text-xs font-semibold text-foreground"
            >
              <BookOpen className="size-3.5 text-primary" />
              <span className="hidden md:inline">{t.encyclopedia}</span>
            </button>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-2 py-1 text-xs font-semibold text-foreground"
            >
              <Compass className="size-3.5 text-warning" />
              <span className="hidden md:inline">{t.shop}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((v) => !v);
                try {
                  window.localStorage.setItem("dot_fishing_sound", String(!soundEnabled));
                } catch {}
              }}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80"
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-muted-foreground" />}
            </button>
            <button
              type="button"
              onClick={togglePortal}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80"
            >
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black shadow-lg">
        <canvas
          ref={canvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          className="w-full h-auto max-h-96 object-contain block mx-auto"
        />

        {/* Real-time Tension & Reeling HUD Overlay */}
        {gameState.status === "reeling" && gameState.activeFish && (
          <div className="absolute top-3 left-3 right-3 flex flex-col gap-2 rounded-lg border border-border bg-card/90 p-2.5 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1 text-primary">
                <Sparkles className="size-3.5" />
                {gameState.activeFish.fish.names.ko || gameState.activeFish.fish.names.en} ({gameState.activeFish.size}cm)
              </span>
              <span>거리: {Math.max(0, Math.round(gameState.distance))}m</span>
            </div>

            {/* Tension Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>줄 텐션 (Tension)</span>
                <span className={gameState.lineTension > 75 ? "text-destructive font-black" : "text-foreground"}>
                  {Math.round(gameState.lineTension)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary border border-border">
                <div
                  style={{ "--tension-pct": `${Math.min(100, Math.max(0, gameState.lineTension))}%` } as React.CSSProperties}
                  className={`h-full w-(--tension-pct) transition-all duration-75 ${
                    gameState.lineTension > 85
                      ? "bg-destructive animate-pulse"
                      : gameState.lineTension > 70
                      ? "bg-warning"
                      : "bg-primary"
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status Bubble in Bottom Center */}
        <div className="absolute bottom-2 left-2 right-2 rounded-md border border-border bg-card/85 px-3 py-1 text-center text-xs font-medium text-foreground backdrop-blur-xs">
          {gameState.logMessage}
        </div>
      </div>

      {/* Main Controls Hotbar */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-xs mt-2">
        {/* Zone Selector Buttons */}
        <div className="flex items-center gap-1">
          {availableZones.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => handleZoneChange(z)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border ${
                gameState.zone === z
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.zones[z].split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          {gameState.status === "reeling" ? (
            <button
              type="button"
              onMouseDown={() => setIsReelingInput(true)}
              onMouseUp={() => setIsReelingInput(false)}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsReelingInput(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsReelingInput(false);
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-destructive active:bg-destructive/80 px-6 py-2.5 text-sm font-black text-destructive-foreground shadow-md transition-all active:scale-95"
            >
              <Waves className="size-4 animate-spin" />
              {t.reelBtn}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCastOrHook}
              className={`flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-black text-primary-foreground shadow-md transition-all active:scale-95 ${
                gameState.status === "biting"
                  ? "bg-warning text-foreground animate-bounce"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {gameState.status === "biting" ? (
                <>
                  <AlertTriangle className="size-4 text-foreground" />
                  {t.hookBtn}
                </>
              ) : (
                <>
                  <Anchor className="size-4" />
                  {t.castBtn}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-muted-foreground">{t.hint}</div>

      {/* Encyclopedia Modal */}
      {encyclopediaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-full w-full max-w-2xl flex-col rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  {t.encyclopedia} ({Object.keys(gameState.encyclopedia).length} / 30)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEncyclopediaOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {(["shallow", "coral", "deep", "abyss"] as FishingZone[]).map((zoneKey) => {
                const zoneFishes = FISH_CATALOG.filter((f) => f.zone === zoneKey);
                return (
                  <div key={zoneKey} className="space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{t.zones[zoneKey]}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {zoneFishes.map((fish) => {
                        const rec = gameState.encyclopedia[fish.id];
                        const isDiscovered = !!rec;
                        return (
                          <div
                            key={fish.id}
                            className={`flex flex-col rounded-lg border p-2.5 text-xs transition-all ${
                              isDiscovered
                                ? "border-border bg-secondary/40 text-foreground"
                                : "border-dashed border-border/50 bg-secondary/10 text-muted-foreground opacity-60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-foreground">
                                {isDiscovered ? fish.names.ko || fish.names.en : "???"}
                              </span>
                              <span
                                className={`size-2.5 rounded-full inline-block ${
                                  isDiscovered ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                              />
                            </div>
                            {isDiscovered ? (
                              <div className="space-y-0.5 text-xs text-muted-foreground">
                                <div>최대: {rec.maxSize}cm</div>
                                <div>포획: {rec.count}회</div>
                                <div className="text-warning font-semibold">가치: {fish.baseValue}G~</div>
                              </div>
                            ) : (
                              <div className="text-xs italic text-muted-foreground">미발견 어종</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Harbor Shop Modal */}
      {shopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-full w-full max-w-lg flex-col rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-warning" />
                <h3 className="text-base font-bold text-foreground">{t.shop}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShopOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {/* Rod Upgrades */}
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    낚싯대: {currentRod.names.ko || currentRod.names.en} (Lv.{currentRod.level})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    내구도 x{currentRod.durability} / 인장력 x{currentRod.pullPower}
                  </span>
                </div>
                {nextRod ? (
                  <button
                    type="button"
                    disabled={gameState.gold < nextRod.cost}
                    onClick={() => {
                      playSound("upgrade");
                      setGameState((prev) => buyRodUpgrade(prev));
                    }}
                    className="w-full flex items-center justify-between rounded-lg border border-border bg-primary disabled:opacity-50 px-3 py-2 text-xs font-bold text-primary-foreground shadow-xs"
                  >
                    <span>
                      {nextRod.names.ko || nextRod.names.en} (Lv.{nextRod.level})
                    </span>
                    <span>{nextRod.cost.toLocaleString()} G</span>
                  </button>
                ) : (
                  <div className="text-xs text-muted-foreground text-center font-bold">최고 등급 로드 달성!</div>
                )}
              </div>

              {/* Boat Upgrades */}
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    선박: {currentBoat.names.ko || currentBoat.names.en} (Lv.{currentBoat.level})
                  </span>
                  <span className="text-xs text-muted-foreground">해역: {t.zones[currentBoat.unlockedZone]}</span>
                </div>
                {nextBoat ? (
                  <button
                    type="button"
                    disabled={gameState.gold < nextBoat.cost}
                    onClick={() => {
                      playSound("upgrade");
                      setGameState((prev) => buyBoatUpgrade(prev));
                    }}
                    className="w-full flex items-center justify-between rounded-lg border border-border bg-primary disabled:opacity-50 px-3 py-2 text-xs font-bold text-primary-foreground shadow-xs"
                  >
                    <span>
                      {nextBoat.names.ko || nextBoat.names.en} (Lv.{nextBoat.level})
                    </span>
                    <span>{nextBoat.cost.toLocaleString()} G</span>
                  </button>
                ) : (
                  <div className="text-xs text-muted-foreground text-center font-bold">최고 등급 탐사선 달성!</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {gameState.status === "victory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative flex max-w-md flex-col items-center rounded-2xl border border-warning/50 bg-card p-6 text-center shadow-2xl space-y-4">
            <Award className="size-16 text-warning animate-bounce" />
            <h3 className="text-xl font-black text-warning">{t.victoryTitle}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.victoryDesc}</p>
            <div className="flex items-center gap-4 text-xs font-bold text-foreground">
              <span>도감: {Object.keys(gameState.encyclopedia).length} / 30종</span>
              <span>총 골드: {gameState.gold.toLocaleString()} G</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGameState(createFishingGame(Date.now()));
              }}
              className="flex items-center gap-2 rounded-xl border border-border bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <RotateCcw className="size-4" />
              {t.playAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
