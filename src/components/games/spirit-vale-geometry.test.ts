import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geometryKitUsesBoxesOrCones, makeSpiritGeometries } from "./spirit-vale-geometry";

describe("spirit vale remesh kit", () => {
  it("does not ship box or cone buffers", () => {
    expect(geometryKitUsesBoxesOrCones(makeSpiritGeometries("high"))).toBe(false);
    expect(geometryKitUsesBoxesOrCones(makeSpiritGeometries("low"))).toBe(false);
  });

  it("builds lathed horns with a position attribute", () => {
    const kit = makeSpiritGeometries("low");
    expect(kit.horn.getAttribute("position").count).toBeGreaterThan(8);
    expect(kit.snout.getAttribute("position").count).toBeGreaterThan(8);
  });

  it("uses lathes, tapers, capsules, and pebbles — not boxes or cones", () => {
    const kit = makeSpiritGeometries("high");
    expect(kit.horn.type).toBe("LatheGeometry");
    expect(kit.ear.type).toBe("LatheGeometry");
    expect(kit.snout.type).toBe("LatheGeometry");
    expect(kit.flame.type).toBe("LatheGeometry");
    expect(kit.blade.type).toBe("LatheGeometry");
    expect(kit.taper.type).toBe("CylinderGeometry");
    expect(kit.capsule.type).toBe("CapsuleGeometry");
    expect(kit.pebble.type).toBe("IcosahedronGeometry");
    expect(kit.disc.type).toBe("CylinderGeometry");
    expect(kit).not.toHaveProperty("satchel");
    expect(kit).not.toHaveProperty("box");
    expect(kit).not.toHaveProperty("cone");
  });

  it("drops segment count on the coarse-pointer kit", () => {
    const high = makeSpiritGeometries("high");
    const low = makeSpiritGeometries("low");
    expect(high.sphere.getAttribute("position").count).toBeGreaterThan(
      low.sphere.getAttribute("position").count,
    );
    expect(high.horn.getAttribute("position").count).toBeGreaterThan(
      low.horn.getAttribute("position").count,
    );
  });

  it("keeps SpiritModel and the scene off BoxGeometry and ConeGeometry", () => {
    for (const name of ["SpiritModel.tsx", "SpiritValeScene.tsx"] as const) {
      const src = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
      expect(src, name).not.toMatch(/BoxGeometry|ConeGeometry/);
    }
  });
});
