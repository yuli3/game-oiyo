// Townscaper Island Builder (#141) — 8x8 coastal isometric grid with deterministic
// Wave Function Collapse (WFC) neighbor-bitmask architectural rules.
// WHY: Inspired by Townscaper's zero-friction procedural architecture where clicking
// water places a Stone Quay and stacking blocks automatically forms Cottages, Arches,
// Gardens, and Lighthouses.

export type PaletteKey = 'coral' | 'sunflower' | 'mint' | 'cobalt' | 'ivory';

export type ArchFeature =
  | 'water'
  | 'quay'
  | 'cottage'
  | 'arch-bridge'
  | 'courtyard-garden'
  | 'gabled-manor'
  | 'lighthouse';

export interface IslandCell {
  row: number;
  col: number;
  height: number; // 0 = water, 1 = quay, 2..5 = stacked stories
  palette: PaletteKey;
  feature: ArchFeature;
  neighborMask: number; // 4-bit N/E/S/W mask of built neighbors
  seagullPerched: boolean;
}

export interface IslandChallenge {
  id: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  check: (grid: IslandCell[][]) => boolean;
}

export interface TownscaperState {
  grid: IslandCell[][];
  selectedPalette: PaletteKey;
  toolMode: 'build' | 'demolish';
  totalBlocks: number;
  completedChallenges: string[];
  lastActionNoteKo: string;
  lastActionNoteEn: string;
}

export const ISLAND_SIZE = 8;
export const MAX_TOWER_HEIGHT = 5;

export const PALETTE_SPECS: Record<
  PaletteKey,
  { nameKo: string; nameEn: string; hexRoof: string; hexWall: string }
> = {
  coral: {
    nameKo: '산호 테라코타',
    nameEn: 'Coral Terracotta',
    hexRoof: '#e11d48',
    hexWall: '#fda4af',
  },
  sunflower: {
    nameKo: '해바라기 골드',
    nameEn: 'Sunflower Gold',
    hexRoof: '#d97706',
    hexWall: '#fde68a',
  },
  mint: {
    nameKo: '에게해 민트',
    nameEn: 'Aegean Mint',
    hexRoof: '#059669',
    hexWall: '#a7f3d0',
  },
  cobalt: {
    nameKo: '산토리니 코발트',
    nameEn: 'Santorini Cobalt',
    hexRoof: '#2563eb',
    hexWall: '#bfdbfe',
  },
  ivory: {
    nameKo: '회벽 아이보리',
    nameEn: 'Whitewash Ivory',
    hexRoof: '#475569',
    hexWall: '#f8fafc',
  },
};

export const ISLAND_CHALLENGES: IslandChallenge[] = [
  {
    id: 'lighthouse-spire',
    titleKo: '등대지기 첨탑 (5층)',
    titleEn: 'Lighthouse Spire (5F)',
    descKo: '단독 타일을 높이 5층까지 쌓아 바닷가 등대(Lighthouse)를 자동 생성하세요.',
    descEn: 'Stack a tower to height 5 to procedurally crown it with a coastal Lighthouse.',
    check: (grid) =>
      grid.some((row) => row.some((cell) => cell.feature === 'lighthouse')),
  },
  {
    id: 'canal-arch',
    titleKo: '운하 아치교 (Arch Bridge)',
    titleEn: 'Canal Arch Bridge',
    descKo: '양옆에 건물이 있는 수로 위를 2층 이상 쌓아 아치형 운하 다리를 형성하세요.',
    descEn: 'Build height >= 2 between two opposing neighbors to form a vaulted Arch Bridge.',
    check: (grid) =>
      grid.some((row) => row.some((cell) => cell.feature === 'arch-bridge')),
  },
  {
    id: 'enclosed-garden',
    titleKo: '중정 정원 (Courtyard Garden)',
    titleEn: 'Enclosed Courtyard Garden',
    descKo: '동·서·남·북 4방향이 모두 건물로 둘러싸인 1층 안뜰을 만들어 정원을 피우세요.',
    descEn: 'Surround a 1-story Quay on all 4 cardinal sides to bloom a Courtyard Garden.',
    check: (grid) =>
      grid.some((row) => row.some((cell) => cell.feature === 'courtyard-garden')),
  },
];

function computeNeighborMask(grid: IslandCell[][], r: number, c: number): number {
  let mask = 0;
  if (r > 0 && grid[r - 1][c].height > 0) mask |= 1; // North
  if (c < ISLAND_SIZE - 1 && grid[r][c + 1].height > 0) mask |= 2; // East
  if (r < ISLAND_SIZE - 1 && grid[r + 1][c].height > 0) mask |= 4; // South
  if (c > 0 && grid[r][c - 1].height > 0) mask |= 8; // West
  return mask;
}

function classifyArchFeature(
  height: number,
  mask: number,
  r: number,
  c: number,
  grid: IslandCell[][]
): ArchFeature {
  if (height <= 0) return 'water';

  // Height 5 automatically crowns a coastal Lighthouse
  if (height >= 5) return 'lighthouse';

  // Height 1 surrounded on all 4 cardinal sides (mask === 15) becomes an Enclosed Courtyard Garden
  if (height === 1 && mask === 15) return 'courtyard-garden';

  if (height === 1) return 'quay';

  // Opposing E-W (2|8 = 10) or N-S (1|4 = 5) neighbors at height >= 2 form a vaulted Arch Bridge
  const hasEW = (mask & 10) === 10 && (mask & 5) === 0;
  const hasNS = (mask & 5) === 5 && (mask & 10) === 0;
  if (height >= 2 && (hasEW || hasNS)) {
    return 'arch-bridge';
  }

  // Connected high-rises form a Gabled Manor
  const sameHeightNeighbors = [
    r > 0 ? grid[r - 1][c] : null,
    c < ISLAND_SIZE - 1 ? grid[r][c + 1] : null,
    r < ISLAND_SIZE - 1 ? grid[r + 1][c] : null,
    c > 0 ? grid[r][c - 1] : null,
  ].filter((n) => n && n.height >= 3).length;

  if (height >= 3 && sameHeightNeighbors >= 1) {
    return 'gabled-manor';
  }

  return 'cottage';
}

export function recomputeWfcGrid(rawGrid: IslandCell[][]): {
  grid: IslandCell[][];
  totalBlocks: number;
  completedChallenges: string[];
} {
  const next = rawGrid.map((row) => row.map((c) => ({ ...c })));
  let totalBlocks = 0;

  for (let r = 0; r < ISLAND_SIZE; r++) {
    for (let c = 0; c < ISLAND_SIZE; c++) {
      const cell = next[r][c];
      totalBlocks += cell.height;
      const mask = computeNeighborMask(next, r, c);
      cell.neighborMask = mask;
      cell.feature = classifyArchFeature(cell.height, mask, r, c, next);
      cell.seagullPerched =
        cell.height >= 3 && ((r * 7 + c * 13 + cell.height) % 3 === 0);
    }
  }

  const completedChallenges = ISLAND_CHALLENGES.filter((ch) =>
    ch.check(next)
  ).map((ch) => ch.id);

  return { grid: next, totalBlocks, completedChallenges };
}

export function createTownscaperState(): TownscaperState {
  const empty: IslandCell[][] = [];
  for (let r = 0; r < ISLAND_SIZE; r++) {
    const row: IslandCell[] = [];
    for (let c = 0; c < ISLAND_SIZE; c++) {
      row.push({
        row: r,
        col: c,
        height: 0,
        palette: 'coral',
        feature: 'water',
        neighborMask: 0,
        seagullPerched: false,
      });
    }
    empty.push(row);
  }

  // Seed a small starter pier in the center so the island immediately looks alive
  empty[3][3].height = 1;
  empty[3][3].palette = 'ivory';
  empty[3][4].height = 2;
  empty[3][4].palette = 'coral';
  empty[4][3].height = 2;
  empty[4][3].palette = 'sunflower';

  const { grid, totalBlocks, completedChallenges } = recomputeWfcGrid(empty);

  return {
    grid,
    selectedPalette: 'coral',
    toolMode: 'build',
    totalBlocks,
    completedChallenges,
    lastActionNoteKo: '바다 타일을 클릭하면 석조 부두(Quay)가 놓이고, 위로 쌓으면 지붕과 아치가 자동 생성됩니다.',
    lastActionNoteEn: 'Click water to place a Stone Quay, and stack upward to auto-form cottages, arches, and towers.',
  };
}

export function interactIslandCell(
  state: TownscaperState,
  row: number,
  col: number,
  forceMode?: 'build' | 'demolish'
): TownscaperState {
  if (row < 0 || row >= ISLAND_SIZE || col < 0 || col >= ISLAND_SIZE) {
    return state;
  }

  const mode = forceMode ?? state.toolMode;
  const nextRaw = state.grid.map((r) => r.map((c) => ({ ...c })));
  const target = nextRaw[row][col];

  if (mode === 'build') {
    if (target.height < MAX_TOWER_HEIGHT) {
      target.height += 1;
      target.palette = state.selectedPalette;
    }
  } else {
    if (target.height > 0) {
      target.height -= 1;
    }
  }

  const { grid, totalBlocks, completedChallenges } = recomputeWfcGrid(nextRaw);
  const updatedCell = grid[row][col];

  const featureLabelsKo: Record<ArchFeature, string> = {
    water: '해수면 복원',
    quay: '석조 부두 (Stone Quay) 건설',
    cottage: '파스텔 코티지 (Pastel Cottage) 형성',
    'arch-bridge': '운하 아치교 (Canal Arch Bridge) 자동 연결!',
    'courtyard-garden': '4면 위요 중정 정원 (Courtyard Garden) 개화!',
    'gabled-manor': '박공지붕 저택 (Gabled Manor) 결합!',
    lighthouse: '5층 해안 등대 (Coastal Lighthouse) 점등!',
  };

  const featureLabelsEn: Record<ArchFeature, string> = {
    water: 'Restored open water',
    quay: 'Built Stone Quay foundation',
    cottage: 'Formed Pastel Cottage',
    'arch-bridge': 'Vaulted Canal Arch Bridge formed!',
    'courtyard-garden': 'Enclosed Courtyard Garden bloomed!',
    'gabled-manor': 'Connected Gabled Manor!',
    lighthouse: '5-Story Coastal Lighthouse lit!',
  };

  return {
    ...state,
    grid,
    totalBlocks,
    completedChallenges,
    lastActionNoteKo: `[${row + 1}, ${col + 1}] ${featureLabelsKo[updatedCell.feature]} (높이 ${updatedCell.height}층)`,
    lastActionNoteEn: `[${row + 1}, ${col + 1}] ${featureLabelsEn[updatedCell.feature]} (Height ${updatedCell.height}F)`,
  };
}

export function applyPresetGrandIsland(state: TownscaperState): TownscaperState {
  const nextRaw = state.grid.map((r) =>
    r.map((c) => ({ ...c, height: 0, palette: 'ivory' as PaletteKey }))
  );

  // Build an enclosed courtyard garden at (4,4) surrounded by (3,4), (5,4), (4,3), (4,5)
  nextRaw[4][4] = { ...nextRaw[4][4], height: 1, palette: 'mint' };
  nextRaw[3][4] = { ...nextRaw[3][4], height: 2, palette: 'coral' };
  nextRaw[5][4] = { ...nextRaw[5][4], height: 2, palette: 'sunflower' };
  nextRaw[4][3] = { ...nextRaw[4][3], height: 3, palette: 'cobalt' };
  nextRaw[4][5] = { ...nextRaw[4][5], height: 3, palette: 'coral' };

  // Build an E-W Arch Bridge at (2,3) flanked by (2,2) and (2,4) with N/S water
  nextRaw[2][2] = { ...nextRaw[2][2], height: 2, palette: 'ivory' };
  nextRaw[2][3] = { ...nextRaw[2][3], height: 2, palette: 'sunflower' };
  nextRaw[2][4] = { ...nextRaw[2][4], height: 2, palette: 'ivory' };

  // Build a 5-story Lighthouse at (1,6)
  nextRaw[1][6] = { ...nextRaw[1][6], height: 5, palette: 'coral' };

  const { grid, totalBlocks, completedChallenges } = recomputeWfcGrid(nextRaw);

  return {
    ...state,
    grid,
    totalBlocks,
    completedChallenges,
    lastActionNoteKo: '✨ 산토리니 등대·운하 아치교·중정 정원이 포함된 디오라마 프리셋을 불러왔습니다!',
    lastActionNoteEn: '✨ Loaded Grand Mediterranean Diorama with Lighthouse, Arch Bridge, and Courtyard Garden!',
  };
}
