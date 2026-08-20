export const REPLAY_ENVELOPE_VERSION = 1 as const;

export type ReplayInput<T> = { tick: number; input: T };
export type ReplayEnvelope<T> = {
  v: 1;
  game: string;
  rulesetVersion: string;
  seed: number;
  stepSeconds: number;
  inputLog: ReplayInput<T>[];
  finalTick: number;
  finalHash: string;
  achievedAt: string;
};

export function replayFingerprintHash(fingerprint: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createReplayEnvelope<T>(args: Omit<ReplayEnvelope<T>, "v" | "finalHash" | "achievedAt"> & { finalFingerprint: string; achievedAt?: string }): ReplayEnvelope<T> {
  return {
    v: REPLAY_ENVELOPE_VERSION,
    game: args.game,
    rulesetVersion: args.rulesetVersion,
    seed: args.seed >>> 0,
    stepSeconds: args.stepSeconds,
    inputLog: args.inputLog.map(entry => ({ tick: entry.tick, input: entry.input })),
    finalTick: args.finalTick,
    finalHash: replayFingerprintHash(args.finalFingerprint),
    achievedAt: args.achievedAt ?? new Date().toISOString(),
  };
}

export function isReplayEnvelope(value: unknown, game: string): value is ReplayEnvelope<unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const envelope = value as Partial<ReplayEnvelope<unknown>>;
  if (envelope.v !== 1 || envelope.game !== game || typeof envelope.rulesetVersion !== "string" || !envelope.rulesetVersion) return false;
  if (!Number.isInteger(envelope.seed) || envelope.seed! < 0 || envelope.seed! > 0xffffffff) return false;
  if (!Number.isFinite(envelope.stepSeconds) || envelope.stepSeconds! <= 0 || envelope.stepSeconds! > 1) return false;
  if (!Number.isInteger(envelope.finalTick) || envelope.finalTick! < 0 || !Array.isArray(envelope.inputLog) || envelope.inputLog.length > 50_000) return false;
  if (typeof envelope.finalHash !== "string" || !/^[0-9a-f]{8}$/.test(envelope.finalHash)) return false;
  if (typeof envelope.achievedAt !== "string" || Number.isNaN(Date.parse(envelope.achievedAt))) return false;
  let previousTick = -1;
  for (const entry of envelope.inputLog) {
    if (!entry || typeof entry !== "object" || !Number.isInteger(entry.tick) || entry.tick < previousTick || entry.tick > envelope.finalTick!) return false;
    previousTick = entry.tick;
  }
  return true;
}

export function verifyReplayEnvelope<T>(envelope: ReplayEnvelope<T>, replay: (value: ReplayEnvelope<T>) => string): boolean {
  return replayFingerprintHash(replay(envelope)) === envelope.finalHash;
}

const keyFor = (game: string) => `oiyo:game-replay:v1:${game}`;

export function saveReplayEnvelope<T>(envelope: ReplayEnvelope<T>): boolean {
  if (typeof localStorage === "undefined" || !isReplayEnvelope(envelope, envelope.game)) return false;
  try { localStorage.setItem(keyFor(envelope.game), JSON.stringify(envelope)); return true; } catch { return false; }
}

export function loadReplayEnvelope<T>(game: string): ReplayEnvelope<T> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(keyFor(game)) ?? "null");
    return isReplayEnvelope(value, game) ? value as ReplayEnvelope<T> : null;
  } catch { return null; }
}
