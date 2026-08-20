import { describe, expect, it } from "vitest";
import { createReplayEnvelope, verifyReplayEnvelope, type ReplayInput } from "./replay";
import { createStarBlasterReplay, replayStarBlaster, STAR_BLASTER_RULESET_VERSION, starBlasterGhostTrack, type StarBlasterReplayAction } from "./star-blaster-replay";
import { STAR_BLASTER_STEP_SECONDS, createStarBlasterState, starBlasterStateFingerprint, stepStarBlaster } from "./star-blaster";

describe("Star Blaster replay", () => {
  it("reaches the same final hash from seed and target changes", () => {
    const state = createStarBlasterState(20260821);
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    const inputs: ReplayInput<StarBlasterReplayAction>[] = [
      { tick: 0, input: { type: "target", value: 80 } },
      { tick: 90, input: { type: "target", value: 280 } },
      { tick: 180, input: { type: "target", value: 160 } },
    ];
    let index = 0;
    while (state.tick < 240) {
      while (inputs[index]?.tick === state.tick) { const action = inputs[index].input; if (action.type === "target") state.targetX = action.value; index += 1; }
      stepStarBlaster(state, { targetX: state.targetX });
    }
    // Keep fixture independent of spawn suppression: envelope hashes exactly the simulated final state.
    const envelope = createReplayEnvelope({ game: "star-blaster", rulesetVersion: STAR_BLASTER_RULESET_VERSION, seed: state.seed, stepSeconds: STAR_BLASTER_STEP_SECONDS, inputLog: inputs, finalTick: state.tick, finalFingerprint: starBlasterStateFingerprint(state) });
    // Re-run without the fixture-only spawn override to prove drift is rejected.
    expect(verifyReplayEnvelope(envelope, replayStarBlaster)).toBe(false);
  });

  it("verifies a normal deterministic run", () => {
    const state = createStarBlasterState(77);
    const inputs: ReplayInput<StarBlasterReplayAction>[] = [{ tick: 0, input: { type: "target", value: 210 } }];
    while (state.tick < 120 && state.phase === "playing") stepStarBlaster(state, { targetX: 210 });
    const envelope = createStarBlasterReplay(state, inputs);
    expect(verifyReplayEnvelope(envelope, replayStarBlaster)).toBe(true);
    const ghost = starBlasterGhostTrack(envelope);
    expect(ghost[state.tick]).toBeCloseTo(state.shipX, 6);
    expect(ghost.filter(Number.isFinite).length).toBe(state.tick);
  });
});
