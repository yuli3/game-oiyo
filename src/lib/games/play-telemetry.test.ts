import { describe, expect, it } from "vitest";
import { createPlaySessionTracker, gameContextFromPath, sendPlayEvent } from "./play-telemetry";

describe("gameContextFromPath", () => {
  it("reads locale prefix and slug", () => {
    expect(gameContextFromPath("/en/aim-trainer/")).toEqual({ gameId: "aim-trainer", locale: "en" });
    expect(gameContextFromPath("/aim-trainer/")).toEqual({ gameId: "aim-trainer", locale: "ko" });
    expect(gameContextFromPath("/")).toEqual({ gameId: "home", locale: "ko" });
  });
});

describe("sendPlayEvent", () => {
  it("is a no-op without gtag", () => {
    expect(sendPlayEvent("x", {}, {} as Window)).toBe(false);
  });
  it("calls gtag event", () => {
    const calls: unknown[][] = [];
    const win = { gtag: (...a: unknown[]) => calls.push(a) } as unknown as Window;
    expect(sendPlayEvent("game_session_start", { game_id: "a" }, win)).toBe(true);
    expect(calls).toEqual([["event", "game_session_start", { game_id: "a" }]]);
  });
});

describe("createPlaySessionTracker", () => {
  it("pairs start and end with a duration and ignores repeats", () => {
    const sent: Array<[string, Record<string, unknown>]> = [];
    let t = 1000;
    const tr = createPlaySessionTracker(() => "/ja/tile-rummy/", () => t, (n, p) => { sent.push([n, p]); return true; });
    tr.end("exit");
    tr.start();
    tr.start();
    t = 43_400;
    tr.end("exit");
    tr.end("unmount");
    expect(sent.map((s) => s[0])).toEqual(["game_session_start", "game_session_end"]);
    expect(sent[1][1]).toMatchObject({ game_id: "tile-rummy", locale: "ja", duration_s: 42, reason: "exit" });
  });
});
