// Seven events from the quality bar. No seed, name, account, birthday, or typed text.

export type TileRummyAnalyticsEvent =
  | "game_enter"
  | "game_start"
  | "game_end"
  | "augment_pick"
  | "chaos_seen"
  | "share_click"
  | "retry_click";

export type TileRummyAnalyticsMode = "match" | "daily" | "run";

const ALLOWED = new Set(["game_id", "mode", "result", "duration", "id", "tier"]);

export function tileRummyAnalyticsPayload(
  event: TileRummyAnalyticsEvent,
  fields: { mode?: TileRummyAnalyticsMode; result?: "w" | "l" | "d"; duration?: number; id?: string; tier?: string },
): Record<string, string | number> {
  const payload: Record<string, string | number> = { game_id: "tile-rummy" };
  if (event === "game_start" || event === "game_end") {
    if (fields.mode) payload.mode = fields.mode;
  }
  if (event === "game_end") {
    if (fields.result) payload.result = fields.result;
    if (fields.duration !== undefined) payload.duration = fields.duration;
  }
  if (event === "augment_pick") {
    if (fields.id) payload.id = fields.id;
    if (fields.tier) payload.tier = fields.tier;
  }
  if (event === "chaos_seen" && fields.id) payload.id = fields.id;
  for (const key of Object.keys(payload)) {
    if (!ALLOWED.has(key)) delete payload[key];
  }
  return payload;
}
