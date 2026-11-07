/**
 * 수박 드롭 3D (SuikaDrop) - 과수원 미션 퀘스트 시스템
 */

export interface SuikaQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardJuice: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_SUIKA_QUESTS: SuikaQuest[] = [
  {
    id: "quest_first_merge",
    title: {
      ko: "첫 달콤한 진화",
      en: "First Sweet Evolution",
      ja: "最初の甘い進化",
      zh: "初次甘甜进化",
      es: "Primera dulce evolución",
      fr: "Première douce évolution",
    },
    desc: {
      ko: "과일끼리 부딪혀 1회 이상 새로운 티어로 합체 진화",
      en: "Merge same fruits at least once to evolve",
      ja: "同じフルーツを1回以上合体させて進化",
      zh: "碰撞相同水果完成至少1次合体进化",
      es: "Combina frutas iguales al menos una vez",
      fr: "Fusionnez les mêmes fruits au moins une fois",
    },
    rewardJuice: 100,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_combo_chain",
    title: {
      ko: "과일 연쇄 반응",
      en: "Fruit Chain Reaction",
      ja: "フルーツ連鎖反応",
      zh: "水果连锁反应",
      es: "Reacción en cadena",
      fr: "Réaction en chaîne",
    },
    desc: {
      ko: "한 턴에 연속 머지 콤보 3x 이상 달성",
      en: "Achieve a 3x combo merge chain in a single turn",
      ja: "1ターンで3連続以上のマージコンボを達成",
      zh: "在单次操作中触发3连击以上的连环合体",
      es: "Consigue una cadena de combo x3 en un turno",
      fr: "Réussissez un enchaînement combo x3 en un tour",
    },
    rewardJuice: 160,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: "quest_big_watermelon",
    title: {
      ko: "전설의 거대 수박",
      en: "Legendary Giant Watermelon",
      ja: "伝説の巨大スイカ",
      zh: "传说中的巨型西瓜",
      es: "Sandía gigante legendaria",
      fr: "Pastèque géante légendaire",
    },
    desc: {
      ko: "최종 진화형인 Lv.9 거대 수박(Watermelon) 완성",
      en: "Evolve and create the ultimate Lv.9 Giant Watermelon",
      ja: "最終形態のLv.9巨大スイカを完成させる",
      zh: "培育出终极形态的9级巨型西瓜",
      es: "Crea la sandía gigante definitiva de nivel 9",
      fr: "Créez l'ultime pastèque géante de niveau 9",
    },
    rewardJuice: 380,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_high_score",
    title: {
      ko: "과수원 풍년 마스터",
      en: "Harvest Festival Master",
      ja: "果樹園豊作マスター",
      zh: "果园丰收大师",
      es: "Maestro de la cosecha",
      fr: "Maître de la récolte",
    },
    desc: {
      ko: "단일 게임에서 2,500점 이상 달성",
      en: "Score 2,500 or more in a single game",
      ja: "1ゲームで2,500点以上を獲得",
      zh: "单局游戏总分突破2,500分",
      es: "Alcanza 2.500 puntos en una sola partida",
      fr: "Atteignez 2 500 points en une seule partie",
    },
    rewardJuice: 260,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 2500,
  },
];

export const SUIKA_DROP_QUESTS_KEY = "suika_drop_quests_v1";

export function loadSuikaDropQuests(): SuikaQuest[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return INITIAL_SUIKA_QUESTS.map((q) => ({ ...q }));
  }
  try {
    const raw = window.localStorage.getItem(SUIKA_DROP_QUESTS_KEY);
    if (!raw) return INITIAL_SUIKA_QUESTS.map((q) => ({ ...q }));
    const saved = JSON.parse(raw) as Partial<SuikaQuest>[];
    return INITIAL_SUIKA_QUESTS.map((init) => {
      const match = saved.find((s) => s.id === init.id);
      if (!match) return { ...init };
      return {
        ...init,
        progress: typeof match.progress === "number" ? match.progress : init.progress,
        isClaimed: typeof match.isClaimed === "boolean" ? match.isClaimed : init.isClaimed,
      };
    });
  } catch {
    return INITIAL_SUIKA_QUESTS.map((q) => ({ ...q }));
  }
}

export function saveSuikaDropQuests(quests: SuikaQuest[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      SUIKA_DROP_QUESTS_KEY,
      JSON.stringify(
        quests.map((q) => ({
          id: q.id,
          progress: q.progress,
          isClaimed: q.isClaimed,
        }))
      )
    );
  } catch {
    // quota exceeded or private mode
  }
}

