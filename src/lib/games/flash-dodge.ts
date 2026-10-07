// Flash-dodge drill for the aim trainer ("삥 피하기": turn away before a flash pops, then turn
// back and shoot). Only the horizontal view angle (yaw) is modelled. The numbers are practice
// settings chosen for this drill; they are not the timings of any game's abilities.

import type { AimDifficulty } from "./aim-trainer";

export const FLASH_FOV_DEG = 100;
/** Looking within this angle of the flash when it pops blinds fully. */
export const FLASH_FULL_BLIND_DEG = 45;
/** Looking at least this far away when it pops avoids the flash entirely. */
export const FLASH_SAFE_DEG = 100;
/** How long a full blind takes to clear. Partial blinds clear proportionally faster. */
export const FLASH_BLIND_MS = 1800;
/** A round with no hit this long after the pop counts as a miss. */
export const FLASH_ROUND_TIMEOUT_MS = 3000;

export const FLASH_FUSE_MS: Record<AimDifficulty, number> = {
  easy: 700,
  normal: 550,
  hard: 430,
  expert: 340,
};

export const FLASH_TARGET_RADIUS_DEG: Record<AimDifficulty, number> = {
  easy: 5.5,
  normal: 4.2,
  hard: 3.2,
  expert: 2.5,
};

export const FLASH_SENS_MIN = 0.03;
export const FLASH_SENS_MAX = 0.6;
export const FLASH_SENS_DEFAULT = 0.14; // degrees of yaw per pixel of mouse travel

export function clampFlashSens(value: number): number {
  if (!Number.isFinite(value)) return FLASH_SENS_DEFAULT;
  return Math.min(FLASH_SENS_MAX, Math.max(FLASH_SENS_MIN, value));
}

/** Signed shortest angle from `from` to `to`, in (-180, 180]. */
export function angleDiff(to: number, from: number): number {
  const diff = (((to - from) % 360) + 540) % 360 - 180;
  return diff === -180 ? 180 : diff;
}

/** 0 = saw nothing, 1 = fully blinded. Linear between the two thresholds. */
export function flashBlindness(viewYaw: number, flashYaw: number): number {
  const away = Math.abs(angleDiff(viewYaw, flashYaw));
  if (away <= FLASH_FULL_BLIND_DEG) return 1;
  if (away >= FLASH_SAFE_DEG) return 0;
  return 1 - (away - FLASH_FULL_BLIND_DEG) / (FLASH_SAFE_DEG - FLASH_FULL_BLIND_DEG);
}

/** Remaining whiteness `elapsedMs` after a pop that blinded by `blindness`. */
export function flashWhiteness(blindness: number, elapsedMs: number): number {
  if (blindness <= 0) return 0;
  if (elapsedMs <= 0) return blindness;
  const total = FLASH_BLIND_MS * blindness;
  if (elapsedMs >= total) return 0;
  return blindness * (1 - elapsedMs / total);
}

export interface FlashRound {
  /** Quiet time before the flash is thrown. */
  delayMs: number;
  /** Where the flash pops, relative to the doorway at yaw 0. Always inside the starting view. */
  flashYaw: number;
}

export function nextFlashRound(random: () => number = Math.random): FlashRound {
  const side = random() < 0.5 ? -1 : 1;
  return {
    delayMs: Math.round(700 + random() * 700),
    flashYaw: side * Math.round(14 + random() * 22),
  };
}

/** The target stands in the doorway at yaw 0. */
export function isOnFlashTarget(viewYaw: number, difficulty: AimDifficulty): boolean {
  return Math.abs(angleDiff(viewYaw, 0)) <= FLASH_TARGET_RADIUS_DEG[difficulty];
}

/** Horizontal pixel of something at `objectYaw`, or null when it is outside the view. */
export function yawToScreenX(objectYaw: number, viewYaw: number, width: number, marginDeg = 0): number | null {
  const offset = angleDiff(objectYaw, viewYaw);
  const half = FLASH_FOV_DEG / 2;
  if (Math.abs(offset) > half + marginDeg) return null;
  return width / 2 + (offset / half) * (width / 2);
}

export function degreesToPixels(degrees: number, width: number): number {
  return (degrees / (FLASH_FOV_DEG / 2)) * (width / 2);
}
