import { describe, expect, it } from "vitest";
import { SPIRITS, spiritById } from "./spirit-vale";
import { formFor, standingHeight } from "./spirit-vale-forms";
import {
  MAX_STAGE,
  STAGE_THRESHOLDS,
  grownSpirit,
  grownStats,
  spiritAtXp,
  stageOf,
  stageProgress,
  xpForWin,
  xpToNextStage,
  type Stage,
} from "./spirit-vale-evolution";

const STAGES: Stage[] = [1, 2, 3];

describe("stages", () => {
  it("starts at stage 1 with no experience", () => {
    expect(stageOf(0)).toBe(1);
  });

  it("advances at the thresholds and not before", () => {
    expect(stageOf(STAGE_THRESHOLDS[2] - 1)).toBe(1);
    expect(stageOf(STAGE_THRESHOLDS[2])).toBe(2);
    expect(stageOf(STAGE_THRESHOLDS[3] - 1)).toBe(2);
    expect(stageOf(STAGE_THRESHOLDS[3])).toBe(3);
  });

  it("never exceeds the maximum stage", () => {
    expect(stageOf(999999)).toBe(MAX_STAGE);
  });

  it("reports remaining experience, and nothing once fully grown", () => {
    expect(xpToNextStage(0)).toBe(STAGE_THRESHOLDS[2]);
    expect(xpToNextStage(STAGE_THRESHOLDS[3])).toBeNull();
  });

  it("reports progress bounded to 0..1", () => {
    for (const xp of [0, 30, 59, 60, 120, 179, 180, 5000]) {
      const p = stageProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    expect(stageProgress(STAGE_THRESHOLDS[3])).toBe(1);
  });

  it("awards experience for every possible win", () => {
    for (const s of SPIRITS) expect(xpForWin(s)).toBeGreaterThan(0);
  });
});

describe("growth", () => {
  it("increases every stat monotonically with stage", () => {
    for (const spirit of SPIRITS) {
      const one = grownStats(spirit, 1);
      const two = grownStats(spirit, 2);
      const three = grownStats(spirit, 3);
      expect(two.hp).toBeGreaterThan(one.hp);
      expect(three.hp).toBeGreaterThan(two.hp);
      expect(two.attack).toBeGreaterThanOrEqual(one.attack);
      expect(three.attack).toBeGreaterThan(two.attack);
      expect(three.speed).toBeGreaterThanOrEqual(one.speed);
    }
  });

  it("leaves stage 1 stats untouched", () => {
    for (const spirit of SPIRITS) {
      expect(grownStats(spirit, 1)).toEqual({
        hp: spirit.hp,
        attack: spirit.attack,
        speed: spirit.speed,
      });
    }
  });

  it("grows speed more slowly than attack, so evolving never wins every race", () => {
    const s = SPIRITS[0];
    const attackGain = grownStats(s, 3).attack / s.attack;
    const speedGain = grownStats(s, 3).speed / s.speed;
    expect(speedGain).toBeLessThan(attackGain);
  });

  it("keeps identity and element when grown", () => {
    for (const spirit of SPIRITS) {
      const grown = grownSpirit(spirit, 3);
      expect(grown.id).toBe(spirit.id);
      expect(grown.element).toBe(spirit.element);
      expect(grown.branch).toBe(spirit.branch);
      expect(grown.name).toEqual(spirit.name);
    }
  });

  it("resolves a spirit from stored experience", () => {
    const s = spiritAtXp(SPIRITS[0].id, STAGE_THRESHOLDS[3]);
    expect(s?.hp).toBe(grownStats(SPIRITS[0], 3).hp);
  });

  it("returns null for an unknown id", () => {
    expect(spiritAtXp("charizard", 500)).toBeNull();
  });
});

describe("body plans", () => {
  it("produces a plan for every spirit at every stage", () => {
    for (const spirit of SPIRITS) {
      for (const stage of STAGES) {
        const plan = formFor(spirit, stage);
        expect(plan.scale).toBeGreaterThan(0);
        expect(plan.torso.length).toBeGreaterThan(0);
        expect(plan.head.size).toBeGreaterThan(0);
        expect(plan.palette.body).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("is deterministic", () => {
    for (const spirit of SPIRITS) {
      expect(formFor(spirit, 2)).toEqual(formFor(spirit, 2));
    }
  });

  it("always gives a creature visible eyes with a highlight", () => {
    // Eyes are the single feature that makes procedural geometry read as alive,
    // so no spirit is allowed to end up without them.
    for (const spirit of SPIRITS) {
      for (const stage of STAGES) {
        const { eye } = formFor(spirit, stage);
        expect(eye.size).toBeGreaterThan(0);
        expect(eye.spread).toBeGreaterThan(0);
        expect(eye.highlight).toBeGreaterThan(0);
      }
    }
  });

  it("grows with stage", () => {
    for (const spirit of SPIRITS) {
      const a = formFor(spirit, 1);
      const b = formFor(spirit, 2);
      const c = formFor(spirit, 3);
      expect(b.scale).toBeGreaterThan(a.scale);
      expect(c.scale).toBeGreaterThan(b.scale);
      expect(c.accent.count).toBeGreaterThan(a.accent.count);
    }
  });

  it("grows horns and antlers faster than the body carrying them", () => {
    const ox = spiritById("terrox")!;
    const a = formFor(ox, 1);
    const c = formFor(ox, 3);
    expect(a.ears.kind).toBe("horns");
    expect(c.ears.size / a.ears.size).toBeGreaterThan(c.scale / a.scale);
  });

  it("gives each phase its own palette and signature", () => {
    const byElement = new Map<string, string>();
    for (const spirit of SPIRITS) {
      const plan = formFor(spirit, 1);
      const seen = byElement.get(spirit.element);
      // Same phase → same palette; that is what makes element readable on sight.
      if (seen) expect(plan.palette.body).toBe(seen);
      else byElement.set(spirit.element, plan.palette.body);
    }
    expect(byElement.size).toBe(5);
    expect(new Set(byElement.values()).size).toBe(5);
  });

  it("matches the signature accent to the phase", () => {
    const expected: Record<string, string> = {
      wood: "leaf",
      fire: "flame",
      earth: "stone",
      metal: "plate",
      water: "fin",
    };
    for (const spirit of SPIRITS) {
      expect(formFor(spirit, 1).accent.kind).toBe(expected[spirit.element]);
    }
  });

  it("gives the snake no limbs and no ears", () => {
    const snake = spiritById("emberpent")!;
    const plan = formFor(snake, 1);
    expect(plan.limbs.kind).toBe("serpentine");
    expect(plan.limbs.length).toBe(0);
    expect(plan.ears.kind).toBe("none");
    expect(plan.tail.kind).toBe("serpent");
  });

  it("keeps silhouettes distinguishable across the twelve", () => {
    // If two branches produced the same proportions the roster would look like
    // one creature in five colours.
    const shapes = SPIRITS.map((s) => {
      const p = formFor(s, 1);
      return [p.torso.length, p.torso.girth, p.torso.lift, p.limbs.kind, p.ears.kind, p.tail.kind].join("|");
    });
    expect(new Set(shapes).size).toBe(SPIRITS.length);
  });

  it("stands every creature above the ground", () => {
    for (const spirit of SPIRITS) {
      for (const stage of STAGES) {
        expect(standingHeight(formFor(spirit, stage))).toBeGreaterThan(0);
      }
    }
  });

  it("makes a grown creature taller", () => {
    for (const spirit of SPIRITS) {
      expect(standingHeight(formFor(spirit, 3))).toBeGreaterThan(
        standingHeight(formFor(spirit, 1)),
      );
    }
  });
});
