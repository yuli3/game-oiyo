/**
 * DotDungeonRogue — Turn-based retro pixel dungeon crawler engine.
 *
 * Implements classic roguelike systems following the Berlin Interpretation:
 * 1. Seeded deterministic PRNG (reproducible levels & replays).
 * 2. Procedural room-and-corridor BSP dungeon generation with guaranteed connectivity.
 * 3. Bresenham / Raycast Field of View (FOV) with persistent fog-of-war explored memory.
 * 4. Grid-based bump-to-attack combat with defense mitigation and critical hits.
 * 5. Depth-scaled monster AI (Slime, Goblin, Skeleton, Orc, Dragon Boss).
 * 6. Inventory & loot systems (Potions, Scrolls, Rings, Gold).
 * 7. 5-floor progression to find the Amulet of Yendor on Depth 5.
 */

// ─── 1. DETERMINISTIC PRNG ───────────────────────────────────────────────────

export class RogueRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x12345678;
  }

  /** Returns pseudo-random float in [0, 1) */
  next(): number {
    // Xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 4294967296;
  }

  /** Returns pseudo-random integer in [min, max] inclusive */
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  choice<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

// ─── 2. MAP & TILE TYPES ─────────────────────────────────────────────────────

export const DUNGEON_WIDTH = 40;
export const DUNGEON_HEIGHT = 24;
export const MAX_DEPTH = 5;

export const enum TileType {
  Wall = 0,
  Floor = 1,
  Door = 2,
  StairsDown = 3,
  StairsUp = 4,
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MonsterType = "slime" | "goblin" | "skeleton" | "orc" | "dragon";

export interface Monster {
  id: string;
  type: MonsterType;
  name: string;
  symbol: string;
  color: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xpReward: number;
}

export type ItemType = "potion_heal" | "potion_str" | "scroll_lightning" | "scroll_teleport" | "gold";

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  symbol: string;
  color: string;
  x: number;
  y: number;
  value: number; // heal amount, gold amount, or damage
}

export interface PlayerStats {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  level: number;
  xp: number;
  nextXp: number;
  gold: number;
  depth: number;
  inventory: Item[];
}

export interface LogMessage {
  id: string;
  turn: number;
  text: string;
  tone: "info" | "combat" | "pickup" | "warning" | "victory";
}

export interface DungeonState {
  version: 1;
  seed: number;
  turn: number;
  status: "playing" | "victory" | "gameover";
  player: PlayerStats;
  monsters: Monster[];
  items: Item[];
  tiles: TileType[]; // 1D array of DUNGEON_WIDTH * DUNGEON_HEIGHT
  visible: boolean[]; // 1D array of visible tiles this turn
  explored: boolean[]; // 1D array of discovered tiles
  logs: LogMessage[];
  score: number;
  monstersSlain: number;
}

// ─── 3. DUNGEON GENERATION ───────────────────────────────────────────────────

export function getTileIndex(x: number, y: number): number {
  return y * DUNGEON_WIDTH + x;
}

export function isInsideMap(x: number, y: number): boolean {
  return x >= 0 && x < DUNGEON_WIDTH && y >= 0 && y < DUNGEON_HEIGHT;
}

export function generateDungeonMap(
  rng: RogueRng,
  depth: number
): {
  tiles: TileType[];
  rooms: Rect[];
  playerStart: Point;
  stairsPos: Point;
  monsters: Monster[];
  items: Item[];
} {
  const tiles: TileType[] = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(TileType.Wall);
  const rooms: Rect[] = [];
  const maxRooms = rng.range(6, 9);

  for (let r = 0; r < 35 && rooms.length < maxRooms; r++) {
    const w = rng.range(5, 9);
    const h = rng.range(4, 7);
    const x = rng.range(1, DUNGEON_WIDTH - w - 2);
    const y = rng.range(1, DUNGEON_HEIGHT - h - 2);
    const newRoom: Rect = { x, y, w, h };

    // Check overlaps (with 1 tile padding)
    let overlaps = false;
    for (const existing of rooms) {
      if (
        newRoom.x <= existing.x + existing.w + 1 &&
        newRoom.x + newRoom.w + 1 >= existing.x &&
        newRoom.y <= existing.y + existing.h + 1 &&
        newRoom.y + newRoom.h + 1 >= existing.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      // Carve room
      for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
        for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
          tiles[getTileIndex(rx, ry)] = TileType.Floor;
        }
      }

      // Connect to previous room via L-corridor
      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        const prevCenter: Point = {
          x: Math.floor(prev.x + prev.w / 2),
          y: Math.floor(prev.y + prev.h / 2),
        };
        const newCenter: Point = {
          x: Math.floor(newRoom.x + newRoom.w / 2),
          y: Math.floor(newRoom.y + newRoom.h / 2),
        };

        // Carve horizontal then vertical, or vice versa
        if (rng.next() < 0.5) {
          carveHCorridor(tiles, prevCenter.x, newCenter.x, prevCenter.y);
          carveVCorridor(tiles, prevCenter.y, newCenter.y, newCenter.x);
        } else {
          carveVCorridor(tiles, prevCenter.y, newCenter.y, prevCenter.x);
          carveHCorridor(tiles, prevCenter.x, newCenter.x, newCenter.y);
        }
      }

      rooms.push(newRoom);
    }
  }

  // Safety fallback: if no rooms spawned, carve one central room
  if (rooms.length === 0) {
    const fallbackRoom: Rect = { x: 5, y: 5, w: 10, h: 8 };
    for (let rx = fallbackRoom.x; rx < fallbackRoom.x + fallbackRoom.w; rx++) {
      for (let ry = fallbackRoom.y; ry < fallbackRoom.y + fallbackRoom.h; ry++) {
        tiles[getTileIndex(rx, ry)] = TileType.Floor;
      }
    }
    rooms.push(fallbackRoom);
  }

  // Player starts in first room
  const firstRoom = rooms[0];
  const playerStart: Point = {
    x: Math.floor(firstRoom.x + firstRoom.w / 2),
    y: Math.floor(firstRoom.y + firstRoom.h / 2),
  };

  // Stairs down placed in the last room
  const lastRoom = rooms[rooms.length - 1];
  const stairsPos: Point = {
    x: Math.floor(lastRoom.x + lastRoom.w / 2),
    y: Math.floor(lastRoom.y + lastRoom.h / 2),
  };
  tiles[getTileIndex(stairsPos.x, stairsPos.y)] = TileType.StairsDown;

  // Monsters & Items spawn in rooms (except starting room center)
  const monsters: Monster[] = [];
  const items: Item[] = [];
  let nextEntityId = 1;

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const isBossRoom = depth === MAX_DEPTH && i === rooms.length - 1;

    // Boss spawn
    if (isBossRoom) {
      monsters.push({
        id: `monster-${nextEntityId++}`,
        type: "dragon",
        name: "Ancient Dungeon Dragon",
        symbol: "D",
        color: "#FF004D", // Red
        x: stairsPos.x,
        y: stairsPos.y,
        hp: 120,
        maxHp: 120,
        atk: 22,
        def: 8,
        xpReward: 300,
      });
      // Move stairs slightly off center in boss room
      const safeStairsX = lastRoom.x + 1;
      const safeStairsY = lastRoom.y + 1;
      tiles[getTileIndex(stairsPos.x, stairsPos.y)] = TileType.Floor;
      tiles[getTileIndex(safeStairsX, safeStairsY)] = TileType.StairsDown;
      stairsPos.x = safeStairsX;
      stairsPos.y = safeStairsY;
    } else {
      // Regular monsters
      const monsterCount = rng.range(1, 3);
      for (let m = 0; m < monsterCount; m++) {
        const mx = rng.range(room.x, room.x + room.w - 1);
        const my = rng.range(room.y, room.y + room.h - 1);

        // Don't stack monsters
        if (!monsters.some((mob) => mob.x === mx && mob.y === my)) {
          monsters.push(createScaledMonster(rng, depth, nextEntityId++, mx, my));
        }
      }
    }

    // Items
    const itemCount = rng.range(0, 2);
    for (let it = 0; it < itemCount; it++) {
      const ix = rng.range(room.x, room.x + room.w - 1);
      const iy = rng.range(room.y, room.y + room.h - 1);

      if (!monsters.some((mob) => mob.x === ix && mob.y === iy) && !items.some((item) => item.x === ix && item.y === iy)) {
        items.push(createRandomItem(rng, depth, nextEntityId++, ix, iy));
      }
    }
  }

  return { tiles, rooms, playerStart, stairsPos, monsters, items };
}

function carveHCorridor(tiles: TileType[], x1: number, x2: number, y: number): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    if (isInsideMap(x, y)) {
      tiles[getTileIndex(x, y)] = TileType.Floor;
    }
  }
}

function carveVCorridor(tiles: TileType[], y1: number, y2: number, x: number): void {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    if (isInsideMap(x, y)) {
      tiles[getTileIndex(x, y)] = TileType.Floor;
    }
  }
}

function createScaledMonster(rng: RogueRng, depth: number, idNum: number, x: number, y: number): Monster {
  const roll = rng.next();
  if (depth === 1) {
    if (roll < 0.65) {
      return {
        id: `mob-${idNum}`,
        type: "slime",
        name: "Green Slime",
        symbol: "s",
        color: "#00E436",
        x,
        y,
        hp: 12,
        maxHp: 12,
        atk: 5,
        def: 1,
        xpReward: 15,
      };
    }
    return {
      id: `mob-${idNum}`,
      type: "goblin",
      name: "Goblin Scout",
      symbol: "g",
      color: "#FFA300",
      x,
      y,
      hp: 18,
      maxHp: 18,
      atk: 8,
      def: 2,
      xpReward: 25,
    };
  } else if (depth === 2 || depth === 3) {
    if (roll < 0.35) {
      return {
        id: `mob-${idNum}`,
        type: "goblin",
        name: "Goblin Warrior",
        symbol: "g",
        color: "#FFA300",
        x,
        y,
        hp: 24,
        maxHp: 24,
        atk: 10,
        def: 3,
        xpReward: 35,
      };
    }
    return {
      id: `mob-${idNum}`,
      type: "skeleton",
      name: "Restless Skeleton",
      symbol: "k",
      color: "#FFF1E8",
      x,
      y,
      hp: 32,
      maxHp: 32,
      atk: 13,
      def: 4,
      xpReward: 50,
    };
  } else {
    // Depths 4-5
    if (roll < 0.4) {
      return {
        id: `mob-${idNum}`,
        type: "skeleton",
        name: "Skeleton Knight",
        symbol: "k",
        color: "#FFF1E8",
        x,
        y,
        hp: 40,
        maxHp: 40,
        atk: 16,
        def: 5,
        xpReward: 70,
      };
    }
    return {
      id: `mob-${idNum}`,
      type: "orc",
      name: "Dungeon Orc Brute",
      symbol: "o",
      color: "#FF004D",
      x,
      y,
      hp: 55,
      maxHp: 55,
      atk: 20,
      def: 6,
      xpReward: 95,
    };
  }
}

function createRandomItem(rng: RogueRng, depth: number, idNum: number, x: number, y: number): Item {
  const roll = rng.next();
  if (roll < 0.45) {
    return {
      id: `item-${idNum}`,
      type: "gold",
      name: "Gold Pouch",
      symbol: "$",
      color: "#FFEC27",
      x,
      y,
      value: rng.range(10 + depth * 5, 25 + depth * 10),
    };
  } else if (roll < 0.75) {
    return {
      id: `item-${idNum}`,
      type: "potion_heal",
      name: "Health Potion",
      symbol: "!",
      color: "#FF004D",
      x,
      y,
      value: 30 + depth * 5,
    };
  } else if (roll < 0.9) {
    return {
      id: `item-${idNum}`,
      type: "scroll_lightning",
      name: "Scroll of Lightning",
      symbol: "?",
      color: "#29ADFF",
      x,
      y,
      value: 28 + depth * 4,
    };
  } else {
    return {
      id: `item-${idNum}`,
      type: "potion_str",
      name: "Strength Elixir",
      symbol: "!",
      color: "#FFA300",
      x,
      y,
      value: 3,
    };
  }
}

// ─── 4. FIELD OF VIEW (FOV) ──────────────────────────────────────────────────

export const FOV_RADIUS = 7;

/**
 * Computes Bresenham raycasting field of view from (px, py).
 * Updates visible and explored bit arrays.
 */
export function computeFov(
  px: number,
  py: number,
  tiles: TileType[],
  visible: boolean[],
  explored: boolean[],
  radius = FOV_RADIUS
): void {
  // Clear previous visibility
  visible.fill(false);

  // Player position is always visible and explored
  const pIdx = getTileIndex(px, py);
  visible[pIdx] = true;
  explored[pIdx] = true;

  // Cast rays in 360-degree perimeter
  const stepCount = 90;
  for (let s = 0; s < stepCount; s++) {
    const angle = (s * 2 * Math.PI) / stepCount;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let cx = px + 0.5;
    let cy = py + 0.5;

    for (let r = 0; r < radius; r++) {
      cx += dx;
      cy += dy;
      const tx = Math.floor(cx);
      const ty = Math.floor(cy);

      if (!isInsideMap(tx, ty)) break;

      const idx = getTileIndex(tx, ty);
      visible[idx] = true;
      explored[idx] = true;

      // Walls block light
      if (tiles[idx] === TileType.Wall) {
        break;
      }
    }
  }
}

// ─── 5. GAME ENGINE STATE INITIALIZATION ──────────────────────────────────────

export function createDungeonGame(seed: number = Date.now()): DungeonState {
  const rng = new RogueRng(seed);
  const depth = 1;
  const { tiles, playerStart, monsters, items } = generateDungeonMap(rng, depth);

  const visible: boolean[] = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);
  const explored: boolean[] = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);

  computeFov(playerStart.x, playerStart.y, tiles, visible, explored);

  const initialLog: LogMessage = {
    id: "log-init",
    turn: 1,
    text: "Welcome to Dot Dungeon! Descend to Depth 5 and claim the Dragon's Amulet.",
    tone: "info",
  };

  return {
    version: 1,
    seed,
    turn: 1,
    status: "playing",
    player: {
      x: playerStart.x,
      y: playerStart.y,
      hp: 60,
      maxHp: 60,
      atk: 12,
      def: 3,
      level: 1,
      xp: 0,
      nextXp: 40,
      gold: 0,
      depth,
      inventory: [
        {
          id: "starter-pot",
          type: "potion_heal",
          name: "Health Potion",
          symbol: "!",
          color: "#FF004D",
          x: -1,
          y: -1,
          value: 35,
        },
      ],
    },
    monsters,
    items,
    tiles,
    visible,
    explored,
    logs: [initialLog],
    score: 0,
    monstersSlain: 0,
  };
}

// ─── 6. TURN LOGIC & COMMANDS ────────────────────────────────────────────────

export type Direction = "up" | "down" | "left" | "right" | "wait";

export interface TurnResult {
  state: DungeonState;
  events: {
    moved: boolean;
    attacked: boolean;
    hitPlayer: boolean;
    pickedItem: boolean;
    descended: boolean;
    victory: boolean;
    gameover: boolean;
  };
}

export function stepDungeonTurn(
  currentState: DungeonState,
  action: { type: "move"; dir: Direction } | { type: "use_item"; itemIndex: number }
): TurnResult {
  if (currentState.status !== "playing") {
    return {
      state: currentState,
      events: {
        moved: false,
        attacked: false,
        hitPlayer: false,
        pickedItem: false,
        descended: false,
        victory: currentState.status === "victory",
        gameover: currentState.status === "gameover",
      },
    };
  }

  // Deep clone state for immutability
  const state: DungeonState = {
    ...currentState,
    player: {
      ...currentState.player,
      inventory: [...currentState.player.inventory],
    },
    monsters: currentState.monsters.map((m) => ({ ...m })),
    items: currentState.items.map((it) => ({ ...it })),
    tiles: [...currentState.tiles],
    visible: [...currentState.visible],
    explored: [...currentState.explored],
    logs: [...currentState.logs],
  };

  const events = {
    moved: false,
    attacked: false,
    hitPlayer: false,
    pickedItem: false,
    descended: false,
    victory: false,
    gameover: false,
  };

  let playerActed = false;

  if (action.type === "use_item") {
    const item = state.player.inventory[action.itemIndex];
    if (item) {
      state.player.inventory.splice(action.itemIndex, 1);
      playerActed = true;

      if (item.type === "potion_heal") {
        const healAmt = Math.min(item.value, state.player.maxHp - state.player.hp);
        state.player.hp += healAmt;
        addLog(state, `Drank ${item.name}! Restored ${healAmt} HP.`, "pickup");
      } else if (item.type === "potion_str") {
        state.player.atk += item.value;
        addLog(state, `Drank ${item.name}! Attack increased by +${item.value}!`, "pickup");
      } else if (item.type === "scroll_lightning") {
        // Strike nearest monster in visible range
        const target = state.monsters
          .filter((m) => state.visible[getTileIndex(m.x, m.y)])
          .sort((a, b) => distance(state.player, a) - distance(state.player, b))[0];

        if (target) {
          target.hp -= item.value;
          addLog(state, `Zap! Lightning strikes ${target.name} for ${item.value} shock damage!`, "combat");
          if (target.hp <= 0) {
            handleMonsterDeath(state, target);
          }
        } else {
          addLog(state, `Scroll of Lightning sparked, but no visible targets were found!`, "info");
        }
      }
    }
  } else if (action.type === "move") {
    if (action.dir === "wait") {
      playerActed = true;
      addLog(state, `You wait a turn...`, "info");
    } else {
      const delta = getDirectionDelta(action.dir);
      const targetX = state.player.x + delta.x;
      const targetY = state.player.y + delta.y;

      if (isInsideMap(targetX, targetY)) {
        const tileIdx = getTileIndex(targetX, targetY);
        const monsterAtTarget = state.monsters.find((m) => m.x === targetX && m.y === targetY);

        if (monsterAtTarget) {
          // Bump combat!
          playerActed = true;
          events.attacked = true;
          const damage = Math.max(1, state.player.atk - monsterAtTarget.def);
          monsterAtTarget.hp -= damage;
          addLog(state, `You hit ${monsterAtTarget.name} for ${damage} damage.`, "combat");

          if (monsterAtTarget.hp <= 0) {
            handleMonsterDeath(state, monsterAtTarget);
          }
        } else if (state.tiles[tileIdx] !== TileType.Wall) {
          // Walk into tile
          state.player.x = targetX;
          state.player.y = targetY;
          playerActed = true;
          events.moved = true;

          // Check if walked on stairs
          if (state.tiles[tileIdx] === TileType.StairsDown) {
            if (state.player.depth >= MAX_DEPTH) {
              // Final victory condition reached!
              state.status = "victory";
              events.victory = true;
              state.score += 1500;
              addLog(state, `★ VICTORY! You claimed the Dragon's Amulet and ascended!`, "victory");
              return { state, events };
            } else {
              // Descend to next floor
              state.player.depth += 1;
              events.descended = true;
              descendToFloor(state);
              addLog(state, `Descended down stairs to Depth ${state.player.depth}!`, "pickup");
              return { state, events };
            }
          }

          // Check item pickup
          const itemIdx = state.items.findIndex((it) => it.x === targetX && it.y === targetY);
          if (itemIdx !== -1) {
            const picked = state.items.splice(itemIdx, 1)[0];
            events.pickedItem = true;
            if (picked.type === "gold") {
              state.player.gold += picked.value;
              state.score += picked.value * 2;
              addLog(state, `Found ${picked.name} containing ${picked.value} gold!`, "pickup");
            } else {
              if (state.player.inventory.length < 8) {
                state.player.inventory.push(picked);
                addLog(state, `Picked up ${picked.name}.`, "pickup");
              } else {
                addLog(state, `Inventory full! Cannot carry ${picked.name}.`, "warning");
              }
            }
          }
        }
      }
    }
  }

  if (playerActed) {
    state.turn += 1;

    // Monsters turn
    for (const monster of state.monsters) {
      if (monster.hp <= 0) continue;

      const dist = distance(monster, state.player);

      if (dist === 1) {
        // Monster attacks player
        const damage = Math.max(1, monster.atk - state.player.def);
        state.player.hp -= damage;
        events.hitPlayer = true;
        addLog(state, `${monster.name} attacks you for ${damage} damage!`, "combat");

        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.status = "gameover";
          events.gameover = true;
          addLog(state, `You have succumbed to the dungeon horrors... GAME OVER.`, "warning");
          break;
        }
      } else if (dist <= 6 && state.visible[getTileIndex(monster.x, monster.y)]) {
        // Monster moves towards player using greedy grid step
        const step = getStepTowards(monster, state.player, state.tiles, state.monsters);
        if (step) {
          monster.x = step.x;
          monster.y = step.y;
        }
      }
    }

    // Recompute FOV after moves
    computeFov(state.player.x, state.player.y, state.tiles, state.visible, state.explored);
  }

  return { state, events };
}

function handleMonsterDeath(state: DungeonState, monster: Monster): void {
  const index = state.monsters.indexOf(monster);
  if (index !== -1) {
    state.monsters.splice(index, 1);
  }
  state.monstersSlain += 1;
  state.score += monster.xpReward * 3;
  state.player.xp += monster.xpReward;
  addLog(state, `Defeated ${monster.name}! Gained ${monster.xpReward} XP.`, "combat");

  // Check level up
  if (state.player.xp >= state.player.nextXp) {
    state.player.level += 1;
    state.player.xp -= state.player.nextXp;
    state.player.nextXp = Math.floor(state.player.nextXp * 1.6);
    state.player.maxHp += 15;
    state.player.hp = state.player.maxHp;
    state.player.atk += 3;
    state.player.def += 1;
    addLog(state, `★ LEVEL UP! You reached Level ${state.player.level}! (HP and ATK increased)`, "victory");
  }
}

function descendToFloor(state: DungeonState): void {
  const rng = new RogueRng(state.seed + state.player.depth * 1013);
  const { tiles, playerStart, monsters, items } = generateDungeonMap(rng, state.player.depth);

  state.tiles = tiles;
  state.player.x = playerStart.x;
  state.player.y = playerStart.y;
  state.monsters = monsters;
  state.items = items;
  state.visible = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);
  state.explored = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);

  computeFov(state.player.x, state.player.y, state.tiles, state.visible, state.explored);
}

function addLog(state: DungeonState, text: string, tone: LogMessage["tone"]): void {
  state.logs.unshift({
    id: `log-${state.turn}-${Date.now()}-${Math.random()}`,
    turn: state.turn,
    text,
    tone,
  });
  // Keep latest 25 logs
  if (state.logs.length > 25) {
    state.logs.length = 25;
  }
}

function getDirectionDelta(dir: Direction): Point {
  switch (dir) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

export function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getStepTowards(
  from: Point,
  to: Point,
  tiles: TileType[],
  monsters: Monster[]
): Point | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const candidates: Point[] = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    candidates.push({ x: from.x + Math.sign(dx), y: from.y });
    candidates.push({ x: from.x, y: from.y + Math.sign(dy) });
  } else {
    candidates.push({ x: from.x, y: from.y + Math.sign(dy) });
    candidates.push({ x: from.x + Math.sign(dx), y: from.y });
  }

  for (const c of candidates) {
    if (isInsideMap(c.x, c.y)) {
      const idx = getTileIndex(c.x, c.y);
      if (tiles[idx] !== TileType.Wall && !monsters.some((m) => m.x === c.x && m.y === c.y)) {
        return c;
      }
    }
  }

  return null;
}

export interface DungeonMonteCarloReport {
  runs: number;
  avgScore: number;
  avgMonstersSlain: number;
  survivalRate: number;
}

/**
 * Monte Carlo balance simulation audit (`game-balance` skill) for Dot Dungeon Rogue.
 */
export function runDungeonRogueMonteCarloAudit(
  runs = 20,
  maxSteps = 40,
  baseSeed = 20261110
): DungeonMonteCarloReport {
  const dirs: Direction[] = ["up", "down", "left", "right"];
  let totalScore = 0;
  let totalSlain = 0;
  let survived = 0;

  for (let r = 0; r < runs; r++) {
    const rng = new RogueRng(baseSeed + r * 97);
    let state = createDungeonGame(baseSeed + r * 97);
    for (let s = 0; s < maxSteps && state.status === "playing"; s++) {
      if (state.player.hp <= state.player.maxHp * 0.4 && state.player.inventory.length > 0) {
        state = stepDungeonTurn(state, { type: "use_item", itemIndex: 0 }).state;
      } else {
        const dir = dirs[rng.range(0, 3)];
        state = stepDungeonTurn(state, { type: "move", dir }).state;
      }
    }
    totalScore += state.score;
    totalSlain += state.monstersSlain;
    if (state.status !== "gameover") survived++;
  }

  return {
    runs,
    avgScore: totalScore / Math.max(1, runs),
    avgMonstersSlain: totalSlain / Math.max(1, runs),
    survivalRate: survived / Math.max(1, runs),
  };
}

