/**
 * 카드 서지 (CardSurge) - 암시장 5대 영구 바우처 및 영구 세이브 시스템
 */

export interface SurgeVoucherUpgrade {
  id: string;
  name: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
  level: number;
  maxLevel: number;
  cost: number;
  costMult: number;
  valuePerLevel: number;
}

export interface CardSurgeMetaSave {
  neonChips: number;
  highestAnte: number;
  lifetimeHandsPlayed: number;
  startingBankLvl: number;
  handExpansionLvl: number;
  extraDiscardsLvl: number;
  extraHandsLvl: number;
  shopDiscountLvl: number;
}

export const INITIAL_CARD_SURGE_META_SAVE: CardSurgeMetaSave = {
  neonChips: 0,
  highestAnte: 1,
  lifetimeHandsPlayed: 0,
  startingBankLvl: 0,
  handExpansionLvl: 0,
  extraDiscardsLvl: 0,
  extraHandsLvl: 0,
  shopDiscountLvl: 0,
};

export const SURGE_VOUCHERS: Record<string, Omit<SurgeVoucherUpgrade, "level">> = {
  startingBank: {
    id: "startingBank",
    name: {
      ko: "스폰서 초기 자금",
      en: "Sponsor Seed Capital",
      ja: "スポンサー初期資金",
      zh: "赞助商启动资金",
      es: "Capital semilla de patrocinador",
      fr: "Capital de départ de sponsor",
    },
    desc: {
      ko: "새 게임 시작 시 보유 골드가 레벨당 +$5 영구 증가",
      en: "Grants +$5 starting cash per level at the start of every run",
      ja: "ゲーム開始時の所持金がレベル毎に+$5永続増加",
      zh: "每次新开局时的初始金币每级永久增加+$5",
      es: "Otorga +$5 de dinero inicial por nivel en cada partida",
      fr: "Octroie +$5 de fonds de départ par niveau à chaque partie",
    },
    icon: "💵",
    maxLevel: 4,
    cost: 150,
    costMult: 1.8,
    valuePerLevel: 5,
  },
  handExpansion: {
    id: "handExpansion",
    name: {
      ko: "덱 드로우 확장 바우처",
      en: "Hand Size Voucher",
      ja: "手札枠拡張バウチャー",
      zh: "手牌容量扩张凭证",
      es: "Vale de ampliación de mano",
      fr: "Coupon d'extension de main",
    },
    desc: {
      ko: "턴 시작 시 손에 쥘 수 있는 카드 수가 레벨당 +1장 영구 증가",
      en: "Increases maximum hand draw capacity by +1 card per level",
      ja: "毎ターン配られる手札上限がレベル毎に+1枚永続増加",
      zh: "每回合起始抽到的手牌上限每级永久增加+1张",
      es: "Aumenta el tamaño máximo de mano en +1 carta por nivel",
      fr: "Augmente la taille maximale de la main de +1 carte par niveau",
    },
    icon: "🎴",
    maxLevel: 2,
    cost: 300,
    costMult: 2.2,
    valuePerLevel: 1,
  },
  extraDiscards: {
    id: "extraDiscards",
    name: {
      ko: "사기꾼의 히든 소매",
      en: "Smuggler's Sleeve",
      ja: "詐欺師の隠し袖",
      zh: "老千的隐秘袖箭",
      es: "Manga del contrabandista",
      fr: "Manche du contrebandier",
    },
    desc: {
      ko: "라운드당 주어지는 카드 버리기(Discard) 기회가 레벨당 +1회 증가",
      en: "Grants +1 extra Discard opportunity per level in every round",
      ja: "ラウンド毎の捨て札(Discard)回数がレベル毎に+1回増加",
      zh: "每轮拥有的弃牌重抽次数每级额外增加+1次",
      es: "Otorga +1 descarte adicional por nivel en cada ronda",
      fr: "Octroie +1 défausse supplémentaire par niveau à chaque manche",
    },
    icon: "🔄",
    maxLevel: 2,
    cost: 220,
    costMult: 2.0,
    valuePerLevel: 1,
  },
  extraHands: {
    id: "extraHands",
    name: {
      ko: "승부사의 칩 스택",
      en: "High Stakes Stack",
      ja: "勝負師のチップスタック",
      zh: "豪赌客的底牌筹码",
      es: "Ficha de altas apuestas",
      fr: "Réserve de haute mise",
    },
    desc: {
      ko: "라운드당 카드를 낼 수 있는 핸드(Play) 기회가 레벨당 +1회 증가",
      en: "Grants +1 playable Hand per level in every round to defeat blinds",
      ja: "ラウンド毎にカードを出せるハンド回数がレベル毎に+1回増加",
      zh: "每轮可以出牌得分的手牌次数每级额外增加+1次",
      es: "Otorga +1 jugada de mano adicional por nivel en cada ronda",
      fr: "Octroie +1 main jouable supplémentaire par niveau à chaque manche",
    },
    icon: "🪙",
    maxLevel: 2,
    cost: 250,
    costMult: 2.0,
    valuePerLevel: 1,
  },
  shopDiscount: {
    id: "shopDiscount",
    name: {
      ko: "암시장 VIP 골드 패스",
      en: "Black Market VIP Pass",
      ja: "闇市場VIPゴールドパス",
      zh: "黑市VIP黄金特权卡",
      es: "Pase VIP del mercado negro",
      fr: "Passe VIP du marché noir",
    },
    desc: {
      ko: "상점에서 조커 카드 구매 및 리롤 비용이 레벨당 10% 영구 할인",
      en: "Reduces shop Joker purchase and reroll costs by 10% per level",
      ja: "ショップでのジョーカー購入およびリロール費用がレベル毎に10%割引",
      zh: "商店中购买小丑卡与重刷新花费每级永久优惠10%",
      es: "Reduce los costes de comodines y cambios de tienda un 10% por nivel",
      fr: "Réduit les coûts d'achat et de relance en boutique de 10% par niveau",
    },
    icon: "🎟️",
    maxLevel: 3,
    cost: 200,
    costMult: 1.8,
    valuePerLevel: 0.1,
  },
};

export function loadCardSurgeMetaSave(): CardSurgeMetaSave {
  if (typeof window === "undefined") return INITIAL_CARD_SURGE_META_SAVE;
  try {
    const raw = localStorage.getItem("card_surge_meta_save_v1");
    if (!raw) return INITIAL_CARD_SURGE_META_SAVE;
    const parsed = JSON.parse(raw) as Partial<CardSurgeMetaSave>;
    return { ...INITIAL_CARD_SURGE_META_SAVE, ...parsed };
  } catch {
    return INITIAL_CARD_SURGE_META_SAVE;
  }
}

export function saveCardSurgeMetaSave(save: CardSurgeMetaSave): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("card_surge_meta_save_v1", JSON.stringify(save));
  } catch {
    // ignore
  }
}

export interface CardSurgeModifiers {
  bonusStartingMoney: number;
  bonusHandSize: number;
  bonusDiscards: number;
  bonusHands: number;
  discountRate: number;
}

export function calculateCardSurgeModifiers(save: CardSurgeMetaSave): CardSurgeModifiers {
  return {
    bonusStartingMoney: (save.startingBankLvl || 0) * 5,
    bonusHandSize: (save.handExpansionLvl || 0) * 1,
    bonusDiscards: (save.extraDiscardsLvl || 0) * 1,
    bonusHands: (save.extraHandsLvl || 0) * 1,
    discountRate: Math.min(0.3, (save.shopDiscountLvl || 0) * 0.1),
  };
}

export function buySurgeVoucher(
  key: keyof typeof SURGE_VOUCHERS,
  save: CardSurgeMetaSave
): { success: boolean; newSave: CardSurgeMetaSave } {
  const meta = SURGE_VOUCHERS[key];
  if (!meta) return { success: false, newSave: save };

  const currentLvlKey = `${key}Lvl` as keyof CardSurgeMetaSave;
  const currentLvl = (save[currentLvlKey] as number) || 0;

  if (currentLvl >= meta.maxLevel) {
    return { success: false, newSave: save };
  }

  const cost = Math.round(meta.cost * Math.pow(meta.costMult, currentLvl));
  if (save.neonChips < cost) {
    return { success: false, newSave: save };
  }

  const newSave: CardSurgeMetaSave = {
    ...save,
    neonChips: save.neonChips - cost,
    [currentLvlKey]: currentLvl + 1,
  };

  saveCardSurgeMetaSave(newSave);
  return { success: true, newSave };
}
