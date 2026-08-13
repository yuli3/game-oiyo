import { describe, expect, it } from "vitest";
import {
  AJAE_KEYS,
  AJAE_MAX_LEN,
  AJAE_MIN_LEN,
  ajaeLimitMs,
  ajaePatternLength,
  isAjaeClear,
  isAjaeKey,
  makeAjaePattern,
} from "./ajae-pattern";

describe("ajaeLimitMs", () => {
  it("gives the shortest pattern four seconds", () => {
    expect(ajaeLimitMs(4)).toBe(4000);
  });

  it("adds half a second per key beyond the shortest", () => {
    expect(ajaeLimitMs(5)).toBe(4500);
    expect(ajaeLimitMs(8)).toBe(6000);
  });

  it("clamps lengths outside the playable range instead of returning nonsense", () => {
    expect(ajaeLimitMs(1)).toBe(ajaeLimitMs(AJAE_MIN_LEN));
    expect(ajaeLimitMs(99)).toBe(ajaeLimitMs(AJAE_MAX_LEN));
  });
});

describe("ajaePatternLength", () => {
  it("stays inside the playable range across the whole random domain", () => {
    for (const r of [0, 0.001, 0.25, 0.5, 0.75, 0.999]) {
      const length = ajaePatternLength(() => r);
      expect(length).toBeGreaterThanOrEqual(AJAE_MIN_LEN);
      expect(length).toBeLessThanOrEqual(AJAE_MAX_LEN);
    }
  });
});

describe("makeAjaePattern", () => {
  it("returns the requested number of playable keys", () => {
    const pattern = makeAjaePattern(6);
    expect(pattern).toHaveLength(6);
    for (const key of pattern) expect(AJAE_KEYS).toContain(key);
  });

  it("allows repeats, which the real mechanic does", () => {
    expect(makeAjaePattern(3, () => 0)).toEqual(["Q", "Q", "Q"]);
  });
});

describe("isAjaeKey", () => {
  it("accepts the eight keys and nothing else", () => {
    for (const key of AJAE_KEYS) expect(isAjaeKey(key)).toBe(true);
    for (const other of ["G", "Z", "1", "Enter", "q"]) expect(isAjaeKey(other)).toBe(false);
  });
});

describe("isAjaeClear", () => {
  it("counts a run that finished inside the budget", () => {
    expect(isAjaeClear(3999, 4)).toBe(true);
    expect(isAjaeClear(4000, 4)).toBe(true);
  });

  it("rejects a run that finished after the budget even by a millisecond", () => {
    expect(isAjaeClear(4001, 4)).toBe(false);
  });

  it("rejects the backgrounded-tab case, where the countdown never fired", () => {
    // A player who switches tabs mid-round comes back and finishes the pattern;
    // rAF was frozen, so nothing timed it out. It is still not a clear.
    expect(isAjaeClear(28_592, 4)).toBe(false);
  });
});
