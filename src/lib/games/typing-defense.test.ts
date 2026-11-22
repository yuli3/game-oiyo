import { describe, expect, it } from "vitest";
import { FIELD_W, WALL_HP, WAVE_COUNT, WORDS, createWave, isBossWave, normalise, starsFor, step, submit, wordWidth, type Lang, type TypingState } from "./typing-defense";

const LANGS: Lang[] = ["ko", "en", "ja", "zh", "fr", "es"];

function runPerfect(s: TypingState): TypingState {
  let st = s;
  for (let i = 0; i < 4000 && st.status === "play"; i++) {
    st = step(st, 0.1);
    for (const f of st.words.filter((w) => w.spawned)) st = submit(st, f.text).state;
  }
  return st;
}

describe("typing defense", () => {
  it("has 30 waves with bosses on 10, 20 and 30", () => {
    expect(WAVE_COUNT).toBe(30);
    expect([9, 19, 29].every(isBossWave)).toBe(true);
    expect(isBossWave(8)).toBe(false);
    const a = createWave(0, "ko");
    const b = createWave(28, "ko");
    expect(b.words.length).toBeGreaterThan(a.words.length);
    expect(Math.max(...b.words.map((w) => w.speed))).toBeGreaterThan(Math.max(...a.words.map((w) => w.speed)));
    expect(createWave(29, "en").words.some((w) => w.kind === "boss")).toBe(true);
    expect(createWave(4, "en")).toEqual(createWave(4, "en"));
  });

  it("every language has full word banks and words fit the field", () => {
    for (const l of LANGS) {
      const bank = WORDS[l];
      expect(bank.short.length).toBeGreaterThanOrEqual(25);
      expect(bank.mid.length).toBeGreaterThanOrEqual(25);
      expect(bank.long.length).toBeGreaterThanOrEqual(15);
      expect(bank.boss.length).toBe(6);
      for (let w = 0; w < WAVE_COUNT; w++) {
        for (const f of createWave(w, l).words) expect(f.x + wordWidth(f, l)).toBeLessThanOrEqual(FIELD_W);
      }
    }
  });

  it("folds accents and case for Latin scripts only", () => {
    expect(normalise(" Fusée ", "fr")).toBe("fusee");
    expect(normalise("Árbol", "es")).toBe("arbol");
    expect(normalise("무지개", "ko")).toBe("무지개");
    expect(normalise("  천 리   길도 ", "ko")).toBe("천 리 길도");
  });

  it("typing a word pops the lowest match; a miss breaks the combo", () => {
    let s = createWave(0, "en");
    s = step(s, 30);
    const target = s.words.find((w) => w.spawned)!;
    const r = submit(s, target.text.toUpperCase());
    expect(r.hit?.text).toBe(target.text);
    expect(r.state.combo).toBe(1);
    expect(submit(r.state, "zzzz").state.combo).toBe(0);
  });

  it("words reaching the wall cost hearts and idle players lose", () => {
    let s = createWave(3, "ko");
    for (let i = 0; i < 2000 && s.status === "play"; i++) s = step(s, 0.1);
    expect(s.status).toBe("lost");
    expect(s.hp).toBe(0);
  });

  it("a perfect typist clears every wave in every language with three stars", () => {
    for (const l of LANGS) for (const w of [0, 9, 19, 29]) {
      const s = runPerfect(createWave(w, l));
      expect(s.status, `${l} wave ${w + 1}`).toBe("won");
      expect(s.hp).toBe(WALL_HP);
      expect(starsFor(s)).toBe(3);
    }
  });

  it("bomb words clear the screen and gold words slow time", () => {
    let s = createWave(0, "en");
    s = step(s, 60);
    s = { ...s, words: s.words.map((w, i) => ({ ...w, spawned: true, kind: i === 0 ? "bomb" : i === 1 ? "gold" : "word" })) };
    const gold = submit(s, s.words[1].text);
    expect(gold.state.slowUntil).toBeGreaterThan(s.time);
    const bomb = submit(gold.state, s.words[0].text);
    expect(bomb.cleared.length).toBeGreaterThan(0);
  });
});
