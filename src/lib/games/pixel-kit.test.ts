import { describe, expect, it } from "vitest";
import { backdropPixels, ditherBand, parseHex, spawnBurst, spritePixels, stepParticles, type PixelParticle } from "./pixel-kit";
import { ALL_PIXEL_SPRITES, HAUNTED_NIGHT, MEADOW_NIGHT, laneNote } from "./pixel-sprites";

describe("pixel-kit", () => {
  it("parses hex colours", () => {
    expect(parseHex("#ff0080")).toEqual({ r: 255, g: 0, b: 128, a: 255 });
    expect(parseHex("#0f08")).toEqual({ r: 0, g: 255, b: 0, a: 136 });
  });

  it("every sprite is rectangular and every key has a colour", () => {
    for (const [name, art] of Object.entries(ALL_PIXEL_SPRITES)) {
      const widths = new Set(art.rows.map((r) => r.length));
      expect(widths.size, name).toBe(1);
      const { width, height, data } = spritePixels(art);
      expect(width * height * 4, name).toBe(data.length);
      // not empty
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opaque += 1;
      expect(opaque, name).toBeGreaterThan(4);
    }
  });

  it("throws on a key without a colour", () => {
    expect(() => spritePixels({ rows: ["ab"], palette: { a: "#000" } })).toThrow();
  });

  it("lane notes keep the outline but change the body colour", () => {
    const a = spritePixels(laneNote(0)).data;
    const b = spritePixels(laneNote(1)).data;
    expect(a.length).toBe(b.length);
    expect(Array.from(a)).not.toEqual(Array.from(b));
    expect(laneNote(5)).toBe(laneNote(1));
  });

  it("dithered bands stay in range and reach both ends", () => {
    const seen = new Set<number>();
    for (let y = 0; y < 32; y += 1) for (let x = 0; x < 4; x += 1) seen.add(ditherBand(x, y, y / 31, 4));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it("backdrops are deterministic and fully opaque", () => {
    const a = backdropPixels(40, 30, HAUNTED_NIGHT);
    const b = backdropPixels(40, 30, HAUNTED_NIGHT);
    expect(Array.from(a)).toEqual(Array.from(b));
    for (let i = 3; i < a.length; i += 4) expect(a[i]).toBe(255);
    expect(Array.from(backdropPixels(40, 30, MEADOW_NIGHT))).not.toEqual(Array.from(a));
  });

  it("particles burst and expire", () => {
    const list: PixelParticle[] = [];
    spawnBurst(list, 10, 10, ["#fff"], 8, 100, 1);
    expect(list).toHaveLength(8);
    for (let k = 0; k < 20; k += 1) stepParticles(list, 0.1);
    expect(list).toHaveLength(0);
  });
});
