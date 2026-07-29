/**
 * Client side of the balance-game vote batching.
 *
 * The server refuses one write per vote (see cloud-state/vote-tally.ts and the
 * 1,000 writes/day free KV baseline), so the browser accumulates votes locally
 * and ships them in batches. This module is the pure part: what is pending, when
 * to flush, and how to merge a flush back.
 *
 * Pending votes are persisted, not held only in memory: a player who answers
 * three prompts and closes the tab should still have those three counted on
 * their next visit rather than silently dropped.
 */

export const PENDING_STORAGE_KEY = "oiyo:bg:pending:v1";
/** Ship once this many local votes have piled up. Mirrors FLUSH_THRESHOLD. */
export const FLUSH_AT = 10;

export type PendingVotes = Record<number, { a: number; b: number }>;
export type VoteDelta = { promptId: number; a: number; b: number };

export function emptyPending(): PendingVotes {
  return {};
}

/** Reads persisted pending votes, discarding anything malformed. */
export function parsePending(raw: string | null): PendingVotes {
  if (!raw) return emptyPending();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptyPending();
    const out: PendingVotes = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number.parseInt(key, 10);
      if (!Number.isInteger(id) || id < 1) continue;
      const v = value as { a?: unknown; b?: unknown } | null;
      const a = Number.isInteger(v?.a) && (v!.a as number) >= 0 ? (v!.a as number) : 0;
      const b = Number.isInteger(v?.b) && (v!.b as number) >= 0 ? (v!.b as number) : 0;
      if (a + b > 0) out[id] = { a, b };
    }
    return out;
  } catch {
    return emptyPending();
  }
}

export function addVote(pending: PendingVotes, promptId: number, choice: "a" | "b"): PendingVotes {
  const current = pending[promptId] ?? { a: 0, b: 0 };
  return {
    ...pending,
    [promptId]: choice === "a" ? { a: current.a + 1, b: current.b } : { a: current.a, b: current.b + 1 },
  };
}

export function pendingCount(pending: PendingVotes): number {
  return Object.values(pending).reduce((sum, v) => sum + v.a + v.b, 0);
}

export function shouldFlush(pending: PendingVotes, threshold = FLUSH_AT): boolean {
  return pendingCount(pending) >= threshold;
}

/** Shapes pending votes into the request body the endpoint validates. */
export function toDeltas(pending: PendingVotes): VoteDelta[] {
  return Object.entries(pending)
    .map(([id, v]) => ({ promptId: Number.parseInt(id, 10), a: v.a, b: v.b }))
    .filter((d) => Number.isInteger(d.promptId) && d.a + d.b > 0)
    .sort((x, y) => x.promptId - y.promptId);
}

/**
 * Removes the votes a flush actually carried, keeping anything cast while the
 * request was in flight. Subtracting the sent amounts rather than clearing
 * wholesale is what stops a mid-flight vote from being lost.
 */
export function removeFlushed(pending: PendingVotes, sent: VoteDelta[]): PendingVotes {
  const out: PendingVotes = {};
  const bySent = new Map(sent.map((d) => [d.promptId, d]));
  for (const [key, value] of Object.entries(pending)) {
    const id = Number.parseInt(key, 10);
    const s = bySent.get(id);
    const a = Math.max(0, value.a - (s?.a ?? 0));
    const b = Math.max(0, value.b - (s?.b ?? 0));
    if (a + b > 0) out[id] = { a, b };
  }
  return out;
}

/**
 * Merges the player's own unflushed votes into the server figures, so the split
 * they see already includes the choice they just made instead of appearing to
 * ignore it until the next flush.
 */
export function withLocalPending(
  serverTally: { a: number; b: number },
  pendingForPrompt: { a: number; b: number } | undefined,
): { a: number; b: number } {
  if (!pendingForPrompt) return serverTally;
  return { a: serverTally.a + pendingForPrompt.a, b: serverTally.b + pendingForPrompt.b };
}
