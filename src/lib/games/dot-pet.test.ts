import { describe, expect, it } from "vitest";
import { explainDotPetAction } from "./dot-pet";

describe("dot pet action reasons", () => {
  const ready = { hunger: 50, energy: 50 };

  it("allows a normal care action", () => {
    expect(explainDotPetAction(ready, "feed")).toBeNull();
    expect(explainDotPetAction(ready, "play")).toBeNull();
    expect(explainDotPetAction(ready, "rest")).toBeNull();
  });

  it("names full, tired, and already-rested without needing UI", () => {
    expect(explainDotPetAction({ hunger: 100, energy: 50 }, "feed")).toBe("full");
    expect(explainDotPetAction({ hunger: 50, energy: 10 }, "play")).toBe("tired");
    expect(explainDotPetAction({ hunger: 50, energy: 100 }, "rest")).toBe("rested");
  });
});
