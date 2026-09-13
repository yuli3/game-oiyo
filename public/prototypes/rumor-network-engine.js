// src/lib/games/rumor-network.ts
var RUMOR_RULESET = "rumor-network-v1";
var RUMOR_LINKS = [[1, 2], [3, 4], [4, 5], [6], [6, 7], [6], [7], []];
var ORIGINAL = [0, 0, 0];
function rumorEffects(seed) {
  const rotation = Math.abs(Number.isFinite(seed) ? Math.trunc(seed) : 0) % 3;
  const kinds = ["amplify", "omit", "twist"];
  return ["source", kinds[rotation], kinds[(rotation + 1) % 3], kinds[(rotation + 2) % 3], kinds[(rotation + 1) % 3], "relay", "relay", "target"];
}
function createRumorNetwork(seed) {
  return { seed: Number.isFinite(seed) ? Math.trunc(seed) : 0, node: 0, message: ORIGINAL, corrections: 2, phase: "playing", path: [0], log: [] };
}
function transmitRumor(state, node) {
  if (state.phase !== "playing" || !RUMOR_LINKS[state.node]?.includes(node)) return state;
  const message = [...state.message];
  const effect = rumorEffects(state.seed)[node];
  if (effect === "amplify") message[0] = Math.min(2, message[0] + 1);
  if (effect === "omit") message[2] = 1;
  if (effect === "twist") message[1] = 1 - message[1];
  const phase = node === 7 ? message.every((v) => v === 0) ? "won" : "lost" : "playing";
  return { ...state, node, message, phase, path: [...state.path, node], log: [...state.log, { node, before: state.message, after: message, corrected: null }] };
}
function correctRumor(state, field) {
  if (state.phase !== "playing" || state.corrections === 0 || !Number.isInteger(field) || field < 0 || field > 2 || state.message[field] === 0) return state;
  const message = [...state.message];
  message[field] = 0;
  return { ...state, message, corrections: state.corrections - 1, log: [...state.log, { node: state.node, before: state.message, after: message, corrected: field }] };
}
function rumorScore(state) {
  return state.phase === "won" ? 100 - (state.path.length - 1) * 5 - (2 - state.corrections) * 10 : 0;
}
export {
  ORIGINAL,
  RUMOR_LINKS,
  RUMOR_RULESET,
  correctRumor,
  createRumorNetwork,
  rumorEffects,
  rumorScore,
  transmitRumor
};
