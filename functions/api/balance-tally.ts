// GET  /api/balance-tally?ids=1,2,3 — read vote splits for prompts.
// POST /api/balance-tally            — flush a batch of local vote deltas.
//
// Requires a KV namespace bound as SHARE_KV on the game.oiyo.net Pages project.
// Without the binding both verbs fail closed with 503 and the game falls back to
// showing only the player's own choices — never an error the player has to read.
//
// Vote batching, the per-day write ceiling and the accuracy trade-offs all live
// in src/lib/cloud-state/vote-tally.ts. Read that before raising any limit: the
// free KV baseline is 1,000 writes/day and it is shared with /api/share.
import { flushDeltas, readTallies, type TallyKv } from "../../src/lib/cloud-state/vote-tally";

type PagesContext = {
  request: Request;
  env: { SHARE_KV?: TallyKv };
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" } as const;
// Tallies are approximate by design, so a short shared cache costs nothing and
// keeps repeat reads off KV entirely.
const READ_CACHE = "public, max-age=60, stale-while-revalidate=300";

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n));

  const result = await readTallies(context.env.SHARE_KV, ids);
  if (!result.ok) {
    return json({ error: result.error }, result.error === "kv_unbound" ? 503 : 400);
  }
  return json({ tallies: result.tallies }, 200, { "cache-control": READ_CACHE });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: "invalid_payload", detail: "body must be JSON" }, 400);
  }

  const deltas = (payload as { deltas?: unknown } | null)?.deltas;
  const result = await flushDeltas(context.env.SHARE_KV, deltas);
  if (!result.ok) {
    const status =
      result.error === "kv_unbound" ? 503
      : result.error === "invalid_payload" ? 400
      // Budget exhausted is not the caller's fault and not permanent, so it is
      // 429 rather than 4xx-final; the client drops the batch and plays on.
      : result.error === "budget_exhausted" ? 429
      : 503;
    return json({ error: result.error, detail: result.detail }, status);
  }
  return json({ applied: result.applied, tallies: result.tallies }, 200);
}
