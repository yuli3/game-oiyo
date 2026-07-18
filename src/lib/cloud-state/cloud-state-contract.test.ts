import { describe, expect, it } from "vitest";

import {
  MAX_SNAPSHOT_BYTES,
  canCreateImmutableSnapshot,
  snapshotKvKey,
  validateAnonymousShareSnapshot,
} from "./snapshot-contract";
import {
  CLOUDFLARE_DURABLE_OBJECTS_FREE_BASELINE,
  ROOM_LIMITS,
  admitRoomCommand,
  canResume,
  isRoomExpired,
  validateClientRoomCommand,
} from "./multiplayer-contract";

const now = Date.parse("2026-07-18T03:00:00.000Z");

function tierSnapshot() {
  return {
    version: 1,
    snapshotId: "snapshot_1234567",
    kind: "tier-list.v1",
    owner: "blog.oiyo.net",
    createdAt: "2026-07-18T03:00:00.000Z",
    expiresAt: "2026-07-25T03:00:00.000Z",
    payload: {
      title: "동물 티어",
      tiers: [
        { id: "s", label: "S", items: [{ id: "a1", label: "🦁 Lion" }] },
        { id: "a", label: "A", items: [] },
      ],
    },
  };
}

function joinCommand() {
  return {
    v: 1,
    type: "join",
    roomId: "room_123456",
    clientCommandId: "command_123456",
    sentAt: "2026-07-18T03:00:00.000Z",
  };
}

describe("anonymous KV snapshot contract", () => {
  it("accepts an owner-correct, bounded tier-list snapshot", () => {
    const result = validateAnonymousShareSnapshot(tierSnapshot(), now);
    expect(result.ok).toBe(true);
    if (result.ok) expect(snapshotKvKey(result.value)).toBe("share:v1:tier-list.v1:snapshot_1234567");
  });

  it("keeps the existing blog owner and rejects a game owner substitution", () => {
    expect(validateAnonymousShareSnapshot({ ...tierSnapshot(), owner: "game.oiyo.net" }, now)).toEqual({
      ok: false,
      error: "invalid_owner",
    });
  });

  it("rejects identity/device fields instead of silently persisting them", () => {
    expect(validateAnonymousShareSnapshot({ ...tierSnapshot(), userId: "person-1" }, now)).toEqual({
      ok: false,
      error: "unknown_field",
    });
  });

  it("rejects expired, overlong, malformed, and oversized snapshots", () => {
    expect(validateAnonymousShareSnapshot({ ...tierSnapshot(), expiresAt: "2026-07-18T03:00:00.000Z" }, now)).toEqual({ ok: false, error: "invalid_ttl" });
    expect(validateAnonymousShareSnapshot({ ...tierSnapshot(), expiresAt: "2026-09-18T03:00:00.000Z" }, now)).toEqual({ ok: false, error: "invalid_ttl" });
    expect(validateAnonymousShareSnapshot({ ...tierSnapshot(), payload: { tiers: [] } }, now)).toEqual({ ok: false, error: "invalid_payload" });
    const huge = tierSnapshot();
    huge.payload.title = "x".repeat(MAX_SNAPSHOT_BYTES);
    expect(validateAnonymousShareSnapshot(huge, now)).toEqual({ ok: false, error: "payload_too_large" });
  });

  it("models KV as create-once, never overwrite", () => {
    expect(canCreateImmutableSnapshot(null)).toBe(true);
    expect(canCreateImmutableSnapshot(undefined)).toBe(true);
    expect(canCreateImmutableSnapshot(tierSnapshot())).toBe(false);
  });
});

describe("Durable Object room protocol", () => {
  it("accepts the minimal anonymous join command", () => {
    expect(validateClientRoomCommand(joinCommand(), now).ok).toBe(true);
  });

  it("has no chat/state/result/clock command and rejects extra identity data", () => {
    expect(validateClientRoomCommand({ ...joinCommand(), type: "chat", text: "hello" }, now)).toEqual({ ok: false, error: "unknown_or_forbidden_type" });
    expect(validateClientRoomCommand({ ...joinCommand(), type: "state", state: {} }, now)).toEqual({ ok: false, error: "unknown_or_forbidden_type" });
    expect(validateClientRoomCommand({ ...joinCommand(), userId: "person-1" }, now)).toEqual({ ok: false, error: "unknown_field" });
  });

  it("requires reconnect/move authority and optimistic room revision", () => {
    const move = {
      ...joinCommand(),
      type: "move",
      seatToken: "a".repeat(32),
      expectedRevision: 3,
      action: { column: 2 },
    };
    expect(validateClientRoomCommand(move, now).ok).toBe(true);
    expect(validateClientRoomCommand({ ...move, seatToken: "short" }, now)).toEqual({ ok: false, error: "invalid_auth" });
    expect(validateClientRoomCommand({ ...move, expectedRevision: -1 }, now)).toEqual({ ok: false, error: "invalid_revision" });
  });

  it("enforces message, clock, and action bounds", () => {
    expect(validateClientRoomCommand({ ...joinCommand(), sentAt: "2026-07-18T04:00:00.000Z" }, now)).toEqual({ ok: false, error: "invalid_envelope" });
    expect(validateClientRoomCommand({ ...joinCommand(), padding: "x".repeat(ROOM_LIMITS.maxMessageBytes) }, now)).toEqual({ ok: false, error: "message_too_large" });
  });

  it("fails closed on free-budget reserve, expiry, room capacity, and rate limits", () => {
    const baseline = CLOUDFLARE_DURABLE_OBJECTS_FREE_BASELINE;
    const base = {
      budget: { requestsUsedToday: 1, gbSecondsUsedToday: 1, storedBytes: 1 },
      room: { createdAtMs: now - 1_000, lastActivityAtMs: now - 1_000, connectedPlayers: 1 },
      nowMs: now,
      commandsInCurrentWindow: 0,
      commandType: "join" as const,
    };
    expect(admitRoomCommand(base)).toEqual({ ok: true });
    expect(admitRoomCommand({ ...base, budget: { ...base.budget, requestsUsedToday: baseline.requestsPerDay * 0.9 } })).toEqual({ ok: false, reason: "service_unavailable_budget" });
    expect(admitRoomCommand({ ...base, room: { ...base.room, lastActivityAtMs: now - ROOM_LIMITS.idleTtlMs } })).toEqual({ ok: false, reason: "room_expired" });
    expect(admitRoomCommand({ ...base, room: { ...base.room, connectedPlayers: ROOM_LIMITS.maxPlayers } })).toEqual({ ok: false, reason: "room_full" });
    expect(admitRoomCommand({ ...base, commandsInCurrentWindow: ROOM_LIMITS.maxCommandsPerWindow })).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("expires rooms and reconnect authority at exact boundaries", () => {
    expect(isRoomExpired({ createdAtMs: now, lastActivityAtMs: now, connectedPlayers: 0 }, now + ROOM_LIMITS.idleTtlMs)).toBe(true);
    expect(canResume(now, now + ROOM_LIMITS.reconnectGraceMs)).toBe(true);
    expect(canResume(now, now + ROOM_LIMITS.reconnectGraceMs + 1)).toBe(false);
  });
});
