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
