/**
 * 바이킹 롱쉽 (VikingLongship) - 바이킹 조선소 5대 영구 강화 및 세이브 시스템
 */

export interface VikingUpgradeDef {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const VIKING_UPGRADES: VikingUpgradeDef[] = [
  {
    id: "ironclad_hull",
    name: {
      ko: "오크나무 강화 선체",
      en: "Reinforced Oak Hull",
      ja: "強化オーク船体",
      zh: "硬化橡木船体",
      es: "Casco de roble reforzado",
      fr: "Coque en chêne renforcé",
    },
    desc: {
      ko: "선체 최대 체력 +20 HP 증가",
      en: "Max hull HP +20 per level",
      ja: "船体最大HP +20増加",
      zh: "船体最大生命值 +20 HP",
      es: "HP máximo del casco +20",
      fr: "Points de vie max de la coque +20",
    },
    icon: "🛡️",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
  },
  {
    id: "silk_sail",
    name: {
      ko: "북풍의 마법 돛",
      en: "North Wind Enchanted Sail",
      ja: "北風の魔法の帆",
      zh: "北风附魔帆布",
      es: "Vela mágica del viento norte",
      fr: "Voile enchantée du vent du nord",
    },
    desc: {
      ko: "풍향 풍속에 따른 추진 효율 +15% 증가",
      en: "Wind propulsion efficiency +15% per level",
      ja: "風向・風速による推進効率 +15%増加",
      zh: "顺风与逆风航行推进效率 +15%",
      es: "Eficiencia de propulsión del viento +15%",
      fr: "Efficacité de propulsion par le vent +15%",
    },
    icon: "⛵",
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.65,
  },
  {
    id: "valkyrie_harpoon",
    name: {
      ko: "발키리의 번개 작살",
      en: "Valkyrie Lightning Harpoon",
      ja: "ワルキューレの雷銛",
      zh: "女武神狂雷鱼叉",
      es: "Arpón relámpago de valquiria",
      fr: "Harpon foudroyant de valkyrie",
    },
    desc: {
      ko: "작살포 공격력 +20% 및 사거리 증가",
      en: "Harpoon damage +20% and extended range",
      ja: "銛砲の攻撃力 +20%および射程増加",
      zh: "鱼叉炮伤害 +20% 且射程延伸",
      es: "Daño del arpón +20% y mayor alcance",
      fr: "Dégâts du harpon +20% et portée accrue",
    },
    icon: "🔱",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
  },
  {
    id: "emergency_planks",
    name: {
      ko: "비상 수리 키트",
      en: "Emergency Repair Kit",
      ja: "緊急修理キット",
      zh: "应急速补木板",
      es: "Kit de reparación de emergencia",
      fr: "Kit de réparation d'urgence",
    },
    desc: {
      ko: "게임당 목재 소모 없는 긴급 수리 횟수 +1회 부여",
      en: "Free emergency hull repairs per voyage +1 per level",
      ja: "木材消費なしの緊急修理回数 +1回付与",
      zh: "单局游戏无需消耗木材的紧急修复可用次数 +1",
      es: "Reparaciones de emergencia gratuitas +1",
      fr: "Réparations d'urgence gratuites +1",
    },
    icon: "🧰",
    maxLevel: 3,
    baseCost: 280,
    costMultiplier: 2.1,
  },
  {
    id: "silver_dredge",
    name: {
      ko: "황금 인양 그물",
      en: "Golden Dredge Net",
      ja: "黄金の引き揚げ網",
      zh: "黄金打捞网",
      es: "Red de dragado dorada",
      fr: "Filet de dragage doré",
    },
    desc: {
      ko: "항해 및 섬 탐험 시 획득하는 은화 보상 +25% 증가",
      en: "Silver coins earned from sailing and islands +25% per level",
      ja: "航海・島探検時の獲得銀貨量 +25%増加",
      zh: "航海与岛屿探险时获得的银币奖励 +25%",
      es: "Monedas de plata obtenidas +25%",
      fr: "Pièces d'argent gagnées +25%",
    },
    icon: "🪙",
    maxLevel: 5,
    baseCost: 220,
    costMultiplier: 1.7,
  },
];

export interface VikingLongshipMetaSave {
  version: number;
  walletSilver: number;
  upgradeLevels: Record<string, number>;
  totalIslandsExplored: number;
  totalMonstersDefeated: number;
  totalVoyagesCompleted: number;
}

export const VIKING_STORAGE_KEY = "viking_longship_meta_save_v1";

export function loadVikingLongshipMeta(): VikingLongshipMetaSave {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      version: 1,
      walletSilver: 0,
      upgradeLevels: {},
      totalIslandsExplored: 0,
      totalMonstersDefeated: 0,
      totalVoyagesCompleted: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(VIKING_STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        walletSilver: 0,
        upgradeLevels: {},
        totalIslandsExplored: 0,
        totalMonstersDefeated: 0,
        totalVoyagesCompleted: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<VikingLongshipMetaSave>;
    return {
      version: 1,
      walletSilver: typeof parsed.walletSilver === "number" ? parsed.walletSilver : 0,
      upgradeLevels: parsed.upgradeLevels || {},
      totalIslandsExplored: typeof parsed.totalIslandsExplored === "number" ? parsed.totalIslandsExplored : 0,
      totalMonstersDefeated: typeof parsed.totalMonstersDefeated === "number" ? parsed.totalMonstersDefeated : 0,
      totalVoyagesCompleted: typeof parsed.totalVoyagesCompleted === "number" ? parsed.totalVoyagesCompleted : 0,
    };
  } catch {
    return {
      version: 1,
      walletSilver: 0,
      upgradeLevels: {},
      totalIslandsExplored: 0,
      totalMonstersDefeated: 0,
      totalVoyagesCompleted: 0,
    };
  }
}

export function saveVikingLongshipMeta(save: VikingLongshipMetaSave): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(VIKING_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // quota exceeded or private mode
  }
}

export function getVikingUpgradeCost(def: VikingUpgradeDef, currentLevel: number): number {
  if (currentLevel >= def.maxLevel) return 0;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export interface VikingLongshipModifiers {
  maxHpBonus: number;
  sailEfficiencyBonus: number;
  harpoonDamageMult: number;
  emergencyRepairs: number;
  silverDredgeMult: number;
}

export function computeVikingLongshipModifiers(save: VikingLongshipMetaSave): VikingLongshipModifiers {
  const lv = (id: string) => save.upgradeLevels[id] || 0;
  return {
    maxHpBonus: lv("ironclad_hull") * 20,
    sailEfficiencyBonus: 1.0 + lv("silk_sail") * 0.15,
    harpoonDamageMult: 1.0 + lv("valkyrie_harpoon") * 0.2,
    emergencyRepairs: lv("emergency_planks"),
    silverDredgeMult: 1.0 + lv("silver_dredge") * 0.25,
  };
}
