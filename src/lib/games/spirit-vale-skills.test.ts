import { describe, expect, it } from "vitest";
import { SPIRITS, ELEMENT_IDS, spiritsOfElement } from "./spirit-vale";
import { chooseWildSkill, skillById, skillsFor } from "./spirit-vale-skills";
import { mulberry32 } from "./spirit-vale";
import type { Stage } from "./spirit-vale-evolution";

const STAGES: Stage[] = [1, 2, 3];

describe("skill sets", () => {
  it("gives every spirit a usable move at every stage", () => {
    for (const s of SPIRITS) {
      for (const stage of STAGES) {
        const skills = skillsFor(s, stage);
        expect(skills.length).toBeGreaterThanOrEqual(2);
        for (const k of skills) {
          expect(k.accuracy).toBeGreaterThan(0);
          expect(k.accuracy).toBeLessThanOrEqual(1);
          expect(k.power).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("always includes a never-miss strike as the fallback", () => {
    for (const s of SPIRITS) {
      const strike = skillsFor(s, 1).find((k) => k.kind === "strike");
      expect(strike).toBeDefined();
      expect(strike!.accuracy).toBe(1);
      // Untyped, so it is the reliable answer to a losing matchup.
      expect(strike!.typed).toBe(false);
    }
  });

  it("unlocks the signature surge only at stage 2", () => {
    for (const s of SPIRITS) {
      expect(skillsFor(s, 1).some((k) => k.kind === "surge")).toBe(false);
      expect(skillsFor(s, 2).some((k) => k.kind === "surge")).toBe(true);
      expect(skillsFor(s, 3).some((k) => k.kind === "surge")).toBe(true);
    }
  });

  it("makes the surge stronger but less reliable than the strike", () => {
    for (const s of SPIRITS) {
      const set = skillsFor(s, 2);
      const strike = set.find((k) => k.kind === "strike")!;
      const surge = set.find((k) => k.kind === "surge")!;
      expect(surge.power).toBeGreaterThan(strike.power);
      expect(surge.accuracy).toBeLessThan(strike.accuracy);
      expect(surge.typed).toBe(true);
    }
  });

  it("gives every phase exactly one support art", () => {
    for (const el of ELEMENT_IDS) {
      const s = spiritsOfElement(el)[0];
      const arts = skillsFor(s, 3).filter((k) => k.kind === "art");
      expect(arts).toHaveLength(1);
      expect(arts[0].effect).toBeDefined();
    }
  });

  it("keeps skill ids unique within a set", () => {
    for (const s of SPIRITS) {
      for (const stage of STAGES) {
        const ids = skillsFor(s, stage).map((k) => k.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("resolves a skill by id and rejects unknown ones", () => {
    const s = SPIRITS[0];
    expect(skillById(s, 1, "strike")?.kind).toBe("strike");
    expect(skillById(s, 1, "hyper-beam")).toBeNull();
  });

  it("only lets a guard art block, never heal", () => {
    for (const s of SPIRITS) {
      const art = skillsFor(s, 3).find((k) => k.kind === "art")!;
      if (art.effect === "guard") {
        expect(art.guard).toBeGreaterThan(0);
        expect(art.power).toBe(0);
        expect(art.drain).toBeUndefined();
      }
    }
  });

  it("keeps guard values below total immunity", () => {
    for (const s of SPIRITS) {
      const art = skillsFor(s, 3).find((k) => k.kind === "art")!;
      if (art.guard !== undefined) expect(art.guard).toBeLessThan(1);
    }
  });
});

describe("wild skill choice", () => {
  it("always returns a move the spirit actually knows", () => {
    const rng = mulberry32(9);
    for (const s of SPIRITS) {
      for (const stage of STAGES) {
        const known = skillsFor(s, stage);
        for (let i = 0; i < 40; i++) {
          expect(known).toContain(chooseWildSkill(s, stage, rng));
        }
      }
    }
  });

  it("varies its choice rather than spamming one move", () => {
    const s = SPIRITS[0];
    const rng = mulberry32(4);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(chooseWildSkill(s, 2, rng).id);
    expect(seen.size).toBeGreaterThan(1);
  });
});
