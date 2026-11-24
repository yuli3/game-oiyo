import { describe, expect, it } from "vitest";
import { HOOP_STAGES, MAX_SPEED, RIM, STAGE_COUNT, aimFor, flick, hoopX, newCourt, pilot, starsFor, step, type HoopStage } from "./hoop-flick";

const T = 60_000;
// slower and a touch sloppier than the shooters each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.7, aimSpread: 1.4, powerSpread: 0.016, seed }));

const flat: HoopStage = { stage: 0, shots: [{ x: 60, y: 470 }, { x: 300, y: 470 }], hx: 180, hy: 180, amp: 0, rate: 0, need: 4, par: 6 };

function run(c: ReturnType<typeof newCourt>, secs: number) {
  const ev: string[] = [];
  for (let k = 0; k < secs * 60; k++) for (const e of step(c, 1 / 60)) if (e) ev.push(e);
  return ev;
}

describe("hoop-flick", () => {
  it("drops a well-aimed flick through the ring for a three-point swish", () => {
    const c = newCourt(flat);
    const v = aimFor(flat, c);
    expect(flick(c, v.vx, v.vy)).toBe(true);
    expect(run(c, 3)).toContain("swish");
    expect(c.points).toBe(3);
    expect(c.shot).toBe(1);
  }, T);

  it("misses a feeble flick, caps the speed, and ends after the last ball", () => {
    const c = newCourt(flat);
    flick(c, 2000, -2000);
    expect(Math.hypot(c.ball!.vx, c.ball!.vy)).toBeCloseTo(MAX_SPEED, 3);
    expect(run(c, 4)).toContain("miss");
    flick(c, 0, -100);
    run(c, 4);
    expect(c.over).toBe(true);
    expect(c.won).toBe(false);
    expect(RIM).toBeGreaterThan(20);
  }, T);

  it("has 30 courts, still hoops for the first five and sliding ones after", () => {
    expect(HOOP_STAGES).toHaveLength(STAGE_COUNT);
    for (const st of HOOP_STAGES.slice(0, 5)) expect(st.amp).toBe(0);
    expect(HOOP_STAGES[29].amp).toBeGreaterThan(0);
    expect(hoopX(HOOP_STAGES[29], 1)).not.toBe(HOOP_STAGES[29].hx);
    for (const st of HOOP_STAGES) for (const s of st.shots) expect(Math.abs(s.x - st.hx)).toBeGreaterThanOrEqual(60);
  }, T);

  it("lets careful shooters clear every court with three stars", () => {
    for (const st of HOOP_STAGES) {
      const c = pilot(st, { react: 0.5, aimSpread: 0.4, powerSpread: 0.005 });
      expect(c.won).toBe(true);
      expect(starsFor(c)).toBe(3);
    }
  }, T);

  it("lets slower human-like shooters clear almost every court", () => {
    let wins = 0;
    for (const st of HOOP_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(108);
  }, T);

  it("never scores enough with random flicks", () => {
    for (const st of HOOP_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
