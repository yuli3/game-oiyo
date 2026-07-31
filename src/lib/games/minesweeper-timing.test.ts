import { describe, expect, it } from "vitest";
import { displayedGameSeconds, elapsedGameMilliseconds, recordedGameSeconds, restoredElapsedMilliseconds } from "./minesweeper-timing";

describe("minesweeper timing", () => {
  it("does not start before the first valid move", () => {
    expect(elapsedGameMilliseconds(null, 10_000)).toBe(0);
    expect(displayedGameSeconds(null, 10_000)).toBe(0);
  });

  it("derives display and records from real elapsed time", () => {
    expect(displayedGameSeconds(1_000, 2_999)).toBe(1);
    expect(recordedGameSeconds(1_000, 2_999)).toBe(2);
    expect(recordedGameSeconds(1_000, 1_001)).toBe(1);
  });

  it("continues elapsed wall-clock time while an active game is closed", () => {
    expect(restoredElapsedMilliseconds(12_000, 100_000, 105_500)).toBe(17_500);
    expect(restoredElapsedMilliseconds(12_000, 105_000, 100_000)).toBe(12_000);
    expect(restoredElapsedMilliseconds(Number.NaN, 0, 0)).toBe(0);
  });
});
