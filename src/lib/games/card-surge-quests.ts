/**
 * 카드 서지 (CardSurge) - 4대 지하 카지노 지령서 퀘스트 시스템
 */

export interface CardSurgeQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardNeonChips: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_CARD_SURGE_QUESTS: CardSurgeQuest[] = [
  {
    id: "surge_quest_flush_master",
    title: {
      ko: "플러시의 지배자",
      en: "Flush Sovereign",
      ja: "フラッシュの覇者",
      zh: "同花主宰者",
      es: "Soberano del color",
      fr: "Souverain de la couleur",
    },
    desc: {
      ko: "동일한 문양 5장을 조합하여 플러시 또는 스트레이트 플러시 2회 달성",
      en: "Play 2 Flushes or Straight Flushes with matching suit cards",
      ja: "同じスート5枚を揃えてフラッシュまたはストレートフラッシュを2回達成",
      zh: "组合5张相同花色打出2次同花或同花顺",
      es: "Juega 2 colores o escaleras de color con cartas del mismo palo",
      fr: "Jouez 2 couleurs ou quintes flush avec des cartes de même couleur",
    },
    rewardNeonChips: 150,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 2,
  },
  {
    id: "surge_quest_high_roller",
    title: {
      ko: "하이 롤러 3,000점 폭발",
      en: "High Roller 3K Surge",
      ja: "ハイローラー 3,000点突破",
      zh: "高额玩家 3000分爆发",
      es: "Gran apostador 3000 puntos",
      fr: "Flambeur 3 000 points d'un coup",
    },
    desc: {
      ko: "단일 핸드 승부에서 칩 x 배율 연쇄로 3,000점 이상 대량 득점",
      en: "Score 3,000 or more points in a single hand via Chips x Mult chain",
      ja: "チップ×倍率の連鎖で単一ハンドから3,000点以上のハイスコアを叩き出す",
      zh: "通过筹码×倍数连击在单次出牌中斩获3,000分以上巨额得分",
      es: "Consigue 3000 puntos o más en una sola jugada mediante Fichas x Mult",
      fr: "Marquez 3 000 points ou plus en une seule main grâce au multiplicateur",
    },
    rewardNeonChips: 200,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "surge_quest_joker_synergy",
    title: {
      ko: "조커 시너지 군단",
      en: "Joker Synergy Syndicate",
      ja: "ジョーカーシナジー軍団",
      zh: "小丑共鸣辛迪加",
      es: "Sindicato de comodines",
      fr: "Syndicat des jokers",
    },
    desc: {
      ko: "조커 카드를 3장 이상 보유한 상태로 블라인드 격파 성공",
      en: "Defeat any Blind while holding 3 or more powerful Jokers",
      ja: "ジョーカーを3枚以上装備した状態でブラインドを撃破する",
      zh: "在装备3张以上核心小丑卡的状态下击破盲注",
      es: "Derrota una ciega teniendo equipados 3 o más comodines",
      fr: "Battez une blinde en possédant 3 jokers ou plus",
    },
    rewardNeonChips: 250,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "surge_quest_ante_champion",
    title: {
      ko: "안테 3 보스 격파",
      en: "Ante 3 Boss Slayer",
      ja: "アンテ3 ボス討伐者",
      zh: "底注3 头目终结者",
      es: "Verdugo del jefe de Ante 3",
      fr: "Tombeur du boss de l'Ante 3",
    },
    desc: {
      ko: "네온 보스 블라인드를 극복하고 안테 3 이상으로 진입 성공",
      en: "Overcome Boss Blind restrictions and advance to Ante 3 or higher",
      ja: "ボスの特殊ギミックを打破しアンテ3以上に到達する",
      zh: "克服头目特殊规则限制并成功挺进至底注3以上",
      es: "Supera la ciega del jefe y avanza hasta la Ante 3 o superior",
      fr: "Surmontez les handicaps du boss et atteignez l'Ante 3 ou plus",
    },
    rewardNeonChips: 300,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
];

export function loadCardSurgeQuests(): CardSurgeQuest[] {
  if (typeof window === "undefined") return INITIAL_CARD_SURGE_QUESTS;
  try {
    const raw = localStorage.getItem("card_surge_quests_save_v1");
    if (!raw) return INITIAL_CARD_SURGE_QUESTS;
    const parsed = JSON.parse(raw) as CardSurgeQuest[];
    return INITIAL_CARD_SURGE_QUESTS.map((initQ) => {
      const found = parsed.find((p) => p.id === initQ.id);
      return found ? { ...initQ, ...found } : initQ;
    });
  } catch {
    return INITIAL_CARD_SURGE_QUESTS;
  }
}

export function saveCardSurgeQuests(quests: CardSurgeQuest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("card_surge_quests_save_v1", JSON.stringify(quests));
  } catch {
    // ignore
  }
}

export function claimCardSurgeQuestReward(
  questId: string,
  quests: CardSurgeQuest[],
  onReward: (chips: number) => void
): CardSurgeQuest[] {
  return quests.map((q) => {
    if (q.id === questId && q.progress >= q.maxProgress && !q.isClaimed) {
      onReward(q.rewardNeonChips);
      return { ...q, isClaimed: true };
    }
    return q;
  });
}
