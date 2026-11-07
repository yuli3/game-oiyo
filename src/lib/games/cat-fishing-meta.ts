/**
 * 냥이 낚시 (CatFishing) - 냥이 낚시터 5대 영구 강화 및 세이브 시스템
 */

export interface CatUpgradeDef {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const CAT_UPGRADES: CatUpgradeDef[] = [
  {
    id: "paw_agility",
    name: {
      ko: "솜방망이 민첩성",
      en: "Soft Paw Agility",
      ja: "肉球アジリティ",
      zh: "软萌肉垫敏捷术",
      es: "Agilidad de pata suave",
      fr: "Agilité de patte douce",
    },
    desc: {
      ko: "물고기 터치 포획 유효 판정 반경 +15% 증가",
      en: "Catch strike effective radius +15% per level",
      ja: "魚タップ捕獲有効判定半径 +15%増加",
      zh: "点击捕获判定有效作用半径 +15%",
      es: "Radio efectivo de captura +15%",
      fr: "Rayon de capture effectif +15%",
    },
    icon: "🐾",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
  },
  {
    id: "catnip_aura",
    name: {
      ko: "특제 캣닢 아우라",
      en: "Special Catnip Aura",
      ja: "特製キャットニップオーラ",
      zh: "特制木天蓼香气",
      es: "Aura de hierba gatera",
      fr: "Aura d'herbe à chat spéciale",
    },
    desc: {
      ko: "연못 물고기의 도주 유영 속도 15% 감속",
      en: "Fish swim & escape velocity reduced by 15% per level",
      ja: "池の魚の逃走遊泳速度 15%減速",
      zh: "游鱼受吸引减速，逃窜游速降低 15%",
      es: "Velocidad de huida de peces -15%",
      fr: "Vitesse de fuite des poissons -15%",
    },
    icon: "🌿",
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.65,
  },
  {
    id: "golden_rod",
    name: {
      ko: "황금 낚싯바늘",
      en: "Golden Fishing Hook",
      ja: "黄金の釣り針",
      zh: "纯金垂钓金钩",
      es: "Anzuelo dorado",
      fr: "Hameçon doré",
    },
    desc: {
      ko: "물고기 포획 시 수확하는 츄르 재화 +25% 증가",
      en: "Churu coins earned per catch +25% per level",
      ja: "魚捕獲時の獲得チュール量 +25%増加",
      zh: "捕获游鱼收获的美味肉泥币 +25%",
      es: "Monedas de golosina por captura +25%",
      fr: "Friandises gagnées par prise +25%",
    },
    icon: "🪝",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
  },
  {
    id: "freeze_laser",
    name: {
      ko: "얼음 레이저 포인터",
      en: "Frost Laser Pointer",
      ja: "フロストレーザーポインター",
      zh: "冰霜激光逗猫笔",
      es: "Puntero láser gélido",
      fr: "Pointeur laser givré",
    },
    desc: {
      ko: "게임당 3초간 모든 물고기를 일시 정지시키는 레이저 사용 횟수 +1회 부여",
      en: "3-second fish freeze laser charges per game +1 per level",
      ja: "全魚を3秒間一時停止させるレーザー使用回数 +1回付与",
      zh: "可冻结全场游鱼3秒的冰霜激光使用次数 +1",
      es: "Cargas de congelación de peces de 3s +1",
      fr: "Charges de gel des poissons (3s) +1",
    },
    icon: "🔴",
    maxLevel: 3,
    baseCost: 280,
    costMultiplier: 2.1,
  },
  {
    id: "feline_luck",
    name: {
      ko: "황금 잉어의 축복",
      en: "Golden Koi Blessing",
      ja: "黄金の鯉の祝福",
      zh: "锦鲤赐福招财铃",
      es: "Bendición de la carpa dorada",
      fr: "Bénédiction de la carpe dorée",
    },
    desc: {
      ko: "연못 승리 시 보너스 츄르 보상 +20% 증가",
      en: "Victory bonus Churu reward +20% per level",
      ja: "池クリア勝利時のボーナスチュール量 +20%増加",
      zh: "捕尽全池通关胜利时的额外肉泥加成 +20%",
      es: "Recompensa de victoria +20%",
      fr: "Récompense de victoire +20%",
    },
    icon: "🔔",
    maxLevel: 5,
    baseCost: 220,
    costMultiplier: 1.7,
  },
];

export interface CatFishingMetaSave {
  version: number;
  walletChuru: number;
  upgradeLevels: Record<string, number>;
  totalFishCaught: number;
  totalPondsCleared: number;
}

export const CAT_STORAGE_KEY = "cat_fishing_meta_save_v1";

export function loadCatFishingMeta(): CatFishingMetaSave {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      version: 1,
      walletChuru: 0,
      upgradeLevels: {},
      totalFishCaught: 0,
      totalPondsCleared: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(CAT_STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        walletChuru: 0,
        upgradeLevels: {},
        totalFishCaught: 0,
        totalPondsCleared: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<CatFishingMetaSave>;
    return {
      version: 1,
      walletChuru: typeof parsed.walletChuru === "number" ? parsed.walletChuru : 0,
      upgradeLevels: parsed.upgradeLevels || {},
      totalFishCaught: typeof parsed.totalFishCaught === "number" ? parsed.totalFishCaught : 0,
      totalPondsCleared: typeof parsed.totalPondsCleared === "number" ? parsed.totalPondsCleared : 0,
    };
  } catch {
    return {
      version: 1,
      walletChuru: 0,
      upgradeLevels: {},
      totalFishCaught: 0,
      totalPondsCleared: 0,
    };
  }
}

export function saveCatFishingMeta(save: CatFishingMetaSave): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // quota exceeded or private mode
  }
}

export function getCatUpgradeCost(def: CatUpgradeDef, currentLevel: number): number {
  if (currentLevel >= def.maxLevel) return 0;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export interface CatFishingModifiers {
  pawRadiusBonus: number;
  catnipSlowMult: number;
  churuYieldMult: number;
  freezeCharges: number;
  victoryBonusMult: number;
}

export function computeCatFishingModifiers(save: CatFishingMetaSave): CatFishingModifiers {
  const lv = (id: string) => save.upgradeLevels[id] || 0;
  return {
    pawRadiusBonus: 1.0 + lv("paw_agility") * 0.15,
    catnipSlowMult: Math.max(0.4, 1.0 - lv("catnip_aura") * 0.12),
    churuYieldMult: 1.0 + lv("golden_rod") * 0.25,
    freezeCharges: lv("freeze_laser"),
    victoryBonusMult: 1.0 + lv("feline_luck") * 0.2,
  };
}
