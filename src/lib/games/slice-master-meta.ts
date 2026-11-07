/**
 * 대장간 5대 명검 각성 연구소 & 메타 영구 세이브 for SliceMaster 3D
 */

export interface SliceMetaUpgradeDef {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effectPerLevel: number;
}

export const SLICE_META_UPGRADES: Record<string, SliceMetaUpgradeDef> = {
  keen_edge: {
    id: "keen_edge",
    name: {
      ko: "날선 칼날",
      en: "Razor Edge",
      ja: "研ぎ澄まされた刃",
      zh: "锋利刀刃",
      es: "Filo Afilado",
      fr: "Lame Aiguisée",
    },
    desc: {
      ko: "칼날 끝 절단 유효 반경 +15% 확장",
      en: "Expands slice collision radius by +15%",
      ja: "刃先の切断有効判定が+15%拡大",
      zh: "刀尖切断有效判定范围扩大+15%",
      es: "Amplía el radio de corte en un +15%",
      fr: "Augmente le rayon de coupe de +15%",
    },
    icon: "🗡️",
    maxLevel: 5,
    baseCost: 30,
    costMultiplier: 1.8,
    effectPerLevel: 0.15,
  },
  ebony_hilt: {
    id: "ebony_hilt",
    name: {
      ko: "흑단 손잡이",
      en: "Ebony Hilt",
      ja: "黒檀の柄",
      zh: "黑檀刀柄",
      es: "Empuñadura de Ébano",
      fr: "Garde d'Ébène",
    },
    desc: {
      ko: "지면 착지 꽂힘 허용 각도 범위 +12% 증가",
      en: "Expands safe ground-stick landing angle by +12%",
      ja: "地面への突き刺し許容角度が+12%拡大",
      zh: "地面插刀安全着陆角度范围扩大+12%",
      es: "Aumenta el ángulo de fijación en tierra en +12%",
      fr: "Augmente la tolérance d'angle d'atterrissage de +12%",
    },
    icon: "🪵",
    maxLevel: 5,
    baseCost: 40,
    costMultiplier: 1.7,
    effectPerLevel: 0.12,
  },
  gold_lining: {
    id: "gold_lining",
    name: {
      ko: "황금 칼집",
      en: "Gilded Sheath",
      ja: "黄金の鞘",
      zh: "鎏金刀鞘",
      es: "Vaina Dorada",
      fr: "Fourreau Doré",
    },
    desc: {
      ko: "절단 시 연마석 및 점수 획득 배율 +25%",
      en: "Increases sharpness stones and score multiplier by +25%",
      ja: "切断時の研磨石とスコア獲得倍率が+25%",
      zh: "切断时研磨石及得分获取倍率提升+25%",
      es: "Aumenta las piedras de afilado y puntuación en +25%",
      fr: "Augmente les pierres d'aiguisage et le score de +25%",
    },
    icon: "✨",
    maxLevel: 5,
    baseCost: 50,
    costMultiplier: 2.0,
    effectPerLevel: 0.25,
  },
  wind_slash: {
    id: "wind_slash",
    name: {
      ko: "풍압 베기",
      en: "Wind Slash",
      ja: "風圧斬り",
      zh: "风压斩",
      es: "Corte de Viento",
      fr: "Tranchant du Vent",
    },
    desc: {
      ko: "칼날 주변 바람 칼날 생성 (근접 타겟 흡입 절단 +16px)",
      en: "Generates wind vortex expanding proximity slice by +16px",
      ja: "刃の周囲に風圧を纏い、近接ターゲットを+16px先から吸引切断",
      zh: "刀刃周围产生风压，+16px吸附近距离目标切断",
      es: "Genera ráfagas de viento que cortan a +16px de distancia",
      fr: "Crée des lames de vent attirant les cibles à +16px",
    },
    icon: "🌪️",
    maxLevel: 5,
    baseCost: 45,
    costMultiplier: 1.8,
    effectPerLevel: 16,
  },
  blade_focus: {
    id: "blade_focus",
    name: {
      ko: "장인의 집중",
      en: "Blade Focus",
      ja: "職人の集中",
      zh: "匠人之悟",
      es: "Concentración del Filo",
      fr: "Concentration de Lame",
    },
    desc: {
      ko: "타겟 절단 시 만족스러운 히트스톱(슬로우) 시간 +25%",
      en: "Extends crisp hit-stop feedback duration by +25%",
      ja: "切断時の心地よいヒットストップ時間を+25%延長",
      zh: "切断时爽快定格顿挫时间延长+25%",
      es: "Prolonga la sensación de hit-stop al cortar en +25%",
      fr: "Prolonge le temps de freeze percutant au tranchage de +25%",
    },
    icon: "🧘",
    maxLevel: 5,
    baseCost: 35,
    costMultiplier: 1.6,
    effectPerLevel: 0.25,
  },
};

export interface SlicePlayerMetaState {
  sharpnessStones: number;
  upgrades: Record<string, number>; // upgradeId -> level (0..maxLevel)
}

const STORAGE_KEY = "oiyo_slice_master_meta_v1";

export function getInitialSliceMetaState(): SlicePlayerMetaState {
  return {
    sharpnessStones: 0,
    upgrades: {
      keen_edge: 0,
      ebony_hilt: 0,
      gold_lining: 0,
      wind_slash: 0,
      blade_focus: 0,
    },
  };
}

export function loadSliceMetaState(): SlicePlayerMetaState {
  if (typeof window === "undefined") return getInitialSliceMetaState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialSliceMetaState();
    const parsed = JSON.parse(raw);
    return {
      sharpnessStones: typeof parsed.sharpnessStones === "number" ? parsed.sharpnessStones : 0,
      upgrades: {
        ...getInitialSliceMetaState().upgrades,
        ...(parsed.upgrades || {}),
      },
    };
  } catch {
    return getInitialSliceMetaState();
  }
}

export function saveSliceMetaState(state: SlicePlayerMetaState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore localstorage write failures
  }
}

export function getSliceUpgradeCost(upgradeId: string, currentLevel: number): number {
  const def = SLICE_META_UPGRADES[upgradeId];
  if (!def) return Infinity;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export function purchaseSliceMetaUpgrade(
  state: SlicePlayerMetaState,
  upgradeId: string
): { success: boolean; nextState: SlicePlayerMetaState } {
  const def = SLICE_META_UPGRADES[upgradeId];
  if (!def) return { success: false, nextState: state };

  const currentLevel = state.upgrades[upgradeId] || 0;
  if (currentLevel >= def.maxLevel) return { success: false, nextState: state };

  const cost = getSliceUpgradeCost(upgradeId, currentLevel);
  if (state.sharpnessStones < cost) return { success: false, nextState: state };

  const nextState: SlicePlayerMetaState = {
    ...state,
    sharpnessStones: state.sharpnessStones - cost,
    upgrades: {
      ...state.upgrades,
      [upgradeId]: currentLevel + 1,
    },
  };

  saveSliceMetaState(nextState);
  return { success: true, nextState };
}

export interface SliceMetaModifiers {
  sliceRadiusMultiplier: number;
  landingAngleToleranceMultiplier: number;
  rewardMultiplier: number;
  windSlashPadding: number;
  hitStopMultiplier: number;
}

export function buildSliceMetaModifiers(meta: SlicePlayerMetaState): SliceMetaModifiers {
  const edgeLvl = meta.upgrades.keen_edge || 0;
  const hiltLvl = meta.upgrades.ebony_hilt || 0;
  const goldLvl = meta.upgrades.gold_lining || 0;
  const windLvl = meta.upgrades.wind_slash || 0;
  const focusLvl = meta.upgrades.blade_focus || 0;

  return {
    sliceRadiusMultiplier: 1 + edgeLvl * SLICE_META_UPGRADES.keen_edge.effectPerLevel,
    landingAngleToleranceMultiplier: 1 + hiltLvl * SLICE_META_UPGRADES.ebony_hilt.effectPerLevel,
    rewardMultiplier: 1 + goldLvl * SLICE_META_UPGRADES.gold_lining.effectPerLevel,
    windSlashPadding: windLvl * SLICE_META_UPGRADES.wind_slash.effectPerLevel,
    hitStopMultiplier: 1 + focusLvl * SLICE_META_UPGRADES.blade_focus.effectPerLevel,
  };
}
