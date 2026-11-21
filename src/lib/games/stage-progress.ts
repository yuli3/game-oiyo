/**
 * Stage progress for puzzle games that ship a fixed list of hand-made boards
 * (stage range 10-50, 2026-11-21). Stores which stages a player cleared, per game.
 * Storage can be blocked (private mode); then progress simply is not remembered.
 */

const PREFIX = "oiyo:stages:";

export function stageKey(slug: string): string {
  return `${PREFIX}${slug}`;
}

export function loadClearedStages(slug: string, count: number): number[] {
  try {
    const raw = window.localStorage.getItem(stageKey(slug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < count).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function markStageCleared(slug: string, index: number, count: number): number[] {
  const cleared = new Set(loadClearedStages(slug, count));
  if (Number.isInteger(index) && index >= 0 && index < count) cleared.add(index);
  const list = [...cleared].sort((a, b) => a - b);
  try {
    window.localStorage.setItem(stageKey(slug), JSON.stringify(list));
  } catch {
    // Storage blocked: keep the in-memory list only.
  }
  return list;
}

/** The first stage not yet cleared, or the last stage when every one is done. */
export function nextOpenStage(cleared: readonly number[], count: number): number {
  for (let i = 0; i < count; i++) if (!cleared.includes(i)) return i;
  return Math.max(0, count - 1);
}

export const STAGE_LABEL: Record<string, string> = {
  ko: "단계",
  en: "Stage",
  ja: "ステージ",
  zh: "关卡",
  fr: "Niveau",
  es: "Nivel",
};

/**
 * Procedural level games (each clear makes a new, harder level) stop at this many stages
 * and offer a fresh start from stage 1 after the finale (stage range 10-50, 2026-11-21).
 */
export const ENDLESS_STAGE_CAP = 50;

/** The level that follows a clear: one more, or back to 1 after the last stage. */
export function nextCappedStage(level: number, cap: number = ENDLESS_STAGE_CAP): number {
  return level >= cap ? 1 : level + 1;
}

export function isFinalStage(level: number, cap: number = ENDLESS_STAGE_CAP): boolean {
  return level >= cap;
}

/** Shown on the clear screen of the last stage, where "next stage" would be. */
export const FINALE_LABEL: Record<string, string> = {
  ko: "마지막 단계까지 완주! 처음부터 다시",
  en: "All stages cleared! Start over",
  ja: "全ステージ制覇! 最初から",
  zh: "全部关卡通关！重新开始",
  fr: "Tous les niveaux réussis ! Recommencer",
  es: "¡Todos los niveles superados! Empezar de nuevo",
};

export function finaleLabel(locale: string): string {
  return FINALE_LABEL[locale] ?? FINALE_LABEL.en;
}
