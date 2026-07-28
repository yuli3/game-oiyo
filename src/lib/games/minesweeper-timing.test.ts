import { describe, expect, it } from "vitest";
import { displayedGameSeconds, elapsedGameMilliseconds, recordedGameSeconds } from "./minesweeper-timing";

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
});
