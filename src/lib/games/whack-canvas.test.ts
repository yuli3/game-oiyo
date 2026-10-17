/**
 * Unit tests for Whack-a-Mole Canvas Engine
 * Date: 2026-10-17
 */

import { describe, expect, it } from "vitest";
import {
  createFloatingScore,
  createWhackParticles,
  createWhackShockwave,
  getHoleCenter,
  getHoleIndexFromPoint,
  updateWhackFloatingScores,
  updateWhackParticles,
  updateWhackShockwaves,
} from "./whack-canvas";

describe("whack-canvas engine", () => {
  it("maps touch coordinates accurately to 3x3 hole indices", () => {
    const W = 300;
    const H = 300;

    // Top-left center (hole 0)
    const hole0 = getHoleCenter(0, W, H);
    expect(getHoleIndexFromPoint(hole0.x, hole0.y, W, H)).toBe(0);

    // Center hole (hole 4)
    const hole4 = getHoleCenter(4, W, H);
    expect(getHoleIndexFromPoint(hole4.x, hole4.y, W, H)).toBe(4);

    // Bottom-right center (hole 8)
    const hole8 = getHoleCenter(8, W, H);
    expect(getHoleIndexFromPoint(hole8.x, hole8.y, W, H)).toBe(8);

    // Out of bounds padding returns null
    expect(getHoleIndexFromPoint(2, 2, W, H)).toBeNull();
    expect(getHoleIndexFromPoint(298, 298, W, H)).toBeNull();
  });

  it("calculates hole centers and radii deterministically", () => {
    const W = 300;
    const H = 300;
    const c0 = getHoleCenter(0, W, H);
    const c1 = getHoleCenter(1, W, H);

    expect(c0.y).toBeCloseTo(c1.y);
    expect(c1.x).toBeGreaterThan(c0.x);
    expect(c0.radius).toBeGreaterThan(20);
  });

  it("creates and decays particles with drag", () => {
    const moleParticles = createWhackParticles(150, 150, "mole", 15);
    expect(moleParticles).toHaveLength(15);
    expect(moleParticles[0].alpha).toBe(1);

    const updated = updateWhackParticles(moleParticles, 50);
    expect(updated).toHaveLength(15);
    expect(updated[0].life).toBeLessThan(moleParticles[0].maxLife);
    expect(updated[0].alpha).toBeLessThan(1);

    const expired = updateWhackParticles(updated, 3000);
    expect(expired).toHaveLength(0);
  });

  it("creates and decays shockwaves", () => {
    const wave = createWhackShockwave(100, 100, "mole");
    expect(wave.radius).toBe(8);
    expect(wave.alpha).toBeCloseTo(0.9);

    const updated = updateWhackShockwaves([wave], 100);
    expect(updated).toHaveLength(1);
    expect(updated[0].radius).toBeGreaterThan(8);

    const done = updateWhackShockwaves(updated, 2000);
    expect(done).toHaveLength(0);
  });

  it("animates floating scores upward and fades out", () => {
    const score = createFloatingScore(150, 150, "+10", "#38bdf8");
    expect(score.y).toBe(150);

    const updated = updateWhackFloatingScores([score], 100);
    expect(updated).toHaveLength(1);
    expect(updated[0].y).toBeLessThan(150); // Moved upward

    const expired = updateWhackFloatingScores(updated, 1000);
    expect(expired).toHaveLength(0);
  });
});
