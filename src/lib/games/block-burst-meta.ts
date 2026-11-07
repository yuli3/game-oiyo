/**
 * 1010 블록 버스트 (BlockBurst) - 룬 성소 5대 영구 강화 및 세이브 시스템
 */

export interface BlockBurstUpgradeDef {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const BLOCK_BURST_UPGRADES: BlockBurstUpgradeDef[] = [
  {
    id: "crystal_resonance",
    name: {
      ko: "크리스탈 공명석",
      en: "Crystal Resonance Stone",
      ja: "クリスタル共鳴石",
      zh: "水晶共鸣石",
      es: "Piedra de resonancia de cristal",
      fr: "Pierre de résonance cristalline",
    },
    desc: {
      ko: "라인 폭파 기본 점수 +15% 증가",
      en: "Base line clear score +15% per level",
      ja: "ライン爆破基本スコア+15%",
      zh: "单行消除基础分数 +15%",
      es: "Puntos base de eliminación +15%",
      fr: "Points de base d'élimination +15%",
    },
    icon: "💎",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
  },
  {
    id: "rune_gravity",
    name: {
      ko: "룬 중력 제어기",
      en: "Rune Gravitational Stabilizer",
      ja: "ルーン重力安定器",
      zh: "符文引力稳定器",
      es: "Estabilizador gravitacional rúnico",
      fr: "Stabilisateur gravitationnel runique",
    },
    desc: {
      ko: "낙하 제어 안정성 향상 및 추가 점수 +10% 증가",
      en: "Drop control stabilization and score +10% per level",
      ja: "落下制御安定性と追加スコア+10%",
      zh: "下落手感稳定优化，局内额外得分 +10%",
      es: "Estabilidad de control y puntos +10%",
      fr: "Stabilité du contrôle et score +10%",
    },
    icon: "🧲",
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.65,
  },
  {
    id: "chain_spark",
    name: {
      ko: "연쇄 콤보 스파크",
      en: "Chain Combo Spark",
      ja: "連鎖コンボスパーク",
      zh: "连锁连击火花",
      es: "Chispa de combo en cadena",
      fr: "Étincelle de combo en chaîne",
    },
    desc: {
      ko: "연속 콤보 발동 시 보너스 점수 +20% 증가",
      en: "Consecutive combo bonus score +20% per level",
      ja: "連続コンボボーナススコア+20%",
      zh: "连续消除时的连击加成倍率 +20%",
      es: "Bonificación de combos consecutivos +20%",
      fr: "Bonus de combos consécutifs +20%",
    },
    icon: "⚡",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
  },
  {
    id: "emergency_cleanse",
    name: {
      ko: "비상 정화의 룬",
      en: "Emergency Cleanse Rune",
      ja: "緊急浄化のルーン",
      zh: "紧急净化符文",
      es: "Runa de purga de emergencia",
      fr: "Rune de purge d'urgence",
    },
    desc: {
      ko: "게임당 위기 시 바닥 2줄 일괄 파괴 횟수 +1회 추가",
      en: "Emergency bottom 2-row clear charge +1 per level",
      ja: "1ゲームあたり最下段2列を緊急消去できる回数+1",
      zh: "单局游戏紧急消除底部2行的可用次数 +1",
      es: "Cargas de emergencia para despejar 2 filas +1",
      fr: "Purges d'urgence des 2 rangées du bas +1",
    },
    icon: "🛡️",
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 2.2,
  },
  {
    id: "crystal_harvest",
    name: {
      ko: "룬 크리스탈 수확력",
      en: "Rune Crystal Harvester",
      ja: "ルーンクリスタル収穫器",
      zh: "符文水晶汲取器",
      es: "Cosechador de cristales rúnicos",
      fr: "Collecteur de cristaux runiques",
    },
    desc: {
      ko: "라인 클리어 시 획득하는 룬 크리스탈 재화 +25% 증가",
      en: "Rune crystal rewards from line clears +25% per level",
      ja: "ライン消去時の獲得ルーンクリスタル量+25%",
      zh: "消除消除时收获的符文水晶数量 +25%",
      es: "Cristales rúnicos obtenidos por línea +25%",
      fr: "Cristaux runiques obtenus par ligne +25%",
    },
    icon: "🔮",
    maxLevel: 5,
    baseCost: 220,
    costMultiplier: 1.7,
  },
];

export interface BlockBurstMetaSave {
  version: number;
  walletRunes: number;
  upgradeLevels: Record<string, number>;
  totalLinesCleared: number;
  totalGamesPlayed: number;
}

export const BLOCK_BURST_STORAGE_KEY = "block_burst_meta_save_v1";

export function loadBlockBurstMeta(): BlockBurstMetaSave {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      version: 1,
      walletRunes: 0,
      upgradeLevels: {},
      totalLinesCleared: 0,
      totalGamesPlayed: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(BLOCK_BURST_STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        walletRunes: 0,
        upgradeLevels: {},
        totalLinesCleared: 0,
        totalGamesPlayed: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<BlockBurstMetaSave>;
    return {
      version: 1,
      walletRunes: typeof parsed.walletRunes === "number" ? parsed.walletRunes : 0,
      upgradeLevels: parsed.upgradeLevels || {},
      totalLinesCleared: typeof parsed.totalLinesCleared === "number" ? parsed.totalLinesCleared : 0,
      totalGamesPlayed: typeof parsed.totalGamesPlayed === "number" ? parsed.totalGamesPlayed : 0,
    };
  } catch {
    return {
      version: 1,
      walletRunes: 0,
      upgradeLevels: {},
      totalLinesCleared: 0,
      totalGamesPlayed: 0,
    };
  }
}

export function saveBlockBurstMeta(save: BlockBurstMetaSave): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(BLOCK_BURST_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // quota exceeded or private mode
  }
}

export function getBlockBurstUpgradeCost(def: BlockBurstUpgradeDef, currentLevel: number): number {
  if (currentLevel >= def.maxLevel) return 0;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export interface BlockBurstModifiers {
  scoreMult: number;
  gravityScoreBonus: number;
  comboSparkMult: number;
  emergencyCleanses: number;
  runeHarvestMult: number;
}

export function computeBlockBurstModifiers(save: BlockBurstMetaSave): BlockBurstModifiers {
  const lv = (id: string) => save.upgradeLevels[id] || 0;
  return {
    scoreMult: 1.0 + lv("crystal_resonance") * 0.15,
    gravityScoreBonus: 1.0 + lv("rune_gravity") * 0.1,
    comboSparkMult: 1.0 + lv("chain_spark") * 0.2,
    emergencyCleanses: lv("emergency_cleanse"),
    runeHarvestMult: 1.0 + lv("crystal_harvest") * 0.25,
  };
}
