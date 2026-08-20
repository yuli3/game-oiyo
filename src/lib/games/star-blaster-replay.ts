import {
  STAR_BLASTER_STEP_SECONDS,
  chooseStarBlasterUpgrade,
  createStarBlasterState,
  starBlasterStateFingerprint,
  stepStarBlaster,
  type StarBlasterState,
  type StarBlasterUpgradeId,
} from "./star-blaster";
import { createReplayEnvelope, type ReplayEnvelope, type ReplayInput } from "./replay";

export const STAR_BLASTER_RULESET_VERSION = "star-blaster-2026-08-21";
export type StarBlasterReplayAction =
  | { type: "target"; value: number }
  | { type: "upgrade"; value: StarBlasterUpgradeId };

export function createStarBlasterReplay(state: StarBlasterState, inputLog: ReplayInput<StarBlasterReplayAction>[]) {
  return createReplayEnvelope({
    game: "star-blaster",
    rulesetVersion: STAR_BLASTER_RULESET_VERSION,
    seed: state.seed,
    stepSeconds: STAR_BLASTER_STEP_SECONDS,
    inputLog,
    finalTick: state.tick,
    finalFingerprint: starBlasterStateFingerprint(state),
  });
}

function simulateStarBlaster(envelope: ReplayEnvelope<StarBlasterReplayAction>, onStep?: (state: StarBlasterState) => void): StarBlasterState {
  const state = createStarBlasterState(envelope.seed);
  let inputIndex = 0;
  while (state.tick < envelope.finalTick) {
    while (inputIndex < envelope.inputLog.length && envelope.inputLog[inputIndex].tick === state.tick) {
      const action = envelope.inputLog[inputIndex].input;
      if (action.type === "target" && Number.isFinite(action.value)) state.targetX = action.value;
      if (action.type === "upgrade") chooseStarBlasterUpgrade(state, action.value);
      inputIndex += 1;
    }
    if (state.phase === "upgrade") throw new Error("replay is missing an upgrade choice");
    stepStarBlaster(state, { targetX: state.targetX });
    onStep?.(state);
  }
  return state;
}

export function replayStarBlaster(envelope: ReplayEnvelope<StarBlasterReplayAction>): string {
  return starBlasterStateFingerprint(simulateStarBlaster(envelope));
}

export function starBlasterGhostTrack(envelope: ReplayEnvelope<StarBlasterReplayAction>): number[] {
  const track: number[] = [];
  simulateStarBlaster(envelope, state => { track[state.tick] = state.shipX; });
  return track;
}
