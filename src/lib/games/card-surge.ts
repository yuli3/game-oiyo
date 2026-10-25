/**
 * @file card-surge.ts
 * @description Balatro-inspired mathematical poker roguelike deckbuilder engine.
 * Pure, deterministic rules: Poker hands, Chips x Mult calculation,
 * Jokers (Flat Mult, Flat Chips, X-Mult), Blinds & Boss Blinds, Shop economy.
 */

export type SurgeSuit = "spades" | "hearts" | "clubs" | "diamonds";

export interface SurgeCard {
  id: string;
  suit: SurgeSuit;
  rank: number; // 2..14 (11=J, 12=Q, 13=K, 14=A)
  bonusChips?: number;
  bonusMult?: number;
  enhancement?: "none" | "glass" | "steel" | "stone" | "gold";
  edition?: "base" | "foil" | "holographic" | "polychrome";
  debuffed?: boolean;
}

export type HandType =
  | "straight-flush"
  | "four-of-a-kind"
  | "full-house"
  | "flush"
  | "straight"
  | "three-of-a-kind"
  | "two-pair"
  | "one-pair"
  | "high-card";

export interface HandLevel {
  level: number;
  chips: number;
  mult: number;
  name: Record<string, string>;
}

export const BASE_HAND_LEVELS: Record<HandType, { chips: number; mult: number; name: Record<string, string> }> = {
  "straight-flush": {
    chips: 100,
    mult: 8,
    name: { ko: "스트레이트 플러시", en: "Straight Flush", ja: "ストレートフラッシュ", zh: "同花顺", fr: "Quinte Flush", es: "Escalera de Color" },
  },
  "four-of-a-kind": {
    chips: 60,
    mult: 7,
    name: { ko: "포카드", en: "Four of a Kind", ja: "フォーカード", zh: "四条", fr: "Carré", es: "Póker" },
  },
  "full-house": {
    chips: 40,
    mult: 4,
    name: { ko: "풀하우스", en: "Full House", ja: "フルハウス", zh: "葫芦", fr: "Full", es: "Full" },
  },
  flush: {
    chips: 35,
    mult: 4,
    name: { ko: "플러시", en: "Flush", ja: "フラッシュ", zh: "同花", fr: "Couleur", es: "Color" },
  },
  straight: {
    chips: 30,
    mult: 4,
    name: { ko: "스트레이트", en: "Straight", ja: "ストレート", zh: "顺子", fr: "Quinte", es: "Escalera" },
  },
  "three-of-a-kind": {
    chips: 30,
    mult: 3,
    name: { ko: "트리플", en: "Three of a Kind", ja: "スリーカード", zh: "三条", fr: "Brelan", es: "Trío" },
  },
  "two-pair": {
    chips: 20,
    mult: 2,
    name: { ko: "투페어", en: "Two Pair", ja: "ツーペア", zh: "两对", fr: "Deux Paires", es: "Doble Pareja" },
  },
  "one-pair": {
    chips: 10,
    mult: 2,
    name: { ko: "원페어", en: "One Pair", ja: "ワンペア", zh: "一对", fr: "Une Paire", es: "Pareja" },
  },
  "high-card": {
    chips: 5,
    mult: 1,
    name: { ko: "하이카드", en: "High Card", ja: "ハイカード", zh: "高牌", fr: "Carte Haute", es: "Carta Alta" },
  },
};

export type JokerRarity = "common" | "uncommon" | "rare";

export interface SurgeJoker {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  cost: number;
  rarity: JokerRarity;
  slug: string;
}

export const JOKER_CATALOG: SurgeJoker[] = [
  {
    id: "joker-basic",
    slug: "joker-basic",
    name: { ko: "조커", en: "Joker", ja: "ジョーカー", zh: "小丑", fr: "Joker", es: "Comodín" },
    description: { ko: "+4 배율", en: "+4 Mult", ja: "+4 倍率", zh: "+4 倍数", fr: "+4 Mult", es: "+4 Mult" },
    cost: 3,
    rarity: "common",
  },
  {
    id: "chaos-clown",
    slug: "chaos-clown",
    name: { ko: "카오스 피에로", en: "Chaos Clown", ja: "カオスクラウン", zh: "混沌小丑", fr: "Clown du Chaos", es: "Payaso del Caos" },
    description: { ko: "득점 카드 1장당 +20 칩", en: "+20 Chips for each scored card", ja: "得点カード1枚につき+20チップ", zh: "每张计分牌+20筹码", fr: "+20 jetons par carte scorée", es: "+20 fichas por carta puntuada" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "greedy-joker",
    slug: "greedy-joker",
    name: { ko: "욕심쟁이 조커", en: "Greedy Joker", ja: "強欲のジョーカー", zh: "贪婪小丑", fr: "Joker Cupide", es: "Comodín Codicioso" },
    description: { ko: "다이아몬드(♦) 카드 득점 시 +3 배율", en: "Played ♦ cards give +3 Mult when scored", ja: "ダイヤ(♦)得点で+3倍率", zh: "打出♦牌计分时+3倍数", fr: "Les cartes ♦ jouées donnent +3 Mult", es: "Las cartas ♦ dan +3 Mult al puntuar" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "lusty-joker",
    slug: "lusty-joker",
    name: { ko: "정열의 조커", en: "Lusty Joker", ja: "情熱のジョーカー", zh: "热忱小丑", fr: "Joker Passionné", es: "Comodín Apasionado" },
    description: { ko: "하트(♥) 카드 득점 시 +3 배율", en: "Played ♥ cards give +3 Mult when scored", ja: "ハート(♥)得点で+3倍率", zh: "打出♥牌计分时+3倍数", fr: "Les cartes ♥ jouées donnent +3 Mult", es: "Las cartas ♥ dan +3 Mult al puntuar" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "wrathful-joker",
    slug: "wrathful-joker",
    name: { ko: "분노의 조커", en: "Wrathful Joker", ja: "憤怒のジョーカー", zh: "暴怒小丑", fr: "Joker Furieux", es: "Comodín Furioso" },
    description: { ko: "스페이드(♠) 카드 득점 시 +3 배율", en: "Played ♠ cards give +3 Mult when scored", ja: "スペード(♠)得点で+3倍率", zh: "打出♠牌计分时+3倍数", fr: "Les cartes ♠ jouées donnent +3 Mult", es: "Las cartas ♠ dan +3 Mult al puntuar" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "glutinous-joker",
    slug: "glutinous-joker",
    name: { ko: "탐식의 조커", en: "Glutinous Joker", ja: "暴食のジョーカー", zh: "暴食小丑", fr: "Joker Glouton", es: "Comodín Glotón" },
    description: { ko: "클로버(♣) 카드 득점 시 +3 배율", en: "Played ♣ cards give +3 Mult when scored", ja: "クラブ(♣)得点で+3倍率", zh: "打出♣牌计分时+3倍数", fr: "Les cartes ♣ jouées donnent +3 Mult", es: "Las cartes ♣ dan +3 Mult al puntuar" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "half-joker",
    slug: "half-joker",
    name: { ko: "반쪽 조커", en: "Half Joker", ja: "半分ジョーカー", zh: "半截小丑", fr: "Demi-Joker", es: "Medio Comodín" },
    description: { ko: "낸 카드가 3장 이하이면 +20 배율", en: "+20 Mult if played hand contains 3 or fewer cards", ja: "出したカードが3枚以下なら+20倍率", zh: "若出牌不多于3张，则+20倍数", fr: "+20 Mult si 3 cartes ou moins jouées", es: "+20 Mult si se juegan 3 cartas o menos" },
    cost: 5,
    rarity: "common",
  },
  {
    id: "banner",
    slug: "banner",
    name: { ko: "깃발", en: "Banner", ja: "バナー", zh: "旗帜", fr: "Bannière", es: "Estandarte" },
    description: { ko: "남은 버리기(Discard) 1회당 +40 칩", en: "+40 Chips for each remaining discard", ja: "残りの捨て札1回につき+40チップ", zh: "剩余弃牌次数每有1次+40筹码", fr: "+40 jetons par défausse restante", es: "+40 fichas por descarte restante" },
    cost: 5,
    rarity: "common",
  },
  {
    id: "mystic-summit",
    slug: "mystic-summit",
    name: { ko: "신비한 정상", en: "Mystic Summit", ja: "神秘の頂", zh: "神秘之巅", fr: "Sommet Mystique", es: "Cima Mística" },
    description: { ko: "남은 버리기가 0회일 때 +15 배율", en: "+15 Mult when 0 discards remaining", ja: "残りの捨て札が0のとき+15倍率", zh: "弃牌次数为0时+15倍数", fr: "+15 Mult lorsqu'il reste 0 défausse", es: "+15 Mult con 0 descartes restantes" },
    cost: 5,
    rarity: "common",
  },
  {
    id: "scary-face",
    slug: "scary-face",
    name: { ko: "무서운 얼굴", en: "Scary Face", ja: "怖い顔", zh: "可怕面孔", fr: "Visage Effrayant", es: "Cara Aterradora" },
    description: { ko: "얼굴 카드(J, Q, K) 득점 시 +30 칩", en: "Played face cards (J, Q, K) give +30 Chips when scored", ja: "絵札(J, Q, K)得点で+30チップ", zh: "打出人头牌(J, Q, K)计分时+30筹码", fr: "Les têtes (J, Q, K) donnent +30 jetons", es: "Las figuras (J, Q, K) dan +30 fichas" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "scholar",
    slug: "scholar",
    name: { ko: "학자", en: "Scholar", ja: "学者", zh: "学者", fr: "Érudit", es: "Erudito" },
    description: { ko: "에이스(A) 득점 시 +20 칩 및 +4 배율", en: "Played Aces give +20 Chips and +4 Mult when scored", ja: "エース(A)得点で+20チップ＆+4倍率", zh: "打出A牌计分时+20筹码与+4倍数", fr: "Les As joués donnent +20 jetons et +4 Mult", es: "Los Ases jugados dan +20 fichas y +4 Mult" },
    cost: 5,
    rarity: "common",
  },
  {
    id: "droll-joker",
    slug: "droll-joker",
    name: { ko: "익살꾼 조커", en: "Droll Joker", ja: "ひょうきんジョーカー", zh: "滑稽小丑", fr: "Joker Drôle", es: "Comodín Gracioso" },
    description: { ko: "플러시(Flush)를 낼 때 +10 배율", en: "+10 Mult if played hand is a Flush", ja: "フラッシュで+10倍率", zh: "若出牌为同花，则+10倍数", fr: "+10 Mult si la main est une Couleur", es: "+10 Mult si la mano es Color" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "crazy-joker",
    slug: "crazy-joker",
    name: { ko: "광기의 조커", en: "Crazy Joker", ja: "狂気ジョーカー", zh: "疯狂小丑", fr: "Joker Fou", es: "Comodín Loco" },
    description: { ko: "스트레이트(Straight)를 낼 때 +12 배율", en: "+12 Mult if played hand is a Straight", ja: "ストレートで+12倍率", zh: "若出牌为顺子，则+12倍数", fr: "+12 Mult si la main est une Quinte", es: "+12 Mult si la mano es Escalera" },
    cost: 4,
    rarity: "common",
  },
  {
    id: "the-duo",
    slug: "the-duo",
    name: { ko: "더 듀오", en: "The Duo", ja: "ザ・デュオ", zh: "双重奏", fr: "Le Duo", es: "El Dúo" },
    description: { ko: "원페어를 낼 때 ×2 배율", en: "×2 Mult if played hand contains a Pair", ja: "ワンペアで×2倍率", zh: "若出牌包含对子，则×2倍数", fr: "×2 Mult si la main contient une Paire", es: "×2 Mult si la mano contiene Pareja" },
    cost: 7,
    rarity: "uncommon",
  },
  {
    id: "the-trio",
    slug: "the-trio",
    name: { ko: "더 트리오", en: "The Trio", ja: "ザ・トリオ", zh: "三重奏", fr: "Le Trio", es: "El Trío" },
    description: { ko: "트리플을 낼 때 ×3 배율", en: "×3 Mult if played hand contains Three of a Kind", ja: "スリーカードで×3倍率", zh: "若出牌包含三条，则×3倍数", fr: "×3 Mult si la main contient un Brelan", es: "×3 Mult si la mano contiene Trío" },
    cost: 8,
    rarity: "rare",
  },
  {
    id: "cavendish",
    slug: "cavendish",
    name: { ko: "캐번디시", en: "Cavendish", ja: "キャベンディッシュ", zh: "香蕉", fr: "Cavendish", es: "Cavendish" },
    description: { ko: "×3 배율 (라운드 종료 시 1/100 확률로 파괴)", en: "×3 Mult (1 in 100 chance to go extinct each round)", ja: "×3倍率 (ラウンド終了時1/100で消滅)", zh: "×3倍数 (每轮结束时有1/100概率损毁)", fr: "×3 Mult (1 chance sur 100 d'extinction)", es: "×3 Mult (1 de cada 100 de extinguirse)" },
    cost: 6,
    rarity: "uncommon",
  },
  {
    id: "card-sharp",
    slug: "card-sharp",
    name: { ko: "카드 타짜", en: "Card Sharp", ja: "カードシャープ", zh: "老千小丑", fr: "Expert des Cartes", es: "Tahúr" },
    description: { ko: "이번 라운드에서 이미 낸 족보를 다시 내면 ×3 배율", en: "×3 Mult if played poker hand has already been played this round", ja: "同ラウンドで既に出した役なら×3倍率", zh: "若打出的牌型本轮已出过，则×3倍数", fr: "×3 Mult si la main a déjà été jouée ce tour", es: "×3 Mult si la mano ya se jugó este turno" },
    cost: 6,
    rarity: "uncommon",
  },
  {
    id: "bull",
    slug: "bull",
    name: { ko: "황소", en: "Bull", ja: "ブル", zh: "公牛", fr: "Taureau", es: "Toro" },
    description: { ko: "보유 골드 $1당 +2 칩", en: "+2 Chips for each $1 you have", ja: "所持金$1につき+2チップ", zh: "每拥有$1获得+2筹码", fr: "+2 jetons par $1 possédé", es: "+2 fichas por cada $1 poseído" },
    cost: 5,
    rarity: "uncommon",
  },
  {
    id: "blueprint",
    slug: "blueprint",
    name: { ko: "청사진", en: "Blueprint", ja: "設計図", zh: "蓝图", fr: "Plan", es: "Plano" },
    description: { ko: "오른쪽에 있는 조커의 능력을 복사", en: "Copies ability of Joker to the right", ja: "右隣のジョーカーの能力をコピー", zh: "复制右侧小丑的技能", fr: "Copie la capacité du Joker à sa droite", es: "Copia la habilidad del Comodín a la derecha" },
    cost: 10,
    rarity: "rare",
  },
];

export interface BossBlind {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  suitDebuff?: SurgeSuit;
  scoreMultiplier?: number;
  handsModifier?: number;
  discardsModifier?: number;
}

export const BOSS_BLINDS: BossBlind[] = [
  {
    id: "the-hook",
    name: { ko: "갈고리 (The Hook)", en: "The Hook", ja: "フック", zh: "铁钩", fr: "Le Crochet", es: "El Garfio" },
    description: { ko: "핸드를 낼 때 손패 무작위 2장 강제 버림", en: "Discards 2 random cards per hand played", ja: "役を出す度、手札からランダム2枚破棄", zh: "每次出牌随机弃掉手牌2张", fr: "Défausse 2 cartes au hasard par main", es: "Descarta 2 cartas al azar por mano" },
  },
  {
    id: "the-wall",
    name: { ko: "통곡의 벽 (The Wall)", en: "The Wall", ja: "壁", zh: "城墙", fr: "Le Mur", es: "La Muralla" },
    description: { ko: "목표 점수가 2배로 증가합니다", en: "Extra large blind (2× target score)", ja: "目標スコアが2倍", zh: "超大目标分（2倍目标）", fr: "Objectif doublé (2× le score)", es: "Objetivo duplicado (2× puntuación)" },
    scoreMultiplier: 2.0,
  },
  {
    id: "the-goad",
    name: { ko: "채찍 (The Goad)", en: "The Goad", ja: "突き棒", zh: "刺棒", fr: "L'Aiguillon", es: "La Pica" },
    description: { ko: "모든 스페이드(♠) 카드가 디버프됩니다", en: "All Spades cards are debuffed", ja: "スペード(♠)が全て無効化", zh: "所有黑桃(♠)牌失效", fr: "Toutes les cartes ♠ sont affaiblies", es: "Todas las cartas de ♠ anuladas" },
    suitDebuff: "spades",
  },
  {
    id: "the-club",
    name: { ko: "곤봉 (The Club)", en: "The Club", ja: "棍棒", zh: "大棒", fr: "La Massue", es: "El Garrote" },
    description: { ko: "모든 클로버(♣) 카드가 디버프됩니다", en: "All Clubs cards are debuffed", ja: "クラブ(♣)が全て無効化", zh: "所有梅花(♣)牌失效", fr: "Toutes les cartes ♣ sont affaiblies", es: "Todas las cartas de ♣ anuladas" },
    suitDebuff: "clubs",
  },
  {
    id: "the-window",
    name: { ko: "유리창 (The Window)", en: "The Window", ja: "窓", zh: "窗户", fr: "La Fenêtre", es: "La Ventana" },
    description: { ko: "모든 다이아몬드(♦) 카드가 디버프됩니다", en: "All Diamonds cards are debuffed", ja: "ダイヤ(♦)が全て無効化", zh: "所有方块(♦)牌失效", fr: "Toutes les cartes ♦ sont affaiblies", es: "Todas las cartes de ♦ anuladas" },
    suitDebuff: "diamonds",
  },
  {
    id: "the-heart",
    name: { ko: "심장 (The Heart)", en: "The Heart", ja: "心臓", zh: "红心", fr: "Le Cœur", es: "El Corazón" },
    description: { ko: "모든 하트(♥) 카드가 디버프됩니다", en: "All Hearts cards are debuffed", ja: "ハート(♥)が全て無効化", zh: "所有红桃(♥)牌失效", fr: "Toutes les cartes ♥ sont affaiblies", es: "Todas las cartas de ♥ anuladas" },
    suitDebuff: "hearts",
  },
  {
    id: "the-needle",
    name: { ko: "바늘 (The Needle)", en: "The Needle", ja: "針", zh: "飞针", fr: "L'Aiguille", es: "La Aguja" },
    description: { ko: "단 1번의 핸드만 플레이할 수 있습니다!", en: "Play only 1 hand this round", ja: "1回しか手札を出せません", zh: "本轮仅可出牌1次", fr: "Ne jouez qu'une seule main ce tour", es: "Juega solo 1 mano esta ronda" },
    handsModifier: -3,
  },
  {
    id: "the-water",
    name: { ko: "급류 (The Water)", en: "The Water", ja: "大水", zh: "暗流", fr: "L'Eau", es: "El Agua" },
    description: { ko: "버리기(Discard) 횟수가 0으로 시작합니다", en: "Start with 0 discards", ja: "捨て札0回でスタート", zh: "弃牌次数为0开局", fr: "Commencez avec 0 défausse", es: "Empieza con 0 descartes" },
    discardsModifier: -3,
  },
];

export const ANTE_TARGETS: Record<number, number> = {
  1: 300,
  2: 800,
  3: 2000,
  4: 5000,
  5: 11000,
  6: 20000,
  7: 35000,
  8: 50000,
};

export interface ScoringStep {
  type: "base" | "card" | "joker" | "held";
  sourceName: string;
  chipsAdded: number;
  multAdded: number;
  multMultiplier: number;
  totalChips: number;
  totalMult: number;
  cardId?: string;
  jokerSlug?: string;
}

export interface ScoreBreakdown {
  handType: HandType;
  scoringCards: SurgeCard[];
  baseChips: number;
  baseMult: number;
  finalChips: number;
  finalMult: number;
  totalScore: number;
  steps: ScoringStep[];
}

/**
 * Standard 52-card deck generator
 */
export function createDeck(): SurgeCard[] {
  const suits: SurgeSuit[] = ["spades", "hearts", "clubs", "diamonds"];
  const deck: SurgeCard[] = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({
        id: `${suit}-${rank}-${Math.random().toString(36).substring(2, 7)}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

export function shuffleDeck<T>(array: T[], prng: () => number = Math.random): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Get card chip value: 2-10 face value, J/Q/K = 10, A = 11
 */
export function getCardBaseChips(card: SurgeCard): number {
  if (card.enhancement === "stone") return 50;
  if (card.rank >= 11 && card.rank <= 13) return 10;
  if (card.rank === 14) return 11;
  return card.rank;
}

/**
 * Evaluate 1-5 played cards to identify the best poker hand type and which cards score.
 */
export function evaluatePlayedHand(cards: SurgeCard[]): { handType: HandType; scoringCards: SurgeCard[] } {
  if (cards.length === 0) {
    return { handType: "high-card", scoringCards: [] };
  }

  // Count ranks and suits
  const rankCount = new Map<number, SurgeCard[]>();
  const suitCount = new Map<SurgeSuit, SurgeCard[]>();

  for (const card of cards) {
    const list = rankCount.get(card.rank) ?? [];
    list.push(card);
    rankCount.set(card.rank, list);

    const sList = suitCount.get(card.suit) ?? [];
    sList.push(card);
    suitCount.set(card.suit, sList);
  }

  const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
  const distinctRanks = [...rankCount.keys()].sort((a, b) => b - a);

  const isFlush = cards.length >= 5 && [...suitCount.values()].some((arr) => arr.length >= 5);

  // Check straight for 5 cards
  let isStraight = false;
  if (cards.length === 5 && distinctRanks.length === 5) {
    const span = distinctRanks[0] - distinctRanks[4];
    if (span === 4) {
      isStraight = true;
    } else if (
      distinctRanks[0] === 14 &&
      distinctRanks[1] === 5 &&
      distinctRanks[2] === 4 &&
      distinctRanks[3] === 3 &&
      distinctRanks[4] === 2
    ) {
      // Ace-low wheel (A-2-3-4-5)
      isStraight = true;
    }
  }

  if (isStraight && isFlush) {
    return { handType: "straight-flush", scoringCards: cards };
  }

  // Four of a kind
  for (const rank of distinctRanks) {
    const group = rankCount.get(rank)!;
    if (group.length === 4) {
      return { handType: "four-of-a-kind", scoringCards: group };
    }
  }

  // Full house (needs 3 of one rank, 2 of another)
  let tripRank: number | null = null;
  let pairRank: number | null = null;
  for (const rank of distinctRanks) {
    const len = rankCount.get(rank)!.length;
    if (len >= 3 && tripRank === null) {
      tripRank = rank;
    } else if (len >= 2 && pairRank === null) {
      pairRank = rank;
    }
  }
  if (tripRank !== null && pairRank !== null) {
    const scoring = [...rankCount.get(tripRank)!.slice(0, 3), ...rankCount.get(pairRank)!.slice(0, 2)];
    return { handType: "full-house", scoringCards: scoring };
  }

  // Flush
  if (isFlush) {
    return { handType: "flush", scoringCards: cards };
  }

  // Straight
  if (isStraight) {
    return { handType: "straight", scoringCards: cards };
  }

  // Three of a kind
  if (tripRank !== null) {
    return { handType: "three-of-a-kind", scoringCards: rankCount.get(tripRank)!.slice(0, 3) };
  }

  // Two pair
  const pairs = distinctRanks.filter((r) => rankCount.get(r)!.length >= 2);
  if (pairs.length >= 2) {
    const scoring = [...rankCount.get(pairs[0])!.slice(0, 2), ...rankCount.get(pairs[1])!.slice(0, 2)];
    return { handType: "two-pair", scoringCards: scoring };
  }

  // One pair
  if (pairs.length === 1) {
    return { handType: "one-pair", scoringCards: rankCount.get(pairs[0])!.slice(0, 2) };
  }

  // High card (highest card scores)
  return { handType: "high-card", scoringCards: [sortedCards[0]] };
}

/**
 * Score a hand step by step, applying cards, hand base, and jokers.
 */
export function scoreHand(
  playedCards: SurgeCard[],
  heldCards: SurgeCard[],
  jokers: SurgeJoker[],
  handLevels: Record<HandType, HandLevel>,
  context: {
    discardsRemaining: number;
    money: number;
    playedHandsHistory: HandType[];
    bossBlind?: BossBlind;
  }
): ScoreBreakdown {
  const { handType, scoringCards } = evaluatePlayedHand(playedCards);
  const levelData = handLevels[handType] ?? BASE_HAND_LEVELS[handType];

  let currentChips = levelData.chips;
  let currentMult = levelData.mult;

  const steps: ScoringStep[] = [
    {
      type: "base",
      sourceName: levelData.name.ko,
      chipsAdded: currentChips,
      multAdded: currentMult,
      multMultiplier: 1,
      totalChips: currentChips,
      totalMult: currentMult,
    },
  ];

  // 1. Scoring Cards Evaluation
  for (const card of scoringCards) {
    const isDebuffed = Boolean(
      card.debuffed || (context.bossBlind?.suitDebuff && card.suit === context.bossBlind.suitDebuff)
    );

    if (isDebuffed) {
      continue;
    }

    const baseChips = getCardBaseChips(card);
    const bonusChips = card.bonusChips ?? 0;
    const bonusMult = card.bonusMult ?? 0;

    currentChips += baseChips + bonusChips;
    currentMult += bonusMult;

    steps.push({
      type: "card",
      sourceName: `${card.suit} ${card.rank}`,
      chipsAdded: baseChips + bonusChips,
      multAdded: bonusMult,
      multMultiplier: 1,
      totalChips: currentChips,
      totalMult: currentMult,
      cardId: card.id,
    });

    // Glass card effect: ×2 Mult
    if (card.enhancement === "glass") {
      currentMult = Math.round(currentMult * 2);
      steps.push({
        type: "card",
        sourceName: "유리 카드 (Glass)",
        chipsAdded: 0,
        multAdded: 0,
        multMultiplier: 2,
        totalChips: currentChips,
        totalMult: currentMult,
        cardId: card.id,
      });
    }
  }

  // Helper to evaluate a single joker's contribution
  function applyJoker(joker: SurgeJoker, jIdx: number) {
    let chipsToAdd = 0;
    let multToAdd = 0;
    let multMultiplier = 1;

    switch (joker.slug) {
      case "joker-basic":
        multToAdd += 4;
        break;

      case "chaos-clown":
        chipsToAdd += scoringCards.length * 20;
        break;

      case "greedy-joker":
        const diamonds = scoringCards.filter((c) => c.suit === "diamonds").length;
        multToAdd += diamonds * 3;
        break;

      case "lusty-joker":
        const hearts = scoringCards.filter((c) => c.suit === "hearts").length;
        multToAdd += hearts * 3;
        break;

      case "wrathful-joker":
        const spades = scoringCards.filter((c) => c.suit === "spades").length;
        multToAdd += spades * 3;
        break;

      case "glutinous-joker":
        const clubs = scoringCards.filter((c) => c.suit === "clubs").length;
        multToAdd += clubs * 3;
        break;

      case "half-joker":
        if (playedCards.length <= 3) {
          multToAdd += 20;
        }
        break;

      case "banner":
        chipsToAdd += context.discardsRemaining * 40;
        break;

      case "mystic-summit":
        if (context.discardsRemaining === 0) {
          multToAdd += 15;
        }
        break;

      case "scary-face":
        const faces = scoringCards.filter((c) => c.rank >= 11 && c.rank <= 13).length;
        chipsToAdd += faces * 30;
        break;

      case "scholar":
        const aces = scoringCards.filter((c) => c.rank === 14).length;
        chipsToAdd += aces * 20;
        multToAdd += aces * 4;
        break;

      case "droll-joker":
        if (handType === "flush" || handType === "straight-flush") {
          multToAdd += 10;
        }
        break;

      case "crazy-joker":
        if (handType === "straight" || handType === "straight-flush") {
          multToAdd += 12;
        }
        break;

      case "the-duo":
        if (handType === "one-pair" || handType === "two-pair" || handType === "full-house") {
          multMultiplier = 2;
        }
        break;

      case "the-trio":
        if (handType === "three-of-a-kind" || handType === "full-house") {
          multMultiplier = 3;
        }
        break;

      case "cavendish":
        multMultiplier = 3;
        break;

      case "card-sharp":
        if (context.playedHandsHistory.includes(handType)) {
          multMultiplier = 3;
        }
        break;

      case "bull":
        chipsToAdd += Math.max(0, context.money) * 2;
        break;

      case "blueprint":
        // Blueprint copies joker to its right
        if (jIdx + 1 < jokers.length) {
          const targetJoker = jokers[jIdx + 1];
          if (targetJoker.slug !== "blueprint") {
            applyJoker(targetJoker, jIdx + 1);
            return;
          }
        }
        break;
    }

    if (chipsToAdd > 0 || multToAdd > 0 || multMultiplier !== 1) {
      currentChips += chipsToAdd;
      currentMult += multToAdd;
      currentMult = Math.round(currentMult * multMultiplier);

      steps.push({
        type: "joker",
        sourceName: joker.name.ko,
        chipsAdded: chipsToAdd,
        multAdded: multToAdd,
        multMultiplier,
        totalChips: currentChips,
        totalMult: currentMult,
        jokerSlug: joker.slug,
      });
    }
  }

  // 2. Jokers Evaluation (in order left to right)
  for (let i = 0; i < jokers.length; i++) {
    applyJoker(jokers[i], i);
  }

  // 3. Held in Hand Evaluation (e.g. Steel cards: ×1.5 Mult)
  for (const card of heldCards) {
    if (card.enhancement === "steel") {
      currentMult = Math.round(currentMult * 1.5);
      steps.push({
        type: "held",
        sourceName: `강철 카드 (${card.rank})`,
        chipsAdded: 0,
        multAdded: 0,
        multMultiplier: 1.5,
        totalChips: currentChips,
        totalMult: currentMult,
        cardId: card.id,
      });
    }
  }

  const totalScore = currentChips * currentMult;

  return {
    handType,
    scoringCards,
    baseChips: levelData.chips,
    baseMult: levelData.mult,
    finalChips: currentChips,
    finalMult: currentMult,
    totalScore,
    steps,
  };
}

export type BlindType = "small" | "big" | "boss";

export interface CardSurgeState {
  ante: number;
  blindType: BlindType;
  targetScore: number;
  currentRoundScore: number;
  handsRemaining: number;
  discardsRemaining: number;
  money: number;
  deck: SurgeCard[];
  hand: SurgeCard[];
  discardPile: SurgeCard[];
  jokers: SurgeJoker[];
  selectedCardIds: string[];
  handLevels: Record<HandType, HandLevel>;
  playedHandsHistoryThisRound: HandType[];
  bossBlind?: BossBlind;
  phase: "play" | "scoring" | "round-cleared" | "shop" | "game-over" | "victory";
  lastScoreBreakdown?: ScoreBreakdown;
  shopOffers: SurgeJoker[];
  shopRerollCost: number;
}

export function calculateBlindTarget(ante: number, blindType: BlindType, boss?: BossBlind): number {
  const baseTarget = ANTE_TARGETS[ante] ?? (50000 * Math.pow(1.8, ante - 8));
  let mult = 1.0;
  if (blindType === "small") mult = 1.0;
  else if (blindType === "big") mult = 1.5;
  else if (blindType === "boss") mult = (boss?.scoreMultiplier ?? 2.0);

  return Math.round(baseTarget * mult);
}

export function getRandomBossBlind(_ante: number, seed: number = Date.now()): BossBlind {
  const prng = (seed % BOSS_BLINDS.length);
  return BOSS_BLINDS[prng];
}

export function initGame(_seed: number = Date.now()): CardSurgeState {
  const fullDeck = shuffleDeck(createDeck());
  const hand: SurgeCard[] = [];
  for (let i = 0; i < 8 && fullDeck.length > 0; i++) {
    hand.push(fullDeck.pop()!);
  }

  const initialHandLevels = Object.fromEntries(
    Object.entries(BASE_HAND_LEVELS).map(([k, v]) => [
      k,
      { level: 1, chips: v.chips, mult: v.mult, name: v.name },
    ])
  ) as Record<HandType, HandLevel>;

  const targetScore = calculateBlindTarget(1, "small");

  return {
    ante: 1,
    blindType: "small",
    targetScore,
    currentRoundScore: 0,
    handsRemaining: 4,
    discardsRemaining: 3,
    money: 4,
    deck: fullDeck,
    hand,
    discardPile: [],
    jokers: [],
    selectedCardIds: [],
    handLevels: initialHandLevels,
    playedHandsHistoryThisRound: [],
    phase: "play",
    shopOffers: [],
    shopRerollCost: 5,
  };
}

export function toggleCardSelection(state: CardSurgeState, cardId: string): CardSurgeState {
  if (state.phase !== "play") return state;

  const isSelected = state.selectedCardIds.includes(cardId);
  if (isSelected) {
    return {
      ...state,
      selectedCardIds: state.selectedCardIds.filter((id) => id !== cardId),
    };
  }

  // Max 5 cards selectable
  if (state.selectedCardIds.length >= 5) {
    return state;
  }

  return {
    ...state,
    selectedCardIds: [...state.selectedCardIds, cardId],
  };
}

export function discardCards(state: CardSurgeState): CardSurgeState {
  if (state.phase !== "play" || state.discardsRemaining <= 0 || state.selectedCardIds.length === 0) {
    return state;
  }

  const toDiscard = state.hand.filter((c) => state.selectedCardIds.includes(c.id));
  const remainingHand = state.hand.filter((c) => !state.selectedCardIds.includes(c.id));
  const newDiscardPile = [...state.discardPile, ...toDiscard];

  // Draw back up to 8 cards
  const newHand = [...remainingHand];
  const newDeck = [...state.deck];
  while (newHand.length < 8 && newDeck.length > 0) {
    newHand.push(newDeck.pop()!);
  }

  return {
    ...state,
    hand: newHand,
    deck: newDeck,
    discardPile: newDiscardPile,
    discardsRemaining: state.discardsRemaining - 1,
    selectedCardIds: [],
  };
}

export function playCards(state: CardSurgeState): {
  nextState: CardSurgeState;
  breakdown: ScoreBreakdown;
} {
  if (state.phase !== "play" || state.handsRemaining <= 0 || state.selectedCardIds.length === 0) {
    throw new Error("Cannot play cards in current state");
  }

  const playedCards = state.hand.filter((c) => state.selectedCardIds.includes(c.id));
  const remainingHand = state.hand.filter((c) => !state.selectedCardIds.includes(c.id));

  // The Hook boss mechanic: random 2 cards from remaining hand discarded
  let discardedFromHand: SurgeCard[] = [];
  let finalRemainingHand = [...remainingHand];
  if (state.bossBlind?.id === "the-hook" && finalRemainingHand.length > 0) {
    const hookCount = Math.min(2, finalRemainingHand.length);
    for (let k = 0; k < hookCount; k++) {
      const idx = Math.floor(Math.random() * finalRemainingHand.length);
      discardedFromHand.push(finalRemainingHand.splice(idx, 1)[0]);
    }
  }

  const breakdown = scoreHand(playedCards, finalRemainingHand, state.jokers, state.handLevels, {
    discardsRemaining: state.discardsRemaining,
    money: state.money,
    playedHandsHistory: state.playedHandsHistoryThisRound,
    bossBlind: state.bossBlind,
  });

  const newRoundScore = state.currentRoundScore + breakdown.totalScore;
  const newHandsRemaining = state.handsRemaining - 1;
  const isRoundCleared = newRoundScore >= state.targetScore;
  const isGameOver = !isRoundCleared && newHandsRemaining <= 0;

  let newPhase: CardSurgeState["phase"] = "play";
  if (isRoundCleared) {
    newPhase = "round-cleared";
  } else if (isGameOver) {
    newPhase = "game-over";
  }

  // Draw back up to 8 cards
  const newHand = [...finalRemainingHand];
  const newDeck = [...state.deck];
  while (newHand.length < 8 && newDeck.length > 0) {
    newHand.push(newDeck.pop()!);
  }

  const nextState: CardSurgeState = {
    ...state,
    currentRoundScore: newRoundScore,
    handsRemaining: newHandsRemaining,
    hand: newHand,
    deck: newDeck,
    discardPile: [...state.discardPile, ...playedCards, ...discardedFromHand],
    selectedCardIds: [],
    playedHandsHistoryThisRound: [...state.playedHandsHistoryThisRound, breakdown.handType],
    phase: newPhase,
    lastScoreBreakdown: breakdown,
  };

  return { nextState, breakdown };
}

export function openShop(state: CardSurgeState): CardSurgeState {
  if (state.phase !== "round-cleared") return state;

  // Reward: $3 for small, $4 for big, $5 for boss, + $1 per remaining hand
  let roundReward = 3;
  if (state.blindType === "big") roundReward = 4;
  else if (state.blindType === "boss") roundReward = 5;

  roundReward += Math.max(0, state.handsRemaining);

  // Cavendish extinct check (1/100)
  const remainingJokers = state.jokers.filter((j) => {
    if (j.slug === "cavendish" && Math.random() < 0.01) {
      return false;
    }
    return true;
  });

  // Roll 2 random shop jokers
  const offers = shuffleDeck(JOKER_CATALOG).slice(0, 2);

  return {
    ...state,
    money: state.money + roundReward,
    jokers: remainingJokers,
    phase: "shop",
    shopOffers: offers,
    shopRerollCost: 5,
  };
}

export function buyJoker(state: CardSurgeState, jokerId: string): CardSurgeState {
  if (state.phase !== "shop" || state.jokers.length >= 5) return state;

  const offer = state.shopOffers.find((j) => j.id === jokerId);
  if (!offer || state.money < offer.cost) return state;

  return {
    ...state,
    money: state.money - offer.cost,
    jokers: [...state.jokers, offer],
    shopOffers: state.shopOffers.filter((j) => j.id !== jokerId),
  };
}

export function sellJoker(state: CardSurgeState, jokerIndex: number): CardSurgeState {
  if (jokerIndex < 0 || jokerIndex >= state.jokers.length) return state;

  const joker = state.jokers[jokerIndex];
  const sellValue = Math.max(1, Math.floor(joker.cost / 2));
  const newJokers = state.jokers.filter((_, i) => i !== jokerIndex);

  return {
    ...state,
    money: state.money + sellValue,
    jokers: newJokers,
  };
}

export function rerollShop(state: CardSurgeState): CardSurgeState {
  if (state.phase !== "shop" || state.money < state.shopRerollCost) return state;

  const newOffers = shuffleDeck(JOKER_CATALOG).slice(0, 2);

  return {
    ...state,
    money: state.money - state.shopRerollCost,
    shopOffers: newOffers,
    shopRerollCost: state.shopRerollCost + 1,
  };
}

export function advanceToNextBlind(state: CardSurgeState): CardSurgeState {
  if (state.phase !== "shop") return state;

  let nextAnte = state.ante;
  let nextBlindType: BlindType = "small";

  if (state.blindType === "small") {
    nextBlindType = "big";
  } else if (state.blindType === "big") {
    nextBlindType = "boss";
  } else {
    // Beat boss blind -> advance Ante!
    nextAnte += 1;
    nextBlindType = "small";
  }

  if (nextAnte > 8) {
    // Won Ante 8 -> Victory!
    return {
      ...state,
      phase: "victory",
    };
  }

  let nextBoss: BossBlind | undefined = undefined;
  if (nextBlindType === "boss") {
    nextBoss = getRandomBossBlind(nextAnte);
  }

  const targetScore = calculateBlindTarget(nextAnte, nextBlindType, nextBoss);

  // Fresh deck and draw 8 cards
  const freshDeck = shuffleDeck(createDeck());
  const freshHand: SurgeCard[] = [];
  for (let i = 0; i < 8 && freshDeck.length > 0; i++) {
    freshHand.push(freshDeck.pop()!);
  }

  let startingHands = 4;
  let startingDiscards = 3;

  if (nextBoss?.handsModifier) startingHands += nextBoss.handsModifier;
  if (nextBoss?.discardsModifier) startingDiscards += nextBoss.discardsModifier;

  return {
    ...state,
    ante: nextAnte,
    blindType: nextBlindType,
    bossBlind: nextBoss,
    targetScore,
    currentRoundScore: 0,
    handsRemaining: Math.max(1, startingHands),
    discardsRemaining: Math.max(0, startingDiscards),
    deck: freshDeck,
    hand: freshHand,
    discardPile: [],
    selectedCardIds: [],
    playedHandsHistoryThisRound: [],
    phase: "play",
    lastScoreBreakdown: undefined,
  };
}
