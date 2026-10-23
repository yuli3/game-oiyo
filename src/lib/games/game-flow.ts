// The screen flow every game shares (studio standard 01-quality-bar.md X1, X5, X6):
// title -> setup -> countdown -> play <-> paused -> result -> (retry | exit).
// Games keep their own rules; this only decides which screen comes next, how the
// countdown is timed, and that a hidden tab pauses play. 2026-10-23
import { useEffect, useRef } from "react";

export type FlowPhase = "title" | "setup" | "countdown" | "play" | "paused" | "result";

export type FlowEvent =
  | "enter"         // title: the big Enter button (also opens immersive mode)
  | "start"         // setup: mode, level and augment chosen
  | "countdownDone"
  | "pause"
  | "resume"
  | "hidden"        // tab went to the background
  | "finish"        // win, loss or draw
  | "retry"         // result or pause menu: one tap to a fresh round
  | "exit";         // back to the title

const TRANSITIONS: Record<FlowPhase, Partial<Record<FlowEvent, FlowPhase>>> = {
  title: { enter: "setup" },
  setup: { start: "countdown", exit: "title" },
  countdown: { countdownDone: "play", exit: "title" },
  play: { pause: "paused", hidden: "paused", finish: "result", retry: "countdown", exit: "title" },
  paused: { resume: "play", retry: "countdown", exit: "title" },
  result: { retry: "countdown", exit: "title" },
};

/** The next phase, or null when the event means nothing in this phase. */
export function nextPhase(phase: FlowPhase, event: FlowEvent): FlowPhase | null {
  return TRANSITIONS[phase][event] ?? null;
}

/** Whether the game clock and input should run. */
export function isLive(phase: FlowPhase): boolean {
  return phase === "play";
}

export interface CountdownStep {
  at: number;
  /** 3, 2, 1, then 0 for "go". */
  value: number;
}

export const COUNTDOWN_STEP_MS = { full: 650, quick: 300, reduced: 350 } as const;

/**
 * Countdown ticks in ms from its start; play begins at the returned total.
 * A retry uses the quick timing so a failed round restarts within two seconds (X6).
 */
export function countdownSchedule(options: { quick?: boolean; reducedMotion?: boolean } = {}): { steps: CountdownStep[]; total: number } {
  const step = options.quick ? COUNTDOWN_STEP_MS.quick : options.reducedMotion ? COUNTDOWN_STEP_MS.reduced : COUNTDOWN_STEP_MS.full;
  const steps = [3, 2, 1, 0].map((value, index) => ({ at: index * step, value }));
  return { steps, total: steps.length * step };
}

/** Calls onHide when the tab is hidden while the game is live (E3, X5). */
export function useAutoPause(live: boolean, onHide: () => void): void {
  const callback = useRef(onHide);
  callback.current = onHide;
  useEffect(() => {
    if (!live || typeof document === "undefined") return;
    const listener = () => {
      if (document.visibilityState === "hidden") callback.current();
    };
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, [live]);
}
