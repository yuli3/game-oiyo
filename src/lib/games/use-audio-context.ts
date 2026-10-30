import { useCallback, useRef } from "react";

/**
 * useAudioContext
 *
 * Lazily instantiates and safely unlocks the Web AudioContext upon user gesture.
 * Replaces repetitive inline `window.AudioContext || webkitAudioContext` boilerplate across games.
 */
export function useAudioContext(): () => AudioContext | null {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;

    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }

    return audioCtxRef.current;
  }, []);

  return getAudioContext;
}
