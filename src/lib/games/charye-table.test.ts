import { describe, expect, it } from "vitest";
import { CHARYE_STAGES, PENALTY, ROW_OF, STAGE_COUNT, broken, newTable, offer, pilot, put, solveRow, starsFor, turn } from "./charye-table";

const T = 60_000;

describe("charye-table", () => {
  it("has 30 tables with more dishes and more house rules later", () => {
    expect(CHARYE_STAGES).toHaveLength(STAGE_COUNT);
    expect(CHARYE_STAGES[29].dishes.length).toBeGreaterThan(CHARYE_STAGES[0].dishes.length);
    expect(CHARYE_STAGES[29].rules.length).toBeGreaterThan(CHARYE_STAGES[0].rules.length);
    // the fruit row follows exactly one of its two sayings
    for (const st of CHARYE_STAGES) expect(st.rules.includes("joyul") !== st.rules.includes("hongdong")).toBe(true);
  }, T);

  it("only lets a dish into its own row, swapping with what is there", () => {
    const st = CHARYE_STAGES[10];
    const tb = newTable(st);
    const d = st.dishes[0];
    const wrongRow = (ROW_OF[d.kind] + 1) % 4;
    expect(put(tb, d.id, wrongRow, 0)).toBe(false);
    expect(put(tb, d.id, ROW_OF[d.kind], 0)).toBe(true);
    const other = st.dishes.find((x) => x.id !== d.id && ROW_OF[x.kind] === ROW_OF[d.kind])!;
    put(tb, other.id, ROW_OF[d.kind], 1);
    put(tb, other.id, ROW_OF[d.kind], 0);
    expect(tb.place[ROW_OF[d.kind]][0]).toBe(other.id);
    expect(tb.place[ROW_OF[d.kind]][1]).toBe(d.id);
  }, T);

  it("passes an offering set by the house's rules and burns incense on a wrong one", () => {
    const st = CHARYE_STAGES[20];
    const tb = newTable(st);
    expect(offer(tb)).toMatchObject({ ok: false, complete: false });
    expect(tb.t).toBe(PENALTY);
    for (let r = 0; r < 4; r++) solveRow(st, r, st.rules).forEach((id, c) => put(tb, id, r, c));
    for (const d of st.dishes) if (d.kind === "fish" && !tb.east[d.id]) turn(tb, d.id);
    expect(broken(tb).rules).toEqual([]);
    expect(offer(tb)).toEqual({ ok: true });
  }, T);

  it("can be set on every stage by the autopilot", () => {
    for (const st of CHARYE_STAGES) {
      const tb = pilot(st);
      expect(tb.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(tb)).toBe(3);
    }
  }, T);

  it("can be set by unseen human-like players who overlook a rule now and then", () => {
    for (const st of CHARYE_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { move: 1.2, flip: 0.7, read: 5, forget: 0.2, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(3);
    }
  }, T);

  it("can't be set by putting dishes anywhere in their rows", () => {
    for (const st of CHARYE_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", move: 1, seed }).won, `stage ${st.stage + 1}`).toBe(false);
  }, T);
});
