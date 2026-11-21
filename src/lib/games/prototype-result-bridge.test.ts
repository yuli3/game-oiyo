import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPhaseReporter, parsePrototypeResult, savePrototypeResult } from "./prototype-result-bridge";
import { getBest, getRecord } from "./records";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

describe("parsePrototypeResult", () => {
  it("accepts only well-formed results for the game on this page", () => {
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "whale-city", outcome: "w", score: 812.4 }, "whale-city"))
      .toEqual({ slug: "whale-city", outcome: "w", score: 812 });
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "echo-shift", outcome: "w" }, "whale-city")).toBeNull();
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "firefly-keeper", outcome: "win", score: 3 }, "firefly-keeper"))
      .toEqual({ slug: "firefly-keeper", outcome: "w", score: 3 });
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "firefly-keeper", outcome: "loss", score: 0 }, "firefly-keeper"))
      .toEqual({ slug: "firefly-keeper", outcome: "l" });
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "whale-city", outcome: "victory" }, "whale-city")).toBeNull();
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "whale-city", outcome: "toString" }, "whale-city")).toBeNull();
    expect(parsePrototypeResult({ type: "other", slug: "whale-city", outcome: "w" }, "whale-city")).toBeNull();
    expect(parsePrototypeResult("w", "whale-city")).toBeNull();
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "whale-city", outcome: "l", score: -5 }, "whale-city"))
      .toEqual({ slug: "whale-city", outcome: "l" });
    expect(parsePrototypeResult({ type: "oiyo:game-result", slug: "whale-city", outcome: "l", score: Infinity }, "whale-city"))
      .toEqual({ slug: "whale-city", outcome: "l" });
  });
});

describe("savePrototypeResult", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  it("saves the result and a score best", () => {
    savePrototypeResult({ slug: "disaster-control", outcome: "w", score: 240 });
    savePrototypeResult({ slug: "disaster-control", outcome: "l" });
    expect(getRecord("disaster-control")).toEqual({ w: 1, l: 1, d: 0 });
    expect(getBest("disaster-control")).toMatchObject({ value: 240, unit: "score" });
  });
});

describe("createPhaseReporter", () => {
  it("skips the first phase, then reports each move into an ending once", () => {
    const sent: Record<string, unknown>[] = [];
    const report = createPhaseReporter("echo-shift", { escaped: "w", caught: "l" }, (m) => sent.push(m));
    report("escaped"); // restored finished run on load
    report("playing");
    report("playing");
    report("caught", 3);
    report("caught", 3);
    report("playing");
    report("escaped");
    expect(sent).toEqual([
      { type: "oiyo:game-result", slug: "echo-shift", outcome: "l", score: 3 },
      { type: "oiyo:game-result", slug: "echo-shift", outcome: "w" },
    ]);
  });
});
