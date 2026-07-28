import { describe, expect, it, vi } from 'vitest';
import { getPrefersReducedMotion, subscribeToReducedMotion, REDUCED_MOTION_QUERY } from './reduced-motion';

describe('reduced motion contract', () => {
  it('reads the reduce setting from matchMedia', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia } });
    expect(getPrefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });

  it('notifies and unsubscribes when the setting changes', () => {
    let handler: (() => void) | undefined;
    const media = { matches: false, addEventListener: vi.fn((_type: string, cb: () => void) => { handler = cb; }), removeEventListener: vi.fn() };
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: vi.fn(() => media) } });
    const onChange = vi.fn();
    const unsubscribe = subscribeToReducedMotion(onChange);
    media.matches = true;
    handler?.();
    expect(onChange).toHaveBeenCalledWith(true);
    unsubscribe();
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
