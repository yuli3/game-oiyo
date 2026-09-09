// src/lib/games/one-room-spaceship.ts
var SYSTEMS = ["oxygen", "cooling", "power", "thrust"];
function shipIncident(elapsed) {
  const block = Math.floor(elapsed / 10);
  return block === 1 || block === 7 ? "cooling" : block === 3 ? "power" : block === 5 ? "oxygen" : null;
}
function createShip(crew = "computer") {
  return {
    elapsed: 0,
    oxygen: 75,
    heat: 25,
    power: 75,
    distance: 0,
    primary: "thrust",
    secondary: "oxygen",
    crew,
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
  if (s.status === "lost" || s.status === "arrived") return s;
  if (s.primary === primary) return s;
  if (s.crew === "human" && s.secondary === primary) return s;
  const next = { ...s, primary };
  return s.crew === "human" ? next : { ...next, secondary: crewChoice(next) };
}
function assignCrew(s, secondary) {
  if (s.crew !== "human" || s.primary === secondary || s.status === "lost" || s.status === "arrived") return s;
  return { ...s, secondary };
}
function startShip(s) {
  return s.status === "ready" ? { ...s, status: "flying" } : s;
}
function stepShip(s) {
  if (s.status !== "flying") return s;
  const secondary = s.crew === "computer" && s.elapsed % 10 === 0 ? crewChoice(s) : s.secondary;
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

// src/lib/games/records.ts
var isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var isFiniteNonNegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
var isIsoTimestamp = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
function readValidatedStore(key, validates) {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    if (!isObject(parsed)) return {};
    const valid = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (id.length > 0 && validates(value)) valid[id] = value;
    }
    return valid;
  } catch {
    return {};
  }
}
var LAST_PLAYED_KEY = "oiyo:game-last-played:v1";
function readAllLastPlayed() {
  return readValidatedStore(LAST_PLAYED_KEY, isIsoTimestamp);
}
function stampLastPlayed(game) {
  try {
    const all = readAllLastPlayed();
    all[game] = (/* @__PURE__ */ new Date()).toISOString();
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(all));
  } catch {
  }
}
var isBestRecord = (value) => isObject(value) && isFiniteNonNegative(value.value) && (value.unit === "score" || value.unit === "seconds") && (value.extra === void 0 || typeof value.extra === "string");
var CONDITIONAL_BEST_KEY = "oiyo:game-condition-bests:v1";
var CONDITIONAL_BEST_TS_KEY = "oiyo:game-condition-bests-achieved-at:v1";
var isConditionValue = (value) => typeof value === "string" && value.length > 0 && value.length <= 128 && !/[\u0000-\u001f]/.test(value);
var isBestConditions = (value) => isObject(value) && isConditionValue(value.seed) && isConditionValue(value.difficulty) && (value.assist === "none" || value.assist === "hint" || value.assist === "solver" || value.assist === "undo");
var isConditionalBest = (value) => isObject(value) && isBestRecord(value) && isBestConditions(value.conditions);
var conditionKey = (game, conditions) => JSON.stringify([game, conditions.seed, conditions.difficulty, conditions.assist]);
function parseConditionKey(key) {
  try {
    const value = JSON.parse(key);
    if (!Array.isArray(value) || value.length !== 4) return null;
    const [game, seed, difficulty, assist] = value;
    const conditions = { seed, difficulty, assist };
    return isConditionValue(game) && isBestConditions(conditions) ? { game, conditions } : null;
  } catch {
    return null;
  }
}
function readConditionalBests() {
  const raw = readValidatedStore(CONDITIONAL_BEST_KEY, isConditionalBest);
  const valid = {};
  for (const [key, record] of Object.entries(raw)) {
    const parsed = parseConditionKey(key);
    if (parsed && conditionKey(parsed.game, record.conditions) === key) valid[key] = record;
  }
  return valid;
}
function readConditionalBestAchievedAt() {
  return readValidatedStore(CONDITIONAL_BEST_TS_KEY, isIsoTimestamp);
}
function getBestForConditions(game, conditions) {
  if (!isConditionValue(game) || !isBestConditions(conditions)) return null;
  return readConditionalBests()[conditionKey(game, conditions)] ?? null;
}
function recordBestForConditions(game, value, unit, conditions, extra) {
  if (!isConditionValue(game) || !isFiniteNonNegative(value) || !isBestConditions(conditions)) {
    throw new TypeError("Conditional best requires finite value and exact seed/difficulty/assist conditions");
  }
  const all = readConditionalBests();
  const key = conditionKey(game, conditions);
  const current = all[key];
  const isBetter = !current || current.unit !== unit || (unit === "score" ? value > current.value : value < current.value);
  const next = isBetter ? { value, unit, conditions: { ...conditions }, ...extra === void 0 ? {} : { extra } } : current;
  all[key] = next;
  try {
    localStorage.setItem(CONDITIONAL_BEST_KEY, JSON.stringify(all));
  } catch {
  }
  if (isBetter) {
    try {
      const timestamps = readConditionalBestAchievedAt();
      timestamps[key] = (/* @__PURE__ */ new Date()).toISOString();
      localStorage.setItem(CONDITIONAL_BEST_TS_KEY, JSON.stringify(timestamps));
    } catch {
    }
  }
  stampLastPlayed(game);
  return next;
}
export {
  SYSTEMS,
  assignCrew,
  assignShip,
  createShip,
  crewChoice,
  getBestForConditions,
  recordBestForConditions,
  shipIncident,
  startShip,
  stepShip
};
