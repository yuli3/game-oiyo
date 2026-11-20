/**
 * Per-game copy for games that were written in Korean only (2026-11-21).
 *
 * The studio-style audit found 19 games whose English pages showed Korean UI
 * (up to 83 words). Rewriting each of them around a key table would touch every
 * line, so these games keep their Korean source strings and look them up in a
 * small per-game table: GAME_TEXT[slug][korean] = { en, ja, zh, fr, es }.
 * Korean pages, and any string missing from a table, show the Korean source.
 *
 * Placeholders: "{0}", "{1}" … in both the source and the translation, filled
 * by the extra arguments of t().
 */
import { useEffect, useState } from "react";

export type GameTextLocale = "en" | "ja" | "zh" | "fr" | "es";
export type GameTextTable = Record<string, Partial<Record<GameTextLocale, string>>>;

const SUPPORTED = new Set<string>(["ko", "en", "ja", "zh", "fr", "es"]);

export function normalizeGameLocale(lang: string | null | undefined): string {
  const key = (lang ?? "").slice(0, 2).toLowerCase();
  return SUPPORTED.has(key) ? key : "en";
}

function fill(text: string, args: Array<string | number>): string {
  return args.length ? text.replace(/\{(\d+)\}/g, (m, i) => (args[Number(i)] === undefined ? m : String(args[Number(i)]))) : text;
}

export function translateGameText(table: GameTextTable, locale: string, source: string, ...args: Array<string | number>): string {
  if (locale === "ko") return fill(source, args);
  const row = table[source];
  const text = row?.[locale as GameTextLocale] ?? row?.en ?? source;
  return fill(text, args);
}

/** Locale of the page, read from <html lang>. First render uses `initial` (the page prop when known). */
export function usePageLocale(initial?: string): string {
  const [locale, setLocale] = useState(() => (initial ? normalizeGameLocale(initial) : typeof document === "undefined" ? "ko" : normalizeGameLocale(document.documentElement.lang)));
  useEffect(() => {
    if (initial) return;
    setLocale(normalizeGameLocale(document.documentElement.lang));
  }, [initial]);
  return locale;
}

export function useGameText(table: GameTextTable, initial?: string) {
  const locale = usePageLocale(initial);
  const t = (source: string, ...args: Array<string | number>) => translateGameText(table, locale, source, ...args);
  return { t, locale };
}
