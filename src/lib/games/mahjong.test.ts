import { describe, expect, it } from "vitest";
import {
  claimHumanRon,
  claimHumanTsumo,
  createMahjong,
  discardMahjong,
  discardMahjongAi,
  drawMahjong,
  mahjongCpuReview,
  passHumanRon,
  type MahjongState,
} from "./mahjong";

const waiting = [0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 5];

describe("mahjong match engine", () => {
  it("reviews the AI discard without changing state", () => {
    let state = createMahjong(21);
    for (let step = 0; step < 8 && !(state.phase === "discard" && state.turn !== 0); step += 1) {
      if (state.phase === "draw") state = drawMahjong(state);
      else if (state.phase === "discard" && state.turn === 0) state = discardMahjong(state, state.hands[0].length - 1);
      else if (state.phase === "ron") state = passHumanRon(state);
    }
    expect(state.phase).toBe("discard");
    expect(state.turn).not.toBe(0);
    const before = structuredClone(state);
    expect(mahjongCpuReview(state, 3)).toMatchObject({ tile: expect.any(Number), reason: expect.stringMatching(/variation|tenpai|shanten|disposable/) });
    expect(state).toEqual(before);
  });

  it("deals the same physical wall and hands for the same seed", () => {
    const first = createMahjong(0x12345678);
    expect(createMahjong(0x12345678)).toEqual(first);
    expect(first.wall).toHaveLength(136);
    expect(first.hands.every((hand) => hand.length === 13)).toBe(true);
    const counts = new Array(34).fill(0);
    for (const tile of first.wall) counts[tile] += 1;
    expect(counts.every((count) => count === 4)).toBe(true);
  });

  it("replays draws and AI decisions byte-for-byte", () => {
    const replay = () => {
      let state = createMahjong(99);
      for (let step = 0; step < 40 && state.phase !== "over"; step += 1) {
        if (state.phase === "draw") state = drawMahjong(state);
        else if (state.phase === "discard" && state.turn === 0) state = discardMahjong(state, state.hands[0].length - 1);
        else if (state.phase === "discard") state = discardMahjongAi(state, 3);
        else if (state.phase === "ron") state = passHumanRon(state);
      }
      return state;
    };
    expect(replay()).toEqual(replay());
  });

  it("offers human ron first and continues seat priority after pass", () => {
    const base = createMahjong(1);
    const state: MahjongState = { ...base, hands: [waiting, waiting, waiting, [5, ...waiting]], turn: 3, phase: "discard" };
    const offered = discardMahjong(state, 0);
    expect(offered.phase).toBe("ron");
    expect(offered.ronTile).toBe(5);
    expect(claimHumanRon(offered)).toMatchObject({ phase: "over", winner: 0, winType: "ron" });
    expect(passHumanRon(offered)).toMatchObject({ phase: "over", winner: 1, winType: "ron" });
  });

  it("accepts only a real human tsumo", () => {
    const base = createMahjong(2);
    expect(claimHumanTsumo({ ...base, phase: "discard" })).toBeTruthy();
    const winning = [0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 5, 5];
    expect(claimHumanTsumo({ ...base, hands: [winning, ...base.hands.slice(1)], phase: "discard" })).toMatchObject({ phase: "over", winner: 0, winType: "tsumo" });
  });

  it("ends in an exhaustive draw without consuming beyond the wall", () => {
    const base = createMahjong(3);
    const exhausted = drawMahjong({ ...base, wallPos: 136 });
    expect(exhausted).toMatchObject({ phase: "over", winner: -1, winType: null, wallPos: 136 });
    expect(drawMahjong(exhausted)).toBe(exhausted);
  });

  it("rejects illegal phase and tile-index actions immutably", () => {
    const state = createMahjong(4);
    expect(discardMahjong(state, 0)).toBe(state);
    const drawn = drawMahjong(state);
    expect(discardMahjong(drawn, -1)).toBe(drawn);
    expect(discardMahjong(drawn, 99)).toBe(drawn);
  });
});
