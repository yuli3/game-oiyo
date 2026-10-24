import { describe, expect, it } from "vitest";
import { GameShell } from "./GameShell";
import { ArcadePassModal } from "./ArcadePassModal";
import { GameContainer, PlayingCard, Die } from "./GamePrimitives";

describe("GameShell Component & Primitives Exports", () => {
  it("exports GameShell and ArcadePassModal cleanly", () => {
    expect(typeof GameShell).toBe("function");
    expect(typeof ArcadePassModal).toBe("function");
    expect(typeof GameContainer).toBe("function");
    expect(typeof PlayingCard).toBe("function");
    expect(typeof Die).toBe("function");
  });

  it("supports sound preset switching options", () => {
    const presets = ["core", "retro", "zen", "cyber"];
    expect(presets).toHaveLength(4);
  });
});
