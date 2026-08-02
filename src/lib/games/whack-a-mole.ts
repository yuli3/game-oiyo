export type WhackCritter = "mole" | "bomb" | null;
export type WhackStatus = "playing" | "over";
export type WhackAction = { kind: "advance"; elapsedMs: number } | { kind: "hit"; index: number };

export interface WhackState {
  seed: number;
  rng: number;
  cells: WhackCritter[];
  status: WhackStatus;
  elapsedMs: number;
  nextSpawnAtMs: number;
  score: number;
  moleHits: number;
  bombHits: number;
  escaped: number;
  combo: number;
  maxCombo: number;
  history: WhackAction[];
}

export const WHACK_DURATION_MS = 30_000;
const HOLES = 9;

const random = (rng: number) => {
  const state = (Math.imul(rng, 1_664_525) + 1_013_904_223) >>> 0;
  return { state, value: state / 0x1_0000_0000 };
};

const paceAt = (elapsedMs: number) => Math.max(430, 780 - elapsedMs * 0.012);

export function createWhackGame(seed: number): WhackState {
  return {
    seed: seed >>> 0,
    rng: seed >>> 0,
    cells: Array<WhackCritter>(HOLES).fill(null),
    status: "playing",
    elapsedMs: 0,
    nextSpawnAtMs: 0,
    score: 0,
    moleHits: 0,
    bombHits: 0,
    escaped: 0,
    combo: 0,
    maxCombo: 0,
    history: [],
  };
}

function spawnOnce(state: WhackState, atMs: number): WhackState {
  const cells = [...state.cells];
  let rng = state.rng;
  let escaped = state.escaped;
  for (let index = 0; index < HOLES; index += 1) {
    if (!cells[index]) continue;
    const roll = random(rng); rng = roll.state;
    if (roll.value < 0.5) {
      if (cells[index] === "mole") escaped += 1;
      cells[index] = null;
    }
  }
  let roll = random(rng); rng = roll.state;
  const count = 1 + (roll.value < Math.min(0.7, 0.2 + atMs / 40_000) ? 1 : 0);
  for (let n = 0; n < count; n += 1) {
    const empty = cells.flatMap((cell, index) => cell === null ? [index] : []);
    if (!empty.length) break;
    roll = random(rng); rng = roll.state;
    const index = empty[Math.floor(roll.value * empty.length)];
    roll = random(rng); rng = roll.state;
    cells[index] = roll.value < 0.18 ? "bomb" : "mole";
  }
  return { ...state, cells, rng, escaped, nextSpawnAtMs: atMs + paceAt(atMs) };
}

export function advanceWhack(state: WhackState, elapsedMs: number): WhackState {
  if (state.status !== "playing" || !Number.isFinite(elapsedMs)) return state;
  const target = Math.max(state.elapsedMs, Math.min(WHACK_DURATION_MS, Math.floor(elapsedMs)));
  let next = state;
  while (next.nextSpawnAtMs <= target && next.nextSpawnAtMs < WHACK_DURATION_MS) {
    next = spawnOnce(next, next.nextSpawnAtMs);
  }
  const status: WhackStatus = target >= WHACK_DURATION_MS ? "over" : "playing";
  return { ...next, elapsedMs: target, status, cells: status === "over" ? Array(HOLES).fill(null) : next.cells, history: [...state.history, { kind: "advance", elapsedMs: target }] };
}

export function hitWhack(state: WhackState, index: number): WhackState {
  if (state.status !== "playing" || !Number.isInteger(index) || index < 0 || index >= HOLES || !state.cells[index]) return state;
  const target = state.cells[index];
  const cells = [...state.cells]; cells[index] = null;
  const combo = target === "mole" ? state.combo + 1 : 0;
  return {
    ...state,
    cells,
    score: target === "mole" ? state.score + 1 : Math.max(0, state.score - 2),
    moleHits: state.moleHits + (target === "mole" ? 1 : 0),
    bombHits: state.bombHits + (target === "bomb" ? 1 : 0),
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    history: [...state.history, { kind: "hit", index }],
  };
}

export function replayWhack(seed: number, history: readonly WhackAction[]): WhackState | null {
  let state = createWhackGame(seed);
  for (const action of history) {
    const previousLength = state.history.length;
    state = action.kind === "advance" ? advanceWhack(state, action.elapsedMs) : hitWhack(state, action.index);
    if (state.history.length !== previousLength + 1) return null;
  }
  return state;
}

export function whackAnalysis(state: WhackState) {
  const attempts = state.moleHits + state.bombHits + state.escaped;
  return { accuracy: attempts ? Math.round(state.moleHits / attempts * 100) : 0, hits: state.moleHits, bombs: state.bombHits, escaped: state.escaped, maxCombo: state.maxCombo };
}
