export type NumberGuessingDifficulty = "easy" | "normal" | "hard";
export type NumberGuessingStatus = "playing" | "won" | "lost";
export type NumberGuessingTemperature = "hot" | "warm" | "cold";
export type NumberGuessingDirection = "higher" | "lower" | "exact";

export interface NumberGuessingAttempt {
  guess: number;
  direction: NumberGuessingDirection;
  temperature: NumberGuessingTemperature | "exact";
  distance: number;
}

export interface NumberGuessingState {
  seed: number;
  difficulty: NumberGuessingDifficulty;
  secret: number;
  min: number;
  max: number;
  lowerBound: number;
  upperBound: number;
  maxTries: number | null;
  attempts: NumberGuessingAttempt[];
  status: NumberGuessingStatus;
}

export const NUMBER_GUESSING_CONFIG: Record<NumberGuessingDifficulty, { max: number; tries: number | null }> = {
  easy: { max: 50, tries: null },
  normal: { max: 100, tries: 10 },
  hard: { max: 1000, tries: 7 },
};

export function createNumberGuessingGame(seed: number, difficulty: NumberGuessingDifficulty): NumberGuessingState {
  const normalizedSeed = seed >>> 0;
  const config = NUMBER_GUESSING_CONFIG[difficulty];
  return {
    seed: normalizedSeed,
    difficulty,
    secret: normalizedSeed % config.max + 1,
    min: 1,
    max: config.max,
    lowerBound: 1,
    upperBound: config.max,
    maxTries: config.tries,
    attempts: [],
    status: "playing",
  };
}

export function guessNumber(state: NumberGuessingState, guess: number): NumberGuessingState {
  if (state.status !== "playing" || !Number.isInteger(guess) || guess < state.min || guess > state.max || state.attempts.some((attempt) => attempt.guess === guess)) return state;
  const distance = Math.abs(guess - state.secret);
  const direction: NumberGuessingDirection = guess === state.secret ? "exact" : guess < state.secret ? "higher" : "lower";
  const temperature: NumberGuessingAttempt["temperature"] = distance === 0 ? "exact" : distance <= Math.max(1, Math.floor(state.max * 0.05)) ? "hot" : distance <= Math.max(2, Math.floor(state.max * 0.2)) ? "warm" : "cold";
  const attempts = [...state.attempts, { guess, direction, temperature, distance }];
  const exhausted = state.maxTries !== null && attempts.length >= state.maxTries;
  return {
    ...state,
    attempts,
    lowerBound: direction === "higher" ? Math.max(state.lowerBound, guess + 1) : state.lowerBound,
    upperBound: direction === "lower" ? Math.min(state.upperBound, guess - 1) : state.upperBound,
    status: direction === "exact" ? "won" : exhausted ? "lost" : "playing",
  };
}

export function suggestedGuess(state: NumberGuessingState): number {
  return Math.floor((state.lowerBound + state.upperBound) / 2);
}
