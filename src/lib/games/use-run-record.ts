import { useEffect, useRef } from "react";
import { recordBest } from "./records";

/** Records the run when `finished` flips from false to true. Returns whether it saved. */
export function saveRunOnFinish(game: string, wasFinished: boolean, finished: boolean, value: number, unit: "score" | "seconds" = "score", extra?: string): boolean {
  if (!finished || wasFinished || !Number.isFinite(value) || value <= 0) return false;
  recordBest(game, unit === "score" ? Math.round(value) : Math.round(value * 100) / 100, unit, extra);
  return true;
}

/**
 * Saves a run to the shared records store (best score, recent records, achievements)
 * once each time `finished` turns true. For games that keep score but never called recordBest.
 */
export function useRunRecord(game: string, finished: boolean, value: number, unit: "score" | "seconds" = "score", extra?: string): void {
  const wasFinished = useRef(false);
  useEffect(() => {
    saveRunOnFinish(game, wasFinished.current, finished, value, unit, extra);
    wasFinished.current = finished;
  }, [finished, game, value, unit, extra]);
}
