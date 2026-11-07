/**
 * 1010 블록 버스트 (BlockBurst) - 아케이드 마인드 챌린지 퀘스트 시스템
 */

export interface BlockBurstQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardRunes: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_BLOCK_BURST_QUESTS: BlockBurstQuest[] = [
  {
    id: "quest_triple_clear",
    title: {
      ko: "트리플 라인 대폭파",
      en: "Triple Line Detonation",
      ja: "トリプルライン大爆破",
      zh: "三行连环大引爆",
      es: "Triple detonación de líneas",
      fr: "Détonation triple ligne",
    },
    desc: {
      ko: "단 한 번의 블록 배치로 가로·세로 3줄 이상 동시 폭파",
      en: "Clear 3 or more rows/columns simultaneously in one placement",
      ja: "1回のブロック配置で縦横3ライン以上を同時爆破",
      zh: "通过单次方块摆放同时消除横竖3行以上",
      es: "Elimina 3 o más filas/columnas a la vez en una sola jugada",
      fr: "Détruisez simultanément 3 lignes ou colonnes en un coup",
    },
    rewardRunes: 150,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_combo_master",
    title: {
      ko: "콤보 피버 마인드",
      en: "Combo Fever Mind",
      ja: "コンボフィーバーマインド",
      zh: "连击狂热之脑",
      es: "Mente en racha de combos",
      fr: "Maître de la fièvre de combo",
    },
    desc: {
      ko: "연속 라인 폭파 콤보 5x 이상 달성",
      en: "Achieve a consecutive line clear combo of 5x or more",
      ja: "連続ライン爆破コンボ5x以上を達成",
      zh: "达成连续消除连击 5x 以上",
      es: "Alcanza un combo consecutivo de 5x o más",
      fr: "Atteignez un combo consécutif de 5x ou plus",
    },
    rewardRunes: 200,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: "quest_augment_draft",
    title: {
      ko: "증강 덱빌더",
      en: "Augment Deckbuilder",
      ja: "オーグメントデッキビルダー",
      zh: "强化符文构筑者",
      es: "Constructor de aumentos",
      fr: "Bâtisseur d'augmentations",
    },
    desc: {
      ko: "증강 모드에서 로그라이트 증강 카드 3종 이상 획득",
      en: "Draft and acquire 3 or more roguelike augment cards",
      ja: "オーグメントモードでローグライトカードを3枚以上獲得",
      zh: "在强化模式中累计构筑获取3张以上的强化卡牌",
      es: "Consigue 3 o más cartas de aumento roguelike",
      fr: "Obtenez 3 cartes d'augmentation roguelike ou plus",
    },
    rewardRunes: 220,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: "quest_high_score",
    title: {
      ko: "룬의 지배자",
      en: "Rune Sovereign",
      ja: "ルーンの支配者",
      zh: "符文大主宰",
      es: "Soberano de las runas",
      fr: "Souverain des runes",
    },
    desc: {
      ko: "단일 런에서 누적 10,000점 이상 돌파",
      en: "Score 10,000 or more points in a single run",
      ja: "1回のランで累計10,000点以上を突破",
      zh: "单局游戏总分突破 10,000 分大关",
      es: "Supera los 10.000 puntos en una sola partida",
      fr: "Dépassez les 10 000 points en une seule partie",
    },
    rewardRunes: 380,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 10000,
  },
];

export const BLOCK_BURST_QUESTS_KEY = "block_burst_quests_v1";

export function loadBlockBurstQuests(): BlockBurstQuest[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return INITIAL_BLOCK_BURST_QUESTS.map((q) => ({ ...q }));
  }
  try {
    const raw = window.localStorage.getItem(BLOCK_BURST_QUESTS_KEY);
    if (!raw) return INITIAL_BLOCK_BURST_QUESTS.map((q) => ({ ...q }));
    const saved = JSON.parse(raw) as Partial<BlockBurstQuest>[];
    return INITIAL_BLOCK_BURST_QUESTS.map((init) => {
      const match = saved.find((s) => s.id === init.id);
      if (!match) return { ...init };
      return {
        ...init,
        progress: typeof match.progress === "number" ? match.progress : init.progress,
        isClaimed: typeof match.isClaimed === "boolean" ? match.isClaimed : init.isClaimed,
      };
    });
  } catch {
    return INITIAL_BLOCK_BURST_QUESTS.map((q) => ({ ...q }));
  }
}

export function saveBlockBurstQuests(quests: BlockBurstQuest[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      BLOCK_BURST_QUESTS_KEY,
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

