import { describe, expect, it } from "vitest";
import {
  DAILY_WRITE_LIMIT, MAX_DELTA_PER_FLUSH,
  flushDeltas, parseTally, readTallies, tallyKvKey, tallyPercentages,
  utcDayKey, validateDeltas, writeCounterKey, type TallyKv,
} from "./vote-tally";

function fakeKv(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const writes: string[] = [];
  const kv: TallyKv = {
    async get(key) { return store.get(key) ?? null; },
    async put(key, value) { writes.push(key); store.set(key, value); },
  };
  return { kv, store, writes };
}

const NOW = new Date("2026-07-30T04:00:00Z");

describe("validateDeltas", () => {
  it("accepts a well-formed batch", () => {
    const r = validateDeltas([{ promptId: 1, a: 3, b: 2 }]);
    expect(r.ok).toBe(true);
  });

  it("rejects non-arrays and empty batches", () => {
    expect(validateDeltas(null).ok).toBe(false);
    expect(validateDeltas([]).ok).toBe(false);
  });

  it("rejects duplicate promptIds", () => {
    // Two entries for one prompt would double-charge the write budget while
    // only the last write survives.
    const r = validateDeltas([{ promptId: 5, a: 1, b: 0 }, { promptId: 5, a: 1, b: 0 }]);
    expect(r.ok).toBe(false);
  });

  it("rejects negative and zero-sum deltas", () => {
    expect(validateDeltas([{ promptId: 1, a: -1, b: 2 }]).ok).toBe(false);
    expect(validateDeltas([{ promptId: 1, a: 0, b: 0 }]).ok).toBe(false);
  });

  it("caps how far one caller can skew a prompt", () => {
    const ok = validateDeltas([{ promptId: 1, a: MAX_DELTA_PER_FLUSH, b: 0 }]);
    expect(ok.ok).toBe(true);
    const tooBig = validateDeltas([{ promptId: 1, a: MAX_DELTA_PER_FLUSH + 1, b: 0 }]);
    expect(tooBig.ok).toBe(false);
  });

  it("rejects non-integer promptIds", () => {
    expect(validateDeltas([{ promptId: 1.5, a: 1, b: 0 }]).ok).toBe(false);
    expect(validateDeltas([{ promptId: 0, a: 1, b: 0 }]).ok).toBe(false);
  });
});

describe("parseTally", () => {
  it("returns zeros for missing or corrupt values", () => {
    expect(parseTally(null)).toEqual({ a: 0, b: 0 });
    expect(parseTally("not json")).toEqual({ a: 0, b: 0 });
    expect(parseTally("[1,2]")).toEqual({ a: 0, b: 0 });
  });

  it("floors and clamps hostile numbers", () => {
    expect(parseTally('{"a":2.7,"b":-5}')).toEqual({ a: 2, b: 0 });
  });
});

describe("flushDeltas", () => {
  it("fails closed without a KV binding", async () => {
    const r = await flushDeltas(undefined, [{ promptId: 1, a: 1, b: 0 }], NOW);
    expect(r).toEqual({ ok: false, error: "kv_unbound" });
  });

  it("adds to existing counts", async () => {
    const { kv } = fakeKv({ [tallyKvKey(3)]: JSON.stringify({ a: 10, b: 5 }) });
    const r = await flushDeltas(kv, [{ promptId: 3, a: 2, b: 1 }], NOW);
    expect(r.ok && r.tallies[3]).toEqual({ a: 12, b: 6 });
    expect(r.ok && r.applied).toBe(3);
  });

  it("charges one write per prompt plus one for the counter", async () => {
    const { kv, store } = fakeKv();
    await flushDeltas(kv, [{ promptId: 1, a: 1, b: 0 }, { promptId: 2, a: 0, b: 1 }], NOW);
    expect(store.get(writeCounterKey(utcDayKey(NOW)))).toBe("3");
  });

  it("refuses once the daily budget would be exceeded", async () => {
    const { kv } = fakeKv({ [writeCounterKey(utcDayKey(NOW))]: String(DAILY_WRITE_LIMIT) });
    const r = await flushDeltas(kv, [{ promptId: 1, a: 1, b: 0 }], NOW);
    expect(r).toEqual({ ok: false, error: "budget_exhausted" });
  });

  it("increments the counter before writing tallies so a counter failure fails closed", async () => {
    const { kv, writes } = fakeKv();
    await flushDeltas(kv, [{ promptId: 7, a: 1, b: 0 }], NOW);
    expect(writes[0]).toBe(writeCounterKey(utcDayKey(NOW)));
    expect(writes[1]).toBe(tallyKvKey(7));
  });

  it("does not write tallies when the counter write throws", async () => {
    const store = new Map<string, string>();
    const tallyWrites: string[] = [];
    const kv: TallyKv = {
      async get(k) { return store.get(k) ?? null; },
      async put(k) {
        if (k.startsWith("bg:writes:")) throw new Error("kv down");
        tallyWrites.push(k);
      },
    };
    const r = await flushDeltas(kv, [{ promptId: 1, a: 1, b: 0 }], NOW);
    expect(r).toEqual({ ok: false, error: "budget_unavailable" });
    expect(tallyWrites).toEqual([]);
  });

  it("treats a corrupt counter as zero rather than blocking play", async () => {
    const { kv } = fakeKv({ [writeCounterKey(utcDayKey(NOW))]: "garbage" });
    const r = await flushDeltas(kv, [{ promptId: 1, a: 1, b: 0 }], NOW);
    expect(r.ok).toBe(true);
  });

  it("keeps separate budgets per UTC day", async () => {
    const { kv, store } = fakeKv();
    await flushDeltas(kv, [{ promptId: 1, a: 1, b: 0 }], new Date("2026-07-30T23:59:00Z"));
    await flushDeltas(kv, [{ promptId: 1, a: 1, b: 0 }], new Date("2026-07-31T00:01:00Z"));
    expect(store.get(writeCounterKey("2026-07-30"))).toBe("2");
    expect(store.get(writeCounterKey("2026-07-31"))).toBe("2");
  });

  it("rejects an invalid payload without spending budget", async () => {
    const { kv, writes } = fakeKv();
    const r = await flushDeltas(kv, [{ promptId: 1, a: 0, b: 0 }], NOW);
    expect(r.ok).toBe(false);
    expect(writes).toEqual([]);
  });
});

describe("readTallies", () => {
  it("fails closed without a binding", async () => {
    expect(await readTallies(undefined, [1])).toEqual({ ok: false, error: "kv_unbound" });
  });

  it("returns zeros for prompts nobody has voted on", async () => {
    const { kv } = fakeKv();
    const r = await readTallies(kv, [1, 2]);
    expect(r.ok && r.tallies).toEqual({ 1: { a: 0, b: 0 }, 2: { a: 0, b: 0 } });
  });

  it("rejects malformed requests", async () => {
    const { kv } = fakeKv();
    expect((await readTallies(kv, [])).ok).toBe(false);
    expect((await readTallies(kv, [0])).ok).toBe(false);
    expect((await readTallies(kv, Array.from({ length: 69 }, (_, i) => i + 1))).ok).toBe(false);
  });

  it("never writes", async () => {
    const { kv, writes } = fakeKv();
    await readTallies(kv, [1, 2, 3]);
    expect(writes).toEqual([]);
  });
});

describe("tallyPercentages", () => {
  it("returns null before anyone has voted", () => {
    // A rendered 50/50 on zero votes would be a fabricated statistic.
    expect(tallyPercentages({ a: 0, b: 0 })).toBeNull();
  });

  it("always sums to 100", () => {
    for (const [a, b] of [[1, 2], [1, 0], [7, 3], [1, 999], [333, 667]]) {
      const p = tallyPercentages({ a, b })!;
      expect(p.a + p.b).toBe(100);
    }
  });

  it("reports the raw total alongside the split", () => {
    expect(tallyPercentages({ a: 3, b: 1 })).toEqual({ a: 75, b: 25, total: 4 });
  });
});
