/**
 * Shared schema.org JSON-LD builders for tool/calculator pages (roadmap P2 #13).
 *
 * Every tool page hand-rolls the same FAQPage / HowTo / WebApplication /
 * BreadcrumbList objects. Import these helpers instead and pass plain data:
 *
 *   import { toolStructuredData } from "../../lib/seo/structured-data";
 *   const structuredData = toolStructuredData({
 *     name: m.title, description: m.description,
 *     steps: c.steps, faqs: c.faqs,
 *   });
 *   // <script type="application/ld+json" is:inline set:html={JSON.stringify(structuredData)} />
 *
 * Keeps schema markup consistent (and one place to fix) across the site.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

const CTX = "https://schema.org" as const;

export function faqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": CTX,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function howToJsonLd(name: string, description: string, steps: string[]) {
  return {
    "@context": CTX,
    "@type": "HowTo",
    name,
    description,
    step: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
  };
}

export function webApplicationJsonLd(opts: {
  name: string;
  description: string;
  url?: string;
  category?: string;
}) {
  return {
    "@context": CTX,
    "@type": "WebApplication",
    name: opts.name,
    description: opts.description,
    ...(opts.url ? { url: opts.url } : {}),
    applicationCategory: opts.category ?? "UtilityApplication",
    operatingSystem: "All",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/**
 * Course JSON-LD for academy / lecture-series chapter clusters.
 *
 * Emitted on the course landing (chapter 1) so the whole series is eligible
 * for Google's Course rich result. Required fields per Google: name,
 * description, provider, plus hasCourseInstance (with courseMode + workload)
 * and a free offer to qualify as a structured, free online course.
 */
export function courseJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl: string;
  inLanguage?: string;
  /** Total reading time across all chapters, in minutes. */
  workloadMinutes?: number;
  /** Ordered chapter titles for the syllabus (hasPart). */
  chapterTitles?: string[];
  chapterUrls?: string[];
}) {
  const workload =
    opts.workloadMinutes && opts.workloadMinutes > 0
      ? `PT${opts.workloadMinutes}M`
      : undefined;

  const hasPart =
    opts.chapterTitles && opts.chapterTitles.length
      ? opts.chapterTitles.map((title, i) => ({
          "@type": "Course",
          name: title,
          ...(opts.chapterUrls?.[i] ? { url: opts.chapterUrls[i] } : {}),
        }))
      : undefined;

  return {
    "@context": CTX,
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: {
      "@type": "Organization",
      name: opts.providerName,
      url: opts.providerUrl,
    },
    ...(opts.inLanguage ? { inLanguage: opts.inLanguage } : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      ...(workload ? { courseWorkload: workload } : {}),
    },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", category: "Free" },
    ...(hasPart ? { hasPart } : {}),
  };
}

/**
 * CollectionPage + ItemList for hub/index pages (course catalog, magazine,
 * tools, category listings). Turns a human-facing hub into a machine-readable
 * catalog so search engines and AI agents can enumerate the collection.
 */
export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
  inLanguage?: string;
}) {
  return {
    "@context": CTX,
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    ...(opts.inLanguage ? { inLanguage: opts.inLanguage } : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: it.url,
      })),
    },
  };
}

/**
 * Build the standard array a tool page emits: HowTo (if steps) + FAQPage
 * (if faqs), plus optional WebApplication / BreadcrumbList.
 */
export function toolStructuredData(opts: {
  name: string;
  description: string;
  steps?: string[];
  faqs?: FaqItem[];
  url?: string;
  category?: string;
  breadcrumbs?: BreadcrumbItem[];
  webApplication?: boolean;
}) {
  const out: Record<string, unknown>[] = [];
  if (opts.webApplication) {
    out.push(webApplicationJsonLd({
      name: opts.name,
      description: opts.description,
      url: opts.url,
      category: opts.category,
    }));
  }
  if (opts.steps?.length) out.push(howToJsonLd(opts.name, opts.description, opts.steps));
  if (opts.faqs?.length) out.push(faqPageJsonLd(opts.faqs));
  if (opts.breadcrumbs?.length) out.push(breadcrumbJsonLd(opts.breadcrumbs));
  return out;
}
