import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sun,
  CloudRain,
  Moon,
  Coins,
  BatteryCharging,
  Sparkles,
  ShoppingBag,
  Shovel,
  Check,
} from "lucide-react";
import {
  createFarmGame,
  stepFarmAction,
  FARM_WIDTH,
  FARM_HEIGHT,
  FarmTileType,
  CROP_DEFINITIONS,
  getFarmIndex,
  type FarmState,
  type FarmDirection,
  type ActiveTool,
  type CropId,
} from "../../lib/games/dot-farm";
import {
  RetroChiptuneSynth,
  getRetroChiptuneBgm,
  getSharedAudioContext,
  useGameJuicePro,
} from "../../lib/games/engine-suite-unified";
import {
  HitStopController,
  PixelFxController,
  playMultiLayerPixelSfx,
} from "../../lib/games/pixelfx-engine";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import { todayKey } from "../../lib/games/daily";

const COPY = {
  ko: {
    title: "도트 팜",
    sub: "아늑한 픽셀 농장에서 작물을 가꾸고 5,000골드 부농의 꿈을 이루세요",
    day: "일차",
    energy: "체력",
    money: "골드",
    tools: "농기구",
    hoe: "괭이 (개간)",
    can: "물뿌리개",
    scythe: "낫 (벌채)",
    seeds: "씨앗",
    sleep: "잠자기 (다음 날)",
    market: "농작물 시장",
    sellAll: "수확물 전량 판매",
    buySeed: "씨앗 구매",
    sprinkler: "스프링클러 설치 ($250)",
    inventory: "창고 보관함",
    emptyStorage: "수확한 작물이 없습니다",
    victoryTitle: "★ 농장 경영 정복! ★",
    victoryDesc: "농장 자산 5,000골드를 달성하여 전설적인 마스터 파머로 등극했습니다!",
    playAgain: "새로운 농장 시작",
    hint: "이동: 방향키/WASD | 도구 사용: Space 또는 클릭 | 도구 전환: 1~4번 키",
  },
  en: {
    title: "Dot Farm",
    sub: "Tend cozy pixel fields, grow crops, and achieve $5,000 farming fortune",
    day: "Day",
    energy: "Energy",
    money: "Gold",
    tools: "Tools",
    hoe: "Hoe (Till)",
    can: "Water Can",
    scythe: "Scythe",
    seeds: "Seeds",
    sleep: "Sleep (Next Day)",
    market: "Farm Market",
    sellAll: "Sell All Produce",
    buySeed: "Buy Seeds",
    sprinkler: "Buy Sprinkler ($250)",
    inventory: "Crop Storage",
    emptyStorage: "No harvested crops in storage",
    victoryTitle: "★ MASTER FARMER VICTORY! ★",
    victoryDesc: "Your flourishing farm reached $5,000 net worth! Master Farmer title unlocked!",
    playAgain: "Start New Farm",
    hint: "Move: Arrow Keys/WASD | Use Tool: Space or Tap | Switch Tools: Keys 1-4",
  },
  ja: {
    title: "ドットファーム",
    sub: "ドット絵の牧場で農作物を育て、5,000ゴールドの豪農を目指せ",
    day: "日目",
    energy: "体力",
    money: "ゴールド",
    tools: "農具",
    hoe: "クワ (耕作)",
    can: "じょうろ",
    scythe: "カマ (刈取)",
    seeds: "種",
    sleep: "就寝 (翌日へ)",
    market: "農産物市場",
    sellAll: "全収穫物を売却",
    buySeed: "種を購入",
    sprinkler: "スプリンクラー設置 ($250)",
    inventory: "貯蔵庫",
    emptyStorage: "収穫物はまだありません",
    victoryTitle: "★ 牧場制覇！豪農達成 ★",
    victoryDesc: "総資産5,000ゴールドを達成し、伝説のマスターファーマーとなりました！",
    playAgain: "新しい牧場を始める",
    hint: "移動: 矢印キー/WASD | 道具使用: Space または タップ | 切替: 1〜4キー",
  },
  zh: {
    title: "点点农场",
    sub: "在温馨的像素农场耕耘收获，实现5,000金币的大农场主之梦",
    day: "天",
    energy: "体力",
    money: "金币",
    tools: "农具",
    hoe: "锄头 (耕地)",
    can: "水壶",
    scythe: "镰刀 (除草)",
    seeds: "种子",
    sleep: "就寝 (下一天)",
    market: "农产品市场",
    sellAll: "出售全部收获",
    buySeed: "购买种子",
    sprinkler: "安装自动洒水器 ($250)",
    inventory: "农仓库存",
    emptyStorage: "农仓暂无收获的作物",
    victoryTitle: "★ 农场经营大获全胜！ ★",
    victoryDesc: "农场总资产突破5,000金币！荣获顶级农场主称号！",
    playAgain: "开启新农场",
    hint: "移动: 方向键/WASD | 使用工具: 空格或点击 | 切换工具: 1-4按键",
  },
  fr: {
    title: "Dot Farm",
    sub: "Cultivez votre ferme pixel, récoltez et atteignez 5 000 pièces d'or",
    day: "Jour",
    energy: "Énergie",
    money: "Or",
    tools: "Outils",
    hoe: "Houe (Labour)",
    can: "Arrosoir",
    scythe: "Faux",
    seeds: "Graines",
    sleep: "Dormir (Jour suivant)",
    market: "Marché agricole",
    sellAll: "Tout vendre",
    buySeed: "Acheter graines",
    sprinkler: "Arroseur auto ($250)",
    inventory: "Stock de récoltes",
    emptyStorage: "Aucune récolte en stock",
    victoryTitle: "★ MAÎTRE FERMIER COURONNÉ ! ★",
    victoryDesc: "Votre ferme a atteint 5 000 pièces d'or ! Titre de Maître Fermier débloqué !",
    playAgain: "Nouvelle ferme",
    hint: "Déplacement : Flèches/WASD | Action : Espace | Outils : 1-4",
  },
  es: {
    title: "Dot Farm",
    sub: "Cultiva tu granja pixel, cosecha vegetales y alcanza 5,000 de oro",
    day: "Día",
    energy: "Energía",
    money: "Oro",
    tools: "Herramientas",
    hoe: "Azada (Arar)",
    can: "Regadera",
    scythe: "Guadaña",
    seeds: "Semillas",
    sleep: "Dormir (Día siguiente)",
    market: "Mercado agrícola",
    sellAll: "Vender cosechas",
    buySeed: "Comprar semillas",
    sprinkler: "Aspersor ($250)",
    inventory: "Almacén",
    emptyStorage: "No hay cosechas almacenadas",
    victoryTitle: "★ ¡GRANJERO MAESTRO CORONADO! ★",
    victoryDesc: "¡Tu granja alcanzó 5,000 monedas de oro! ¡Título de Granjero Maestro desbloqueado!",
    playAgain: "Nueva granja",
    hint: "Mover: Flechas/WASD | Usar: Espacio | Herramientas: 1-4",
  },
};

const TILE_SIZE = 28;
const CANVAS_WIDTH = FARM_WIDTH * TILE_SIZE; // 392
const CANVAS_HEIGHT = FARM_HEIGHT * TILE_SIZE; // 280

export default function DotFarm({ locale = "en" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<FarmState>(() => createFarmGame(Date.now()));
  const [marketOpen, setMarketOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("dot_farm_sound") !== "false";
      }
    } catch {}
    return true;
  });

  const { isImmersive, containerRef, togglePortal } = useArcadePortal({
    locale: (locale as any) || "en",
  });
  const { shakeCssVars, addTrauma } = useGameJuicePro();
  const pixelFxRef = useRef<PixelFxController>(new PixelFxController(32));
  const hitStopRef = useRef<HitStopController>(new HitStopController());
  const [fxTick, setFxTick] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    const stepFx = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const freezing = hitStopRef.current.update(dt);
      if (!freezing && pixelFxRef.current.getActiveCount() > 0) {
        pixelFxRef.current.update(dt);
        setFxTick((v) => (v + 1) % 1000);
      }
      rafId = requestAnimationFrame(stepFx);
    };
    rafId = requestAnimationFrame(stepFx);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // BGM
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (soundEnabled && gameState.status === "playing") {
      bgm.playTheme("cozy-pet");
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [soundEnabled, gameState.status]);

  // Persist sound
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("dot_farm_sound", String(soundEnabled));
      }
    } catch {}
  }, [soundEnabled]);

  // Arcade Pass Daily Mission tracking
  useEffect(() => {
    if (gameState.totalHarvested <= 0 && gameState.money <= 100) return;
    const today = todayKey();
    let current = loadArcadePassProgress(today);
    if (gameState.totalHarvested > 0) {
      current = reportMissionProgress(current, "dot-farm", gameState.totalHarvested);
    }
    if (gameState.money > 100) {
      current = reportMissionProgress(current, "dot-farm", gameState.money);
    }
    saveArcadePassProgress(current);
  }, [gameState.totalHarvested, gameState.money]);

  const handleAction = useCallback(
    (
      action:
        | { type: "move"; dir: FarmDirection }
        | { type: "interact" }
        | { type: "select_tool"; tool: ActiveTool }
        | { type: "select_seed"; seed: CropId }
        | { type: "sleep" }
        | { type: "buy_seed"; cropId: CropId; count: number }
        | { type: "buy_sprinkler" }
        | { type: "sell_all" }
    ) => {
      setGameState((prev) => {
        if (prev.status === "victory" && action.type !== "select_tool") return prev;

        const result = stepFarmAction(prev, action);
        const { events, state: next } = result;

        const fxX = next.farmerX * TILE_SIZE + 14;
        const fxY = next.farmerY * TILE_SIZE + 14;
        if (events.harvested) {
          pixelFxRef.current.spawn("nature-bloom", fxX, fxY, { palette: "heal", scale: 1.5 });
          hitStopRef.current.trigger(45);
        } else if (events.watered) {
          pixelFxRef.current.spawn("water-splash", fxX, fxY, { palette: "water", scale: 1.3 });
        } else if (events.soldProduce) {
          pixelFxRef.current.spawn("coin-sparkle", fxX, fxY, { palette: "gold", scale: 1.6 });
        }

        if (soundEnabled) {
          const audioCtx = getSharedAudioContext();
          const pitchVar = 1 + (Math.random() * 10 - 5) * 0.01;
          // Multi-layer synth with detune and harmonic sub-oscillator
          if (events.victory) {
            RetroChiptuneSynth.playPowerup(audioCtx);
            playMultiLayerPixelSfx(720 * pitchVar, 0.2, "triangle", true);
            setTimeout(() => RetroChiptuneSynth.playCoin(getSharedAudioContext()), 160);
          } else if (events.harvested) {
            RetroChiptuneSynth.playCoin(audioCtx);
            playMultiLayerPixelSfx(540 * pitchVar, 0.14, "sine", true);
          } else if (events.sleptDay) {
            RetroChiptuneSynth.playJump(audioCtx);
          } else if (events.boughtItem || events.soldProduce) {
            RetroChiptuneSynth.playPowerup(audioCtx);
          } else if (events.watered) {
            RetroChiptuneSynth.playBlip(audioCtx, 320);
            playMultiLayerPixelSfx(320 * pitchVar, 0.1, "sine", false);
          } else if (events.tilled) {
            RetroChiptuneSynth.playHit(audioCtx);
          } else if (events.planted) {
            RetroChiptuneSynth.playBlip(audioCtx, 440);
          }
        }

        if (events.harvested) {
          addTrauma(0.15);
        } else if (events.sleptDay) {
          addTrauma(0.2);
        }

        return next;
      });
    },
    [soundEnabled, addTrauma]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleAction({ type: "move", dir: "up" });
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleAction({ type: "move", dir: "down" });
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleAction({ type: "move", dir: "left" });
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleAction({ type: "move", dir: "right" });
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleAction({ type: "interact" });
      } else if (e.key === "1") {
        handleAction({ type: "select_tool", tool: "hoe" });
      } else if (e.key === "2") {
        handleAction({ type: "select_tool", tool: "can" });
      } else if (e.key === "3") {
        handleAction({ type: "select_tool", tool: "scythe" });
      } else if (e.key === "4") {
        handleAction({ type: "select_tool", tool: "seed" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // 1. Draw Field Tiles
    for (let y = 0; y < FARM_HEIGHT; y++) {
      for (let x = 0; x < FARM_WIDTH; x++) {
        const idx = getFarmIndex(x, y);
        const tile = gameState.tiles[idx];
        const crop = gameState.crops[idx];
        const hasSprinkler = gameState.sprinklers[idx];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Base ground
        switch (tile) {
          case FarmTileType.Grass:
            ctx.fillStyle = "#008751";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            if ((x + y) % 2 === 0) {
              ctx.fillStyle = "#00E436";
              ctx.fillRect(px + 4, py + 4, 3, 3);
            }
            break;

          case FarmTileType.TilledDry:
            ctx.fillStyle = "#5F574F";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#7E2553";
            ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            break;

          case FarmTileType.TilledWatered:
            ctx.fillStyle = "#1D2B53";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#29ADFF";
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = "#1D2B53";
            ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            break;

          case FarmTileType.Weeds:
            ctx.fillStyle = "#008751";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#005800";
            ctx.fillRect(px + 8, py + 6, 12, 16);
            ctx.fillStyle = "#00E436";
            ctx.fillRect(px + 10, py + 4, 8, 8);
            break;

          case FarmTileType.Rock:
            ctx.fillStyle = "#008751";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#7C7C7C";
            ctx.beginPath();
            ctx.arc(px + 14, py + 14, 9, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        // Sprinkler nozzle
        if (hasSprinkler) {
          ctx.fillStyle = "#29ADFF";
          ctx.beginPath();
          ctx.arc(px + 14, py + 14, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FFF1E8";
          ctx.fillRect(px + 12, py + 8, 4, 12);
        }

        // Crop rendering
        if (crop) {
          const def = CROP_DEFINITIONS[crop.cropId];
          const isSprout = crop.growthDays < Math.ceil(def.daysToMature / 2);

          if (crop.isMature) {
            // Mature harvestable crop
            ctx.fillStyle = def.color;
            ctx.beginPath();
            ctx.arc(px + 14, py + 14, 9, 0, Math.PI * 2);
            ctx.fill();

            // Sparkle glow
            ctx.fillStyle = "#FFF1E8";
            ctx.fillRect(px + 12, py + 6, 4, 4);

            // Leaf hat
            ctx.fillStyle = "#00E436";
            ctx.fillRect(px + 11, py + 2, 6, 4);
          } else if (isSprout) {
            // Tiny green sprout
            ctx.fillStyle = "#00E436";
            ctx.fillRect(px + 12, py + 14, 4, 8);
            ctx.fillRect(px + 8, py + 11, 12, 4);
          } else {
            // Half grown plant with budding fruit
            ctx.fillStyle = "#00E436";
            ctx.fillRect(px + 10, py + 10, 8, 12);
            ctx.fillStyle = def.color;
            ctx.fillRect(px + 11, py + 12, 6, 6);
          }
        }
      }
    }

    // 2. Draw Farmer Character
    const fx = gameState.farmerX * TILE_SIZE;
    const fy = gameState.farmerY * TILE_SIZE;

    // Selection target outline
    ctx.strokeStyle = "#FFEC27";
    ctx.lineWidth = 2;
    ctx.strokeRect(fx + 1, fy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    // Farmer body (Overalls)
    ctx.fillStyle = "#29ADFF";
    ctx.fillRect(fx + 7, fy + 12, 14, 12);
    // Face
    ctx.fillStyle = "#FFCCAA";
    ctx.fillRect(fx + 9, fy + 7, 10, 8);
    // Straw Hat
    ctx.fillStyle = "#FFEC27";
    ctx.fillRect(fx + 5, fy + 4, 18, 4);
    ctx.fillRect(fx + 8, fy + 1, 12, 4);

    // 3. Draw PixelFX dual-buffer bursts
    pixelFxRef.current.drawToCanvas(ctx);
  }, [gameState, fxTick]);

  const restartGame = () => {
    setGameState(createFarmGame(Date.now()));
  };

  const energyPct = Math.max(0, Math.min(100, Math.round((gameState.energy / gameState.maxEnergy) * 100)));
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
      className={`relative mx-auto flex w-full max-w-4xl flex-col items-center select-none rounded-2xl bg-card p-2 text-card-foreground shadow-2xl transition-all sm:p-4 translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot) ${
        isImmersive
          ? "fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-5 overflow-y-auto flex flex-col justify-between m-0 select-none"
          : "relative"
      }`}
    >
      {/* Top Header & HUD */}
      <div className="flex w-full items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-secondary font-mono text-base font-bold text-primary ring-1 ring-primary/40">
            🌾
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground sm:text-lg">{t.title}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{t.sub}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle Fullscreen"
          >
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="my-2.5 grid w-full grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/40 p-2 text-xs sm:grid-cols-4 sm:p-2.5">
        {/* Day & Weather */}
        <div className="flex items-center gap-2 font-medium text-foreground">
          {gameState.weather === "sunny" ? (
            <Sun className="size-4 text-warning" />
          ) : (
            <CloudRain className="size-4 text-primary" />
          )}
          <span>
            {t.day} {gameState.day} ({gameState.weather === "sunny" ? "Sunny" : "Rainy"})
          </span>
        </div>

        {/* Money */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Coins className="size-4 text-warning" />
          <span>
            {t.money}: <span className="font-bold text-warning">${gameState.money}</span>
          </span>
        </div>

        {/* Harvested */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          <span>Harvested: {gameState.totalHarvested} crops</span>
        </div>

        {/* Energy Bar */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between pb-1 text-xs font-semibold">
            <span className="flex items-center gap-1 text-primary">
              <BatteryCharging className="size-3 text-primary" />
              {t.energy}
            </span>
            <span className="text-muted-foreground">{gameState.energy}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ "--energy-pct": `${energyPct}%` } as React.CSSProperties}
              className={`h-full w-(--energy-pct) transition-all duration-200 ${
                energyPct > 40 ? "bg-success" : "bg-destructive"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex w-full justify-center overflow-hidden rounded-lg border border-border bg-card shadow-inner">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="h-auto w-full max-w-full object-contain"
        />

        {/* Victory Modal */}
        {gameState.status === "victory" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-4 text-center backdrop-blur-xs">
            <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-warning/20 text-3xl ring-2 ring-warning">
              👑
            </div>
            <h2 className="text-xl font-extrabold text-warning sm:text-2xl">{t.victoryTitle}</h2>
            <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">{t.victoryDesc}</p>
            <div className="my-3 flex gap-4 text-xs font-mono text-foreground">
              <div>
                {t.money}: <span className="font-bold text-warning">${gameState.money}</span>
              </div>
              <div>
                {t.day}: <span className="font-bold text-primary">{gameState.day}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={restartGame}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition hover:bg-primary/90 sm:text-sm"
            >
              <RotateCcw className="size-4" />
              {t.playAgain}
            </button>
          </div>
        )}
      </div>

      {/* Notification Message Bar */}
      <div className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-2 font-mono text-xs">
        <span className="text-foreground">{gameState.message}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{t.hint}</span>
      </div>

      {/* Tools & Seed Hotbar */}
      <div className="mt-2.5 flex w-full flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{t.tools}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAction({ type: "sleep" })}
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground border border-border hover:bg-secondary/80"
            >
              <Moon className="size-3.5 text-primary" />
              {t.sleep}
            </button>
            <button
              type="button"
              onClick={() => setMarketOpen(!marketOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingBag className="size-3.5" />
              {t.market}
            </button>
          </div>
        </div>

        {/* Hotbar Slots */}
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          <button
            type="button"
            onClick={() => handleAction({ type: "select_tool", tool: "hoe" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition ${
              gameState.selectedTool === "hoe"
                ? "border-primary bg-secondary text-primary font-bold shadow-xs"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <Shovel className="size-4" />
            <span>{t.hoe}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction({ type: "select_tool", tool: "can" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition ${
              gameState.selectedTool === "can"
                ? "border-primary bg-secondary text-primary font-bold shadow-xs"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <span>💧</span>
            <span>{t.can}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction({ type: "select_tool", tool: "scythe" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition ${
              gameState.selectedTool === "scythe"
                ? "border-primary bg-secondary text-primary font-bold shadow-xs"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <span>🌾</span>
            <span>{t.scythe}</span>
          </button>

          {/* Seeds */}
          {(["turnip", "carrot", "tomato", "strawberry"] as CropId[]).map((cropId) => {
            const def = CROP_DEFINITIONS[cropId];
            const count = gameState.inventory[cropId].seeds;
            const isSelected = gameState.selectedTool === "seed" && gameState.selectedSeed === cropId;

            return (
              <button
                key={cropId}
                type="button"
                onClick={() => handleAction({ type: "select_seed", seed: cropId })}
                className={`flex items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${
                  isSelected
                    ? "border-primary bg-secondary text-primary font-bold shadow-xs"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <span>{def.symbol}</span>
                <span>{def.name}</span>
                <span className="font-mono text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Market Modal / Drawer */}
      {marketOpen && (
        <div className="mt-3 flex w-full flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between border-b border-border/80 pb-2 text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="size-4 text-primary" />
              {t.market} (Balance: ${gameState.money})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAction({ type: "sell_all" })}
                className="flex items-center gap-1 rounded-md bg-warning px-2.5 py-1 text-xs font-bold text-card hover:bg-warning/90"
              >
                <Coins className="size-3.5" />
                {t.sellAll}
              </button>
              <button
                type="button"
                onClick={() => handleAction({ type: "buy_sprinkler" })}
                className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                {t.sprinkler}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(CROP_DEFINITIONS) as CropId[]).map((cropId) => {
              const def = CROP_DEFINITIONS[cropId];
              return (
                <div
                  key={cropId}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{def.symbol}</span>
                    <div>
                      <div className="font-bold text-foreground">{def.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        Buy: ${def.seedCost} | Sell: ${def.sellPrice}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={gameState.money < def.seedCost}
                    onClick={() => handleAction({ type: "buy_seed", cropId, count: 1 })}
                    className="rounded-md bg-secondary px-2 py-1 font-bold text-primary hover:bg-secondary/70 disabled:opacity-40"
                  >
                    +1
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Touch D-Pad */}
      <div className="mt-4 flex w-full items-center justify-center gap-6 sm:hidden">
        <div className="grid grid-cols-3 gap-1.5">
          <div />
          <button
            type="button"
            onClick={() => handleAction({ type: "move", dir: "up" })}
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-secondary active:bg-secondary/70 font-bold text-foreground shadow-xs"
          >
            ▲
          </button>
          <div />

          <button
            type="button"
            onClick={() => handleAction({ type: "move", dir: "left" })}
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-secondary active:bg-secondary/70 font-bold text-foreground shadow-xs"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => handleAction({ type: "interact" })}
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-primary active:bg-primary/90 text-xs font-bold text-primary-foreground shadow-xs"
          >
            <Check className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction({ type: "move", dir: "right" })}
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-secondary active:bg-secondary/70 font-bold text-foreground shadow-xs"
          >
            ▶
          </button>

          <div />
          <button
            type="button"
            onClick={() => handleAction({ type: "move", dir: "down" })}
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-secondary active:bg-secondary/70 font-bold text-foreground shadow-xs"
          >
            ▼
          </button>
          <div />
        </div>
      </div>
    </div>
  );
}
