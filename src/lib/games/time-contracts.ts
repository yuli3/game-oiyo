/** Shared timing contracts for games. All simulation work receives seconds. */
export const MAX_FRAME_DELTA_MS = 100;

export function frameDeltaSeconds(previous: number | null, now: number, maxMs = MAX_FRAME_DELTA_MS): number {
  if (previous === null || !Number.isFinite(previous) || !Number.isFinite(now)) return 0;
  if (typeof document !== "undefined" && document.hidden) return 0;
  return Math.min(Math.max(0, now - previous), maxMs) / 1000;
}

/** Scale values authored for one 60 Hz frame to real elapsed time. */
export function frameScale(previous: number | null, now: number): number {
  if (typeof document !== "undefined" && document.hidden) return 0;
  return frameDeltaSeconds(previous, now) * 60 || 1;
}

export function elapsedMilliseconds(startedAt: number | null, now: number): number {
  if (startedAt === null || !Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, now - startedAt);
}

export function elapsedSeconds(startedAt: number | null, now: number): number {
  return Math.floor(elapsedMilliseconds(startedAt, now) / 1000);
}

export function recordedElapsedSeconds(startedAt: number | null, now: number): number {
  return Math.max(1, Math.ceil(elapsedMilliseconds(startedAt, now) / 1000));
}

export type DeltaFrame = (deltaSeconds: number, now: number) => void;

/** RAF driver: cancels the frame callback while hidden; resumes on visible. */
export function createDeltaLoop(step: DeltaFrame): { start: () => void; stop: () => void } {
  let raf = 0;
  let previous: number | null = null;
  let running = false;

  const tick = (now: number) => {
    raf = 0;
    if (!running) return;
    if (typeof document !== "undefined" && document.hidden) {
      previous = null;
      return;
    }
    const delta = frameDeltaSeconds(previous, now);
    previous = now;
    step(delta, now);
    raf = requestAnimationFrame(tick);
  };

  const onVisibility = () => {
    if (!running) return;
    if (typeof document !== "undefined" && document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      previous = null;
      return;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      previous = null;
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisibility);
        if (document.hidden) return;
      }
      raf = requestAnimationFrame(tick);
    },
    stop: () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      previous = null;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    },
  };
}
