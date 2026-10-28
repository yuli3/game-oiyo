import { createReplayEnvelope, isReplayEnvelope, verifyReplayEnvelope, type ReplayEnvelope, type ReplayInput } from "./replay";
import {
  TIME_LOOP_RULESET_VERSION,
  TIME_LOOP_STEP_SECONDS,
  advanceTimeLoop,
  createTimeLoopMission,
  timeLoopFingerprint,
  type TimeLoopInput,
  type TimeLoopMission,
  type TimeLoopPoint,
} from "./time-loop-rescue";

/** Separate from `oiyo:game-records:v1` and `oiyo:game-replay:v1:*`. */
export const TIME_LOOP_WEEKLY_GAME = "time-loop-rescue-weekly";
export const TIME_LOOP_WEEKLY_BADGE_KEY = "oiyo:time-loop-weekly-badge:v1";

export type TimeLoopReplayAction = TimeLoopInput | "commit";
export type TimeLoopWeeklyBadge = { seed: number; loops: number; tick: number; at: string };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function timeLoopWeekSeed(date = new Date()): number {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const mondayOffset = (kst.getUTCDay() + 6) % 7;
  const monday = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - mondayOffset);
  return Math.floor(monday / 86_400_000) >>> 0;
}

export function timeLoopWeekLabel(seed: number): string {
  const monday = new Date(seed * 86_400_000);
  const month = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(monday.getUTCDate()).padStart(2, "0");
  return `${monday.getUTCFullYear()}-${month}-${day}`;
}

function isReplayAction(value: unknown): value is TimeLoopReplayAction {
  if (value === "commit") return true;
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<TimeLoopInput>;
  return (input.x === -1 || input.x === 0 || input.x === 1) && (input.y === -1 || input.y === 0 || input.y === 1);
}

export function simulateTimeLoop(envelope: ReplayEnvelope<TimeLoopReplayAction>): TimeLoopMission {
  let mission = createTimeLoopMission();
  for (const entry of envelope.inputLog) {
    mission = entry.input === "commit"
      ? advanceTimeLoop(mission, { type: "commit-loop" })
      : advanceTimeLoop(mission, { type: "tick", input: entry.input });
  }
  return mission;
}

export function replayTimeLoop(envelope: ReplayEnvelope<TimeLoopReplayAction>): string {
  return timeLoopFingerprint(simulateTimeLoop(envelope));
}

export function createTimeLoopWeeklyEnvelope(
  inputLog: ReplayInput<TimeLoopReplayAction>[],
  mission: TimeLoopMission,
  seed = timeLoopWeekSeed(),
  achievedAt?: string,
): ReplayEnvelope<TimeLoopReplayAction> {
  return createReplayEnvelope({
    game: TIME_LOOP_WEEKLY_GAME,
    rulesetVersion: TIME_LOOP_RULESET_VERSION,
    seed,
    stepSeconds: TIME_LOOP_STEP_SECONDS,
    inputLog,
    finalTick: inputLog.length,
    finalFingerprint: timeLoopFingerprint(mission),
    achievedAt,
  });
}

export function timeLoopRivalTrack(envelope: ReplayEnvelope<TimeLoopReplayAction>): TimeLoopPoint[] {
  const points: TimeLoopPoint[] = [];
  let mission = createTimeLoopMission();
  for (const entry of envelope.inputLog) {
    mission = entry.input === "commit"
      ? advanceTimeLoop(mission, { type: "commit-loop" })
      : advanceTimeLoop(mission, { type: "tick", input: entry.input });
    points.push(mission.player);
  }
  return points;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? ALPHABET[(triple >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? ALPHABET[triple & 63] : "=";
  }
  return out.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 24_000) return null;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const indexOf = (char: string) => (char === "=" ? -1 : ALPHABET.indexOf(char));
  const bytes: number[] = [];
  for (let index = 0; index < padded.length; index += 4) {
    const a = indexOf(padded[index] ?? "");
    const b = indexOf(padded[index + 1] ?? "");
    const c = indexOf(padded[index + 2] ?? "");
    const d = indexOf(padded[index + 3] ?? "");
    if (a < 0 || b < 0 || (c < 0 && padded[index + 2] !== "=") || (d < 0 && padded[index + 3] !== "=")) return null;
    const triple = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    bytes.push((triple >> 16) & 255);
    if (c >= 0) bytes.push((triple >> 8) & 255);
    if (d >= 0) bytes.push(triple & 255);
  }
  return Uint8Array.from(bytes);
}

export function encodeTimeLoopShare(envelope: ReplayEnvelope<TimeLoopReplayAction>): string {
  const compact = {
    seed: envelope.seed,
    at: envelope.achievedAt,
    hash: envelope.finalHash,
    log: envelope.inputLog.map((entry) => ({ t: entry.tick, i: entry.input })),
  };
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(compact)));
}

export function decodeTimeLoopShare(code: string): ReplayEnvelope<TimeLoopReplayAction> | null {
  const bytes = base64UrlToBytes(code);
  if (!bytes) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const compact = parsed as { seed?: unknown; at?: unknown; hash?: unknown; log?: unknown };
    if (!Array.isArray(compact.log)) return null;
    const inputLog = compact.log.map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as { t?: unknown; i?: unknown };
      return Number.isInteger(row.t) && isReplayAction(row.i) ? { tick: row.t as number, input: row.i } : null;
    });
    if (inputLog.some((entry) => entry === null)) return null;
    const envelope = {
      v: 1 as const,
      game: TIME_LOOP_WEEKLY_GAME,
      rulesetVersion: TIME_LOOP_RULESET_VERSION,
      seed: compact.seed,
      stepSeconds: TIME_LOOP_STEP_SECONDS,
      inputLog,
      finalTick: inputLog.length,
      finalHash: compact.hash,
      achievedAt: compact.at,
    };
    return isReplayEnvelope(envelope, TIME_LOOP_WEEKLY_GAME) ? envelope as ReplayEnvelope<TimeLoopReplayAction> : null;
  } catch {
    return null;
  }
}

export function acceptTimeLoopShare(code: string): ReplayEnvelope<TimeLoopReplayAction> | null {
  const envelope = decodeTimeLoopShare(code);
  if (!envelope || !verifyReplayEnvelope(envelope, replayTimeLoop)) return null;
  return envelope;
}

export function readTimeLoopWeeklyBadge(storage: Storage | undefined, seed: number): TimeLoopWeeklyBadge | null {
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(TIME_LOOP_WEEKLY_BADGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const badge = parsed as Partial<TimeLoopWeeklyBadge>;
    if (badge.seed !== seed || !Number.isInteger(badge.loops) || !Number.isInteger(badge.tick) || typeof badge.at !== "string") return null;
    return { seed, loops: badge.loops as number, tick: badge.tick as number, at: badge.at };
  } catch {
    return null;
  }
}

export function writeTimeLoopWeeklyBadge(storage: Storage | undefined, badge: TimeLoopWeeklyBadge): boolean {
  if (!storage || badge.seed < 0) return false;
  try {
    storage.setItem(TIME_LOOP_WEEKLY_BADGE_KEY, JSON.stringify(badge));
    return true;
  } catch {
    return false;
  }
}
