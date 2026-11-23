import { describe, expect, it } from "vitest";
import { FIELD_H, FIELD_W, LAYOUTS, STAGE_COUNT, isPenned, newHerd, pilotTarget, setDogTarget, starsFor, stepHerd } from "./sheep-herd";

describe("sheep-herd", () => {
  it("has 30 fields that grow harder", () => {
    expect(LAYOUTS).toHaveLength(STAGE_COUNT);
    expect(LAYOUTS[29].sheep).toBeGreaterThan(LAYOUTS[0].sheep);
    expect(LAYOUTS[29].gate.x1 - LAYOUTS[29].gate.x0).toBeLessThan(LAYOUTS[0].gate.x1 - LAYOUTS[0].gate.x0);
    expect(LAYOUTS[0].goats).toBe(0);
    expect(LAYOUTS[29].goats).toBeGreaterThan(0);
  });

  it("no sheep starts inside the pen or off the field", () => {
    for (let s = 0; s < STAGE_COUNT; s++) {
      const h = newHerd(s, 3);
      expect(h.sheep).toHaveLength(LAYOUTS[s].sheep + LAYOUTS[s].goats);
      for (const sh of h.sheep) {
        expect(isPenned(h.layout, sh)).toBe(false);
        expect(sh.x).toBeGreaterThan(0);
        expect(sh.x).toBeLessThan(FIELD_W);
        expect(sh.y).toBeLessThan(FIELD_H);
      }
    }
  });

  it("a simple herding dog pens every flock in time", () => {
    for (let s = 0; s < STAGE_COUNT; s++) {
      for (let seed = 0; seed < 4; seed++) {
        const h = newHerd(s, 100 + seed * 37 + s);
        while (!h.over) {
          setDogTarget(h, pilotTarget(h));
          stepHerd(h, 1 / 60);
        }
        expect(h.won, `stage ${s} seed ${seed}`).toBe(true);
      }
    }
  }, 60000);

  it("an idle dog pens nobody", () => {
    const h = newHerd(5, 1);
    while (!h.over) stepHerd(h, 1 / 30);
    expect(h.won).toBe(false);
    expect(h.sheep.filter((s) => s.penned)).toHaveLength(0);
  });

  it("the dog never enters the pen strip", () => {
    const h = newHerd(0, 1);
    setDogTarget(h, { x: 180, y: 20 });
    for (let k = 0; k < 300; k++) stepHerd(h, 1 / 60);
    expect(h.dog.y).toBeGreaterThan(h.layout.gate.y);
  });

  it("stars by time", () => {
    expect(starsFor(20, 60)).toBe(3);
    expect(starsFor(40, 60)).toBe(2);
    expect(starsFor(55, 60)).toBe(1);
  });
});
