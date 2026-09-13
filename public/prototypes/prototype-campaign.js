// src/lib/games/prototype-campaign.ts
var key = (game) => `oiyo:campaign:${game}:v1`;
function readCampaign(storage, game) {
  try {
    const data = JSON.parse(storage?.getItem(key(game)) ?? "null");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out = {};
    for (const id of [0, 1, 2]) {
      const n = data[id];
      if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1e4) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}
function saveCampaign(storage, game, mission, score) {
  if (!storage || ![0, 1, 2].includes(mission) || !Number.isInteger(score) || score < 0 || score > 1e4) return false;
  try {
    const scores = readCampaign(storage, game), id = mission;
    scores[id] = Math.max(scores[id] ?? 0, score);
    storage.setItem(key(game), JSON.stringify(scores));
    return true;
  } catch {
    return false;
  }
}
export {
  readCampaign,
  saveCampaign
};
