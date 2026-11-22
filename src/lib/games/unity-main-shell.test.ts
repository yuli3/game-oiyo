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
