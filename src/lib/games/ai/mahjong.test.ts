import { describe, expect, it } from "vitest";
import { isTenpai, nextRonCandidate, ronCandidatesInSeatOrder } from "./mahjong";

// Waiting on 6m: 123m 123p 123s EEE 66m.
const waitingOnSixMan = [0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 5];
const notWaiting = new Array(13).fill(0);

describe("mahjong ron candidates", () => {
  it("does not report a wait that requires drawing a fifth copy", () => {
    const impossibleFifthCopyWait = [0, 0, 0, 0, 12, 13, 14, 24, 25, 26, 27, 27, 27];
    expect(isTenpai(impossibleFifthCopyWait)).toBe(false);
  });

  it("returns all winners in seat order after the discarder", () => {
    const hands = [waitingOnSixMan, notWaiting, waitingOnSixMan, waitingOnSixMan];
    expect(ronCandidatesInSeatOrder(hands, 1, 5)).toEqual([2, 3, 0]);
  });

  it("continues to the next winning seat after a human pass", () => {
    const candidates = [0, 2, 3];
    expect(nextRonCandidate(candidates)).toBe(0);
    expect(nextRonCandidate(candidates, [0])).toBe(2);
    expect(nextRonCandidate(candidates, [0, 2, 3])).toBeNull();
  });
});
