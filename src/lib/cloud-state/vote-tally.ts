/**
 * Balance-game vote tallies.
 *
 * ## Why this is not one KV write per vote
 *
 * The documented free baseline (see CLOUDFLARE_KV_FREE_BASELINE in
 * snapshot-contract.ts, verified 2026-07-18) is **1,000 KV writes per day**, and
 * that budget is shared with the anonymous-share feature. One write per vote
 * would exhaust the whole account at 1,000 votes — a number this game can reach
 * in an afternoon — and would take share snapshots down with it.
 *
 * Durable Objects would be the natural fit for a hot counter, but the DO worker
 * in `workers/multiplayer-room` is deliberately undeployed pending a cost gate,
 * so this must live inside the KV budget.
 *
 * ## The shape that fits
 *
 * Votes are **batched client-side and flushed as deltas**. A flush carries N
 * votes in a single write, so the write cost is votes/N rather than votes. With
 * FLUSH_THRESHOLD = 10 and DAILY_WRITE_LIMIT = 300, capacity is ~3,000 votes/day
 * while leaving 700 writes/day for sharing and headroom.
 *
 * Consequences accepted on purpose:
 * - Counts are **approximate**. Read-modify-write races drop concurrent deltas,
 *   and unflushed local votes are invisible to others. For "what did everyone
 *   else pick" this is fine; it must never be presented as an exact figure.
 * - When the daily budget is spent, writes stop but **reads keep working**. The
 *   player still sees the distribution and their own choice; only the global
 *   count stops advancing until the next UTC day.
 */

export const FLUSH_THRESHOLD = 10;
export const DAILY_WRITE_LIMIT = 300;
export const TALLY_TTL_SECONDS = 180 * 24 * 60 * 60;
export const MAX_DELTA_PER_FLUSH = 200;
export const WRITE_COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;

export type TallyKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

/** Stored shape. Kept tiny — one of these exists per prompt, for 68 prompts. */
export type PromptTally = { a: number; b: number };

export type VoteDelta = { promptId: number; a: number; b: number };

export type FlushError = "kv_unbound" | "invalid_payload" | "budget_exhausted" | "budget_unavailable";

export type FlushResult =
  | { ok: true; applied: number; tallies: Record<number, PromptTally> }
  | { ok: false; error: FlushError; detail?: string };

export function tallyKvKey(promptId: number): string {
  return `bg:tally:v1:${promptId}`;
}

export function writeCounterKey(utcDay: string): string {
  return `bg:writes:v1:${utcDay}`;
}

export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function emptyTally(): PromptTally {
  return { a: 0, b: 0 };
}

/** Parses stored JSON defensively — a corrupt value must not break the game. */
export function parseTally(raw: string | null): PromptTally {
  if (!raw) return emptyTally();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyTally();
    const { a, b } = parsed as Partial<PromptTally>;
    return {
      a: Number.isFinite(a) && (a as number) >= 0 ? Math.floor(a as number) : 0,
      b: Number.isFinite(b) && (b as number) >= 0 ? Math.floor(b as number) : 0,
    };
  } catch {
    return emptyTally();
  }
}

/**
 * Validates a client-supplied batch. Deltas arrive from the browser, so they are
 * capped rather than trusted: a single request cannot inflate a prompt by more
 * than MAX_DELTA_PER_FLUSH, which bounds how far one caller can skew a ratio.
 */
export function validateDeltas(input: unknown): { ok: true; deltas: VoteDelta[] } | { ok: false; detail: string } {
  if (!Array.isArray(input)) return { ok: false, detail: "deltas must be an array" };
  if (input.length === 0) return { ok: false, detail: "deltas must not be empty" };
  if (input.length > 68) return { ok: false, detail: "too many prompts in one flush" };

  const seen = new Set<number>();
  const deltas: VoteDelta[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { ok: false, detail: "delta must be an object" };
    const { promptId, a, b } = raw as Partial<VoteDelta>;
    if (!Number.isInteger(promptId) || (promptId as number) < 1) return { ok: false, detail: "promptId must be a positive integer" };
    if (seen.has(promptId as number)) return { ok: false, detail: `duplicate promptId ${promptId}` };
    seen.add(promptId as number);
    const av = Number.isInteger(a) ? (a as number) : 0;
    const bv = Number.isInteger(b) ? (b as number) : 0;
    if (av < 0 || bv < 0) return { ok: false, detail: "counts must not be negative" };
    if (av + bv === 0) return { ok: false, detail: "delta must carry at least one vote" };
    if (av > MAX_DELTA_PER_FLUSH || bv > MAX_DELTA_PER_FLUSH) return { ok: false, detail: "delta exceeds per-flush cap" };
    deltas.push({ promptId: promptId as number, a: av, b: bv });
  }
  return { ok: true, deltas };
}

/**
 * Applies a batch and returns the updated tallies.
 *
 * The write counter is incremented **before** the tally writes, so a counter
 * failure fails closed rather than letting an unbounded number of tally writes
 * through — the same ordering share-endpoint.ts uses for the same reason.
 */
export async function flushDeltas(
  kv: TallyKv | undefined,
  input: unknown,
  now: Date = new Date(),
): Promise<FlushResult> {
  if (!kv) return { ok: false, error: "kv_unbound" };

  const validated = validateDeltas(input);
  if (!validated.ok) return { ok: false, error: "invalid_payload", detail: validated.detail };
  const { deltas } = validated;

  const counterKey = writeCounterKey(utcDayKey(now));
  let used: number;
  try {
    used = Number.parseInt((await kv.get(counterKey)) ?? "0", 10);
    if (!Number.isFinite(used) || used < 0) used = 0;
  } catch {
    return { ok: false, error: "budget_unavailable" };
  }

  // Each prompt in the batch costs one tally write, plus one counter write.
  const cost = deltas.length + 1;
  if (used + cost > DAILY_WRITE_LIMIT) return { ok: false, error: "budget_exhausted" };

  try {
    await kv.put(counterKey, String(used + cost), { expirationTtl: WRITE_COUNTER_TTL_SECONDS });
  } catch {
    return { ok: false, error: "budget_unavailable" };
  }

  const tallies: Record<number, PromptTally> = {};
  let applied = 0;
  for (const delta of deltas) {
    const key = tallyKvKey(delta.promptId);
    const current = parseTally(await kv.get(key));
    const next: PromptTally = { a: current.a + delta.a, b: current.b + delta.b };
    await kv.put(key, JSON.stringify(next), { expirationTtl: TALLY_TTL_SECONDS });
    tallies[delta.promptId] = next;
    applied += delta.a + delta.b;
  }

  return { ok: true, applied, tallies };
}

export type ReadResult =
  | { ok: true; tallies: Record<number, PromptTally> }
  | { ok: false; error: "kv_unbound" | "invalid_request" };

/** Reads tallies for the requested prompts. Reads are cheap (100k/day). */
export async function readTallies(
  kv: TallyKv | undefined,
  promptIds: number[],
): Promise<ReadResult> {
  if (!kv) return { ok: false, error: "kv_unbound" };
  if (!Array.isArray(promptIds) || promptIds.length === 0 || promptIds.length > 68) {
    return { ok: false, error: "invalid_request" };
  }
  if (!promptIds.every((id) => Number.isInteger(id) && id >= 1)) {
    return { ok: false, error: "invalid_request" };
  }

  const tallies: Record<number, PromptTally> = {};
  for (const id of promptIds) {
    tallies[id] = parseTally(await kv.get(tallyKvKey(id)));
  }
  return { ok: true, tallies };
}

/**
 * Percentage split for display. Returns null when nobody has voted yet so the UI
 * can say "be the first" instead of rendering a meaningless 50/50.
 */
export function tallyPercentages(tally: PromptTally): { a: number; b: number; total: number } | null {
  const total = tally.a + tally.b;
  if (total === 0) return null;
  const a = Math.round((tally.a / total) * 100);
  return { a, b: 100 - a, total };
}
