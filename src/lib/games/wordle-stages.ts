/**
 * Word stages for the five-letter guess game (stage range 2026-11-22).
 * Each stage is a fixed seed, so every player gets the same word for the same stage.
 * Later stages give fewer guesses: 6 for stages 1-10, 5 for 11-20, 4 for 21-30.
 */
import type { WordleState } from "./wordle";

export const WORDLE_STAGE_SLUG = "five-letter-guess";
export const WORDLE_STAGE_COUNT = 30;

export function isWordleStageIndex(index: unknown): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < WORDLE_STAGE_COUNT;
}

export function wordleStageSeed(index: number): number {
  return (0x776f_7264 ^ Math.imul(index + 1, 2654435761)) >>> 0;
}

export function wordleStageGuessLimit(index: number): number {
  if (index < 10) return 6;
  if (index < 20) return 5;
  return 4;
}

export function wordleStagePassed(index: number, state: Pick<WordleState, "status" | "guesses">): boolean {
  return state.status === "won" && state.guesses.length <= wordleStageGuessLimit(index);
}
