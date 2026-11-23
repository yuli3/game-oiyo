import { describe, expect, it } from "vitest";
import { GAME_ID, GOOD_MS, MOODS, STAGE_COUNT, answer, begin, drumTimes, judge, makeStage, newRun, stars } from "./untranslatable-creature";

describe("untranslatable creature rhythm", () => {
  it("keeps the record id and ships 30 deterministic stages", () => {
    expect(GAME_ID).toBe("untranslatable-creature");
    expect(STAGE_COUNT).toBe(30);
    expect(JSON.stringify(makeStage(7))).toBe(JSON.stringify(makeStage(7)));
  });

  it("phrases start on a drum, mix drums and rests, and never repeat back to back", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const s = makeStage(i);
      s.phrases.forEach((p, k) => {
        expect(p.beats[0]).toBe(1);
        const on = p.beats.filter(Boolean).length;
        expect(on).toBeGreaterThanOrEqual(2);
        expect(on).toBeLessThan(p.beats.length);
        if (k) expect(p.beats.join("")).not.toBe(s.phrases[k - 1]!.beats.join(""));
      });
      // eighth notes stay tappable on a phone
      expect(s.stepMs).toBeGreaterThanOrEqual(170);
    }
  });

  it("grades exact, near, and missing taps", () => {
    const s = makeStage(0);
    const p = s.phrases[0]!;
    const want = drumTimes(p, s.stepMs);
    expect(judge(p, s.stepMs, want).grades.every((g) => g === "perfect")).toBe(true);
    expect(judge(p, s.stepMs, want.map((t) => t + 100)).grades.every((g) => g === "good")).toBe(true);
    const late = judge(p, s.stepMs, want.map((t) => t + GOOD_MS + 10));
    expect(late.passed).toBe(false);
    expect(judge(p, s.stepMs, want.slice(1)).passed).toBe(false);
    expect(judge(p, s.stepMs, [...want, 9999]).passed).toBe(true); // one stray tap is forgiven
    expect(judge(p, s.stepMs, [...want, 9999, 8888]).passed).toBe(false);
  });

  it("perfect play wins with three stars; three failed phrases lose", () => {
    let r = begin(newRun(10));
    while (r.status === "play") {
      const p = r.stage.phrases[r.at]!;
      r = answer(r, judge(p, r.stage.stepMs, drumTimes(p, r.stage.stepMs)));
    }
    expect(r.status).toBe("won");
    expect(stars(r)).toBe(3);
    let bad = begin(newRun(10));
    for (let k = 0; k < MOODS; k++) bad = answer(bad, judge(bad.stage.phrases[0]!, bad.stage.stepMs, []));
    expect(bad.status).toBe("lost");
  });
});
