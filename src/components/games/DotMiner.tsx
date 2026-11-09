import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Fuel,
  Shield,
  Pickaxe,
  Briefcase,
  Coins,
  Radio,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import {
  createMinerGame,
  stepMiner,
  MINER_WORLD_WIDTH,
  MINER_WORLD_DEPTH,
  SURFACE_Y,
  BlockType,
  ORE_REGISTRY,
  getBlockIndex,
  getUpgradeCost,
  getMaxUpgradeLevel,
  type MinerState,
  type MinerDirection,
  type MinerUpgrades,
} from "../../lib/games/dot-miner";
import {
  RetroChiptuneSynth,
  getRetroChiptuneBgm,
  getSharedAudioContext,
  useGameJuicePro,
} from "../../lib/games/engine-suite-unified";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import { todayKey } from "../../lib/games/daily";

const COPY = {
  ko: {
    title: "도트 마이너",
    sub: "지하 150m 심연에 잠든 고대 코어 스타를 발굴하세요",
    depth: "심도",
    fuel: "연료",
    hull: "내구도",
    cargo: "적재량",
    cash: "자금",
    drill: "드릴",
    radar: "탐지기",
    upgrades: "지상 정비소 업그레이드",
    maxLevel: "최대 레벨",
    surfaceTown: "지상 기지 — 연료/내구도 무료 충전 및 광물 자동 정산",
    deepWarning: "지하 심연 탐사 중! 연료 고갈에 주의하세요.",
    victoryTitle: "★ 코어 스타 발굴 완료! ★",
    victoryDesc: "지하 150m 심연에서 고대 코어 스타를 성공적으로 발굴하여 지상으로 귀환했습니다!",
    gameOverTitle: "채굴선이 대파되었습니다...",
    gameOverDesc: "지하의 가혹한 환경에서 채굴선이 파괴되었습니다.",
    playAgain: "새로운 탐사 시작",
    hint: "이동/채굴: 방향키 또는 WASD | 업그레이드: 지상에서 버튼 클릭",
  },
  en: {
    title: "Dot Miner",
    sub: "Drill deep into 150m subterranean abyss to extract the Ancient Core Star",
    depth: "Depth",
    fuel: "Fuel",
    hull: "Hull",
    cargo: "Cargo",
    cash: "Cash",
    drill: "Drill",
    radar: "Radar",
    upgrades: "Surface Workshop Upgrades",
    maxLevel: "MAX",
    surfaceTown: "Surface Base — Free auto-refuel, repair, and mineral exchange",
    deepWarning: "Deep underground! Watch your fuel gauge carefully.",
    victoryTitle: "★ CORE STAR EXTRACTED! ★",
    victoryDesc: "You successfully drilled down to the 150m abyss and brought back the legendary Core Star!",
    gameOverTitle: "Miner Pod Destroyed...",
    gameOverDesc: "Your miner pod succumbed to subterranean hazards.",
    playAgain: "New Expedition",
    hint: "Move/Drill: Arrow Keys or WASD | Upgrades: Click buttons at surface",
  },
  ja: {
    title: "ドットマイナー",
    sub: "地下150mの深淵に眠る古代のコアスターを発掘せよ",
    depth: "深度",
    fuel: "燃料",
    hull: "耐久度",
    cargo: "積載量",
    cash: "資金",
    drill: "ドリル",
    radar: "レーダー",
    upgrades: "地上整備工場のアップグレード",
    maxLevel: "最大",
    surfaceTown: "地上基地 — 燃料・修理無料＆鉱物自動換金",
    deepWarning: "地下深部を探査中！燃料切れに注意してください。",
    victoryTitle: "★ コアスター発掘完了！ ★",
    victoryDesc: "地下150mの深淵から伝説のコアスターを持ち帰ることに成功しました！",
    gameOverTitle: "採掘ポッドが大破しました...",
    gameOverDesc: "地下の過酷な環境でポッドが破壊されました。",
    playAgain: "新しい探査を開始",
    hint: "移動・採掘: 矢印キー または WASD | アップグレード: 地上でクリック",
  },
  zh: {
    title: "点点采矿者",
    sub: "深入地下150米深渊，挖掘远古核心之星",
    depth: "深度",
    fuel: "燃料",
    hull: "结构",
    cargo: "货舱",
    cash: "资金",
    drill: "钻头",
    radar: "雷达",
    upgrades: "地面维修站升级",
    maxLevel: "已满级",
    surfaceTown: "地面基地 — 免费补满燃料维修并自动售卖矿石",
    deepWarning: "正在地下深处作业！请密切留意燃料表。",
    victoryTitle: "★ 核心之星挖掘成功！ ★",
    victoryDesc: "你成功潜入150米深渊并带回了传奇的核心之星！",
    gameOverTitle: "采矿舱损毁...",
    gameOverDesc: "采矿舱在地下严酷的环境中被摧毁。",
    playAgain: "开始新探险",
    hint: "移动/挖掘: 方向键 或 WASD | 升级: 在地面点击按钮",
  },
  fr: {
    title: "Dot Miner",
    sub: "Forer jusqu'à 150 m sous terre pour extraire l'Étoile du Cœur",
    depth: "Profondeur",
    fuel: "Carburant",
    hull: "Coque",
    cargo: "Cale",
    cash: "Fonds",
    drill: "Foreuse",
    radar: "Radar",
    upgrades: "Améliorations de l'atelier de surface",
    maxLevel: "MAX",
    surfaceTown: "Base de surface — Ravitaillement gratuit et rachat automatique",
    deepWarning: "Sous terre profonde ! Surveillez votre niveau de carburant.",
    victoryTitle: "★ ÉTOILE DU CŒUR EXTRAITE ! ★",
    victoryDesc: "Vous avez foré jusqu'à 150 m et rapporté la légendaire Étoile du Cœur !",
    gameOverTitle: "Module minier détruit...",
    gameOverDesc: "Votre module a succombé aux dangers souterrains.",
    playAgain: "Nouvelle expédition",
    hint: "Déplacer/Forer : Flèches ou WASD | Améliorations : Clic en surface",
  },
  es: {
    title: "Dot Miner",
    sub: "Perfora hasta 150 m de profundidad para extraer la Estrella del Núcleo",
    depth: "Profundidad",
    fuel: "Combustible",
    hull: "Casco",
    cargo: "Carga",
    cash: "Fondos",
    drill: "Taladro",
    radar: "Radar",
    upgrades: "Mejoras del taller de superficie",
    maxLevel: "MÁX",
    surfaceTown: "Base de superficie — Repostaje gratuito y venta automática",
    deepWarning: "¡Bajo tierra profunda! Controla el medidor de combustible.",
    victoryTitle: "★ ¡ESTRELLA DEL NÚCLEO EXTRAÍDA! ★",
    victoryDesc: "¡Has perforado hasta 150 m y recuperado la legendaria Estrella del Núcleo!",
    gameOverTitle: "Módulo minero destruido...",
    gameOverDesc: "Tu módulo sucumbió a los peligros subterráneos.",
    playAgain: "Nueva expedición",
    hint: "Mover/Perforar: Flechas o WASD | Mejoras: Clic en superficie",
  },
};

const TILE_SIZE = 20;
const VIEWPORT_TILES_X = 20;
const VIEWPORT_TILES_Y = 16;
const CANVAS_WIDTH = VIEWPORT_TILES_X * TILE_SIZE; // 400
const CANVAS_HEIGHT = VIEWPORT_TILES_Y * TILE_SIZE; // 320

export default function DotMiner({ locale = "en" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<MinerState>(() => createMinerGame(Date.now()));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("dot_miner_sound") !== "false";
      }
    } catch {}
    return true;
  });

  const { isImmersive, containerRef, togglePortal } = useArcadePortal({
    locale: (locale as any) || "en",
  });
  const { shakeCssVars, addTrauma } = useGameJuicePro();

  // BGM playback
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (soundEnabled && (gameState.status === "mining" || gameState.status === "surface")) {
      bgm.playTheme("retro-mining");
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [soundEnabled, gameState.status]);

  // Persist sound preference
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("dot_miner_sound", String(soundEnabled));
      }
    } catch {}
  }, [soundEnabled]);

  // Arcade Pass Daily Mission tracking
  useEffect(() => {
    const val = Math.max(gameState.depthMax, gameState.cash);
    if (val <= 0) return;
    const today = todayKey();
    const current = loadArcadePassProgress(today);
    const updated = reportMissionProgress(current, "dot-miner", val);
    if (updated.xp !== current.xp || updated.completedMissionIds.length !== current.completedMissionIds.length) {
      saveArcadePassProgress(updated);
    }
  }, [gameState.depthMax, gameState.cash]);

  const handleAction = useCallback(
    (action: { type: "move"; dir: MinerDirection } | { type: "upgrade"; upgradeType: keyof MinerUpgrades }) => {
      setGameState((prev) => {
        if (prev.status === "victory" || prev.status === "gameover") return prev;

        const result = stepMiner(prev, action);
        const { events, state: next } = result;

        if (soundEnabled) {
          const audioCtx = getSharedAudioContext();
          if (events.victory) {
            RetroChiptuneSynth.playPowerup(audioCtx);
            setTimeout(() => RetroChiptuneSynth.playCoin(getSharedAudioContext()), 160);
          } else if (events.outOfFuel || events.tookDamage) {
            RetroChiptuneSynth.playHit(audioCtx);
          } else if (events.boulderFell) {
            RetroChiptuneSynth.playExplosion(audioCtx);
          } else if (events.collectedOre) {
            RetroChiptuneSynth.playCoin(audioCtx);
          } else if (events.drilled) {
            RetroChiptuneSynth.playBlip(audioCtx, 180);
          } else if (events.moved) {
            RetroChiptuneSynth.playBlip(audioCtx, 240);
          }
        }

        if (events.boulderFell) {
          addTrauma(0.45);
        } else if (events.tookDamage) {
          addTrauma(0.3);
        } else if (events.drilled) {
          addTrauma(0.1);
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  // Canvas render loop (Follow camera)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Clear background (Abyssal black)
    ctx.fillStyle = "#0B0813";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Calculate camera offset centered on miner
    const camX = Math.max(0, Math.min(MINER_WORLD_WIDTH - VIEWPORT_TILES_X, gameState.x - Math.floor(VIEWPORT_TILES_X / 2)));
    const camY = Math.max(0, Math.min(MINER_WORLD_DEPTH - VIEWPORT_TILES_Y, gameState.y - Math.floor(VIEWPORT_TILES_Y / 2)));

    const lightRadius = 3 + gameState.upgrades.radar * 1.5;

    // 1. Draw Visible Blocks
    for (let vy = 0; vy < VIEWPORT_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEWPORT_TILES_X; vx++) {
        const wx = camX + vx;
        const wy = camY + vy;

        if (wx < 0 || wx >= MINER_WORLD_WIDTH || wy < 0 || wy >= MINER_WORLD_DEPTH) continue;

        const idx = getBlockIndex(wx, wy);
        const block = gameState.blocks[idx];
        const px = vx * TILE_SIZE;
        const py = vy * TILE_SIZE;

        // Illumination distance
        const dist = Math.hypot(wx - gameState.x, wy - gameState.y);
        const isSurface = wy <= SURFACE_Y;
        const isLit = isSurface || dist <= lightRadius;

        if (!isLit && wy > SURFACE_Y + 1) {
          // Dark subterranean shadow
          ctx.fillStyle = "#050408";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          continue;
        }

        // Render block types
        switch (block) {
          case BlockType.Air:
            ctx.fillStyle = isSurface ? "#1D2B53" : "#0f0d17";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            break;

          case BlockType.SurfaceGrass:
            ctx.fillStyle = "#008751";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#00E436";
            ctx.fillRect(px, py, TILE_SIZE, 3);
            break;

          case BlockType.Dirt:
            ctx.fillStyle = "#5F574F";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#7E2553";
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;

          case BlockType.Clay:
            ctx.fillStyle = "#AB5236";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            break;

          case BlockType.Stone:
            ctx.fillStyle = "#1D2B53";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#83769C";
            ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            break;

          case BlockType.Granite:
            ctx.fillStyle = "#201135";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#5F574F";
            ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            break;

          case BlockType.Obsidian:
            ctx.fillStyle = "#050408";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#7000FF";
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;

          case BlockType.Boulder:
            ctx.fillStyle = "#C2C3C7";
            ctx.beginPath();
            ctx.arc(px + 10, py + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            break;

          case BlockType.Lava:
            ctx.fillStyle = "#FF004D";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#FFA300";
            ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            break;

          default:
            // Ore Block
            if (ORE_REGISTRY[block]) {
              const ore = ORE_REGISTRY[block];
              ctx.fillStyle = "#1c182b";
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

              // Gem sparkle in center
              ctx.fillStyle = ore.color;
              ctx.beginPath();
              ctx.arc(px + 10, py + 10, block === BlockType.CoreStar ? 7 : 5, 0, Math.PI * 2);
              ctx.fill();

              ctx.font = "bold 9px monospace";
              ctx.fillStyle = "#FFFFFF";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(ore.symbol, px + 10, py + 10);
            }
            break;
        }

        // Subterranean radial light vignette
        if (!isSurface && dist > lightRadius * 0.7) {
          const alpha = Math.min(0.85, (dist - lightRadius * 0.7) / (lightRadius * 0.3));
          ctx.fillStyle = `rgba(11, 8, 19, ${alpha})`;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // 2. Draw Miner Pod
    const minerScreenX = (gameState.x - camX) * TILE_SIZE;
    const minerScreenY = (gameState.y - camY) * TILE_SIZE;

    // Headlamp Glow Aura
    const grad = ctx.createRadialGradient(
      minerScreenX + 10,
      minerScreenY + 10,
      2,
      minerScreenX + 10,
      minerScreenY + 10,
      lightRadius * TILE_SIZE
    );
    grad.addColorStop(0, "rgba(255, 236, 39, 0.2)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(minerScreenX + 10, minerScreenY + 10, lightRadius * TILE_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Miner Capsule Hull
    ctx.fillStyle = "#29ADFF";
    ctx.fillRect(minerScreenX + 3, minerScreenY + 4, 14, 12);
    // Cockpit Window
    ctx.fillStyle = "#00F0FF";
    ctx.fillRect(minerScreenX + 6, minerScreenY + 6, 8, 6);
    // Heavy Drill Head
    ctx.fillStyle = "#FFEC27";
    ctx.beginPath();
    ctx.moveTo(minerScreenX + 10, minerScreenY + 19);
    ctx.lineTo(minerScreenX + 4, minerScreenY + 14);
    ctx.lineTo(minerScreenX + 16, minerScreenY + 14);
    ctx.closePath();
    ctx.fill();
  }, [gameState]);

  const restartGame = () => {
    setGameState(createMinerGame(Date.now()));
  };

  const fuelPct = Math.max(0, Math.min(100, Math.round((gameState.fuel / gameState.maxFuel) * 100)));
  const hullPct = Math.max(0, Math.min(100, Math.round((gameState.hull / gameState.maxHull) * 100)));

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
            ⛏
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
      <div className="my-2.5 grid w-full grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/40 p-2 text-xs sm:grid-cols-5 sm:p-2.5">
        {/* Depth */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <ArrowDown className="size-4 text-primary" />
          <span>
            {t.depth}: <span className="font-bold text-primary">{gameState.y}m</span> / {MINER_WORLD_DEPTH}m
          </span>
        </div>

        {/* Cash */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Coins className="size-4 text-warning" />
          <span>
            {t.cash}: <span className="font-bold text-warning">${gameState.cash}</span>
          </span>
        </div>

        {/* Cargo */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Briefcase className="size-4 text-primary" />
          <span>
            {t.cargo}: {gameState.cargo.length} / {gameState.cargoCapacity}
          </span>
        </div>

        {/* Fuel Bar */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between pb-1 text-xs font-semibold">
            <span className="flex items-center gap-1 text-warning">
              <Fuel className="size-3 text-warning" />
              {t.fuel}
            </span>
            <span className="text-muted-foreground">{Math.round(gameState.fuel)}L</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ "--fuel-pct": `${fuelPct}%` } as React.CSSProperties}
              className={`h-full w-(--fuel-pct) transition-all duration-200 ${
                fuelPct > 40 ? "bg-warning" : "bg-destructive"
              }`}
            />
          </div>
        </div>

        {/* Hull Bar */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between pb-1 text-xs font-semibold">
            <span className="flex items-center gap-1 text-destructive">
              <Shield className="size-3 text-destructive" />
              {t.hull}
            </span>
            <span className="text-muted-foreground">{gameState.hull}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ "--hull-pct": `${hullPct}%` } as React.CSSProperties}
              className={`h-full w-(--hull-pct) transition-all duration-200 ${
                hullPct > 50 ? "bg-success" : hullPct > 25 ? "bg-warning" : "bg-destructive"
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

        {/* Overlays: Victory / Game Over */}
        {(gameState.status === "victory" || gameState.status === "gameover") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-4 text-center backdrop-blur-xs">
            {gameState.status === "victory" ? (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-warning/20 text-3xl ring-2 ring-warning">
                  💎
                </div>
                <h2 className="text-xl font-extrabold text-warning sm:text-2xl">{t.victoryTitle}</h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">{t.victoryDesc}</p>
                <div className="my-3 flex gap-4 text-xs font-mono text-foreground">
                  <div>
                    {t.cash}: <span className="font-bold text-warning">${gameState.cash}</span>
                  </div>
                  <div>
                    {t.depth}: <span className="font-bold text-primary">{gameState.depthMax}m</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/20 text-3xl ring-2 ring-destructive">
                  💥
                </div>
                <h2 className="text-xl font-extrabold text-destructive sm:text-2xl">{t.gameOverTitle}</h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">{t.gameOverDesc}</p>
                <div className="my-3 flex gap-4 text-xs font-mono text-foreground">
                  <div>
                    {t.cash}: <span className="font-bold text-warning">${gameState.cash}</span>
                  </div>
                  <div>
                    {t.depth}: <span className="font-bold text-primary">{gameState.depthMax}m</span>
                  </div>
                </div>
              </div>
            )}

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

      {/* Surface / Underground Status Notification */}
      <div className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-2 font-mono text-xs">
        <span className="text-foreground">{gameState.message}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{t.hint}</span>
      </div>

      {/* Surface Upgrades Workshop */}
      <div className="mt-2.5 flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1">
            <Pickaxe className="size-3.5 text-primary" />
            {t.upgrades}
          </span>
          <span className="text-xs text-muted-foreground">
            {gameState.y <= SURFACE_Y ? t.surfaceTown : t.deepWarning}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {/* Drill */}
          <button
            type="button"
            disabled={
              gameState.cash < getUpgradeCost("drill", gameState.upgrades.drill) ||
              gameState.upgrades.drill >= getMaxUpgradeLevel("drill")
            }
            onClick={() => handleAction({ type: "upgrade", upgradeType: "drill" })}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2 text-xs transition hover:border-primary hover:bg-muted disabled:opacity-40"
          >
            <span className="font-bold text-primary">
              {t.drill} Lv.{gameState.upgrades.drill}
            </span>
            <span className="text-muted-foreground font-mono">
              {gameState.upgrades.drill >= getMaxUpgradeLevel("drill")
                ? t.maxLevel
                : `$${getUpgradeCost("drill", gameState.upgrades.drill)}`}
            </span>
          </button>

          {/* Fuel Tank */}
          <button
            type="button"
            disabled={
              gameState.cash < getUpgradeCost("fuel", gameState.upgrades.fuel) ||
              gameState.upgrades.fuel >= getMaxUpgradeLevel("fuel")
            }
            onClick={() => handleAction({ type: "upgrade", upgradeType: "fuel" })}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2 text-xs transition hover:border-primary hover:bg-muted disabled:opacity-40"
          >
            <span className="font-bold text-warning">
              {t.fuel} Lv.{gameState.upgrades.fuel}
            </span>
            <span className="text-muted-foreground font-mono">
              {gameState.upgrades.fuel >= getMaxUpgradeLevel("fuel")
                ? t.maxLevel
                : `$${getUpgradeCost("fuel", gameState.upgrades.fuel)}`}
            </span>
          </button>

          {/* Cargo */}
          <button
            type="button"
            disabled={
              gameState.cash < getUpgradeCost("cargo", gameState.upgrades.cargo) ||
              gameState.upgrades.cargo >= getMaxUpgradeLevel("cargo")
            }
            onClick={() => handleAction({ type: "upgrade", upgradeType: "cargo" })}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2 text-xs transition hover:border-primary hover:bg-muted disabled:opacity-40"
          >
            <span className="font-bold text-primary">
              {t.cargo} Lv.{gameState.upgrades.cargo}
            </span>
            <span className="text-muted-foreground font-mono">
              {gameState.upgrades.cargo >= getMaxUpgradeLevel("cargo")
                ? t.maxLevel
                : `$${getUpgradeCost("cargo", gameState.upgrades.cargo)}`}
            </span>
          </button>

          {/* Hull */}
          <button
            type="button"
            disabled={
              gameState.cash < getUpgradeCost("hull", gameState.upgrades.hull) ||
              gameState.upgrades.hull >= getMaxUpgradeLevel("hull")
            }
            onClick={() => handleAction({ type: "upgrade", upgradeType: "hull" })}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2 text-xs transition hover:border-primary hover:bg-muted disabled:opacity-40"
          >
            <span className="font-bold text-destructive">
              {t.hull} Lv.{gameState.upgrades.hull}
            </span>
            <span className="text-muted-foreground font-mono">
              {gameState.upgrades.hull >= getMaxUpgradeLevel("hull")
                ? t.maxLevel
                : `$${getUpgradeCost("hull", gameState.upgrades.hull)}`}
            </span>
          </button>

          {/* Radar */}
          <button
            type="button"
            disabled={
              gameState.cash < getUpgradeCost("radar", gameState.upgrades.radar) ||
              gameState.upgrades.radar >= getMaxUpgradeLevel("radar")
            }
            onClick={() => handleAction({ type: "upgrade", upgradeType: "radar" })}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2 text-xs transition hover:border-primary hover:bg-muted disabled:opacity-40"
          >
            <span className="flex items-center gap-1 font-bold text-primary">
              <Radio className="size-3" />
              {t.radar} Lv.{gameState.upgrades.radar}
            </span>
            <span className="text-muted-foreground font-mono">
              {gameState.upgrades.radar >= getMaxUpgradeLevel("radar")
                ? t.maxLevel
                : `$${getUpgradeCost("radar", gameState.upgrades.radar)}`}
            </span>
          </button>
        </div>
      </div>

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
          <div className="flex size-11 items-center justify-center text-xs font-mono text-muted-foreground">
            <Sparkles className="size-4 text-warning" />
          </div>
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
