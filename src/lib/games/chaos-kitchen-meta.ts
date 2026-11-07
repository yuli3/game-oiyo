/**
 * 카오스 키친 (ChaosKitchen) - 5대 주방 설비 연구소 및 영구 세이브 시스템
 */

export interface KitchenUpgrade {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  level: number;
  maxLevel: number;
  cost: number;
  costMult: number;
  valuePerLevel: number;
}

export interface KitchenMetaSave {
  goldStars: number;
  lifetimeDishesServed: number;
  lifetimeFiresExtinguished: number;
  knifeSharpnessLvl: number;
  turboBurnerLvl: number;
  autoSprinklerLvl: number;
  royalTablewareLvl: number;
  antiSlipShoesLvl: number;
}

export const INITIAL_KITCHEN_META_SAVE: KitchenMetaSave = {
  goldStars: 0,
  lifetimeDishesServed: 0,
  lifetimeFiresExtinguished: 0,
  knifeSharpnessLvl: 0,
  turboBurnerLvl: 0,
  autoSprinklerLvl: 0,
  royalTablewareLvl: 0,
  antiSlipShoesLvl: 0,
};

export const KITCHEN_UPGRADES: Record<string, Omit<KitchenUpgrade, "level">> = {
  knifeSharpness: {
    id: "knifeSharpness",
    name: {
      ko: "다마스커스 명품 식도",
      en: "Damascus Chef Knife",
      ja: "ダマスカス名刀包丁",
      zh: "大马士革极锋主厨刀",
      es: "Cuchillo Damasco de chef",
      fr: "Couteau de chef Damas",
    },
    desc: {
      ko: "토마토와 양배추 등 재료를 도마에서 써는 속도가 레벨당 20% 증가",
      en: "Increases ingredient chopping speed on cutting boards by 20% per level",
      ja: "まな板でトマトや野菜を刻む速度がレベル毎に20%高速化",
      zh: "案板上切碎番茄与生菜的速度每级提升20%",
      es: "Aumenta la velocidad de picado en la tabla un 20% por nivel",
      fr: "Accélère la découpe des légumes de 20% par niveau",
    },
    icon: "🔪",
    maxLevel: 4,
    cost: 150,
    costMult: 1.8,
    valuePerLevel: 0.2,
  },
  turboBurner: {
    id: "turboBurner",
    name: {
      ko: "인덕션 터보 화구",
      en: "Induction Turbo Burner",
      ja: "インダクション高火力コンロ",
      zh: "电磁感应涡轮猛火灶",
      es: "Quemador turbo de inducción",
      fr: "Brûleur turbo à induction",
    },
    desc: {
      ko: "프라이팬에서 고기가 노릇하게 익는 조리 속도가 레벨당 15% 가속",
      en: "Accelerates stove patty frying speed by 15% per level",
      ja: "フライパンでお肉が焼ける調理速度がレベル毎に15%短縮",
      zh: "炉灶上煎制肉排的熟化速度每级提升15%",
      es: "Acelera el cocinado de carne en sartén un 15% por nivel",
      fr: "Accélère la cuisson des steaks de 15% par niveau",
    },
    icon: "🔥",
    maxLevel: 4,
    cost: 200,
    costMult: 1.8,
    valuePerLevel: 0.15,
  },
  autoSprinkler: {
    id: "autoSprinkler",
    name: {
      ko: "세이프티 스프링클러",
      en: "Ceiling Fire Sprinkler",
      ja: "天井安全スプリンクラー",
      zh: "后厨防火自动喷淋",
      es: "Rociador de techo antiincendios",
      fr: "Sprinkler anti-incendie",
    },
    desc: {
      ko: "프라이팬 과열 시 화재 발생 확률이 레벨당 20% 지연/감소",
      en: "Delays and dampens stove fire ignition chances by 20% per level",
      ja: "フライパン加熱時の発火確率がレベル毎に20%遅延・緩和",
      zh: "大幅延缓过热着火几率，每级减少20%火灾扩散速度",
      es: "Reduce el riesgo de incendio en fogones un 20% por nivel",
      fr: "Retarde le départ de feu sur les poêles de 20% par niveau",
    },
    icon: "🧯",
    maxLevel: 3,
    cost: 250,
    costMult: 2.0,
    valuePerLevel: 0.2,
  },
  royalTableware: {
    id: "royalTableware",
    name: {
      ko: "미슐랭 로열 식기",
      en: "Michelin Royal Tableware",
      ja: "ミシュラン宮廷食器セット",
      zh: "米其林皇家镀金餐具",
      es: "Vajilla real Michelin",
      fr: "Vaisselle royale Michelin",
    },
    desc: {
      ko: "완성된 요리 서빙 성공 시 획득하는 골드 스타(팁)가 레벨당 25% 추가 지급",
      en: "Grants 25% bonus Gold Star tips per level upon successful dish delivery",
      ja: "料理納品成功時に獲得できるスター(チップ)がレベル毎に25%増加",
      zh: "料理出餐送达时获得的小费金星每级额外增加25%",
      es: "Otorga un 25% más de estrellas de propina por nivel",
      fr: "Octroie 25% d'étoiles de pourboire en plus par niveau",
    },
    icon: "🍽️",
    maxLevel: 4,
    cost: 200,
    costMult: 1.8,
    valuePerLevel: 0.25,
  },
  antiSlipShoes: {
    id: "antiSlipShoes",
    name: {
      ko: "미끄럼 방지 셰프화",
      en: "Anti-Slip Kitchen Clogs",
      ja: "滑り止めプロ料理靴",
      zh: "防滑防油专业主厨鞋",
      es: "Zuecos antideslizantes de cocina",
      fr: "Sabots de cuisine antidérapants",
    },
    desc: {
      ko: "주방 내 셰프의 이동 및 선회 속도가 레벨당 12% 향상",
      en: "Increases chef move speed and turnaround agility by 12% per level",
      ja: "厨房内のシェフの移動・方向転換速度がレベル毎に12%向上",
      zh: "主厨在厨房地砖上的移动跑动速度每级提升12%",
      es: "Aumenta la velocidad de movimiento del chef un 12% por nivel",
      fr: "Améliore la vitesse de déplacement du chef de 12% par niveau",
    },
    icon: "👟",
    maxLevel: 3,
    cost: 180,
    costMult: 1.9,
    valuePerLevel: 0.12,
  },
};

export function loadKitchenMetaSave(): KitchenMetaSave {
  if (typeof window === "undefined") return INITIAL_KITCHEN_META_SAVE;
  try {
    const raw = localStorage.getItem("chaos_kitchen_meta_save_v1");
    if (!raw) return INITIAL_KITCHEN_META_SAVE;
    const parsed = JSON.parse(raw) as Partial<KitchenMetaSave>;
    return { ...INITIAL_KITCHEN_META_SAVE, ...parsed };
  } catch {
    return INITIAL_KITCHEN_META_SAVE;
  }
}

export function saveKitchenMetaSave(save: KitchenMetaSave): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("chaos_kitchen_meta_save_v1", JSON.stringify(save));
  } catch {
    // ignore
  }
}

export interface KitchenModifiers {
  chopSpeedMult: number; // 1.0 + level * 0.2
  cookSpeedMult: number; // 1.0 + level * 0.15
  fireDelayMult: number; // 1.0 + level * 0.2
  starBonusMult: number; // 1.0 + level * 0.25
  moveSpeedMult: number; // 1.0 + level * 0.12
}

export function calculateKitchenModifiers(save: KitchenMetaSave): KitchenModifiers {
  return {
    chopSpeedMult: 1.0 + (save.knifeSharpnessLvl || 0) * 0.2,
    cookSpeedMult: 1.0 + (save.turboBurnerLvl || 0) * 0.15,
    fireDelayMult: 1.0 + (save.autoSprinklerLvl || 0) * 0.2,
    starBonusMult: 1.0 + (save.royalTablewareLvl || 0) * 0.25,
    moveSpeedMult: 1.0 + (save.antiSlipShoesLvl || 0) * 0.12,
  };
}

export function buyKitchenUpgrade(
  key: keyof typeof KITCHEN_UPGRADES,
  save: KitchenMetaSave
): { success: boolean; newSave: KitchenMetaSave } {
  const meta = KITCHEN_UPGRADES[key];
  if (!meta) return { success: false, newSave: save };

  const currentLvlKey = `${key}Lvl` as keyof KitchenMetaSave;
  const currentLvl = (save[currentLvlKey] as number) || 0;

  if (currentLvl >= meta.maxLevel) {
    return { success: false, newSave: save };
  }

  const cost = Math.round(meta.cost * Math.pow(meta.costMult, currentLvl));
  if (save.goldStars < cost) {
    return { success: false, newSave: save };
  }

  const newSave: KitchenMetaSave = {
    ...save,
    goldStars: save.goldStars - cost,
    [currentLvlKey]: currentLvl + 1,
  };

  saveKitchenMetaSave(newSave);
  return { success: true, newSave };
}
