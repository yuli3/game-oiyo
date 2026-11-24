import { describe, expect, it } from "vitest";
import { COLS, MUNG_STAGES, ROWS, STAGE_COUNT, frost, newRoom, paste, pilot, shade, starsFor, stepRoom } from "./mungpungji-seal";

const T = 60_000;

describe("mungpungji-seal", () => {
  it("has 30 rooms with more drafts, fewer frost shades and later gusts", () => {
    expect(MUNG_STAGES).toHaveLength(STAGE_COUNT);
    expect(MUNG_STAGES[29].drafts.length).toBeGreaterThan(MUNG_STAGES[0].drafts.length);
    expect(MUNG_STAGES[29].shades).toBeLessThan(MUNG_STAGES[0].shades);
    expect(MUNG_STAGES[29].drafts.some((d) => d.at > 0)).toBe(true);
    expect(MUNG_STAGES[0].drafts.every((d) => d.at === 0)).toBe(true);
  }, T);

  it("frosts thickest next to a draft", () => {
    const room = newRoom(MUNG_STAGES[0]);
    const d = MUNG_STAGES[0].drafts[0].cell;
    const f = frost(room, d);
    for (let i = 0; i < COLS * ROWS; i++) if (i !== d) expect(frost(room, i)).toBeLessThan(f + MUNG_STAGES[0].drafts[1].strength);
    expect(shade(room, d)).toBeGreaterThan(0);
  }, T);

  it("seals a draft with paper on it and wastes paper elsewhere", () => {
    const st = MUNG_STAGES[0];
    const room = newRoom(st);
    const far = Array.from({ length: COLS * ROWS }, (_, i) => i).find((i) => st.drafts.every((d) => d.cell !== i))!;
    expect(paste(room, far)).toBe("wasted");
    expect(paste(room, st.drafts[0].cell)).toBe("busy");
    stepRoom(room, 1);
    expect(paste(room, st.drafts[0].cell)).toBe("sealed");
    expect(room.wasted).toBe(1);
    expect(room.paperLeft).toBe(st.paper - 2);
  }, T);

  it("loses warmth while drafts are open", () => {
    const room = newRoom(MUNG_STAGES[3]);
    stepRoom(room, 2);
    expect(room.warmth).toBeLessThan(100);
  }, T);

  it("can be sealed on every stage by reading the frost", () => {
    for (const st of MUNG_STAGES) {
      const best = pilot(st, { mode: "true" });
      expect(best.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(best)).toBe(3);
      expect(pilot(st).won, `stage ${st.stage + 1}`).toBe(true);
    }
  }, T);

  it("can be sealed by unseen human-like players who misjudge a shade now and then", () => {
    for (const st of MUNG_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { think: 1.4, misread: 0.14, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("can't be sealed by pasting at random", () => {
    for (const st of MUNG_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed, think: 0.5 }).won, `stage ${st.stage + 1}`).toBe(false);
  }, T);
});
