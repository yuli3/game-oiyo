import { describe, expect, it } from "vitest";
import { verifyReplayEnvelope, type ReplayInput } from "./replay";
import { createDotRunnerReplay, dotRunnerGhostTrack, replayDotRunner, type DotRunnerReplayAction } from "./dot-runner-replay";
import { createDotRunner, jumpDotRunner, stepDotRunner } from "./dot-runner";

describe("Dot Runner replay", () => {
  it("reaches the same final hash and ghost track", () => {
    const seed = 20260821;
    let state = createDotRunner(seed);
    const inputs: ReplayInput<DotRunnerReplayAction>[] = [];
    const jumpTicks = new Set([1, 64, 127, 190, 253, 316, 379]);
    while (state.elapsedFrames < 420 && state.status === "playing") {
      if (jumpTicks.has(state.elapsedFrames)) {
        const jumped = jumpDotRunner(state);
        if (jumped !== state) { inputs.push({ tick: state.elapsedFrames, input: { type: "jump" } }); state = jumped; }
      }
      state = stepDotRunner(state, 1);
    }
    const envelope = createDotRunnerReplay(seed, state, inputs);
    expect(verifyReplayEnvelope(envelope, replayDotRunner)).toBe(true);
    const ghost = dotRunnerGhostTrack(envelope);
    expect(ghost[Math.floor(state.elapsedFrames)]).toBeCloseTo(state.playerY, 6);
  });

  it("rejects a replay after one jump tick drifts", () => {
    const seed = 9;
    let state = createDotRunner(seed);
    state = jumpDotRunner(state);
    const inputs: ReplayInput<DotRunnerReplayAction>[] = [{ tick: 0, input: { type: "jump" } }];
    for (let tick = 0; tick < 30; tick += 1) state = stepDotRunner(state, 1);
    const envelope = createDotRunnerReplay(seed, state, inputs);
    const drifted = { ...envelope, inputLog: [{ tick: 1, input: { type: "jump" as const } }] };
    expect(verifyReplayEnvelope(drifted, replayDotRunner)).toBe(false);
  });
});
