import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PLAY_START_EVENT, sendPlayEvent } from "@/lib/games/play-telemetry";

/**
 * First-play coach (2026-11-21).
 *
 * The studio audit found an in-game tutorial in only 4 of 192 games. Most games
 * already have a short "how to play" line in game-guides.ts, but it sits below
 * the board where a first-time player never looks. This card shows that line
 * once, on top of the board, the first time a player starts the game.
 *
 * It listens for the play-start event that useArcadePortal sends, and for the
 * first press inside the game area, so it covers games without touching each one.
 * The card never blocks input: only the card itself takes pointer events.
 */

const SEEN_PREFIX = "oiyo:first-play-coach:";
const AUTO_HIDE_MS = 9000;

export function coachSeenKey(slug: string): string {
  return `${SEEN_PREFIX}${slug}`;
}

function hasSeen(slug: string): boolean {
  try {
    return window.localStorage.getItem(coachSeenKey(slug)) === "1";
  } catch {
    return false;
  }
}

function markSeen(slug: string): void {
  try {
    window.localStorage.setItem(coachSeenKey(slug), "1");
  } catch {
    // Private mode: the card may show again next visit, which is acceptable.
  }
}

interface Props {
  slug: string;
  title: string;
  how: string;
  okLabel: string;
}

export default function FirstPlayCoach({ slug, title, how, okLabel }: Props) {
  const [visible, setVisible] = useState(false);
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    if (!how || hasSeen(slug)) return;
    const onStart = () => {
      if (hasSeen(slug)) return;
      markSeen(slug);
      // Inside real fullscreen only the fullscreen element is painted.
      setHost(document.fullscreenElement ?? document.body);
      setVisible(true);
      sendPlayEvent("game_coach_shown", { game_id: slug });
    };
    // Games that never enter the shared immersive mode still get the card on the
    // first press inside the game area (not on the guide, header or links).
    const onPress = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !target.closest("main")) return;
      if (target.closest("[data-game-guide], header, nav, footer, a, [data-first-play-coach]")) return;
      onStart();
    };
    window.addEventListener(PLAY_START_EVENT, onStart);
    document.addEventListener("pointerdown", onPress, true);
    return () => {
      window.removeEventListener(PLAY_START_EVENT, onStart);
      document.removeEventListener("pointerdown", onPress, true);
    };
  }, [slug, how]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    const onFullscreen = () => setHost(document.fullscreenElement ?? document.body);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [visible]);

  if (!visible || !host) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" data-first-play-coach>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-md"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          💡
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 max-h-32 overflow-y-auto text-sm leading-relaxed text-muted-foreground">{how}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            sendPlayEvent("game_coach_dismiss", { game_id: slug });
          }}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          {okLabel}
        </button>
      </div>
    </div>,
    host,
  );
}
