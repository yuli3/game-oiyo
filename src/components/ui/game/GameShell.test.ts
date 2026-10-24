import { describe, expect, it } from "vitest";
import { GameShell } from "./GameShell";
import { GameContainer, PlayingCard, Die } from "./GamePrimitives";

describe("GameShell Component & Primitives Exports", () => {
  it("exports GameShell function component cleanly", () => {
    expect(typeof GameShell).toBe("function");
    expect(typeof GameContainer).toBe("function");
    expect(typeof PlayingCard).toBe("function");
    expect(typeof Die).toBe("function");
  });
});
