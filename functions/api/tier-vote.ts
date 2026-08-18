import { flushDeltas, readTallies, type TallyKv, type VoteDelta } from "../../src/lib/cloud-state/vote-tally";

type PagesContext = {
  request: Request;
  env: { SHARE_KV?: TallyKv };
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" } as const;

function hashId(templateId: string): number {
  let hash = 0;
  for (const char of templateId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 900000) + 100000;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const ids = (new URL(context.request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(hashId);
  const result = await readTallies(context.env.SHARE_KV, ids);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.error === "kv_unbound" ? 503 : 400,
      headers: JSON_HEADERS,
    });
  }
  return new Response(JSON.stringify({ tallies: result.tallies }), {
    status: 200,
    headers: { ...JSON_HEADERS, "cache-control": "public, max-age=30" },
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  let body: { templateId?: string; side?: "up" | "down" };
  try {
    body = (await context.request.json()) as { templateId?: string; side?: "up" | "down" };
  } catch {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: JSON_HEADERS });
  }
  if (!body.templateId || (body.side !== "up" && body.side !== "down")) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: JSON_HEADERS });
  }
  const delta: VoteDelta = {
    promptId: hashId(body.templateId),
    a: body.side === "up" ? 1 : 0,
    b: body.side === "down" ? 1 : 0,
  };
  const result = await flushDeltas(context.env.SHARE_KV, [delta]);
  if (!result.ok) {
    const status = result.error === "budget_exhausted" ? 429 : result.error === "kv_unbound" ? 503 : 400;
    return new Response(JSON.stringify({ error: result.error }), { status, headers: JSON_HEADERS });
  }
  return new Response(JSON.stringify({ tallies: result.tallies }), { status: 200, headers: JSON_HEADERS });
}
