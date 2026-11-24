import { describe, expect, it } from "vitest";
import { DISPATCH_STAGES, REST, STAGE_COUNT, chooseCrew, driveTime, newDesk, pilot, send, starsFor, stepDesk } from "./dispatch-desk";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ notice: 1.1, tap: 0.55, seed }));

describe("dispatch-desk", () => {
  it("has 30 shifts with more crew, more calls and less time to answer later", () => {
    expect(DISPATCH_STAGES).toHaveLength(STAGE_COUNT);
    expect(DISPATCH_STAGES[29].crew.length).toBeGreaterThan(DISPATCH_STAGES[0].crew.length);
    expect(DISPATCH_STAGES[29].calls.length).toBeGreaterThan(DISPATCH_STAGES[0].calls.length);
    expect(DISPATCH_STAGES[29].calls[0].wait).toBeLessThan(DISPATCH_STAGES[0].calls[0].wait + 1);
  }, T);

  it("handles a call when enough of the right skill arrives in time, then brings the crew home to rest", () => {
    const st = DISPATCH_STAGES[0];
    const d = newDesk(st);
    while (d.status[0] !== "waiting" && !d.over) stepDesk(d, 0.05);
    const [k] = chooseCrew(d, 0);
    expect(send(d, k, 0)).toBe("sent");
    expect(send(d, k, 0)).toBe("busy");
    const back = d.t + driveTime(st.crew[k], st.calls[0]) * 2 + REST;
    while (d.status[0] === "pending" && !d.over) stepDesk(d, 0.02);
    expect(d.status[0]).toBe("done");
    expect(d.crew[k].phase).toBe("back");
    while (d.t < back + 0.1 && !d.over) stepDesk(d, 0.05);
    if (!d.over) expect(d.crew[k].phase).toBe("home");
  }, T);

  it("misses a call nobody reaches before it runs out", () => {
    const st = DISPATCH_STAGES[5];
    const d = newDesk(st);
    while (d.status[0] !== "missed" && !d.over) stepDesk(d, 0.05);
    expect(d.missed).toBeGreaterThanOrEqual(1);
  }, T);

  it("gives a quick, sensible dispatcher a win on every shift", () => {
    let three = 0;
    for (const st of DISPATCH_STAGES) {
      const d = pilot(st);
      expect(d.won).toBe(true);
      if (starsFor(d) === 3) three++;
    }
    expect(three).toBeGreaterThanOrEqual(24);
  }, T);

  it("lets human-like dispatchers (a second to notice, half a second a tap) clear every shift", () => {
    for (const st of DISPATCH_STAGES) expect(HUMANS.filter((o) => pilot(st, o).won).length).toBeGreaterThanOrEqual(3);
  }, T);

  it("does not let random sending or always sending the strongest get by", () => {
    for (const st of DISPATCH_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", notice: 1, tap: 0.5, seed }).won).toBe(false);
    expect(DISPATCH_STAGES.filter((st) => !pilot(st, { mode: "strongest", notice: 1, tap: 0.5 }).won).length).toBeGreaterThanOrEqual(25);
    expect(DISPATCH_STAGES.filter((st) => !pilot(st, { notice: 2.5, tap: 1.2, seed: 3 }).won).length).toBeGreaterThanOrEqual(12);
  }, T);

  it("is deterministic", () => {
    expect(pilot(DISPATCH_STAGES[14], HUMANS[0]).handled).toBe(pilot(DISPATCH_STAGES[14], HUMANS[0]).handled);
  }, T);
});
