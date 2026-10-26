export type ItemType = 'weapon' | 'shield' | 'armor' | 'relic' | 'potion';

export interface GridCoord {
  r: number;
  c: number;
}

export interface BackpackItemDef {
  id: string;
  name: string;
  icon: string;
  type: ItemType;
  shape: GridCoord[]; // coordinates relative to origin (0,0)
  energyCost: number;
  baseValue: number; // damage for weapon, block for shield, heal for potion, passive for relic
  description: string;
}

export interface PlacedItem {
  instanceId: string;
  defId: string;
  r: number; // top-left anchor row
  c: number; // top-left anchor col
  rotation: 0 | 90 | 180 | 270;
}

export const ITEM_CATALOG: Record<string, BackpackItemDef> = {
  wooden_sword: {
    id: 'wooden_sword',
    name: '나무 검 (Wooden Sword)',
    icon: '🗡️',
    type: 'weapon',
    shape: [{ r: 0, c: 0 }, { r: 1, c: 0 }],
    energyCost: 1,
    baseValue: 7,
    description: '적에게 피해를 줍니다. 인접한 보석/무기마다 공격력 +2',
  },
  iron_dagger: {
    id: 'iron_dagger',
    name: '강철 단검 (Iron Dagger)',
    icon: '🔪',
    type: 'weapon',
    shape: [{ r: 0, c: 0 }],
    energyCost: 1,
    baseValue: 5,
    description: '적에게 신속한 피해를 줍니다. 바로 위 칸에 방어구가 있으면 치명타 +3',
  },
  heavy_hammer: {
    id: 'heavy_hammer',
    name: '전투 해머 (Warhammer)',
    icon: '🔨',
    type: 'weapon',
    shape: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }],
    energyCost: 2,
    baseValue: 16,
    description: '묵직한 강타로 높은 피해를 주고 적의 방어도를 무시합니다.',
  },
  rough_buckler: {
    id: 'rough_buckler',
    name: '나무 버클러 (Rough Buckler)',
    icon: '🛡️',
    type: 'shield',
    shape: [{ r: 0, c: 0 }, { r: 0, c: 1 }],
    energyCost: 1,
    baseValue: 6,
    description: '방어도를 얻습니다. 인접한 방어구마다 방어도 +2',
  },
  tower_shield: {
    id: 'tower_shield',
    name: '타워 실드 (Tower Shield)',
    icon: '🧱',
    type: 'shield',
    shape: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
    energyCost: 2,
    baseValue: 15,
    description: '견고한 성벽처럼 대량의 방어도를 얻습니다.',
  },
  leather_cap: {
    id: 'leather_cap',
    name: '가죽 투구 (Leather Cap)',
    icon: '🪖',
    type: 'armor',
    shape: [{ r: 0, c: 0 }, { r: 0, c: 1 }],
    energyCost: 0,
    baseValue: 3,
    description: '패시브: 매 턴 시작 시 방어도 3 획득. 바로 아래 칸 무기 공격력 +3',
  },
  fire_ruby: {
    id: 'fire_ruby',
    name: '화염 루비 (Fire Ruby)',
    icon: '💎',
    type: 'relic',
    shape: [{ r: 0, c: 0 }],
    energyCost: 0,
    baseValue: 3,
    description: '패시브: 같은 행 또는 열에 위치한 모든 무기의 공격력 +3',
  },
  health_potion: {
    id: 'health_potion',
    name: '치유 물약 (Health Potion)',
    icon: '🧪',
    type: 'potion',
    shape: [{ r: 0, c: 0 }],
    energyCost: 1,
    baseValue: 14,
    description: '체력을 14 즉시 회복하고 사용 후 소모됩니다.',
  },
};

export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff';
  value: number;
}

export interface Enemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  block: number;
  intent: EnemyIntent;
}

export const DUNGEON_ENEMIES: Record<number, Omit<Enemy, 'block' | 'intent'>[]> = {
  1: [
    { id: 'cave_slime', name: '동굴 슬라임 (Cave Slime)', icon: '🟢', hp: 22, maxHp: 22 },
    { id: 'cavern_rat', name: '거대 시궁쥐 (Cavern Rat)', icon: '🐀', hp: 26, maxHp: 26 },
  ],
  2: [
    { id: 'goblin_raider', name: '고블린 약탈자 (Goblin Raider)', icon: '👺', hp: 38, maxHp: 38 },
    { id: 'cave_bat', name: '흡혈 박쥐 (Vampire Bat)', icon: '🦇', hp: 32, maxHp: 32 },
  ],
  3: [
    { id: 'skeleton_guard', name: '해골 경비병 (Skeleton Guard)', icon: '💀', hp: 50, maxHp: 50 },
    { id: 'dark_cultist', name: '어둠의 광신도 (Dark Cultist)', icon: '🧙‍♂️', hp: 44, maxHp: 44 },
  ],
  4: [
    { id: 'iron_golem', name: '강철 골렘 (Iron Golem)', icon: '🗿', hp: 65, maxHp: 65 },
    { id: 'shadow_assassin', name: '그림자 암살자 (Shadow Assassin)', icon: '🥷', hp: 55, maxHp: 55 },
  ],
  5: [
    { id: 'dungeon_lich', name: '던전 리치 (Dungeon Lich)', icon: '👑', hp: 90, maxHp: 90 },
  ],
};

export interface BackpackHeroState {
  gridRows: number;
  gridCols: number;
  unlockedSlots: boolean[][]; // [r][c] true if available to place
  items: PlacedItem[];
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  floor: number;
  maxFloor: number;
  currentEnemy: Enemy | null;
  gameState: 'battle' | 'loot' | 'slot_expand' | 'victory' | 'game_over';
  lootPool: string[]; // item defIds offered
  expandChoicesLeft: number;
  combatLog: string[];
}

export class BackpackHeroEngine {
  private state: BackpackHeroState;
  private nextInstanceId: number = 1;

  constructor(gridRows = 5, gridCols = 6) {
    const unlocked: boolean[][] = Array.from({ length: gridRows }, () =>
      Array.from({ length: gridCols }, () => false)
    );

    // Initial 3x3 unlocked area in the center
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        if (r < gridRows && c < gridCols) {
          unlocked[r][c] = true;
        }
      }
    }

    this.state = {
      gridRows,
      gridCols,
      unlockedSlots: unlocked,
      items: [],
      playerHp: 45,
      playerMaxHp: 45,
      playerBlock: 0,
      energy: 3,
      maxEnergy: 3,
      gold: 0,
      floor: 1,
      maxFloor: 5,
      currentEnemy: null,
      gameState: 'battle',
      lootPool: [],
      expandChoicesLeft: 0,
      combatLog: ['던전에 입장했습니다! 배낭의 무기를 클릭해 공격하세요.'],
    };

    // Starter inventory: Wooden Sword, Rough Buckler, Health Potion
    this.addItem('wooden_sword', 1, 1, 0);
    this.addItem('rough_buckler', 2, 2, 0);
    this.addItem('health_potion', 3, 1, 0);

    this.spawnFloorEnemy(1);
  }

  public getState(): Readonly<BackpackHeroState> {
    return this.state;
  }

  public setPlayerHp(hp: number): void {
    this.state.playerHp = Math.max(0, Math.min(this.state.playerMaxHp, hp));
  }

  /**
   * Transforms shape coordinates based on rotation (0, 90, 180, 270)
   */
  public static rotateShape(coords: GridCoord[], rotation: 0 | 90 | 180 | 270): GridCoord[] {
    if (rotation === 0) return coords;
    return coords.map(({ r, c }) => {
      if (rotation === 90) return { r: c || 0, c: -r || 0 };
      if (rotation === 180) return { r: -r || 0, c: -c || 0 };
      // 270
      return { r: -c || 0, c: r || 0 };
    });
  }

  /**
   * Computes normalized absolute grid coordinates of an item on the board
   */
  public static getItemAbsoluteCells(item: PlacedItem, def: BackpackItemDef): GridCoord[] {
    const rotated = BackpackHeroEngine.rotateShape(def.shape, item.rotation);
    // Find min offset to normalize origin
    const minR = Math.min(...rotated.map((p) => p.r));
    const minC = Math.min(...rotated.map((p) => p.c));

    return rotated.map((p) => ({
      r: item.r + (p.r - minR),
      c: item.c + (p.c - minC),
    }));
  }

  /**
   * Check if an item can be placed at given (r, c) with rotation
   */
  public canPlaceItem(
    defId: string,
    r: number,
    c: number,
    rotation: 0 | 90 | 180 | 270,
    ignoreInstanceId?: string
  ): boolean {
    const def = ITEM_CATALOG[defId];
    if (!def) return false;

    const cells = BackpackHeroEngine.getItemAbsoluteCells({ instanceId: '', defId, r, c, rotation }, def);

    // Build map of occupied cells by other items
    const occupied = new Set<string>();
    for (const item of this.state.items) {
      if (item.instanceId === ignoreInstanceId) continue;
      const otherDef = ITEM_CATALOG[item.defId];
      if (!otherDef) continue;
      for (const cell of BackpackHeroEngine.getItemAbsoluteCells(item, otherDef)) {
        occupied.add(`${cell.r}:${cell.c}`);
      }
    }

    for (const cell of cells) {
      if (cell.r < 0 || cell.r >= this.state.gridRows || cell.c < 0 || cell.c >= this.state.gridCols) {
        return false;
      }
      if (!this.state.unlockedSlots[cell.r][cell.c]) {
        return false;
      }
      if (occupied.has(`${cell.r}:${cell.c}`)) {
        return false;
      }
    }

    return true;
  }

  public addItem(defId: string, r: number, c: number, rotation: 0 | 90 | 180 | 270 = 0): boolean {
    if (!this.canPlaceItem(defId, r, c, rotation)) {
      return false;
    }

    this.state.items.push({
      instanceId: `inst_${this.nextInstanceId++}`,
      defId,
      r,
      c,
      rotation,
    });
    return true;
  }

  public moveItem(instanceId: string, newR: number, newC: number, newRotation?: 0 | 90 | 180 | 270): boolean {
    const item = this.state.items.find((i) => i.instanceId === instanceId);
    if (!item) return false;

    const rot = newRotation !== undefined ? newRotation : item.rotation;
    if (!this.canPlaceItem(item.defId, newR, newC, rot, instanceId)) {
      return false;
    }

    item.r = newR;
    item.c = newC;
    item.rotation = rot;
    return true;
  }

  public removeItem(instanceId: string): boolean {
    const idx = this.state.items.findIndex((i) => i.instanceId === instanceId);
    if (idx !== -1) {
      this.state.items.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Calculates dynamic synergy-boosted value of an item based on adjacent/row items
   */
  public calculateEffectiveItemValue(instanceId: string): { value: number; bonus: number } {
    const item = this.state.items.find((i) => i.instanceId === instanceId);
    if (!item) return { value: 0, bonus: 0 };
    const def = ITEM_CATALOG[item.defId];
    if (!def) return { value: 0, bonus: 0 };

    let bonus = 0;
    const myCells = BackpackHeroEngine.getItemAbsoluteCells(item, def);

    for (const other of this.state.items) {
      if (other.instanceId === instanceId) continue;
      const otherDef = ITEM_CATALOG[other.defId];
      if (!otherDef) continue;
      const otherCells = BackpackHeroEngine.getItemAbsoluteCells(other, otherDef);

      // Check adjacency (cardinal 4-way)
      let isAdjacent = false;
      for (const mc of myCells) {
        for (const oc of otherCells) {
          const dr = Math.abs(mc.r - oc.r);
          const dc = Math.abs(mc.c - oc.c);
          if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            isAdjacent = true;
            break;
          }
        }
        if (isAdjacent) break;
      }

      // Check row/col alignment
      let sameRowOrCol = false;
      for (const mc of myCells) {
        for (const oc of otherCells) {
          if (mc.r === oc.r || mc.c === oc.c) {
            sameRowOrCol = true;
            break;
          }
        }
        if (sameRowOrCol) break;
      }

      // 1. Fire Ruby synergy: +3 to all weapons in same row/col
      if (def.type === 'weapon' && otherDef.id === 'fire_ruby' && sameRowOrCol) {
        bonus += 3;
      }

      // 2. Wooden sword synergy: +2 for each adjacent weapon/relic
      if (def.id === 'wooden_sword' && isAdjacent && (otherDef.type === 'weapon' || otherDef.type === 'relic')) {
        bonus += 2;
      }

      // 3. Rough buckler synergy: +2 for each adjacent armor
      if (def.id === 'rough_buckler' && isAdjacent && otherDef.type === 'armor') {
        bonus += 2;
      }

      // 4. Leather cap synergy: +3 to weapon directly below it
      if (def.type === 'weapon' && otherDef.id === 'leather_cap') {
        for (const mc of myCells) {
          if (otherCells.some((oc) => oc.r === mc.r - 1 && oc.c === mc.c)) {
            bonus += 3;
            break;
          }
        }
      }
    }

    return { value: def.baseValue + bonus, bonus };
  }

  public activateItem(instanceId: string): { success: boolean; message: string } {
    if (this.state.gameState !== 'battle' || !this.state.currentEnemy) {
      return { success: false, message: '전투 중이 아닙니다.' };
    }

    const item = this.state.items.find((i) => i.instanceId === instanceId);
    if (!item) return { success: false, message: '아이템을 찾을 수 없습니다.' };
    const def = ITEM_CATALOG[item.defId];
    if (!def) return { success: false, message: '정의되지 않은 아이템입니다.' };

    if (this.state.energy < def.energyCost) {
      return { success: false, message: '에너지가 부족합니다!' };
    }

    this.state.energy -= def.energyCost;
    const { value } = this.calculateEffectiveItemValue(instanceId);

    if (def.type === 'weapon') {
      const enemy = this.state.currentEnemy;
      let dmg = value;

      if (enemy.block > 0) {
        const absorbed = Math.min(enemy.block, dmg);
        enemy.block -= absorbed;
        dmg -= absorbed;
      }

      enemy.hp = Math.max(0, enemy.hp - dmg);
      const msg = `${def.name} 공격! 적에게 ${value} 피해를 입혔습니다.`;
      this.log(msg);

      if (enemy.hp <= 0) {
        this.handleEnemyDefeated();
        return { success: true, message: `${enemy.name} 처치!` };
      }
      return { success: true, message: msg };
    }

    if (def.type === 'shield') {
      this.state.playerBlock += value;
      const msg = `${def.name} 사용! 방어도 +${value} 획득.`;
      this.log(msg);
      return { success: true, message: msg };
    }

    if (def.type === 'potion') {
      const heal = Math.min(this.state.playerMaxHp - this.state.playerHp, value);
      this.state.playerHp += heal;
      this.removeItem(instanceId);
      const msg = `${def.name} 복용! 체력 +${heal} 회복 (소모됨).`;
      this.log(msg);
      return { success: true, message: msg };
    }

    return { success: true, message: `${def.name} 효과 발동.` };
  }

  public endTurn(): void {
    if (this.state.gameState !== 'battle' || !this.state.currentEnemy) return;

    const enemy = this.state.currentEnemy;
    const intent = enemy.intent;

    // Enemy Action
    if (intent.type === 'attack') {
      let dmg = intent.value;
      if (this.state.playerBlock > 0) {
        const absorbed = Math.min(this.state.playerBlock, dmg);
        this.state.playerBlock -= absorbed;
        dmg -= absorbed;
      }
      this.state.playerHp = Math.max(0, this.state.playerHp - dmg);
      this.log(`${enemy.name}의 반격! ${intent.value} 피해를 입었습니다.`);

      if (this.state.playerHp <= 0) {
        this.state.gameState = 'game_over';
        this.log('영웅이 쓰러졌습니다... 게임 오버!');
        return;
      }
    } else if (intent.type === 'defend') {
      enemy.block += intent.value;
      this.log(`${enemy.name}이(가) 방어 태세를 취했습니다 (+${intent.value} 방어도).`);
    } else if (intent.type === 'buff') {
      this.log(`${enemy.name}이(가) 포효하며 공격력을 증폭했습니다!`);
    }

    // Turn Reset & Passive Armor Blocks
    this.state.energy = this.state.maxEnergy;
    this.state.playerBlock = 0;

    // Apply passive armor
    for (const item of this.state.items) {
      const def = ITEM_CATALOG[item.defId];
      if (def && def.type === 'armor') {
        this.state.playerBlock += def.baseValue;
      }
    }

    // Roll new enemy intent
    this.rollEnemyIntent(enemy);
  }

  private handleEnemyDefeated(): void {
    const enemy = this.state.currentEnemy;
    const goldEarned = 15 + this.state.floor * 10;
    this.state.gold += goldEarned;
    this.log(`${enemy?.name} 처치 완료! 골드 +${goldEarned} 획득.`);

    if (this.state.floor >= this.state.maxFloor) {
      this.state.gameState = 'victory';
      this.log('던전의 모든 층을 정복했습니다! 최종 승리!');
      return;
    }

    // Enter Loot State
    this.state.gameState = 'loot';
    // Pick 3 random items
    const allDefs = Object.keys(ITEM_CATALOG);
    const shuffled = [...allDefs].sort(() => Math.random() - 0.5);
    this.state.lootPool = shuffled.slice(0, 3);
    this.state.expandChoicesLeft = 2; // Can unlock 2 slots after battle
  }

  public takeLootItem(defId: string): boolean {
    if (this.state.gameState !== 'loot') return false;

    // Find first available slot
    for (let r = 0; r < this.state.gridRows; r++) {
      for (let c = 0; c < this.state.gridCols; c++) {
        for (const rot of [0, 90, 180, 270] as const) {
          if (this.canPlaceItem(defId, r, c, rot)) {
            this.addItem(defId, r, c, rot);
            this.state.lootPool = this.state.lootPool.filter((id) => id !== defId);
            this.log(`전리품 획득: ${ITEM_CATALOG[defId]?.name}`);
            return true;
          }
        }
      }
    }
    return false; // No space in backpack
  }

  public unlockSlot(r: number, c: number): boolean {
    if (r < 0 || r >= this.state.gridRows || c < 0 || c >= this.state.gridCols) return false;
    if (this.state.unlockedSlots[r][c]) return false;
    if (this.state.expandChoicesLeft <= 0) return false;

    // Must be adjacent to an already unlocked slot
    const hasAdj =
      (r > 0 && this.state.unlockedSlots[r - 1][c]) ||
      (r < this.state.gridRows - 1 && this.state.unlockedSlots[r + 1][c]) ||
      (c > 0 && this.state.unlockedSlots[r][c - 1]) ||
      (c < this.state.gridCols - 1 && this.state.unlockedSlots[r][c + 1]);

    if (!hasAdj) return false;

    this.state.unlockedSlots[r][c] = true;
    this.state.expandChoicesLeft--;
    this.log(`배낭 공간 확장! (${r}, ${c}) 슬롯 해금 완료.`);
    return true;
  }

  public proceedToNextFloor(): void {
    if (this.state.gameState !== 'loot') return;

    this.state.floor++;
    this.state.playerBlock = 0;
    this.state.energy = this.state.maxEnergy;
    this.spawnFloorEnemy(this.state.floor);
    this.state.gameState = 'battle';
    this.log(`지하 ${this.state.floor}층에 진입했습니다.`);
  }

  private spawnFloorEnemy(floor: number): void {
    const list = DUNGEON_ENEMIES[floor] ?? DUNGEON_ENEMIES[1];
    const picked = list[Math.floor(Math.random() * list.length)];

    const enemy: Enemy = {
      ...picked,
      block: 0,
      intent: { type: 'attack', value: 6 + floor * 3 },
    };
    this.rollEnemyIntent(enemy);
    this.state.currentEnemy = enemy;
  }

  private rollEnemyIntent(enemy: Enemy): void {
    const floor = this.state.floor;
    const roll = Math.random();

    if (roll < 0.65) {
      enemy.intent = { type: 'attack', value: 6 + floor * 2 + Math.floor(Math.random() * 4) };
    } else if (roll < 0.85) {
      enemy.intent = { type: 'defend', value: 5 + floor * 2 };
    } else {
      enemy.intent = { type: 'buff', value: 3 };
    }
  }

  private log(message: string): void {
    this.state.combatLog.unshift(message);
    if (this.state.combatLog.length > 20) {
      this.state.combatLog.pop();
    }
  }

  public restart(): void {
    this.nextInstanceId = 1;
    const rows = this.state.gridRows;
    const cols = this.state.gridCols;
    const unlocked: boolean[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    );

    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        if (r < rows && c < cols) {
          unlocked[r][c] = true;
        }
      }
    }

    this.state = {
      gridRows: rows,
      gridCols: cols,
      unlockedSlots: unlocked,
      items: [],
      playerHp: 45,
      playerMaxHp: 45,
      playerBlock: 0,
      energy: 3,
      maxEnergy: 3,
      gold: 0,
      floor: 1,
      maxFloor: 5,
      currentEnemy: null,
      gameState: 'battle',
      lootPool: [],
      expandChoicesLeft: 0,
      combatLog: ['새로운 원정을 시작합니다! 배낭을 정렬하세요.'],
    };

    this.addItem('wooden_sword', 1, 1, 0);
    this.addItem('rough_buckler', 2, 2, 0);
    this.addItem('health_potion', 3, 1, 0);
    this.spawnFloorEnemy(1);
  }
}
