import { describe, expect, it } from "vitest";
import {
  FLASH_BLIND_MS,
  FLASH_FOV_DEG,
  FLASH_FUSE_MS,
  FLASH_SENS_DEFAULT,
  FLASH_SENS_MAX,
  FLASH_SENS_MIN,
  angleDiff,
  clampFlashSens,
  flashBlindness,
  flashWhiteness,
  isOnFlashTarget,
  nextFlashRound,
  yawToScreenX,
} from "./flash-dodge";

describe("angleDiff", () => {
  it("takes the short way round", () => {
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(350, 10)).toBe(-20);
    expect(angleDiff(180, 0)).toBe(180);
    expect(angleDiff(725, 0)).toBe(5);
    expect(angleDiff(-190, 0)).toBe(170);
  });
});

describe("flashBlindness", () => {
  it("blinds fully when looking at the flash and not at all when turned away", () => {
    expect(flashBlindness(0, 20)).toBe(1);
    expect(flashBlindness(65, 20)).toBe(1);
    expect(flashBlindness(120, 20)).toBe(0);
    expect(flashBlindness(-170, 20)).toBe(0);
  });

  it("scales between the two thresholds", () => {
    const half = flashBlindness(72.5, 0);
    expect(half).toBeCloseTo(0.5, 5);
    expect(flashBlindness(60, 0)).toBeGreaterThan(flashBlindness(90, 0));
  });

  it("treats a full turn as the same direction", () => {
    expect(flashBlindness(360, 0)).toBe(1);
    expect(flashBlindness(540, 0)).toBe(0);
  });
});

describe("flashWhiteness", () => {
  it("fades to nothing and a weaker blind clears sooner", () => {
    expect(flashWhiteness(1, 0)).toBe(1);
    expect(flashWhiteness(1, FLASH_BLIND_MS / 2)).toBeCloseTo(0.5, 5);
    expect(flashWhiteness(1, FLASH_BLIND_MS)).toBe(0);
    expect(flashWhiteness(0.5, FLASH_BLIND_MS / 2)).toBe(0);
    expect(flashWhiteness(0, 10)).toBe(0);
  });
});

describe("nextFlashRound", () => {
  it("throws the flash inside the starting view on either side", () => {
    const sides = new Set<number>();
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let index = 0; index < 200; index += 1) {
      const round = nextFlashRound(random);
      expect(Math.abs(round.flashYaw)).toBeGreaterThanOrEqual(14);
      expect(Math.abs(round.flashYaw)).toBeLessThan(FLASH_FOV_DEG / 2);
      expect(round.delayMs).toBeGreaterThanOrEqual(700);
      expect(round.delayMs).toBeLessThanOrEqual(1400);
      sides.add(Math.sign(round.flashYaw));
    }
    expect(sides.size).toBe(2);
  });
});

describe("target and projection", () => {
  it("accepts a shot only near the doorway and tightens with difficulty", () => {
    expect(isOnFlashTarget(0, "expert")).toBe(true);
    expect(isOnFlashTarget(4, "easy")).toBe(true);
    expect(isOnFlashTarget(4, "expert")).toBe(false);
    expect(isOnFlashTarget(356.5, "normal")).toBe(true);
    expect(isOnFlashTarget(180, "easy")).toBe(false);
  });

  it("projects the view centre to the middle and hides what is behind", () => {
    expect(yawToScreenX(30, 30, 800)).toBe(400);
    expect(yawToScreenX(80, 30, 800)).toBe(800);
    expect(yawToScreenX(-20, 30, 800)).toBe(0);
    expect(yawToScreenX(200, 30, 800)).toBeNull();
    expect(yawToScreenX(85, 30, 800, 10)).not.toBeNull();
  });
});

describe("settings", () => {
  it("gets harder as the fuse shortens", () => {
    expect(FLASH_FUSE_MS.easy).toBeGreaterThan(FLASH_FUSE_MS.normal);
    expect(FLASH_FUSE_MS.normal).toBeGreaterThan(FLASH_FUSE_MS.hard);
    expect(FLASH_FUSE_MS.hard).toBeGreaterThan(FLASH_FUSE_MS.expert);
  });

  it("keeps a stored sensitivity inside the slider range", () => {
    expect(clampFlashSens(99)).toBe(FLASH_SENS_MAX);
    expect(clampFlashSens(0)).toBe(FLASH_SENS_MIN);
    expect(clampFlashSens(Number.NaN)).toBe(FLASH_SENS_DEFAULT);
    expect(clampFlashSens(0.2)).toBe(0.2);
  });
});
