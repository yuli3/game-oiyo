import { useEffect, useState } from "react";

export type PlayFrameloop = "always" | "never";

/** R3F `frameloop`: GPU runs only while the game is active and the tab is visible. */
export function playFrameloop(active: boolean, hidden: boolean): PlayFrameloop {
  return active && !hidden ? "always" : "never";
}

function readDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

/**
 * Bind a React Three Fiber Canvas to tab visibility (and an optional playing flag).
 * Simulator early-returns do not stop WebGL; `frameloop="never"` does.
 */
export function usePlayFrameloop(active = true): PlayFrameloop {
  const [hidden, setHidden] = useState(readDocumentHidden);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return playFrameloop(active, hidden);
}
