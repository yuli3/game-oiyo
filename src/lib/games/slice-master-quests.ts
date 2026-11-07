/**
 * 4대 도검 장인 작전 지령 (Quests) for SliceMaster 3D
 */

export interface SliceQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  target: number;
  current: number;
  rewardStones: number;
  completed: boolean;
  claimed: boolean;
}

export const INITIAL_SLICE_QUESTS: SliceQuest[] = [
  {
    id: "perfect_center",
    title: {
      ko: "장인의 일도양단",
      en: "Center Slice Master",
      ja: "職人の一刀両断",
      zh: "匠人一刀两断",
      es: "Corte Central Perfecto",
      fr: "Tranche Centrale Parfaite",
    },
    desc: {
      ko: "타겟 중심부(정밀 타격) 5회 이상 완벽하게 절단하기",
      en: "Perform 5 clean center slices on targets",
      ja: "ターゲットの中心部を5回以上正確に切断する",
      zh: "精准切断目标中心5次以上",
      es: "Realiza 5 cortes precisos en el centro del objetivo",
      fr: "Effectuez 5 coupes parfaites au centre",
    },
    target: 5,
    current: 0,
    rewardStones: 25,
    completed: false,
    claimed: false,
  },
  {
    id: "fever_combo",
    title: {
      ko: "질풍의 연격",
      en: "Gale Combo",
      ja: "疾風の連撃",
      zh: "疾风连击",
      es: "Combo Vendaval",
      fr: "Combo Tempête",
    },
    desc: {
      ko: "지면 착지 전 공중에서 4연속 콤보 절단 달성하기",
      en: "Achieve a 4-combo slice streak in a single jump",
      ja: "地面に着地する前に空中で4連続コンボを達成する",
      zh: "在着陆前达成空中4连击切断",
      es: "Logra un combo de 4 cortes en un solo salto",
      fr: "Atteignez un combo de 4 tranches en l'air",
    },
    target: 4,
    current: 0,
    rewardStones: 30,
    completed: false,
    claimed: false,
  },
  {
    id: "golden_pinata",
    title: {
      ko: "황금 피냐타 사냥",
      en: "Golden Piñata Hunter",
      ja: "黄金ピニャータ狩り",
      zh: "黄金皮纳塔猎人",
      es: "Cazador de Piñata Dorada",
      fr: "Chasseur de Piñata Dorée",
    },
    desc: {
      ko: "스테이지에 출현한 전설의 황금 피냐타 절단하기",
      en: "Find and slice the legendary Golden Piñata",
      ja: "ステージに出現した伝説の黄金ピニャータを切断する",
      zh: "切断关卡中出现的传说黄金皮纳塔",
      es: "Corta la legendaria piñata dorada",
      fr: "Tranchez la légendaire piñata dorée",
    },
    target: 1,
    current: 0,
    rewardStones: 40,
    completed: false,
    claimed: false,
  },
  {
    id: "master_course",
    title: {
      ko: "무결점 코스 완주",
      en: "Flawless Blade Walk",
      ja: "無欠のコース完走",
      zh: "完美刀锋通关",
      es: "Paseo de Hoja Impecable",
      fr: "Parcours de Lame Parfait",
    },
    desc: {
      ko: "단 한 번의 실패 없이 보너스 과녁까지 도달하기",
      en: "Reach the bonus target without falling flat or hitting hazards",
      ja: "失敗なくボーナス的まで到達する",
      zh: "无失误到达最终奖励靶心",
      es: "Llega al objetivo final sin fallar",
      fr: "Atteignez la cible finale sans échec",
    },
    target: 1,
    current: 0,
    rewardStones: 50,
    completed: false,
    claimed: false,
  },
];
