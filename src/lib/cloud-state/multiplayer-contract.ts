import type { ValidationResult } from "./snapshot-contract";

/**
 * Durable Objects + WebSocket Hibernation Wave 0 protocol.
 * The server/room is authoritative. This file contains no Worker binding and
 * opens no network connection.
 */
export const MULTIPLAYER_PROTOCOL_VERSION = 1 as const;
export const ROOM_LIMITS = {
  maxPlayers: 4,
  maxMessageBytes: 4_096,
  maxCommandsPerWindow: 20,
  rateWindowMs: 10_000,
  reconnectGraceMs: 60_000,
  idleTtlMs: 15 * 60_000,
  absoluteTtlMs: 2 * 60 * 60_000,
  maxClientClockSkewMs: 5 * 60_000,
} as const;

export const CLOUDFLARE_DURABLE_OBJECTS_FREE_BASELINE = {
  verifiedOn: "2026-07-18",
  requestsPerDay: 100_000,
  gbSecondsPerDay: 13_000,
  totalStoredBytes: 5_000_000_000,
  websocketIncomingMessagesPerBilledRequest: 20,
  requiresSQLiteBackendOnFreePlan: true,
  pricingSource: "https://developers.cloudflare.com/durable-objects/platform/pricing/",
  limitsSource: "https://developers.cloudflare.com/durable-objects/platform/limits/",
  hibernationSource: "https://developers.cloudflare.com/durable-objects/best-practices/websockets/",
} as const;

export type JoinCommand = {
  v: 1;
  type: "join";
  roomId: string;
  clientCommandId: string;
  sentAt: string;
};

export type ResumeCommand = {
  v: 1;
  type: "resume";
  roomId: string;
  clientCommandId: string;
  sentAt: string;
  seatToken: string;
  lastSeenRevision: number;
};

export type MoveCommand = {
  v: 1;
  type: "move";
  roomId: string;
  clientCommandId: string;
  sentAt: string;
  seatToken: string;
  expectedRevision: number;
  action: Record<string, unknown>;
};

export type SimpleRoomCommand = {
  v: 1;
  type: "ping" | "leave";
  roomId: string;
  clientCommandId: string;
  sentAt: string;
  seatToken: string;
};

export type ClientRoomCommand = JoinCommand | ResumeCommand | MoveCommand | SimpleRoomCommand;

export type RoomCommandError =
  | "not_object"
  | "message_too_large"
  | "unknown_or_forbidden_type"
  | "unknown_field"
  | "invalid_envelope"
  | "invalid_auth"
  | "invalid_revision"
  | "invalid_action";

export type RoomBudget = {
  requestsUsedToday: number;
  gbSecondsUsedToday: number;
  storedBytes: number;
};

export type RoomRuntime = {
  createdAtMs: number;
  lastActivityAtMs: number;
  connectedPlayers: number;
};

export type AdmissionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "service_unavailable_budget" | "room_expired" | "room_full" | "rate_limited";
    };

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,63}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const COMMON_FIELDS = ["v", "type", "roomId", "clientCommandId", "sentAt"] as const;
const TYPE_FIELDS: Record<ClientRoomCommand["type"], readonly string[]> = {
  join: COMMON_FIELDS,
  resume: [...COMMON_FIELDS, "seatToken", "lastSeenRevision"],
  move: [...COMMON_FIELDS, "seatToken", "expectedRevision", "action"],
  ping: [...COMMON_FIELDS, "seatToken"],
  leave: [...COMMON_FIELDS, "seatToken"],
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isIsoTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === value;
};

const isRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function bytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function validateClientRoomCommand(
  input: unknown,
  nowMs = Date.now(),
): ValidationResult<ClientRoomCommand, RoomCommandError> {
  if (!isObject(input)) return { ok: false, error: "not_object" };
  if (bytes(input) > ROOM_LIMITS.maxMessageBytes) return { ok: false, error: "message_too_large" };
  if (!(typeof input.type === "string" && input.type in TYPE_FIELDS)) {
    // `chat`, arbitrary state replacement, result claims, and clock control are
    // intentionally absent from the protocol and fail closed here.
    return { ok: false, error: "unknown_or_forbidden_type" };
  }
  const type = input.type as ClientRoomCommand["type"];
  const allowed = new Set(TYPE_FIELDS[type]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return { ok: false, error: "unknown_field" };
  if (
    input.v !== MULTIPLAYER_PROTOCOL_VERSION ||
    typeof input.roomId !== "string" ||
    !ID_PATTERN.test(input.roomId) ||
    typeof input.clientCommandId !== "string" ||
    !ID_PATTERN.test(input.clientCommandId) ||
    !isIsoTimestamp(input.sentAt) ||
    Math.abs(Date.parse(input.sentAt) - nowMs) > ROOM_LIMITS.maxClientClockSkewMs
  ) {
    return { ok: false, error: "invalid_envelope" };
  }
  if (type !== "join" && (typeof input.seatToken !== "string" || !TOKEN_PATTERN.test(input.seatToken))) {
    return { ok: false, error: "invalid_auth" };
  }
  if (type === "resume" && !isRevision(input.lastSeenRevision)) {
    return { ok: false, error: "invalid_revision" };
  }
  if (type === "move") {
    if (!isRevision(input.expectedRevision)) return { ok: false, error: "invalid_revision" };
    if (!isObject(input.action) || Object.keys(input.action).length === 0 || bytes(input.action) > 2_048) {
      return { ok: false, error: "invalid_action" };
    }
  }
  return { ok: true, value: input as ClientRoomCommand };
}

/** Reserve ten percent of the documented free allowance and stop creating work before exhaustion. */
export function isWithinFailClosedBudget(budget: RoomBudget): boolean {
  const baseline = CLOUDFLARE_DURABLE_OBJECTS_FREE_BASELINE;
  return (
    budget.requestsUsedToday >= 0 &&
    budget.requestsUsedToday < baseline.requestsPerDay * 0.9 &&
    budget.gbSecondsUsedToday >= 0 &&
    budget.gbSecondsUsedToday < baseline.gbSecondsPerDay * 0.9 &&
    budget.storedBytes >= 0 &&
    budget.storedBytes < baseline.totalStoredBytes * 0.9
  );
}

export function isRoomExpired(room: RoomRuntime, nowMs: number): boolean {
  return (
    nowMs - room.lastActivityAtMs >= ROOM_LIMITS.idleTtlMs ||
    nowMs - room.createdAtMs >= ROOM_LIMITS.absoluteTtlMs
  );
}

export function admitRoomCommand(input: {
  budget: RoomBudget;
  room: RoomRuntime;
  nowMs: number;
  commandsInCurrentWindow: number;
  commandType: ClientRoomCommand["type"];
}): AdmissionResult {
  if (!isWithinFailClosedBudget(input.budget)) return { ok: false, reason: "service_unavailable_budget" };
  if (isRoomExpired(input.room, input.nowMs)) return { ok: false, reason: "room_expired" };
  if (input.commandsInCurrentWindow >= ROOM_LIMITS.maxCommandsPerWindow) {
    return { ok: false, reason: "rate_limited" };
  }
  if (input.commandType === "join" && input.room.connectedPlayers >= ROOM_LIMITS.maxPlayers) {
    return { ok: false, reason: "room_full" };
  }
  return { ok: true };
}

/**
 * Reconnect tokens are accepted only inside the short grace window. The DO
 * must additionally compare a hash of the token stored in SQLite; raw tokens
 * and IP addresses are never persisted.
 */
export function canResume(disconnectedAtMs: number, nowMs: number): boolean {
  return nowMs >= disconnectedAtMs && nowMs - disconnectedAtMs <= ROOM_LIMITS.reconnectGraceMs;
}
