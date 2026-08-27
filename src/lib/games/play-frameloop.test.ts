import { describe, expect, it } from "vitest";
import { playFrameloop } from "./play-frameloop";

describe("playFrameloop", () => {
  it("runs WebGL only while the game is active and the tab is visible", () => {
    expect(playFrameloop(true, false)).toBe("always");
    expect(playFrameloop(true, true)).toBe("never");
    expect(playFrameloop(false, false)).toBe("never");
    expect(playFrameloop(false, true)).toBe("never");
  });
});
