import { describe, expect, it } from "vitest";
import { createWordle, evaluateWordleGuess, inputWordle, submitWordle, wordleDateSeed } from "./wordle";

describe("wordle engine", () => {
  it("selects the same indexed target for the same seed", () => { expect(createWordle(738, 736, "random", null)).toEqual(createWordle(738, 736, "random", null)); expect(createWordle(738, 736, "random", null).targetIndex).toBe(2); });
  it("uses duplicate-safe two-pass evaluation", () => { expect(evaluateWordleGuess("EERIE", "THERE")).toEqual(["present", "absent", "present", "absent", "correct"]); expect(evaluateWordleGuess("SPEED", "ERASE")).toEqual(["present", "absent", "present", "present", "absent"]); });
  it("handles input, backspace and invalid submit as immutable transitions", () => { let state = createWordle(1, 10, "daily", "2026-08-02"); for (const key of "ABOUTX") state = inputWordle(state, key); expect(state.current).toBe("ABOUT"); state = inputWordle(state, "BACKSPACE"); expect(state.current).toBe("ABOU"); expect(submitWordle(state, "ABOUT", true)).toBe(state); });
  it("wins and loses at the exact terminal boundaries", () => { let win = createWordle(1, 10, "random", null); for (const key of "ABOUT") win = inputWordle(win, key); expect(submitWordle(win, "ABOUT", true).status).toBe("won"); let loss = createWordle(1, 10, "random", null); for (const guess of ["ABOVE", "ACTOR", "ADMIT", "ADOPT", "ADULT", "AFTER"]) { for (const key of guess) loss = inputWordle(loss, key); loss = submitWordle(loss, "ABOUT", true); } expect(loss.status).toBe("lost"); });
  it("hashes civil dates deterministically", () => { expect(wordleDateSeed("2026-08-02")).toBe(wordleDateSeed("2026-08-02")); expect(wordleDateSeed("2026-08-03")).not.toBe(wordleDateSeed("2026-08-02")); });
});
