/**
 * Result → tool link (2026-11-23).
 *
 * Game pages get many visits but earn little per ad view, while the money
 * calculators on tools.oiyo.net earn several times more. After a finished run
 * we offer one small, relevant calculator link. This file only decides which
 * tool to offer; ResultToolNudge.tsx shows it.
 *
 * Every locale points to its own country's tool where one exists
 * (ja → Japanese take-home pay, en → US take-home pay, and so on).
 */

export type ToolLocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";
export type ToolKey = "pay" | "yearEnd" | "compound";

export interface ToolLink {
  key: ToolKey;
  href: string;
  lead: string;
  label: string;
}

const TOOLS_ORIGIN = "https://tools.oiyo.net";

const PAY_SLUG: Record<ToolLocale, string> = {
  ko: "salary-calculator",
  en: "us-take-home-pay-calculator-2026",
  ja: "japan-salary-calculator",
  zh: "china-salary-calculator",
  fr: "france-salary-calculator",
  es: "spain-salary-calculator",
};

const COPY: Record<ToolLocale, Record<ToolKey, { lead: string; label: string }>> = {
  ko: {
    pay: { lead: "한 판 쉬는 동안", label: "내 월급 실수령액 계산해 보기" },
    yearEnd: { lead: "연말정산 시즌이에요", label: "13월의 월급, 환급액 미리 계산하기" },
    compound: { lead: "게임 속 돈 말고 진짜 돈은?", label: "복리 계산기로 10년 뒤 내 돈 보기" },
  },
  en: {
    pay: { lead: "Taking a break?", label: "See your real take-home pay (US 2026)" },
    yearEnd: { lead: "Taking a break?", label: "See your real take-home pay (US 2026)" },
    compound: { lead: "Real money, not game coins", label: "Compound interest: your money in 10 years" },
  },
  ja: {
    pay: { lead: "ひと休みに", label: "給与の手取り額を計算してみる" },
    yearEnd: { lead: "年末調整の季節です", label: "年末調整の還付金をシミュレーション" },
    compound: { lead: "ゲームのお金より本物のお金", label: "複利計算機で10年後の資産を見る" },
  },
  zh: {
    pay: { lead: "休息一下", label: "算算你的税后实发工资" },
    yearEnd: { lead: "休息一下", label: "算算你的税后实发工资" },
    compound: { lead: "游戏金币之外的真钱", label: "用复利计算机看看10年后的存款" },
  },
  fr: {
    pay: { lead: "Une petite pause ?", label: "Calculez votre salaire net réel" },
    yearEnd: { lead: "Une petite pause ?", label: "Calculez votre salaire net réel" },
    compound: { lead: "Du vrai argent, pas des pièces de jeu", label: "Intérêts composés : votre épargne dans 10 ans" },
  },
  es: {
    pay: { lead: "¿Un descanso?", label: "Calcula tu salario neto real" },
    yearEnd: { lead: "¿Un descanso?", label: "Calcula tu salario neto real" },
    compound: { lead: "Dinero real, no monedas del juego", label: "Interés compuesto: tus ahorros en 10 años" },
  },
};

/** Games about money, trading, shops or gambling get the compound-interest calculator. */
const MONEY_GAME = /blackjack|poker|holdem|baccarat|casino|slot|lotto|lottery|appraiser|tycoon|factory|(?:^|-)shop|(?:^|-)store|market|merchant|stock|trade|coin|gold|money|cash|bank|auction|rich/;

/** Korean 연말정산 and Japanese 年末調整 searches peak November to January. */
export function isYearEndSeason(locale: ToolLocale, month: number): boolean {
  return (locale === "ko" || locale === "ja") && (month === 11 || month === 12 || month === 1);
}

export function toToolLocale(locale: string): ToolLocale {
  return (["ko", "en", "ja", "zh", "fr", "es"] as const).includes(locale as ToolLocale) ? (locale as ToolLocale) : "en";
}

export function toolHref(key: ToolKey, locale: ToolLocale): string {
  if (key === "compound") return `${TOOLS_ORIGIN}/${locale}/compound-interest-calculator/`;
  if (key === "yearEnd" && locale !== "en") return `${TOOLS_ORIGIN}/${locale}/year-end-settlement-calculator/`;
  return `${TOOLS_ORIGIN}/${locale}/${PAY_SLUG[locale]}/`;
}

/** month is 1-12 (pass new Date().getMonth() + 1). */
export function pickResultTool(gameId: string, locale: string, month: number): ToolLink {
  const l = toToolLocale(locale);
  let key: ToolKey = "pay";
  if (MONEY_GAME.test(gameId)) key = "compound";
  else if (isYearEndSeason(l, month)) key = "yearEnd";
  const base = toolHref(key, l);
  const params = new URLSearchParams({
    utm_source: "game.oiyo.net",
    utm_medium: "result_card",
    utm_campaign: "result_to_tool",
    utm_content: gameId,
  });
  return { key, href: `${base}?${params.toString()}`, ...COPY[l][key] };
}
