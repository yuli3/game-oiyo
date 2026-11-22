import { describe, expect, it } from "vitest";
import { PICTURES, PICTURE_COUNT, colClues, emptyBoard, hint, isSolved, lineDone, lineLogic, paint, rowClues, setCell, solutionOf, solveLine, type Mark } from "./picture-logic";

describe("picture logic", () => {
  it("has 30 pictures that grow from 8x8 to 12x12", () => {
    expect(PICTURE_COUNT).toBe(30);
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(30);
    PICTURES.forEach((p, i) => {
      const size = i < 10 ? 8 : i < 20 ? 10 : 12;
      expect(p.rows).toHaveLength(size);
      for (const r of p.rows) expect(r).toMatch(new RegExp(`^[#.]{${size}}$`));
      for (const lang of ["ko", "en", "ja", "zh", "fr", "es"] as const) expect(p.name[lang].length).toBeGreaterThan(0);
    });
  });

  it("every picture is solvable by line logic alone (unique, no guessing)", () => {
    for (const p of PICTURES) {
      const b = lineLogic(p);
      expect(b, p.id).not.toBeNull();
      const sol = solutionOf(p);
      b!.forEach((row, y) => row.forEach((v, x) => expect(v, `${p.id} ${x},${y}`).toBe(sol[y][x])));
    }
  });

  it("line solver finds overlaps and rejects impossible lines", () => {
    expect(solveLine([4], [null, null, null, null, null])).toEqual([null, true, true, true, null]);
    expect(solveLine([2], [true, null, true])).toBeNull();
    expect(solveLine([], [null, null])).toEqual([false, false]);
  });

  it("paint toggles, solve check ignores crosses, hints point at mistakes first", () => {
    const p = PICTURES[0];
    let b = emptyBoard(p);
    b = paint(b, 0, 0, 1);
    expect(b[0][0]).toBe(1);
    expect(paint(b, 0, 0, 1)[0][0]).toBe(0);
    expect(hint(p, b)).toEqual({ x: 0, y: 0, fill: false });
    const sol = solutionOf(p);
    let full: Mark[][] = sol.map((r) => r.map((v) => (v ? 1 : 2)));
    expect(isSolved(p, full)).toBe(true);
    full = setCell(full, 0, 0, 0);
    expect(isSolved(p, full)).toBe(true);
    expect(lineDone(rowClues(p)[1], full[1])).toBe(true);
    expect(colClues(p)).toHaveLength(8);
  });

  it("following hints alone finishes a picture", () => {
    for (const p of [PICTURES[3], PICTURES[15], PICTURES[29]]) {
      let b = emptyBoard(p);
      for (let i = 0; i < 200 && !isSolved(p, b); i++) {
        const h = hint(p, b);
        expect(h).not.toBeNull();
        b = setCell(b, h!.x, h!.y, h!.fill ? 1 : 2);
      }
      expect(isSolved(p, b), p.id).toBe(true);
    }
  });
});
