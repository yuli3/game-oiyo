/**
 * Family-first ToolCTA / ToolCTAInline href resolution (game port).
 * Never fall back to ahoxy.com (content-less 301 shell).
 */
import { BLOG_URL, GAME_URL, OIYO_URL } from "../config/site.config.ts";

const UTM = "utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta";

/** Absolute family surfaces (oiyo tests, game arcade) when blog is not the owner. */
export const TOOL_CTA_FAMILY_OVERRIDES: Record<string, (locale: string) => string> = {
  mbti: (l) => `${OIYO_URL}/${l}/mbti/test?${UTM}`,
  riasec: (l) => `${OIYO_URL}/${l}/riasec-career-test?${UTM}`,
  "adhd-screening": (l) => `${OIYO_URL}/${l}/adhd/test?${UTM}`,
  disc: (l) => `${OIYO_URL}/${l}/disc-personality-test?${UTM}`,
  "attachment-style": (l) => `${OIYO_URL}/${l}/attachment-style/test?${UTM}`,
  lovelanguage: (l) => `${OIYO_URL}/${l}/love-language/test?${UTM}`,
  egogram: (l) => `${OIYO_URL}/${l}/egogram-test?${UTM}`,
  "depression-test": (l) => `${OIYO_URL}/${l}/depression/test?${UTM}`,
  "stress-type": (l) => `${OIYO_URL}/${l}/stress-type-test?${UTM}`,
  "eq-insight": (l) => `${OIYO_URL}/${l}/eq/test?${UTM}`,
  hormones: (l) => `${OIYO_URL}/${l}/hormones-test?${UTM}`,
  "learning-style": (l) => `${OIYO_URL}/${l}/learning-style-test?${UTM}`,
  "self-esteem-compass": (l) => `${OIYO_URL}/${l}/self-esteem/test?${UTM}`,
  "empathy-test": (l) => `${OIYO_URL}/${l}/empathy/test?${UTM}`,
  investment: (l) => `${OIYO_URL}/${l}/investment-type/test?${UTM}`,
  chess: (l) => `${GAME_URL}/${l}/chess/`,
  gomoku: (l) => `${GAME_URL}/${l}/gomoku/`,
};

/**
 * Blog interactive tool slug for ToolCTA keys (no leading/trailing slash).
 * Keys without a live page are omitted and resolve to /{locale}/tools/.
 */
export const TOOL_CTA_BLOG_SLUGS: Record<string, string> = {
  compound: "compound-interest-calculator",
  bmi: "bmi-calculator",
  "year-end-settlement": "year-end-settlement-calculator",
  "salary-calculator": "salary-calculator",
  "insurance-premium": "insurance-premium-calculator",
  "early-repayment": "early-repayment-calculator",
  "property-tax": "property-tax-calculator",
  pension: "pension-calculator",
  vat: "vat-calculator",
  "loan-calculator": "loan-calculator",
  savings: "deposit-calculator",
  "inflation-calculator": "inflation-calculator",
  "latte-factor": "latte-factor-calculator",
  "dutch-pay": "dutch-pay-calculator",
  "roi-calculator": "roi-calculator",
  "stock-yield-calculator": "stock-yield-calculator",
  "dividend-calendar": "dividend-calendar",
  "severance-pay": "severance-calculator",
  compound2: "compound2-calculator",
  "capital-gains-tax": "capital-gains-tax-calculator",
  "inheritance-tax": "inheritance-tax-calculator",
  "gift-tax": "gift-tax-calculator",
  "acquisition-tax": "acquisition-tax-calculator",
  "freelancer-tax": "freelancer-tax-calculator",
  // crypto-tax-calculator: CryptoTaxCalculator component exists but no route page → tools hub
  bodyfat: "body-fat-calculator",
  calorie: "nutrition-calculator",
  "caffeine-calculator": "caffeine-calculator",
  "life-expectancy": "life-expectancy-calculator",
  "menstrual-tracker": "menstrual-cycle-calculator",
  "child-height": "child-height-calculator",
  "fasting-tracker": "fasting-tracker",
  nutrition: "nutrition-calculator",
  "mbti-stress-relief": "mbti-stress-relief",
  dday: "dday-counter",
  worldclock: "world-clock",
  tip: "tip-calculator",
  "global-etf": "etf-recommender",
  "legal-interest": "legal-interest-calculator",
};

/** Game-local same-origin overrides (prefer relative over absolute GAME_URL). */
const GAME_LOCAL_OVERRIDES: Record<string, (locale: string) => string> = {
  chess: (l) => `/${l}/chess/`,
  gomoku: (l) => `/${l}/gomoku/`,
};

export function toolCtaHref(tool: string, locale: string = "ko"): string {
  const local = GAME_LOCAL_OVERRIDES[tool];
  if (local) return local(locale);

  const override = TOOL_CTA_FAMILY_OVERRIDES[tool];
  if (override) return override(locale);

  const slug = TOOL_CTA_BLOG_SLUGS[tool];
  if (slug) {
    return `${BLOG_URL}/${locale}/${slug}/?${UTM}`;
  }

  // Unknown / no live page: family tools hub — never ahoxy.com
  return `${BLOG_URL}/${locale}/tools/?${UTM}`;
}
