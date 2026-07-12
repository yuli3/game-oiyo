import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useThrottle — canonical shared hook (SSOT: /coding/shared/hooks).
 * Synced into each repo by shared/sync-hooks.sh. Do NOT edit synced copies.
 *
 * Rate-limits a callback (e.g. submit/reroll buttons) so rapid re-clicks
 * collapse into a single leading-edge call at most once per `delay`ms.
 * Returns the throttled callback plus `isThrottling` for disabling or
 * greying out the trigger while it cools down.
 */
export function useThrottle<TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn,
  delay: number,
): [(...args: TArgs) => TReturn | undefined, boolean] {
  const lastExecuted = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isThrottling, setIsThrottling] = useState(false);

  const throttledCallback = useCallback(
    (...args: TArgs) => {
      const now = Date.now();
      if (now - lastExecuted.current < delay) {
        return undefined;
      }

      lastExecuted.current = now;
      setIsThrottling(true);
      timeoutRef.current = setTimeout(() => setIsThrottling(false), delay);
      return callback(...args);
    },
    [callback, delay],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [throttledCallback, isThrottling];
}
