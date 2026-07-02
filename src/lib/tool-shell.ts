/**
 * Helper for ToolShell page adoption — removes the per-page boilerplate
 * (locale fallback, locale-correct related links, FAQ heading/items).
 *
 * Usage in a tool page frontmatter:
 *   const { content: c, faqHeading, faqItems } = buildToolShell(content, faqs, locale);
 * then pass `content={c}` to ToolShell and `items={faqItems} heading={faqHeading}` to FaqAccordion.
 *
 * `content` and `faqs` must include an `en` key (used as fallback).
 */
export interface ToolShellRelated {
  href: string;
  label: string;
  desc: string;
}
export interface ToolShellFaq {
  q: string;
  a: string;
}

export function faqHeadingFor(locale: string): string {
  if (locale === "ko") return "자주 묻는 질문";
  if (locale === "ja") return "よくある質問";
  if (locale === "zh") return "常见问题";
  if (locale === "fr") return "Questions fréquentes";
  if (locale === "es") return "Preguntas frecuentes";
  return "FAQ";
}

export function buildToolShell<C extends { related: ToolShellRelated[] }>(
  content: Record<string, C> & { en: C },
  faqs: Record<string, ToolShellFaq[]> & { en: ToolShellFaq[] },
  locale: string,
): { content: C; faqHeading: string; faqItems: ToolShellFaq[] } {
  const base = content[locale] ?? content.en;
  // Re-prefix related links to the current locale (fallback content uses /en/).
  const localized: C = {
    ...base,
    related: base.related.map((r) => ({ ...r, href: r.href.replace(/^\/[a-z]{2}\//, `/${locale}/`) })),
  };
  return {
    content: localized,
    faqHeading: faqHeadingFor(locale),
    faqItems: faqs[locale] ?? faqs.en,
  };
}
