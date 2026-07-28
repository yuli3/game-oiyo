import { describe, expect, it } from "vitest";
import { applyConnectFourAction, createConnectFourState } from "../src/connect-four-authority";

describe("connect four room authority", () => {
  it("assigns marks to the first two seats in join order and alternates turns", () => {
    let state = createConnectFourState();
    state = applyConnectFourAction(state, { col: 0 }, "seat-1")!;
    expect(state.seatMark["seat-1"]).toBe(1);
    expect(state.turn).toBe(2);
    state = applyConnectFourAction(state, { col: 1 }, "seat-2")!;
    expect(state.seatMark["seat-2"]).toBe(2);
    expect(state.turn).toBe(1);
  });

  it("rejects a move from the seat that isn't up", () => {
    let state = createConnectFourState();
    state = applyConnectFourAction(state, { col: 0 }, "seat-1")!;
    expect(applyConnectFourAction(state, { col: 1 }, "seat-1")).toBeNull();
  });

  it("rejects a third seat trying to play (spectator, no assigned mark)", () => {
    let state = createConnectFourState();
    state = applyConnectFourAction(state, { col: 0 }, "seat-1")!;
    state = applyConnectFourAction(state, { col: 1 }, "seat-2")!;
    expect(applyConnectFourAction(state, { col: 2 }, "seat-3")).toBeNull();
  });

  it("rejects an out-of-range or full column", () => {
    let state = createConnectFourState();
    expect(applyConnectFourAction(state, { col: 7 }, "seat-1")).toBeNull();
    expect(applyConnectFourAction(state, { col: -1 }, "seat-1")).toBeNull();
    // fill column 0 to the top (6 drops) alternating seats
    for (let i = 0; i < 6; i++) {
      state = applyConnectFourAction(state, { col: 0 }, i % 2 === 0 ? "seat-1" : "seat-2")!;
      expect(state).not.toBeNull();
    }
    const turnSeat = state.turn === 1 ? "seat-1" : "seat-2";
    expect(applyConnectFourAction(state, { col: 0 }, turnSeat)).toBeNull();
  });

  it("detects a horizontal win and freezes the game", () => {
    let state = createConnectFourState();
    // seat-1 (mark 1) drops in cols 0,1,2,3 with seat-2 (mark 2) interleaving elsewhere
    state = applyConnectFourAction(state, { col: 0 }, "seat-1")!;
    state = applyConnectFourAction(state, { col: 0 }, "seat-2")!;
    state = applyConnectFourAction(state, { col: 1 }, "seat-1")!;
    state = applyConnectFourAction(state, { col: 1 }, "seat-2")!;
    state = applyConnectFourAction(state, { col: 2 }, "seat-1")!;
    state = applyConnectFourAction(state, { col: 2 }, "seat-2")!;
    state = applyConnectFourAction(state, { col: 3 }, "seat-1")!;
    expect(state.winner).toBe(1);
    // no further moves accepted once there's a winner
    expect(applyConnectFourAction(state, { col: 4 }, "seat-2")).toBeNull();
  });
});
