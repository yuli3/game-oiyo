// src/lib/games/disaster-control.ts
function createDisaster(seed = 0) {
  seed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) % 3 : 0;
  return { seed, turn: 0, crews: 2, saved: 0, lost: 0, phase: "responding", districts: Array.from({ length: 6 }, (_, i) => ({ health: 100, people: 4, fire: i === seed ? 2 : 0, water: i === seed + 3 ? 2 : 0, power: true })) };
}
function forecast(s) {
  return { index: (s.turn * 5 + s.seed + 2) % 6, kind: s.turn % 2 ? "water" : "fire" };
}
function survivors(s) {
  return s.saved + s.districts.reduce((n, d) => n + d.people, 0);
}
function canRespond(s, index, action) {
  const d = s.districts[index];
  return s.phase === "responding" && s.crews > 0 && Number.isInteger(index) && !!d && d.health > 0 && (action === "fire" ? d.fire > 0 : action === "drain" ? d.water > 0 : action === "repair" ? !d.power : action === "evacuate" ? d.people > 0 : false);
}
function respond(s, index, action) {
  if (!canRespond(s, index, action)) return s;
  const d = s.districts[index];
  return { ...s, crews: s.crews - 1, saved: s.saved + (action === "evacuate" ? d.people : 0), districts: s.districts.map((d2, i) => i !== index ? d2 : { ...d2, fire: action === "fire" ? Math.max(0, d2.fire - 2) : d2.fire, water: action === "drain" ? Math.max(0, d2.water - 2) : d2.water, power: action === "repair" ? true : d2.power, people: action === "evacuate" ? 0 : d2.people }) };
}
function advanceDisaster(s) {
  if (s.phase !== "responding") return s;
  let ds = s.districts.map((d) => ({ ...d }));
  const event = forecast(s);
  if (ds[event.index].health > 0) ds[event.index][event.kind] = Math.min(3, ds[event.index][event.kind] + 1);
  const spread = /* @__PURE__ */ new Set();
  ds.forEach((d, i) => {
    if (d.health <= 0) return;
    if (d.fire >= 3) {
      for (const j of [i - 1, i + 1, i - 3, i + 3]) if (j >= 0 && j < 6 && (Math.abs(i - j) === 3 || Math.floor(i / 3) === Math.floor(j / 3))) spread.add(j);
    }
  });
  let lost = s.lost;
  ds = ds.map((d, i) => {
    if (d.health <= 0) return d;
    const fire = Math.min(3, Math.max(d.fire, spread.has(i) ? 1 : 0)), power = d.water >= 2 ? false : d.power;
    const health = Math.max(0, d.health - fire * 12 - d.water * 9 - (power ? 0 : 4));
    if (health === 0) lost += d.people;
    return { ...d, fire, health, power, people: health === 0 ? 0 : d.people };
  });
  const turn = s.turn + 1, next = { ...s, districts: ds, lost, turn, crews: 2 };
  const alive = ds.filter((d) => d.health > 0).length;
  return { ...next, phase: survivors(next) < 20 || alive < 4 ? "failed" : turn >= 8 ? "stabilized" : "responding" };
}
export {
  advanceDisaster,
  canRespond,
  createDisaster,
  forecast,
  respond,
  survivors
};
