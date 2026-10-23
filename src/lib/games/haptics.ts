// Vibration patterns shared by the games, so the same event feels the same in every game
// (studio standard 01-quality-bar.md F2: success 15ms, fail [30,40,30]).
// One viewer preference turns haptics off for all games. 2026-10-23

export type HapticKind = "tap" | "place" | "success" | "fail" | "combo" | "win";

export const HAPTIC_PATTERNS: Record<HapticKind, number | readonly number[]> = {
  tap: 8,
  place: 10,
  success: 15,
  fail: [30, 40, 30],
  combo: [20, 30, 20],
  win: [20, 40, 20, 40, 60],
};

/** Viewer preference, not a game record: "1" means haptics are off. */
export const HAPTICS_OFF_KEY = "oiyo:game-haptics-off:v1";

type Vibrate = (pattern: number | number[]) => boolean;

function defaultVibrate(): Vibrate | null {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return null;
  return (pattern) => navigator.vibrate(pattern);
}

export interface Haptics {
  fire(kind: HapticKind): void;
  setEnabled(enabled: boolean): void;
  readonly enabled: boolean;
  /** False on devices without the Vibration API (iOS Safari): hide the setting there. */
  readonly supported: boolean;
}

export function createHaptics(options: { enabled?: boolean; vibrate?: Vibrate | null } = {}): Haptics {
  const vibrate = options.vibrate === undefined ? defaultVibrate() : options.vibrate;
  let enabled = options.enabled ?? true;
  return {
    fire(kind) {
      if (!enabled || !vibrate) return;
      const pattern = HAPTIC_PATTERNS[kind];
      try { vibrate(typeof pattern === "number" ? pattern : [...pattern]); } catch { /* optional */ }
    },
    setEnabled(next) {
      enabled = next;
    },
    get enabled() {
      return enabled;
    },
    supported: vibrate !== null,
  };
}

export function readHapticsEnabled(): boolean {
  try { return window.localStorage.getItem(HAPTICS_OFF_KEY) !== "1"; } catch { return true; }
}

export function writeHapticsEnabled(enabled: boolean): void {
  try { window.localStorage.setItem(HAPTICS_OFF_KEY, enabled ? "0" : "1"); } catch { /* private mode */ }
}
