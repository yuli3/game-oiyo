/**
 * 냥이 낚시 (CatFishing) - 4대 냥이 낚시터 지령서 퀘스트 시스템
 */

export interface CatFishingQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardChuru: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_CAT_QUESTS: CatFishingQuest[] = [
  {
    id: "quest_first_catch",
    title: {
      ko: "첫 냥펀치 사냥꾼",
      en: "First Paw Fisher",
      ja: "初ニャンパンチ狩人",
      zh: "初出茅庐猫爪猎手",
      es: "Primer cazador de patas",
      fr: "Premier chasseur à pattes",
    },
    desc: {
      ko: "연못에서 물고기 5마리 이상 냥펀치로 포획",
      en: "Catch 5 or more swimming fish using quick paw strikes",
      ja: "池で泳ぐ魚を5匹以上ニャンパンチで捕獲",
      zh: "在池塘中用迅捷猫爪拍击捕获5条以上的游鱼",
      es: "Atrapa 5 o más peces usando zarpazos rápidos",
      fr: "Attrapez 5 poissons ou plus d'un coup de patte",
    },
    rewardChuru: 150,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: "quest_speed_paws",
    title: {
      ko: "광속의 솜방망이",
      en: "Lightning Swift Paws",
      ja: "光速の肉球スプリンター",
      zh: "光速幻影肉垫",
      es: "Zarpas relámpago",
      fr: "Pattes vives comme l'éclair",
    },
    desc: {
      ko: "연못의 모든 물고기를 12초 이내에 전원 포획 성공",
      en: "Clear the entire pond within 12 seconds",
      ja: "池のすべての魚を12秒以内に素早く全滅捕獲",
      zh: "在12秒的极速时间内捕尽池塘中的所有游鱼",
      es: "Despeja todo el estanque en menos de 12 segundos",
      fr: "Videz tout l'étang en moins de 12 secondes",
    },
    rewardChuru: 200,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_hard_tangle",
    title: {
      ko: "거친 물결의 도전자",
      en: "Rough Waters Challenger",
      ja: "荒波の挑戦者ニャン",
      zh: "惊涛骇浪挑战者",
      es: "Desafiante de aguas bravas",
      fr: "Défieur des eaux troubles",
    },
    desc: {
      ko: "어려움 또는 지옥 난이도에서 연못 정복 승리",
      en: "Conquer and win in Hard or Hell difficulty pond",
      ja: "「難しい」または「地獄」難易度で池を制覇し勝利",
      zh: "在「困难」或「地狱」高敏捷难度下征服池塘赢取胜利",
      es: "Conquista el estanque en dificultad Difícil o Infierno",
      fr: "Triomphez dans un étang en difficulté Difficile ou Enfer",
    },
    rewardChuru: 250,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_grand_master",
    title: {
      ko: "전설의 고양이 낚시왕",
      en: "Legendary Cat Angler",
      ja: "伝説のニャンコ釣り名人",
      zh: "传说中的捕鱼猫仙",
      es: "Pescador felino legendario",
      fr: "Pêcheur félin légendaire",
    },
    desc: {
      ko: "누적 50마리 이상의 싱싱한 물고기 수확 달성",
      en: "Accumulate a career catch of 50 or more fresh fish",
      ja: "累計50匹以上の新鮮な魚を釣り上げる",
      zh: "累计捕获并收获50条以上鲜嫩多汁的鱼获",
      es: "Acumula 50 o más capturas de pescado fresco",
      fr: "Cumulez 50 poissons frais pêchés ou plus",
    },
    rewardChuru: 350,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 50,
  },
];

export const CAT_FISHING_QUESTS_KEY = "cat_fishing_quests_v1";

export function loadCatFishingQuests(): CatFishingQuest[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return INITIAL_CAT_QUESTS.map((q) => ({ ...q }));
  }
  try {
    const raw = window.localStorage.getItem(CAT_FISHING_QUESTS_KEY);
    if (!raw) return INITIAL_CAT_QUESTS.map((q) => ({ ...q }));
    const saved = JSON.parse(raw) as Partial<CatFishingQuest>[];
    return INITIAL_CAT_QUESTS.map((init) => {
      const match = saved.find((s) => s.id === init.id);
      if (!match) return { ...init };
      return {
        ...init,
        progress: typeof match.progress === "number" ? match.progress : init.progress,
        isClaimed: typeof match.isClaimed === "boolean" ? match.isClaimed : init.isClaimed,
      };
    });
  } catch {
    return INITIAL_CAT_QUESTS.map((q) => ({ ...q }));
  }
}

export function saveCatFishingQuests(quests: CatFishingQuest[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      CAT_FISHING_QUESTS_KEY,
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
