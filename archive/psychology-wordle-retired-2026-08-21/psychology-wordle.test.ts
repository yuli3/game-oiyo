import { describe, expect, it } from "vitest";
import { backspacePsychologyWordle, createPsychologyWordle, evaluatePsychologyWordleGuess, explainPsychologyWordleHint, inputPsychologyWordle, psychologyWordleSymbols, restartPsychologyWordle, submitPsychologyWordle } from "./psychology-wordle";

describe("psychology wordle engine", () => {
  it("creates deterministic locale-specific boards", () => {
    expect(createPsychologyWordle(42, "ko")).toEqual(createPsychologyWordle(42, "ko"));
    expect(createPsychologyWordle(42, "latin").target).toHaveLength(5);
    expect(psychologyWordleSymbols("감정", "ko")).toEqual(["ㄱ", "ㅏ", "ㅁ", "ㅈ", "ㅓ", "ㅇ"]);
  });

  it("scores duplicate symbols with a two-pass consumption rule", () => {
    expect(evaluatePsychologyWordleGuess("SHEEP".split(""), "SLEEP".split(""))).toEqual(["correct", "absent", "correct", "correct", "correct"]);
    expect(evaluatePsychologyWordleGuess("ANGER".split(""), "BRAIN".split(""))).toEqual(["present", "present", "absent", "absent", "present"]);
  });

  it("enforces input capacity, immutable backspace, win, and six-guess loss", () => {
    let state = createPsychologyWordle(7, "latin");
    for (const symbol of [...state.target, "X"]) state = inputPsychologyWordle(state, symbol);
    expect(state.currentGuess).toHaveLength(state.target.length);
    const shorter = backspacePsychologyWordle(state); expect(shorter.currentGuess).toHaveLength(state.target.length - 1); expect(state.currentGuess).toHaveLength(state.target.length);
    state = inputPsychologyWordle(shorter, state.target.at(-1)!); expect(submitPsychologyWordle(state).status).toBe("won");
    let losing = createPsychologyWordle(7, "latin");
    for (let attempt = 0; attempt < 6; attempt += 1) { for (let index = 0; index < losing.target.length; index += 1) losing = inputPsychologyWordle(losing, "Z"); losing = submitPsychologyWordle(losing); }
    expect(losing.status).toBe("lost"); expect(inputPsychologyWordle(losing, "A")).toBe(losing);
  });

  it("hints the first never-green slot without changing guesses", () => {
    let state = createPsychologyWordle(7, "latin");
    const miss = state.target.map((symbol, index) => index === 0 ? (symbol === "A" ? "B" : "A") : symbol);
    for (const symbol of miss) state = inputPsychologyWordle(state, symbol);
    state = submitPsychologyWordle(state);
    const before = structuredClone(state.guesses);
    expect(explainPsychologyWordleHint(state)).toEqual({ reason: "unknown-slot", index: 0 });
    expect(state.guesses).toEqual(before);
  });

  it("advances its deterministic word stream on restart", () => {
    const first = createPsychologyWordle(91, "ko");
    expect(restartPsychologyWordle(first)).toEqual(createPsychologyWordle(first.rngState, "ko"));
  });
});
