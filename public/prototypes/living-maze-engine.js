// src/lib/games/living-maze.ts
var MAZE_TURN_LIMIT = 40;
function createLivingMaze(seed = 0) {
  seed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) % 6 : 0;
  return { seed, player: { x: 1, y: 5 }, gates: [
    { x: 2, y: [3, 1, 5][seed % 3], need: seed % 2 ? "quiet" : "light", open: false, known: false, patience: 0 },
    { x: 4, y: [1, 5, 3][seed % 3], need: seed % 2 ? "light" : "quiet", open: false, known: false, patience: 0 }
  ], light: 4, stress: 0, turns: 0, phase: "exploring", event: "start" };
}
function mazeTile(s, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || x > 5 || y < 1 || y > 5) return "wall";
  const gate = s.gates.find((g) => g.x === x && g.y === y);
  if (gate) return gate.open ? "floor" : "gate";
  if (x === 2 || x === 4) return "wall";
  return x === 5 && y === 1 ? "exit" : "floor";
}
function nearbyGate(s) {
  return s.gates.findIndex((g) => !g.open && Math.abs(s.player.x - g.x) + Math.abs(s.player.y - g.y) === 1);
}
function advanceLivingMaze(s, action) {
  if (s.phase !== "exploring") return s;
  const adjacent = nearbyGate(s);
  if (action === "observe") return { ...s, event: adjacent < 0 ? "alone" : "observed", gates: s.gates.map((g, i) => i === adjacent ? { ...g, known: true } : g) };
  let player = s.player, light = s.light, stress = s.stress, event = "waiting";
  let gates = s.gates.map((g) => ({ ...g, patience: action === "wait" ? g.patience : 0 }));
  if (action === "offer") {
    if (adjacent < 0) return { ...s, event: "alone" };
    if (light < 2) return { ...s, event: "empty" };
    light -= 2;
    const gate = gates[adjacent];
    gate.known = true;
    if (gate.need === "light") {
      gate.open = true;
      event = "opened";
    } else {
      stress += 2;
      event = "refused";
    }
  } else if (action === "wait") {
    stress = Math.max(0, stress - 1);
    gates = gates.map((g, i) => {
      if (i !== adjacent || g.need !== "quiet") return { ...g, patience: 0 };
      const patience = g.patience + 1;
      if (patience >= 2) event = "opened";
      return { ...g, patience, open: patience >= 2 };
    });
  } else if (action === "call") {
    stress += 3;
    event = "noise";
    gates = gates.map((g) => ({ ...g, open: g.x === player.x && g.y === player.y, patience: 0 }));
  } else {
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[action];
    if (!delta) return s;
    const target = { x: player.x + delta[0], y: player.y + delta[1] };
    const tile = mazeTile(s, target.x, target.y);
    if (tile === "wall" || tile === "gate") return { ...s, event: "blocked" };
    player = target;
    event = "moved";
  }
  const turns = s.turns + 1;
  const phase = stress >= 6 ? "overwhelmed" : player.x === 5 && player.y === 1 ? "escaped" : turns >= MAZE_TURN_LIMIT ? "expired" : "exploring";
  return { ...s, player, gates, light, stress, turns, phase, event };
}
export {
  MAZE_TURN_LIMIT,
  advanceLivingMaze,
  createLivingMaze,
  mazeTile,
  nearbyGate
};
