/**
 * Named AI opponents.
 *
 * Every vs-AI game already had three tiers (견습생 / 숙련가 / 명인) but the
 * opponent itself was anonymous — you played "level 2", not a person. A name
 * costs nothing and turns a difficulty setting into a match against someone.
 *
 * Names are localized rather than left in Latin: a Korean player reading "해리"
 * gets an opponent, a player reading "Harry" in a Korean UI gets a label.
 *
 * Selection is deterministic (see pickOpponent) so re-entering a game does not
 * reshuffle who you are playing mid-session, which would read as a bug.
 */

export type OpponentTier = 1 | 2 | 3;
export type OpponentLocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

export interface Opponent {
  id: string;
  tier: OpponentTier;
  /** Display name per locale. */
  name: Record<OpponentLocale, string>;
  /** One short line of character, shown under the name. */
  blurb: Record<OpponentLocale, string>;
}

export const OPPONENTS: readonly Opponent[] = [
  // ── Tier 1: plays honestly, misses tactics. Should feel beatable. ──
  {
    id: "mary",
    tier: 1,
    name: { ko: "메리", en: "Mary", ja: "メリー", zh: "玛丽", fr: "Marie", es: "María" },
    blurb: {
      ko: "규칙은 다 아는데 아직 함정은 못 봐요",
      en: "Knows every rule, misses every trap",
      ja: "ルールは全部知っているが罠には気づかない",
      zh: "规则都懂，但还看不出陷阱",
      fr: "Connaît les règles, rate les pièges",
      es: "Sabe las reglas, no ve las trampas",
    },
  },
  {
    id: "toby",
    tier: 1,
    name: { ko: "토비", en: "Toby", ja: "トビー", zh: "托比", fr: "Tobie", es: "Tobi" },
    blurb: {
      ko: "생각보다 손이 먼저 나가는 편",
      en: "Moves first, thinks later",
      ja: "考えるより先に手が出る",
      zh: "手比脑子快",
      fr: "Joue d'abord, réfléchit ensuite",
      es: "Mueve primero, piensa después",
    },
  },
  // ── Tier 2: punishes obvious mistakes, plans a couple of moves. ──
  {
    id: "david",
    tier: 2,
    name: { ko: "데이빗", en: "David", ja: "デビッド", zh: "大卫", fr: "David", es: "David" },
    blurb: {
      ko: "실수 한 번은 반드시 갚아줍니다",
      en: "One mistake and he collects",
      ja: "ミスは必ず取り返してくる",
      zh: "你一失误他就抓住",
      fr: "Une erreur et il en profite",
      es: "Un error y lo aprovecha",
    },
  },
  {
    id: "nari",
    tier: 2,
    name: { ko: "나리", en: "Nari", ja: "ナリ", zh: "娜莉", fr: "Nari", es: "Nari" },
    blurb: {
      ko: "조용히 유리한 자리를 먼저 잡아요",
      en: "Quietly takes the better square first",
      ja: "静かに有利な位置を先に取る",
      zh: "悄悄先占好位置",
      fr: "Prend discrètement la meilleure place",
      es: "Toma la mejor casilla sin avisar",
    },
  },
  // ── Tier 3: searches deep, rarely gives anything away. ──
  {
    id: "harry",
    tier: 3,
    name: { ko: "해리", en: "Harry", ja: "ハリー", zh: "哈利", fr: "Harry", es: "Harry" },
    blurb: {
      ko: "몇 수 앞을 보고 기다립니다",
      en: "Sees several moves ahead and waits",
      ja: "数手先を読んで待っている",
      zh: "算好几步再等你",
      fr: "Voit plusieurs coups d'avance et attend",
      es: "Ve varios movimientos y espera",
    },
  },
  {
    id: "seol",
    tier: 3,
    name: { ko: "설", en: "Seol", ja: "ソル", zh: "雪", fr: "Seol", es: "Seol" },
    blurb: {
      ko: "빈틈이 생길 때까지 절대 서두르지 않아요",
      en: "Never rushes; waits for the gap",
      ja: "隙ができるまで決して急がない",
      zh: "不急，等你露出空档",
      fr: "Ne se précipite jamais, attend la faille",
      es: "Nunca se apura; espera el hueco",
    },
  },
] as const;

export function opponentsForTier(tier: OpponentTier): Opponent[] {
  return OPPONENTS.filter((o) => o.tier === tier);
}

/**
 * Picks an opponent for a tier, deterministically from a seed.
 *
 * Deterministic on purpose: the caller passes something stable for the session
 * (game slug + tier, or a match counter if it wants rotation). Random selection
 * on every render would swap the opponent's name mid-game.
 */
export function pickOpponent(tier: OpponentTier, seed: string): Opponent {
  const pool = opponentsForTier(tier);
  if (pool.length === 0) throw new Error(`No opponent defined for tier ${tier}`);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return pool[Math.abs(hash) % pool.length];
}

export function opponentName(o: Opponent, locale: string): string {
  return o.name[(locale as OpponentLocale)] ?? o.name.en;
}

export function opponentBlurb(o: Opponent, locale: string): string {
  return o.blurb[(locale as OpponentLocale)] ?? o.blurb.en;
}
