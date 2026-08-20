import { createReplayEnvelope, type ReplayEnvelope, type ReplayInput } from "./replay";
import { createDotRunner, dotRunnerFingerprint, jumpDotRunner, stepDotRunner, type DotRunnerState } from "./dot-runner";

export const DOT_RUNNER_RULESET_VERSION = "dot-runner-2026-08-21";
export type DotRunnerReplayAction = { type: "jump" };

export function createDotRunnerReplay(seed: number, state: DotRunnerState, inputLog: ReplayInput<DotRunnerReplayAction>[]) {
  return createReplayEnvelope({
    game: "dot-runner",
    rulesetVersion: DOT_RUNNER_RULESET_VERSION,
    seed,
    stepSeconds: 1 / 60,
    inputLog,
    finalTick: Math.floor(state.elapsedFrames),
    finalFingerprint: dotRunnerFingerprint(state),
  });
}

function simulateDotRunner(envelope: ReplayEnvelope<DotRunnerReplayAction>, onStep?: (state: DotRunnerState) => void): DotRunnerState {
  let state = createDotRunner(envelope.seed);
  let inputIndex = 0;
  while (state.elapsedFrames < envelope.finalTick && state.status === "playing") {
    while (inputIndex < envelope.inputLog.length && envelope.inputLog[inputIndex].tick === state.elapsedFrames) {
      if (envelope.inputLog[inputIndex].input.type === "jump") state = jumpDotRunner(state);
      inputIndex += 1;
    }
    state = stepDotRunner(state, 1);
    onStep?.(state);
  }
  return state;
}

export function replayDotRunner(envelope: ReplayEnvelope<DotRunnerReplayAction>): string {
  return dotRunnerFingerprint(simulateDotRunner(envelope));
}

export function dotRunnerGhostTrack(envelope: ReplayEnvelope<DotRunnerReplayAction>): number[] {
  const track: number[] = [];
  simulateDotRunner(envelope, state => { track[Math.floor(state.elapsedFrames)] = state.playerY; });
  return track;
}
