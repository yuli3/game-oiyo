/**
 * Hexa Sort 3D Core Game Logic
 * Pure logic engine for hexagonal tile sorting, stack transfers, cascading merges, and clears.
 */

export type HexColor = "red" | "blue" | "yellow" | "green" | "purple" | "orange";

export const HEX_COLORS: readonly HexColor[] = [
  "red",
  "blue",
  "yellow",
  "green",
  "purple",
  "orange",
] as const;

export const HEX_COLOR_HEXES: Record<HexColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
  green: "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
};

export interface HexSlot {
  id: string;
  q: number;
  r: number;
  stack: HexColor[]; // bottom to top (stack[stack.length - 1] is top tile)
  neighbors: string[];
}

export interface HandSlot {
  id: string;
  stack: HexColor[];
}

export interface HexaSortGameState {
  level: number;
  score: number;
  targetClears: number;
  completedClears: number;
  slots: Record<string, HexSlot>;
  hand: (HandSlot | null)[];
  status: "playing" | "level_completed" | "game_over";
  comboCount: number;
}

// 7-Hex cluster layout (Radius 1)
// Center (0, 0) and 6 ring neighbors
const HEX_GRID_LAYOUT: Array<{ id: string; q: number; r: number }> = [
  { id: "c", q: 0, r: 0 },
  { id: "n1", q: 1, r: 0 },
  { id: "n2", q: 1, r: -1 },
  { id: "n3", q: 0, r: -1 },
  { id: "n4", q: -1, r: 0 },
  { id: "n5", q: -1, r: 1 },
  { id: "n6", q: 0, r: 1 },
];

function areNeighbors(a: { q: number; r: number }, b: { q: number; r: number }): boolean {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -a.q - a.r - (-b.q - b.r);
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) === 1;
}

export function buildHexGrid(): Record<string, HexSlot> {
  const slots: Record<string, HexSlot> = {};

  for (const item of HEX_GRID_LAYOUT) {
    slots[item.id] = {
      id: item.id,
      q: item.q,
      r: item.r,
      stack: [],
      neighbors: [],
    };
  }

  // Calculate adjacency
  for (const slotA of Object.values(slots)) {
    for (const slotB of Object.values(slots)) {
      if (slotA.id !== slotB.id && areNeighbors(slotA, slotB)) {
        slotA.neighbors.push(slotB.id);
      }
    }
  }

  return slots;
}

function getRandomColor(colors: readonly HexColor[], seedOffset: number): HexColor {
  const idx = Math.abs(Math.sin(seedOffset * 9301 + 49297)) * colors.length;
  return colors[Math.floor(idx) % colors.length];
}

export function generateHandSlots(level: number, seed: number): HandSlot[] {
  const colorCount = Math.min(HEX_COLORS.length, 3 + Math.floor(level / 2));
  const activeColors = HEX_COLORS.slice(0, colorCount);

  return [0, 1, 2].map((slotIdx) => {
    const stackSize = 2 + ((seed + slotIdx) % 3); // 2 to 4 tiles
    const primaryColor = getRandomColor(activeColors, seed * 13 + slotIdx * 7);
    const secondaryColor = getRandomColor(activeColors, seed * 17 + slotIdx * 11);

    const stack: HexColor[] = [];
    for (let i = 0; i < stackSize; i++) {
      stack.push(i < 2 ? primaryColor : secondaryColor);
    }

    return {
      id: `hand-${slotIdx}`,
      stack,
    };
  });
}

export function createInitialHexaSortGame(level: number = 1, seed: number = 42): HexaSortGameState {
  const slots = buildHexGrid();
  const hand = generateHandSlots(level, seed);

  return {
    level,
    score: 0,
    targetClears: 3 + level * 2,
    completedClears: 0,
    slots,
    hand,
    status: "playing",
    comboCount: 0,
  };
}

export function canPlaceStack(state: HexaSortGameState, handIndex: number, slotId: string): boolean {
  if (state.status !== "playing") return false;
  const handSlot = state.hand[handIndex];
  if (!handSlot || handSlot.stack.length === 0) return false;

  const targetSlot = state.slots[slotId];
  if (!targetSlot) return false;

  // Can place in empty slot, or if slot has space (< 15 tiles)
  return targetSlot.stack.length + handSlot.stack.length <= 16;
}

export interface CascadeStep {
  fromSlotId: string;
  toSlotId: string;
  color: HexColor;
  count: number;
}

export interface ClearEvent {
  slotId: string;
  color: HexColor;
  count: number;
}

export interface MoveResolution {
  nextState: HexaSortGameState;
  cascades: CascadeStep[];
  clears: ClearEvent[];
}

export function resolveStackMerges(state: HexaSortGameState, targetSlotId: string): MoveResolution {
  let slots = { ...state.slots };
  for (const key of Object.keys(slots)) {
    slots[key] = { ...slots[key], stack: [...slots[key].stack] };
  }

  const cascades: CascadeStep[] = [];
  const clears: ClearEvent[] = [];
  let scoreGain = 0;
  let comboCount = state.comboCount;

  let changed = true;
  let iteration = 0;

  while (changed && iteration < 15) {
    changed = false;
    iteration++;

    // Check all slots that have tiles
    for (const slotId of Object.keys(slots)) {
      const slot = slots[slotId];
      if (slot.stack.length === 0) continue;

      const topColor = slot.stack[slot.stack.length - 1];

      // Check all neighbors
      for (const neighborId of slot.neighbors) {
        const neighbor = slots[neighborId];
        if (neighbor.stack.length === 0) continue;

        const neighborTopColor = neighbor.stack[neighbor.stack.length - 1];
        if (neighborTopColor === topColor) {
          // Transfer matching top tiles from neighbor into slot
          let transferCount = 0;
          while (
            neighbor.stack.length > 0 &&
            neighbor.stack[neighbor.stack.length - 1] === topColor &&
            slot.stack.length < 20
          ) {
            neighbor.stack.pop();
            slot.stack.push(topColor);
            transferCount++;
          }

          if (transferCount > 0) {
            cascades.push({
              fromSlotId: neighborId,
              toSlotId: slotId,
              color: topColor,
              count: transferCount,
            });
            scoreGain += transferCount * 10 * (1 + comboCount * 0.2);
            changed = true;
            break;
          }
        }
      }

      // Check for 10-stack clear
      if (slot.stack.length >= 10) {
        const clearTopColor = slot.stack[slot.stack.length - 1];
        // Count consecutive matching colors from top
        let matchCount = 0;
        for (let i = slot.stack.length - 1; i >= 0; i--) {
          if (slot.stack[i] === clearTopColor) {
            matchCount++;
          } else {
            break;
          }
        }

        if (matchCount >= 10) {
          // Remove 10 matching tiles
          slot.stack.splice(slot.stack.length - 10, 10);
          comboCount++;
          scoreGain += 150 * comboCount;
          clears.push({
            slotId,
            color: clearTopColor,
            count: 10,
          });
          changed = true;
        }
      }
    }
  }

  const nextClears = state.completedClears + clears.length;
  let status = state.status;
  if (nextClears >= state.targetClears) {
    status = "level_completed";
  }

  return {
    nextState: {
      ...state,
      slots,
      score: Math.round(state.score + scoreGain),
      completedClears: nextClears,
      status,
      comboCount: clears.length > 0 ? comboCount : 0,
    },
    cascades,
    clears,
  };
}

export function placeAndResolve(
  state: HexaSortGameState,
  handIndex: number,
  slotId: string
): MoveResolution | null {
  if (!canPlaceStack(state, handIndex, slotId)) return null;

  const handSlot = state.hand[handIndex];
  if (!handSlot) return null;

  // 1. Place hand stack into slot
  const nextSlots = { ...state.slots };
  const targetSlot = nextSlots[slotId];
  nextSlots[slotId] = {
    ...targetSlot,
    stack: [...targetSlot.stack, ...handSlot.stack],
  };

  const nextHand = [...state.hand];
  nextHand[handIndex] = null;

  // Replenish hand if all slots are empty
  const allEmpty = nextHand.every((h) => h === null);
  const refreshedHand = allEmpty
    ? generateHandSlots(state.level, Date.now())
    : nextHand;

  const intermediateState: HexaSortGameState = {
    ...state,
    slots: nextSlots,
    hand: refreshedHand,
  };

  // 2. Resolve cascades and stack clears
  const resolution = resolveStackMerges(intermediateState, slotId);

  // 3. Check for game over (all board slots full and cannot place any remaining hand)
  const isBoardFull = Object.values(resolution.nextState.slots).every(
    (s) => s.stack.length >= 15
  );
  if (isBoardFull && resolution.nextState.status === "playing") {
    resolution.nextState.status = "game_over";
  }

  return resolution;
}
