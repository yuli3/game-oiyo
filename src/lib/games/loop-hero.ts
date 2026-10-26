/**
 * Loop Hero Mini - Core Engine
 * Procedural circular track, day/night cycle, tile morphing (Mountain Peak, Blooming Meadow),
 * automated real-time combat simulation, and equipment deck-building.
 */

export type TileCategory = 'road' | 'roadside' | 'landscape' | 'special';

export type TileId =
  | 'empty'
  | 'road'
  | 'campfire'
  | 'grove'
  | 'cemetery'
  | 'vampire_mansion'
  | 'meadow'
  | 'blooming_meadow'
  | 'rock'
  | 'mountain'
  | 'mountain_peak'
  | 'oblivion';

export interface CardDef {
  id: string;
  tileId: TileId;
  name: string;
  category: TileCategory;
  description: string;
  color: string;
}

export const CARDS: Record<string, CardDef> = {
  grove: {
    id: 'grove',
    tileId: 'grove',
    name: 'Grove',
    category: 'roadside',
    description: 'Spawns a Ratwolf every 2 days onto adjacent road.',
    color: '#15803d',
  },
  cemetery: {
    id: 'cemetery',
    tileId: 'cemetery',
    name: 'Cemetery',
    category: 'roadside',
    description: 'Spawns a Skeleton every 3 days onto adjacent road.',
    color: '#64748b',
  },
  vampire_mansion: {
    id: 'vampire_mansion',
    tileId: 'vampire_mansion',
    name: 'Vampire Mansion',
    category: 'roadside',
    description: 'Adds a Vampire to all battles within 1 tile.',
    color: '#991b1b',
  },
  meadow: {
    id: 'meadow',
    tileId: 'meadow',
    name: 'Meadow',
    category: 'landscape',
    description: 'Heals 2 HP each morning (+3 if Blooming adjacent to non-meadow).',
    color: '#22c55e',
  },
  rock: {
    id: 'rock',
    tileId: 'rock',
    name: 'Rock',
    category: 'landscape',
    description: '+1% base Max HP. 3x3 Rocks form a Mountain Peak (+120 HP)!',
    color: '#78716c',
  },
  oblivion: {
    id: 'oblivion',
    tileId: 'oblivion',
    name: 'Oblivion',
    category: 'special',
    description: 'Destroys any tile and clears monsters on it.',
    color: '#7c3aed',
  },
};

export interface Monster {
  id: string;
  name: string;
  type: 'slime' | 'ratwolf' | 'skeleton' | 'vampire';
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  atkSpeed: number; // attacks per second
  attackMeter: number; // 0 to 1
  color: string;
}

export type EquipSlot = 'weapon' | 'shield' | 'armor' | 'ring';

export interface Equipment {
  id: string;
  name: string;
  slot: EquipSlot;
  level: number;
  rarity: 'common' | 'rare' | 'epic';
  atk: number;
  maxHpBonus: number;
  def: number;
  vampirism: number; // percentage, e.g. 10 = 10% life steal
  regen: number; // hp per second
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  duration: number; // seconds remaining
  maxDuration: number;
}

export interface GridCoord {
  x: number;
  y: number;
}

export interface BoardTile {
  tileId: TileId;
  roadIndex?: number; // if on the loop road
  spawnTimer?: number; // days until next spawn
}

export interface HeroStats {
  hp: number;
  maxHp: number;
  baseMaxHp: number;
  atkMin: number;
  atkMax: number;
  def: number;
  atkSpeed: number; // attacks per second
  vampirism: number; // %
  regen: number; // HP/s
}

export class LoopHeroEngine {
  public width = 12;
  public height = 8;
  public grid: BoardTile[][];
  public roadPath: GridCoord[] = [];

  // Hero
  public heroRoadIndex = 0; // index on roadPath
  public heroProgress = 0; // fractional 0..1 between roadIndex and next
  public heroStats: HeroStats = {
    hp: 250,
    maxHp: 250,
    baseMaxHp: 250,
    atkMin: 8,
    atkMax: 14,
    def: 2,
    atkSpeed: 1.0,
    vampirism: 0,
    regen: 0,
  };
  public heroAttackMeter = 0; // 0..1

  // Equipment
  public equipped: Record<EquipSlot, Equipment | null> = {
    weapon: null,
    shield: null,
    armor: null,
    ring: null,
  };
  public inventory: Equipment[] = [];
  public maxInventory = 12;

  // Deck & Hand
  public hand: CardDef[] = [];
  public maxHand = 6;

  // Monsters currently stationed on road tiles (indexed by road tile index)
  public roadMonsters: Map<number, Monster[]> = new Map();

  // Active Combat State
  public inCombat = false;
  public combatRoadIndex = -1;
  public activeMonsters: Monster[] = [];

  // Day / Night loop
  public dayProgress = 0; // 0 to 1
  public daySeconds = 14; // seconds for 1 full day
  public dayCount = 1;
  public loopCount = 1;

  // Visual effects
  public floatingTexts: FloatingText[] = [];
  public screenShake = 0; // shake intensity
  public isPaused = false;
  public gameSpeed = 1.0;
  public gameOver = false;
  public victory = false;

  constructor() {
    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ tileId: 'empty' as TileId }))
    );
    this.initLoopPath();
    this.giveStarterGearAndCards();
  }

  /**
   * Initializes a balanced closed-loop track on the 12x8 board.
   * Clockwise closed circuit with varied straightaways and corners.
   */
  public initLoopPath(): void {
    const coords: GridCoord[] = [
      { x: 1, y: 1 }, // 0: Campfire
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
      { x: 8, y: 1 },
      { x: 9, y: 1 },
      { x: 10, y: 1 },
      { x: 10, y: 2 },
      { x: 10, y: 3 },
      { x: 9, y: 3 },
      { x: 8, y: 3 },
      { x: 8, y: 4 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 10, y: 5 },
      { x: 10, y: 6 },
      { x: 9, y: 6 },
      { x: 8, y: 6 },
      { x: 7, y: 6 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 6 },
      { x: 2, y: 6 },
      { x: 1, y: 6 },
      { x: 1, y: 5 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ];

    this.roadPath = coords;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      this.grid[c.y][c.x] = {
        tileId: i === 0 ? 'campfire' : 'road',
        roadIndex: i,
      };
    }

    // Spawn 2 initial slimes to kickstart action
    this.spawnMonsterOnRoad(4, 'slime');
    this.spawnMonsterOnRoad(18, 'slime');
  }

  public giveStarterGearAndCards(): void {
    this.hand.push(CARDS.grove);
    this.hand.push(CARDS.meadow);
    this.hand.push(CARDS.rock);
    this.hand.push(CARDS.cemetery);

    const starterSword: Equipment = {
      id: 'sword_starter',
      name: 'Rusty Shortsword',
      slot: 'weapon',
      level: 1,
      rarity: 'common',
      atk: 4,
      maxHpBonus: 0,
      def: 0,
      vampirism: 0,
      regen: 0,
    };
    this.equipItem(starterSword);
  }

  public isRoad(x: number, y: number): boolean {
    return this.grid[y][x].tileId === 'road' || this.grid[y][x].tileId === 'campfire';
  }

  public isAdjacentToRoad(x: number, y: number): boolean {
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
      { x: x + 1, y: y + 1 },
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
    ];
    return neighbors.some(
      n => n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height && this.isRoad(n.x, n.y)
    );
  }

  public canPlaceCard(card: CardDef, x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const currentTile = this.grid[y][x];

    if (card.tileId === 'oblivion') {
      return currentTile.tileId !== 'empty' && currentTile.tileId !== 'campfire';
    }

    // Target must be empty
    if (currentTile.tileId !== 'empty') return false;

    if (card.category === 'roadside') {
      return this.isAdjacentToRoad(x, y);
    }

    if (card.category === 'landscape') {
      // Landscape can be placed anywhere that is not road
      return !this.isRoad(x, y);
    }

    return false;
  }

  public placeCard(cardIndex: number, x: number, y: number): boolean {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return false;
    const card = this.hand[cardIndex];
    if (!this.canPlaceCard(card, x, y)) return false;

    if (card.tileId === 'oblivion') {
      const tile = this.grid[y][x];
      if (tile.roadIndex !== undefined) {
        this.roadMonsters.delete(tile.roadIndex);
      }
      this.grid[y][x] = { tileId: 'empty' };
      this.hand.splice(cardIndex, 1);
      this.recalculateHeroStats();
      return true;
    }

    // Determine actual placed tile (e.g. Blooming meadow check)
    let actualTileId = card.tileId;
    if (actualTileId === 'meadow') {
      if (this.hasNonMeadowNeighbor(x, y)) {
        actualTileId = 'blooming_meadow';
      }
    }

    this.grid[y][x] = {
      tileId: actualTileId,
      spawnTimer: actualTileId === 'grove' ? 2 : actualTileId === 'cemetery' ? 3 : undefined,
    };

    this.hand.splice(cardIndex, 1);

    // Check for Mountain Peak transformation if rock/mountain
    if (actualTileId === 'rock' || actualTileId === 'mountain') {
      this.checkMountainPeakFormation();
    }

    this.recalculateHeroStats();
    return true;
  }

  private hasNonMeadowNeighbor(x: number, y: number): boolean {
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of deltas) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        const neighbor = this.grid[ny][nx].tileId;
        if (neighbor !== 'empty' && neighbor !== 'meadow' && neighbor !== 'blooming_meadow') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Scans the grid for any 3x3 block of rocks/mountains and morphs it into a Mountain Peak!
   */
  public checkMountainPeakFormation(): void {
    for (let y = 0; y <= this.height - 3; y++) {
      for (let x = 0; x <= this.width - 3; x++) {
        let allRock = true;
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const tid = this.grid[y + dy][x + dx].tileId;
            if (tid !== 'rock' && tid !== 'mountain') {
              allRock = false;
              break;
            }
          }
          if (!allRock) break;
        }

        if (allRock) {
          // Transform center to Mountain Peak
          for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
              if (dx === 1 && dy === 1) {
                this.grid[y + dy][x + dx] = { tileId: 'mountain_peak' };
              } else {
                this.grid[y + dy][x + dx] = { tileId: 'mountain' };
              }
            }
          }
          this.addFloatingText('Mountain Peak Formed! (+120 HP)', x + 1, y + 1, '#fbbf24');
          return;
        }
      }
    }
  }

  public recalculateHeroStats(): void {
    let bonusMaxHp = 0;
    let bonusAtk = 0;
    let bonusDef = 0;
    let bonusVamp = 0;
    let bonusRegen = 0;

    // Environmental tiles bonus
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.grid[y][x].tileId;
        if (t === 'rock') bonusMaxHp += Math.round(this.heroStats.baseMaxHp * 0.02);
        if (t === 'mountain') bonusMaxHp += Math.round(this.heroStats.baseMaxHp * 0.04);
        if (t === 'mountain_peak') bonusMaxHp += 120;
        if (t === 'meadow') bonusRegen += 0.2;
        if (t === 'blooming_meadow') bonusRegen += 0.5;
      }
    }

    // Equipment bonus
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      const eq = this.equipped[slot];
      if (eq) {
        bonusAtk += eq.atk;
        bonusDef += eq.def;
        bonusMaxHp += eq.maxHpBonus;
        bonusVamp += eq.vampirism;
        bonusRegen += eq.regen;
      }
    }

    const prevMax = this.heroStats.maxHp;
    this.heroStats.maxHp = this.heroStats.baseMaxHp + bonusMaxHp;
    // Keep HP proportion or add delta
    if (this.heroStats.maxHp > prevMax) {
      this.heroStats.hp += this.heroStats.maxHp - prevMax;
    }
    if (this.heroStats.hp > this.heroStats.maxHp) {
      this.heroStats.hp = this.heroStats.maxHp;
    }

    this.heroStats.atkMin = 8 + bonusAtk;
    this.heroStats.atkMax = 14 + Math.round(bonusAtk * 1.5);
    this.heroStats.def = 2 + bonusDef;
    this.heroStats.vampirism = bonusVamp;
    this.heroStats.regen = bonusRegen;
  }

  public equipItem(item: Equipment, inventoryIndex?: number): void {
    const slot = item.slot;
    const old = this.equipped[slot];

    this.equipped[slot] = item;
    if (inventoryIndex !== undefined && inventoryIndex >= 0 && inventoryIndex < this.inventory.length) {
      if (old) {
        this.inventory[inventoryIndex] = old;
      } else {
        this.inventory.splice(inventoryIndex, 1);
      }
    } else if (old && this.inventory.length < this.maxInventory) {
      this.inventory.push(old);
    }

    this.recalculateHeroStats();
  }

  public discardInventoryItem(index: number): void {
    if (index >= 0 && index < this.inventory.length) {
      this.inventory.splice(index, 1);
    }
  }

  /**
   * Spawns a monster onto a specific road index.
   */
  public spawnMonsterOnRoad(roadIndex: number, type: Monster['type']): void {
    const monsters = this.roadMonsters.get(roadIndex) || [];
    if (monsters.length >= 4) return; // Cap at 4 monsters per tile

    const loopScale = 1 + (this.loopCount - 1) * 0.25;

    let newMonster: Monster;
    if (type === 'slime') {
      newMonster = {
        id: `slime_${Date.now()}_${Math.random()}`,
        name: 'Slime',
        type: 'slime',
        hp: Math.round(25 * loopScale),
        maxHp: Math.round(25 * loopScale),
        atk: Math.round(5 * loopScale),
        def: 0,
        atkSpeed: 0.65,
        attackMeter: 0,
        color: '#22c55e',
      };
    } else if (type === 'ratwolf') {
      newMonster = {
        id: `ratwolf_${Date.now()}_${Math.random()}`,
        name: 'Ratwolf',
        type: 'ratwolf',
        hp: Math.round(45 * loopScale),
        maxHp: Math.round(45 * loopScale),
        atk: Math.round(11 * loopScale),
        def: 2,
        atkSpeed: 0.9,
        attackMeter: 0,
        color: '#ca8a04',
      };
    } else if (type === 'skeleton') {
      newMonster = {
        id: `skel_${Date.now()}_${Math.random()}`,
        name: 'Skeleton',
        type: 'skeleton',
        hp: Math.round(60 * loopScale),
        maxHp: Math.round(60 * loopScale),
        atk: Math.round(16 * loopScale),
        def: 4,
        atkSpeed: 0.5,
        attackMeter: 0,
        color: '#94a3b8',
      };
    } else {
      newMonster = {
        id: `vamp_${Date.now()}_${Math.random()}`,
        name: 'Vampire',
        type: 'vampire',
        hp: Math.round(85 * loopScale),
        maxHp: Math.round(85 * loopScale),
        atk: Math.round(18 * loopScale),
        def: 3,
        atkSpeed: 0.8,
        attackMeter: 0,
        color: '#dc2626',
      };
    }

    monsters.push(newMonster);
    this.roadMonsters.set(roadIndex, monsters);
  }

  /**
   * Advances the world simulation clock by delta seconds.
   */
  public update(dt: number): void {
    if (this.isPaused || this.gameOver) return;

    const effectiveDt = dt * this.gameSpeed;

    // Update screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - effectiveDt * 10);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.duration -= effectiveDt;
      ft.y -= effectiveDt * 0.8;
      if (ft.duration <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Passive Hero Health Regen
    if (this.heroStats.regen > 0 && this.heroStats.hp < this.heroStats.maxHp) {
      this.heroStats.hp = Math.min(this.heroStats.maxHp, this.heroStats.hp + this.heroStats.regen * effectiveDt);
    }

    // Day / Night clock
    this.dayProgress += effectiveDt / this.daySeconds;
    if (this.dayProgress >= 1.0) {
      this.dayProgress -= 1.0;
      this.triggerNewDay();
    }

    // Combat or Walk
    if (this.inCombat) {
      this.updateCombat(effectiveDt);
    } else {
      this.updateMovement(effectiveDt);
    }
  }

  public triggerNewDay(): void {
    this.dayCount++;

    // Morning healing from meadows
    let morningHeal = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.grid[y][x];
        if (t.tileId === 'meadow') morningHeal += 2;
        if (t.tileId === 'blooming_meadow') morningHeal += 4;
        if (t.tileId === 'mountain_peak') morningHeal += 5;

        // Monster spawning timers
        if (t.spawnTimer !== undefined) {
          t.spawnTimer--;
          if (t.spawnTimer <= 0) {
            // Find adjacent road tiles
            const adjRoads = this.getAdjacentRoadIndices(x, y);
            if (adjRoads.length > 0) {
              const targetRoad = adjRoads[Math.floor(Math.random() * adjRoads.length)];
              if (t.tileId === 'grove') {
                this.spawnMonsterOnRoad(targetRoad, 'ratwolf');
                t.spawnTimer = 2;
              } else if (t.tileId === 'cemetery') {
                this.spawnMonsterOnRoad(targetRoad, 'skeleton');
                t.spawnTimer = 3;
              }
            }
          }
        }
      }
    }

    if (morningHeal > 0 && this.heroStats.hp < this.heroStats.maxHp) {
      const healed = Math.min(morningHeal, this.heroStats.maxHp - this.heroStats.hp);
      this.heroStats.hp += healed;
      const heroPos = this.roadPath[this.heroRoadIndex];
      this.addFloatingText(`+${healed} HP Morning`, heroPos.x, heroPos.y, '#4ade80');
    }
  }

  private getAdjacentRoadIndices(x: number, y: number): number[] {
    const indices: number[] = [];
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ];
    for (const [dx, dy] of deltas) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        const tile = this.grid[ny][nx];
        if (tile.roadIndex !== undefined) {
          indices.push(tile.roadIndex);
        }
      }
    }
    return indices;
  }

  private hasVampireMansionAdjacentToRoad(roadIndex: number): boolean {
    const c = this.roadPath[roadIndex];
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ];
    for (const [dx, dy] of deltas) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (this.grid[ny][nx].tileId === 'vampire_mansion') {
          return true;
        }
      }
    }
    return false;
  }

  public updateMovement(dt: number): void {
    const walkSpeed = 0.8; // tiles per second
    this.heroProgress += dt * walkSpeed;

    if (this.heroProgress >= 1.0) {
      this.heroProgress -= 1.0;
      this.heroRoadIndex = (this.heroRoadIndex + 1) % this.roadPath.length;

      // Campfire pass check
      if (this.heroRoadIndex === 0) {
        this.loopCount++;
        const campfireHeal = Math.round(this.heroStats.maxHp * 0.2);
        this.heroStats.hp = Math.min(this.heroStats.maxHp, this.heroStats.hp + campfireHeal);
        const campCoord = this.roadPath[0];
        this.addFloatingText(`Campfire Rest: +${campfireHeal} HP`, campCoord.x, campCoord.y, '#f59e0b');

        // Rewarded with bonus card on loop completion
        this.grantRandomCard();
      }

      // Check if monsters exist on this tile
      const monstersOnTile = this.roadMonsters.get(this.heroRoadIndex);
      if (monstersOnTile && monstersOnTile.length > 0) {
        this.startCombat(this.heroRoadIndex, [...monstersOnTile]);
      }
    }
  }

  public startCombat(roadIndex: number, monsters: Monster[]): void {
    this.inCombat = true;
    this.combatRoadIndex = roadIndex;
    this.heroAttackMeter = 0;

    // Check if a vampire joins
    if (this.hasVampireMansionAdjacentToRoad(roadIndex)) {
      const vampire: Monster = {
        id: `vampire_guest_${Date.now()}`,
        name: 'Lord Vampire',
        type: 'vampire',
        hp: Math.round(90 * (1 + (this.loopCount - 1) * 0.3)),
        maxHp: Math.round(90 * (1 + (this.loopCount - 1) * 0.3)),
        atk: Math.round(18 * (1 + (this.loopCount - 1) * 0.3)),
        def: 3,
        atkSpeed: 0.85,
        attackMeter: 0,
        color: '#b91c1c',
      };
      monsters.push(vampire);
    }

    this.activeMonsters = monsters;
    const pos = this.roadPath[roadIndex];
    this.addFloatingText('BATTLE!', pos.x, pos.y, '#ef4444');
    this.screenShake = 3;
  }

  public updateCombat(dt: number): void {
    if (this.activeMonsters.length === 0) {
      this.finishCombat();
      return;
    }

    const pos = this.roadPath[this.combatRoadIndex];

    // Hero attack charge
    this.heroAttackMeter += dt * this.heroStats.atkSpeed;
    if (this.heroAttackMeter >= 1.0) {
      this.heroAttackMeter = 0;
      this.heroStrike(pos);
    }

    // Check if all monsters died from hero strike
    if (this.activeMonsters.length === 0) {
      this.finishCombat();
      return;
    }

    // Monster attacks charge
    for (const monster of this.activeMonsters) {
      monster.attackMeter += dt * monster.atkSpeed;
      if (monster.attackMeter >= 1.0) {
        monster.attackMeter = 0;
        this.monsterStrike(monster, pos);
        if (this.gameOver) return;
      }
    }
  }

  private heroStrike(pos: GridCoord): void {
    const target = this.activeMonsters[0];
    const rawDmg = Math.floor(Math.random() * (this.heroStats.atkMax - this.heroStats.atkMin + 1)) + this.heroStats.atkMin;
    const isCrit = Math.random() < 0.15;
    const critMult = isCrit ? 1.75 : 1.0;
    const finalDmg = Math.max(1, Math.round((rawDmg * critMult) - target.def));

    target.hp -= finalDmg;
    this.screenShake = isCrit ? 5 : 2;

    const text = isCrit ? `-${finalDmg} CRIT!` : `-${finalDmg}`;
    this.addFloatingText(text, pos.x + 0.3, pos.y - 0.2, isCrit ? '#f59e0b' : '#f87171');

    // Vampirism life steal
    if (this.heroStats.vampirism > 0) {
      const leach = Math.round(finalDmg * (this.heroStats.vampirism / 100));
      if (leach > 0) {
        this.heroStats.hp = Math.min(this.heroStats.maxHp, this.heroStats.hp + leach);
        this.addFloatingText(`+${leach}`, pos.x - 0.2, pos.y - 0.3, '#34d399');
      }
    }

    // Target dead?
    if (target.hp <= 0) {
      this.activeMonsters.shift();
      this.onMonsterDefeated(target, pos);
    }
  }

  private monsterStrike(monster: Monster, pos: GridCoord): void {
    const rawDmg = monster.atk;
    const finalDmg = Math.max(1, rawDmg - this.heroStats.def);
    this.heroStats.hp -= finalDmg;

    this.addFloatingText(`-${finalDmg}`, pos.x - 0.3, pos.y, '#f43f5e');
    this.screenShake = 3;

    if (this.heroStats.hp <= 0) {
      this.heroStats.hp = 0;
      this.gameOver = true;
      this.inCombat = false;
      this.addFloatingText('HERO DEFEATED', pos.x, pos.y, '#e11d48');
    }
  }

  private onMonsterDefeated(monster: Monster, pos: GridCoord): void {
    this.addFloatingText(`${monster.name} Slain`, pos.x, pos.y + 0.2, '#fbbf24');

    // Loot drops
    const dropsEquipment = Math.random() < 0.65;
    if (dropsEquipment) {
      this.generateLootDrop();
    }

    const dropsCard = Math.random() < 0.55;
    if (dropsCard) {
      this.grantRandomCard();
    }
  }

  public generateLootDrop(): void {
    if (this.inventory.length >= this.maxInventory) return;

    const slots: EquipSlot[] = ['weapon', 'shield', 'armor', 'ring'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const level = this.loopCount;

    const rarities: Equipment['rarity'][] = ['common', 'common', 'rare', 'epic'];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const rarityMultiplier = rarity === 'epic' ? 1.8 : rarity === 'rare' ? 1.4 : 1.0;

    let atk = 0;
    let def = 0;
    let maxHpBonus = 0;
    let vampirism = 0;
    let regen = 0;

    if (slot === 'weapon') {
      atk = Math.round((4 + level * 3) * rarityMultiplier);
      if (rarity !== 'common') vampirism = Math.round(5 * rarityMultiplier);
    } else if (slot === 'shield') {
      def = Math.round((2 + level * 2) * rarityMultiplier);
      maxHpBonus = Math.round((20 + level * 10) * rarityMultiplier);
    } else if (slot === 'armor') {
      maxHpBonus = Math.round((50 + level * 30) * rarityMultiplier);
      def = Math.round((1 + level) * rarityMultiplier);
      if (rarity === 'epic') regen = 0.5;
    } else {
      // Ring
      vampirism = Math.round((4 + level * 2) * rarityMultiplier);
      atk = Math.round((1 + level) * rarityMultiplier);
      regen = Math.round((0.2 + level * 0.1) * 10) / 10;
    }

    const adjectives: Record<Equipment['rarity'], string[]> = {
      common: ['Iron', 'Sturdy', 'Worn', 'Bronze'],
      rare: ['Knightly', 'Obsidian', 'Silver', 'Tempered'],
      epic: ['Celestial', 'Vampiric', 'Dragonforged', 'Mythic'],
    };
    const adj = adjectives[rarity][Math.floor(Math.random() * adjectives[rarity].length)];
    const slotNames: Record<EquipSlot, string> = {
      weapon: 'Sword',
      shield: 'Kite Shield',
      armor: 'Platebody',
      ring: 'Band',
    };

    const item: Equipment = {
      id: `loot_${Date.now()}_${Math.random()}`,
      name: `${adj} ${slotNames[slot]} Lv.${level}`,
      slot,
      level,
      rarity,
      atk,
      def,
      maxHpBonus,
      vampirism,
      regen,
    };

    this.inventory.push(item);
    const heroPos = this.roadPath[this.heroRoadIndex];
    this.addFloatingText(`Found ${item.name}!`, heroPos.x, heroPos.y, '#38bdf8');
  }

  public grantRandomCard(): void {
    if (this.hand.length >= this.maxHand) return;

    const pool = [CARDS.grove, CARDS.cemetery, CARDS.vampire_mansion, CARDS.meadow, CARDS.rock, CARDS.oblivion];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    this.hand.push(picked);
  }

  public finishCombat(): void {
    this.inCombat = false;
    this.roadMonsters.delete(this.combatRoadIndex);
    this.activeMonsters = [];
    this.combatRoadIndex = -1;
  }

  public addFloatingText(text: string, x: number, y: number, color: string): void {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      duration: 1.2,
      maxDuration: 1.2,
    });
  }
}
