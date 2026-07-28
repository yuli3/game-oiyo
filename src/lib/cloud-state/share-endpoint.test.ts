import { describe, expect, it } from "vitest";

import {
  DAILY_CREATE_LIMIT,
  createCounterKey,
  createShareSnapshot,
  getShareSnapshot,
  handleCreateRequest,
  handleGetRequest,
  type ShareKv,
} from "./share-endpoint";
import { MAX_SNAPSHOT_TTL_MS } from "./snapshot-contract";

const NOW = Date.parse("2026-07-20T00:00:00.000Z");

function memoryKv(seed: Record<string, string> = {}): ShareKv & { store: Map<string, string> } {
  const store = new Map(Object.entries(seed));
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

const RECORDS_PAYLOAD = {
  records: [{ gameId: "sudoku", metric: "seconds", value: 95, achievedAt: "2026-07-19T12:00:00.000Z" }],
};

describe("share endpoint core", () => {
  it("creates a valid immutable game-records snapshot and reads it back", async () => {
    const kv = memoryKv();
    const created = await createShareSnapshot(kv, { kind: "game-records.v1", payload: RECORDS_PAYLOAD }, { nowMs: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.snapshot.owner).toBe("game.oiyo.net");
    expect(Date.parse(created.snapshot.expiresAt) - NOW).toBe(MAX_SNAPSHOT_TTL_MS);

    const read = await getShareSnapshot(kv, "game-records.v1", created.snapshot.snapshotId, NOW + 1000);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.snapshot).toEqual(created.snapshot);
  });

  it("fails closed when no KV binding is present", async () => {
    const created = await createShareSnapshot(undefined, { kind: "game-records.v1", payload: RECORDS_PAYLOAD });
    expect(created).toEqual({ ok: false, error: "kv_unbound" });
    const read = await getShareSnapshot(undefined, "game-records.v1", "a".repeat(32));
    expect(read).toEqual({ ok: false, error: "kv_unbound" });
  });

  it("rejects an invalid payload without writing anything", async () => {
    const kv = memoryKv();
    const created = await createShareSnapshot(
      kv,
      { kind: "game-records.v1", payload: { records: [{ gameId: "sudoku", metric: "seconds", value: -1 }] } },
      { nowMs: NOW },
    );
    expect(created).toMatchObject({ ok: false, error: "invalid_snapshot" });
    expect(kv.store.size).toBe(0);
  });

  it("fails closed at the 90% daily create budget", async () => {
    const kv = memoryKv({ [createCounterKey(NOW)]: String(DAILY_CREATE_LIMIT) });
    const created = await createShareSnapshot(kv, { kind: "game-records.v1", payload: RECORDS_PAYLOAD }, { nowMs: NOW });
    expect(created).toEqual({ ok: false, error: "budget_exhausted" });
  });

  it("fails closed when the budget counter cannot be written", async () => {
    const kv = memoryKv();
    const failingKv: ShareKv = {
      get: kv.get,
      async put(key, value, options) {
        if (key.startsWith("meta:v1:creates:")) throw new Error("429");
        return kv.put(key, value, options);
      },
    };
    const created = await createShareSnapshot(failingKv, { kind: "game-records.v1", payload: RECORDS_PAYLOAD }, { nowMs: NOW });
    expect(created).toEqual({ ok: false, error: "budget_unavailable" });
    expect(kv.store.size).toBe(0);
  });

  it("refuses to overwrite an existing snapshot key", async () => {
    const kv = memoryKv();
    const first = await createShareSnapshot(
      kv,
      { kind: "game-records.v1", payload: RECORDS_PAYLOAD },
      { nowMs: NOW, snapshotId: "f".repeat(32) },
    );
    expect(first.ok).toBe(true);
    const second = await createShareSnapshot(
      kv,
      { kind: "game-records.v1", payload: RECORDS_PAYLOAD },
      { nowMs: NOW, snapshotId: "f".repeat(32) },
    );
    expect(second).toEqual({ ok: false, error: "already_exists" });
  });

  it("treats a stored-but-expired or tampered snapshot as gone", async () => {
    const kv = memoryKv();
    const created = await createShareSnapshot(kv, { kind: "game-records.v1", payload: RECORDS_PAYLOAD }, { nowMs: NOW });
    if (!created.ok) throw new Error("setup failed");
    const afterExpiry = Date.parse(created.snapshot.expiresAt) + 1;
    const expired = await getShareSnapshot(kv, "game-records.v1", created.snapshot.snapshotId, afterExpiry);
    expect(expired).toEqual({ ok: false, error: "expired_or_corrupt" });

    const key = `share:v1:game-records.v1:${created.snapshot.snapshotId}`;
    kv.store.set(key, JSON.stringify({ ...created.snapshot, owner: "blog.oiyo.net" }));
    const tampered = await getShareSnapshot(kv, "game-records.v1", created.snapshot.snapshotId, NOW);
    expect(tampered).toEqual({ ok: false, error: "expired_or_corrupt" });
  });

  it("rejects malformed ids and unknown kinds at read time", async () => {
    const kv = memoryKv();
    expect(await getShareSnapshot(kv, "game-records.v1", "short", NOW)).toEqual({ ok: false, error: "invalid_request" });
    expect(await getShareSnapshot(kv, "nope" as never, "a".repeat(32), NOW)).toEqual({ ok: false, error: "invalid_request" });
  });
});

describe("share endpoint HTTP adapter", () => {
  it("returns 201 with only id/kind/expiry on create and 200 with noindex on read", async () => {
    const kv = memoryKv();
    const createRes = await handleCreateRequest(kv, "game-records.v1", {
      async text() {
        return JSON.stringify({ payload: RECORDS_PAYLOAD });
      },
    });
    expect(createRes.status).toBe(201);
    expect(createRes.headers.get("X-Robots-Tag")).toBe("noindex");
    const body = (await createRes.json()) as { snapshotId: string; kind: string };
    expect(body.kind).toBe("game-records.v1");

    const getRes = await handleGetRequest(kv, "game-records.v1", body.snapshotId);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("maps errors to honest statuses: 400 invalid json, 413 oversized, 404 missing, 503 unbound", async () => {
    const kv = memoryKv();
    expect((await handleCreateRequest(kv, "game-records.v1", { async text() { return "{"; } })).status).toBe(400);
    expect(
      (await handleCreateRequest(kv, "game-records.v1", { async text() { return "x".repeat(71 * 1024); } })).status,
    ).toBe(413);
    expect((await handleGetRequest(kv, "game-records.v1", "a".repeat(32))).status).toBe(404);
    expect((await handleGetRequest(undefined, "game-records.v1", "a".repeat(32))).status).toBe(503);
  });
});
