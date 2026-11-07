/**
 * 수박 드롭 3D (SuikaDrop) - 과수원 5대 영구 강화 및 세이브 시스템
 */

export interface SuikaUpgradeDef {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const SUIKA_UPGRADES: SuikaUpgradeDef[] = [
  {
    id: "bounciness_resin",
    name: {
      ko: "탄성 호박 레진",
      en: "Bouncy Amber Resin",
      ja: "弾性コハクレジン",
      zh: "高弹琥珀树脂",
      es: "Resina elástica de ámbar",
      fr: "Résine ambrée élastique",
    },
    desc: {
      ko: "과일 탄성 및 롤링 물리 반응 강화, 획득 점수 +10% 증가",
      en: "Enhances fruit elasticity & rolling physics, score +10% per level",
      ja: "フルーツの反発と転がりを強化、獲得スコア+10%",
      zh: "增强水果弹力与滚动物理反馈，得分 +10%",
      es: "Mejora elasticidad y rodamiento, puntuación +10%",
      fr: "Renforce l'élasticité et le roulement, score +10%",
    },
    icon: "🧪",
    maxLevel: 5,
    baseCost: 120,
    costMultiplier: 1.55,
  },
  {
    id: "box_expander",
    name: {
      ko: "유리 상자 유압 확장기",
      en: "Hydraulic Box Expander",
      ja: "油圧ボックス拡張器",
      zh: "液压玻璃箱扩容机",
      es: "Expansor hidráulico de caja",
      fr: "Élargisseur hydraulique de cuve",
    },
    desc: {
      ko: "데드라인 오버필 위기 유예 시간 +0.4초 증가",
      en: "Overfill deadline grace timer +0.4s per level",
      ja: "デッドライン警告猶予時間+0.4秒",
      zh: "警戒线溢出容忍时间延长 +0.4秒",
      es: "Margen de tiempo de desborde +0.4s",
      fr: "Tolérance de débordement +0.4s",
    },
    icon: "📦",
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.6,
  },
  {
    id: "next_preview",
    name: {
      ko: "예지력의 돋보기",
      en: "Foresight Magnifier",
      ja: "予知のルーペ",
      zh: "先知放大镜",
      es: "Lupa de previsión",
      fr: "Loupe de prévoyance",
    },
    desc: {
      ko: "과일 머지 연쇄 배율 및 콤보 보너스 +15% 증가",
      en: "Merge combo score multiplier bonus +15% per level",
      ja: "マージコンボボーナス倍率+15%",
      zh: "合体连锁加成分数 +15%",
      es: "Multiplicador de combo +15%",
      fr: "Multiplicateur de combo +15%",
    },
    icon: "🔍",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.65,
  },
  {
    id: "shake_recharge",
    name: {
      ko: "진동 쉐이커 증축",
      en: "Vibration Shaker Module",
      ja: "振動シェイカー増設",
      zh: "震动摇匀器增设",
      es: "Módulo sacudidor sísmico",
      fr: "Module secoueur de boîte",
    },
    desc: {
      ko: "게임당 상자 흔들기(Shake) 횟수 +1회 추가",
      en: "Additional container shake charge +1 per level",
      ja: "1ゲームあたりのシェイク使用可能回数+1",
      zh: "单局游戏摇晃（Shake）可用次数 +1",
      es: "Cargas de sacudida por partida +1",
      fr: "Secousses utilisables par partie +1",
    },
    icon: "📳",
    maxLevel: 3,
    baseCost: 250,
    costMultiplier: 2.0,
  },
  {
    id: "golden_catalyst",
    name: {
      ko: "황금 촉매 비료",
      en: "Golden Catalyst Fertilizer",
      ja: "黄金触媒肥料",
      zh: "黄金催化肥料",
      es: "Fertilizante catalizador dorado",
      fr: "Engrais catalyseur doré",
    },
    desc: {
      ko: "머지 시 착즙되는 과일 즙 재화 획득량 +20% 증가",
      en: "Juice resource yield from merges +20% per level",
      ja: "マージ時の果汁獲得量+20%",
      zh: "每次合体榨出的果汁收益 +20%",
      es: "Rendimiento de jugo por fusión +20%",
      fr: "Rendement en jus par fusion +20%",
    },
    icon: "✨",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
  },
];

export interface SuikaMetaSave {
  version: number;
  walletJuice: number;
  upgradeLevels: Record<string, number>;
  totalMerges: number;
  totalWatermelons: number;
}

export const SUIKA_STORAGE_KEY = "suika_drop_meta_save_v1";

export function loadSuikaMeta(): SuikaMetaSave {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      version: 1,
      walletJuice: 0,
      upgradeLevels: {},
      totalMerges: 0,
      totalWatermelons: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(SUIKA_STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        walletJuice: 0,
        upgradeLevels: {},
        totalMerges: 0,
        totalWatermelons: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<SuikaMetaSave>;
    return {
      version: 1,
      walletJuice: typeof parsed.walletJuice === "number" ? parsed.walletJuice : 0,
      upgradeLevels: parsed.upgradeLevels || {},
      totalMerges: typeof parsed.totalMerges === "number" ? parsed.totalMerges : 0,
      totalWatermelons: typeof parsed.totalWatermelons === "number" ? parsed.totalWatermelons : 0,
    };
  } catch {
    return {
      version: 1,
      walletJuice: 0,
      upgradeLevels: {},
      totalMerges: 0,
      totalWatermelons: 0,
    };
  }
}

export function saveSuikaMeta(save: SuikaMetaSave): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(SUIKA_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // ignore quota/private mode
  }
}

export function getSuikaUpgradeCost(def: SuikaUpgradeDef, currentLevel: number): number {
  if (currentLevel >= def.maxLevel) return 0;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export interface SuikaModifiers {
  scoreMult: number;
  graceTimerBonus: number;
  comboBonusMult: number;
  extraShakes: number;
  juiceYieldMult: number;
}

export function computeSuikaModifiers(save: SuikaMetaSave): SuikaModifiers {
  const lv = (id: string) => save.upgradeLevels[id] || 0;
  return {
    scoreMult: 1.0 + lv("bounciness_resin") * 0.1,
    graceTimerBonus: lv("box_expander") * 0.4,
    comboBonusMult: 1.0 + lv("next_preview") * 0.15,
    extraShakes: lv("shake_recharge"),
    juiceYieldMult: 1.0 + lv("golden_catalyst") * 0.2,
  };
}
