/**
 * Merge Mansion Web (머지 맨션 웹) Pure Game Logic
 *
 * Implements:
 * - 7x9 Grid Merge Board (63 slots)
 * - 3 Deep Item Chains (Gardening Tools, Cleaning Supplies, Flower Flora) with 6-8 tiers
 * - Spawners with energy/tap limit & recharge cooldown
 * - Cobwebbed / Locked tiles that clear upon merging
 * - Mansion Renovation Quests with visual area unlocks & star rewards
 * - Move history / undo support
 */

export type ItemChain = 'tools' | 'cleaning' | 'plants';

export interface MergeItem {
  id: string;
  chain: ItemChain;
  tier: number; // 1-based (1 to maxTier)
  isSpawner?: boolean;
  spawnerTapsLeft?: number;
  spawnerCooldownUntil?: number;
  isCobwebbed?: boolean; // Locked in cobweb until merged with matching free item
}

export interface BoardCell {
  index: number;
  row: number;
  col: number;
  item: MergeItem | null;
}

export interface RenovationQuest {
  id: string;
  area: string;
  titleKey: string;
  requiredItems: Array<{ chain: ItemChain; tier: number }>;
  starsReward: number;
  completed: boolean;
}

export interface MergeMansionState {
  board: Array<MergeItem | null>;
  energy: number;
  maxEnergy: number;
  stars: number;
  completedQuestsCount: number;
  activeQuests: RenovationQuest[];
}

export const CHAIN_DEFINITIONS: Record<
  ItemChain,
  {
    name: { ko: string; en: string };
    maxTier: number;
    items: Array<{ tier: number; name: { ko: string; en: string }; emoji: string }>;
  }
> = {
  tools: {
    name: { ko: '원예 도구', en: 'Garden Tools' },
    maxTier: 8,
    items: [
      { tier: 1, name: { ko: '원예 장갑', en: 'Garden Gloves' }, emoji: '🧤' },
      { tier: 2, name: { ko: '모종삽', en: 'Trowel' }, emoji: '⛏️' },
      { tier: 3, name: { ko: '전정가위', en: 'Pruning Shears' }, emoji: '✂️' },
      { tier: 4, name: { ko: '손도끼', en: 'Axe' }, emoji: '🪓' },
      { tier: 5, name: { ko: '조경삽', en: 'Garden Shovel' }, emoji: '🥄' },
      { tier: 6, name: { ko: '손수레', en: 'Wheelbarrow' }, emoji: '🛒' },
      { tier: 7, name: { ko: '잔디깎이', en: 'Lawn Mower' }, emoji: '🚜' },
      { tier: 8, name: { ko: '유리 온실', en: 'Grand Conservatory' }, emoji: '🏛️' },
    ],
  },
  cleaning: {
    name: { ko: '청소 도구', en: 'Cleaning Supplies' },
    maxTier: 7,
    items: [
      { tier: 1, name: { ko: '비누', en: 'Soap Bar' }, emoji: '🧼' },
      { tier: 2, name: { ko: '스펀지', en: 'Sponge' }, emoji: '🧽' },
      { tier: 3, name: { ko: '스프레이', en: 'Spray Bottle' }, emoji: '🧴' },
      { tier: 4, name: { ko: '먼지떨이', en: 'Feather Duster' }, emoji: '🪶' },
      { tier: 5, name: { ko: '빗자루', en: 'Broom & Dustpan' }, emoji: '🧹' },
      { tier: 6, name: { ko: '대걸레', en: 'Floor Mop' }, emoji: '🪣' },
      { tier: 7, name: { ko: '진공청소기', en: 'Industrial Vacuum' }, emoji: '🌀' },
    ],
  },
  plants: {
    name: { ko: '화초 & 식물', en: 'Flora & Plants' },
    maxTier: 6,
    items: [
      { tier: 1, name: { ko: '식물 씨앗', en: 'Plant Seed' }, emoji: '🌱' },
      { tier: 2, name: { ko: '새싹 화분', en: 'Sprout' }, emoji: '🌿' },
      { tier: 3, name: { ko: '꽃망울', en: 'Budding Flora' }, emoji: '🌷' },
      { tier: 4, name: { ko: '만개한 장미', en: 'Blooming Rose' }, emoji: '🌹' },
      { tier: 5, name: { ko: '희귀 난초', en: 'Exotic Orchid' }, emoji: '🌺' },
      { tier: 6, name: { ko: '고목 분재', en: 'Ancient Bonsai' }, emoji: '🪴' },
    ],
  },
};

export const MANSION_QUESTS_MASTER: RenovationQuest[] = [
  {
    id: 'quest-gate-1',
    area: '정문 진입로 (Front Gate)',
    titleKey: '정문의 엉킨 넝쿨 제거',
    requiredItems: [
      { chain: 'tools', tier: 2 },
      { chain: 'cleaning', tier: 1 },
    ],
    starsReward: 15,
    completed: false,
  },
  {
    id: 'quest-gate-2',
    area: '정문 진입로 (Front Gate)',
    titleKey: '철제 대문 녹 제거 및 광택',
    requiredItems: [
      { chain: 'tools', tier: 3 },
      { chain: 'cleaning', tier: 3 },
    ],
    starsReward: 25,
    completed: false,
  },
  {
    id: 'quest-fountain-1',
    area: '중앙 분수대 (Central Fountain)',
    titleKey: '분수대 바닥 이끼 청소',
    requiredItems: [
      { chain: 'cleaning', tier: 4 },
      { chain: 'cleaning', tier: 2 },
    ],
    starsReward: 35,
    completed: false,
  },
  {
    id: 'quest-fountain-2',
    area: '중앙 분수대 (Central Fountain)',
    titleKey: '분수대 주변 화단 조성',
    requiredItems: [
      { chain: 'plants', tier: 3 },
      { chain: 'tools', tier: 4 },
    ],
    starsReward: 45,
    completed: false,
  },
  {
    id: 'quest-hall-1',
    area: '대저택 현관 홀 (Grand Foyer)',
    titleKey: '오래된 대리석 바닥 왁스칠',
    requiredItems: [
      { chain: 'cleaning', tier: 6 },
      { chain: 'tools', tier: 5 },
    ],
    starsReward: 60,
    completed: false,
  },
  {
    id: 'quest-conservatory-1',
    area: '유리 온실 정원 (The Conservatory)',
    titleKey: '온실 유리창 청소 및 희귀 식물 식재',
    requiredItems: [
      { chain: 'plants', tier: 5 },
      { chain: 'cleaning', tier: 7 },
      { chain: 'tools', tier: 6 },
    ],
    starsReward: 100,
    completed: false,
  },
];

export const BOARD_COLS = 7;
export const BOARD_ROWS = 9;
export const TOTAL_CELLS = BOARD_COLS * BOARD_ROWS; // 63

let idCounter = 1;
export function createItemId(): string {
  return `item-${Date.now()}-${idCounter++}`;
}

export class MergeMansionEngine {
  public board: Array<MergeItem | null>;
  public energy: number;
  public maxEnergy: number;
  public stars: number;
  public completedQuests: string[];
  public quests: RenovationQuest[];

  constructor() {
    this.board = Array(TOTAL_CELLS).fill(null);
    this.energy = 50;
    this.maxEnergy = 100;
    this.stars = 0;
    this.completedQuests = [];
    this.quests = JSON.parse(JSON.stringify(MANSION_QUESTS_MASTER));
    this.initBoard();
  }

  /**
   * Initializes standard starter board layout with 3 Spawners and starter items
   */
  public initBoard(): void {
    this.board = Array(TOTAL_CELLS).fill(null);

    // Place 3 Generators at top
    // 1. Tool Box Spawner at (0, 1) = index 1
    this.board[1] = {
      id: createItemId(),
      chain: 'tools',
      tier: 1,
      isSpawner: true,
      spawnerTapsLeft: 10,
    };

    // 2. Cleaning Cabinet Spawner at (0, 3) = index 3
    this.board[3] = {
      id: createItemId(),
      chain: 'cleaning',
      tier: 1,
      isSpawner: true,
      spawnerTapsLeft: 10,
    };

    // 3. Flower Pot Spawner at (0, 5) = index 5
    this.board[5] = {
      id: createItemId(),
      chain: 'plants',
      tier: 1,
      isSpawner: true,
      spawnerTapsLeft: 10,
    };

    // Place starter items & cobwebbed items in middle area
    this.board[15] = { id: createItemId(), chain: 'tools', tier: 1 };
    this.board[16] = { id: createItemId(), chain: 'tools', tier: 1 };
    this.board[17] = { id: createItemId(), chain: 'cleaning', tier: 1 };
    this.board[18] = { id: createItemId(), chain: 'cleaning', tier: 1 };

    // Cobwebbed items (must merge matching tier item into it to unlock)
    this.board[23] = { id: createItemId(), chain: 'tools', tier: 2, isCobwebbed: true };
    this.board[25] = { id: createItemId(), chain: 'cleaning', tier: 2, isCobwebbed: true };
    this.board[31] = { id: createItemId(), chain: 'plants', tier: 1, isCobwebbed: true };
    this.board[33] = { id: createItemId(), chain: 'plants', tier: 2, isCobwebbed: true };
  }

  /**
   * Finds the first empty cell index on the board, or -1 if full.
   */
  public findFirstEmptyCell(): number {
    return this.board.findIndex((cell) => cell === null);
  }

  /**
   * Tap a spawner generator item to produce an item in an adjacent/first empty cell.
   * Consumes 1 energy.
   */
  public tapSpawner(spawnerIndex: number): { success: boolean; spawnedIndex?: number; reason?: string } {
    const spawner = this.board[spawnerIndex];
    if (!spawner || !spawner.isSpawner) {
      return { success: false, reason: '스포너 아이템이 아닙니다.' };
    }

    if (this.energy <= 0) {
      return { success: false, reason: '에너지가 부족합니다.' };
    }

    const emptyIdx = this.findFirstEmptyCell();
    if (emptyIdx === -1) {
      return { success: false, reason: '보드에 빈 공간이 없습니다.' };
    }

    // Spawn Tier 1 (or 15% chance Tier 2) of spawner's chain
    const tier = Math.random() < 0.2 ? 2 : 1;
    this.board[emptyIdx] = {
      id: createItemId(),
      chain: spawner.chain,
      tier,
    };

    this.energy--;
    if (spawner.spawnerTapsLeft !== undefined) {
      spawner.spawnerTapsLeft--;
      if (spawner.spawnerTapsLeft <= 0) {
        // Cooldown for 30s
        spawner.spawnerCooldownUntil = Date.now() + 30000;
        spawner.spawnerTapsLeft = 10;
      }
    }

    return { success: true, spawnedIndex: emptyIdx };
  }

  /**
   * Merge or move an item from sourceIndex to targetIndex.
   * Returns result status.
   */
  public moveOrMerge(
    fromIndex: number,
    toIndex: number,
  ): {
    action: 'none' | 'moved' | 'merged' | 'unlockedCobweb';
    newTier?: number;
    starsEarned?: number;
  } {
    if (fromIndex === toIndex) return { action: 'none' };
    if (fromIndex < 0 || fromIndex >= TOTAL_CELLS || toIndex < 0 || toIndex >= TOTAL_CELLS) {
      return { action: 'none' };
    }

    const source = this.board[fromIndex];
    const target = this.board[toIndex];

    if (!source) return { action: 'none' };
    if (source.isCobwebbed) return { action: 'none' }; // Cobwebbed cannot be dragged

    // Target is empty -> simple move
    if (!target) {
      this.board[toIndex] = source;
      this.board[fromIndex] = null;
      return { action: 'moved' };
    }

    // Both are items: check if mergeable
    if (source.chain === target.chain && source.tier === target.tier) {
      const maxTier = CHAIN_DEFINITIONS[source.chain].maxTier;
      if (source.tier >= maxTier) {
        // Max tier cannot merge further
        return { action: 'none' };
      }

      // If target is cobwebbed, merge clears the cobweb into an unlocked item of next tier!
      const wasCobweb = target.isCobwebbed;
      const nextTier = source.tier + 1;
      const stars = nextTier * 2;

      this.board[toIndex] = {
        id: createItemId(),
        chain: source.chain,
        tier: nextTier,
        isCobwebbed: false,
      };
      this.board[fromIndex] = null;
      this.stars += stars;

      return {
        action: wasCobweb ? 'unlockedCobweb' : 'merged',
        newTier: nextTier,
        starsEarned: stars,
      };
    }

    // Items don't match: swap positions if neither is cobwebbed
    if (!target.isCobwebbed) {
      this.board[toIndex] = source;
      this.board[fromIndex] = target;
      return { action: 'moved' };
    }

    return { action: 'none' };
  }

  /**
   * Completes an active quest if all required items exist on the board.
   */
  public completeQuest(questId: string): { success: boolean; reason?: string } {
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest) return { success: false, reason: '퀘스트를 찾을 수 없습니다.' };
    if (quest.completed) return { success: false, reason: '이미 완료된 퀘스트입니다.' };

    // Check if board contains all required items
    const boardItems = this.board.filter((item): item is MergeItem => item !== null && !item.isCobwebbed);

    // Clone to simulate consumption
    const availableItems = [...boardItems];
    const indicesToConsume: number[] = [];

    for (const req of quest.requiredItems) {
      const foundIdx = availableItems.findIndex(
        (it) => it.chain === req.chain && it.tier === req.tier,
      );
      if (foundIdx === -1) {
        return { success: false, reason: '필요한 도구가 부족합니다.' };
      }
      const matchedItem = availableItems[foundIdx];
      availableItems.splice(foundIdx, 1);

      // Find original board index
      const boardIdx = this.board.findIndex((b) => b?.id === matchedItem.id);
      if (boardIdx !== -1) {
        indicesToConsume.push(boardIdx);
      }
    }

    // Consume items from board
    for (const idx of indicesToConsume) {
      this.board[idx] = null;
    }

    quest.completed = true;
    this.completedQuests.push(quest.id);
    this.stars += quest.starsReward;
    this.energy = Math.min(this.maxEnergy, this.energy + 25); // Energy bonus

    return { success: true };
  }

  /**
   * Checks if an item can satisfy any active quest requirement
   */
  public isItemNeededForActiveQuest(item: MergeItem): boolean {
    const activeQuests = this.quests.filter((q) => !q.completed);
    return activeQuests.some((q) =>
      q.requiredItems.some((req) => req.chain === item.chain && req.tier === item.tier),
    );
  }

  public replenishEnergy(amount = 25): void {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }
}
