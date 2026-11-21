import { describe, expect, it, vi } from "vitest";
import { createPlaySessionTracker, gameContextFromPath, PLAY_START_EVENT, sendPlayEvent } from "./play-telemetry";

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

describe("play start event", () => {
  it("announces the start once so the first-play coach can show", () => {
    const seen: string[] = [];
    const target = new EventTarget();
    target.addEventListener(PLAY_START_EVENT, (e) => seen.push((e as CustomEvent<{ gameId: string }>).detail.gameId));
    vi.stubGlobal("window", target);
    try {
      const tracker = createPlaySessionTracker(() => "/en/solitaire/", () => 0, () => true);
      tracker.start();
      tracker.start();
      expect(seen).toEqual(["solitaire"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
