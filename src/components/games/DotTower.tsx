import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shield,
  Coins,
  Play,
  FastForward,
  Sparkles,
  Zap,
  Crosshair,
  ArrowUpCircle,
  Trash2,
  Award,
  Skull,
} from "lucide-react";
import {
  createTowerGame,
  placeTower,
  upgradeTower,
  sellTower,
  startWave,
  stepTowerGame,
  isCellOnPath,
  GRID_COLS,
  GRID_ROWS,
  PATH_WAYPOINTS,
  TOWER_DEFINITIONS,
  TowerRng,
  type TowerDefenseState,
  type TowerType,
  type TowerInstance,
} from "../../lib/games/dot-tower";
import {
  RetroChiptuneSynth,
  getRetroChiptuneBgm,
  getSharedAudioContext,
  useGameJuicePro,
} from "../../lib/games/engine-suite-unified";
import { useArcadePortal } from "../../lib/games/arcade-portal";

const COPY = {
  ko: {
    title: "도트 타워",
    sub: "픽셀 전장에 4종의 방어탑을 배치하고 15웨이브 그림자 군단을 막아내세요",
    wave: "웨이브",
    life: "성문 내구도",
    gold: "골드",
    kills: "격퇴 수",
    startWave: "웨이브 시작",
    speed: "배속",
    upgrade: "타워 강화",
    sell: "타워 판매",
    selectEmpty: "빈 지형을 클릭하여 새 타워를 건설하세요.",
    towers: {
      archer: "궁수 타워",
      cannon: "대포 타워",
      frost: "서리 타워",
      tesla: "테슬라 타워",
    },
    gameOverTitle: "성문 함락 (Defeat)",
    gameOverDesc: "그림자 군단에 의해 성벽이 무너졌습니다. 방어선 재배치가 필요합니다.",
    victoryTitle: "★ 왕국 수호 대승리! (Victory) ★",
    victoryDesc: "15웨이브 전설의 그림자 드래곤을 섬멸하고 왕국을 완벽히 수호했습니다!",
    playAgain: "새로운 방어 시작",
    hint: "조작: 지형 클릭하여 타워 건설 | 배치된 타워 클릭 시 강화/판매 가능 | 1-4 단축키",
  },
  en: {
    title: "Dot Tower",
    sub: "Deploy 4 strategic towers and defend against 15 waves of the shadow legion",
    wave: "Wave",
    life: "Castle Life",
    gold: "Gold",
    kills: "Defeated",
    startWave: "Start Wave",
    speed: "Speed",
    upgrade: "Upgrade",
    sell: "Sell",
    selectEmpty: "Click an empty cell to construct a new defense tower.",
    towers: {
      archer: "Archer Tower",
      cannon: "Cannon Tower",
      frost: "Frost Tower",
      tesla: "Tesla Tower",
    },
    gameOverTitle: "Castle Breached",
    gameOverDesc: "The shadow monsters broke through the castle gates. Rearrange your defenses!",
    victoryTitle: "★ KINGDOM DEFENDED! ★",
    victoryDesc: "Defeated the Wave 15 Shadow Dragon Boss and protected the kingdom!",
    playAgain: "Play Again",
    hint: "Click cell to build | Click tower to upgrade/sell | Hotkeys 1-4 to select tower",
  },
  ja: {
    title: "ドットタワー",
    sub: "4種の防衛塔を配置し、15ウェ이브の影の軍勢から王国を守り抜こう",
    wave: "ウェーブ",
    life: "城門耐久",
    gold: "ゴールド",
    kills: "撃破数",
    startWave: "ウェーブ開始",
    speed: "倍速",
    upgrade: "タワー強化",
    sell: "売却",
    selectEmpty: "空き地をクリックして新しい防衛塔を建設してください。",
    towers: {
      archer: "弓兵の塔",
      cannon: "大砲の塔",
      frost: "氷結の塔",
      tesla: "雷電の塔",
    },
    gameOverTitle: "城門陥落",
    gameOverDesc: "影の軍勢に防衛線を突破されました。布陣を再構築してください。",
    victoryTitle: "★ 王国防衛の大勝利！ ★",
    victoryDesc: "第15ウェーブのシャドウドラゴンを討伐し、王国を守り抜きました！",
    playAgain: "再挑戦",
    hint: "クリックで建設・強化・売却 | 1〜4キーでタワー種別選択",
  },
  zh: {
    title: "点点塔防",
    sub: "部署4大经典防御塔，抵御15波暗影军团的猛烈侵袭",
    wave: "波次",
    life: "城堡生命",
    gold: "金币",
    kills: "击退数",
    startWave: "开始波次",
    speed: "倍速",
    upgrade: "升级防御塔",
    sell: "出售",
    selectEmpty: "点击空地可建造新的防御塔。",
    towers: {
      archer: "弓手箭塔",
      cannon: "重炮塔",
      frost: "寒冰塔",
      tesla: "特斯拉塔",
    },
    gameOverTitle: "城门失守",
    gameOverDesc: "暗影军团突破了防御阵线，请调整防御布局后重试。",
    victoryTitle: "★ 王国守卫大捷！ ★",
    victoryDesc: "成功击溃第15波暗影巨龙领主，彻底保卫了王国！",
    playAgain: "重开对局",
    hint: "点击空地建造 | 点击塔可升级或出售 | 1-4快捷键选择塔",
  },
  fr: {
    title: "Dot Tower",
    sub: "Déployez 4 tours et repoussez 15 vagues d'ennemis",
    wave: "Vague",
    life: "Vies",
    gold: "Or",
    kills: "Éliminés",
    startWave: "Lancer",
    speed: "Vitesse",
    upgrade: "Améliorer",
    sell: "Vendre",
    selectEmpty: "Cliquez sur une case vide pour construire.",
    towers: {
      archer: "Archer",
      cannon: "Canon",
      frost: "Givre",
      tesla: "Tesla",
    },
    gameOverTitle: "Château détruit",
    gameOverDesc: "Les monstres ont franchi vos défenses !",
    victoryTitle: "★ VICTOIRE ROYALE ! ★",
    victoryDesc: "Vous avez vaincu le Dragon Sombre de la vague 15 !",
    playAgain: "Rejouer",
    hint: "Cliquez pour construire/améliorer/vendre. Touches 1-4.",
  },
  es: {
    title: "Dot Tower",
    sub: "Construye 4 torres y defiende el reino contra 15 oleadas",
    wave: "Oleada",
    life: "Vidas",
    gold: "Oro",
    kills: "Bajas",
    startWave: "Iniciar",
    speed: "Velocidad",
    upgrade: "Mejorar",
    sell: "Vender",
    selectEmpty: "Haz clic en una casilla vacía para construir.",
    towers: {
      archer: "Arquero",
      cannon: "Cañón",
      frost: "Escarcha",
      tesla: "Tesla",
    },
    gameOverTitle: "Castillo caído",
    gameOverDesc: "¡Los monstruos atravesaron tus defensas!",
    victoryTitle: "★ ¡VICTORIA TOTAL! ★",
    victoryDesc: "¡Derrotaste al Dragón Sombrío en la oleada 15!",
    playAgain: "Jugar de nuevo",
    hint: "Haz clic para construir/mejorar/vender. Teclas 1-4.",
  },
};

const CELL_SIZE = 30;
const CANVAS_WIDTH = GRID_COLS * CELL_SIZE; // 480
const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE; // 300

export default function DotTower({ locale = "en" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<TowerDefenseState>(() => createTowerGame(Date.now()));
  const [selectedBuildType, setSelectedBuildType] = useState<TowerType>("archer");

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("dot_tower_sound") !== "false";
      }
    } catch {}
    return true;
  });

  const { isImmersive, containerRef, togglePortal } = useArcadePortal({
    locale: (locale as any) || "en",
  });
  const { shakeCssVars, addTrauma } = useGameJuicePro();

  const rngRef = useRef<TowerRng>(new TowerRng(Date.now()));

  // Sound effects
  const playSound = useCallback(
    (type: "build" | "upgrade" | "sell" | "shoot" | "boom" | "coin" | "leak" | "wave" | "victory") => {
      if (!soundEnabled) return;
      try {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        switch (type) {
          case "build":
            RetroChiptuneSynth.playCoin(ctx);
            break;
          case "upgrade":
            RetroChiptuneSynth.playPowerup(ctx);
            break;
          case "sell":
            RetroChiptuneSynth.playBlip(ctx, 350);
            break;
          case "shoot":
            RetroChiptuneSynth.playLaser(ctx);
            break;
          case "boom":
            RetroChiptuneSynth.playHit(ctx);
            break;
          case "coin":
            RetroChiptuneSynth.playBlip(ctx, 520);
            break;
          case "leak":
            RetroChiptuneSynth.playExplosion(ctx);
            break;
          case "wave":
            RetroChiptuneSynth.playJump(ctx);
            break;
          case "victory":
            RetroChiptuneSynth.playPowerup(ctx);
            break;
        }
      } catch {}
    },
    [soundEnabled]
  );

  // Background music
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (soundEnabled && gameState.status === "wave_running") {
      bgm.playTheme("retro-mining");
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [soundEnabled, gameState.status]);

  // Main game tick RAF loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      setGameState((prev) => {
        if (prev.status !== "wave_running") return prev;

        const prevCastleHp = prev.castleHp;
        const prevEnemiesCount = prev.enemies.length;
        const next = stepTowerGame(prev, dt, rngRef.current);

        if (next.castleHp < prevCastleHp) {
          playSound("leak");
          addTrauma(0.5);
        } else if (next.enemies.length < prevEnemiesCount) {
          playSound("coin");
        }

        if (next.status === "wave_cleared") {
          playSound("wave");
          addTrauma(0.2);
        } else if (next.status === "victory") {
          playSound("victory");
          addTrauma(0.6);
        } else if (next.status === "game_over") {
          playSound("leak");
          addTrauma(0.8);
        }

        return next;
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [playSound, addTrauma]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") setSelectedBuildType("archer");
      else if (e.key === "2") setSelectedBuildType("cannon");
      else if (e.key === "3") setSelectedBuildType("frost");
      else if (e.key === "4") setSelectedBuildType("tesla");
      else if (e.code === "Space") {
        e.preventDefault();
        setGameState((prev) => {
          if (prev.status === "idle" || prev.status === "wave_cleared") {
            playSound("wave");
            return startWave(prev);
          }
          return prev;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playSound]);

  // Canvas 2D render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // 1. Grass Battlefield Background
    ctx.fillStyle = "#1e293b"; // Dark tactical grass
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
      ctx.stroke();
    }

    // 2. Pathway Waypoints (Dirt Track)
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = CELL_SIZE * 0.85;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x * CELL_SIZE + CELL_SIZE / 2, PATH_WAYPOINTS[0].y * CELL_SIZE + CELL_SIZE / 2);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x * CELL_SIZE + CELL_SIZE / 2, PATH_WAYPOINTS[i].y * CELL_SIZE + CELL_SIZE / 2);
    }
    ctx.stroke();

    // Pathway Center Line
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x * CELL_SIZE + CELL_SIZE / 2, PATH_WAYPOINTS[0].y * CELL_SIZE + CELL_SIZE / 2);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x * CELL_SIZE + CELL_SIZE / 2, PATH_WAYPOINTS[i].y * CELL_SIZE + CELL_SIZE / 2);
    }
    ctx.stroke();

    // 3. Castle Gate (Right side waypoint)
    const castlePoint = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
    const cX = castlePoint.x * CELL_SIZE;
    const cY = castlePoint.y * CELL_SIZE;

    ctx.fillStyle = "#64748b";
    ctx.fillRect(cX, cY - 10, CELL_SIZE, CELL_SIZE + 20);
    ctx.fillStyle = "#3b82f6"; // Castle flag
    ctx.fillRect(cX + 12, cY - 18, 12, 8);
    ctx.fillStyle = "#94a3b8"; // Castle battlements
    ctx.fillRect(cX + 2, cY - 14, 6, 4);
    ctx.fillRect(cX + 18, cY - 14, 6, 4);

    // 4. Selected Cell / Tower Range Circle
    if (gameState.selectedCell) {
      const sX = gameState.selectedCell.x * CELL_SIZE;
      const sY = gameState.selectedCell.y * CELL_SIZE;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(sX + 1, sY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      const placed = gameState.towers.find(
        (t) => t.x === gameState.selectedCell?.x && t.y === gameState.selectedCell?.y
      );
      if (placed) {
        const def = TOWER_DEFINITIONS[placed.type];
        const range = def.baseRange * (placed.level === 1 ? 1.0 : placed.level === 2 ? 1.25 : 1.55) * CELL_SIZE;
        ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sX + CELL_SIZE / 2, sY + CELL_SIZE / 2, range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 5. Placed Towers
    for (const tower of gameState.towers) {
      const tX = tower.x * CELL_SIZE;
      const tY = tower.y * CELL_SIZE;
      const def = TOWER_DEFINITIONS[tower.type];

      // Base
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(tX + 3, tY + 3, CELL_SIZE - 6, CELL_SIZE - 6);

      // Tower Pedestal
      ctx.fillStyle = def.color;
      ctx.fillRect(tX + 6, tY + 6, CELL_SIZE - 12, CELL_SIZE - 12);

      // Level stars / pips
      ctx.fillStyle = "#ffffff";
      for (let lvl = 0; lvl < tower.level; lvl++) {
        ctx.fillRect(tX + 8 + lvl * 5, tY + 2, 3, 3);
      }

      // Tower specific icon / turret
      if (tower.type === "archer") {
        ctx.fillStyle = "#15803d";
        ctx.fillRect(tX + 12, tY + 8, 6, 14);
      } else if (tower.type === "cannon") {
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(tX + 15, tY + 15, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (tower.type === "frost") {
        ctx.fillStyle = "#e0f2fe";
        ctx.fillRect(tX + 11, tY + 11, 8, 8);
      } else if (tower.type === "tesla") {
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(tX + 13, tY + 9, 4, 12);
        ctx.fillRect(tX + 9, tY + 13, 12, 4);
      }
    }

    // 6. Projectiles
    for (const proj of gameState.projectiles) {
      const pX = (proj.startX + (proj.targetX - proj.startX) * proj.progress) * CELL_SIZE;
      const pY = (proj.startY + (proj.targetY - proj.startY) * proj.progress) * CELL_SIZE;

      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(pX, pY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Enemies
    for (const enemy of gameState.enemies) {
      const eX = enemy.x * CELL_SIZE + CELL_SIZE / 2;
      const eY = enemy.y * CELL_SIZE + CELL_SIZE / 2;

      // Slow aura
      if (enemy.slowTimer > 0) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        ctx.beginPath();
        ctx.arc(eX, eY, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemy Body
      const size = enemy.isBoss ? 16 : enemy.type === "golem" ? 11 : enemy.type === "brute" ? 9 : 7;
      const bodyColor =
        enemy.type === "scout"
          ? "#22c55e"
          : enemy.type === "brute"
          ? "#ea580c"
          : enemy.type === "ghost"
          ? "#a855f7"
          : enemy.type === "golem"
          ? "#64748b"
          : "#dc2626"; // Boss

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(eX, eY, size, 0, Math.PI * 2);
      ctx.fill();

      // Health bar above enemy
      const barW = size * 2.2;
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(eX - barW / 2, eY - size - 6, barW, 3);
      ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(eX - barW / 2, eY - size - 6, barW * hpPct, 3);
    }
  }, [gameState]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cellX = Math.floor(clickX / CELL_SIZE);
    const cellY = Math.floor(clickY / CELL_SIZE);

    if (cellX < 0 || cellX >= GRID_COLS || cellY < 0 || cellY >= GRID_ROWS) return;

    // Check if clicking existing tower
    const existing = gameState.towers.find((t) => t.x === cellX && t.y === cellY);
    if (existing) {
      setGameState((prev) => ({ ...prev, selectedCell: { x: cellX, y: cellY } }));
      return;
    }

    // Try building selected tower if not on path
    if (!isCellOnPath(cellX, cellY)) {
      const def = TOWER_DEFINITIONS[selectedBuildType];
      if (gameState.gold >= def.cost) {
        playSound("build");
        setGameState((prev) => placeTower(prev, cellX, cellY, selectedBuildType));
      } else {
        setGameState((prev) => ({ ...prev, selectedCell: { x: cellX, y: cellY } }));
      }
    } else {
      setGameState((prev) => ({ ...prev, selectedCell: null }));
    }
  };

  const selectedTower: TowerInstance | undefined = gameState.selectedCell
    ? gameState.towers.find(
        (t) => t.x === gameState.selectedCell?.x && t.y === gameState.selectedCell?.y
      )
    : undefined;

  const selectedDef = selectedTower ? TOWER_DEFINITIONS[selectedTower.type] : undefined;
  const upgradeCost = selectedDef && selectedTower ? Math.round(selectedDef.cost * (selectedTower.level === 1 ? 1.2 : 1.8)) : 0;

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
          <Crosshair className="size-5 text-primary animate-pulse" />
          <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">{t.title}</h2>
          <span className="hidden sm:inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground border border-border">
            {t.wave} {gameState.wave} / {gameState.maxWave}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-1 text-foreground border border-border">
            <Coins className="size-4 text-warning" />
            <span>{gameState.gold.toLocaleString()} G</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-1 text-foreground border border-border">
            <Shield className="size-4 text-primary" />
            <span>
              {gameState.castleHp} / {gameState.maxCastleHp}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-1 text-foreground border border-border">
            <Skull className="size-4 text-destructive" />
            <span>{gameState.totalKills}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setGameState((prev) => ({
                  ...prev,
                  speedMultiplier: prev.speedMultiplier === 1 ? 2 : 1,
                }));
              }}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-2 py-1 text-xs font-semibold text-foreground"
            >
              <FastForward className="size-3.5 text-primary" />
              <span>{gameState.speedMultiplier}x</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((v) => !v);
                try {
                  window.localStorage.setItem("dot_tower_sound", String(!soundEnabled));
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

      {/* Main Canvas Battlefield Viewport */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          className="w-full h-auto max-h-96 object-contain block mx-auto cursor-crosshair"
        />

        {/* Status Bubble in Bottom Center */}
        <div className="absolute bottom-2 left-2 right-2 rounded-md border border-border bg-card/85 px-3 py-1 text-center text-xs font-medium text-foreground backdrop-blur-xs">
          {gameState.logMessage}
        </div>
      </div>

      {/* Control Hotbars */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-xs mt-2">
        {/* Tower Build Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["archer", "cannon", "frost", "tesla"] as TowerType[]).map((type, idx) => {
            const def = TOWER_DEFINITIONS[type];
            const isSelected = selectedBuildType === type;
            const canAfford = gameState.gold >= def.cost;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedBuildType(type)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : canAfford
                    ? "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "border-border/50 bg-secondary/40 text-muted-foreground opacity-60"
                }`}
              >
                <span>{def.names.ko || def.names.en}</span>
                <span className="text-warning">({def.cost}G)</span>
                <span className="text-xs opacity-70">[{idx + 1}]</span>
              </button>
            );
          })}
        </div>

        {/* Wave Execution & Selected Tower Action Controls */}
        <div className="flex items-center gap-2">
          {selectedTower && selectedDef ? (
            <div className="flex items-center gap-1.5">
              {selectedTower.level < 3 ? (
                <button
                  type="button"
                  disabled={gameState.gold < upgradeCost}
                  onClick={() => {
                    playSound("upgrade");
                    setGameState((prev) => upgradeTower(prev, selectedTower.id));
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-primary disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs"
                >
                  <ArrowUpCircle className="size-3.5" />
                  <span>
                    Lv.{selectedTower.level + 1} ({upgradeCost}G)
                  </span>
                </button>
              ) : (
                <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold text-warning border border-border">
                  MAX
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  playSound("sell");
                  setGameState((prev) => sellTower(prev, selectedTower.id));
                }}
                className="flex items-center gap-1 rounded-lg border border-destructive/50 bg-destructive/10 hover:bg-destructive/20 text-destructive px-2.5 py-1.5 text-xs font-bold"
              >
                <Trash2 className="size-3.5" />
                <span>{t.sell}</span>
              </button>
            </div>
          ) : null}

          {gameState.status !== "wave_running" && gameState.status !== "game_over" && gameState.status !== "victory" && (
            <button
              type="button"
              onClick={() => {
                playSound("wave");
                setGameState((prev) => startWave(prev));
              }}
              className="flex items-center gap-2 rounded-lg border border-border bg-primary hover:bg-primary/90 px-5 py-2 text-xs sm:text-sm font-black text-primary-foreground shadow-md transition-all active:scale-95 animate-pulse"
            >
              <Play className="size-4 fill-current" />
              <span>{t.startWave}</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-muted-foreground">{t.hint}</div>

      {/* Game Over Modal */}
      {gameState.status === "game_over" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative flex max-w-md flex-col items-center rounded-2xl border border-destructive/50 bg-card p-6 text-center shadow-2xl space-y-4">
            <Skull className="size-16 text-destructive animate-bounce" />
            <h3 className="text-xl font-black text-destructive">{t.gameOverTitle}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.gameOverDesc}</p>
            <div className="flex items-center gap-4 text-xs font-bold text-foreground">
              <span>도달 웨이브: {gameState.wave} / 15</span>
              <span>총 격퇴: {gameState.totalKills}마리</span>
            </div>
            <button
              type="button"
              onClick={() => setGameState(createTowerGame(Date.now()))}
              className="flex items-center gap-2 rounded-xl border border-border bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <RotateCcw className="size-4" />
              {t.playAgain}
            </button>
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
              <span>남은 성벽 체력: {gameState.castleHp} HP</span>
              <span>보유 골드: {gameState.gold.toLocaleString()} G</span>
              <span>총 격퇴: {gameState.totalKills}</span>
            </div>
            <button
              type="button"
              onClick={() => setGameState(createTowerGame(Date.now()))}
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
