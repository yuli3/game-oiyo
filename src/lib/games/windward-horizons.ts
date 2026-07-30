/**
 * Windward Horizons' deterministic sailing and trade rules.
 *
 * The Three.js scene is lazy-loaded behind the voyage button. Navigation,
 * market quotes and cargo transactions stay renderer-free so they can be
 * tested without WebGL.
 */

export type GoodId = "spices" | "silk" | "tea" | "timber";
export type PortId = "azurehaven" | "sunspire" | "jadegate" | "ironcape" | "amberreach";

export interface VesselState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  sail: number;
  rudder: number;
  heel: number;
}

export interface SailingInput {
  throttle: number;
  rudder: number;
}

export interface SailingEnvironment {
  windHeading: number;
  windSpeed: number;
}

export interface PortDefinition {
  id: PortId;
  x: number;
  z: number;
  radius: number;
  marketBias: Record<GoodId, number>;
}

export interface TradeState {
  gold: number;
  cargo: Record<GoodId, number>;
  capacity: number;
  tradeProfit: number;
  visited: PortId[];
}

export interface TradeResult {
  ok: boolean;
  reason: "ok" | "quantity" | "gold" | "capacity" | "cargo";
  state: TradeState;
}

export const VOYAGE_SECONDS = 8 * 60;
export const STARTING_GOLD = 2_400;

export const GOODS: Record<GoodId, { basePrice: number; volume: number }> = {
  spices: { basePrice: 210, volume: 2 },
  silk: { basePrice: 165, volume: 2 },
  tea: { basePrice: 92, volume: 1 },
  timber: { basePrice: 54, volume: 3 },
};

export const PORTS: readonly PortDefinition[] = [
  {
    id: "azurehaven",
    x: 0,
    z: 20,
    radius: 20,
    marketBias: { spices: 1.12, silk: 1.04, tea: 0.88, timber: 0.78 },
  },
  {
    id: "sunspire",
    x: -142,
    z: -88,
    radius: 23,
    marketBias: { spices: 0.70, silk: 0.92, tea: 1.18, timber: 1.26 },
  },
  {
    id: "jadegate",
    x: 142,
    z: -102,
    radius: 21,
    marketBias: { spices: 1.24, silk: 0.68, tea: 0.74, timber: 1.18 },
  },
  {
    id: "ironcape",
    x: 118,
    z: 142,
    radius: 24,
    marketBias: { spices: 1.18, silk: 1.22, tea: 1.04, timber: 0.64 },
  },
  {
    id: "amberreach",
    x: -146,
    z: 136,
    radius: 22,
    marketBias: { spices: 0.82, silk: 1.16, tea: 1.22, timber: 0.92 },
  },
] as const;

const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wrapAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

export function signedAngleDifference(a: number, b: number): number {
  return ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

/**
 * `windHeading` is where the wind travels toward. Running and broad reaches
 * are fast, beam reaches remain useful, and pointing into the source stalls.
 */
export function sailEfficiency(heading: number, windHeading: number): number {
  const relative = Math.abs(signedAngleDifference(heading, windHeading));
  const downwind = Math.max(0, Math.cos(relative));
  const beam = Math.max(0, Math.sin(relative));
  const upwind = Math.max(0, -Math.cos(relative));
  return clamp(0.16 + downwind * 0.68 + beam * 0.76 - upwind * 0.08, 0.08, 1);
}

export function stepVessel(
  state: VesselState,
  input: SailingInput,
  environment: SailingEnvironment,
  deltaSeconds: number,
): VesselState {
  const dt = clamp(deltaSeconds, 0, 0.1);
  const sail = clamp(state.sail + clamp(input.throttle, -1, 1) * dt * 0.34, 0, 1);
  const rudderTarget = clamp(input.rudder, -1, 1);
  const rudder = state.rudder + (rudderTarget - state.rudder) * Math.min(1, dt * 5);
  const efficiency = sailEfficiency(state.heading, environment.windHeading);
  const targetSpeed = environment.windSpeed * 0.42 * sail * efficiency;
  const acceleration = targetSpeed > state.speed ? 0.72 : 0.44;
  const speed = Math.max(0, state.speed + (targetSpeed - state.speed) * Math.min(1, dt * acceleration));
  const turnAuthority = 0.12 + Math.min(speed, 7) * 0.065;
  const heading = wrapAngle(state.heading + rudder * turnAuthority * dt);
  const heelTarget = -rudder * Math.min(0.18, speed * 0.025) +
    signedAngleDifference(environment.windHeading, heading) * 0.018 * sail;
  const heel = state.heel + (heelTarget - state.heel) * Math.min(1, dt * 2.2);

  return {
    x: state.x + Math.sin(heading) * speed * dt,
    z: state.z + Math.cos(heading) * speed * dt,
    heading,
    speed,
    sail,
    rudder,
    heel: clamp(heel, -0.24, 0.24),
  };
}

export function distance2d(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function nearestPort(position: { x: number; z: number }): { port: PortDefinition; distance: number } {
  let port = PORTS[0];
  let distance = distance2d(position, port);
  for (const candidate of PORTS.slice(1)) {
    const nextDistance = distance2d(position, candidate);
    if (nextDistance < distance) {
      port = candidate;
      distance = nextDistance;
    }
  }
  return { port, distance };
}

export function canDock(vessel: VesselState, port: PortDefinition): boolean {
  return distance2d(vessel, port) <= port.radius + 13 && vessel.speed <= 1.25;
}

export function resolveIslandCollision(
  vessel: VesselState,
  port: Pick<PortDefinition, "x" | "z" | "radius">,
): VesselState {
  const dx = vessel.x - port.x;
  const dz = vessel.z - port.z;
  const distance = Math.hypot(dx, dz);
  const minimum = port.radius + 4;
  if (distance >= minimum) return vessel;
  const normalX = distance > 0.001 ? dx / distance : 1;
  const normalZ = distance > 0.001 ? dz / distance : 0;
  return {
    ...vessel,
    x: port.x + normalX * minimum,
    z: port.z + normalZ * minimum,
    speed: Math.min(vessel.speed, 0.7),
  };
}

function marketNoise(port: PortId, good: GoodId, day: number): number {
  const key = `${port}:${good}:${Math.max(0, Math.floor(day))}`;
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return ((hash >>> 0) / 4_294_967_295 - 0.5) * 0.16;
}

export function marketQuote(port: PortDefinition, day: number): Record<GoodId, number> {
  return Object.fromEntries(
    (Object.keys(GOODS) as GoodId[]).map((good) => [
      good,
      Math.max(1, Math.round(GOODS[good].basePrice * port.marketBias[good] * (1 + marketNoise(port.id, good, day)))),
    ]),
  ) as Record<GoodId, number>;
}

export function cargoUsed(cargo: Record<GoodId, number>): number {
  return (Object.keys(GOODS) as GoodId[]).reduce(
    (sum, good) => sum + Math.max(0, Math.floor(cargo[good] ?? 0)) * GOODS[good].volume,
    0,
  );
}

export function createTradeState(): TradeState {
  return {
    gold: STARTING_GOLD,
    cargo: { spices: 0, silk: 0, tea: 0, timber: 0 },
    capacity: 30,
    tradeProfit: 0,
    visited: ["azurehaven"],
  };
}

export function tradeCargo(
  state: TradeState,
  action: "buy" | "sell",
  good: GoodId,
  price: number,
  quantity = 1,
): TradeResult {
  if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "quantity", state };
  }

  const cost = Math.round(price) * quantity;
  if (action === "buy") {
    if (state.gold < cost) return { ok: false, reason: "gold", state };
    if (cargoUsed(state.cargo) + GOODS[good].volume * quantity > state.capacity) {
      return { ok: false, reason: "capacity", state };
    }
    return {
      ok: true,
      reason: "ok",
      state: {
        ...state,
        gold: state.gold - cost,
        cargo: { ...state.cargo, [good]: state.cargo[good] + quantity },
        tradeProfit: state.tradeProfit - cost,
      },
    };
  }

  if (state.cargo[good] < quantity) return { ok: false, reason: "cargo", state };
  return {
    ok: true,
    reason: "ok",
    state: {
      ...state,
      gold: state.gold + cost,
      cargo: { ...state.cargo, [good]: state.cargo[good] - quantity },
      tradeProfit: state.tradeProfit + cost,
    },
  };
}

export function visitPort(state: TradeState, port: PortId): TradeState {
  return state.visited.includes(port) ? state : { ...state, visited: [...state.visited, port] };
}

export function voyageScore(state: TradeState, discoveries: number): number {
  const wealthGain = Math.max(0, state.gold - STARTING_GOLD);
  return Math.round(wealthGain + Math.max(0, discoveries) * 280 + Math.max(0, state.visited.length - 1) * 160);
}

export function formatVoyageTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
