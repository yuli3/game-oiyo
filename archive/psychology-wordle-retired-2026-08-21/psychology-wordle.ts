export type PsychologyWordleLocale = "ko" | "latin";
export type PsychologyWordleTile = "correct" | "present" | "absent";
export type PsychologyWordleStatus = "playing" | "won" | "lost";

export const PSYCHOLOGY_WORDLE_MAX_GUESSES = 6;
export const PSYCHOLOGY_WORDS = {
  ko: ["감정", "기억", "공감", "불안", "인지", "자아", "동기", "기분", "통찰", "신념", "본능", "몰입", "이성", "착각"],
  latin: ["BRAIN", "DREAM", "SLEEP", "HABIT", "TRUST", "GUILT", "PRIDE", "FOCUS", "SENSE", "LOGIC", "ANGER"],
} as const;

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

export interface PsychologyWordleState {
  seed: number;
  rngState: number;
  locale: PsychologyWordleLocale;
  targetDisplay: string;
  target: string[];
  guesses: string[][];
  currentGuess: string[];
  status: PsychologyWordleStatus;
}

function nextRandom(state: number): number {
  let value = state >>> 0 || 0x9e3779b9;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  return value >>> 0;
}

export function psychologyWordleSymbols(word: string, locale: PsychologyWordleLocale): string[] {
  if (locale === "latin") return word.toUpperCase().split("");
  const output: string[] = [];
  for (const character of word) {
    const code = character.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) { output.push(character); continue; }
    output.push(CHO[Math.floor(code / 588)], JUNG[Math.floor((code % 588) / 28)]);
    const final = JONG[code % 28]; if (final) output.push(final);
  }
  return output;
}

export function evaluatePsychologyWordleGuess(guess: string[], target: string[]): PsychologyWordleTile[] {
  const result: PsychologyWordleTile[] = Array(target.length).fill("absent");
  const used = Array(target.length).fill(false);
  for (let index = 0; index < target.length; index += 1) if (guess[index] === target[index]) { result[index] = "correct"; used[index] = true; }
  for (let index = 0; index < target.length; index += 1) {
    if (result[index] === "correct") continue;
    const match = target.findIndex((symbol, targetIndex) => symbol === guess[index] && !used[targetIndex]);
    if (match >= 0) { result[index] = "present"; used[match] = true; }
  }
  return result;
}

export function createPsychologyWordle(seed: number, locale: PsychologyWordleLocale): PsychologyWordleState {
  const normalizedSeed = seed >>> 0;
  const rngState = nextRandom(normalizedSeed);
  const pool = PSYCHOLOGY_WORDS[locale];
  const targetDisplay = pool[rngState % pool.length];
  return { seed: normalizedSeed, rngState, locale, targetDisplay, target: psychologyWordleSymbols(targetDisplay, locale), guesses: [], currentGuess: [], status: "playing" };
}

export function inputPsychologyWordle(state: PsychologyWordleState, symbol: string): PsychologyWordleState {
  const normalized = state.locale === "latin" ? symbol.toUpperCase() : symbol;
  if (state.status !== "playing" || normalized.length === 0 || state.currentGuess.length >= state.target.length) return state;
  return { ...state, currentGuess: [...state.currentGuess, normalized] };
}

export function backspacePsychologyWordle(state: PsychologyWordleState): PsychologyWordleState {
  if (state.status !== "playing" || state.currentGuess.length === 0) return state;
  return { ...state, currentGuess: state.currentGuess.slice(0, -1) };
}

export function submitPsychologyWordle(state: PsychologyWordleState): PsychologyWordleState {
  if (state.status !== "playing" || state.currentGuess.length !== state.target.length) return state;
  const guesses = [...state.guesses, state.currentGuess];
  const won = state.currentGuess.every((symbol, index) => symbol === state.target[index]);
  return { ...state, guesses, currentGuess: [], status: won ? "won" : guesses.length >= PSYCHOLOGY_WORDLE_MAX_GUESSES ? "lost" : "playing" };
}

export type PsychologyWordleHint = { reason: "unknown-slot"; index: number };
export function explainPsychologyWordleHint(state: PsychologyWordleState): PsychologyWordleHint {
  const known = Array(state.target.length).fill(false);
  for (const guess of state.guesses) {
    evaluatePsychologyWordleGuess(guess, state.target).forEach((tile, index) => { if (tile === "correct") known[index] = true; });
  }
  return { reason: "unknown-slot", index: known.findIndex((value) => !value) };
}

export function restartPsychologyWordle(state: PsychologyWordleState): PsychologyWordleState {
  return createPsychologyWordle(state.rngState, state.locale);
}
