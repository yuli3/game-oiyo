import { describe, expect, it } from "vitest";
import { createLocalRoomEmulator } from "./multiplayer-emulator";
import { ROOM_LIMITS } from "./multiplayer-contract";

const roomId = "room_test_01";
const now = Date.parse("2026-07-18T05:00:00.000Z");
const sentAt = (at = now) => new Date(at).toISOString();
let commandNumber = 0;
let tokenNumber = 0;
const commandId = () => `command_${String(++commandNumber).padStart(8, "0")}`;
const makeRoom = () => createLocalRoomEmulator({
  roomId,
  initialState: { count: 0 },
  createdAtMs: now,
  tokenFactory: () => `token_${String(++tokenNumber).padStart(40, "0")}`,
  hashSeatToken: (token) => `hash:${token}`,
  applyAction: (state, action) => action.type === "increment" ? { count: state.count + 1 } : null,
});

const join = (id = commandId(), at = now) => ({ v: 1 as const, type: "join" as const, roomId, clientCommandId: id, sentAt: sentAt(at) });

describe("local authoritative multiplayer emulator", () => {
  it("joins without storing identity and advances the authoritative revision", () => {
    const room = makeRoom();
    const reply = room.dispatch(join(), now);
    expect(reply.ok && reply.kind).toBe("joined");
    expect(reply.ok && reply.snapshot).toMatchObject({ revision: 1, connectedPlayers: 1, state: { count: 0 } });
  });

  it("deduplicates a command id and rejects stale revisions", () => {
    const room = makeRoom();
    const joined = room.dispatch(join(), now);
    if (!joined.ok || joined.kind !== "joined") throw new Error("join failed");
    const id = commandId();
    const move = { v: 1 as const, type: "move" as const, roomId, clientCommandId: id, sentAt: sentAt(), seatToken: joined.seatToken, expectedRevision: 1, action: { type: "increment" } };
    expect(room.dispatch(move, now)).toEqual(room.dispatch(move, now));
    expect(room.getSnapshot().state.count).toBe(1);
    expect(room.dispatch({ ...move, clientCommandId: commandId(), expectedRevision: 1 }, now)).toEqual({ ok: false, error: "stale_revision" });
  });

  it("applies only game-approved actions", () => {
    const room = makeRoom();
    const joined = room.dispatch(join(), now);
    if (!joined.ok || joined.kind !== "joined") throw new Error("join failed");
    const reply = room.dispatch({ v: 1, type: "move", roomId, clientCommandId: commandId(), sentAt: sentAt(), seatToken: joined.seatToken, expectedRevision: 1, action: { type: "replace-state" } }, now);
    expect(reply).toEqual({ ok: false, error: "invalid_game_action" });
    expect(room.getSnapshot().revision).toBe(1);
  });

  it("resumes only a disconnected seat inside the grace window", () => {
    const room = makeRoom();
    const joined = room.dispatch(join(), now);
    if (!joined.ok || joined.kind !== "joined") throw new Error("join failed");
    expect(room.disconnect(joined.seatToken, now + 1_000)).toBe(true);
    const resumeAt = now + ROOM_LIMITS.reconnectGraceMs;
    const reply = room.dispatch({ v: 1, type: "resume", roomId, clientCommandId: commandId(), sentAt: sentAt(resumeAt), seatToken: joined.seatToken, lastSeenRevision: 1 }, resumeAt);
    expect(reply.ok && reply.kind).toBe("resumed");
  });

  it("rejects reconnect after grace and rooms after TTL", () => {
    const room = makeRoom();
    const joined = room.dispatch(join(), now);
    if (!joined.ok || joined.kind !== "joined") throw new Error("join failed");
    room.disconnect(joined.seatToken, now);
    const late = now + ROOM_LIMITS.reconnectGraceMs + 1;
    expect(room.dispatch({ v: 1, type: "resume", roomId, clientCommandId: commandId(), sentAt: sentAt(late), seatToken: joined.seatToken, lastSeenRevision: 1 }, late)).toEqual({ ok: false, error: "reconnect_expired" });
    const expired = now + ROOM_LIMITS.absoluteTtlMs;
    expect(room.dispatch(join(commandId(), expired), expired)).toEqual({ ok: false, error: "room_expired" });
  });

  it("fails closed when the free-tier budget guard is reached", () => {
    const room = makeRoom();
    room.setBudget({ requestsUsedToday: 90_000, gbSecondsUsedToday: 0, storedBytes: 0 });
    expect(room.dispatch(join(), now)).toEqual({ ok: false, error: "service_unavailable_budget" });
  });

  it("caps a room at four connected seats", () => {
    const room = makeRoom();
    for (let index = 0; index < ROOM_LIMITS.maxPlayers; index += 1) expect(room.dispatch(join(), now).ok).toBe(true);
    expect(room.dispatch(join(), now)).toEqual({ ok: false, error: "room_full" });
  });

  it("rate-limits commands from one connected seat", () => {
    const room = makeRoom();
    const joined = room.dispatch(join(), now);
    if (!joined.ok || joined.kind !== "joined") throw new Error("join failed");
    for (let index = 0; index < ROOM_LIMITS.maxCommandsPerWindow; index += 1) {
      const reply = room.dispatch({ v: 1, type: "ping", roomId, clientCommandId: commandId(), sentAt: sentAt(), seatToken: joined.seatToken }, now);
      expect(reply.ok).toBe(true);
    }
    expect(room.dispatch({ v: 1, type: "ping", roomId, clientCommandId: commandId(), sentAt: sentAt(), seatToken: joined.seatToken }, now)).toEqual({ ok: false, error: "rate_limited" });
  });
});
