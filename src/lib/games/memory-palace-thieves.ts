export const MEMORY_PALACE_RULESET = "memory-palace-thieves-v1";
export const MEMORY_PALACE_WIDTH = 9;
export const MEMORY_PALACE_HEIGHT = 7;
export const MEMORY_PALACE_OBSERVE_TURNS = 12;

export type PalacePoint = Readonly<{ x: number; y: number }>;
export type PalaceDirection = "up" | "down" | "left" | "right" | "wait";
export type PalacePhase = "observing" | "infiltrating" | "escaped" | "caught";

export type MemoryPalaceState = Readonly<{
  seed: number;
  phase: PalacePhase;
  turn: number;
  observationTurn: number;
  player: PalacePoint;
  guard: PalacePoint;
  artifact: PalacePoint;
  carrying: boolean;
  alarms: number;
  reveals: number;
}>;

const WALLS = new Set([
  "0,0","1,0","2,0","3,0","4,0","5,0","6,0","7,0","8,0",
  "0,1","4,1","8,1","0,2","2,2","4,2","6,2","8,2",
  "0,3","2,3","6,3","8,3","0,4","2,4","4,4","6,4","8,4",
  "0,5","4,5","8,5","0,6","1,6","2,6","3,6","4,6","5,6","6,6","7,6","8,6",
]);

const PATROLS: readonly (readonly PalacePoint[])[] = [
  [{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5},{x:6,y:5},{x:5,y:5},{x:5,y:4},{x:5,y:3},{x:5,y:2}],
  [{x:3,y:1},{x:3,y:2},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:5,y:4},{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:3,y:4},{x:3,y:3},{x:3,y:2}],
  [{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:3,y:2},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:5,y:2},{x:5,y:1},{x:4,y:1},{x:3,y:1},{x:2,y:1}],
];

export const MEMORY_PALACE_EXIT: PalacePoint = Object.freeze({x:1,y:5});

export function isPalaceWall(point: PalacePoint): boolean {
  return point.x < 0 || point.y < 0 || point.x >= MEMORY_PALACE_WIDTH || point.y >= MEMORY_PALACE_HEIGHT || WALLS.has(`${point.x},${point.y}`);
}

export function palacePatrol(seed: number): readonly PalacePoint[] {
  const base = PATROLS[0]!;
  const offset = Math.abs(Math.trunc(seed)) % base.length;
  return [...base.slice(offset), ...base.slice(0, offset)];
}

export function createMemoryPalace(seed: number): MemoryPalaceState {
  const patrol = palacePatrol(seed);
  return {
    seed: Math.trunc(seed), phase:"observing", turn:0, observationTurn:0,
    player:MEMORY_PALACE_EXIT, guard:patrol[0]!, artifact:{x:7,y:5},
    carrying:false, alarms:0, reveals:2,
  };
}

export function palaceLineOfSight(guard: PalacePoint, player: PalacePoint): boolean {
  if (guard.x !== player.x && guard.y !== player.y) return false;
  const dx = Math.sign(player.x - guard.x);
  const dy = Math.sign(player.y - guard.y);
  let x = guard.x + dx;
  let y = guard.y + dy;
  while (x !== player.x || y !== player.y) {
    if (isPalaceWall({x,y})) return false;
    x += dx; y += dy;
  }
  return true;
}

export function observeMemoryPalace(state: MemoryPalaceState): MemoryPalaceState {
  if (state.phase !== "observing") return state;
  const observationTurn = state.observationTurn + 1;
  const patrol = palacePatrol(state.seed);
  if (observationTurn >= MEMORY_PALACE_OBSERVE_TURNS) {
    return {...state, phase:"infiltrating", observationTurn, guard:patrol[0]!};
  }
  return {...state, observationTurn, guard:patrol[observationTurn % patrol.length]!};
}

const DELTA: Record<PalaceDirection, PalacePoint> = {
  up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0}, wait:{x:0,y:0},
};

export function moveMemoryPalace(state: MemoryPalaceState, direction: PalaceDirection): MemoryPalaceState {
  if (state.phase !== "infiltrating") return state;
  const delta = DELTA[direction];
  const candidate = {x:state.player.x + delta.x, y:state.player.y + delta.y};
  const player = isPalaceWall(candidate) ? state.player : candidate;
  const turn = state.turn + 1;
  const patrol = palacePatrol(state.seed);
  const guard = patrol[turn % patrol.length]!;
  const carrying = state.carrying || (player.x === state.artifact.x && player.y === state.artifact.y);
  const escaped = carrying && player.x === MEMORY_PALACE_EXIT.x && player.y === MEMORY_PALACE_EXIT.y;
  const caught = (guard.x === player.x && guard.y === player.y) || palaceLineOfSight(guard, player);
  return {...state, player, guard, carrying, turn, phase:escaped ? "escaped" : caught ? "caught" : "infiltrating", alarms:state.alarms + (caught ? 1 : 0)};
}

export function revealMemoryPalace(state: MemoryPalaceState): MemoryPalaceState {
  return state.phase === "infiltrating" && state.reveals > 0 ? {...state, reveals:state.reveals - 1} : state;
}

export function memoryPalaceFingerprint(state: MemoryPalaceState): string {
  return JSON.stringify({ruleset:MEMORY_PALACE_RULESET,...state});
}
