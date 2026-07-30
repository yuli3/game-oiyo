import { describe, it, expect } from "vitest";
import {
  ELEMENT_IDS,
  ENCOUNTER_STEP_DISTANCE,
  GENERATES,
  MATCHUP_MULTIPLIER,
  OVERCOMES,
  SPIRITS,
  WORLD,
  damageMultiplier,
  generateGrass,
  generateTallGrassZones,
  generateTrees,
  matchup,
  mulberry32,
  resolveMovement,
  rollSpirit,
  spiritsOfElement,
  tallGrassZoneAt,
  terrainHeight,
  terrainSlope,
  type ElementId,
} from "./spirit-vale";

describe("오행 cycles are well-formed", () => {
  it("상생 is a single 5-cycle with no fixed point", () => {
    // Walking the cycle from any start must visit all five and return home.
    let cur: ElementId = "wood";
    const seen = new Set<ElementId>();
    for (let i = 0; i < 5; i++) {
      expect(GENERATES[cur]).not.toBe(cur);
      seen.add(cur);
      cur = GENERATES[cur];
    }
    expect(cur).toBe("wood");
    expect(seen.size).toBe(5);
  });

  it("상극 is a single 5-cycle with no fixed point", () => {
    let cur: ElementId = "wood";
    const seen = new Set<ElementId>();
    for (let i = 0; i < 5; i++) {
      expect(OVERCOMES[cur]).not.toBe(cur);
      seen.add(cur);
      cur = OVERCOMES[cur];
    }
    expect(cur).toBe("wood");
    expect(seen.size).toBe(5);
  });

  it("matches the canonical assignments", () => {
    // 木生火, 水生木 / 木剋土, 水剋火 — if these ever change, the game has
    // stopped being 오행 and the docs are lying.
    expect(GENERATES.wood).toBe("fire");
    expect(GENERATES.water).toBe("wood");
    expect(OVERCOMES.wood).toBe("earth");
    expect(OVERCOMES.water).toBe("fire");
  });

  it("생 and 극 are never the same pairing", () => {
    for (const el of ELEMENT_IDS) {
      expect(GENERATES[el]).not.toBe(OVERCOMES[el]);
    }
  });
});

describe("matchups", () => {
  it("is total — every ordered pair resolves", () => {
    for (const a of ELEMENT_IDS) {
      for (const b of ELEMENT_IDS) {
        expect(MATCHUP_MULTIPLIER[matchup(a, b)]).toBeGreaterThan(0);
      }
    }
  });

  it("only same-element pairs are neutral", () => {
    // With two 5-cycles over five elements, every distinct pair is covered by
    // one of the four directed relations. Any neutral off-diagonal result means
    // the cycles are malformed.
    for (const a of ELEMENT_IDS) {
      for (const b of ELEMENT_IDS) {
        if (a === b) expect(matchup(a, b)).toBe("neutral");
        else expect(matchup(a, b)).not.toBe("neutral");
      }
    }
  });

  it("overcomes / overcomeBy mirror each other", () => {
    for (const a of ELEMENT_IDS) {
      const b = OVERCOMES[a];
      expect(matchup(a, b)).toBe("overcomes");
      expect(matchup(b, a)).toBe("overcomeBy");
    }
  });

  it("generates / generatedBy mirror each other", () => {
    for (const a of ELEMENT_IDS) {
      const b = GENERATES[a];
      expect(matchup(a, b)).toBe("generates");
      expect(matchup(b, a)).toBe("generatedBy");
    }
  });

  it("overcoming multipliers are reciprocal", () => {
    const product = MATCHUP_MULTIPLIER.overcomes * MATCHUP_MULTIPLIER.overcomeBy;
    expect(product).toBeCloseTo(1, 5);
  });

  it("feeding the defender is a penalty, being fed is a bonus", () => {
    // The asymmetry that distinguishes 오행 from a plain type chart.
    expect(damageMultiplier("wood", "fire")).toBeLessThan(1);
    expect(damageMultiplier("fire", "wood")).toBeGreaterThan(1);
  });

  it("no matchup is a total wash or an instant win", () => {
    for (const value of Object.values(MATCHUP_MULTIPLIER)) {
      expect(value).toBeGreaterThan(0.5);
      expect(value).toBeLessThan(2);
    }
  });
});

describe("the twelve spirits", () => {
  it("has exactly twelve with unique ids and branches", () => {
    expect(SPIRITS).toHaveLength(12);
    expect(new Set(SPIRITS.map((s) => s.id)).size).toBe(12);
    expect(new Set(SPIRITS.map((s) => s.branch)).size).toBe(12);
  });

  it("covers branches 0–11 exactly", () => {
    const branches = SPIRITS.map((s) => s.branch).sort((a, b) => a - b);
    expect(branches).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("follows the traditional 지지 element distribution", () => {
    // 子亥=水, 丑辰未戌=土, 寅卯=木, 巳午=火, 申酉=金. Earth-heavy on purpose;
    // a "balanced" 2/2/2/2/4 that isn't this is a data entry error.
    const counts = ELEMENT_IDS.reduce<Record<string, number>>((acc, el) => {
      acc[el] = spiritsOfElement(el).length;
      return acc;
    }, {});
    expect(counts).toEqual({ water: 2, earth: 4, wood: 2, fire: 2, metal: 2 });
  });

  it("names every spirit in all six locales", () => {
    for (const spirit of SPIRITS) {
      for (const locale of ["ko", "en", "ja", "zh", "fr", "es"] as const) {
        expect(spirit.name[locale], `${spirit.id}/${locale}`).toBeTruthy();
      }
    }
  });

  it("gives every spirit usable stats", () => {
    for (const spirit of SPIRITS) {
      expect(spirit.hp).toBeGreaterThan(0);
      expect(spirit.attack).toBeGreaterThan(0);
      expect(spirit.speed).toBeGreaterThan(0);
    }
  });
});

describe("terrain", () => {
  it("is deterministic", () => {
    expect(terrainHeight(12.5, -7.25)).toBe(terrainHeight(12.5, -7.25));
    expect(terrainHeight(0, 0)).toBe(terrainHeight(0, 0));
  });

  it("is flat at the spawn point", () => {
    // The player must never start embedded in or floating over a slope.
    expect(Math.abs(terrainHeight(0, 0))).toBeLessThan(0.01);
    expect(terrainSlope(0, 0)).toBeLessThan(0.05);
  });

  it("stays within a sane range across the walkable valley", () => {
    // The valley is a disc, not a square — `resolveMovement` clamps to a radius.
    // Sampling the square would include corners the player can never reach.
    const limit = WORLD.size - 4;
    let min = Infinity;
    let max = -Infinity;
    for (let x = -limit; x <= limit; x += 2.5) {
      for (let z = -limit; z <= limit; z += 2.5) {
        if (Math.hypot(x, z) > limit) continue;
        const h = terrainHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    }
    expect(min).toBeGreaterThan(-WORLD.amplitude - 1);
    expect(max).toBeLessThan(WORLD.amplitude + 12);
  });

  it("plateaus past the rim instead of spiking at the mesh corners", () => {
    // The terrain mesh is square, so it is evaluated well outside the disc.
    // Without a cap the rim term grows without bound and builds a wall.
    const corner = terrainHeight(WORLD.size, WORLD.size);
    expect(corner).toBeLessThan(WORLD.amplitude + 12);
    expect(Number.isFinite(corner)).toBe(true);
  });

  it("rises toward the rim so the valley reads as enclosed", () => {
    const rim = terrainHeight(WORLD.size - 2, 0);
    const middle = terrainHeight(WORLD.clearingRadius + 4, 0);
    expect(rim).toBeGreaterThan(middle);
  });
});

describe("world generation is reproducible", () => {
  it("returns an identical valley for the same seed", () => {
    const a = generateTallGrassZones(7);
    const b = generateTallGrassZones(7);
    expect(a).toEqual(b);
    expect(generateTrees(7, a)).toEqual(generateTrees(7, b));
  });

  it("returns a different valley for a different seed", () => {
    expect(generateTallGrassZones(7)).not.toEqual(generateTallGrassZones(8));
  });

  it("keeps trees out of the clearing, the thickets, and the cliffs", () => {
    const zones = generateTallGrassZones(3);
    const trees = generateTrees(3, zones);
    expect(trees.length).toBeGreaterThan(20);
    for (const tree of trees) {
      expect(Math.hypot(tree.x, tree.z)).toBeGreaterThan(WORLD.clearingRadius);
      expect(terrainSlope(tree.x, tree.z)).toBeLessThanOrEqual(0.55);
      expect(tallGrassZoneAt(tree.x, tree.z, zones)).toBeNull();
      // Trees must sit on the ground, not hover above or sink below it.
      expect(tree.y).toBeCloseTo(terrainHeight(tree.x, tree.z), 6);
    }
  });

  it("places thickets outside the spawn clearing so exploring is required", () => {
    for (const zone of generateTallGrassZones(11)) {
      expect(Math.hypot(zone.x, zone.z)).toBeGreaterThan(WORLD.clearingRadius);
      expect(zone.radius).toBeGreaterThan(0);
    }
  });

  it("assigns thickets across multiple elements", () => {
    const zones = generateTallGrassZones(5);
    expect(new Set(zones.map((z) => z.element)).size).toBeGreaterThan(1);
  });

  it("respects the grass budget and grounds every blade", () => {
    const zones = generateTallGrassZones(2);
    const grass = generateGrass(2, zones, 500);
    expect(grass).toHaveLength(500);
    for (const blade of grass.slice(0, 50)) {
      expect(blade.y).toBeCloseTo(terrainHeight(blade.x, blade.z), 6);
      expect(blade.scale).toBeGreaterThan(0);
      expect(Math.hypot(blade.x, blade.z)).toBeLessThanOrEqual(WORLD.size);
    }
  });

  it("marks blades inside a thicket as tall", () => {
    const zones = generateTallGrassZones(2);
    const grass = generateGrass(2, zones, 1500);
    for (const blade of grass) {
      expect(blade.tall).toBe(Boolean(tallGrassZoneAt(blade.x, blade.z, zones)));
    }
  });
});

describe("movement", () => {
  it("keeps the player inside the valley", () => {
    const out = resolveMovement({ x: WORLD.size, z: 0 }, { x: 40, z: 0 }, []);
    expect(Math.hypot(out.x, out.z)).toBeLessThanOrEqual(WORLD.size - 4 + 1e-9);
  });

  it("pushes the player out of a tree instead of through it", () => {
    const tree = { x: 5, z: 0, y: 0, scale: 1, rotation: 0, phase: 0 };
    // Aim straight at the trunk from just outside it.
    const out = resolveMovement({ x: 3.5, z: 0 }, { x: 1.5, z: 0 }, [tree]);
    const dist = Math.hypot(out.x - tree.x, out.z - tree.z);
    expect(dist).toBeGreaterThanOrEqual(WORLD.playerRadius + WORLD.treeRadius - 1e-9);
  });

  it("leaves unobstructed movement untouched", () => {
    const out = resolveMovement({ x: 0, z: 0 }, { x: 0.5, z: 0.25 }, []);
    expect(out).toEqual({ x: 0.5, z: 0.25 });
  });

  it("never produces a non-finite position", () => {
    const zones = generateTallGrassZones(4);
    const trees = generateTrees(4, zones);
    const rng = mulberry32(99);
    let pos = { x: 0, z: 0 };
    for (let i = 0; i < 400; i++) {
      pos = resolveMovement(pos, { x: (rng() - 0.5) * 2, z: (rng() - 0.5) * 2 }, trees);
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.z)).toBe(true);
    }
  });
});

describe("encounters", () => {
  it("requires walking a real distance before rolling", () => {
    expect(ENCOUNTER_STEP_DISTANCE).toBeGreaterThan(0);
  });

  it("always yields a real spirit", () => {
    const zones = generateTallGrassZones(6);
    const rng = mulberry32(1234);
    for (const zone of zones) {
      for (let i = 0; i < 50; i++) {
        const spirit = rollSpirit(zone, rng);
        expect(SPIRITS).toContain(spirit);
      }
    }
  });

  it("favours the thicket's own element", () => {
    const zone = { x: 0, z: 0, radius: 5, element: "fire" as ElementId };
    const rng = mulberry32(77);
    let own = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) {
      if (rollSpirit(zone, rng).element === "fire") own++;
    }
    // Roughly 75% by design; assert the bias exists without pinning the RNG.
    expect(own / runs).toBeGreaterThan(0.6);
    expect(own / runs).toBeLessThan(0.9);
  });

  it("is reproducible for a given seed", () => {
    const zone = { x: 0, z: 0, radius: 5, element: "water" as ElementId };
    const a = Array.from({ length: 20 }, (_, i) => rollSpirit(zone, mulberry32(i)).id);
    const b = Array.from({ length: 20 }, (_, i) => rollSpirit(zone, mulberry32(i)).id);
    expect(a).toEqual(b);
  });
});
