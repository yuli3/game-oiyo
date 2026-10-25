/**
 * @file accessibility.ts
 * @description Pillar 3: Universal Accessibility & Colorblind (색약) Engine.
 * Provides accessible symbols, high-contrast themes, and Deuteranopia/Tritanopia adjustments
 * for color-matching and block-placement games.
 */

export type ColorblindMode = "none" | "deuteranopia" | "tritanopia" | "high-contrast";

const STORAGE_KEY = "oiyo_colorblind_mode";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return null;
}

export function getColorblindMode(): ColorblindMode {
  const storage = getStorage();
  if (!storage) return "none";
  try {
    const val = storage.getItem(STORAGE_KEY) as ColorblindMode | null;
    if (val && ["none", "deuteranopia", "tritanopia", "high-contrast"].includes(val)) {
      return val;
    }
  } catch {}
  return "none";
}

export function setColorblindMode(mode: ColorblindMode): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, mode);
  } catch {}
}

/**
 * Universal shape symbols assigned to distinct color indices
 * so colorblind players can distinguish pieces purely by icon shape.
 */
export const ACCESSIBLE_SYMBOLS = ["▲", "●", "■", "★", "◆", "✚", "✦", "▼"] as const;

export function getColorblindSymbol(colorIndex: number): string {
  const idx = Math.abs(colorIndex) % ACCESSIBLE_SYMBOLS.length;
  return ACCESSIBLE_SYMBOLS[idx] ?? "●";
}

/**
 * Optimized accessible color mappings for Deuteranopia (Red-Green) and Tritanopia (Blue-Yellow).
 */
export const ACCESSIBLE_PALETTES: Record<ColorblindMode, Record<string, string>> = {
  none: {},
  deuteranopia: {
    red: "#0072b2", // Blue substitute
    green: "#e69f00", // Amber substitute
    orange: "#d55e00",
    yellow: "#f0e442",
    blue: "#56b4e9",
    purple: "#cc79a7",
  },
  tritanopia: {
    red: "#d55e00",
    green: "#009e73",
    blue: "#0072b2",
    yellow: "#e69f00",
  },
  "high-contrast": {
    red: "#ff2222",
    green: "#00ff66",
    blue: "#00ccff",
    yellow: "#ffff00",
    purple: "#ff00ff",
  },
};
