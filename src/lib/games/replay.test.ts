import { beforeEach, describe, expect, it } from "vitest";
import { createReplayEnvelope, isReplayEnvelope, loadReplayEnvelope, replayFingerprintHash, saveReplayEnvelope, verifyReplayEnvelope } from "./replay";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); }, clear: () => data.clear(), key: index => [...data.keys()][index] ?? null, get length() { return data.size; } } as Storage;
}

beforeEach(() => { (globalThis as { localStorage?: Storage }).localStorage = memoryStorage(); });

describe("ReplayEnvelope v1", () => {
  it("creates, hashes, saves, and loads a bounded envelope", () => {
    const envelope = createReplayEnvelope({ game: "demo", rulesetVersion: "r1", seed: 7, stepSeconds: 1 / 60, inputLog: [{ tick: 2, input: { x: 3 } }], finalTick: 5, finalFingerprint: "state-five", achievedAt: "2026-08-21T00:00:00.000Z" });
    expect(envelope.finalHash).toBe(replayFingerprintHash("state-five"));
    expect(isReplayEnvelope(envelope, "demo")).toBe(true);
    expect(saveReplayEnvelope(envelope)).toBe(true);
    expect(loadReplayEnvelope("demo")).toEqual(envelope);
    expect(verifyReplayEnvelope(envelope, () => "state-five")).toBe(true);
    expect(verifyReplayEnvelope(envelope, () => "drifted")).toBe(false);
  });

  it("rejects corrupt, out-of-order, and oversized logs", () => {
    const base = createReplayEnvelope({ game: "demo", rulesetVersion: "r1", seed: 7, stepSeconds: 1 / 60, inputLog: [], finalTick: 5, finalFingerprint: "x" });
    expect(isReplayEnvelope({ ...base, finalHash: "not-a-hash" }, "demo")).toBe(false);
    expect(isReplayEnvelope({ ...base, inputLog: [{ tick: 3, input: {} }, { tick: 2, input: {} }] }, "demo")).toBe(false);
    expect(isReplayEnvelope({ ...base, inputLog: Array.from({ length: 50_001 }, (_, tick) => ({ tick: 0, input: tick })) }, "demo")).toBe(false);
  });
});
