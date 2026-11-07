/**
 * 파워워시 3D - 장비 튜닝 연구소 & 영구 세이브 시스템
 */

export interface PowerWashUpgradeDef {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const POWERWASH_UPGRADES: PowerWashUpgradeDef[] = [
  {
    id: "turbo_pump",
    name: {
      ko: "초고압 터보 펌프",
      en: "Turbo PSI Pump",
      ja: "超高圧ターボポンプ",
      zh: "超高压涡轮泵",
      es: "Bomba turbo PSI",
      fr: "Pompe turbo PSI",
    },
    desc: {
      ko: "노즐 분사 수압 세척력 +15% 증가",
      en: "Water cleaning pressure power +15% per level",
      ja: "水圧洗浄力+15%",
      zh: "水压清洗力度提升 +15%",
      es: "Potencia de limpieza de agua +15%",
      fr: "Pression et puissance de nettoyage +15%",
    },
    icon: "⚡",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
  },
  {
    id: "wide_lance",
    name: {
      ko: "티타늄 광폭 랜스",
      en: "Wide Titanium Lance",
      ja: "チタン広角ランス",
      zh: "钛合金广域喷枪",
      es: "Lanza ancha de titanio",
      fr: "Lance large en titane",
    },
    desc: {
      ko: "노즐 분사 유효 반경 +12% 증가",
      en: "Effective spray radius +12% per level",
      ja: "噴射有効半径+12%",
      zh: "有效喷射半径提升 +12%",
      es: "Radio de rociado efectivo +12%",
      fr: "Rayon de pulvérisation +12%",
    },
    icon: "📡",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
  },
  {
    id: "detergent_booster",
    name: {
      ko: "나노 활성 폼 세제",
      en: "Nano Active Foam",
      ja: "ナノ活性フォーム洗剤",
      zh: "纳米活性泡沫剂",
      es: "Espuma nano activa",
      fr: "Mousse nano-active",
    },
    desc: {
      ko: "비누 거품 불림 속도 및 보너스 +25% 증가",
      en: "Soap foam softening speed & bonus +25% per level",
      ja: "泡による汚れ軟化速度+25%",
      zh: "泡沫软化污垢速度提升 +25%",
      es: "Velocidad de ablandamiento con espuma +25%",
      fr: "Vitesse d'action de la mousse +25%",
    },
    icon: "🧼",
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.65,
  },
  {
    id: "thermal_core",
    name: {
      ko: "열선 히팅 코어",
      en: "Thermal Steam Core",
      ja: "熱線スチームコア",
      zh: "热能蒸汽发生芯",
      es: "Núcleo térmico de vapor",
      fr: "Cœur thermique à vapeur",
    },
    desc: {
      ko: "타르/녹/이끼 등 특수 변이 고착 오염 박리력 +20% 증가",
      en: "Stripping speed against stubborn mutant grime +20% per level",
      ja: "特殊固着汚れ（タール・サビ）剥離力+20%",
      zh: "对变异顽垢（沥青、铁锈）剥离效率提升 +20%",
      es: "Velocidad de decapado contra suciedad rebelde +20%",
      fr: "Efficacité contre la crasse tenace (goudron, rouille) +20%",
    },
    icon: "🔥",
    maxLevel: 5,
    baseCost: 240,
    costMultiplier: 1.75,
  },
  {
    id: "eco_collector",
    name: {
      ko: "폐수 여과 리사이클러",
      en: "Eco Recycler Collector",
      ja: "エコ回収リサイクラー",
      zh: "环保污水回收器",
      es: "Recolector ecológico",
      fr: "Récupérateur écologique",
    },
    desc: {
      ko: "파츠 완료 및 스테이지 클리어 골드 보상 +15% 증가",
      en: "Cash rewards from cleaning parts +15% per level",
      ja: "パーツ完了時の獲得ゴールド+15%",
      zh: "部件清洁完毕获得的资金报酬 +15%",
      es: "Recompensas de dinero obtenidas +15%",
      fr: "Récompenses monétaires obtenues +15%",
    },
    icon: "💰",
    maxLevel: 5,
    baseCost: 220,
    costMultiplier: 1.6,
  },
];

export interface PowerWashMetaSave {
  version: number;
  walletCash: number;
  upgradeLevels: Record<string, number>;
  totalPartsCleaned: number;
  totalStagesCleared: number;
}

export const POWERWASH_STORAGE_KEY = "powerwash_3d_meta_save_v1";

export function loadPowerWashMeta(): PowerWashMetaSave {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      version: 1,
      walletCash: 0,
      upgradeLevels: {},
      totalPartsCleaned: 0,
      totalStagesCleared: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(POWERWASH_STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        walletCash: 0,
        upgradeLevels: {},
        totalPartsCleaned: 0,
        totalStagesCleared: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PowerWashMetaSave>;
    return {
      version: 1,
      walletCash: typeof parsed.walletCash === "number" ? parsed.walletCash : 0,
      upgradeLevels: parsed.upgradeLevels || {},
      totalPartsCleaned: typeof parsed.totalPartsCleaned === "number" ? parsed.totalPartsCleaned : 0,
      totalStagesCleared: typeof parsed.totalStagesCleared === "number" ? parsed.totalStagesCleared : 0,
    };
  } catch {
    return {
      version: 1,
      walletCash: 0,
      upgradeLevels: {},
      totalPartsCleaned: 0,
      totalStagesCleared: 0,
    };
  }
}

export function savePowerWashMeta(save: PowerWashMetaSave): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(POWERWASH_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // quota exceeded or private browsing
  }
}

export function getPowerWashUpgradeCost(def: PowerWashUpgradeDef, currentLevel: number): number {
  if (currentLevel >= def.maxLevel) return 0;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export interface PowerWashModifiers {
  powerMult: number;
  radiusMult: number;
  soapSpeedMult: number;
  thermalStubbornMult: number;
  cashRewardMult: number;
}

export function computePowerWashModifiers(save: PowerWashMetaSave): PowerWashModifiers {
  const lv = (id: string) => save.upgradeLevels[id] || 0;
  return {
    powerMult: 1.0 + lv("turbo_pump") * 0.15,
    radiusMult: 1.0 + lv("wide_lance") * 0.12,
    soapSpeedMult: 1.0 + lv("detergent_booster") * 0.25,
    thermalStubbornMult: 1.0 + lv("thermal_core") * 0.2,
    cashRewardMult: 1.0 + lv("eco_collector") * 0.15,
  };
}
