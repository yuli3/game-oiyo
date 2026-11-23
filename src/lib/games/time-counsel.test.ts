import { describe, expect, it } from "vitest";
import { CATS, GAP_S, HEARTS, STAGE_COUNT, begin, isFalse, makeTrial, newRun, object, stars, tick, type RunState } from "./time-counsel";

function play(s0: RunState, perfect: boolean): RunState {
  let s = begin(s0);
  for (let guard = 0; guard < 100000 && s.status === "play"; guard++) {
    if (s.t >= 0.4) {
      const st = s.trial.statements[s.at]!;
      if (st.lie >= 0) s = object(s, perfect ? st.lie : (st.lie + 1) % st.chips.length);
    }
    s = tick(s, 0.05);
  }
  return s;
}

describe("time-counsel", () => {
  it("trials are deterministic, and lies are exactly the chips that contradict evidence", () => {
    expect(makeTrial(9)).toEqual(makeTrial(9));
    for (let i = 0; i < STAGE_COUNT; i++) {
      const tr = makeTrial(i);
      expect(tr.statements.filter((s) => s.lie >= 0).length).toBeGreaterThanOrEqual(Math.ceil(tr.statements.length / 3));
      for (const st of tr.statements) {
        const falses = st.chips.map((c, j) => (isFalse(tr, c) ? j : -1)).filter((j) => j >= 0);
        expect(falses).toEqual(st.lie >= 0 ? [st.lie] : []);
        expect(st.chips.some((c) => tr.evidence[c.cat] !== undefined)).toBe(true);
        // chips follow the fixed category order
        const order = st.chips.map((c) => CATS.indexOf(c.cat));
        expect(order).toEqual([...order].sort((a, b) => a - b));
      }
    }
  });

  it("later trials are harder", () => {
    const a = makeTrial(0);
    const z = makeTrial(STAGE_COUNT - 1);
    expect(z.travelS).toBeLessThan(a.travelS);
    expect(z.statements.length).toBeGreaterThan(a.statements.length);
    expect(Object.keys(z.evidence).length).toBeGreaterThan(Object.keys(a.evidence).length);
  });

  it("catching every lie clears every trial with three stars", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const s = play(newRun(i), true);
      expect(s.status, `trial ${i + 1}`).toBe("won");
      expect(stars(s)).toBe(3);
    }
  });

  it("objecting to the wrong chip or letting lies through loses", () => {
    expect(play(newRun(5), false).status).toBe("lost");
    let s = begin(newRun(0));
    while (s.status === "play") s = tick(s, 0.1); // never object
    expect(s.status).toBe("lost");
    expect(s.hearts).toBe(0);
  });

  it("no objections during the gap; a true statement passes on its own", () => {
    let s = begin(newRun(2));
    expect(s.t).toBe(-GAP_S);
    expect(object(s, 0)).toBe(s);
    const firstTrue = s.trial.statements.findIndex((st) => st.lie < 0);
    expect(firstTrue).toBeGreaterThanOrEqual(0);
    expect(HEARTS).toBe(3);
  });
});
