/**
 * Village: a month-per-turn management game (prd-game-village-management-2026-10-06).
 *
 * Stage 2 puts the village on a 6×6 map and makes every run different on
 * purpose (세운 요청 2026-10-06: "랜덤성 최대한"): the terrain, the village's
 * character, who the villagers are, the month's weather, how much each order
 * and each building brings in, which event turns up and how a risky choice
 * ends are all rolled.
 *
 * It is still pure and seeded. Every roll advances the generator kept in the
 * state, and the state is saved after every action, so reloading a save gives
 * the same roll again: chance decides the run, not the reload button.
 */
export const VILLAGE_TURNS = 36;
export const VILLAGE_GRID = 6;
export const VILLAGE_TILES = VILLAGE_GRID * VILLAGE_GRID;
export const VILLAGE_NAMES = 24;
// v1 was the stage-1 trial (no map, no villagers). Its saves stay under their own key, untouched.
export const VILLAGE_SAVE_KEY = "oiyo:game-village:v2";
export const VILLAGE_BEST_KEY = "oiyo:game-village-best:v2";

export type Season = 0 | 1 | 2 | 3; // spring, summer, autumn, winter
export const TERRAINS = ["plain", "fertile", "forest", "rock", "water"] as const;
export type Terrain = (typeof TERRAINS)[number];
export const BUILDING_IDS = ["field", "house", "storehouse", "lumberCamp", "quarry", "hut", "kitchen", "well", "watchtower", "market", "smithy", "hall"] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];
export const COMMAND_IDS = ["tend", "lumber", "quarry", "hunt", "build", "patrol", "feast", "explore"] as const;
export type CommandId = (typeof COMMAND_IDS)[number];
export const TRAIT_IDS = ["diligent", "strong", "greenThumb", "glutton", "frugal", "lazy", "brave", "merchant"] as const;
export type TraitId = (typeof TRAIT_IDS)[number];
export const WEATHER_IDS = ["clear", "rain", "wind", "heat", "storm", "fog", "snow", "frost", "mild"] as const;
export type WeatherId = (typeof WEATHER_IDS)[number];
export const VILLAGE_TRAIT_IDS = ["fertile", "deepWoods", "stony", "crossroads", "wolfValley", "harsh", "lucky"] as const;
export type VillageTraitId = (typeof VILLAGE_TRAIT_IDS)[number];
export const RESOURCE_IDS = ["food", "wood", "stone", "gold"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export type Cost = Partial<Record<"wood" | "stone" | "gold", number>>;
export interface BuildingDef { cost: Cost; need: number; max: number; job: boolean; near?: Terrain }

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  field: { cost: { wood: 6 }, need: 20, max: 10, job: true },
  house: { cost: { wood: 20 }, need: 40, max: 6, job: false },
  storehouse: { cost: { wood: 25, stone: 5 }, need: 50, max: 2, job: false },
  lumberCamp: { cost: { wood: 15 }, need: 40, max: 2, job: true, near: "forest" },
  quarry: { cost: { wood: 20 }, need: 50, max: 2, job: true, near: "rock" },
  hut: { cost: { wood: 12 }, need: 30, max: 2, job: true, near: "forest" },
  kitchen: { cost: { wood: 20, stone: 8 }, need: 50, max: 1, job: false },
  well: { cost: { stone: 10 }, need: 30, max: 2, job: false },
  watchtower: { cost: { wood: 20, stone: 10 }, need: 40, max: 2, job: true },
  market: { cost: { wood: 30, stone: 15, gold: 10 }, need: 70, max: 1, job: true },
  smithy: { cost: { wood: 20, stone: 25 }, need: 70, max: 1, job: false },
  hall: { cost: { wood: 40, stone: 40, gold: 30 }, need: 120, max: 1, job: false },
};

export interface Villager { n: number; t: TraitId; at: number }
export interface VillageProject { id: BuildingId; tile: number; progress: number }
/** One line of what happened. `n` is a signed amount, `id` names a resource, a building or an outcome. */
export type ReportLine = { k: string; n?: number; id?: string };

export interface VillageState {
  v: 2;
  rng: number;
  /** Months finished so far. The game ends when this reaches VILLAGE_TURNS. */
  turn: number;
  food: number;
  wood: number;
  stone: number;
  gold: number;
  fatigue: number;
  trait: VillageTraitId;
  terrain: Terrain[];
  built: (BuildingId | null)[];
  villagers: Villager[];
  project: VillageProject | null;
  ap: number;
  /** This month only. */
  tended: number;
  patrols: number;
  harvestMod: number;
  weather: WeatherId;
  event: EventId | null;
  eventDone: boolean;
  hungryMonths: number;
  /** Last month's ledger. */
  report: ReportLine[];
  /** What the last order or choice just did. */
  last: ReportLine[];
}

// ── Chance ────────────────────────────────────────────────────────────────

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

class Dice {
  constructor(public state: number) {}
  next() {
    this.state = (Math.imul(this.state >>> 0, 1664525) + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }
  int(low: number, high: number) { return low + Math.floor(this.next() * (high - low + 1)); }
  pick<T>(items: readonly T[]): T { return items[Math.floor(this.next() * items.length)]; }
  weighted<T extends string>(table: Partial<Record<T, number>>): T {
    const entries = Object.entries(table) as [T, number][];
    let cursor = this.next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [id, weight] of entries) { cursor -= weight; if (cursor < 0) return id; }
    return entries[entries.length - 1][0];
  }
}

// ── Reading the state ─────────────────────────────────────────────────────

export const villageSeason = (turn: number): Season => (Math.floor((turn % 12) / 3) as Season);
export const villageYear = (turn: number) => Math.floor(turn / 12) + 1;
export const villageMonth = (turn: number) => (turn % 12) + 1;
export const villageDone = (state: VillageState) => state.turn >= VILLAGE_TURNS;
export const villageCount = (state: VillageState, id: BuildingId) => state.built.reduce((sum, b) => sum + (b === id ? 1 : 0), 0);
export const villagePop = (state: VillageState) => state.villagers.length;
export const villageStorageCap = (state: VillageState) => 60 + 60 * villageCount(state, "storehouse");
export const villageHousing = (state: VillageState) => 2 + 2 * villageCount(state, "house");
export const villageMaxAp = (state: VillageState) => 3 + villageCount(state, "hall");
export const villageWorkerAt = (state: VillageState, tile: number) => state.villagers.findIndex((v) => v.at === tile);

export function villageNeighbors(tile: number): number[] {
  const r = Math.floor(tile / VILLAGE_GRID);
  const c = tile % VILLAGE_GRID;
  const out: number[] = [];
  if (r > 0) out.push(tile - VILLAGE_GRID);
  if (r < VILLAGE_GRID - 1) out.push(tile + VILLAGE_GRID);
  if (c > 0) out.push(tile - 1);
  if (c < VILLAGE_GRID - 1) out.push(tile + 1);
  return out;
}
const nearTerrain = (state: VillageState, tile: number, terrain: Terrain) => villageNeighbors(tile).filter((t) => state.terrain[t] === terrain).length;
const nearBuilding = (state: VillageState, tile: number, id: BuildingId) => villageNeighbors(tile).filter((t) => state.built[t] === id).length;

/** What the village shows this month: towers, the people in them, patrols, brave villagers, the valley and the fog. */
export function villageSafety(state: VillageState) {
  let safety = 30 + 10 * state.patrols;
  state.built.forEach((b, tile) => { if (b === "watchtower") safety += villageWorkerAt(state, tile) >= 0 ? 25 : 15; });
  safety += 5 * state.villagers.filter((v) => v.t === "brave").length;
  if (state.trait === "wolfValley") safety -= 10;
  if (state.weather === "fog") safety -= 10;
  return clamp(safety, 0, 100);
}

export function canAfford(state: VillageState, cost: Cost) {
  return state.wood >= (cost.wood ?? 0) && state.stone >= (cost.stone ?? 0) && state.gold >= (cost.gold ?? 0);
}

/** Whether this building may stand on this tile, money aside. */
export function canPlace(state: VillageState, id: BuildingId, tile: number) {
  if (tile < 0 || tile >= VILLAGE_TILES || state.built[tile] !== null) return false;
  if (state.terrain[tile] !== "plain" && state.terrain[tile] !== "fertile") return false;
  const near = BUILDINGS[id].near;
  return !near || nearTerrain(state, tile, near) > 0;
}

export function canBuild(state: VillageState, id: BuildingId, tile?: number) {
  if (state.project || villageCount(state, id) >= BUILDINGS[id].max || !canAfford(state, BUILDINGS[id].cost)) return false;
  if (tile !== undefined) return canPlace(state, id, tile);
  for (let t = 0; t < VILLAGE_TILES; t++) if (canPlace(state, id, t)) return true;
  return false;
}

function stored(state: VillageState): VillageState {
  const cap = villageStorageCap(state);
  return {
    ...state,
    food: clamp(Math.round(state.food), 0, cap),
    wood: clamp(Math.round(state.wood), 0, cap),
    stone: clamp(Math.round(state.stone), 0, cap),
    gold: clamp(Math.round(state.gold), 0, 9999),
    fatigue: clamp(Math.round(state.fatigue), 0, 100),
  };
}

// ── People ────────────────────────────────────────────────────────────────

const JOB_ORDER: BuildingId[] = ["field", "hut", "lumberCamp", "quarry", "market", "watchtower"];

function newVillager(state: VillageState, dice: Dice): Villager {
  const used = new Set(state.villagers.map((v) => v.n));
  const free = Array.from({ length: VILLAGE_NAMES }, (_, i) => i).filter((i) => !used.has(i));
  return { n: free.length ? dice.pick(free) : dice.int(0, VILLAGE_NAMES - 1), t: dice.pick(TRAIT_IDS), at: -1 };
}

/** Sends everyone without a job to an empty workplace, fields first. People already placed stay where they are. */
export function autoAssign(state: VillageState): VillageState {
  const villagers = state.villagers.map((v) => ({ ...v }));
  const taken = new Set(villagers.filter((v) => v.at >= 0).map((v) => v.at));
  for (const id of JOB_ORDER) {
    state.built.forEach((b, tile) => {
      if (b !== id || taken.has(tile)) return;
      const idle = villagers.find((v) => v.at < 0);
      if (idle) { idle.at = tile; taken.add(tile); }
    });
  }
  return { ...state, villagers };
}

/** Moves one villager to a workplace (or to -1, no job). Whoever was there takes the mover's old place. */
export function assignVillager(state: VillageState, index: number, tile: number): VillageState {
  const mover = state.villagers[index];
  if (!mover || villageDone(state)) return state;
  if (tile !== -1) {
    const building = state.built[tile];
    if (tile < 0 || tile >= VILLAGE_TILES || !building || !BUILDINGS[building].job) return state;
  }
  if (mover.at === tile) return state;
  const villagers = state.villagers.map((v, i) => {
    if (i === index) return { ...v, at: tile };
    if (tile !== -1 && v.at === tile) return { ...v, at: mover.at };
    return v;
  });
  return { ...state, villagers };
}

// ── The month's weather and news ──────────────────────────────────────────

const WEATHER_BY_SEASON: Record<Season, Partial<Record<WeatherId, number>>> = {
  0: { clear: 4, rain: 4, wind: 2 },
  1: { clear: 3, rain: 2, heat: 3, storm: 2 },
  2: { clear: 4, rain: 2, fog: 3, wind: 1 },
  3: { snow: 4, frost: 3, mild: 3 },
};

type Effect = Partial<Record<ResourceId | "fatigue" | "pop" | "harvest", number>>;
interface EventChoice {
  need?: Partial<Record<ResourceId | "beds", number>>;
  /** Safety at or above this gives `good`, below it gives `bad`. */
  safe?: number;
  /** Chance of `good`; otherwise `bad`. */
  odds?: number;
  good: Effect;
  bad?: Effect;
}
interface EventDef { seasons: readonly Season[]; danger?: boolean; choices: readonly EventChoice[] }
const ALL: Season[] = [0, 1, 2, 3];

export const EVENTS = {
  drought: { seasons: [1, 2], choices: [{ good: { fatigue: 15 } }, { good: { harvest: 0.6 } }] },
  bumper: { seasons: [1, 2], choices: [{ good: { harvest: 1.5 } }] },
  trader: { seasons: ALL, choices: [{ need: { wood: 10 }, good: { wood: -10, gold: 8 } }, { need: { gold: 8 }, good: { gold: -8, food: 12 } }, { good: {} }] },
  wolves: { seasons: ALL, danger: true, choices: [{ safe: 50, good: { fatigue: 5 }, bad: { fatigue: 20, food: -6 } }, { good: { food: -12 } }] },
  coldSnap: { seasons: [3], choices: [{ need: { wood: 6 }, good: { wood: -6 } }, { good: { fatigue: 20 } }] },
  festival: { seasons: [0, 2], choices: [{ need: { food: 8 }, good: { food: -8, fatigue: -30 } }, { good: {} }] },
  sickness: { seasons: ALL, choices: [{ good: { fatigue: 20 } }, { need: { gold: 6 }, good: { gold: -6 } }] },
  traveler: { seasons: [0, 1, 2], choices: [{ need: { beds: 1 }, good: { pop: 1 } }, { good: { gold: 5 } }] },
  gambler: { seasons: ALL, choices: [{ need: { gold: 5 }, odds: 0.5, good: { gold: 10 }, bad: { gold: -5 } }, { good: {} }] },
  ruins: { seasons: [0, 1, 2], choices: [{ odds: 0.6, good: { stone: 12, gold: 6 }, bad: { fatigue: 15 } }, { good: {} }] },
  bees: { seasons: [0, 1], choices: [{ odds: 0.7, good: { food: 10 }, bad: { fatigue: 10 } }, { good: {} }] },
  storm: { seasons: [1, 2], choices: [{ need: { wood: 5 }, good: { wood: -5 } }, { odds: 0.5, good: {}, bad: { food: -8, wood: -8 } }] },
  bandits: { seasons: ALL, danger: true, choices: [{ need: { gold: 8 }, good: { gold: -8 } }, { safe: 60, good: { gold: 5 }, bad: { food: -10, gold: -5, fatigue: 10 } }] },
  fishRun: { seasons: [0, 2], choices: [{ good: { food: 12, fatigue: 8 } }, { good: {} }] },
  lostChild: { seasons: ALL, choices: [{ odds: 0.7, good: { fatigue: 5, gold: 8 }, bad: { fatigue: 15 } }, { good: {} }] },
  caravan: { seasons: [1, 2], choices: [{ need: { food: 15 }, good: { food: -15, gold: 12 } }, { need: { gold: 6 }, good: { gold: -6, stone: 10 } }, { good: {} }] },
  fire: { seasons: [1, 3], choices: [{ good: { fatigue: 15, wood: -4 } }, { good: { wood: -15 } }] },
  heavySnow: { seasons: [3], choices: [{ good: { fatigue: 12 } }, { odds: 0.5, good: {}, bad: { food: -8 } }] },
  shootingStar: { seasons: ALL, choices: [{ good: { fatigue: -10 } }] },
  rats: { seasons: [2, 3], choices: [{ need: { wood: 3 }, good: { wood: -3 } }, { odds: 0.4, good: {}, bad: { food: -14 } }] },
  healer: { seasons: ALL, choices: [{ need: { gold: 5 }, good: { gold: -5, fatigue: -25 } }, { good: {} }] },
  mushrooms: { seasons: [2], choices: [{ odds: 0.75, good: { food: 9 }, bad: { fatigue: 18 } }, { good: {} }] },
  taxman: { seasons: [0], choices: [{ need: { gold: 6 }, good: { gold: -6 } }, { odds: 0.4, good: {}, bad: { gold: -10, fatigue: 5 } }] },
  family: { seasons: [0], choices: [{ need: { beds: 2, food: 6 }, good: { pop: 2, food: -6 } }, { good: { gold: 3 } }] },
} as const satisfies Record<string, EventDef>;
export type EventId = keyof typeof EVENTS;
export const EVENT_IDS = Object.keys(EVENTS) as EventId[];
const eventDef = (id: EventId): EventDef => EVENTS[id];
export const eventChoiceCount = (id: EventId) => eventDef(id).choices.length;

/** A choice as the screen needs it: what it costs to take, how it is decided, and what each outcome does. */
export function eventChoiceInfo(state: VillageState, id: EventId, choice: number) {
  const def = eventDef(id).choices[choice];
  const odds = def.odds === undefined ? undefined : clamp(def.odds + (state.trait === "lucky" ? 0.1 : 0), 0, 1);
  return { need: def.need ?? {}, safe: def.safe, odds, good: def.good as Effect, bad: def.bad as Effect | undefined };
}

function startMonth(state: VillageState): VillageState {
  const dice = new Dice(state.rng);
  const season = villageSeason(state.turn);
  const weather = dice.weighted(WEATHER_BY_SEASON[season]);
  let next: VillageState = { ...state, weather, event: null, eventDone: true };
  if (dice.next() < (state.trait === "crossroads" ? 0.9 : 0.72)) {
    const safety = villageSafety(next);
    const pool: EventId[] = [];
    for (const id of EVENT_IDS) {
      const def = eventDef(id);
      if (!def.seasons.includes(season)) continue;
      pool.push(id);
      // An unguarded village hears wolves and bandits more often.
      if (def.danger && safety < 50) pool.push(id, id);
    }
    next = { ...next, event: dice.pick(pool), eventDone: false };
  }
  return { ...next, rng: dice.state };
}

export function canChoose(state: VillageState, choice: number): boolean {
  const id = state.event;
  if (!id || state.eventDone || villageDone(state) || choice < 0 || choice >= eventChoiceCount(id)) return false;
  const need = eventDef(id).choices[choice].need ?? {};
  for (const res of RESOURCE_IDS) if (state[res] < (need[res] ?? 0)) return false;
  return villageHousing(state) - villagePop(state) >= (need.beds ?? 0);
}

function applyEffect(state: VillageState, effect: Effect, dice: Dice, lines: ReportLine[]): VillageState {
  let next = { ...state };
  for (const res of RESOURCE_IDS) {
    const delta = effect[res];
    if (delta) { next[res] += delta; lines.push({ k: "delta", id: res, n: delta }); }
  }
  if (effect.fatigue) { next.fatigue += effect.fatigue; lines.push({ k: "delta", id: "fatigue", n: effect.fatigue }); }
  if (effect.harvest) { next.harvestMod = effect.harvest; lines.push({ k: "harvestMod", n: Math.round((effect.harvest - 1) * 100) }); }
  for (let i = 0; i < (effect.pop ?? 0) && villagePop(next) < villageHousing(next); i++) {
    next = { ...next, villagers: [...next.villagers, newVillager(next, dice)] };
    lines.push({ k: "newcomer" });
  }
  return autoAssign(stored(next));
}

export function chooseEvent(state: VillageState, choice: number): VillageState {
  if (!canChoose(state, choice)) return state;
  const info = eventChoiceInfo(state, state.event!, choice);
  const dice = new Dice(state.rng);
  const lines: ReportLine[] = [];
  let good = true;
  if (info.safe !== undefined) good = villageSafety(state) >= info.safe;
  else if (info.odds !== undefined) good = dice.next() < info.odds;
  if (info.bad) lines.push({ k: good ? "good" : "bad" });
  const next = applyEffect({ ...state, eventDone: true }, good || !info.bad ? info.good : info.bad, dice, lines);
  return { ...next, rng: dice.state, last: lines };
}

// ── The chief's orders ────────────────────────────────────────────────────

export function canCommand(state: VillageState, id: CommandId, build?: BuildingId, tile?: number): boolean {
  if (villageDone(state) || !state.eventDone || state.ap <= 0) return false;
  if (id === "tend") return villageSeason(state.turn) !== 3 && villageCount(state, "field") > 0;
  if (id === "feast") return state.food >= villagePop(state) && state.fatigue > 0;
  if (id === "build") return state.project ? true : build !== undefined && tile !== undefined && canBuild(state, build, tile);
  return true;
}

function finishIfBuilt(state: VillageState, lines: ReportLine[]): VillageState {
  const project = state.project;
  if (!project || project.progress < BUILDINGS[project.id].need) return state;
  const built = [...state.built];
  built[project.tile] = project.id;
  lines.push({ k: "built", id: project.id });
  const next = autoAssign({ ...state, project: null, built });
  // A new hall gives its extra order from the month it opens.
  return project.id === "hall" ? { ...next, ap: next.ap + 1 } : next;
}

// Exploring is the gamble order. Gold is kept thin here: at the first numbers, exploring every
// action of every month out-scored actually building a village (simulated 2026-10-06).
const EXPLORE: Partial<Record<string, number>> = { food: 30, wood: 22, stone: 16, gold: 10, nothing: 15, treasure: 4, stranger: 3 };

export function command(state: VillageState, id: CommandId, build?: BuildingId, tile?: number): VillageState {
  if (!canCommand(state, id, build, tile)) return state;
  const dice = new Dice(state.rng);
  const lines: ReportLine[] = [];
  let next: VillageState = { ...state, ap: state.ap - 1 };
  const gain = (res: ResourceId, amount: number) => { next = { ...next, [res]: next[res] + amount }; lines.push({ k: "delta", id: res, n: amount }); };
  const season = villageSeason(state.turn);
  switch (id) {
    case "tend": next.tended += 1; lines.push({ k: "tended" }); break;
    case "lumber": gain("wood", Math.round(dice.int(6, 10) * (state.trait === "deepWoods" ? 1.25 : 1) * (state.weather === "wind" ? 1.25 : 1))); break;
    case "quarry": gain("stone", Math.round(dice.int(4, 6) * (state.trait === "stony" ? 1.25 : 1))); break;
    case "hunt": {
      const weather = state.weather === "fog" || state.weather === "snow" ? -2 : state.weather === "mild" ? 2 : 0;
      gain("food", Math.max(1, dice.int(3, 9) + (season === 3 ? -2 : 0) + (state.trait === "wolfValley" ? 2 : 0) + weather));
      break;
    }
    case "patrol": next.patrols += 1; lines.push({ k: "patrolled" }); break;
    case "feast": gain("food", -villagePop(state)); next.fatigue -= 25; lines.push({ k: "delta", id: "fatigue", n: -25 }); break;
    case "explore": {
      const found = dice.weighted(EXPLORE);
      next.fatigue += 6;
      if (found === "food") gain("food", dice.int(5, 10));
      else if (found === "wood") gain("wood", dice.int(6, 12));
      else if (found === "stone") gain("stone", dice.int(5, 9));
      else if (found === "gold") gain("gold", dice.int(2, 5));
      else if (found === "treasure") { lines.push({ k: "treasure" }); gain("gold", dice.int(8, 14)); }
      else if (found === "stranger" && villagePop(next) < villageHousing(next)) { next = { ...next, villagers: [...next.villagers, newVillager(next, dice)] }; lines.push({ k: "newcomer" }); }
      else lines.push({ k: "nothing" });
      break;
    }
    case "build": {
      if (!next.project) {
        const cost = BUILDINGS[build!].cost;
        next = { ...next, wood: next.wood - (cost.wood ?? 0), stone: next.stone - (cost.stone ?? 0), gold: next.gold - (cost.gold ?? 0), project: { id: build!, tile: tile!, progress: 0 } };
      }
      next = finishIfBuilt({ ...next, project: { ...next.project!, progress: next.project!.progress + 30 } }, lines);
      if (next.project) lines.push({ k: "progress", n: next.project.progress, id: next.project.id });
      break;
    }
  }
  return { ...autoAssign(stored(next)), rng: dice.state, last: lines };
}

// ── The end of the month ──────────────────────────────────────────────────

const SEASON_YIELD = [0.6, 1, 1.4, 0];
const TRAIT_WORK: Partial<Record<TraitId, number>> = { diligent: 1.25, lazy: 0.75 };

/** What one staffed workplace makes this month, before the dice. Unstaffed workplaces make nothing. */
export function tileOutput(state: VillageState, tile: number): { res: ResourceId; amount: number } | null {
  const id = state.built[tile];
  const worker = state.villagers[villageWorkerAt(state, tile)];
  if (!id || !worker) return null;
  const season = villageSeason(state.turn);
  let work = (TRAIT_WORK[worker.t] ?? 1) * (villageCount(state, "smithy") > 0 ? 1.2 : 1) * (state.fatigue > 70 ? 0.7 : 1);
  if (id === "field") {
    work *= worker.t === "greenThumb" ? 1.5 : 1;
    work *= state.terrain[tile] === "fertile" ? 1.5 : 1;
    work *= nearTerrain(state, tile, "water") + nearBuilding(state, tile, "well") > 0 ? 1.25 : 1;
    work *= state.trait === "fertile" ? 1.15 : 1;
    work *= state.weather === "rain" ? 1.25 : state.weather === "heat" ? 0.8 : state.weather === "storm" ? 0.9 : 1;
    return { res: "food", amount: 5 * SEASON_YIELD[season] * (1 + 0.5 * state.tended) * state.harvestMod * work };
  }
  if (id === "lumberCamp") {
    work *= worker.t === "strong" ? 1.5 : 1;
    work *= 1 + 0.25 * (nearTerrain(state, tile, "forest") - 1);
    work *= state.trait === "deepWoods" ? 1.25 : 1;
    work *= state.weather === "storm" ? 0.5 : state.weather === "wind" ? 1.2 : 1;
    return { res: "wood", amount: 5 * work };
  }
  if (id === "quarry") {
    work *= worker.t === "strong" ? 1.5 : 1;
    work *= 1 + 0.25 * (nearTerrain(state, tile, "rock") - 1);
    work *= state.trait === "stony" ? 1.25 : 1;
    return { res: "stone", amount: 4 * work };
  }
  if (id === "hut") return { res: "food", amount: (season === 3 ? 3 : 5) * work * (state.trait === "wolfValley" ? 1.3 : 1) };
  if (id === "market") return { res: "gold", amount: (3 + nearBuilding(state, tile, "house")) * (worker.t === "merchant" ? 1.5 : 1) };
  return null;
}

export function endMonth(state: VillageState): VillageState {
  if (villageDone(state) || !state.eventDone) return state;
  const dice = new Dice(state.rng);
  const report: ReportLine[] = [{ k: "weather", id: state.weather }];
  const season = villageSeason(state.turn);
  if (state.fatigue > 70) report.push({ k: "tired" });

  const made: Record<ResourceId, number> = { food: 0, wood: 0, stone: 0, gold: 0 };
  for (let tile = 0; tile < VILLAGE_TILES; tile++) {
    const out = tileOutput(state, tile);
    // Each workplace has a better or a worse month of its own.
    if (out) made[out.res] += out.amount * (0.8 + dice.next() * 0.4);
  }
  let next: VillageState = { ...state };
  for (const res of RESOURCE_IDS) {
    const amount = Math.round(made[res]);
    if (amount > 0) { next[res] += amount; report.push({ k: "made", id: res, n: amount }); }
  }
  const idle = state.villagers.filter((v) => v.at < 0).length;
  if (idle > 0) report.push({ k: "idle", n: idle });

  // The village keeps building without the chief, slowly.
  if (next.project) next = finishIfBuilt({ ...next, project: { ...next.project, progress: next.project.progress + 10 } }, report);

  const kitchen = villageCount(next, "kitchen") > 0;
  const appetite = next.villagers.reduce((sum, v) => sum + (v.t === "glutton" ? 3 : v.t === "frugal" ? 1 : 2), 0);
  const eaten = Math.ceil(appetite * (kitchen ? 0.8 : 1));
  if (next.food >= eaten) {
    next.food -= eaten;
    report.push({ k: "eaten", n: -eaten });
  } else {
    next = { ...next, food: 0, hungryMonths: next.hungryMonths + 1, fatigue: next.fatigue + 20 };
    report.push({ k: "hungry" });
    if (next.villagers.length > 2) {
      const leaving = dice.int(0, next.villagers.length - 1);
      report.push({ k: "left", n: next.villagers[leaving].n });
      next = { ...next, villagers: next.villagers.filter((_, i) => i !== leaving) };
    }
  }

  if (season === 3) {
    const base = Math.max(2, Math.ceil(next.villagers.length / 2)) + (state.trait === "harsh" ? 1 : 0);
    const firewood = state.weather === "mild" ? 0 : base + (state.weather === "frost" ? 2 : state.weather === "snow" ? 1 : 0);
    if (next.wood >= firewood) { next.wood -= firewood; if (firewood > 0) report.push({ k: "firewood", n: -firewood }); }
    else { next = { ...next, wood: 0, fatigue: next.fatigue + 15 }; report.push({ k: "cold" }); }
  }

  // Newcomers arrive in spring when there is a bed and a full larder.
  if (season === 0 && next.villagers.length < villageHousing(next) && next.food >= next.villagers.length * 4) {
    next = { ...next, villagers: [...next.villagers, newVillager(next, dice)] };
    report.push({ k: "newcomer" });
  }
  // A season's worth of small trade.
  if (state.turn % 3 === 2) {
    const tax = next.villagers.length + next.villagers.filter((v) => v.t === "merchant").length + (state.trait === "crossroads" ? 2 : 0);
    next.gold += tax;
    report.push({ k: "tax", n: tax });
  }

  const rest = 4 * state.ap;
  const weatherFatigue = state.weather === "heat" ? 3 : 0;
  next = autoAssign(stored({
    ...next,
    fatigue: next.fatigue + 4 + weatherFatigue - rest - (kitchen ? 3 : 0),
    turn: state.turn + 1,
    tended: 0, patrols: 0, harvestMod: 1,
    event: null, eventDone: true,
    rng: dice.state,
    report, last: [],
  }));
  next = { ...next, ap: villageMaxAp(next) };
  return villageDone(next) ? next : startMonth(next);
}

// ── A new village ─────────────────────────────────────────────────────────

function drawMap(dice: Dice): Terrain[] {
  const terrain: Terrain[] = Array<Terrain>(VILLAGE_TILES).fill("plain");
  const home = new Set([14, 15, 20, 21]);
  const grow = (kind: Terrain, count: number) => {
    let at = dice.int(0, VILLAGE_TILES - 1);
    for (let placed = 0, tries = 0; placed < count && tries < 200; tries++) {
      if (!home.has(at) && terrain[at] === "plain") { terrain[at] = kind; placed++; }
      // Mostly creep to a neighbour so woods and rocks come in patches, sometimes jump.
      at = dice.next() < 0.75 ? dice.pick(villageNeighbors(at)) : dice.int(0, VILLAGE_TILES - 1);
    }
  };
  grow("forest", dice.int(5, 8));
  grow("rock", dice.int(3, 5));
  grow("water", dice.int(2, 4));
  grow("fertile", dice.int(4, 7));
  return terrain;
}

export function createVillage(seed: number): VillageState {
  const dice = new Dice((seed ^ 0x76696c6c) >>> 0);
  let terrain = drawMap(dice);
  const blank = (map: Terrain[]) => ({ terrain: map, built: Array<BuildingId | null>(VILLAGE_TILES).fill(null) }) as VillageState;
  const reachable = (map: Terrain[], id: BuildingId) => Array.from({ length: VILLAGE_TILES }, (_, t) => t).some((t) => canPlace(blank(map), id, t));
  // A map with no spot beside woods or rock would lock two buildings out for the whole run.
  for (let tries = 0; tries < 30 && !(reachable(terrain, "lumberCamp") && reachable(terrain, "quarry")); tries++) terrain = drawMap(dice);

  const built = Array<BuildingId | null>(VILLAGE_TILES).fill(null);
  built[14] = "house";
  built[15] = "field";
  built[20] = "field";
  let state: VillageState = {
    v: 2,
    rng: dice.state,
    turn: 0,
    food: dice.int(24, 36), wood: dice.int(16, 28), stone: dice.int(0, 6), gold: dice.int(6, 14),
    fatigue: dice.int(5, 15),
    trait: dice.pick(VILLAGE_TRAIT_IDS),
    terrain, built,
    villagers: [],
    project: null,
    ap: 3,
    tended: 0, patrols: 0, harvestMod: 1,
    weather: "clear",
    event: null, eventDone: true,
    hungryMonths: 0,
    report: [], last: [],
  };
  for (let i = 0; i < 3; i++) state = { ...state, villagers: [...state.villagers, newVillager(state, dice)] };
  return startMonth(autoAssign({ ...state, rng: dice.state }));
}

// ── Score ─────────────────────────────────────────────────────────────────

export function villageScore(state: VillageState) {
  const buildings = state.built.filter(Boolean).length;
  const bonus = (villageCount(state, "hall") > 0 ? 40 : 0) + (state.trait === "harsh" ? 30 : 0);
  return Math.max(0, Math.round(villagePop(state) * 20 + buildings * 10 + Math.min(state.food, 200) / 2 + Math.min(state.gold, 150) + bonus - state.hungryMonths * 30));
}

export type VillageGrade = 0 | 1 | 2;
// Set from simulated games per strategy (2026-10-06); see village.test.ts for the bands these are held to.
export const VILLAGE_GRADE_MARKS = [350, 580] as const;
export function villageGrade(score: number): VillageGrade {
  return score >= VILLAGE_GRADE_MARKS[1] ? 2 : score >= VILLAGE_GRADE_MARKS[0] ? 1 : 0;
}

// ── Save and save code ────────────────────────────────────────────────────

const isCount = (value: unknown, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);

function parseLines(raw: unknown): ReportLine[] {
  const lines: ReportLine[] = [];
  if (!Array.isArray(raw)) return lines;
  for (const item of raw.slice(0, 16)) {
    if (!item || typeof item !== "object") continue;
    const line = item as ReportLine;
    if (typeof line.k !== "string" || line.k.length > 16) continue;
    const entry: ReportLine = { k: line.k };
    if (typeof line.n === "number" && Number.isInteger(line.n) && Math.abs(line.n) <= 9999) entry.n = line.n;
    if (typeof line.id === "string" && line.id.length <= 16) entry.id = line.id;
    lines.push(entry);
  }
  return lines;
}

/** Rebuilds a state from untrusted data. Anything out of range rejects the whole save. */
export function parseVillage(data: unknown): VillageState | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const s = data as Record<string, unknown>;
  if (s.v !== 2) return null;
  if (!Array.isArray(s.terrain) || s.terrain.length !== VILLAGE_TILES || !s.terrain.every((t) => oneOf(TERRAINS, t))) return null;
  if (!Array.isArray(s.built) || s.built.length !== VILLAGE_TILES) return null;
  const terrain = s.terrain as Terrain[];
  const built: (BuildingId | null)[] = [];
  for (let tile = 0; tile < VILLAGE_TILES; tile++) {
    const b = s.built[tile];
    if (b === null) { built.push(null); continue; }
    if (!oneOf(BUILDING_IDS, b) || (terrain[tile] !== "plain" && terrain[tile] !== "fertile")) return null;
    built.push(b);
  }
  const draft = { terrain, built, villagers: [] as Villager[], patrols: 0, trait: "fertile", weather: "clear" } as unknown as VillageState;
  for (const id of BUILDING_IDS) if (villageCount(draft, id) > BUILDINGS[id].max) return null;

  if (!Array.isArray(s.villagers) || s.villagers.length < 1 || s.villagers.length > villageHousing(draft)) return null;
  const villagers: Villager[] = [];
  const taken = new Set<number>();
  for (const item of s.villagers) {
    const v = item as Villager;
    if (!v || typeof v !== "object" || !isCount(v.n, VILLAGE_NAMES - 1) || !oneOf(TRAIT_IDS, v.t)) return null;
    if (v.at !== -1) {
      if (!isCount(v.at, VILLAGE_TILES - 1) || taken.has(v.at)) return null;
      const b = built[v.at];
      if (!b || !BUILDINGS[b].job) return null;
      taken.add(v.at);
    }
    villagers.push({ n: v.n, t: v.t, at: v.at });
  }

  let project: VillageProject | null = null;
  if (s.project !== null) {
    const p = s.project as VillageProject | undefined;
    if (!p || typeof p !== "object" || !oneOf(BUILDING_IDS, p.id) || !isCount(p.tile, VILLAGE_TILES - 1)) return null;
    if (!canPlace(draft, p.id, p.tile) || villageCount(draft, p.id) >= BUILDINGS[p.id].max || !isCount(p.progress, BUILDINGS[p.id].need - 1)) return null;
    project = { id: p.id, tile: p.tile, progress: p.progress };
  }
  const event = s.event === null ? null : oneOf(EVENT_IDS, s.event) ? s.event : undefined;
  if (event === undefined || typeof s.eventDone !== "boolean" || (event === null && !s.eventDone)) return null;
  if (s.harvestMod !== 1 && s.harvestMod !== 0.6 && s.harvestMod !== 1.5) return null;
  if (!oneOf(VILLAGE_TRAIT_IDS, s.trait) || !oneOf(WEATHER_IDS, s.weather)) return null;
  const cap = villageStorageCap(draft);
  const maxAp = villageMaxAp(draft);
  if (
    !isCount(s.rng, 0xffff_ffff) || !isCount(s.turn, VILLAGE_TURNS) ||
    !isCount(s.food, cap) || !isCount(s.wood, cap) || !isCount(s.stone, cap) || !isCount(s.gold, 9999) ||
    !isCount(s.fatigue, 100) || !isCount(s.ap, maxAp) || !isCount(s.tended, maxAp) || !isCount(s.patrols, maxAp) ||
    (s.ap as number) + (s.tended as number) + (s.patrols as number) > maxAp || !isCount(s.hungryMonths, VILLAGE_TURNS)
  ) return null;
  return {
    v: 2, rng: s.rng, turn: s.turn, food: s.food, wood: s.wood, stone: s.stone, gold: s.gold, fatigue: s.fatigue,
    trait: s.trait, terrain, built, villagers, project, ap: s.ap, tended: s.tended, patrols: s.patrols,
    harvestMod: s.harvestMod, weather: s.weather, event, eventDone: s.eventDone, hungryMonths: s.hungryMonths,
    report: parseLines(s.report), last: parseLines(s.last),
  };
}

export function serializeVillage(state: VillageState) {
  return JSON.stringify(state);
}

export function parseVillageSave(raw: string | null): VillageState | null {
  if (!raw) return null;
  try { return parseVillage(JSON.parse(raw)); } catch { return null; }
}

const CODE_PREFIX = "V2.";
const TERRAIN_CHARS = "pftrw"; // plain, fertile, forest (t for trees), rock, water

/**
 * A save as text the player can copy to another device. It is the state
 * itself, not a key to a server copy: nothing is uploaded, so the code is long.
 * The map is packed to one letter a tile to keep it from being longer still.
 */
export function villageSaveCode(state: VillageState): string {
  const { report: _report, last: _last, terrain, built, ...rest } = state;
  const packed = {
    ...rest,
    terrain: terrain.map((t) => TERRAIN_CHARS[TERRAINS.indexOf(t)]).join(""),
    built: built.map((b) => (b ? BUILDING_IDS.indexOf(b) : -1)),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(packed));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return CODE_PREFIX + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function parseVillageCode(code: string): VillageState | null {
  const text = code.trim();
  if (!text.startsWith(CODE_PREFIX) || text.length > 6000) return null;
  try {
    const base = text.slice(CODE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base + "=".repeat((4 - (base.length % 4)) % 4));
    const packed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)))) as Record<string, unknown>;
    if (typeof packed.terrain !== "string" || !Array.isArray(packed.built)) return null;
    return parseVillage({
      ...packed,
      terrain: [...packed.terrain].map((ch) => TERRAINS[TERRAIN_CHARS.indexOf(ch)]),
      built: packed.built.map((index) => (index === -1 ? null : BUILDING_IDS[index as number])),
      report: [], last: [],
    });
  } catch {
    return null;
  }
}
