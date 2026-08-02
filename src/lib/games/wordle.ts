export type WordleMode = "daily" | "random";
export type WordleStatus = "playing" | "won" | "lost";
export type WordleMark = "correct" | "present" | "absent";
export interface WordleState { seed: number; targetIndex: number; targetCount: number; mode: WordleMode; dateKey: string | null; current: string; guesses: string[]; status: WordleStatus }

export function wordleDateSeed(dateKey: string): number {
  let hash = 2166136261;
  for (const char of dateKey) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function createWordle(seed: number, targetCount: number, mode: WordleMode, dateKey: string | null): WordleState {
  if (!Number.isInteger(targetCount) || targetCount < 1) throw new RangeError("Wordle requires a non-empty target list");
  const normalizedSeed = seed >>> 0;
  return { seed: normalizedSeed, targetIndex: normalizedSeed % targetCount, targetCount, mode, dateKey, current: "", guesses: [], status: "playing" };
}

export function inputWordle(state: WordleState, key: string): WordleState {
  if (state.status !== "playing") return state;
  if (key === "BACKSPACE") return state.current ? { ...state, current: state.current.slice(0, -1) } : state;
  const letter = key.toUpperCase();
  return /^[A-Z]$/.test(letter) && state.current.length < 5 ? { ...state, current: state.current + letter } : state;
}

export function submitWordle(state: WordleState, target: string, valid: boolean): WordleState {
  const normalizedTarget = target.toUpperCase();
  if (state.status !== "playing" || state.current.length !== 5 || !valid || !/^[A-Z]{5}$/.test(normalizedTarget)) return state;
  const guesses = [...state.guesses, state.current];
  return { ...state, current: "", guesses, status: state.current === normalizedTarget ? "won" : guesses.length >= 6 ? "lost" : "playing" };
}

export function evaluateWordleGuess(guess: string, target: string): WordleMark[] {
  const marks: WordleMark[] = Array(5).fill("absent"); const remaining = target.toUpperCase().split(""); const letters = guess.toUpperCase().split("");
  for (let index = 0; index < 5; index += 1) if (letters[index] === remaining[index]) { marks[index] = "correct"; remaining[index] = ""; }
  for (let index = 0; index < 5; index += 1) if (marks[index] !== "correct") { const found = remaining.indexOf(letters[index]); if (found >= 0) { marks[index] = "present"; remaining[found] = ""; } }
  return marks;
}
