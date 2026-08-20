import { createReplayEnvelope, type ReplayEnvelope, type ReplayInput } from "./replay";
import { createGame2048, game2048Fingerprint, moveGame2048, type Game2048Direction, type Game2048State } from "./game-2048";

export const GAME_2048_RULESET_VERSION = "game-2048-2026-08-21";
export type Game2048ReplayAction = { type: "move"; direction: Game2048Direction };

export function createGame2048Replay(seed: number, state: Game2048State, inputLog: ReplayInput<Game2048ReplayAction>[]) {
  return createReplayEnvelope({ game: "game-2048", rulesetVersion: GAME_2048_RULESET_VERSION, seed, stepSeconds: 1, inputLog, finalTick: state.moves, finalFingerprint: game2048Fingerprint(state) });
}

function simulateGame2048(envelope: ReplayEnvelope<Game2048ReplayAction>, onMove?: (state: Game2048State) => void): Game2048State {
  let state = createGame2048(envelope.seed);
  for (const entry of envelope.inputLog) {
    if (entry.tick !== state.moves || entry.input.type !== "move") throw new Error("invalid 2048 replay input");
    const next = moveGame2048(state, entry.input.direction);
    if (next === state) throw new Error("replay contains a no-op move");
    state = next;
    onMove?.(state);
  }
  if (state.moves !== envelope.finalTick) throw new Error("replay ended at the wrong move");
  return state;
}

export function replayGame2048(envelope: ReplayEnvelope<Game2048ReplayAction>): string {
  return game2048Fingerprint(simulateGame2048(envelope));
}

export function game2048GhostBoards(envelope: ReplayEnvelope<Game2048ReplayAction>): (number | null)[][] {
  const boards: (number | null)[][] = [];
  simulateGame2048(envelope, state => { boards[state.moves] = [...state.board]; });
  return boards;
}
