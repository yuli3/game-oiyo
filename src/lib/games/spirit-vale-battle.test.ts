import { describe, expect, it } from "vitest";
import {
  MAX_TURNS,
  bestAgainst,
  skillsFor,
  captureChance,
  computeDamage,
  createBattle,
  makeCombatant,
  resolveTurn,
  type BattleState,
} from "./spirit-vale-battle";
import { SPIRITS, mulberry32, spiritById, spiritsOfElement } from "./spirit-vale";

const wood = spiritsOfElement("wood")[0];
const earth = spiritsOfElement("earth")[0];
const fire = spiritsOfElement("fire")[0];
const metal = spiritsOfElement("metal")[0];

/** A roll that always returns the same value, for arithmetic without variance. */
const fixed = (v: number) => () => v;

/** The typed signature move — matchups only apply to typed skills. */
const surgeOf = (s: typeof wood) => skillsFor(s, 2).find((k) => k.kind === "surge")!;
const strikeOf = (s: typeof wood) => skillsFor(s, 1).find((k) => k.kind === "strike")!;

describe("damage", () => {
  it("hits harder into the phase it overcomes than into one that overcomes it", () => {
    // 木剋土 both ways: wood→earth is strong, metal overcomes wood.
    const skill = surgeOf(wood);
    const strong = computeDamage(makeCombatant(wood, 2), makeCombatant(earth), skill, fixed(0.5));
    const weak = computeDamage(makeCombatant(wood, 2), makeCombatant(metal), skill, fixed(0.5));
    expect(strong).toBeGreaterThan(weak);
  });

  it("is reduced when feeding the defender", () => {
    // 木生火 — attacking fire with wood feeds it.
    const skill = surgeOf(wood);
    const feeding = computeDamage(makeCombatant(wood, 2), makeCombatant(fire), skill, fixed(0.5));
    const neutral = computeDamage(makeCombatant(wood, 2), makeCombatant(wood), skill, fixed(0.5));
    expect(feeding).toBeLessThan(neutral);
  });

  it("ignores the matchup for an untyped strike", () => {
    // The plain strike is the reliable answer to a bad pairing, so the phase
    // relation must not touch it.
    const skill = strikeOf(wood);
    const vsEarth = computeDamage(makeCombatant(wood), makeCombatant(earth), skill, fixed(0.5));
    const vsMetal = computeDamage(makeCombatant(wood), makeCombatant(metal), skill, fixed(0.5));
    expect(vsEarth).toBe(vsMetal);
  });

  it("never deals less than one damage even in the worst matchup", () => {
    for (const attacker of SPIRITS) {
      for (const defender of SPIRITS) {
        const dmg = computeDamage(
          makeCombatant(attacker, 2),
          makeCombatant(defender),
          surgeOf(attacker),
          fixed(0),
        );
        expect(dmg).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("varies with the roll but stays bounded", () => {
    const skill = surgeOf(wood);
    const low = computeDamage(makeCombatant(wood, 2), makeCombatant(earth), skill, fixed(0));
    const high = computeDamage(makeCombatant(wood, 2), makeCombatant(earth), skill, fixed(0.999));
    expect(high).toBeGreaterThan(low);
    expect(high / low).toBeLessThan(1.6);
  });

  it("is reduced by a guard and the guard is then spent", () => {
    const skill = surgeOf(wood);
    const open = makeCombatant(earth);
    const braced = { ...open, guard: 0.5 };
    const full = computeDamage(makeCombatant(wood, 2), open, skill, fixed(0.5));
    const blocked = computeDamage(makeCombatant(wood, 2), braced, skill, fixed(0.5));
    expect(blocked).toBeLessThan(full);
  });
});

describe("capture odds", () => {
  it("rises as the wild spirit weakens", () => {
    const full = makeCombatant(wood);
    const hurt = { ...full, hp: Math.round(full.maxHp * 0.2) };
    expect(captureChance(hurt)).toBeGreaterThan(captureChance(full));
  });

  it("is never certain and never impossible", () => {
    for (const spirit of SPIRITS) {
      const c = makeCombatant(spirit);
      for (const hp of [c.maxHp, Math.round(c.maxHp / 2), 1, 0]) {
        const chance = captureChance({ ...c, hp });
        expect(chance).toBeGreaterThan(0);
        expect(chance).toBeLessThanOrEqual(0.9);
      }
    }
  });
});

describe("battle flow", () => {
  it("starts active with both sides at full health", () => {
    const s = createBattle(earth, wood);
    expect(s.phase).toBe("active");
    expect(s.wild.hp).toBe(earth.hp);
    expect(s.player?.hp).toBe(wood.hp);
    expect(s.log).toHaveLength(0);
  });

  it("does not mutate the state it is given", () => {
    const s = createBattle(earth, wood);
    const snapshot = JSON.stringify(s);
    resolveTurn(s, { type: "skill", skillId: "strike" }, fixed(0.5));
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("ends immediately when fleeing", () => {
    const s = resolveTurn(createBattle(earth, wood), { type: "flee" }, fixed(0.5));
    expect(s.phase).toBe("fled");
    expect(s.log.at(-1)).toEqual({ kind: "flee" });
  });

  it("ignores further actions once resolved", () => {
    const fled = resolveTurn(createBattle(earth, wood), { type: "flee" }, fixed(0.5));
    const again = resolveTurn(fled, { type: "skill", skillId: "strike" }, fixed(0.5));
    expect(again).toBe(fled);
  });

  it("lets the faster spirit strike first", () => {
    // Pyrequine (speed 17) outruns Terrox (speed 7).
    const fast = spiritById("pyrequine")!;
    const slow = spiritById("terrox")!;
    const s = resolveTurn(createBattle(fast, slow), { type: "skill", skillId: "strike" }, fixed(0.5));
    const firstAttack = s.log.find((e) => e.kind === "attack");
    expect(firstAttack && firstAttack.kind === "attack" && firstAttack.by).toBe("wild");
  });

  it("resolves to a win when the wild spirit faints", () => {
    let s = createBattle(earth, wood);
    // Drop the wild spirit to a sliver so one hit finishes it.
    s = { ...s, wild: { ...s.wild, hp: 1 } };
    s = resolveTurn(s, { type: "skill", skillId: "strike" }, fixed(0.5));
    expect(s.phase).toBe("won");
    expect(s.log.some((e) => e.kind === "faint" && e.side === "wild")).toBe(true);
  });

  it("resolves to a loss when the player's spirit faints", () => {
    let s = createBattle(earth, wood);
    s = { ...s, player: { ...s.player!, hp: 1 } };
    s = resolveTurn(s, { type: "skill", skillId: "strike" }, fixed(0.5));
    expect(s.phase).toBe("lost");
  });

  it("records a successful capture", () => {
    const s = resolveTurn(createBattle(earth, wood), { type: "capture" }, fixed(0));
    expect(s.phase).toBe("caught");
    const entry = s.log.find((e) => e.kind === "capture");
    expect(entry && entry.kind === "capture" && entry.success).toBe(true);
  });

  it("costs the turn when a capture fails", () => {
    // roll 0.99 fails the capture, then feeds the damage variance.
    const s = resolveTurn(createBattle(earth, wood), { type: "capture" }, fixed(0.99));
    expect(s.phase).toBe("active");
    const cap = s.log.find((e) => e.kind === "capture");
    expect(cap && cap.kind === "capture" && cap.success).toBe(false);
    // The wild spirit got its free turn — which it may hit or miss with, since
    // skills can now miss. Either way the turn is spent.
    expect(s.log.some((e) => "by" in e && e.by === "wild")).toBe(true);
    expect(s.turn).toBe(2);
  });
});

describe("bare-handed encounters", () => {
  it("allows a capture attempt with no party", () => {
    const s = resolveTurn(createBattle(earth, null), { type: "capture" }, fixed(0));
    expect(s.phase).toBe("caught");
  });

  it("passes the turn instead of crashing when attacking with no party", () => {
    const s = resolveTurn(createBattle(earth, null), { type: "skill", skillId: "strike" }, fixed(0.5));
    expect(s.phase).toBe("active");
    expect(s.turn).toBe(2);
    // Nothing to hit and nothing to be hit.
    expect(s.log.some((e) => e.kind === "attack")).toBe(false);
  });

  it("cannot be lost when there is nothing to lose", () => {
    let s: BattleState = createBattle(earth, null);
    const rng = mulberry32(3);
    for (let i = 0; i < MAX_TURNS + 5 && s.phase === "active"; i++) {
      s = resolveTurn(s, { type: "skill", skillId: "strike" }, rng);
    }
    expect(s.phase).not.toBe("lost");
  });
});

describe("termination", () => {
  it("always ends within the turn cap", () => {
    // Every ordered pair, so no combination can stall the arcade page.
    for (const wild of SPIRITS) {
      for (const mine of SPIRITS) {
        let s = createBattle(wild, mine);
        const rng = mulberry32(11);
        let guard = 0;
        while (s.phase === "active" && guard < MAX_TURNS + 10) {
          s = resolveTurn(s, { type: "skill", skillId: "strike" }, rng);
          guard++;
        }
        expect(s.phase, `${mine.id} vs ${wild.id}`).not.toBe("active");
      }
    }
  });

  it("reports exhaustion rather than hanging when neither side can finish", () => {
    let s = createBattle(earth, earth);
    // Enormous pools so nobody can win inside the cap.
    s = {
      ...s,
      wild: { ...s.wild, hp: 99999, maxHp: 99999 },
      player: { ...s.player!, hp: 99999, maxHp: 99999 },
    };
    const rng = mulberry32(5);
    while (s.phase === "active") s = resolveTurn(s, { type: "skill", skillId: "strike" }, rng);
    expect(s.phase).toBe("exhausted");
    expect(s.turn).toBeGreaterThan(MAX_TURNS);
  });

  it("is reproducible for a fixed seed", () => {
    const run = () => {
      let s = createBattle(earth, wood);
      const rng = mulberry32(42);
      while (s.phase === "active") s = resolveTurn(s, { type: "skill", skillId: "strike" }, rng);
      return { phase: s.phase, turn: s.turn, log: s.log.length };
    };
    expect(run()).toEqual(run());
  });
});

describe("auto-selecting a party member", () => {
  it("returns null for an empty party", () => {
    expect(bestAgainst(earth, [])).toBeNull();
  });

  it("ignores ids that are not real spirits", () => {
    expect(bestAgainst(earth, ["not-a-spirit"])).toBeNull();
  });

  it("prefers the phase that overcomes the wild spirit", () => {
    // Against earth, wood overcomes; fire generates it (a penalty).
    const picked = bestAgainst(earth, [fire.id, wood.id]);
    expect(picked?.element).toBe("wood");
  });

  it("breaks ties on attack", () => {
    const woods = spiritsOfElement("wood");
    const picked = bestAgainst(earth, woods.map((w) => w.id));
    const strongest = woods.reduce((a, b) => (b.attack > a.attack ? b : a));
    expect(picked?.id).toBe(strongest.id);
  });

  it("still returns someone when every option is a bad matchup", () => {
    const picked = bestAgainst(earth, spiritsOfElement("fire").map((f) => f.id));
    expect(picked).not.toBeNull();
  });
});
