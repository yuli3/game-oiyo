/**
 * Centralized Route Management for ahoxy.com
 * Ensures consistent URL patterns and locale prefixing using Astro's i18n standards.
 */
import { getRelativeLocaleUrl } from "astro:i18n";

export const SUPPORTED_LOCALES = ["ko", "en", "ja", "fr", "es"] as const;
export const supportLocales = SUPPORTED_LOCALES;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const routes = {
  /**
   * Home page for a given locale
   */
  home: (locale: string = "ko") => getRelativeLocaleUrl(locale, "/"),

  /**
   * Interactive Tool Islands (e.g., /ko/bmi)
   */
  tool: (id: string, locale: string = "ko") => getRelativeLocaleUrl(locale, `/${id}/`),

  /**
   * Informational Blog Posts (e.g., /ko/blog/about-bmi)
   */
  blog: (slug: string, locale: string = "ko") => getRelativeLocaleUrl(locale, `/blog/${slug}/`),
};
