// src/lib/games/whale-city.ts
function createWhaleCity(mission = 0) {
  mission = Number.isFinite(mission) ? Math.abs(Math.trunc(mission)) % 3 : 0;
  return { mission, turn: 0, actions: 2, fatigue: 12 + mission * 4, phase: "sailing", moves: 0, buildings: [{ id: 0, slot: 0, health: 3, weight: 2, people: 4, braced: false }, { id: 1, slot: 4, health: 3, weight: 2, people: 4, braced: false }, { id: 2, slot: 8, health: 3, weight: 2, people: 4, braced: false }, { id: 3, slot: 2, health: 3, weight: 1, people: 0, braced: false }] };
}
function seaForecast(s) {
  return ["breath", "left", "dive", "right", "breath", "dive", "left", "right", "breath", "left", "dive", "breath"][s.turn % 12];
}
function whaleTilt(s) {
  return s.buildings.filter((b) => b.health > 0).reduce((n, b) => n + (b.slot % 3 - 1) * b.weight, 0);
}
function floodedSlots(s) {
  const event = seaForecast(s);
  if (event === "breath") return [];
  if (event === "left") return [0, 3, 6];
  if (event === "right") return [2, 5, 8];
  return s.mission === 2 ? [0, 1, 2, 3, 5, 6, 7, 8] : [0, 1, 2, 6, 7, 8];
}
function moveWhaleBuilding(s, id, slot) {
  const b = s.buildings.find((b2) => b2.id === id);
  if (s.phase !== "sailing" || s.actions < 1 || !b || b.health === 0 || !Number.isInteger(slot) || slot < 0 || slot > 8 || s.buildings.some((b2) => b2.health > 0 && b2.slot === slot)) return s;
  return { ...s, actions: s.actions - 1, moves: s.moves + 1, buildings: s.buildings.map((b2) => b2.id === id ? { ...b2, slot, braced: false } : b2) };
}
function braceWhaleBuilding(s, id) {
  const b = s.buildings.find((b2) => b2.id === id);
  if (s.phase !== "sailing" || s.actions < 1 || !b || b.health === 0 || b.braced) return s;
  return { ...s, actions: s.actions - 1, buildings: s.buildings.map((b2) => b2.id === id ? { ...b2, braced: true } : b2) };
}
function sootheWhale(s) {
  if (s.phase !== "sailing" || s.actions < 1 || s.fatigue === 0) return s;
  return { ...s, actions: s.actions - 1, fatigue: Math.max(0, s.fatigue - 12) };
}
function whalePeople(s) {
  return s.buildings.filter((b) => b.health > 0).reduce((n, b) => n + b.people, 0);
}
function whaleScore(s) {
  return whalePeople(s) * 50 + s.buildings.reduce((n, b) => n + b.health * 20, 0) + Math.max(0, 100 - s.fatigue) - s.moves * 2;
}
function advanceWhale(s) {
  if (s.phase !== "sailing") return s;
  const flood = floodedSlots(s), tilt = Math.abs(whaleTilt(s));
  const buildings = s.buildings.map((b) => ({ ...b, health: Math.max(0, b.health - (b.health > 0 && flood.includes(b.slot) && !b.braced ? 1 : 0)), braced: false }));
  const garden = buildings.find((b) => b.id === 3);
  const fatigue = Math.max(0, s.fatigue + 3 + s.mission + tilt * 2 - (seaForecast(s) === "breath" ? 8 : 0) - (garden && garden.health > 0 ? 2 : 0));
  const turn = s.turn + 1, next = { ...s, buildings, fatigue, turn, actions: 2 };
  return { ...next, phase: fatigue >= 100 || whalePeople(next) < 12 ? "lost" : turn >= 12 ? "arrived" : "sailing" };
}
export {
  advanceWhale,
  braceWhaleBuilding,
  createWhaleCity,
  floodedSlots,
  moveWhaleBuilding,
  seaForecast,
  sootheWhale,
  whalePeople,
  whaleScore,
  whaleTilt
};
