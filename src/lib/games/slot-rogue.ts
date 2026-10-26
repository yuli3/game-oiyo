// Slot Synergy Rogue (#140) — Deterministic 5x4 slot grid engine with adjacency interactions,
// symbol destruction/transformation, 3-choice draft pool, and escalating rent payment cycles.
// WHY: Inspired by Luck be a Landlord's tactile deckbuilding slot loops without gambling money.

export type SymbolKey =
  | 'coin'
  | 'cat'
  | 'milk'
  | 'miner'
  | 'ore'
  | 'gem'
  | 'flower'
  | 'sun'
  | 'thief'
  | 'safe'
  | 'king'
  | 'crown';

export interface SymbolSpec {
  key: SymbolKey;
  nameKo: string;
  nameEn: string;
  baseCoins: number;
  rarity: 'common' | 'uncommon' | 'rare';
  descKo: string;
  descEn: string;
}

export interface GridCell {
  row: number;
  col: number;
  symbol: SymbolKey | null;
  lastPayout: number;
  synergyTriggered: boolean;
  consumedThisSpin: boolean;
}

export interface SynergyEvent {
  sourceRow: number;
  sourceCol: number;
  targetRow: number;
  targetCol: number;
  sourceSymbol: SymbolKey;
  targetSymbol: SymbolKey;
  bonusCoins: number;
  SpawnedSymbol?: SymbolKey;
  destroyedTarget: boolean;
}

export interface SlotRogueState {
  status: 'ready' | 'draft' | 'rent-paid' | 'victory' | 'evicted';
  coins: number;
  rentCycle: number;
  rentTargets: number[];
  spinsLeftInCycle: number;
  totalSpins: number;
  lastSpinPayout: number;
  rerollTokens: number;
  inventory: SymbolKey[];
  grid: GridCell[][];
  draftChoices: SymbolKey[];
  synergyEvents: SynergyEvent[];
}

export const GRID_ROWS = 4;
export const GRID_COLS = 5;
export const SPINS_PER_CYCLE = 5;
export const RENT_SCHEDULE = [25, 60, 115, 190];

export const SYMBOL_CATALOG: Record<SymbolKey, SymbolSpec> = {
  coin: {
    key: 'coin',
    nameKo: '동전',
    nameEn: 'Coin',
    baseCoins: 1,
    rarity: 'common',
    descKo: '스핀당 기본 +1 코인을 지급합니다.',
    descEn: 'Grants +1 coin per spin.',
  },
  cat: {
    key: 'cat',
    nameKo: '길고양이',
    nameEn: 'Stray Cat',
    baseCoins: 2,
    rarity: 'common',
    descKo: '인접한 우유를 마셔 제거하고 +12 코인을 획득합니다.',
    descEn: 'Drinks adjacent Milk (destroying it) for +12 bonus coins.',
  },
  milk: {
    key: 'milk',
    nameKo: '신선한 우유',
    nameEn: 'Fresh Milk',
    baseCoins: 1,
    rarity: 'common',
    descKo: '길고양이 옆에 오면 소비되어 대량 보너스를 줍니다.',
    descEn: 'Consumed by adjacent Stray Cat for a huge payout.',
  },
  miner: {
    key: 'miner',
    nameKo: '광부',
    nameEn: 'Dwarf Miner',
    baseCoins: 2,
    rarity: 'common',
    descKo: '인접한 광석을 채굴(제거)해 +15 코인을 얻고 보석 1개를 덱에 추가합니다.',
    descEn: 'Breaks adjacent Ore for +15 coins and adds a Gem to your deck.',
  },
  ore: {
    key: 'ore',
    nameKo: '철광석',
    nameEn: 'Iron Ore',
    baseCoins: 1,
    rarity: 'common',
    descKo: '광부가 부수면 +15 코인과 보석으로 정제됩니다.',
    descEn: 'Broken by Dwarf Miner for +15 coins and a Gem.',
  },
  gem: {
    key: 'gem',
    nameKo: '사파이어 보석',
    nameEn: 'Sapphire Gem',
    baseCoins: 5,
    rarity: 'rare',
    descKo: '스핀당 기본 +5 코인을 지급하는 고가치 보석입니다.',
    descEn: 'High-value jewel granting +5 coins per spin.',
  },
  flower: {
    key: 'flower',
    nameKo: '해바라기',
    nameEn: 'Sunflower',
    baseCoins: 2,
    rarity: 'common',
    descKo: '인접한 태양마다 +8 보너스 코인을 추가로 생산합니다.',
    descEn: 'Produces +8 bonus coins for each adjacent Sun.',
  },
  sun: {
    key: 'sun',
    nameKo: '태양',
    nameEn: 'Blazing Sun',
    baseCoins: 4,
    rarity: 'rare',
    descKo: '자체 +4 코인 및 인접한 해바라기를 폭발적으로 성장시킵니다.',
    descEn: 'Grants +4 coins and supercharges adjacent Sunflowers.',
  },
  thief: {
    key: 'thief',
    nameKo: '괴도',
    nameEn: 'Master Thief',
    baseCoins: 2,
    rarity: 'uncommon',
    descKo: '인접한 금고를 즉시 털어(제거) +30 코인을 획득합니다.',
    descEn: 'Cracks adjacent Safe (destroying it) for +30 bonus coins.',
  },
  safe: {
    key: 'safe',
    nameKo: '강철 금고',
    nameEn: 'Steel Safe',
    baseCoins: 2,
    rarity: 'uncommon',
    descKo: '평소엔 +2 코인이지만 괴도가 열면 +30 코인이 쏟아집니다.',
    descEn: 'Grants +2 coins, or +30 coins when cracked by a Master Thief.',
  },
  king: {
    key: 'king',
    nameKo: '국왕',
    nameEn: 'Monarch',
    baseCoins: 4,
    rarity: 'rare',
    descKo: '인접한 왕관 및 보석마다 +10 보너스 코인을 하사합니다.',
    descEn: 'Grants +10 bonus coins for every adjacent Crown or Gem.',
  },
  crown: {
    key: 'crown',
    nameKo: '황금 왕관',
    nameEn: 'Golden Crown',
    baseCoins: 3,
    rarity: 'uncommon',
    descKo: '기본 +3 코인, 국왕과 인접하면 왕실 시너지가 발동합니다.',
    descEn: 'Grants +3 coins and triggers Royal Synergy beside a Monarch.',
  },
};

const DRAFT_POOL: SymbolKey[] = [
  'cat',
  'milk',
  'miner',
  'ore',
  'flower',
  'sun',
  'thief',
  'safe',
  'king',
  'crown',
  'gem',
];

function createEmptyGrid(): GridCell[][] {
  const rows: GridCell[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push({
        row: r,
        col: c,
        symbol: null,
        lastPayout: 0,
        synergyTriggered: false,
        consumedThisSpin: false,
      });
    }
    rows.push(row);
  }
  return rows;
}

export function pickDraftChoices(seed: number): SymbolKey[] {
  const choices: SymbolKey[] = [];
  let idx = Math.abs(seed * 7 + 3) % DRAFT_POOL.length;
  while (choices.length < 3) {
    const candidate = DRAFT_POOL[idx % DRAFT_POOL.length];
    if (!choices.includes(candidate)) {
      choices.push(candidate);
    }
    idx += 3;
  }
  return choices;
}

export function createSlotRogueState(): SlotRogueState {
  const starterInventory: SymbolKey[] = [
    'coin',
    'coin',
    'cat',
    'milk',
    'miner',
    'ore',
    'flower',
  ];
  const grid = createEmptyGrid();
  starterInventory.forEach((sym, i) => {
    const r = Math.floor(i / GRID_COLS);
    const c = i % GRID_COLS;
    grid[r][c].symbol = sym;
  });

  return {
    status: 'ready',
    coins: 5,
    rentCycle: 0,
    rentTargets: [...RENT_SCHEDULE],
    spinsLeftInCycle: SPINS_PER_CYCLE,
    totalSpins: 0,
    lastSpinPayout: 0,
    rerollTokens: 3,
    inventory: starterInventory,
    grid,
    draftChoices: pickDraftChoices(1),
    synergyEvents: [],
  };
}

function areAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  if (r1 === r2 && c1 === c2) return false;
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}

export function spinSlotGrid(
  state: SlotRogueState,
  customSeed?: number
): SlotRogueState {
  if (state.status === 'victory' || state.status === 'evicted') {
    return state;
  }

  const nextTotalSpins = state.totalSpins + 1;
  const seed = customSeed ?? nextTotalSpins * 31 + state.inventory.length * 17;

  // Deterministic shuffle of up to 20 inventory symbols onto the 4x5 grid
  const totalSlots = GRID_ROWS * GRID_COLS;
  const pool: (SymbolKey | null)[] = [...state.inventory.slice(0, totalSlots)];
  while (pool.length < totalSlots) {
    pool.push(null);
  }

  const shuffled: (SymbolKey | null)[] = [];
  const temp = [...pool];
  let step = seed;
  while (temp.length > 0) {
    step = (step * 1103515245 + 12345) & 0x7fffffff;
    const pickIdx = step % temp.length;
    shuffled.push(temp.splice(pickIdx, 1)[0]);
  }

  const grid = createEmptyGrid();
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const sym = shuffled[r * GRID_COLS + c];
      grid[r][c].symbol = sym;
      grid[r][c].lastPayout = sym ? SYMBOL_CATALOG[sym].baseCoins : 0;
    }
  }

  const synergyEvents: SynergyEvent[] = [];
  const consumedPositions = new Set<string>();
  const spawnedSymbols: SymbolKey[] = [];

  // Evaluate 8-way adjacency synergies
  for (let r1 = 0; r1 < GRID_ROWS; r1++) {
    for (let c1 = 0; c1 < GRID_COLS; c1++) {
      const srcCell = grid[r1][c1];
      if (!srcCell.symbol) continue;

      for (let r2 = 0; r2 < GRID_ROWS; r2++) {
        for (let c2 = 0; c2 < GRID_COLS; c2++) {
          if (!areAdjacent(r1, c1, r2, c2)) continue;
          const tgtCell = grid[r2][c2];
          if (!tgtCell.symbol) continue;
          const posKey = `${r2},${c2}`;

          // Cat drinks Milk (+12, destroys Milk)
          if (
            srcCell.symbol === 'cat' &&
            tgtCell.symbol === 'milk' &&
            !consumedPositions.has(posKey)
          ) {
            consumedPositions.add(posKey);
            srcCell.lastPayout += 12;
            srcCell.synergyTriggered = true;
            tgtCell.consumedThisSpin = true;
            synergyEvents.push({
              sourceRow: r1,
              sourceCol: c1,
              targetRow: r2,
              targetCol: c2,
              sourceSymbol: 'cat',
              targetSymbol: 'milk',
              bonusCoins: 12,
              destroyedTarget: true,
            });
          }

          // Miner breaks Ore (+15, destroys Ore, spawns Gem)
          if (
            srcCell.symbol === 'miner' &&
            tgtCell.symbol === 'ore' &&
            !consumedPositions.has(posKey)
          ) {
            consumedPositions.add(posKey);
            srcCell.lastPayout += 15;
            srcCell.synergyTriggered = true;
            tgtCell.consumedThisSpin = true;
            spawnedSymbols.push('gem');
            synergyEvents.push({
              sourceRow: r1,
              sourceCol: c1,
              targetRow: r2,
              targetCol: c2,
              sourceSymbol: 'miner',
              targetSymbol: 'ore',
              bonusCoins: 15,
              SpawnedSymbol: 'gem',
              destroyedTarget: true,
            });
          }

          // Thief cracks Safe (+30, destroys Safe)
          if (
            srcCell.symbol === 'thief' &&
            tgtCell.symbol === 'safe' &&
            !consumedPositions.has(posKey)
          ) {
            consumedPositions.add(posKey);
            srcCell.lastPayout += 30;
            srcCell.synergyTriggered = true;
            tgtCell.consumedThisSpin = true;
            synergyEvents.push({
              sourceRow: r1,
              sourceCol: c1,
              targetRow: r2,
              targetCol: c2,
              sourceSymbol: 'thief',
              targetSymbol: 'safe',
              bonusCoins: 30,
              destroyedTarget: true,
            });
          }

          // Sun supercharges Flower (+8 persistent)
          if (srcCell.symbol === 'flower' && tgtCell.symbol === 'sun') {
            srcCell.lastPayout += 8;
            srcCell.synergyTriggered = true;
            tgtCell.synergyTriggered = true;
            synergyEvents.push({
              sourceRow: r1,
              sourceCol: c1,
              targetRow: r2,
              targetCol: c2,
              sourceSymbol: 'flower',
              targetSymbol: 'sun',
              bonusCoins: 8,
              destroyedTarget: false,
            });
          }

          // King buffs Crown or Gem (+10 persistent)
          if (
            srcCell.symbol === 'king' &&
            (tgtCell.symbol === 'crown' || tgtCell.symbol === 'gem')
          ) {
            srcCell.lastPayout += 10;
            srcCell.synergyTriggered = true;
            tgtCell.synergyTriggered = true;
            synergyEvents.push({
              sourceRow: r1,
              sourceCol: c1,
              targetRow: r2,
              targetCol: c2,
              sourceSymbol: 'king',
              targetSymbol: tgtCell.symbol,
              bonusCoins: 10,
              destroyedTarget: false,
            });
          }
        }
      }
    }
  }

  // Sum spin payout
  let spinPayout = 0;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      spinPayout += grid[r][c].lastPayout;
    }
  }

  // Update inventory: remove consumed symbols, add spawned symbols
  const nextInventory = [...state.inventory];
  for (const event of synergyEvents) {
    if (event.destroyedTarget) {
      const idx = nextInventory.indexOf(event.targetSymbol);
      if (idx !== -1) {
        nextInventory.splice(idx, 1);
      }
    }
  }
  for (const spawned of spawnedSymbols) {
    nextInventory.push(spawned);
  }

  let nextCoins = state.coins + spinPayout;
  let nextSpinsLeft = state.spinsLeftInCycle - 1;
  let nextRentCycle = state.rentCycle;
  let nextStatus: SlotRogueState['status'] = 'draft';

  // Check Rent Payment when spins in cycle reach 0
  if (nextSpinsLeft <= 0) {
    const rentDue = state.rentTargets[state.rentCycle] ?? 220;
    if (nextCoins >= rentDue) {
      nextCoins -= rentDue;
      nextRentCycle += 1;
      if (nextRentCycle >= state.rentTargets.length) {
        nextStatus = 'victory';
        nextSpinsLeft = 0;
      } else {
        nextStatus = 'rent-paid';
        nextSpinsLeft = SPINS_PER_CYCLE;
      }
    } else {
      nextStatus = 'evicted';
      nextSpinsLeft = 0;
    }
  }

  return {
    ...state,
    status: nextStatus,
    coins: nextCoins,
    rentCycle: nextRentCycle,
    spinsLeftInCycle: nextSpinsLeft,
    totalSpins: nextTotalSpins,
    lastSpinPayout: spinPayout,
    inventory: nextInventory,
    grid,
    draftChoices: pickDraftChoices(nextTotalSpins + nextCoins),
    synergyEvents,
  };
}

export function draftSymbol(
  state: SlotRogueState,
  symbol: SymbolKey | 'skip'
): SlotRogueState {
  if (state.status === 'victory' || state.status === 'evicted') {
    return state;
  }
  const nextInventory =
    symbol === 'skip' ? [...state.inventory] : [...state.inventory, symbol];
  return {
    ...state,
    status: 'ready',
    inventory: nextInventory,
  };
}

export function rerollDraftChoices(state: SlotRogueState): SlotRogueState {
  if (state.rerollTokens <= 0) return state;
  return {
    ...state,
    rerollTokens: state.rerollTokens - 1,
    draftChoices: pickDraftChoices(state.totalSpins * 13 + state.rerollTokens * 29),
  };
}

export function injectSynergyComboPreset(state: SlotRogueState): SlotRogueState {
  // Adds high-synergy symbols so players can immediately experience explosive cascades
  const preset: SymbolKey[] = [
    'cat',
    'milk',
    'miner',
    'ore',
    'thief',
    'safe',
    'king',
    'crown',
    'sun',
    'flower',
  ];
  return {
    ...state,
    inventory: [...state.inventory.slice(0, 6), ...preset],
  };
}
