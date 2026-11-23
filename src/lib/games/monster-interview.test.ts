import { describe, expect, it } from "vitest";
import {
  FORGERY_FROM,
  GAME_ID,
  STAGE_COUNT,
  STRIKES,
  begin,
  judge,
  makeStage,
  newDesk,
  ruleHolds,
  stamp,
  stars,
  type Rule,
} from "./monster-interview";

describe("monster interview desk", () => {
  it("keeps the record id", () => {
    expect(GAME_ID).toBe("monster-interview");
  });

  it("ships 30 deterministic stages", () => {
    expect(STAGE_COUNT).toBe(30);
    expect(JSON.stringify(makeStage(4))).toBe(JSON.stringify(makeStage(4)));
    expect(JSON.stringify(makeStage(4))).not.toBe(JSON.stringify(makeStage(5)));
  });

  it("never posts two rules about the same trait, and ramps up", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const s = makeStage(i);
      const topics = s.rules.map((r) => r.kind.replace(/(AtLeast|AtMost|None|Some|Is|Not)$/, ""));
      expect(new Set(topics).size).toBe(topics.length);
      expect(s.rules.length).toBe(i < 5 ? 1 : i < 16 ? 2 : 3);
      expect(s.forgery).toBe(i >= FORGERY_FROM);
      expect(s.timeMs).toBeGreaterThanOrEqual(3500);
    }
  });

  it("mixes hires and rejects every day, and forged resumes appear only after they open", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const s = makeStage(i);
      const verdicts = s.candidates.map((c) => judge(s, c).verdict);
      expect(verdicts).toContain("hire");
      expect(verdicts).toContain("reject");
      const forged = s.candidates.filter((c) => c.forged);
      if (i < FORGERY_FROM) expect(forged.length).toBe(0);
      for (const c of s.candidates) {
        if (!c.forged) expect(c.resume).toEqual(c.monster);
        else expect(c.resume).not.toEqual(c.monster);
      }
    }
    const lateForged = Array.from({ length: STAGE_COUNT - FORGERY_FROM }, (_, k) => makeStage(FORGERY_FROM + k)).flatMap((s) => s.candidates.filter((c) => c.forged));
    expect(lateForged.length).toBeGreaterThan(10);
  });

  it("a forged resume always passes the posted rules, so only the forgery check catches it", () => {
    for (let i = FORGERY_FROM; i < STAGE_COUNT; i++) {
      const s = makeStage(i);
      for (const c of s.candidates.filter((x) => x.forged)) {
        expect(s.rules.every((r: Rule) => ruleHolds(r, c.resume))).toBe(true);
        expect(judge(s, c)).toEqual({ verdict: "reject", reason: "forged" });
      }
    }
  });

  it("a perfect desk clears with three stars; three wrong stamps fire you", () => {
    let d = begin(newDesk(12));
    for (const c of d.stage.candidates) d = stamp(d, judge(d.stage, c).verdict, 2000);
    expect(d.status).toBe("won");
    expect(stars(d)).toBe(3);
    expect(d.bestCombo).toBe(d.stage.candidates.length);

    let bad = begin(newDesk(12));
    for (let k = 0; k < STRIKES; k++) {
      const c = bad.stage.candidates[bad.at]!;
      bad = stamp(bad, judge(bad.stage, c).verdict === "hire" ? "reject" : "hire");
    }
    expect(bad.status).toBe("lost");
    expect(stars(bad)).toBe(0);
  });

  it("a timeout is a strike and ignores stamps outside play", () => {
    const ready = newDesk(0);
    expect(stamp(ready, "hire")).toBe(ready);
    const d = stamp(begin(ready), "timeout");
    expect(d.strikes).toBe(1);
    expect(d.log[0]?.reason).toBe("timeout");
  });
});
