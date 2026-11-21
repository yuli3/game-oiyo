// Result bridge for prototype games that run inside an iframe (PrototypeGameShell).
// The prototype posts { type: "oiyo:game-result", slug, outcome, score? } to its parent;
// the parent checks the sender and saves it to the shared records store once.
// public/prototypes/oiyo-result-bridge.js is the plain-JS sender for the static HTML games.
import { recordBest, recordResult } from "./records";

export const GAME_RESULT_MESSAGE = "oiyo:game-result";
export type PrototypeOutcome = "w" | "l" | "d";
export type PrototypeResult = { slug: string; outcome: PrototypeOutcome; score?: number };

const MAX_SCORE = 10_000_000;
// Unity builds (firefly-keeper's jslib) send whole words; the static prototypes send w/l/d.
const OUTCOME_ALIASES: Record<string, PrototypeOutcome> = { w: "w", l: "l", d: "d", win: "w", loss: "l", draw: "d" };

/** Returns the result only if it is well formed and names the game this page shows. */
export function parsePrototypeResult(data: unknown, expectedSlug: string): PrototypeResult | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.type !== GAME_RESULT_MESSAGE || d.slug !== expectedSlug) return null;
  const outcome = typeof d.outcome === "string" && Object.hasOwn(OUTCOME_ALIASES, d.outcome) ? OUTCOME_ALIASES[d.outcome] : undefined;
  if (!outcome) return null;
  const result: PrototypeResult = { slug: expectedSlug, outcome };
  if (typeof d.score === "number" && Number.isFinite(d.score) && d.score > 0 && d.score <= MAX_SCORE) {
    result.score = Math.round(d.score);
  }
  return result;
}

export function savePrototypeResult(result: PrototypeResult): void {
  recordResult(result.slug, result.outcome);
  if (result.score) recordBest(result.slug, result.score, "score", undefined, { trackPlay: false });
}

/**
 * Sender side for bundled prototype clients. Reports once each time the phase changes
 * into an ending; the first phase seen is skipped so a restored finished run is not recounted.
 */
export function createPhaseReporter(
  slug: string,
  endings: Partial<Record<string, PrototypeOutcome>>,
  post: (message: Record<string, unknown>) => void = defaultPost,
): (phase: string, score?: number) => void {
  let seen = false;
  let last: string | undefined;
  return (phase, score) => {
    if (!seen) { seen = true; last = phase; return; }
    if (phase === last) return;
    last = phase;
    const outcome = endings[phase];
    if (!outcome) return;
    const message: Record<string, unknown> = { type: GAME_RESULT_MESSAGE, slug, outcome };
    if (typeof score === "number" && Number.isFinite(score) && score > 0) message.score = Math.round(score);
    post(message);
  };
}

function defaultPost(message: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage(message, window.location.origin);
  } catch {
    /* cross-origin or detached frame — records are best-effort */
  }
}
