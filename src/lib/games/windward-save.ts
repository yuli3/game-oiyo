import {
  GOODS,
  PORTS,
  VOYAGE_SECONDS,
  cargoUsed,
  type GoodId,
  type PortId,
  type TradeState,
  type VesselState,
} from "./windward-horizons";

/**
 * Fail-closed active-voyage save.
 *
 * The wind is not random per session — it is a deterministic function of
 * `elapsedSeconds` (see `OceanWorld`'s `useFrame`), so persisting a single
 * elapsed value is enough to reconstruct it exactly on restore, without
 * needing to snapshot the environment separately.
 */

export const WINDWARD_SAVE_KEY = "oiyo:windward-horizons-state:v1";

const DISCOVERY_MARK_IDS = new Set(["astral-arch", "whale-road", "moon-bell"]);
const PORT_IDS = new Set(PORTS.map((port) => port.id));
const GOOD_IDS = Object.keys(GOODS) as GoodId[];
const CAPACITY = 30;

export interface WindwardSaveV1 {
  version: 1;
  vessel: VesselState;
  trade: TradeState;
  foundMarks: string[];
  elapsedSeconds: number;
  savedAtEpochMs: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const inRange = (value: unknown, min: number, max: number): value is number =>
  isFiniteNumber(value) && value >= min && value <= max;
const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function isValidVessel(value: unknown): value is VesselState {
  if (!isRecord(value)) return false;
  return (
    inRange(value.x, -400, 400) &&
    inRange(value.z, -400, 400) &&
    inRange(value.heading, 0, Math.PI * 2) &&
    inRange(value.speed, 0, 25) &&
    inRange(value.sail, 0, 1) &&
    inRange(value.rudder, -1, 1) &&
    inRange(value.heel, -0.24, 0.24)
  );
}

function isValidTrade(value: unknown): value is TradeState {
  if (!isRecord(value)) return false;
  if (value.capacity !== CAPACITY) return false;
  if (!inRange(value.gold, 0, 10_000_000)) return false;
  if (!inRange(value.tradeProfit, -10_000_000, 10_000_000)) return false;
  if (!isRecord(value.cargo)) return false;
  for (const good of GOOD_IDS) {
    if (!isInt(value.cargo[good], 0, CAPACITY)) return false;
  }
  if (cargoUsed(value.cargo as Record<GoodId, number>) > CAPACITY) return false;
  if (!Array.isArray(value.visited) || value.visited.length === 0) return false;
  const visited = value.visited as unknown[];
  if (!visited.every((port) => typeof port === "string" && PORT_IDS.has(port as PortId))) return false;
  if (new Set(visited).size !== visited.length) return false; // no duplicate visits
  return visited[0] === "azurehaven"; // every voyage starts here
}

export function parseWindwardSave(raw: string | null, now = Date.now()): WindwardSaveV1 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return null;
    if (!isInt(value.savedAtEpochMs, 0, now + 300_000)) return null;
    if (!inRange(value.elapsedSeconds, 0, VOYAGE_SECONDS)) return null;
    if (!isValidVessel(value.vessel)) return null;
    if (!isValidTrade(value.trade)) return null;
    if (!Array.isArray(value.foundMarks)) return null;
    const foundMarks = value.foundMarks as unknown[];
    if (!foundMarks.every((id) => typeof id === "string" && DISCOVERY_MARK_IDS.has(id))) return null;
    if (new Set(foundMarks).size !== foundMarks.length) return null;

    return {
      version: 1,
      vessel: value.vessel as VesselState,
      trade: value.trade as TradeState,
      foundMarks: foundMarks as string[],
      elapsedSeconds: value.elapsedSeconds as number,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeWindwardSave(save: Omit<WindwardSaveV1, "version">): string {
  return JSON.stringify({ version: 1, ...save });
}

export function loadWindwardSave(
  now = Date.now(),
  storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): WindwardSaveV1 | null {
  if (!storage) return null;
  try {
    return parseWindwardSave(storage.getItem(WINDWARD_SAVE_KEY), now);
  } catch {
    return null;
  }
}

export function storeWindwardSave(
  save: Omit<WindwardSaveV1, "version">,
  storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): void {
  if (!storage) return;
  try {
    storage.setItem(WINDWARD_SAVE_KEY, serializeWindwardSave(save));
  } catch {
    /* best-effort local active state */
  }
}

export function clearWindwardSave(
  storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): void {
  if (!storage) return;
  try {
    storage.removeItem(WINDWARD_SAVE_KEY);
  } catch {
    /* best-effort local active state */
  }
}
