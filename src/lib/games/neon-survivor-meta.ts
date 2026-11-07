import type { Locale } from '../i18n';

export interface MetaUpgradeDef {
  id: 'reactorPower' | 'hullPlating' | 'magnetCoil' | 'warpThrust' | 'critAlgorithm';
  icon: string;
  maxLevel: number;
  costPerLevel: number[];
  name: Record<Locale, string>;
  desc: Record<Locale, string>;
}

export interface PlayerMetaState {
  crystals: number;
  upgrades: {
    reactorPower: number;
    hullPlating: number;
    magnetCoil: number;
    warpThrust: number;
    critAlgorithm: number;
  };
}

export const META_UPGRADE_DEFS: MetaUpgradeDef[] = [
  {
    id: 'reactorPower',
    icon: '⚡',
    maxLevel: 5,
    costPerLevel: [30, 60, 100, 150, 220],
    name: {
      ko: '오버클럭 리액터 (공격력)',
      en: 'Overclocked Reactor (Power)',
      ja: 'オーバークロック炉 (攻撃力)',
      zh: '超频核反应堆 (攻击力)',
      fr: 'Réacteur Surcadencé (Puissance)',
      es: 'Reactor Sobrecargado (Poder)',
    },
    desc: {
      ko: '모든 무기 탄환 및 충격파 피해량이 레벨당 +6% 증가합니다.',
      en: 'Increases all weapon and shockwave damage by +6% per level.',
      ja: '全兵器の弾丸・衝撃波ダメージがLvごとに+6%増加します。',
      zh: '每级提升所有武器弹幕与冲击波伤害 +6%。',
      fr: 'Augmente tous les dégâts des armes de +6% par niveau.',
      es: 'Aumenta el daño de todas las armas un +6% por nivel.',
    },
  },
  {
    id: 'hullPlating',
    icon: '🛡️',
    maxLevel: 5,
    costPerLevel: [25, 50, 80, 130, 200],
    name: {
      ko: '나노 티타늄 장갑 (체력)',
      en: 'Nano-Titanium Plating (HP)',
      ja: 'ナノチタン装甲 (耐久値)',
      zh: '纳米钛合金装甲 (生命值)',
      fr: 'Blindage Nano-Titane (PV)',
      es: 'Blindaje de Nanotitanio (Vida)',
    },
    desc: {
      ko: '기체의 기본 최대 체력이 레벨당 +25 증가합니다.',
      en: 'Increases maximum hull integrity by +25 HP per level.',
      ja: '機体の基本最大耐久値がLvごとに+25増加します。',
      zh: '每级提升机体基础生命值上限 +25。',
      fr: 'Augmente la santé maximale de la coque de +25 par niveau.',
      es: 'Aumenta la integridad máxima de la nave en +25 por nivel.',
    },
  },
  {
    id: 'magnetCoil',
    icon: '🧲',
    maxLevel: 5,
    costPerLevel: [20, 40, 70, 110, 180],
    name: {
      ko: '중력 집속 코일 (자석)',
      en: 'Gravity Collector (Magnet)',
      ja: '重力集束コイル (マグネット)',
      zh: '重力聚能线圈 (磁力吸附)',
      fr: 'Collecteur Gravitationnel (Aimant)',
      es: 'Colector Gravitacional (Imán)',
    },
    desc: {
      ko: '경험치 젬을 끌어당기는 자석 반경이 레벨당 +20% 확장됩니다.',
      en: 'Expands EXP gem attraction radius by +20% per level.',
      ja: 'EXPジェムを引き寄せる吸引範囲がLvごとに+20%拡大します。',
      zh: '每级扩大经验宝石吸引范围 +20%。',
      fr: 'Étend le rayon d’attraction des gemmes d’EXP de +20% par niveau.',
      es: 'Expande el radio de atracción de gemas de EXP un +20% por nivel.',
    },
  },
  {
    id: 'warpThrust',
    icon: '🚀',
    maxLevel: 5,
    costPerLevel: [30, 60, 90, 140, 210],
    name: {
      ko: '플라즈마 부스터 (이동속도)',
      en: 'Plasma Thrusters (Speed)',
      ja: 'プラズマブースター (移動速度)',
      zh: '等离子推进器 (移速)',
      fr: 'Propulseurs Plasma (Vitesse)',
      es: 'Propulsores de Plasma (Velocidad)',
    },
    desc: {
      ko: '기체 기본 이동 속도가 레벨당 +5% 증가합니다.',
      en: 'Increases base flight velocity by +5% per level.',
      ja: '機体の基本移動速度がLvごとに+5%向上します。',
      zh: '每级提高机体基础飞行移速 +5%。',
      fr: 'Augmente la vitesse de déplacement de +5% par niveau.',
      es: 'Aumenta la velocidad de vuelo un +5% por nivel.',
    },
  },
  {
    id: 'critAlgorithm',
    icon: '🎯',
    maxLevel: 5,
    costPerLevel: [40, 80, 130, 190, 260],
    name: {
      ko: '약점 사격 알고리즘 (치명타)',
      en: 'Targeting Algorithm (Crit)',
      ja: '弱点照準アルゴリズム (クリティカル)',
      zh: '弱点瞄准算法 (暴击率)',
      fr: 'Algorithme de Ciblage (Critique)',
      es: 'Algoritmo de Disparo (Crítico)',
    },
    desc: {
      ko: '2배 치명타 공격이 발동할 확률이 레벨당 +4% 증가합니다.',
      en: 'Grants +4% chance per level to deal 200% critical damage.',
      ja: 'Lvごとに+4%の確率で2倍クリティカルダメージが発生します。',
      zh: '每级增加 +4% 触发200%致命暴击的概率。',
      fr: 'Confère +4% de chance par niveau d’infliger 200% de dégâts critiques.',
      es: 'Otorga un +4% de probabilidad por nivel de daño crítico x2.',
    },
  },
];

const STORAGE_KEY = 'neon_survivor_meta_progression_v1';

export function loadMetaState(): PlayerMetaState {
  if (typeof window === 'undefined') {
    return {
      crystals: 0,
      upgrades: {
        reactorPower: 0,
        hullPlating: 0,
        magnetCoil: 0,
        warpThrust: 0,
        critAlgorithm: 0,
      },
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('No save');
    const parsed = JSON.parse(raw) as PlayerMetaState;
    return {
      crystals: typeof parsed.crystals === 'number' ? parsed.crystals : 0,
      upgrades: {
        reactorPower: Math.min(5, Math.max(0, parsed.upgrades?.reactorPower || 0)),
        hullPlating: Math.min(5, Math.max(0, parsed.upgrades?.hullPlating || 0)),
        magnetCoil: Math.min(5, Math.max(0, parsed.upgrades?.magnetCoil || 0)),
        warpThrust: Math.min(5, Math.max(0, parsed.upgrades?.warpThrust || 0)),
        critAlgorithm: Math.min(5, Math.max(0, parsed.upgrades?.critAlgorithm || 0)),
      },
    };
  } catch {
    return {
      crystals: 0,
      upgrades: {
        reactorPower: 0,
        hullPlating: 0,
        magnetCoil: 0,
        warpThrust: 0,
        critAlgorithm: 0,
      },
    };
  }
}

export function saveMetaState(state: PlayerMetaState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // LocalStorage quota or disabled
  }
}

export function purchaseMetaUpgrade(
  state: PlayerMetaState,
  upgradeId: keyof PlayerMetaState['upgrades']
): { success: boolean; newState: PlayerMetaState } {
  const currentLvl = state.upgrades[upgradeId];
  const def = META_UPGRADE_DEFS.find((d) => d.id === upgradeId);
  if (!def || currentLvl >= def.maxLevel) {
    return { success: false, newState: state };
  }

  const cost = def.costPerLevel[currentLvl];
  if (state.crystals < cost) {
    return { success: false, newState: state };
  }

  const newState: PlayerMetaState = {
    crystals: state.crystals - cost,
    upgrades: {
      ...state.upgrades,
      [upgradeId]: currentLvl + 1,
    },
  };
  saveMetaState(newState);
  return { success: true, newState };
}
