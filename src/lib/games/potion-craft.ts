export type IngredientId = 'terraria' | 'waterbloom' | 'firebell' | 'windbloom';

export interface Ingredient {
  id: IngredientId;
  name: string;
  element: 'earth' | 'water' | 'fire' | 'air';
  color: string;
  // Vector path definition (dx, dy normalized per 100% grind)
  vector: { dx: number; dy: number; curveX?: number; curveY?: number };
  count: number;
}

export type PotionEffect =
  | 'healing'
  | 'poison'
  | 'fire'
  | 'frost'
  | 'mana'
  | 'invisibility'
  | 'lightning';

export interface EffectNode {
  effect: PotionEffect;
  name: string;
  x: number;
  y: number;
  radius: number;
  tier: 1 | 2 | 3;
}

export interface DangerZone {
  x: number;
  y: number;
  radius: number;
}

export interface CustomerOrder {
  id: string;
  customerName: string;
  requestText: string;
  desiredEffect: PotionEffect;
  rewardGold: number;
}

export interface PotionCraftState {
  bottleX: number;
  bottleY: number;
  currentPath: Array<{ x: number; y: number }>;
  activeIngredient: IngredientId | null;
  grindProgress: number; // 0 to 1
  stirProgress: number; // 0 to 1
  ingredients: Record<IngredientId, Ingredient>;
  dangerZones: DangerZone[];
  effectNodes: EffectNode[];
  activeEffects: PotionEffect[];
  isFailed: boolean; // dipped into skull danger zone
  gold: number;
  day: number;
  currentCustomer: CustomerOrder | null;
  customersServed: number;
}

export const INGREDIENTS_CATALOG: Record<IngredientId, Omit<Ingredient, 'count'>> = {
  terraria: {
    id: 'terraria',
    name: '테라리아 (대지의 버섯)',
    element: 'earth',
    color: '#84cc16',
    vector: { dx: 2.8, dy: -1.2, curveX: 1.5, curveY: -0.2 },
  },
  waterbloom: {
    id: 'waterbloom',
    name: '워터블룸 (물의 꽃)',
    element: 'water',
    color: '#06b6d4',
    vector: { dx: 1.2, dy: 3.2, curveX: 0.2, curveY: 1.8 },
  },
  firebell: {
    id: 'firebell',
    name: '파이어벨 (불꽃 종)',
    element: 'fire',
    color: '#ef4444',
    vector: { dx: -1.4, dy: -3.0, curveX: -0.5, curveY: -1.5 },
  },
  windbloom: {
    id: 'windbloom',
    name: '윈드블룸 (바람꽃)',
    element: 'air',
    color: '#a855f7',
    vector: { dx: -3.0, dy: 1.4, curveX: -1.6, curveY: 0.4 },
  },
};

export const EFFECT_NODES: EffectNode[] = [
  { effect: 'healing', name: '치유의 물약', x: 3.5, y: 1.5, radius: 0.9, tier: 1 },
  { effect: 'poison', name: '극독의 비약', x: -3.5, y: -1.0, radius: 0.9, tier: 1 },
  { effect: 'fire', name: '화염의 비약', x: 1.0, y: -4.0, radius: 0.9, tier: 1 },
  { effect: 'frost', name: '냉기의 비약', x: -1.5, y: -4.0, radius: 0.9, tier: 1 },
  { effect: 'mana', name: '마나의 물약', x: 0.0, y: 4.5, radius: 0.9, tier: 1 },
  { effect: 'lightning', name: '번개의 비약', x: 4.5, y: 4.0, radius: 0.8, tier: 2 },
  { effect: 'invisibility', name: '투명화의 물약', x: -4.5, y: 3.5, radius: 0.8, tier: 2 },
];

export const DANGER_ZONES: DangerZone[] = [
  { x: 1.5, y: -1.2, radius: 0.85 },
  { x: -1.8, y: 1.5, radius: 0.9 },
  { x: 2.2, y: 3.0, radius: 0.8 },
  { x: -2.0, y: -2.5, radius: 0.85 },
];

export const CUSTOMER_POOL: Omit<CustomerOrder, 'id'>[] = [
  {
    customerName: '부상당한 사냥꾼',
    requestText: '숲에서 늑대에게 다리를 물렸소. 덧나지 않고 상처를 아물게 해줄 약이 필요하오!',
    desiredEffect: 'healing',
    rewardGold: 35,
  },
  {
    customerName: '곡물 창고지기',
    requestText: '창고에 독한 쥐들이 득실거립니다. 곡물은 건드리지 않고 쥐들을 박멸할 독약을 주시오!',
    desiredEffect: 'poison',
    rewardGold: 40,
  },
  {
    customerName: '얼음 동굴 탐험가',
    requestText: '영구동토층 깊은 동굴로 들어갑니다. 장작 없이도 손을 덥히고 불을 지필 비약이 필요해요.',
    desiredEffect: 'fire',
    rewardGold: 45,
  },
  {
    customerName: '열사병 걸린 상인',
    requestText: '작열하는 사막을 건너느라 온몸이 타들어갈 것 같습니다. 열기를 식혀줄 시원한 냉기 약을!',
    desiredEffect: 'frost',
    rewardGold: 45,
  },
  {
    customerName: '젊은 견습 마법사',
    requestText: '비전 마법 시험이 코앞인데 마나가 턱없이 부족해요! 정신을 맑게 하고 마나를 채워줄 포션을 원합니다.',
    desiredEffect: 'mana',
    rewardGold: 50,
  },
];

export class PotionCraftEngine {
  public state: PotionCraftState;

  constructor() {
    this.state = this.initGame();
  }

  public initGame(): PotionCraftState {
    const ingredients: Record<IngredientId, Ingredient> = {
      terraria: { ...INGREDIENTS_CATALOG.terraria, count: 6 },
      waterbloom: { ...INGREDIENTS_CATALOG.waterbloom, count: 6 },
      firebell: { ...INGREDIENTS_CATALOG.firebell, count: 6 },
      windbloom: { ...INGREDIENTS_CATALOG.windbloom, count: 6 },
    };

    return {
      bottleX: 0,
      bottleY: 0,
      currentPath: [{ x: 0, y: 0 }],
      activeIngredient: null,
      grindProgress: 0,
      stirProgress: 0,
      ingredients,
      dangerZones: [...DANGER_ZONES],
      effectNodes: [...EFFECT_NODES],
      activeEffects: [],
      isFailed: false,
      gold: 50,
      day: 1,
      currentCustomer: this.getRandomCustomer(),
      customersServed: 0,
    };
  }

  public getRandomCustomer(): CustomerOrder {
    const template = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
    return {
      ...template,
      id: `cust-${Date.now()}-${Math.random()}`,
    };
  }

  // Put ingredient into mortar to grind
  public selectIngredientForMortar(id: IngredientId): boolean {
    const ing = this.state.ingredients[id];
    if (!ing || ing.count <= 0 || this.state.activeIngredient !== null) {
      return false;
    }
    ing.count -= 1;
    this.state.activeIngredient = id;
    this.state.grindProgress = 0;
    return true;
  }

  // Grind in mortar with pestle (0 to 1)
  public grind(delta: number): number {
    if (!this.state.activeIngredient) return 0;
    this.state.grindProgress = Math.min(1.0, this.state.grindProgress + delta);
    return this.state.grindProgress;
  }

  // Transfer ground ingredient into cauldron to plot path
  public addToCauldron(): boolean {
    if (!this.state.activeIngredient) return false;

    const ing = this.state.ingredients[this.state.activeIngredient];
    const grind = Math.max(0.15, this.state.grindProgress); // minimum travel even with slight crush
    const lastPos = this.state.currentPath[this.state.currentPath.length - 1];

    // Calculate curve path interpolation points (10 steps)
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Quadratic Bezier curve
      const p0x = lastPos.x;
      const p0y = lastPos.y;
      const p1x = lastPos.x + (ing.vector.curveX || 0) * grind;
      const p1y = lastPos.y + (ing.vector.curveY || 0) * grind;
      const p2x = lastPos.x + ing.vector.dx * grind;
      const p2y = lastPos.y + ing.vector.dy * grind;

      const x = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
      const y = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;
      this.state.currentPath.push({ x, y });
    }

    this.state.activeIngredient = null;
    this.state.grindProgress = 0;
    return true;
  }

  // Stir cauldron to advance potion bottle along path
  public stir(delta: number): boolean {
    if (this.state.isFailed || this.state.currentPath.length <= 1) return false;

    const stepSpeed = 15; // steps per full stir unit
    const advanceSteps = Math.max(1, Math.floor(delta * stepSpeed));

    for (let i = 0; i < advanceSteps && this.state.currentPath.length > 1; i++) {
      // Remove first point, move bottle to next point
      this.state.currentPath.shift();
      const currentPos = this.state.currentPath[0];
      this.state.bottleX = currentPos.x;
      this.state.bottleY = currentPos.y;

      // Check danger zones collision
      for (const dz of this.state.dangerZones) {
        const dist = Math.hypot(this.state.bottleX - dz.x, this.state.bottleY - dz.y);
        if (dist < dz.radius) {
          this.state.isFailed = true;
          return false;
        }
      }

      // Check effect nodes touching
      this.checkEffectNodes();
    }

    return true;
  }

  // Pour water to dilute potion (pulls bottle back toward center 0, 0)
  public addWater(amount: number): boolean {
    if (this.state.isFailed) return false;

    const pullSpeed = 0.5;
    const distToCenter = Math.hypot(this.state.bottleX, this.state.bottleY);
    if (distToCenter < 0.05) return false;

    const dirX = -this.state.bottleX / distToCenter;
    const dirY = -this.state.bottleY / distToCenter;
    const pullDist = Math.min(distToCenter, amount * pullSpeed);

    this.state.bottleX += dirX * pullDist;
    this.state.bottleY += dirY * pullDist;

    // Reset remaining path to start from new diluted bottle position
    this.state.currentPath = [{ x: this.state.bottleX, y: this.state.bottleY }];

    this.checkEffectNodes();
    return true;
  }

  private checkEffectNodes(): void {
    for (const node of this.state.effectNodes) {
      const dist = Math.hypot(this.state.bottleX - node.x, this.state.bottleY - node.y);
      if (dist <= node.radius) {
        if (!this.state.activeEffects.includes(node.effect)) {
          this.state.activeEffects.push(node.effect);
        }
      }
    }
  }

  // Finish and brew potion with Bellows heat
  public brewPotion(): { success: boolean; brewedEffect: PotionEffect | null; message: string } {
    if (this.state.isFailed) {
      return { success: false, brewedEffect: null, message: '물약이 해골 지대에서 파괴되었습니다!' };
    }

    if (this.state.activeEffects.length === 0) {
      return { success: false, brewedEffect: null, message: '어떤 효능 노드에도 닿지 않아 맹물이 되었습니다.' };
    }

    const primaryEffect = this.state.activeEffects[this.state.activeEffects.length - 1];
    return {
      success: true,
      brewedEffect: primaryEffect,
      message: `${primaryEffect} 물약이 완성되었습니다!`,
    };
  }

  // Serve brewed potion to current waiting customer
  public serveCustomer(effect: PotionEffect): { success: boolean; goldEarned: number; feedback: string } {
    if (!this.state.currentCustomer) {
      return { success: false, goldEarned: 0, feedback: '기다리는 손님이 없습니다.' };
    }

    if (this.state.currentCustomer.desiredEffect === effect) {
      const earned = this.state.currentCustomer.rewardGold;
      this.state.gold += earned;
      this.state.customersServed += 1;
      this.state.currentCustomer = this.getRandomCustomer();
      this.resetCauldron();
      return {
        success: true,
        goldEarned: earned,
        feedback: '완벽합니다! 손님이 매우 만족하며 금화를 지불했습니다!',
      };
    } else {
      return {
        success: false,
        goldEarned: 0,
        feedback: '손님이 원한 효능의 물약이 아닙니다! (손님이 고개를 젓습니다)',
      };
    }
  }

  // Reset cauldron to origin (0, 0) for next potion
  public resetCauldron(): void {
    this.state.bottleX = 0;
    this.state.bottleY = 0;
    this.state.currentPath = [{ x: 0, y: 0 }];
    this.state.activeIngredient = null;
    this.state.grindProgress = 0;
    this.state.stirProgress = 0;
    this.state.activeEffects = [];
    this.state.isFailed = false;
  }
}
