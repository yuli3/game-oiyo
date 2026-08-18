/**
 * Wave 0 contract for optional anonymous cloud sharing.
 *
 * `tier-list.v1` owner is game.oiyo.net (2026-08-18 move from blog).
 * blog and ahoxy URLs 301 here. Identity fields stay forbidden.
 */

export const SNAPSHOT_CONTRACT_VERSION = 1 as const;
export const MAX_SNAPSHOT_BYTES = 64 * 1024;
export const MAX_SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const CLOUDFLARE_KV_FREE_BASELINE = {
  verifiedOn: "2026-07-18",
  readsPerDay: 100_000,
  writesPerDay: 1_000,
  deletesPerDay: 1_000,
  listsPerDay: 1_000,
  storedBytes: 1_000_000_000,
  source: "https://developers.cloudflare.com/kv/platform/pricing/",
} as const;

export type SnapshotKind = "tier-list.v1" | "game-records.v1";

export type TierListSnapshotPayload = {
  title?: string;
  tiers: Array<{
    id: string;
    label: string;
    items: Array<{ id: string; label: string; imageUrl?: string }>;
  }>;
};

export type GameRecordsSnapshotPayload = {
  records: Array<{
    gameId: string;
    metric: "score" | "seconds" | "wins" | "streak";
    value: number;
    achievedAt?: string;
  }>;
};

export type AnonymousShareSnapshot = {
  version: typeof SNAPSHOT_CONTRACT_VERSION;
  snapshotId: string;
  kind: SnapshotKind;
  owner: "blog.oiyo.net" | "game.oiyo.net";
  createdAt: string;
  expiresAt: string;
  payload: TierListSnapshotPayload | GameRecordsSnapshotPayload;
};

export type SnapshotValidationError =
  | "not_object"
  | "unknown_field"
  | "invalid_envelope"
  | "invalid_owner"
  | "invalid_ttl"
  | "payload_too_large"
  | "invalid_payload";

export type ValidationResult<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const SNAPSHOT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{15,63}$/;
const PAYLOAD_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const GAME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
const ENVELOPE_FIELDS = new Set([
  "version",
  "snapshotId",
  "kind",
  "owner",
  "createdAt",
  "expiresAt",
  "payload",
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOnlyFields = (value: Record<string, unknown>, fields: readonly string[]): boolean => {
  const allowed = new Set(fields);
  return Object.keys(value).every((key) => allowed.has(key));
};

const isIsoTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === value;
};

const isSafeLabel = (value: unknown, maxLength = 80): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function isTierListPayload(value: unknown): value is TierListSnapshotPayload {
  if (!isObject(value) || !hasOnlyFields(value, ["title", "tiers"]) || !Array.isArray(value.tiers)) return false;
  if (value.title !== undefined && !isSafeLabel(value.title, 120)) return false;
  if (value.tiers.length < 2 || value.tiers.length > 10) return false;

  const tierIds = new Set<string>();
  const itemIds = new Set<string>();
  let itemCount = 0;
  for (const tier of value.tiers) {
    if (!isObject(tier) || !hasOnlyFields(tier, ["id", "label", "items"])) return false;
    if (typeof tier.id !== "string" || !PAYLOAD_ID_PATTERN.test(tier.id) || tierIds.has(tier.id)) return false;
    if (!isSafeLabel(tier.label, 24) || !Array.isArray(tier.items)) return false;
    tierIds.add(tier.id);
    itemCount += tier.items.length;
    if (itemCount > 200) return false;
    for (const item of tier.items) {
      if (!isObject(item) || !hasOnlyFields(item, ["id", "label", "imageUrl"])) return false;
      if (typeof item.id !== "string" || !PAYLOAD_ID_PATTERN.test(item.id) || itemIds.has(item.id)) return false;
      if (!isSafeLabel(item.label)) return false;
      if (item.imageUrl !== undefined) {
        if (typeof item.imageUrl !== "string" || item.imageUrl.length > 400) return false;
        try {
          const parsed = new URL(item.imageUrl);
          if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
        } catch {
          return false;
        }
      }
      itemIds.add(item.id);
    }
  }
  return true;
}

function isGameRecordsPayload(value: unknown): value is GameRecordsSnapshotPayload {
  if (!isObject(value) || !hasOnlyFields(value, ["records"]) || !Array.isArray(value.records)) return false;
  if (value.records.length > 100) return false;
  const keys = new Set<string>();
  for (const record of value.records) {
    if (!isObject(record) || !hasOnlyFields(record, ["gameId", "metric", "value", "achievedAt"])) return false;
    if (typeof record.gameId !== "string" || !GAME_ID_PATTERN.test(record.gameId)) return false;
    if (!(["score", "seconds", "wins", "streak"] as unknown[]).includes(record.metric)) return false;
    if (typeof record.value !== "number" || !Number.isFinite(record.value) || record.value < 0) return false;
    if (record.achievedAt !== undefined && !isIsoTimestamp(record.achievedAt)) return false;
    const key = `${record.gameId}:${String(record.metric)}`;
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}

export function validateAnonymousShareSnapshot(
  input: unknown,
  nowMs = Date.now(),
): ValidationResult<AnonymousShareSnapshot, SnapshotValidationError> {
  if (!isObject(input)) return { ok: false, error: "not_object" };
  if (Object.keys(input).some((key) => !ENVELOPE_FIELDS.has(key))) return { ok: false, error: "unknown_field" };
  if (
    input.version !== SNAPSHOT_CONTRACT_VERSION ||
    typeof input.snapshotId !== "string" ||
    !SNAPSHOT_ID_PATTERN.test(input.snapshotId) ||
    (input.kind !== "tier-list.v1" && input.kind !== "game-records.v1") ||
    !isIsoTimestamp(input.createdAt) ||
    !isIsoTimestamp(input.expiresAt)
  ) {
    return { ok: false, error: "invalid_envelope" };
  }

  const expectedOwner = "game.oiyo.net";
  if (input.owner !== expectedOwner) return { ok: false, error: "invalid_owner" };

  const createdAt = Date.parse(input.createdAt);
  const expiresAt = Date.parse(input.expiresAt);
  if (
    createdAt > nowMs + 5 * 60_000 ||
    expiresAt <= Math.max(createdAt, nowMs) ||
    expiresAt - createdAt > MAX_SNAPSHOT_TTL_MS
  ) {
    return { ok: false, error: "invalid_ttl" };
  }
  if (byteLength(input) > MAX_SNAPSHOT_BYTES) return { ok: false, error: "payload_too_large" };

  const validPayload =
    input.kind === "tier-list.v1"
      ? isTierListPayload(input.payload)
      : isGameRecordsPayload(input.payload);
  if (!validPayload) return { ok: false, error: "invalid_payload" };
  return { ok: true, value: input as AnonymousShareSnapshot };
}

/** KV is an immutable share store: a key may be created once or deleted after expiry, never updated. */
export function canCreateImmutableSnapshot(existingValue: unknown): boolean {
  return existingValue === null || existingValue === undefined;
}

export function snapshotKvKey(snapshot: Pick<AnonymousShareSnapshot, "kind" | "snapshotId">): string {
  return `share:v1:${snapshot.kind}:${snapshot.snapshotId}`;
}
