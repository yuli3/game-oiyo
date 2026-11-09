import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Shield,
  Zap,
  Swords,
  Heart,
  Coins,
  Compass,
} from "lucide-react";
import {
  createDungeonGame,
  stepDungeonTurn,
  DUNGEON_WIDTH,
  DUNGEON_HEIGHT,
  MAX_DEPTH,
  TileType,
  getTileIndex,
  type DungeonState,
  type Direction,
  type Item,
} from "../../lib/games/dot-dungeon-rogue";
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
    title: "도트 던전 로그",
    sub: "5층에 잠든 고대 드래곤의 아뮬렛을 찾아 탈출하세요",
    depth: "지하",
    floor: "층",
    hp: "생명력",
    atk: "공격력",
    def: "방어력",
    level: "레벨",
    gold: "골드",
    turn: "턴",
    score: "점수",
    inventory: "인벤토리",
    emptyInventory: "가방이 비어있습니다",
    wait: "대기",
    victoryTitle: "★ 던전 정복 완료! ★",
    victoryDesc: "고대 드래곤을 물리치고 아뮬렛을 회수하여 지상으로 귀환했습니다!",
    gameOverTitle: "던전에서 쓰러졌습니다...",
    gameOverDesc: "던전의 어둠 속에서 숨을 거두었습니다. 다음 용사의 도전을 기다립니다.",
    playAgain: "다시 시작",
    keyboardHint: "이동: 방향키 / WASD | 대기: Space 또는 . | 아이템: 클릭 또는 숫자키 1~8",
  },
  en: {
    title: "Dot Dungeon Rogue",
    sub: "Descend to Depth 5, defeat the Ancient Dragon, and claim the Amulet",
    depth: "Depth",
    floor: "F",
    hp: "HP",
    atk: "ATK",
    def: "DEF",
    level: "Lv",
    gold: "Gold",
    turn: "Turn",
    score: "Score",
    inventory: "Inventory",
    emptyInventory: "Inventory is empty",
    wait: "Wait",
    victoryTitle: "★ DUNGEON CONQUERED! ★",
    victoryDesc: "You defeated the Ancient Dragon, secured the Amulet, and ascended victorious!",
    gameOverTitle: "You have perished in the dungeon...",
    gameOverDesc: "Your journey ends in darkness. The dungeon awaits the next brave soul.",
    playAgain: "Play Again",
    keyboardHint: "Move: Arrow Keys / WASD | Wait: Space or . | Use Item: Click or Keys 1-8",
  },
  ja: {
    title: "ドットダンジョンローグ",
    sub: "地下5階の古代ドラゴンを倒し、秘宝のアミュレットを持ち帰れ",
    depth: "地下",
    floor: "階",
    hp: "HP",
    atk: "攻撃",
    def: "防御",
    level: "Lv",
    gold: "ゴールド",
    turn: "ターン",
    score: "スコア",
    inventory: "所持品",
    emptyInventory: "持ち物はありません",
    wait: "待機",
    victoryTitle: "★ ダンジョン制覇！ ★",
    victoryDesc: "古代ドラゴンを撃破し、アミュレットを持ち帰りました！",
    gameOverTitle: "力尽きて倒れました...",
    gameOverDesc: "暗闇の中で冒険は終わりを告げました。次の挑戦者を待っています。",
    playAgain: "もう一度挑戦",
    keyboardHint: "移動: 矢印キー / WASD | 待機: Space または . | アイテム使用: クリックまたは1〜8",
  },
  zh: {
    title: "点点地牢肉鸽",
    sub: "深入地下5层，击败远古巨龙并带回秘宝护身符",
    depth: "地牢深处",
    floor: "层",
    hp: "生命",
    atk: "攻击",
    def: "防御",
    level: "等级",
    gold: "金币",
    turn: "回合",
    score: "得分",
    inventory: "背包",
    emptyInventory: "背包为空",
    wait: "等待",
    victoryTitle: "★ 成功征服地牢！ ★",
    victoryDesc: "你击败了远古巨龙，带回了秘宝护身符，凯旋归来！",
    gameOverTitle: "你在地牢中陨落了...",
    gameOverDesc: "你的冒险终结于黑暗之中。地牢正在等待下一位勇者。",
    playAgain: "再次挑战",
    keyboardHint: "移动: 方向键 / WASD | 等待: 空格或 . | 物品: 点击或按键 1-8",
  },
  fr: {
    title: "Dot Dungeon Rogue",
    sub: "Descendez au niveau 5, vainquez le Dragon Ancien et rapportez l'Amulette",
    depth: "Profondeur",
    floor: "Étage",
    hp: "PV",
    atk: "ATQ",
    def: "DEF",
    level: "Niv",
    gold: "Or",
    turn: "Tour",
    score: "Score",
    inventory: "Inventaire",
    emptyInventory: "Inventaire vide",
    wait: "Attendre",
    victoryTitle: "★ DONJON CONQUIS ! ★",
    victoryDesc: "Vous avez terrassé le Dragon Ancien et rapporté l'Amulette victorieusement !",
    gameOverTitle: "Vous avez péri dans le donjon...",
    gameOverDesc: "Votre voyage s'achève dans les ténèbres. Le donjon attend le prochain héros.",
    playAgain: "Rejouer",
    keyboardHint: "Déplacement : Flèches / WASD | Attendre : Espace ou . | Objet : Clic ou 1-8",
  },
  es: {
    title: "Dot Dungeon Rogue",
    sub: "Desciende al nivel 5, derrota al Dragón Antiguo y recupera el Amuleto",
    depth: "Nivel",
    floor: "Piso",
    hp: "PS",
    atk: "ATQ",
    def: "DEF",
    level: "Nivel",
    gold: "Oro",
    turn: "Turno",
    score: "Puntuación",
    inventory: "Inventario",
    emptyInventory: "Inventario vacío",
    wait: "Esperar",
    victoryTitle: "★ ¡MAZMORRA CONQUISTADA! ★",
    victoryDesc: "¡Derrotaste al Dragón Antiguo y escapaste con el Amuleto!",
    gameOverTitle: "Has perecido en la mazmorra...",
    gameOverDesc: "Tu viaje termina en la oscuridad. La mazmorra espera al próximo valiente.",
    playAgain: "Jugar de nuevo",
    keyboardHint: "Mover: Flechas / WASD | Esperar: Espacio o . | Usar: Clic o 1-8",
  },
};

const TILE_SIZE = 16;
const CANVAS_WIDTH = DUNGEON_WIDTH * TILE_SIZE; // 640
const CANVAS_HEIGHT = DUNGEON_HEIGHT * TILE_SIZE; // 384

export default function DotDungeonRogue({ locale = "en" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<DungeonState>(() => createDungeonGame(Date.now()));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("dot_dungeon_sound") !== "false";
      }
    } catch {}
    return true;
  });

  const { isImmersive, containerRef, togglePortal } = useArcadePortal({
    locale: (locale as any) || "en",
  });
  const { shakeCssVars, addTrauma } = useGameJuicePro();

  // BGM control
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (soundEnabled && gameState.status === "playing") {
      bgm.playTheme("retro-dungeon");
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
        window.localStorage.setItem("dot_dungeon_sound", String(soundEnabled));
      }
    } catch {}
  }, [soundEnabled]);

  // Arcade Pass Daily Mission tracking
  useEffect(() => {
    const val = Math.max(gameState.player.depth, gameState.player.gold);
    if (val <= 1) return;
    const today = todayKey();
    const current = loadArcadePassProgress(today);
    const updated = reportMissionProgress(current, "dot-dungeon-rogue", val);
    if (updated.xp !== current.xp || updated.completedMissionIds.length !== current.completedMissionIds.length) {
      saveArcadePassProgress(updated);
    }
  }, [gameState.player.depth, gameState.player.gold]);

  const handleAction = useCallback(
    (action: { type: "move"; dir: Direction } | { type: "use_item"; itemIndex: number }) => {
      setGameState((prev) => {
        if (prev.status !== "playing") return prev;

        const result = stepDungeonTurn(prev, action);
        const { events, state: next } = result;

        // Sound & Juice feedback
        if (soundEnabled) {
          const audioCtx = getSharedAudioContext();
          if (events.victory) {
            RetroChiptuneSynth.playPowerup(audioCtx);
            setTimeout(() => RetroChiptuneSynth.playCoin(getSharedAudioContext()), 160);
          } else if (events.gameover) {
            RetroChiptuneSynth.playGameOver(audioCtx);
          } else if (events.descended) {
            RetroChiptuneSynth.playJump(audioCtx);
          } else if (events.hitPlayer) {
            RetroChiptuneSynth.playHit(audioCtx);
          } else if (events.attacked) {
            RetroChiptuneSynth.playLaser(audioCtx);
          } else if (events.pickedItem) {
            RetroChiptuneSynth.playCoin(audioCtx);
          } else if (events.moved) {
            RetroChiptuneSynth.playBlip(audioCtx, 200);
          }
        }

        if (events.gameover) {
          addTrauma(0.75);
        } else if (events.hitPlayer) {
          addTrauma(0.35);
        } else if (events.descended) {
          addTrauma(0.25);
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
      } else if (e.key === " " || e.key === ".") {
        e.preventDefault();
        handleAction({ type: "move", dir: "wait" });
      } else if (e.key >= "1" && e.key <= "8") {
        const itemIdx = parseInt(e.key, 10) - 1;
        handleAction({ type: "use_item", itemIndex: itemIdx });
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

    // Clear background
    ctx.fillStyle = "#0B0813";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const { tiles, visible, explored, player, monsters, items } = gameState;

    // 1. Draw tiles
    for (let y = 0; y < DUNGEON_HEIGHT; y++) {
      for (let x = 0; x < DUNGEON_WIDTH; x++) {
        const idx = getTileIndex(x, y);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        const isVis = visible[idx];
        const isExp = explored[idx];

        if (!isExp) {
          // Unexplored fog of war
          ctx.fillStyle = "#050408";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          continue;
        }

        const tile = tiles[idx];

        if (tile === TileType.Wall) {
          ctx.fillStyle = isVis ? "#1D2B53" : "#11172E";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Wall brick texture
          ctx.fillStyle = isVis ? "#5F574F" : "#22202E";
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, 1);
          ctx.fillRect(px + 1, py + 8, TILE_SIZE - 2, 1);
        } else if (tile === TileType.Floor) {
          ctx.fillStyle = isVis ? "#1c182b" : "#0f0d17";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Floor stone dot
          if (isVis && (x + y) % 3 === 0) {
            ctx.fillStyle = "#2a243d";
            ctx.fillRect(px + 7, py + 7, 2, 2);
          }
        } else if (tile === TileType.StairsDown) {
          ctx.fillStyle = isVis ? "#1c182b" : "#0f0d17";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          ctx.fillStyle = isVis ? "#29ADFF" : "#155885";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(">", px + 8, py + 8);
        }
      }
    }

    // 2. Draw Items (only if tile is visible)
    for (const item of items) {
      const idx = getTileIndex(item.x, item.y);
      if (visible[idx]) {
        const px = item.x * TILE_SIZE;
        const py = item.y * TILE_SIZE;

        ctx.fillStyle = item.color;
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.symbol, px + 8, py + 8);
      }
    }

    // 3. Draw Monsters (only if in visible range)
    for (const monster of monsters) {
      const idx = getTileIndex(monster.x, monster.y);
      if (visible[idx]) {
        const px = monster.x * TILE_SIZE;
        const py = monster.y * TILE_SIZE;

        // Monster base symbol
        ctx.fillStyle = monster.color;
        ctx.font = monster.type === "dragon" ? "bold 15px monospace" : "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(monster.symbol, px + 8, py + 8);

        // Monster HP bar if damaged
        if (monster.hp < monster.maxHp) {
          const barW = 12;
          const barH = 2;
          const pct = Math.max(0, monster.hp / monster.maxHp);
          ctx.fillStyle = "#000000";
          ctx.fillRect(px + 2, py + 1, barW, barH);
          ctx.fillStyle = "#FF004D";
          ctx.fillRect(px + 2, py + 1, Math.round(barW * pct), barH);
        }
      }
    }

    // 4. Draw Player
    const playerPx = player.x * TILE_SIZE;
    const playerPy = player.y * TILE_SIZE;

    // Glowing aura behind player
    ctx.fillStyle = "rgba(41, 173, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(playerPx + 8, playerPy + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Player Knight Symbol
    ctx.fillStyle = "#FFF1E8";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("@", playerPx + 8, playerPy + 8);
  }, [gameState]);

  const restartGame = () => {
    setGameState(createDungeonGame(Date.now()));
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((gameState.player.hp / gameState.player.maxHp) * 100)));
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
            @
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
      <div className="my-2.5 grid w-full grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/40 p-2 text-xs sm:grid-cols-6 sm:p-2.5">
        {/* Depth */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Compass className="size-4 text-primary" />
          <span>
            {t.depth} {gameState.player.depth} / {MAX_DEPTH}
          </span>
        </div>

        {/* Level */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="size-4 text-warning" />
          <span>
            {t.level} {gameState.player.level}
          </span>
        </div>

        {/* ATK / DEF */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Swords className="size-4 text-destructive" />
          <span>
            {t.atk} {gameState.player.atk} | <Shield className="inline size-3.5 text-primary" /> {gameState.player.def}
          </span>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Coins className="size-4 text-warning" />
          <span>
            {gameState.player.gold} {t.gold}
          </span>
        </div>

        {/* HP Bar */}
        <div className="col-span-2 flex flex-col justify-center sm:col-span-2">
          <div className="flex justify-between pb-1 text-xs font-semibold">
            <span className="flex items-center gap-1 text-destructive">
              <Heart className="size-3 fill-current" />
              {t.hp}
            </span>
            <span className="text-muted-foreground">
              {gameState.player.hp} / {gameState.player.maxHp}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ "--hp-pct": `${hpPercent}%` } as React.CSSProperties}
              className={`h-full w-(--hp-pct) transition-all duration-200 ${
                hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-warning" : "bg-destructive"
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
        {gameState.status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-4 text-center backdrop-blur-xs">
            {gameState.status === "victory" ? (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-warning/20 text-3xl ring-2 ring-warning">
                  🏆
                </div>
                <h2 className="text-xl font-extrabold text-warning sm:text-2xl">{t.victoryTitle}</h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">{t.victoryDesc}</p>
                <div className="my-3 flex gap-4 text-xs font-mono text-foreground">
                  <div>
                    {t.score}: <span className="font-bold text-warning">{gameState.score}</span>
                  </div>
                  <div>
                    {t.turn}: <span className="font-bold text-primary">{gameState.turn}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/20 text-3xl ring-2 ring-destructive">
                  💀
                </div>
                <h2 className="text-xl font-extrabold text-destructive sm:text-2xl">{t.gameOverTitle}</h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">{t.gameOverDesc}</p>
                <div className="my-3 flex gap-4 text-xs font-mono text-foreground">
                  <div>
                    {t.score}: <span className="font-bold text-warning">{gameState.score}</span>
                  </div>
                  <div>
                    {t.turn}: <span className="font-bold text-primary">{gameState.turn}</span>
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

      {/* Recent Event Logs */}
      <div className="mt-2.5 flex w-full flex-col gap-1 rounded-lg border border-border/80 bg-muted/30 p-2 font-mono text-xs">
        {gameState.logs.slice(0, 3).map((log) => (
          <div
            key={log.id}
            className={`flex items-start gap-1.5 ${
              log.tone === "combat"
                ? "text-destructive"
                : log.tone === "pickup"
                ? "text-warning"
                : log.tone === "victory"
                ? "text-success"
                : log.tone === "warning"
                ? "text-warning"
                : "text-muted-foreground"
            }`}
          >
            <span className="opacity-60">[{log.turn}]</span>
            <span>{log.text}</span>
          </div>
        ))}
      </div>

      {/* Inventory & Quick Actions */}
      <div className="mt-2.5 flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1">
            <Zap className="size-3.5 text-primary" />
            {t.inventory} ({gameState.player.inventory.length}/8)
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">{t.keyboardHint}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {gameState.player.inventory.length === 0 ? (
            <div className="w-full rounded-md border border-dashed border-border p-2 text-center text-xs text-muted-foreground">
              {t.emptyInventory}
            </div>
          ) : (
            gameState.player.inventory.map((item: Item, idx: number) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAction({ type: "use_item", itemIndex: idx })}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:border-primary hover:bg-muted"
              >
                <span className="font-mono font-bold text-primary">
                  {item.symbol}
                </span>
                <span>{item.name}</span>
                <span className="ml-1 rounded bg-muted px-1 text-xs text-muted-foreground font-mono">
                  {idx + 1}
                </span>
              </button>
            ))
          )}
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
          <button
            type="button"
            onClick={() => handleAction({ type: "move", dir: "wait" })}
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-card active:bg-muted text-xs font-bold text-primary shadow-xs"
          >
            {t.wait}
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
