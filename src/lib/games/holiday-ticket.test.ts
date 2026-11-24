import { describe, expect, it } from "vitest";
import { HUMAN_BUYERS, PER_ROW, STAGE_COUNT, TICKET_STAGES, blocks, book, newBooking, pick, pilot, starsFor, stepBooking, together } from "./holiday-ticket";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ scan: 1.2, tap: 0.34, wary: false, seed }));

describe("holiday-ticket", () => {
  it("has 30 trains with longer carriages, more parties and less time later", () => {
    expect(TICKET_STAGES).toHaveLength(STAGE_COUNT);
    expect(TICKET_STAGES[29].rows).toBeGreaterThan(TICKET_STAGES[0].rows);
    expect(TICKET_STAGES[29].parties.length).toBeGreaterThan(TICKET_STAGES[0].parties.length);
    expect(TICKET_STAGES[29].time).toBeLessThan(TICKET_STAGES[0].time);
    for (const st of TICKET_STAGES) expect(st.soldAt).toHaveLength(st.rows * PER_ROW);
  }, T);

  it("seats a pair side by side on one side of the aisle and bigger parties in one row", () => {
    expect(together([0, 1])).toBe(true);
    expect(together([1, 2])).toBe(false); // across the aisle
    expect(together([0, 2, 3])).toBe(true);
    expect(together([0, PER_ROW])).toBe(false); // two rows
    expect(together([5])).toBe(true);
  }, T);

  it("picks only free seats, as many as the party needs, and refuses a split booking", () => {
    const st = TICKET_STAGES[6];
    const b = newBooking(st);
    const sold = st.soldAt.findIndex((t) => t === 0);
    expect(pick(b, sold)).toBe("taken");
    const size = st.parties[0];
    const [block] = blocks(b, size);
    expect(book(b)).toBe("short");
    for (const s of block) expect(pick(b, s)).toBe("picked");
    const spare = st.soldAt.findIndex((t, i) => t > 0 && !block.includes(i));
    expect(pick(b, spare)).toBe("full");
    expect(book(b)).toBe("booked");
    expect(b.party).toBe(1);
    expect(b.wrong).toBe(1);
  }, T);

  it("drops a picked seat that someone else buys first, and sells out when time is up", () => {
    const st = TICKET_STAGES[3];
    const b = newBooking(st);
    const seat = st.soldAt.findIndex((t) => t > 0.5 && t < st.time);
    pick(b, seat);
    while (b.t < st.soldAt[seat] - 0.01) stepBooking(b, 1 / 60);
    expect(b.picked).toContain(seat);
    const ev = stepBooking(b, 1 / 30);
    expect(ev.lost).toContain(seat);
    expect(b.lost).toBe(1);
    while (!b.over) stepBooking(b, 1 / 10);
    expect(b.won).toBe(false);
  }, T);

  it("gives a quick, clean booker three stars on every train", () => {
    for (const st of TICKET_STAGES) {
      const b = pilot(st);
      expect(b.won).toBe(true);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets human-like bookers (a second to look, a third of a second a tap) get home", () => {
    let wins = 0;
    for (const st of TICKET_STAGES) {
      expect(HUMAN_BUYERS.filter((o) => pilot(st, o).won).length).toBeGreaterThanOrEqual(4);
      wins += HUMANS.filter((o) => pilot(st, o).won).length;
    }
    expect(wins).toBeGreaterThanOrEqual(108);
  }, T);

  it("does not let random taps or a slow booker get the tickets", () => {
    for (const st of TICKET_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", scan: 0.5, tap: 0.25, seed }).won).toBe(false);
    expect(TICKET_STAGES.filter((st) => !pilot(st, { scan: 2.6, tap: 0.6, wary: false }).won).length).toBeGreaterThanOrEqual(22);
  }, T);

  it("is deterministic", () => {
    expect(pilot(TICKET_STAGES[14], HUMANS[2]).t).toBe(pilot(TICKET_STAGES[14], HUMANS[2]).t);
  }, T);
});
