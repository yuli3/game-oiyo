export const GRID_SIZE = 18;
export const SAVE_VERSION = 1;
export const CITY_SAVE_KEY = "oiyo:isometric-city:v1";

export type Weather = "clear" | "rain" | "fog";
export type SimulationSpeed = 0 | 1 | 2 | 4;
export type BuildableKind = "road" | "residential" | "commercial" | "park" | "civic" | "power";
export type CellKind = "grass" | BuildableKind;
export type BuildTool = BuildableKind | "bulldoze";

export interface GridPoint {
  x: number;
  z: number;
}

export interface CityCell extends GridPoint {
  kind: CellKind;
  level: number;
  placedAt: number;
}

export interface CityState {
  version: typeof SAVE_VERSION;
  cells: CityCell[];
  funds: number;
  population: number;
  day: number;
  minuteOfDay: number;
  speed: SimulationSpeed;
  weather: Weather;
  revision: number;
}

export interface CitySummary {
  population: number;
  populationCapacity: number;
  jobs: number;
  filledJobs: number;
  powerDemand: number;
  powerCapacity: number;
  powerRatio: number;
  happiness: number;
  roadCells: number;
  connectedRoadCells: number;
  congestion: number;
  hourlyIncome: number;
  hourlyUpkeep: number;
  hourlyBalance: number;
}

export interface PlaceResult {
  ok: boolean;
  reason: "ok" | "bounds" | "occupied" | "empty" | "funds" | "needs-road" | "max-level" | "not-building";
  state: CityState;
  cost: number;
}

export const BUILD_COST: Record<BuildableKind, number> = {
  road: 120,
  residential: 520,
  commercial: 720,
  park: 340,
  civic: 960,
  power: 1_280,
};

export const BUILDING_LABEL: Record<BuildableKind, string> = {
  road: "Road",
  residential: "Residential",
  commercial: "Commercial",
  park: "Park",
  civic: "Civic",
  power: "Power",
};

const BUILDING_KINDS: BuildableKind[] = [
  "road",
  "residential",
  "commercial",
  "park",
  "civic",
  "power",
];

const CARDINALS: GridPoint[] = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
];

export const cellIndex = (x: number, z: number) => z * GRID_SIZE + x;
export const inBounds = (x: number, z: number) => x >= 0 && z >= 0 && x < GRID_SIZE && z < GRID_SIZE;
export const getCell = (state: CityState, x: number, z: number) =>
  inBounds(x, z) ? state.cells[cellIndex(x, z)] : undefined;

const makeCell = (x: number, z: number): CityCell => ({
  x,
  z,
  kind: "grass",
  level: 0,
  placedAt: 0,
});

function put(cells: CityCell[], kind: BuildableKind, x: number, z: number, level = 1) {
  cells[cellIndex(x, z)] = { x, z, kind, level, placedAt: 0 };
}

export function createStarterCity(): CityState {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) =>
    makeCell(index % GRID_SIZE, Math.floor(index / GRID_SIZE)),
  );

  for (const line of [3, 8, 13]) {
    for (let i = 0; i < GRID_SIZE; i += 1) {
      put(cells, "road", line, i);
      put(cells, "road", i, line);
    }
  }

  [
    [2, 2], [4, 2], [7, 2], [9, 2], [12, 2], [14, 2], [2, 7], [4, 7],
  ].forEach(([x, z], index) => put(cells, "residential", x, z, index % 3 === 0 ? 2 : 1));
  [
    [7, 7], [9, 7], [12, 7], [14, 9],
  ].forEach(([x, z], index) => put(cells, "commercial", x, z, index === 1 ? 2 : 1));
  [[2, 9], [4, 14], [9, 14]].forEach(([x, z]) => put(cells, "park", x, z));
  put(cells, "civic", 7, 14);
  put(cells, "power", 14, 14);

  return {
    version: SAVE_VERSION,
    cells,
    funds: 8_500,
    population: 124,
    day: 1,
    minuteOfDay: 7 * 60 + 30,
    speed: 1,
    weather: "clear",
    revision: 0,
  };
}

export function neighbors(point: GridPoint): GridPoint[] {
  return CARDINALS.map(({ x, z }) => ({ x: point.x + x, z: point.z + z })).filter((next) =>
    inBounds(next.x, next.z),
  );
}

export function isBuilding(kind: CellKind): kind is Exclude<BuildableKind, "road"> {
  return kind !== "grass" && kind !== "road";
}

export function hasAdjacentRoad(state: CityState, x: number, z: number) {
  return neighbors({ x, z }).some((point) => getCell(state, point.x, point.z)?.kind === "road");
}

export function placementReason(state: CityState, tool: BuildTool, x: number, z: number): PlaceResult["reason"] {
  if (!inBounds(x, z)) return "bounds";
  const cell = getCell(state, x, z)!;
  if (tool === "bulldoze") return cell.kind === "grass" ? "empty" : "ok";
  if (cell.kind !== "grass") return "occupied";
  if (state.funds < BUILD_COST[tool]) return "funds";
  if (tool !== "road" && !hasAdjacentRoad(state, x, z)) return "needs-road";
  return "ok";
}

export function placeCell(state: CityState, tool: BuildTool, x: number, z: number): PlaceResult {
  const reason = placementReason(state, tool, x, z);
  if (reason !== "ok") return { ok: false, reason, state, cost: 0 };
  const index = cellIndex(x, z);
  const current = state.cells[index];
  const cells = state.cells.slice();

  if (tool === "bulldoze") {
    const refund = current.kind === "grass"
      ? 0
      : Math.round(BUILD_COST[current.kind] * current.level * 0.18);
    cells[index] = makeCell(x, z);
    return {
      ok: true,
      reason: "ok",
      cost: -refund,
      state: { ...state, cells, funds: state.funds + refund, revision: state.revision + 1 },
    };
  }

  const cost = BUILD_COST[tool];
  cells[index] = {
    x,
    z,
    kind: tool,
    level: 1,
    placedAt: state.revision + 1,
  };
  return {
    ok: true,
    reason: "ok",
    cost,
    state: { ...state, cells, funds: state.funds - cost, revision: state.revision + 1 },
  };
}

export function upgradeCost(cell: CityCell) {
  if (!isBuilding(cell.kind)) return 0;
  return Math.round(BUILD_COST[cell.kind] * (0.75 + cell.level * 0.55));
}

export function upgradeCell(state: CityState, x: number, z: number): PlaceResult {
  if (!inBounds(x, z)) return { ok: false, reason: "bounds", state, cost: 0 };
  const index = cellIndex(x, z);
  const current = state.cells[index];
  if (!isBuilding(current.kind)) return { ok: false, reason: "not-building", state, cost: 0 };
  if (current.level >= 3) return { ok: false, reason: "max-level", state, cost: 0 };
  const cost = upgradeCost(current);
  if (state.funds < cost) return { ok: false, reason: "funds", state, cost: 0 };
  const cells = state.cells.slice();
  cells[index] = { ...current, level: current.level + 1, placedAt: state.revision + 1 };
  return {
    ok: true,
    reason: "ok",
    cost,
    state: { ...state, cells, funds: state.funds - cost, revision: state.revision + 1 },
  };
}

export function findRoadPath(state: CityState, start: GridPoint, goal: GridPoint): GridPoint[] {
  if (getCell(state, start.x, start.z)?.kind !== "road" || getCell(state, goal.x, goal.z)?.kind !== "road") {
    return [];
  }
  const startKey = cellIndex(start.x, start.z);
  const goalKey = cellIndex(goal.x, goal.z);
  if (startKey === goalKey) return [start];

  const open = new Set<number>([startKey]);
  const cameFrom = new Map<number, number>();
  const g = new Map<number, number>([[startKey, 0]]);
  const f = new Map<number, number>([[startKey, Math.abs(start.x - goal.x) + Math.abs(start.z - goal.z)]]);

  while (open.size > 0) {
    let current = -1;
    let currentScore = Number.POSITIVE_INFINITY;
    for (const candidate of open) {
      const score = f.get(candidate) ?? Number.POSITIVE_INFINITY;
      if (score < currentScore) {
        current = candidate;
        currentScore = score;
      }
    }
    if (current === goalKey) {
      const path: GridPoint[] = [];
      let cursor: number | undefined = current;
      while (cursor !== undefined) {
        path.unshift({ x: cursor % GRID_SIZE, z: Math.floor(cursor / GRID_SIZE) });
        cursor = cameFrom.get(cursor);
      }
      return path;
    }

    open.delete(current);
    const point = { x: current % GRID_SIZE, z: Math.floor(current / GRID_SIZE) };
    for (const next of neighbors(point)) {
      if (getCell(state, next.x, next.z)?.kind !== "road") continue;
      const key = cellIndex(next.x, next.z);
      const tentative = (g.get(current) ?? Number.POSITIVE_INFINITY) + 1;
      if (tentative >= (g.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      cameFrom.set(key, current);
      g.set(key, tentative);
      f.set(key, tentative + Math.abs(next.x - goal.x) + Math.abs(next.z - goal.z));
      open.add(key);
    }
  }
  return [];
}

export function connectedRoadCount(state: CityState) {
  const first = state.cells.find((cell) => cell.kind === "road");
  if (!first) return 0;
  const queue = [first];
  const visited = new Set<number>([cellIndex(first.x, first.z)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of neighbors(current)) {
      const key = cellIndex(next.x, next.z);
      if (visited.has(key) || getCell(state, next.x, next.z)?.kind !== "road") continue;
      visited.add(key);
      queue.push(getCell(state, next.x, next.z)!);
    }
  }
  return visited.size;
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

export function createMobilityRoutes(state: CityState, count: number, seed = 81): GridPoint[][] {
  const roads = state.cells.filter((cell) => cell.kind === "road");
  if (roads.length < 2 || count <= 0) return [];
  const random = seeded(seed + state.revision * 97);
  const routes: GridPoint[][] = [];
  let attempts = 0;
  while (routes.length < count && attempts < count * 12) {
    attempts += 1;
    const start = roads[Math.floor(random() * roads.length)];
    const goal = roads[Math.floor(random() * roads.length)];
    if (start === goal || Math.abs(start.x - goal.x) + Math.abs(start.z - goal.z) < 7) continue;
    const route = findRoadPath(state, start, goal);
    if (route.length >= 8) routes.push(route);
  }
  return routes;
}

export function citySummary(state: CityState): CitySummary {
  let populationCapacity = 0;
  let jobs = 0;
  let powerDemand = 0;
  let powerCapacity = 36;
  let parks = 0;
  let civic = 0;
  let roadCells = 0;
  let hourlyUpkeep = 0;

  for (const cell of state.cells) {
    if (cell.kind === "road") {
      roadCells += 1;
      hourlyUpkeep += 0.018;
      continue;
    }
    if (cell.kind === "residential") {
      populationCapacity += 30 * cell.level;
      powerDemand += 8 * cell.level;
      hourlyUpkeep += 0.28 * cell.level;
    } else if (cell.kind === "commercial") {
      jobs += 36 * cell.level;
      powerDemand += 18 * cell.level;
      hourlyUpkeep += 0.55 * cell.level;
    } else if (cell.kind === "park") {
      parks += cell.level;
      powerDemand += cell.level;
      hourlyUpkeep += 1.35 * cell.level;
    } else if (cell.kind === "civic") {
      civic += cell.level;
      jobs += 12 * cell.level;
      powerDemand += 14 * cell.level;
      hourlyUpkeep += 2.4 * cell.level;
    } else if (cell.kind === "power") {
      powerCapacity += 260 * cell.level;
      jobs += 9 * cell.level;
      hourlyUpkeep += 3.8 * cell.level;
    }
  }

  const connectedRoadCells = connectedRoadCount(state);
  const powerRatio = powerDemand <= 0 ? 1 : Math.min(1, powerCapacity / powerDemand);
  const filledJobs = Math.min(jobs, Math.round(state.population * 0.72));
  const congestion = Math.min(2, state.population / Math.max(roadCells * 2.15, 1));
  const weatherPenalty = state.weather === "rain" ? 2 : state.weather === "fog" ? 1 : 0;
  const happiness = Math.round(Math.max(20, Math.min(
    100,
    58 + parks * 3.8 + civic * 5.5 - Math.max(0, congestion - 0.55) * 19 - (1 - powerRatio) * 42 - weatherPenalty,
  )));
  const hourlyIncome = state.population * 0.18 + filledJobs * 0.11;

  return {
    population: Math.round(state.population),
    populationCapacity,
    jobs,
    filledJobs,
    powerDemand,
    powerCapacity,
    powerRatio,
    happiness,
    roadCells,
    connectedRoadCells,
    congestion,
    hourlyIncome,
    hourlyUpkeep,
    hourlyBalance: hourlyIncome - hourlyUpkeep,
  };
}

export function weatherAt(day: number, minuteOfDay: number): Weather {
  const segment = Math.floor(minuteOfDay / 180);
  const hash = ((day * 1_103_515_245 + segment * 12_345) >>> 8) % 100;
  if (hash < 20) return "rain";
  if (hash < 34) return "fog";
  return "clear";
}

export function simulateCity(state: CityState, realSeconds: number): CityState {
  if (state.speed === 0 || realSeconds <= 0) return state;
  const gameMinutes = realSeconds * state.speed * 10;
  const totalMinutes = state.minuteOfDay + gameMinutes;
  const dayAdvance = Math.floor(totalMinutes / 1_440);
  const minuteOfDay = totalMinutes % 1_440;
  const day = state.day + dayAdvance;
  const weather = weatherAt(day, minuteOfDay);
  const interim = { ...state, day, minuteOfDay, weather };
  const summary = citySummary(interim);
  const jobSupportedPopulation = summary.jobs * 1.72 + 36;
  const powerSupportedCapacity = summary.populationCapacity * summary.powerRatio;
  const targetPopulation = Math.min(summary.populationCapacity, jobSupportedPopulation, powerSupportedCapacity);
  const gameHours = gameMinutes / 60;
  const growthFactor = Math.min(0.35, gameHours * (summary.happiness >= 62 ? 0.085 : 0.035));
  const population = Math.max(0, state.population + (targetPopulation - state.population) * growthFactor);
  const funds = Math.max(0, state.funds + summary.hourlyBalance * gameHours);
  return { ...interim, population, funds };
}

export function formatClock(state: Pick<CityState, "day" | "minuteOfDay">) {
  const hour = Math.floor(state.minuteOfDay / 60) % 24;
  const minute = Math.floor(state.minuteOfDay % 60);
  return {
    day: state.day,
    hour,
    minute,
    text: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export function jumpToTime(state: CityState, minuteOfDay: number): CityState {
  const minute = ((minuteOfDay % 1_440) + 1_440) % 1_440;
  return { ...state, minuteOfDay: minute, weather: weatherAt(state.day, minute) };
}

function isCell(value: unknown, index: number): value is CityCell {
  if (!value || typeof value !== "object") return false;
  const cell = value as Partial<CityCell>;
  const expectedX = index % GRID_SIZE;
  const expectedZ = Math.floor(index / GRID_SIZE);
  return cell.x === expectedX
    && cell.z === expectedZ
    && typeof cell.kind === "string"
    && (cell.kind === "grass" || BUILDING_KINDS.includes(cell.kind as BuildableKind))
    && Number.isInteger(cell.level)
    && cell.level! >= 0
    && cell.level! <= 3
    && typeof cell.placedAt === "number"
    && Number.isFinite(cell.placedAt);
}

export function parseCitySave(raw: string | null): CityState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CityState>;
    if (value.version !== SAVE_VERSION || !Array.isArray(value.cells) || value.cells.length !== GRID_SIZE * GRID_SIZE) {
      return null;
    }
    if (!value.cells.every(isCell)) return null;
    if (
      typeof value.funds !== "number" || !Number.isFinite(value.funds) || value.funds < 0
      || typeof value.population !== "number" || !Number.isFinite(value.population) || value.population < 0
      || !Number.isInteger(value.day) || value.day! < 1
      || typeof value.minuteOfDay !== "number" || value.minuteOfDay < 0 || value.minuteOfDay >= 1_440
      || !([0, 1, 2, 4] as unknown[]).includes(value.speed)
      || !["clear", "rain", "fog"].includes(value.weather ?? "")
      || !Number.isInteger(value.revision) || value.revision! < 0
    ) {
      return null;
    }
    return value as CityState;
  } catch {
    return null;
  }
}

export function serializeCity(state: CityState) {
  return JSON.stringify(state);
}
