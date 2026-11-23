import { describe, expect, it } from "vitest";
import { COURSES, COURSE_COUNT, FIELD_W, SPECS, autopilot, finalTime, newRun, pathX, starsFor, stepRun } from "./snow-sled";

function ride(index: number, drive: boolean) {
  const r = newRun(COURSES[index]);
  let guard = 0;
  while (!r.finished && guard < 60 * 180) {
    if (drive) autopilot(r);
    stepRun(r, 1 / 60);
    guard += 1;
  }
  return r;
}

describe("snow-sled", () => {
  it("has 30 courses that get longer with more hazards", () => {
    expect(COURSE_COUNT).toBe(30);
    expect(COURSES[29].length).toBeGreaterThan(COURSES[0].length);
    expect(COURSES.slice(0, 5).every((c) => c.objs.every((o) => o.kind === "pouch"))).toBe(true);
    expect(COURSES.slice(20).every((c) => c.objs.some((o) => o.kind === "ramp"))).toBe(true);
    expect(COURSES.slice(15, 20).every((c) => c.objs.some((o) => o.kind === "ice"))).toBe(true);
    expect(SPECS.slice(25).every((s) => s.night)).toBe(true);
  });

  it("keeps hazards off the clean line and gates on the field", () => {
    for (const c of COURSES) {
      for (const g of c.gates) {
        expect(g.x - g.half).toBeGreaterThan(0);
        expect(g.x + g.half).toBeLessThan(FIELD_W);
      }
      for (const o of c.objs) if (o.kind === "tree" || o.kind === "snowman") expect(Math.abs(pathX(c, o.y) - o.x)).toBeGreaterThan(40);
    }
  });

  it("the autopilot rides every course clean and earns three stars", () => {
    for (let i = 0; i < COURSE_COUNT; i++) {
      const r = ride(i, true);
      expect(r.finished).toBe(true);
      expect(r.missed, `course ${i + 1}`).toBe(0);
      expect(r.crashes, `course ${i + 1}`).toBe(0);
      expect(starsFor(finalTime(r), COURSES[i].par)).toBe(3);
    }
  });

  it("not steering misses gates and fails the time", () => {
    for (const i of [0, 14, 29]) {
      const r = ride(i, false);
      expect(r.missed).toBeGreaterThan(3);
      expect(starsFor(finalTime(r), COURSES[i].par)).toBe(0);
    }
  });
});
