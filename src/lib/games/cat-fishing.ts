/**
 * Cat Fishing's deterministic fish spawn/movement/catch rules.
 *
 * Movement is authored in `frameScale` units (one unit == one 60Hz frame's
 * worth of motion, see `time-contracts.ts`) rather than a fixed per-call
 * constant, so a fish's real-world speed and turn frequency stay the same on
 * a 60Hz and a 120Hz display instead of doubling with the refresh rate.
 */

import { mulberry32 } from "./daily";

export type Difficulty = "normal" | "hard" | "hell";

export interface FishState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  caught: boolean;
}

export interface Config {
  fishCount: number;
  baseSpeed: number;
  turnChance: number;
  escapeDistance: number;
}

export interface PointerPosition {
  x: number;
  y: number;
}

export const CONFIGS: Record<Difficulty, Config> = {
  normal: { fishCount: 5, baseSpeed: 1.6, turnChance: 0.02, escapeDistance: 0 },
  hard: { fishCount: 7, baseSpeed: 2.4, turnChance: 0.03, escapeDistance: 22 },
  hell: { fishCount: 10, baseSpeed: 3.2, turnChance: 0.04, escapeDistance: 30 },
};

/** Positions and headings in % of the play area (0..100). */
export function createFish(count: number, speed: number, random: () => number = Math.random): FishState[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = random() * Math.PI * 2;
    return {
      id,
      x: 10 + random() * 80,
      y: 10 + random() * 80,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      caught: false,
    };
  });
}

export function createFishFromSeed(count: number, speed: number, seed: number): FishState[] {
  return createFish(count, speed, mulberry32(seed));
}

/** One physics step for a single fish; a caught fish is returned unchanged. */
export function stepFish(
  fish: FishState,
  config: Config,
  pointer: PointerPosition,
  deltaScale: number,
  random: () => number = Math.random,
): FishState {
  if (fish.caught) return fish;
  let { x, y, vx, vy } = fish;

  if (config.escapeDistance > 0) {
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < config.escapeDistance) {
      const m = ((config.escapeDistance - dist) / config.escapeDistance) * 0.9;
      vx += (dx / dist) * m;
      vy += (dy / dist) * m;
    }
  }

  const speed = Math.hypot(vx, vy);
  if (speed > config.baseSpeed) {
    vx = (vx / speed) * config.baseSpeed;
    vy = (vy / speed) * config.baseSpeed;
  }
  // Scaled by deltaScale so a fish turns just as often per real second
  // regardless of the display's refresh rate, not just as often per frame.
  if (random() < config.turnChance * deltaScale) {
    const angle = random() * Math.PI * 2;
    vx = Math.cos(angle) * config.baseSpeed;
    vy = Math.sin(angle) * config.baseSpeed;
  }

  x += vx * 0.4 * deltaScale;
  y += vy * 0.4 * deltaScale;
  if (x < 2 || x > 94) {
    vx *= -1;
    x = Math.max(2, Math.min(94, x));
  }
  if (y < 2 || y > 92) {
    vy *= -1;
    y = Math.max(2, Math.min(92, y));
  }
  return { ...fish, x, y, vx, vy };
}

export function catchFish(fish: readonly FishState[], id: number): FishState[] {
  return fish.map((f) => (f.id === id ? { ...f, caught: true } : f));
}

export function allCaught(fish: readonly FishState[]): boolean {
  return fish.every((f) => f.caught);
}

export function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
