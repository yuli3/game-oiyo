import { describe, expect, it } from "vitest";
import { fill, parseShellMessage, parseShellResult } from "./unity-main-shell";

describe("parseShellMessage", () => {
  it("reads progress and clamps it", () => {
    expect(parseShellMessage({ type: "oiyo:unity-progress", value: 0.42 })).toEqual({ kind: "progress", value: 0.42 });
    expect(parseShellMessage({ type: "oiyo:unity-progress", value: 3 })).toEqual({ kind: "progress", value: 1 });
    expect(parseShellMessage({ type: "oiyo:unity-progress", value: Number.NaN })).toBeNull();
  });
  it("reads ready and error", () => {
    expect(parseShellMessage({ type: "oiyo:unity-ready" })).toEqual({ kind: "ready" });
    expect(parseShellMessage({ type: "oiyo:unity-error", message: "x".repeat(400) })).toEqual({ kind: "error", message: "x".repeat(300) });
    expect(parseShellMessage({ type: "oiyo:unity-error" })).toEqual({ kind: "error", message: "" });
  });
  it("ignores other data", () => {
    expect(parseShellMessage(null)).toBeNull();
    expect(parseShellMessage("oiyo:unity-ready")).toBeNull();
    expect(parseShellMessage({ type: "oiyo:game-result", slug: "a", outcome: "w" })).toBeNull();
  });
});

describe("parseShellResult", () => {
  it("accepts the page slug or the build folder and saves under the page slug", () => {
    expect(parseShellResult({ type: "oiyo:game-result", slug: "suika-drop", outcome: "win", score: 12.4 }, "suika-drop", "suika-drop-unity"))
      .toEqual({ slug: "suika-drop", outcome: "w", score: 12 });
    expect(parseShellResult({ type: "oiyo:game-result", slug: "suika-drop-unity", outcome: "loss" }, "suika-drop", "suika-drop-unity"))
      .toEqual({ slug: "suika-drop", outcome: "l" });
  });
  it("rejects another game's result", () => {
    expect(parseShellResult({ type: "oiyo:game-result", slug: "brick-breaker", outcome: "w" }, "suika-drop", "suika-drop-unity")).toBeNull();
  });
});

describe("fill", () => {
  it("replaces known keys and keeps unknown ones", () => {
    expect(fill("내 최고 {v} · {n}판", { v: "1,200점", n: 3 })).toBe("내 최고 1,200점 · 3판");
    expect(fill("{x}", {})).toBe("{x}");
  });
});

describe("saveUnityResult", () => {
  it("keeps Unity bests apart from the quick-play best", async () => {
    const store = new Map<string, string>();
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 };
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
    const records = await import("./records");
    const { saveUnityResult, UNITY_BEST_CONDITIONS } = await import("./unity-main-shell");
    records.recordBest("grid-clear", 50, "score");
    expect(saveUnityResult({ slug: "grid-clear", outcome: "w", score: 900 })).toBe(0);
    expect(saveUnityResult({ slug: "grid-clear", outcome: "l", score: 400 })).toBe(900);
    expect(records.getBest("grid-clear")?.value).toBe(50);
    expect(records.getBestForConditions("grid-clear", UNITY_BEST_CONDITIONS)?.value).toBe(900);
    expect(records.getRecord("grid-clear")).toEqual({ w: 1, l: 1, d: 0 });
  });
});
