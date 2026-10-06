/**
 * Village: a month-per-turn management game. Stage 1 of
 * prd-game-village-management-2026-10-06: resources, the chief's commands, six
 * buildings, seasons, a small event deck and a save code. No villagers with
 * names, no grid, no art yet; the point of this stage is to find out whether
 * one month is fun before anything is drawn.
 *
 * Everything here is pure and seeded. The same state and the same choices
 * give the same next month, so reloading a save cannot be used to re-roll an
 * event. 2026-10-06
 */
export const VILLAGE_TURNS = 36;
export const VILLAGE_AP = 3;
export const VILLAGE_SAVE_KEY = "oiyo:game-village:v1";
export const VILLAGE_BEST_KEY = "oiyo:game-village-best:v1";

export type Season = 0 | 1 | 2 | 3; // spring, summer, autumn, winter
export type BuildingId = "field" | "house" | "storehouse" | "lumberCamp" | "quarry" | "fence";
export type CommandId = "tend" | "lumber" | "quarry" | "hunt" | "build" | "patrol" | "feast";
export type EventId = "drought" | "bumper" | "trader" | "wolves" | "coldSnap" | "festival" | "sickness" | "traveler";
export type Cost = { wood?: number; stone?: number; gold?: number };

export interface BuildingDef { cost: Cost; need: number; max: number }

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  field: { cost: { wood: 6 }, need: 20, max: 12 },
  house: { cost: { wood: 20 }, need: 40, max: 6 },
  storehouse: { cost: { wood: 25, stone: 5 }, need: 50, max: 3 },
  lumberCamp: { cost: { wood: 15 }, need: 40, max: 2 },
  quarry: { cost: { wood: 20 }, need: 50, max: 2 },
  fence: { cost: { wood: 20, stone: 10 }, need: 40, max: 3 },
};
export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];
export const COMMAND_IDS: CommandId[] = ["tend", "lumber", "quarry", "hunt", "build", "patrol", "feast"];

/** Choices per event. The first is always available; the engine checks the rest. */
export const EVENT_CHOICES: Record<EventId, number> = {
  drought: 2, bumper: 1, trader: 3, wolves: 2, coldSnap: 2, festival: 2, sickness: 2, traveler: 2,
};
const EVENT_SEASONS: Record<EventId, Season[]> = {
  drought: [1, 2], bumper: [1, 2], trader: [0, 1, 2, 3], wolves: [0, 1, 2, 3],
  coldSnap: [3], festival: [0, 2], sickness: [0, 1, 2, 3], traveler: [0, 1, 2],
};
export const EVENT_IDS = Object.keys(EVENT_CHOICES) as EventId[];

export interface VillageProject { id: BuildingId; progress: number }
export type ReportLine = { k: string; n?: number; id?: string };

export interface VillageState {
  v: 1;
  rng: number;
  /** Months finished so far. The game ends when this reaches VILLAGE_TURNS. */
  turn: number;
  food: number;
  wood: number;
  stone: number;
  gold: number;
  pop: number;
  fatigue: number;
  buildings: Record<BuildingId, number>;
  project: VillageProject | null;
  ap: number;
  /** This month only. */
  tended: number;
  patrols: number;
  harvestMod: number;
  event: EventId | null;
  eventDone: boolean;
  hungryMonths: number;
  report: ReportLine[];
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function roll(rng: number) {
  const state = (Math.imul(rng >>> 0, 1664525) + 1013904223) >>> 0;
  return { state, value: state / 0x1_0000_0000 };
}

export const villageSeason = (turn: number): Season => (Math.floor((turn % 12) / 3) as Season);
export const villageYear = (turn: number) => Math.floor(turn / 12) + 1;
export const villageMonth = (turn: number) => (turn % 12) + 1;
export const villageDone = (state: VillageState) => state.turn >= VILLAGE_TURNS;

export const villageStorageCap = (state: VillageState) => 60 + 60 * state.buildings.storehouse;
export const villageHousing = (state: VillageState) => 2 + 2 * state.buildings.house;
/** What the village shows this month: the standing base, fences, and patrols the chief ordered. */
export const villageSafety = (state: VillageState) => clamp(30 + 20 * state.buildings.fence + 10 * state.patrols, 0, 100);

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

function drawEvent(state: VillageState): VillageState {
  const chance = roll(state.rng);
  if (chance.value > 0.6) return { ...state, rng: chance.state, event: null, eventDone: true };
  const season = villageSeason(state.turn);
  const safety = villageSafety({ ...state, patrols: 0 });
  const pool: EventId[] = [];
  for (const id of EVENT_IDS) {
    if (!EVENT_SEASONS[id].includes(season)) continue;
    pool.push(id);
    // An unguarded village hears wolves more often.
    if (id === "wolves" && safety < 50) pool.push(id, id);
  }
  const pick = roll(chance.state);
  return { ...state, rng: pick.state, event: pool[Math.floor(pick.value * pool.length)], eventDone: false };
}

export function createVillage(seed: number): VillageState {
  return drawEvent({
    v: 1,
    rng: (seed ^ 0x76696c6c) >>> 0,
    turn: 0,
    food: 30, wood: 20, stone: 0, gold: 10,
    pop: 3, fatigue: 10,
    buildings: { field: 2, house: 1, storehouse: 0, lumberCamp: 0, quarry: 0, fence: 0 },
    project: null,
    ap: VILLAGE_AP,
    tended: 0, patrols: 0, harvestMod: 1,
    event: null, eventDone: true,
    hungryMonths: 0,
    report: [],
  });
}

export function canAfford(state: VillageState, cost: Cost) {
  return state.wood >= (cost.wood ?? 0) && state.stone >= (cost.stone ?? 0) && state.gold >= (cost.gold ?? 0);
}

export function canBuild(state: VillageState, id: BuildingId) {
  return !state.project && state.buildings[id] < BUILDINGS[id].max && canAfford(state, BUILDINGS[id].cost);
}

/** Whether an event choice can be taken right now. Choice 0 always can. */
export function canChoose(state: VillageState, choice: number): boolean {
  const id = state.event;
  if (!id || state.eventDone || choice < 0 || choice >= EVENT_CHOICES[id]) return false;
  if (id === "trader") return choice === 0 ? state.wood >= 10 : choice === 1 ? state.gold >= 8 : true;
  if (id === "festival" && choice === 0) return state.food >= 8;
  if (id === "sickness" && choice === 1) return state.gold >= 6;
  if (id === "traveler" && choice === 0) return state.pop < villageHousing(state);
  return true;
}

export function chooseEvent(state: VillageState, choice: number): VillageState {
  if (villageDone(state) || !canChoose(state, choice)) return state;
  const next = { ...state, eventDone: true };
  switch (state.event) {
    case "drought":
      // Carry water and keep the harvest, or save your backs and lose part of it.
      return stored(choice === 0 ? { ...next, fatigue: next.fatigue + 15 } : { ...next, harvestMod: 0.6 });
    case "bumper":
      return { ...next, harvestMod: 1.5 };
    case "trader":
      if (choice === 0) return stored({ ...next, wood: next.wood - 10, gold: next.gold + 8 });
      if (choice === 1) return stored({ ...next, gold: next.gold - 8, food: next.food + 12 });
      return next;
    case "wolves": {
      const safety = villageSafety(state);
      // Standing your ground works behind a fence; hiding always costs the larder.
      if (choice === 0) return stored(safety >= 50 ? { ...next, fatigue: next.fatigue + 5 } : { ...next, fatigue: next.fatigue + 20, food: next.food - 6 });
      return stored({ ...next, food: next.food - 12 });
    }
    case "coldSnap":
      return stored(choice === 0 ? { ...next, wood: next.wood - 6 } : { ...next, fatigue: next.fatigue + 20 });
    case "festival":
      return stored(choice === 0 ? { ...next, food: next.food - 8, fatigue: next.fatigue - 30 } : next);
    case "sickness":
      return stored(choice === 0 ? { ...next, fatigue: next.fatigue + 20 } : { ...next, gold: next.gold - 6 });
    case "traveler":
      return stored(choice === 0 ? { ...next, pop: next.pop + 1 } : { ...next, gold: next.gold + 5 });
    default:
      return next;
  }
}

export function canCommand(state: VillageState, id: CommandId, build?: BuildingId): boolean {
  if (villageDone(state) || !state.eventDone || state.ap <= 0) return false;
  if (id === "tend") return villageSeason(state.turn) !== 3 && state.buildings.field > 0;
  if (id === "feast") return state.food >= state.pop && state.fatigue > 0;
  if (id === "build") return state.project ? true : build !== undefined && canBuild(state, build);
  return true;
}

export function command(state: VillageState, id: CommandId, build?: BuildingId): VillageState {
  if (!canCommand(state, id, build)) return state;
  const next = { ...state, ap: state.ap - 1 };
  switch (id) {
    case "tend": return { ...next, tended: next.tended + 1 };
    case "lumber": return stored({ ...next, wood: next.wood + 8 });
    case "quarry": return stored({ ...next, stone: next.stone + 5 });
    case "hunt": return stored({ ...next, food: next.food + (villageSeason(state.turn) === 3 ? 4 : 6) });
    case "patrol": return { ...next, patrols: next.patrols + 1 };
    case "feast": return stored({ ...next, food: next.food - next.pop, fatigue: next.fatigue - 25 });
    case "build": {
      if (next.project) return finishIfBuilt({ ...next, project: { ...next.project, progress: next.project.progress + 30 } });
      const cost = BUILDINGS[build!].cost;
      return finishIfBuilt(stored({
        ...next,
        wood: next.wood - (cost.wood ?? 0), stone: next.stone - (cost.stone ?? 0), gold: next.gold - (cost.gold ?? 0),
        project: { id: build!, progress: 30 },
      }));
    }
  }
}

function finishIfBuilt(state: VillageState): VillageState {
  const project = state.project;
  if (!project || project.progress < BUILDINGS[project.id].need) return state;
  return { ...state, project: null, buildings: { ...state.buildings, [project.id]: state.buildings[project.id] + 1 } };
}

const SEASON_YIELD = [0.6, 1, 1.4, 0];

/** Workers the buildings ask for. Short of hands, everything produces in proportion. */
export function villageStaffing(state: VillageState) {
  const wanted = Math.ceil(state.buildings.field / 2) + state.buildings.lumberCamp + state.buildings.quarry;
  return wanted === 0 ? 1 : Math.min(1, state.pop / wanted);
}

export function endMonth(state: VillageState): VillageState {
  if (villageDone(state) || !state.eventDone) return state;
  const report: ReportLine[] = [];
  const season = villageSeason(state.turn);
  const tired = state.fatigue > 70 ? 0.7 : 1;
  const staffing = villageStaffing(state) * tired;

  const harvest = Math.round(state.buildings.field * 4 * SEASON_YIELD[season] * (1 + 0.5 * state.tended) * state.harvestMod * staffing);
  const wood = Math.round(state.buildings.lumberCamp * 4 * staffing);
  const stone = Math.round(state.buildings.quarry * 3 * staffing);
  if (harvest > 0) report.push({ k: "harvest", n: harvest });
  if (wood > 0) report.push({ k: "wood", n: wood });
  if (stone > 0) report.push({ k: "stone", n: stone });
  if (tired < 1) report.push({ k: "tired" });

  let next: VillageState = { ...state, food: state.food + harvest, wood: state.wood + wood, stone: state.stone + stone };

  // The village keeps building without the chief, slowly.
  if (next.project) {
    const before = next.project.id;
    next = finishIfBuilt({ ...next, project: { ...next.project, progress: next.project.progress + 10 } });
    if (!next.project) report.push({ k: "built", id: before });
  }

  const eaten = next.pop * 2;
  if (next.food >= eaten) {
    next = { ...next, food: next.food - eaten };
    report.push({ k: "eaten", n: eaten });
  } else {
    next = { ...next, food: 0, hungryMonths: next.hungryMonths + 1, fatigue: next.fatigue + 20 };
    report.push({ k: "hungry" });
    if (next.pop > 2) { next = { ...next, pop: next.pop - 1 }; report.push({ k: "left" }); }
  }

  if (season === 3) {
    const firewood = Math.max(2, Math.ceil(next.pop / 2));
    if (next.wood >= firewood) { next = { ...next, wood: next.wood - firewood }; report.push({ k: "firewood", n: firewood }); }
    else { next = { ...next, wood: 0, fatigue: next.fatigue + 15 }; report.push({ k: "cold" }); }
  }

  // Newcomers arrive in spring when there is a bed and a full larder.
  if (season === 0 && next.pop < villageHousing(next) && next.food >= next.pop * 4) {
    next = { ...next, pop: next.pop + 1 };
    report.push({ k: "newcomer" });
  }
  // A season's worth of small trade.
  if (state.turn % 3 === 2) { next = { ...next, gold: next.gold + next.pop }; report.push({ k: "tax", n: next.pop }); }

  next = stored({
    ...next,
    fatigue: next.fatigue + 4 - (state.ap > 0 ? 4 * state.ap : 0),
    turn: state.turn + 1,
    ap: VILLAGE_AP, tended: 0, patrols: 0, harvestMod: 1,
    event: null, eventDone: true,
    report,
  });
  return villageDone(next) ? next : drawEvent(next);
}

export function villageScore(state: VillageState) {
  const built = BUILDING_IDS.reduce((sum, id) => sum + state.buildings[id], 0);
  return Math.max(0, Math.round(state.pop * 20 + built * 10 + Math.min(state.food, 200) / 2 + state.gold - state.hungryMonths * 30));
}

export type VillageGrade = 0 | 1 | 2;
// Set from 300 simulated games per strategy (2026-10-06): repeating one command tops out
// near 240, random play reaches the first mark about one game in five, and a
// sensible build order lands around 590.
export const VILLAGE_GRADE_MARKS = [350, 550] as const;
export function villageGrade(score: number): VillageGrade {
  return score >= VILLAGE_GRADE_MARKS[1] ? 2 : score >= VILLAGE_GRADE_MARKS[0] ? 1 : 0;
}

// ── Save and save code ─────────────────────────────────────────────────────

const isCount = (value: unknown, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;

/** Rebuilds a state from untrusted data. Anything out of range rejects the whole save. */
export function parseVillage(data: unknown): VillageState | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const s = data as Record<string, unknown>;
  if (s.v !== 1) return null;
  const b = s.buildings as Record<string, unknown> | undefined;
  if (!b || typeof b !== "object") return null;
  const buildings = {} as Record<BuildingId, number>;
  for (const id of BUILDING_IDS) {
    if (!isCount(b[id], BUILDINGS[id].max)) return null;
    buildings[id] = b[id] as number;
  }
  let project: VillageProject | null = null;
  if (s.project !== null) {
    const p = s.project as Record<string, unknown> | undefined;
    if (!p || typeof p.id !== "string" || !BUILDING_IDS.includes(p.id as BuildingId)) return null;
    const id = p.id as BuildingId;
    if (!isCount(p.progress, BUILDINGS[id].need - 1) || buildings[id] >= BUILDINGS[id].max) return null;
    project = { id, progress: p.progress };
  }
  const event = s.event === null ? null : typeof s.event === "string" && EVENT_IDS.includes(s.event as EventId) ? (s.event as EventId) : undefined;
  if (event === undefined || typeof s.eventDone !== "boolean" || (event === null && !s.eventDone)) return null;
  const harvestMod = s.harvestMod;
  if (harvestMod !== 1 && harvestMod !== 0.6 && harvestMod !== 1.5) return null;
  const draft = { buildings, patrols: 0 } as VillageState;
  const cap = 60 + 60 * buildings.storehouse;
  if (
    !isCount(s.rng, 0xffff_ffff) || !isCount(s.turn, VILLAGE_TURNS) ||
    !isCount(s.food, cap) || !isCount(s.wood, cap) || !isCount(s.stone, cap) || !isCount(s.gold, 9999) ||
    !isCount(s.pop, villageHousing(draft)) || (s.pop as number) < 1 || !isCount(s.fatigue, 100) ||
    !isCount(s.ap, VILLAGE_AP) || !isCount(s.tended, VILLAGE_AP) || !isCount(s.patrols, VILLAGE_AP) ||
    (s.ap as number) + (s.tended as number) + (s.patrols as number) > VILLAGE_AP ||
    !isCount(s.hungryMonths, VILLAGE_TURNS)
  ) return null;
  const report: ReportLine[] = [];
  if (Array.isArray(s.report)) {
    for (const line of s.report.slice(0, 12)) {
      if (!line || typeof line !== "object" || typeof (line as ReportLine).k !== "string" || (line as ReportLine).k.length > 16) continue;
      const entry: ReportLine = { k: (line as ReportLine).k };
      if (isCount((line as ReportLine).n, 9999)) entry.n = (line as ReportLine).n;
      if (BUILDING_IDS.includes((line as ReportLine).id as BuildingId)) entry.id = (line as ReportLine).id;
      report.push(entry);
    }
  }
  return {
    v: 1, rng: s.rng, turn: s.turn, food: s.food, wood: s.wood, stone: s.stone, gold: s.gold,
    pop: s.pop as number, fatigue: s.fatigue, buildings, project, ap: s.ap, tended: s.tended, patrols: s.patrols,
    harvestMod, event, eventDone: s.eventDone, hungryMonths: s.hungryMonths, report,
  };
}

export function serializeVillage(state: VillageState) {
  return JSON.stringify(state);
}

export function parseVillageSave(raw: string | null): VillageState | null {
  if (!raw) return null;
  try { return parseVillage(JSON.parse(raw)); } catch { return null; }
}

const CODE_PREFIX = "V1.";

/**
 * A save as text the player can copy to another device. It is the state
 * itself, not a key to a server copy: nothing is uploaded, so the code is long.
 */
export function villageSaveCode(state: VillageState): string {
  const { report: _report, ...rest } = state;
  const bytes = new TextEncoder().encode(JSON.stringify(rest));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return CODE_PREFIX + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function parseVillageCode(code: string): VillageState | null {
  const text = code.trim();
  if (!text.startsWith(CODE_PREFIX) || text.length > 4000) return null;
  try {
    const base = text.slice(CODE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base + "=".repeat((4 - (base.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return parseVillage({ ...JSON.parse(new TextDecoder().decode(bytes)), report: [] });
  } catch {
    return null;
  }
}
