import { describe, expect, it } from "vitest";
import { SKIES, SKY_COUNT, crossings, hint, isUntangled, nodeCount, segmentsCross, starsFor, tangledKites } from "./kite-tangle";

describe("kite-tangle", () => {
  it("has 30 skies growing from 6 to 22 kites", () => {
    expect(SKIES.length).toBe(SKY_COUNT);
    expect(SKY_COUNT).toBe(30);
    expect(nodeCount(0)).toBe(6);
    expect(nodeCount(29)).toBe(22);
    SKIES.forEach((s, i) => expect(s.nodes, `sky ${i + 1}`).toBe(nodeCount(i)));
    expect(SKIES[29].edges.length / SKIES[29].nodes).toBeGreaterThan(SKIES[0].edges.length / SKIES[0].nodes);
  });

  it("detects real crossings but not shared kites", () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 })).toBe(true);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(false);
    expect(crossings([[0, 1], [1, 2]], [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }])).toHaveLength(0);
  });

  it("every sky starts tangled, is one connected piece and has a tidy layout", () => {
    SKIES.forEach((s, i) => {
      expect(isUntangled(s, s.solved), `sky ${i + 1} tidy`).toBe(true);
      expect(crossings(s.edges, s.start).length, `sky ${i + 1} tangled`).toBeGreaterThanOrEqual(2);
      const seen = new Set([0]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const [a, b] of s.edges) {
          if (seen.has(a) !== seen.has(b)) {
            seen.add(a);
            seen.add(b);
            grew = true;
          }
        }
      }
      expect(seen.size, `sky ${i + 1} connected`).toBe(s.nodes);
      for (const p of [...s.start, ...s.solved]) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(1);
      }
    });
  });

  it("moving every hinted kite to its tidy spot untangles the sky", () => {
    for (const s of [SKIES[0], SKIES[14], SKIES[29]]) {
      const pos = s.start.map((p) => ({ ...p }));
      let moves = 0;
      while (!isUntangled(s, pos) && moves < s.nodes * 3) {
        // move the most tangled kite; if it is already home, move every kite home
        const h = hint(s, pos);
        if (!h) break;
        if (pos[h.kite].x === h.to.x && pos[h.kite].y === h.to.y) s.solved.forEach((p, k) => (pos[k] = { ...p }));
        else pos[h.kite] = { ...h.to };
        moves += 1;
      }
      expect(isUntangled(s, pos)).toBe(true);
      expect(tangledKites(s, pos).size).toBe(0);
    }
  });

  it("stars reward few drags", () => {
    expect(starsFor(6, 6)).toBe(3);
    expect(starsFor(9, 6)).toBe(2);
    expect(starsFor(20, 6)).toBe(1);
  });
});
