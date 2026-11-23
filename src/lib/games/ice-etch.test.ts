import { describe, expect, it } from "vitest";
import { LEVELS, LEVEL_COUNT, MOTIFS, MOTIF_NAMES, hint, isDone, motifColor, parse, routeCells, step, stuck, starsFor } from "./ice-etch";

describe("ice etch", () => {
  it("has 30 ponds that grow, with every motif used", () => {
    expect(LEVEL_COUNT).toBe(30);
    const first = parse(LEVELS[0]);
    const last = parse(LEVELS[29]);
    expect(last.iceCount).toBeGreaterThan(first.iceCount * 2);
    expect(new Set(LEVELS.map((l) => l.motif)).size).toBe(MOTIFS.length);
    for (const l of LEVELS) for (const r of l.rows) expect(r).toHaveLength(l.rows[0].length);
  });

  it("every shipped route covers each ice cell once and ends at the hut", () => {
    LEVELS.forEach((l, i) => {
      const p = parse(l);
      let path = [p.start];
      for (const cell of routeCells(p, l.route).slice(1)) {
        const r = step(p, path, cell);
        expect(["ok", "done"], `pond ${i + 1}`).toContain(r.result);
        path = r.path;
      }
      expect(isDone(p, path), `pond ${i + 1}`).toBe(true);
    });
  });

  it("refuses snowdrifts, repeats and an early hut, and retracing steps back", () => {
    const p = parse({ motif: "snowflake", tone: 0, rows: ["P.#", "..H"], route: "RDL" });
    // route: P(0)->1 blocked->... build by hand
    let path = [0];
    expect(step(p, path, 2).result).toBe("far");
    let r = step(p, path, 1);
    expect(r.result).toBe("ok");
    path = r.path;
    expect(step(p, path, 2).result).toBe("blocked");
    r = step(p, path, 4);
    path = r.path;
    expect(step(p, path, 5).result).toBe("hut-early");
    expect(step(p, path, 1).result).toBe("back");
    r = step(p, path, 3);
    path = r.path;
    expect(r.result).toBe("ok");
    expect(stuck(p, path)).toBe(true); // 0 is visited, hut needs the full route
    expect(starsFor(0, 0)).toBe(3);
    expect(starsFor(10, 1)).toBe(2);
    expect(starsFor(12, 2)).toBe(1);
  });

  it("hint follows the known route and tells how far to retrace", () => {
    const l = LEVELS[0];
    const p = parse(l);
    const sol = routeCells(p, l.route);
    expect(hint(p, l, [p.start])).toEqual({ next: sol[1] });
    const wrong = [p.start, ...[0, 1, 2, 3].map((d) => p.start + [1, -1, p.w, -p.w][d]).filter((c) => c !== sol[1] && c >= 0 && c < p.w * p.h && !p.blocked[c] && Math.abs((c % p.w) - (p.start % p.w)) <= 1).slice(0, 1)];
    if (wrong.length === 2) expect(hint(p, l, wrong)).toEqual({ keep: 1 });
  });

  it("every motif paints more than one colour on every tone", () => {
    for (const m of MOTIFS) for (const t of [0, 1, 2] as const) {
      const seen = new Set<string>();
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) seen.add(motifColor(m, t, (x + 0.5) / 32, (y + 0.5) / 32, x, y));
      expect(seen.size, `${m}/${t}`).toBeGreaterThan(3);
    }
    for (const names of Object.values(MOTIF_NAMES)) expect(Object.keys(names)).toHaveLength(MOTIFS.length);
  });
});
