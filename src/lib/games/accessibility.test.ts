import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getColorblindMode,
  setColorblindMode,
  getColorblindSymbol,
  ACCESSIBLE_SYMBOLS,
} from "./accessibility";

describe("accessibility module", () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
    });
  });

  it("persists and reads colorblind mode correctly", () => {
    expect(getColorblindMode()).toBe("none");
    setColorblindMode("deuteranopia");
    expect(getColorblindMode()).toBe("deuteranopia");
    setColorblindMode("high-contrast");
    expect(getColorblindMode()).toBe("high-contrast");
  });

  it("returns consistent unique symbols for color indices", () => {
    expect(getColorblindSymbol(0)).toBe(ACCESSIBLE_SYMBOLS[0]);
    expect(getColorblindSymbol(1)).toBe(ACCESSIBLE_SYMBOLS[1]);
    expect(getColorblindSymbol(2)).toBe(ACCESSIBLE_SYMBOLS[2]);
    // Wraparound test
    expect(getColorblindSymbol(ACCESSIBLE_SYMBOLS.length)).toBe(ACCESSIBLE_SYMBOLS[0]);
  });
});
