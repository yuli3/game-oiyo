/**
 * Wave 1 anonymous-share endpoint core.
 *
 * Pure functions over a minimal KV interface so the whole request path can be
 * tested in Vitest without Cloudflare. `functions/api/share*` are thin
 * adapters over this module. The snapshot rules (owner split, 64KiB, 30-day
 * TTL, immutable create-once) all come from `snapshot-contract.ts`.
 *
 * Budget: every create costs 2 KV writes (day counter + snapshot), so the
 * create cap is set to 450/day = 900 writes = 90% of the documented free
 * baseline (1,000 writes/day), leaving the contract's 10% headroom. The
 * counter is written before the snapshot so a counter failure fails closed.
 */

import {
  MAX_SNAPSHOT_TTL_MS,
  SNAPSHOT_CONTRACT_VERSION,
  canCreateImmutableSnapshot,
  snapshotKvKey,
  validateAnonymousShareSnapshot,
  type AnonymousShareSnapshot,
  type SnapshotKind,
} from "./snapshot-contract";

export type ShareKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export const DAILY_CREATE_LIMIT = 450;
export const CREATE_COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;
export const MAX_REQUEST_BODY_BYTES = 70 * 1024;

export type CreateShareError =
  | "kv_unbound"
  | "budget_exhausted"
  | "budget_unavailable"
  | "already_exists"
  | "invalid_snapshot";

export type GetShareError = "kv_unbound" | "invalid_request" | "not_found" | "expired_or_corrupt";

export type CreateShareResult =
  | { ok: true; snapshot: AnonymousShareSnapshot }
  | { ok: false; error: CreateShareError; detail?: string };

export type GetShareResult =
  | { ok: true; snapshot: AnonymousShareSnapshot }
  | { ok: false; error: GetShareError };

export function createCounterKey(nowMs: number): string {
  return `meta:v1:creates:${new Date(nowMs).toISOString().slice(0, 10)}`;
}

export function generateSnapshotId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function createShareSnapshot(
  kv: ShareKv | undefined,
  input: { kind: SnapshotKind; payload: unknown },
  options: { nowMs?: number; ttlMs?: number; snapshotId?: string } = {},
): Promise<CreateShareResult> {
  if (!kv) return { ok: false, error: "kv_unbound" };
  const nowMs = options.nowMs ?? Date.now();
  const ttlMs = options.ttlMs ?? MAX_SNAPSHOT_TTL_MS;
  const candidate = {
    version: SNAPSHOT_CONTRACT_VERSION,
    snapshotId: options.snapshotId ?? generateSnapshotId(),
    kind: input.kind,
    owner: input.kind === "tier-list.v1" ? "blog.oiyo.net" : "game.oiyo.net",
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
    payload: input.payload,
  };
  const validated = validateAnonymousShareSnapshot(candidate, nowMs);
  if (!validated.ok) return { ok: false, error: "invalid_snapshot", detail: validated.error };

  const counterKey = createCounterKey(nowMs);
  const counterRaw = await kv.get(counterKey);
  const created = counterRaw === null ? 0 : Number.parseInt(counterRaw, 10);
  if (!Number.isFinite(created) || created >= DAILY_CREATE_LIMIT) {
    return { ok: false, error: "budget_exhausted" };
  }
  try {
    await kv.put(counterKey, String(created + 1), { expirationTtl: CREATE_COUNTER_TTL_SECONDS });
  } catch {
    return { ok: false, error: "budget_unavailable" };
  }

  const key = snapshotKvKey(validated.value);
  if (!canCreateImmutableSnapshot(await kv.get(key))) return { ok: false, error: "already_exists" };
  await kv.put(key, JSON.stringify(validated.value), {
    expirationTtl: Math.ceil((Date.parse(validated.value.expiresAt) - nowMs) / 1000),
  });
  return { ok: true, snapshot: validated.value };
}

export async function getShareSnapshot(
  kv: ShareKv | undefined,
  kind: SnapshotKind,
  snapshotId: string,
  nowMs = Date.now(),
): Promise<GetShareResult> {
  if (!kv) return { ok: false, error: "kv_unbound" };
  if (kind !== "tier-list.v1" && kind !== "game-records.v1") return { ok: false, error: "invalid_request" };
  if (!/^[a-z0-9][a-z0-9_-]{15,63}$/.test(snapshotId)) return { ok: false, error: "invalid_request" };

  const raw = await kv.get(snapshotKvKey({ kind, snapshotId }));
  if (raw === null) return { ok: false, error: "not_found" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "expired_or_corrupt" };
  }
  const validated = validateAnonymousShareSnapshot(parsed, nowMs);
  if (
    !validated.ok ||
    validated.value.kind !== kind ||
    validated.value.snapshotId !== snapshotId ||
    Date.parse(validated.value.expiresAt) <= nowMs
  ) {
    return { ok: false, error: "expired_or_corrupt" };
  }
  return { ok: true, snapshot: validated.value };
}

/** Shared HTTP adapter used by both Pages Functions repos (same-origin only, noindex). */
export async function handleCreateRequest(
  kv: ShareKv | undefined,
  kind: SnapshotKind,
  request: { text(): Promise<string> },
): Promise<Response> {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BODY_BYTES) {
    return shareJsonResponse({ error: "payload_too_large" }, 413);
  }
  let payload: unknown;
  try {
    payload = (JSON.parse(body) as { payload?: unknown }).payload;
  } catch {
    return shareJsonResponse({ error: "invalid_json" }, 400);
  }
  const result = await createShareSnapshot(kv, { kind, payload });
  if (!result.ok) {
    const status =
      result.error === "kv_unbound" ? 503 :
      result.error === "budget_exhausted" || result.error === "budget_unavailable" ? 503 :
      result.error === "already_exists" ? 409 : 400;
    return shareJsonResponse({ error: result.error, detail: result.detail }, status);
  }
  return shareJsonResponse(
    {
      snapshotId: result.snapshot.snapshotId,
      kind: result.snapshot.kind,
      expiresAt: result.snapshot.expiresAt,
    },
    201,
  );
}

export async function handleGetRequest(
  kv: ShareKv | undefined,
  kind: SnapshotKind,
  snapshotId: string,
): Promise<Response> {
  const result = await getShareSnapshot(kv, kind, snapshotId);
  if (!result.ok) {
    const status = result.error === "kv_unbound" ? 503 : result.error === "invalid_request" ? 400 : 404;
    return shareJsonResponse({ error: result.error }, status);
  }
  return shareJsonResponse(result.snapshot, 200, { "Cache-Control": "public, max-age=300" });
}

function shareJsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Robots-Tag": "noindex",
      ...extraHeaders,
    },
  });
}
