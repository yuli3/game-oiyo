/**
 * Water Sort 3D Physics - Pure Core Game Logic
 *
 * Inspired by global hypercasual hit Water Sort Puzzle,
 * elevated with 3D beaker tilt physics, meniscus layers, and liquid transfer mechanics.
 */

export type LiquidColor =
  | "crimson"
  | "azure"
  | "emerald"
  | "amber"
  | "amethyst"
  | "coral"
  | "teal"
  | "indigo";

export const COLOR_CONFIG: Record<LiquidColor, { hex: string; name: { ko: string; en: string } }> = {
  crimson: { hex: "#ef4444", name: { ko: "크림슨 레드", en: "Crimson Red" } },
  azure: { hex: "#3b82f6", name: { ko: "아주르 블루", en: "Azure Blue" } },
  emerald: { hex: "#10b981", name: { ko: "에메랄드 그린", en: "Emerald Green" } },
  amber: { hex: "#f59e0b", name: { ko: "앰버 옐로", en: "Amber Yellow" } },
  amethyst: { hex: "#8b5cf6", name: { ko: "아메지스트 퍼플", en: "Amethyst Purple" } },
  coral: { hex: "#f97316", name: { ko: "코랄 오렌지", en: "Coral Orange" } },
  teal: { hex: "#14b8a6", name: { ko: "틸 민트", en: "Teal Mint" } },
  indigo: { hex: "#6366f1", name: { ko: "인디고 네이비", en: "Indigo Navy" } },
};

export const TUBE_CAPACITY = 4;

export interface Tube {
  id: string;
  layers: LiquidColor[]; // bottom-to-top, max length 4
}

export interface WaterSortState {
  level: number;
  tubes: Tube[];
  selectedTubeIndex: number | null;
  history: Tube[][];
  moves: number;
  status: "playing" | "level_cleared";
}

/**
 * Initializes a Water Sort puzzle for a given level.
 * Level 1: 4 tubes (3 filled with 2-3 colors shuffled, 1 empty).
 * Level 2+: 5~7 tubes (more colors, 2 empty buffer tubes).
 */
export function initWaterSort(level = 1): WaterSortState {
  const colorPool: LiquidColor[] = [
    "crimson",
    "azure",
    "emerald",
    "amber",
    "amethyst",
    "coral",
  ];

  const numColors = Math.min(3 + level, colorPool.length);
  const activeColors = colorPool.slice(0, numColors);
  const numEmptyTubes = level >= 3 ? 2 : level >= 1 ? 2 : 1;

  // Create 4 units of each active color
  const allUnits: LiquidColor[] = [];
  for (const color of activeColors) {
    for (let i = 0; i < TUBE_CAPACITY; i++) {
      allUnits.push(color);
    }
  }

  // Shuffle deterministically seeded by level
  shuffleArray(allUnits, level * 1337);

  const tubes: Tube[] = [];
  for (let t = 0; t < numColors; t++) {
    const layers = allUnits.slice(t * TUBE_CAPACITY, (t + 1) * TUBE_CAPACITY);
    tubes.push({ id: `tube_${t + 1}`, layers });
  }

  // Add empty buffer tubes
  for (let e = 0; e < numEmptyTubes; e++) {
    tubes.push({ id: `tube_empty_${e + 1}`, layers: [] });
  }

  return {
    level,
    tubes,
    selectedTubeIndex: null,
    history: [],
    moves: 0,
    status: "playing",
  };
}

function shuffleArray<T>(arr: T[], seed: number): void {
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
}

/**
 * Gets the top color of a tube and the count of contiguous identical units.
 */
export function getTopSegment(tube: Tube): { color: LiquidColor; count: number } | null {
  if (tube.layers.length === 0) return null;
  const topColor = tube.layers[tube.layers.length - 1]!;
  let count = 0;
  for (let i = tube.layers.length - 1; i >= 0; i--) {
    if (tube.layers[i] === topColor) {
      count++;
    } else {
      break;
    }
  }
  return { color: topColor, count };
}

/**
 * Validates if pouring from fromIdx to toIdx is permissible by water sort rules.
 */
export function canPour(tubes: Tube[], fromIdx: number, toIdx: number): boolean {
  if (fromIdx === toIdx) return false;
  const from = tubes[fromIdx];
  const to = tubes[toIdx];
  if (!from || !to) return false;
  if (from.layers.length === 0) return false; // Source empty
  if (to.layers.length >= TUBE_CAPACITY) return false; // Destination full

  // If destination is empty, pouring is always valid
  if (to.layers.length === 0) return true;

  // Colors must match
  const fromTop = getTopSegment(from);
  const toTop = getTopSegment(to);
  if (!fromTop || !toTop) return false;

  return fromTop.color === toTop.color;
}

/**
 * Executes a liquid transfer between tubes.
 */
export function pourLiquid(
  state: WaterSortState,
  fromIdx: number,
  toIdx: number
): {
  state: WaterSortState;
  pouredUnits: number;
  pouredColor: LiquidColor | null;
} {
  if (state.status !== "playing") {
    return { state, pouredUnits: 0, pouredColor: null };
  }

  if (!canPour(state.tubes, fromIdx, toIdx)) {
    return { state: { ...state, selectedTubeIndex: null }, pouredUnits: 0, pouredColor: null };
  }

  // Clone tubes
  const newTubes: Tube[] = state.tubes.map((t) => ({ ...t, layers: [...t.layers] }));
  const fromTube = newTubes[fromIdx]!;
  const toTube = newTubes[toIdx]!;

  const fromTop = getTopSegment(fromTube)!;
  const availableSpace = TUBE_CAPACITY - toTube.layers.length;
  const unitsToTransfer = Math.min(fromTop.count, availableSpace);

  for (let i = 0; i < unitsToTransfer; i++) {
    fromTube.layers.pop();
    toTube.layers.push(fromTop.color);
  }

  // Record history for Undo
  const currentSnap: Tube[] = state.tubes.map((t) => ({ ...t, layers: [...t.layers] }));
  const newHistory = [...state.history, currentSnap];

  // Check victory condition:
  // Every tube is either empty OR has 4 units of single uniform color
  const isCleared = checkVictory(newTubes);

  return {
    state: {
      ...state,
      tubes: newTubes,
      selectedTubeIndex: null,
      history: newHistory,
      moves: state.moves + 1,
      status: isCleared ? "level_cleared" : "playing",
    },
    pouredUnits: unitsToTransfer,
    pouredColor: fromTop.color,
  };
}

/**
 * Checks if every tube is completely resolved.
 */
export function checkVictory(tubes: Tube[]): boolean {
  for (const tube of tubes) {
    if (tube.layers.length === 0) continue; // Empty tube is valid
    if (tube.layers.length !== TUBE_CAPACITY) return false; // Incomplete tube

    const firstColor = tube.layers[0]!;
    if (!tube.layers.every((c) => c === firstColor)) return false; // Mixed colors
  }
  return true;
}

/**
 * Handles user selecting a tube (first tap selects, second tap pours).
 */
export function selectTube(
  state: WaterSortState,
  tubeIndex: number
): {
  state: WaterSortState;
  action: "selected" | "deselected" | "poured" | "invalid";
  pouredUnits?: number;
  pouredColor?: LiquidColor | null;
} {
  if (state.status !== "playing") {
    return { state, action: "invalid" };
  }

  // If no tube selected yet
  if (state.selectedTubeIndex === null) {
    const tube = state.tubes[tubeIndex];
    if (!tube || tube.layers.length === 0) {
      return { state, action: "invalid" }; // Cannot select empty tube
    }
    return {
      state: { ...state, selectedTubeIndex: tubeIndex },
      action: "selected",
    };
  }

  // If clicking same tube, deselect
  if (state.selectedTubeIndex === tubeIndex) {
    return {
      state: { ...state, selectedTubeIndex: null },
      action: "deselected",
    };
  }

  // Attempt pour
  const fromIdx = state.selectedTubeIndex;
  const toIdx = tubeIndex;

  if (canPour(state.tubes, fromIdx, toIdx)) {
    const result = pourLiquid(state, fromIdx, toIdx);
    return {
      state: result.state,
      action: "poured",
      pouredUnits: result.pouredUnits,
      pouredColor: result.pouredColor,
    };
  }

  // If target tube has liquid of another color, switch selection to it
  const targetTube = state.tubes[tubeIndex];
  if (targetTube && targetTube.layers.length > 0) {
    return {
      state: { ...state, selectedTubeIndex: tubeIndex },
      action: "selected",
    };
  }

  // Otherwise deselect
  return {
    state: { ...state, selectedTubeIndex: null },
    action: "deselected",
  };
}

/**
 * Undo last move.
 */
export function undoMove(state: WaterSortState): WaterSortState {
  if (state.history.length === 0 || state.status !== "playing") return state;
  const prevSnap = state.history[state.history.length - 1]!;
  const newHistory = state.history.slice(0, state.history.length - 1);

  return {
    ...state,
    tubes: prevSnap.map((t) => ({ ...t, layers: [...t.layers] })),
    selectedTubeIndex: null,
    history: newHistory,
    moves: Math.max(0, state.moves - 1),
  };
}
