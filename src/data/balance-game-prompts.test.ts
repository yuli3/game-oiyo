import { describe, expect, it } from "vitest";
import { BALANCE_GAME_PROMPTS } from "./balance-game-prompts";

describe("balance game prompts", () => {
  it("has exactly 68 prompts", () => {
    expect(BALANCE_GAME_PROMPTS).toHaveLength(68);
  });

  it("has unique ids", () => {
    const ids = BALANCE_GAME_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has non-empty, distinct a/b choices for every prompt", () => {
    for (const prompt of BALANCE_GAME_PROMPTS) {
      expect(prompt.a.trim().length).toBeGreaterThan(0);
      expect(prompt.b.trim().length).toBeGreaterThan(0);
      expect(prompt.a).not.toBe(prompt.b);
    }
  });
});
