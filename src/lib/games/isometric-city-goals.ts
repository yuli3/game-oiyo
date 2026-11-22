import { citySummary, type CityState } from "./isometric-city";

/**
 * City goals for Isometric City (2026-11-22, stage range 10-50): 30 goals in a
 * fixed order that turn the sandbox into stages. Each goal reads one number from
 * the city; the first goal not yet met is the current one. Progress lives in
 * stage-progress ("oiyo:stages:isometric-city") and survives "New city".
 */

export const CITY_GOAL_SLUG = "isometric-city";

export type CityGoalMetric =
  | "population"
  | "jobs"
  | "happiness"
  | "parkLevels"
  | "civicLevels"
  | "powerPlants"
  | "maxLevelBuildings"
  | "funds"
  | "buildings";

export interface CityGoal {
  readonly metric: CityGoalMetric;
  readonly target: number;
}

export const CITY_GOALS: readonly CityGoal[] = [
  { metric: "population", target: 150 },
  { metric: "parkLevels", target: 4 },
  { metric: "population", target: 220 },
  { metric: "jobs", target: 260 },
  { metric: "happiness", target: 70 },
  { metric: "population", target: 300 },
  { metric: "powerPlants", target: 2 },
  { metric: "maxLevelBuildings", target: 1 },
  { metric: "population", target: 400 },
  { metric: "funds", target: 15_000 },
  { metric: "civicLevels", target: 2 },
  { metric: "population", target: 500 },
  { metric: "buildings", target: 30 },
  { metric: "jobs", target: 500 },
  { metric: "population", target: 650 },
  { metric: "parkLevels", target: 8 },
  { metric: "happiness", target: 80 },
  { metric: "population", target: 800 },
  { metric: "maxLevelBuildings", target: 5 },
  { metric: "population", target: 1_000 },
  { metric: "powerPlants", target: 3 },
  { metric: "jobs", target: 800 },
  { metric: "population", target: 1_200 },
  { metric: "funds", target: 40_000 },
  { metric: "buildings", target: 60 },
  { metric: "population", target: 1_500 },
  { metric: "civicLevels", target: 6 },
  { metric: "maxLevelBuildings", target: 15 },
  { metric: "population", target: 1_800 },
  { metric: "population", target: 2_200 },
];

export const CITY_GOAL_COUNT = CITY_GOALS.length;

export function cityGoalValue(state: CityState, metric: CityGoalMetric): number {
  if (metric === "funds") return Math.floor(state.funds);
  const summary = citySummary(state);
  if (metric === "population") return summary.population;
  if (metric === "jobs") return summary.jobs;
  if (metric === "happiness") return summary.happiness;
  let value = 0;
  for (const cell of state.cells) {
    if (cell.kind === "grass" || cell.kind === "road") continue;
    if (metric === "parkLevels" && cell.kind === "park") value += cell.level;
    else if (metric === "civicLevels" && cell.kind === "civic") value += cell.level;
    else if (metric === "powerPlants" && cell.kind === "power") value += 1;
    else if (metric === "maxLevelBuildings" && cell.level >= 3) value += 1;
    else if (metric === "buildings") value += 1;
  }
  return value;
}

export function cityGoalMet(state: CityState, index: number): boolean {
  const goal = CITY_GOALS[index];
  return Boolean(goal) && cityGoalValue(state, goal.metric) >= goal.target;
}

const METRIC_LABEL: Record<string, Record<CityGoalMetric, string>> = {
  ko: { population: "인구", jobs: "일자리", happiness: "행복도", parkLevels: "공원 레벨 합", civicLevels: "공공시설 레벨 합", powerPlants: "발전소", maxLevelBuildings: "레벨 3 건물", funds: "예산", buildings: "건물 수" },
  en: { population: "Population", jobs: "Jobs", happiness: "Happiness", parkLevels: "Park levels", civicLevels: "Civic levels", powerPlants: "Power plants", maxLevelBuildings: "Level-3 buildings", funds: "Funds", buildings: "Buildings" },
  ja: { population: "人口", jobs: "雇用", happiness: "幸福度", parkLevels: "公園レベル合計", civicLevels: "公共施設レベル合計", powerPlants: "発電所", maxLevelBuildings: "レベル3の建物", funds: "予算", buildings: "建物数" },
  zh: { population: "人口", jobs: "岗位", happiness: "幸福度", parkLevels: "公园等级合计", civicLevels: "公共设施等级合计", powerPlants: "发电站", maxLevelBuildings: "3级建筑", funds: "预算", buildings: "建筑数" },
  fr: { population: "Population", jobs: "Emplois", happiness: "Bonheur", parkLevels: "Niveaux de parcs", civicLevels: "Niveaux civiques", powerPlants: "Centrales", maxLevelBuildings: "Bâtiments niveau 3", funds: "Budget", buildings: "Bâtiments" },
  es: { population: "Población", jobs: "Empleos", happiness: "Felicidad", parkLevels: "Niveles de parques", civicLevels: "Niveles cívicos", powerPlants: "Centrales", maxLevelBuildings: "Edificios nivel 3", funds: "Fondos", buildings: "Edificios" },
};

const GOAL_WORD: Record<string, { goal: string; reached: (n: number) => string; allDone: string }> = {
  ko: { goal: "도시 목표", reached: (n) => `도시 목표 ${n} 달성!`, allDone: "도시 목표 30개 모두 달성!" },
  en: { goal: "City goal", reached: (n) => `City goal ${n} reached!`, allDone: "All 30 city goals reached!" },
  ja: { goal: "都市目標", reached: (n) => `都市目標${n}達成!`, allDone: "都市目標30個すべて達成!" },
  zh: { goal: "城市目标", reached: (n) => `城市目标${n}达成！`, allDone: "30个城市目标全部达成！" },
  fr: { goal: "Objectif", reached: (n) => `Objectif ${n} atteint !`, allDone: "Les 30 objectifs sont atteints !" },
  es: { goal: "Meta", reached: (n) => `¡Meta ${n} lograda!`, allDone: "¡Las 30 metas logradas!" },
};

export function cityGoalText(locale: string) {
  const labels = METRIC_LABEL[locale] ?? METRIC_LABEL.en;
  const words = GOAL_WORD[locale] ?? GOAL_WORD.en;
  return { ...words, metric: (metric: CityGoalMetric) => labels[metric] };
}
