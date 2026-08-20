import { describe, expect, it } from "vitest";
import { verifyReplayEnvelope, type ReplayInput } from "./replay";
import { createGame2048Replay, game2048GhostBoards, replayGame2048, type Game2048ReplayAction } from "./game-2048-replay";
import { createGame2048, moveGame2048, type Game2048Direction } from "./game-2048";

describe("2048 replay", () => {
  it("replays valid moves to the same final hash and boards", () => {
    const seed = 2048;
    let state = createGame2048(seed);
    const inputLog: ReplayInput<Game2048ReplayAction>[] = [];
    const directions: Game2048Direction[] = ["left", "down", "right", "up", "left", "down", "right", "up"];
    for (const direction of directions) {
      const next = moveGame2048(state, direction);
      if (next === state) continue;
      inputLog.push({ tick: state.moves, input: { type: "move", direction } });
      state = next;
    }
    const envelope = createGame2048Replay(seed, state, inputLog);
    expect(verifyReplayEnvelope(envelope, replayGame2048)).toBe(true);
    expect(game2048GhostBoards(envelope)[state.moves]).toEqual(state.board);
  });

  it("rejects no-op and shifted move logs", () => {
    const seed = 7;
    let state = createGame2048(seed);
    const directions: Game2048Direction[] = ["left", "left", "down"];
    const inputs: ReplayInput<Game2048ReplayAction>[] = [];
    for (const direction of directions) {
      const next = moveGame2048(state, direction);
      if (next !== state) { inputs.push({ tick: state.moves, input: { type: "move", direction } }); state = next; }
    }
    const envelope = createGame2048Replay(seed, state, inputs);
    const shifted = { ...envelope, inputLog: envelope.inputLog.map((entry, index) => index ? entry : { ...entry, tick: entry.tick + 1 }) };
    expect(() => replayGame2048(shifted)).toThrow();
  });
});
