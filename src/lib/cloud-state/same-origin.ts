/**
 * Write endpoints (share snapshots, vote tallies) spend a small shared KV write
 * budget (see vote-tally.ts). Without an Origin check any third-party page could
 * make its visitors' browsers POST here and burn that budget for the day.
 * Browsers always send Origin on POST fetches, so a missing or foreign Origin is
 * refused. Non-browser clients can still forge it; per-IP limits belong in a
 * Cloudflare rate-limiting rule, not here.
 */
export function isSameOriginWrite(request: { url: string; headers: { get(name: string): string | null } }): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export function forbiddenOrigin(): Response {
  return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
    status: 403,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
