import { describe, expect, it } from "vitest";
import { WINDOW_COUNT, clashes, countSolutions, hint, isSolved, makeWindow, paint, paneAt, startPaint, starsFor, windowSpec } from "./sunlit-glass";

describe("sunlit-glass", () => {
  it("every window has a unique answer with some panes left to paint", () => {
    for (let i = 0; i < WINDOW_COUNT; i++) {
      const w = makeWindow(i);
      const spec = windowSpec(i);
      expect(w.panes).toHaveLength(spec.panes);
      const fixed = w.panes.map((_, k) => (w.clues.includes(k) ? w.solution[k] : -1));
      expect(countSolutions(w.adj, w.colors, fixed), `window ${i + 1}`).toBe(1);
      expect(w.panes.length - w.clues.length, `window ${i + 1}`).toBeGreaterThanOrEqual(Math.floor(spec.panes * 0.45));
      // the answer is a proper colouring
      w.adj.forEach((ns, a) => ns.forEach((b) => expect(w.solution[a]).not.toBe(w.solution[b])));
    }
  }, 60000);

  it("is deterministic", () => {
    expect(makeWindow(5).solution).toEqual(makeWindow(5).solution);
  });

  it("paints, flags clashes and solves", () => {
    const w = makeWindow(0);
    let p = startPaint(w);
    const free = p.findIndex((c) => c < 0);
    const nb = w.adj[free][0];
    p = paint(w, p, free, p[nb] >= 0 ? p[nb] : 0);
    if (p[nb] < 0) p = paint(w, p, nb, 0);
    expect(clashes(w, p).has(free)).toBe(true);
    expect(paint(w, p, w.clues[0], 1)).toBe(p);
    let q = startPaint(w);
    for (let guard = 0; guard < 100 && !isSolved(w, q); guard++) {
      const h = hint(w, q)!;
      q = q.slice();
      q[h.pane] = h.color;
    }
    expect(isSolved(w, q)).toBe(true);
  });

  it("finds panes by point and scores stars", () => {
    const w = makeWindow(3);
    const pane = w.panes[4];
    expect(paneAt(w, pane.cx, pane.cy)).toBe(4);
    expect(starsFor(0, 0)).toBe(3);
    expect(starsFor(3, 9)).toBe(1);
  });
});
