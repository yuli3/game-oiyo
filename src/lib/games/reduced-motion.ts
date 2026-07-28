import { useEffect, useState } from 'react';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function getPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

export function subscribeToReducedMotion(onChange: (value: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  const listener = () => onChange(media.matches);
  media.addEventListener?.('change', listener);
  return () => media.removeEventListener?.('change', listener);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getPrefersReducedMotion);
  useEffect(() => subscribeToReducedMotion(setReduced), []);
  return reduced;
}
