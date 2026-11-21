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

const TEMPLATE_CACHE = new WeakMap<GameTextTable, Array<[RegExp, string]>>();

function templatesOf(table: GameTextTable): Array<[RegExp, string]> {
  let list = TEMPLATE_CACHE.get(table);
  if (!list) {
    list = Object.keys(table)
      .filter((key) => /\{\d+\}/.test(key))
      .map((key) => {
        const parts = key.split(/(\{\d+\})/);
        const body = parts.map((part) => (/^\{\d+\}$/.test(part) ? "(.+?)" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("");
        return [new RegExp(`^${body}$`), key] as [RegExp, string];
      });
    TEMPLATE_CACHE.set(table, list);
  }
  return list;
}

/**
 * Translate a finished message that a game engine built in Korean (combat logs and the like).
 * An exact key wins; otherwise the first "{0}" template that matches is used, and each captured
 * value is itself looked up, so names inside a log line are translated too.
 */
export function translateGameMessage(
  table: GameTextTable,
  locale: string,
  message: string,
  /** Optional lookup for values the table does not hold, such as names from a game catalog. */
  resolve?: (value: string) => string | undefined,
): string {
  if (locale === "ko") return message;
  if (table[message]) return translateGameText(table, locale, message);
  for (const [re, key] of templatesOf(table)) {
    const m = re.exec(message);
    if (!m) continue;
    const order = [...key.matchAll(/\{(\d+)\}/g)].map((x) => Number(x[1]));
    const args: string[] = [];
    order.forEach((slot, i) => {
      args[slot] = table[m[i + 1]] ? translateGameText(table, locale, m[i + 1]) : (resolve?.(m[i + 1]) ?? m[i + 1]);
    });
    return translateGameText(table, locale, key, ...args);
  }
  return message;
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
  const tm = (message: string, resolve?: (value: string) => string | undefined) => translateGameMessage(table, locale, message, resolve);
  return { t, tm, locale };
}
