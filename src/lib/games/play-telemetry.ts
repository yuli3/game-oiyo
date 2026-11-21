/**
 * Shared play telemetry (2026-11-21).
 *
 * The studio-style audit found that only 4 of 192 games sent any play event,
 * so nobody could see how many visitors actually start a game or how long
 * they stay. Every game that uses useArcadePortal now reports a play session
 * through the site's existing gtag (SEO.astro), with no per-game code:
 *   game_session_start  { game_id, locale }
 *   game_session_end    { game_id, locale, duration_s, reason }
 * Nothing is sent when gtag is missing (no consent, ad blockers, tests).
 */

type Gtag = (...args: unknown[]) => void;

const LOCALES = new Set(["ko", "en", "ja", "zh", "fr", "es"]);

/** "/en/aim-trainer/" → { gameId: "aim-trainer", locale: "en" }. Korean pages may have no prefix. */
export function gameContextFromPath(pathname: string): { gameId: string; locale: string } {
  const parts = pathname.split("/").filter(Boolean);
  let locale = "ko";
  if (parts.length && LOCALES.has(parts[0])) locale = parts.shift() as string;
  return { gameId: parts[0] ?? "home", locale };
}

export function sendPlayEvent(name: string, params: Record<string, unknown>, win: (Window & { gtag?: Gtag }) | undefined = typeof window === "undefined" ? undefined : (window as Window & { gtag?: Gtag })): boolean {
  const gtag = win?.gtag;
  if (typeof gtag !== "function") return false;
  try {
    gtag("event", name, params);
    return true;
  } catch {
    return false;
  }
}

/** Window event fired when a play session starts (first-play coach listens to it). */
export const PLAY_START_EVENT = "oiyo:play-start";

function announceStart(gameId: string): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
  try {
    window.dispatchEvent(new CustomEvent(PLAY_START_EVENT, { detail: { gameId } }));
  } catch {
    // Never let a listener break the game start.
  }
}

export interface PlaySessionTracker {
  start: () => void;
  end: (reason: "exit" | "pagehide" | "unmount") => void;
}

/** Start/end pairs; end without a start is ignored so ESC + unmount never double count. */
export function createPlaySessionTracker(
  getPath: () => string = () => (typeof location === "undefined" ? "/" : location.pathname),
  now: () => number = () => Date.now(),
  send: typeof sendPlayEvent = sendPlayEvent,
): PlaySessionTracker {
  let startedAt: number | null = null;
  return {
    start() {
      if (startedAt !== null) return;
      startedAt = now();
      const { gameId, locale } = gameContextFromPath(getPath());
      send("game_session_start", { game_id: gameId, locale });
      announceStart(gameId);
    },
    end(reason) {
      if (startedAt === null) return;
      const durationS = Math.max(0, Math.round((now() - startedAt) / 1000));
      startedAt = null;
      const { gameId, locale } = gameContextFromPath(getPath());
      send("game_session_end", { game_id: gameId, locale, duration_s: durationS, reason, transport_type: "beacon" });
    },
  };
}
