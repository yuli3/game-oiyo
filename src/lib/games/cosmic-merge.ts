/**
 * cosmic-merge.ts
 *
 * Core logic, mathematical constants, and data contracts for Cosmic Merge Drop (Suika-style 2D physics merge game).
 * Built with Matter.js rigid-body physics, High-DPI canvas rendering, and Web Audio procedural juice.
 *
 * Date: 2026-10-17
 */

import type { Locale } from "../i18n";

export interface CosmicTier {
  id: number;
  radius: number;
  color: string;
  glow: string;
  coreColor: string;
  score: number;
  name: Record<Locale, string>;
  fact: Record<Locale, string>;
  hasRing?: boolean;
  isStar?: boolean;
}

export const ARENA_WIDTH = 440;
export const ARENA_HEIGHT = 640;
export const DEADLINE_Y = 120;
export const DROP_COOLDOWN_MS = 550;
export const DANGER_TIMEOUT_MS = 2500;

export const COSMIC_TIERS: readonly CosmicTier[] = [
  {
    id: 0,
    radius: 16,
    color: "#94a3b8",
    glow: "#cbd5e1",
    coreColor: "#64748b",
    score: 2,
    name: {
      ko: "소행성",
      en: "Asteroid",
      ja: "小惑星",
      zh: "小行星",
      fr: "Astéroïde",
      es: "Asteroide",
    },
    fact: {
      ko: "태양계 형성 초기의 원시 암석 파편입니다.",
      en: "Primitive rocky building block from solar nebula.",
      ja: "太陽系形成初期の原始的な岩石のかけらです。",
      zh: "太阳系形成早期的原始岩石碎块。",
      fr: "Vestige rocheux primitif du système solaire.",
      es: "Fragmento rocoso primitivo de la nebulosa solar.",
    },
  },
  {
    id: 1,
    radius: 23,
    color: "#38bdf8",
    glow: "#bae6fd",
    coreColor: "#0284c7",
    score: 4,
    name: {
      ko: "달",
      en: "Moon",
      ja: "月",
      zh: "月球",
      fr: "Lune",
      es: "Luna",
    },
    fact: {
      ko: "지구의 자전축을 안정시키는 유일한 자연위성입니다.",
      en: "Earth's only natural satellite stabilizing axial tilt.",
      ja: "地球の自転軸を安定させる唯一の自然衛星です。",
      zh: "稳定地球自转轴的唯一天然卫星。",
      fr: "Unique satellite naturel de la Terre stabilisant son axe.",
      es: "Único satélite natural de la Tierra que estabiliza su eje.",
    },
  },
  {
    id: 2,
    radius: 31,
    color: "#f59e0b",
    glow: "#fde68a",
    coreColor: "#b45309",
    score: 8,
    name: {
      ko: "수성",
      en: "Mercury",
      ja: "水星",
      zh: "水星",
      fr: "Mercure",
      es: "Mercurio",
    },
    fact: {
      ko: "태양과 가장 가깝고 일교차가 600도에 달하는 암석 행성입니다.",
      en: "Closest terrestrial planet to the Sun with 600°C temperature swing.",
      ja: "太陽に最も近く、昼夜の寒暖差が600度に達する岩石惑星です。",
      zh: "距离太阳最近且昼夜温差达600度的岩石行星。",
      fr: "Planète la plus proche du Soleil avec des écarts de 600 °C.",
      es: "Planeta más cercano al Sol con oscilaciones de 600 °C.",
    },
  },
  {
    id: 3,
    radius: 40,
    color: "#ef4444",
    glow: "#fca5a5",
    coreColor: "#b91c1c",
    score: 16,
    name: {
      ko: "화성",
      en: "Mars",
      ja: "火星",
      zh: "火星",
      fr: "Mars",
      es: "Marte",
    },
    fact: {
      ko: "산화철 먼지로 뒤덮인 붉은 행성이며 태양계 최고봉 올림푸스산이 있습니다.",
      en: "The Red Planet coated in iron oxide, hosting Mount Olympus.",
      ja: "酸化鉄に覆われた赤い惑星で、太陽系最大のオリンポス山が存在します。",
      zh: "覆盖着氧化铁红壤的红色行星，拥有太阳系最高峰奥林匹斯山。",
      fr: "La planète rouge riche en oxyde de fer, abritant le mont Olympe.",
      es: "El planeta rojo de óxido de hierro, hogar del Monte Olimpo.",
    },
  },
  {
    id: 4,
    radius: 50,
    color: "#fbbf24",
    glow: "#fef08a",
    coreColor: "#d97706",
    score: 32,
    name: {
      ko: "금성",
      en: "Venus",
      ja: "金星",
      zh: "金星",
      fr: "Vénus",
      es: "Venus",
    },
    fact: {
      ko: "농밀한 이산화탄소 대기로 인해 표면 온도가 470도에 달합니다.",
      en: "Hottest planet in the solar system trapped in dense CO2 greenhouse.",
      ja: "濃密な二酸化炭素の大気により地表温度が470度に達する灼熱の惑星です。",
      zh: "浓密二氧化碳引发剧烈温室效应，地表温度高达470度。",
      fr: "Planète la plus chaude avec un effet de serre à 470 °C.",
      es: "Planeta más cálido con efecto invernadero que alcanza 470 °C.",
    },
  },
  {
    id: 5,
    radius: 62,
    color: "#2563eb",
    glow: "#93c5fd",
    coreColor: "#1d4ed8",
    score: 64,
    name: {
      ko: "지구",
      en: "Earth",
      ja: "地球",
      zh: "地球",
      fr: "Terre",
      es: "Tierra",
    },
    fact: {
      ko: "액체 상태의 물과 생명체가 번영하는 기적의 푸른 행성입니다.",
      en: "The blue marble harboring liquid oceans and diverse life forms.",
      ja: "液体の水と多様な生命が息づく奇跡の青いオアシスです。",
      zh: "拥有液态水与蓬勃生机的蔚蓝生命摇篮。",
      fr: "La bille bleue abritant des océans liquides et la vie.",
      es: "La canica azul que alberga océanos líquidos y vida abundante.",
    },
  },
  {
    id: 6,
    radius: 75,
    color: "#4f46e5",
    glow: "#a5b4fc",
    coreColor: "#3730a3",
    score: 128,
    name: {
      ko: "해왕성",
      en: "Neptune",
      ja: "海王星",
      zh: "海王星",
      fr: "Neptune",
      es: "Neptuno",
    },
    fact: {
      ko: "시속 2,100km의 초음속 폭풍이 몰아치는 푸른 얼음 거인입니다.",
      en: "Ice giant featuring supersonic storms raging up to 2,100 km/h.",
      ja: "時速2,100kmの超音速暴風が吹き荒れる紺碧の氷巨星です。",
      zh: "狂风时速达2,100公里的超音速蔚蓝冰巨行星。",
      fr: "Géante de glace balayée par des vents supersoniques de 2 100 km/h.",
      es: "Gigante helado azotado por vientos supersónicos de 2.100 km/h.",
    },
  },
  {
    id: 7,
    radius: 89,
    color: "#059669",
    glow: "#6ee7b7",
    coreColor: "#047857",
    score: 256,
    name: {
      ko: "천왕성",
      en: "Uranus",
      ja: "天王星",
      zh: "天王星",
      fr: "Uranus",
      es: "Urano",
    },
    fact: {
      ko: "자전축이 98도 기울어져 옆으로 구르듯 공전하는 행성입니다.",
      en: "Tilted at 98 degrees, rolling on its side around the Sun.",
      ja: "自転軸が98度傾き、横倒しになって公転する特異な天体です。",
      zh: "自转轴倾斜达98度、仿佛躺在轨道上滚动的冰巨星。",
      fr: "Inclinée à 98 degrés, elle tourne sur son flanc autour du Soleil.",
      es: "Inclinada a 98 grados, viaja de lado a lo largo de su órbita.",
    },
  },
  {
    id: 8,
    radius: 104,
    color: "#d97706",
    glow: "#fde68a",
    coreColor: "#92400e",
    score: 512,
    hasRing: true,
    name: {
      ko: "토성",
      en: "Saturn",
      ja: "土星",
      zh: "土星",
      fr: "Saturne",
      es: "Saturno",
    },
    fact: {
      ko: "얼음과 암석으로 이루어진 경이로운 고리계를 지닌 가스 거인입니다.",
      en: "The ringed jewel composed of dazzling ice particles and dust.",
      ja: "氷と岩石の粒子からなる壮麗な環を持つ太陽系の宝石です。",
      zh: "拥有由亿万冰晶碎砾构成的绚丽光环系统的气态巨星。",
      fr: "Le joyau annelé du système solaire composé de glace et de roche.",
      es: "La joya anillada del sistema solar formada por hielo y polvo.",
    },
  },
  {
    id: 9,
    radius: 120,
    color: "#ea580c",
    glow: "#fed7aa",
    coreColor: "#c2410c",
    score: 1024,
    name: {
      ko: "목성",
      en: "Jupiter",
      ja: "木星",
      zh: "木星",
      fr: "Jupiter",
      es: "Júpiter",
    },
    fact: {
      ko: "지구 1,300개가 들어갈 만큼 거대한 태양계 행성의 제왕입니다.",
      en: "King of planets with massive gravity capable of holding 1,300 Earths.",
      ja: "地球1,300個が収まる質量を誇る太陽系最大の惑星の王者です。",
      zh: "体积足以容纳1,300个地球的太阳系气态巨行星之王。",
      fr: "Le roi des planètes pouvant contenir 1 300 fois la Terre.",
      es: "El rey de los planetas, con volumen para albergar 1.300 Tierras.",
    },
  },
  {
    id: 10,
    radius: 140,
    color: "#e11d48",
    glow: "#fef08a",
    coreColor: "#9f1239",
    score: 2048,
    isStar: true,
    name: {
      ko: "태양",
      en: "Sun",
      ja: "太陽",
      zh: "太阳",
      fr: "Soleil",
      es: "Sol",
    },
    fact: {
      ko: "태양계 총 질량의 99.86%를 차지하며 빛과 열을 뿜는 항성입니다.",
      en: "The G-type stellar engine holding 99.86% of the solar system's mass.",
      ja: "太陽系全質量の99.86%を占め、光と熱を放ち続ける偉大な恒星です。",
      zh: "占据太阳系总质量99.86%的伟大恒星，万物生命的光热源泉。",
      fr: "Moteur stellaire concentrant 99,86 % de la masse du système.",
      es: "La estrella que concentra el 99,86 % de la masa del sistema solar.",
    },
  },
] as const;

export const MAX_TIER_INDEX = COSMIC_TIERS.length - 1;

/**
 * Returns a random drop tier between 0 and 3 (only small to medium celestial bodies can drop).
 */
export function getNextDropTier(rng: () => number = Math.random): number {
  const r = rng();
  if (r < 0.40) return 0; // 40% Tier 0 (Asteroid)
  if (r < 0.70) return 1; // 30% Tier 1 (Moon)
  if (r < 0.90) return 2; // 20% Tier 2 (Mercury)
  return 3;               // 10% Tier 3 (Mars)
}

/**
 * Checks whether two celestial bodies of the given tiers can merge.
 */
export function canMergeTiers(tierA: number, tierB: number): boolean {
  return tierA === tierB && tierA < MAX_TIER_INDEX;
}

/**
 * Computes the result of merging two bodies of the same tier.
 */
export function computeMergeResult(tier: number): { nextTier: number; addedScore: number } | null {
  if (tier >= MAX_TIER_INDEX) {
    return null;
  }
  const nextTier = tier + 1;
  const addedScore = COSMIC_TIERS[nextTier].score;
  return { nextTier, addedScore };
}

/**
 * Clamps the dropper X coordinate within the container walls taking body radius into account.
 */
export function clampDropperX(x: number, radius: number): number {
  const minX = 20 + radius;
  const maxX = ARENA_WIDTH - 20 - radius;
  return Math.max(minX, Math.min(maxX, x));
}
