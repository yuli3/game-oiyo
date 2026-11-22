import type { MallowIsleSave } from "./mallow-isle";

/**
 * Island goals for Mallow Isle (2026-11-22, stage range 10-50): 20 goals in a
 * fixed order on top of the cozy sandbox. The first goal not yet met is the
 * current one; progress lives in stage-progress ("oiyo:stages:mallow-isle").
 */

export const ISLE_GOAL_SLUG = "mallow-isle";

export type IsleGoalMetric = "cozy" | "trees" | "flowers" | "benches" | "decorations" | "sculpted";

export interface IsleGoal {
  readonly metric: IsleGoalMetric;
  readonly target: number;
}

export const ISLE_GOALS: readonly IsleGoal[] = [
  { metric: "cozy", target: 75 },
  { metric: "trees", target: 5 },
  { metric: "sculpted", target: 3 },
  { metric: "flowers", target: 6 },
  { metric: "benches", target: 2 },
  { metric: "cozy", target: 90 },
  { metric: "decorations", target: 15 },
  { metric: "trees", target: 10 },
  { metric: "sculpted", target: 10 },
  { metric: "cozy", target: 100 },
  { metric: "flowers", target: 14 },
  { metric: "benches", target: 4 },
  { metric: "decorations", target: 30 },
  { metric: "trees", target: 16 },
  { metric: "sculpted", target: 25 },
  { metric: "flowers", target: 22 },
  { metric: "benches", target: 7 },
  { metric: "decorations", target: 45 },
  { metric: "sculpted", target: 50 },
  { metric: "decorations", target: 60 },
];

export const ISLE_GOAL_COUNT = ISLE_GOALS.length;

export function isleGoalValue(save: Pick<MallowIsleSave, "decorations" | "sculpted" | "cozy">, metric: IsleGoalMetric): number {
  if (metric === "cozy") return save.cozy;
  if (metric === "sculpted") return save.sculpted;
  if (metric === "decorations") return save.decorations.length;
  const type = metric === "trees" ? "tree" : metric === "flowers" ? "flowers" : "bench";
  return save.decorations.filter((item) => item.type === type).length;
}

export function isleGoalMet(save: Pick<MallowIsleSave, "decorations" | "sculpted" | "cozy">, index: number): boolean {
  const goal = ISLE_GOALS[index];
  return Boolean(goal) && isleGoalValue(save, goal.metric) >= goal.target;
}

const METRIC_LABEL: Record<string, Record<IsleGoalMetric, string>> = {
  ko: { cozy: "포근함", trees: "나무", flowers: "꽃", benches: "벤치", decorations: "장식", sculpted: "지형 다듬기" },
  en: { cozy: "Cozy", trees: "Trees", flowers: "Flowers", benches: "Benches", decorations: "Decorations", sculpted: "Terrain shaped" },
  ja: { cozy: "ほっこり度", trees: "木", flowers: "花", benches: "ベンチ", decorations: "飾り", sculpted: "地形づくり" },
  zh: { cozy: "温馨度", trees: "树", flowers: "花", benches: "长椅", decorations: "装饰", sculpted: "地形塑造" },
  fr: { cozy: "Douceur", trees: "Arbres", flowers: "Fleurs", benches: "Bancs", decorations: "Décorations", sculpted: "Terrain modelé" },
  es: { cozy: "Calidez", trees: "Árboles", flowers: "Flores", benches: "Bancos", decorations: "Adornos", sculpted: "Terreno moldeado" },
};

const GOAL_WORD: Record<string, { goal: string; reached: (n: number) => string; allDone: string }> = {
  ko: { goal: "섬 목표", reached: (n) => `섬 목표 ${n} 달성!`, allDone: "섬 목표 20개 모두 달성!" },
  en: { goal: "Island goal", reached: (n) => `Island goal ${n} reached!`, allDone: "All 20 island goals reached!" },
  ja: { goal: "島の目標", reached: (n) => `島の目標${n}達成!`, allDone: "島の目標20個すべて達成!" },
  zh: { goal: "海岛目标", reached: (n) => `海岛目标${n}达成！`, allDone: "20个海岛目标全部达成！" },
  fr: { goal: "Objectif de l'île", reached: (n) => `Objectif ${n} atteint !`, allDone: "Les 20 objectifs de l'île sont atteints !" },
  es: { goal: "Meta de la isla", reached: (n) => `¡Meta ${n} lograda!`, allDone: "¡Las 20 metas de la isla logradas!" },
};

export function isleGoalText(locale: string) {
  const labels = METRIC_LABEL[locale] ?? METRIC_LABEL.en;
  const words = GOAL_WORD[locale] ?? GOAL_WORD.en;
  return { ...words, metric: (metric: IsleGoalMetric) => labels[metric] };
}
