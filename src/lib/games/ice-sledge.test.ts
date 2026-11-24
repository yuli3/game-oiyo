import { describe, expect, it } from "vitest";
import { LEVELS, PUSH_ALT, PUSH_SAME, STAGE_COUNT, centerX, lineX, newSledge, pilotRun, push, rivalD, starsFor, stepSledge } from "./ice-sledge";

describe("ice-sledge", () => {
  it("builds 30 stages that grow longer, narrower and busier", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    const a = LEVELS[0];
    const z = LEVELS[STAGE_COUNT - 1];
    expect(a.hazards).toHaveLength(0);
    expect(a.rivals).toHaveLength(1);
    expect(z.length).toBeGreaterThan(a.length * 2);
    expect(z.half).toBeLessThan(a.half);
    expect(z.hazards.some((h) => h.kind === "hole")).toBe(true);
    expect(z.rivals).toHaveLength(3);
  });

  it("keeps the clean line on the ice and clear of every hazard", () => {
    for (const l of LEVELS) {
      for (let d = 0; d < l.length; d += 20) expect(Math.abs(lineX(l, d) - centerX(l, d))).toBeLessThan(l.half - 10);
      for (const h of l.hazards) expect(Math.abs(lineX(l, h.d) - h.x)).toBeGreaterThan(h.r + 10);
    }
  });

  it("every stage is won with 3 stars by the steady autopilot and won by sloppy ones", () => {
    for (const l of LEVELS) {
      const run = pilotRun(l, 0, 1);
      expect(run.won, `stage ${l.stage + 1}`).toBe(true);
      expect(starsFor(run)).toBe(3);
      expect(pilotRun(l, 0.5, 7).won, `stage ${l.stage + 1} sloppy`).toBe(true);
      expect(pilotRun(l, 0.6, 9).won, `stage ${l.stage + 1} sloppier`).toBe(true);
    }
  });

  it("slow poling loses to the village kids from stage 4 on", () => {
    for (const l of LEVELS.slice(3)) expect(pilotRun(l, 0, 1, 3.6).won, `stage ${l.stage + 1}`).toBe(false);
  });

  it("alternating pushes bite harder than same-side pushes and steer the sledge", () => {
    const s = newSledge(0);
    push(s, "L");
    expect(s.v).toBe(PUSH_ALT);
    expect(s.heading).toBeGreaterThan(0);
    s.time = 0.5;
    push(s, "L");
    expect(s.v).toBe(PUSH_ALT + PUSH_SAME);
    s.time = 1;
    const before = s.heading;
    push(s, "R");
    expect(s.heading).toBeLessThan(before);
  });

  it("a hole drops you in and puts you back on the line a little way back", () => {
    const base = LEVELS[12];
    const l = { ...base, hazards: [{ kind: "hole" as const, x: lineX(base, 0), d: 200, r: 20 }] };
    const s = newSledge(12, l);
    s.v = 200;
    let fell = false;
    for (let k = 0; k < 600 && !fell; k++) fell = stepSledge(s, 1 / 60).fell;
    expect(fell).toBe(true);
    let climbed = false;
    for (let k = 0; k < 200 && !climbed; k++) climbed = stepSledge(s, 1 / 60).climbed;
    expect(climbed).toBe(true);
    expect(s.d).toBeLessThan(200);
    expect(s.x).toBeCloseTo(lineX(l, s.d), 5);
  });

  it("rivals start slowly and reach the far bank at their finishing time", () => {
    const l = LEVELS[20];
    expect(rivalD(l, 0, 0)).toBe(0);
    expect(rivalD(l, 0, l.rivals[0])).toBeCloseTo(l.length, 3);
  });
});
