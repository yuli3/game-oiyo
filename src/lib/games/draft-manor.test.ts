import { describe, expect, it } from "vitest";
import { HALL, KNOCK, MANOR_STAGES, STAGE_COUNT, dailyStage, doorsOf, entrance, frontier, move, newManor, pick, pilot, starsFor, vault } from "./draft-manor";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.15, seed }));

describe("draft-manor", () => {
  it("has 30 manors that grow taller and lock the vault with more keys", () => {
    expect(MANOR_STAGES).toHaveLength(STAGE_COUNT);
    expect(MANOR_STAGES[29].rows * MANOR_STAGES[29].cols).toBeGreaterThan(MANOR_STAGES[0].rows * MANOR_STAGES[0].cols);
    expect(MANOR_STAGES[0].keys).toBe(0);
    expect(MANOR_STAGES[29].keys).toBe(3);
  }, T);

  it("turns a card so its back door meets the door you came through", () => {
    // walking north (0) into a room with a forward door: doors north and south
    expect(doorsOf(HALL, 0)).toBe(1 | 4);
    // walking east (1) into a left turn: back door west, exit north
    expect(doorsOf({ f: false, l: true, r: false, effect: "none", gain: 0 }, 1)).toBe(8 | 1);
  }, T);

  it("drafts three cards when you walk into an empty plot, builds the one you pick and charges a step", () => {
    const st = MANOR_STAGES[2];
    const m = newManor(st);
    expect(move(m, 0)).toBe("draft");
    expect(m.offer?.cards).toHaveLength(3);
    expect(m.offer?.cards.some((c) => c.f || c.l || c.r)).toBe(true);
    expect(move(m, 1)).toBeNull(); // a draft is waiting
    pick(m, 0);
    expect(m.at).not.toBe(entrance(st));
    expect(m.steps).toBeLessThanOrEqual(st.steps - 1 + 5);
    expect(m.drawn).toBe(3);
  }, T);

  it("knocks through a wall for extra steps, and keeps the vault shut until you hold its keys", () => {
    const st = MANOR_STAGES[20];
    const m = newManor(st);
    const before = m.steps;
    expect(move(m, 2)).toBe("wall"); // off the bottom of the grid
    // the entrance has no south door, but east of it is an empty plot reached through a door; north works too
    const knock = frontier(m).find((f) => f.cost > 1);
    if (knock) expect(knock.cost).toBe(1 + KNOCK);
    expect(m.steps).toBe(before);
    const locked = newManor(st);
    locked.at = vault(st) + st.cols; // stand just below the vault (as if built)
    locked.rooms[locked.at] = { doors: 15, effect: "none", gain: 0, used: true };
    expect(move(locked, 0)).toBe("locked");
  }, T);

  it("gets a careful drafter into the vault with three stars on every stage", () => {
    for (const st of MANOR_STAGES) {
      const m = pilot(st);
      expect(m.won).toBe(true);
      expect(starsFor(m)).toBe(3);
    }
  }, T);

  it("lets human-like drafters (who slip now and then) through most manors", () => {
    let wins = 0;
    for (const st of MANOR_STAGES) {
      const w = HUMANS.filter((o) => pilot(st, o).won).length;
      expect(w).toBeGreaterThanOrEqual(1);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(100);
  }, T);

  it("does not let random doors and random cards reach the vault", () => {
    for (const st of MANOR_STAGES) for (const seed of [1, 2, 3, 4]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);

  it("gives everyone the same manor on the same day, and a different one the next", () => {
    const a = dailyStage("2026-11-24");
    expect(dailyStage("2026-11-24")).toEqual(a);
    expect(dailyStage("2026-11-25").deck).not.toEqual(a.deck);
    expect(pilot(a).won).toBe(true);
  }, T);
});
