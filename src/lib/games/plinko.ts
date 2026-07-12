// Plinko — logic core, kept independent from the UI/physics rendering.
//
// matter.js owns the actual ball-drop simulation (see Plinko.tsx), so this
// module doesn't re-simulate physics. It owns the parts that need to be
// deterministic and unit-testable: peg layout geometry, the slot payout
// table, score math, and mapping a landed x-position back to a slot index.
// This is points-based (no real currency, no cash-out) — same spirit as
// lotto-generator/dice-roller, just with a physical drop.

export const DEFAULT_ROWS = 9;

export const MIN_BET = 10;
export const MAX_BET = 500;
export const BET_STEP = 10;
export const STARTING_BALANCE = 1000;

export interface PegPosition {
  row: number;
  col: number;
  /** normalized 0..1 across the board width */
  xNorm: number;
  /** normalized 0..1 down the board height */
  yNorm: number;
}

// Classic triangular Plinko pin arrangement: row 0 (top) has a single peg,
// each row below gains one more, so the bottom row has `rows` pegs and the
// gaps between/around them form `rows + 1` slots.
export function generatePegLayout(rows: number = DEFAULT_ROWS): PegPosition[] {
  const pegs: PegPosition[] = [];
  for (let row = 0; row < rows; row++) {
    const pegCount = row + 1;
    const yNorm = (row + 1) / (rows + 1);
    for (let col = 0; col < pegCount; col++) {
      const xNorm = (col + 1) / (pegCount + 1);
      pegs.push({ row, col, xNorm, yNorm });
    }
  }
  return pegs;
}

// n-choose-k via Pascal's triangle (small n here, no need for factorials).
function pascalRow(n: number): number[] {
  let row = [1];
  for (let i = 0; i < n; i++) {
    const next = [1];
    for (let j = 1; j <= i; j++) next.push(row[j - 1] + row[j]);
    next.push(1);
    row = next;
  }
  return row;
}

const MIN_MULTIPLIER = 0.2;
const MAX_MULTIPLIER = 25;

// Payout curve shaped like real Plinko boards: center slots are the most
// probable landing spot (binomial distribution over `rows` peg bounces) so
// they pay out the least; the rare edge slots pay the most. Multiplier is
// inversely proportional to landing probability, then clamped to a sane
// range and rounded to one decimal for a clean UI display.
export function computeSlotMultipliers(rows: number = DEFAULT_ROWS): number[] {
  const binomial = pascalRow(rows); // length rows+1, symmetric
  const maxC = Math.max(...binomial);
  return binomial.map((c) => {
    const rarity = maxC / c;
    const raw = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, rarity * 0.5));
    return Math.round(raw * 10) / 10;
  });
}

export function clampBet(bet: number, min: number = MIN_BET, max: number = MAX_BET): number {
  if (!Number.isFinite(bet)) return min;
  return Math.min(max, Math.max(min, Math.round(bet / BET_STEP) * BET_STEP));
}

export function calculateDropScore(betPoints: number, multiplier: number): number {
  return Math.round(betPoints * multiplier);
}

// Maps the ball's final normalized x-position (0..1 across the board) to a
// slot index once matter.js reports it's crossed the bottom of the board.
export function resolveSlotIndex(xNorm: number, slotCount: number): number {
  const clamped = Math.min(0.999999, Math.max(0, xNorm));
  return Math.floor(clamped * slotCount);
}
