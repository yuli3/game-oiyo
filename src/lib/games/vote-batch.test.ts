import { describe, expect, it } from "vitest";
import {
  FLUSH_AT, addVote, emptyPending, parsePending, pendingCount,
  removeFlushed, shouldFlush, toDeltas, withLocalPending,
} from "./vote-batch";

describe("parsePending", () => {
  it("returns empty for missing or malformed storage", () => {
    expect(parsePending(null)).toEqual({});
    expect(parsePending("nope")).toEqual({});
    expect(parsePending("[1,2]")).toEqual({});
  });

  it("drops entries that are not usable votes", () => {
    const raw = JSON.stringify({ "1": { a: 2, b: 1 }, "x": { a: 1, b: 0 }, "3": { a: 0, b: 0 }, "4": { a: -1, b: 2 } });
    expect(parsePending(raw)).toEqual({ 1: { a: 2, b: 1 }, 4: { a: 0, b: 2 } });
  });
});

describe("addVote", () => {
  it("accumulates per prompt and choice", () => {
    let p = emptyPending();
    p = addVote(p, 7, "a");
    p = addVote(p, 7, "a");
    p = addVote(p, 7, "b");
    expect(p[7]).toEqual({ a: 2, b: 1 });
  });

  it("does not mutate the input", () => {
    const before = { 1: { a: 1, b: 0 } };
    const after = addVote(before, 1, "b");
    expect(before[1]).toEqual({ a: 1, b: 0 });
    expect(after[1]).toEqual({ a: 1, b: 1 });
  });
});

describe("shouldFlush", () => {
  it("waits until the threshold is reached", () => {
    let p = emptyPending();
    for (let i = 1; i < FLUSH_AT; i++) p = addVote(p, i, "a");
    expect(shouldFlush(p)).toBe(false);
    p = addVote(p, FLUSH_AT, "a");
    expect(shouldFlush(p)).toBe(true);
  });

  it("counts votes, not prompts", () => {
    // Ten votes on one prompt is still a flush — otherwise a player replaying a
    // single prompt would never ship anything.
    let p = emptyPending();
    for (let i = 0; i < FLUSH_AT; i++) p = addVote(p, 1, "b");
    expect(pendingCount(p)).toBe(FLUSH_AT);
    expect(shouldFlush(p)).toBe(true);
  });
});

describe("toDeltas", () => {
  it("sorts by promptId and drops empties", () => {
    const deltas = toDeltas({ 9: { a: 1, b: 0 }, 2: { a: 0, b: 3 }, 5: { a: 0, b: 0 } });
    expect(deltas).toEqual([{ promptId: 2, a: 0, b: 3 }, { promptId: 9, a: 1, b: 0 }]);
  });
});

describe("removeFlushed", () => {
  it("subtracts only what was sent", () => {
    const pending = { 1: { a: 3, b: 1 }, 2: { a: 0, b: 2 } };
    const sent = [{ promptId: 1, a: 3, b: 1 }];
    expect(removeFlushed(pending, sent)).toEqual({ 2: { a: 0, b: 2 } });
  });

  it("keeps votes cast while the request was in flight", () => {
    // The player voted twice more on prompt 1 after the batch was built; those
    // must survive the flush rather than being cleared with everything else.
    const atSend = [{ promptId: 1, a: 1, b: 0 }];
    const nowPending = { 1: { a: 3, b: 0 } };
    expect(removeFlushed(nowPending, atSend)).toEqual({ 1: { a: 2, b: 0 } });
  });

  it("never goes negative if the server echoes more than we hold", () => {
    expect(removeFlushed({ 1: { a: 1, b: 0 } }, [{ promptId: 1, a: 5, b: 5 }])).toEqual({});
  });
});

describe("withLocalPending", () => {
  it("returns the server figure when nothing is pending", () => {
    expect(withLocalPending({ a: 10, b: 5 }, undefined)).toEqual({ a: 10, b: 5 });
  });

  it("includes the vote the player just cast", () => {
    // Without this the split would appear to ignore their own choice until the
    // next flush, which reads as the feature being broken.
    expect(withLocalPending({ a: 10, b: 5 }, { a: 1, b: 0 })).toEqual({ a: 11, b: 5 });
  });
});
