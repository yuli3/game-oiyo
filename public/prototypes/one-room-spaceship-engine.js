// src/lib/games/one-room-spaceship.ts
var SYSTEMS = ["oxygen", "cooling", "power", "thrust"];
function shipIncident(elapsed) {
  const block = Math.floor(elapsed / 10);
  return block === 1 || block === 7 ? "cooling" : block === 3 ? "power" : block === 5 ? "oxygen" : null;
}
function createShip() {
  return {
    elapsed: 0,
    oxygen: 75,
    heat: 25,
    power: 75,
    distance: 0,
    primary: "thrust",
    secondary: "oxygen",
    status: "ready"
  };
}
function crewChoice(s) {
  const risk = {
    oxygen: 70 - s.oxygen,
    cooling: s.heat - 30,
    power: 65 - s.power,
    thrust: (s.elapsed / 90 * 65 - s.distance) * 2
  };
  return SYSTEMS.filter((k) => k !== s.primary).sort((a, b) => risk[b] - risk[a])[0];
}
function assignShip(s, primary) {
  const next = { ...s, primary };
  return { ...next, secondary: crewChoice(next) };
}
function startShip(s) {
  return s.status === "ready" ? { ...s, status: "flying" } : s;
}
function stepShip(s) {
  if (s.status !== "flying") return s;
  const secondary = s.elapsed % 10 === 0 ? crewChoice(s) : s.secondary;
  const active = (k) => s.primary === k || secondary === k;
  const storm = Math.floor(s.elapsed / 10) % 3 === 1;
  const incident = shipIncident(s.elapsed);
  const missed = s.elapsed % 10 === 9 && incident !== null && s.primary !== incident;
  const oxygen = Math.min(100, s.oxygen + (active("oxygen") ? 2.6 : -1.3)) - (missed && incident === "oxygen" ? 80 : 0);
  const heat = Math.max(0, s.heat + (active("cooling") ? -3.8 : 1.4) + (active("thrust") ? 0.8 : 0) + (storm ? 0.5 : 0)) + (missed && incident === "cooling" ? 85 : 0);
  const power = Math.min(100, s.power + (active("power") ? 3.4 : -1.1)) - (missed && incident === "power" ? 80 : 0);
  const distance = s.distance + (active("thrust") ? 1.3 : 0.15);
  const elapsed = s.elapsed + 1;
  const lost = oxygen <= 0 || heat >= 100 || power <= 0;
  return {
    ...s,
    elapsed,
    oxygen,
    heat,
    power,
    distance,
    secondary,
    status: lost ? "lost" : elapsed >= 90 ? distance >= 65 ? "arrived" : "lost" : "flying"
  };
}
export {
  SYSTEMS,
  assignShip,
  createShip,
  crewChoice,
  shipIncident,
  startShip,
  stepShip
};
