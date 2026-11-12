import { describe, expect, it, vi } from 'vitest';
import { subscribeAutoPause } from './game-flow';

class Visibility extends EventTarget { visibilityState = 'visible'; }

describe('live game interruption', () => {
  it('pauses on blur even if the page is still visible', () => {
    const doc = new Visibility(); const win = new EventTarget(); const pause = vi.fn();
    const dispose = subscribeAutoPause(doc, win, pause);
    win.dispatchEvent(new Event('blur'));
    expect(pause).toHaveBeenCalledOnce();
    dispose();
  });
  it('pauses hidden sessions, never resumes on visibility/focus, and cleans up', () => {
    const doc = new Visibility(); const win = new EventTarget(); const pause = vi.fn();
    const dispose = subscribeAutoPause(doc, win, pause);
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(pause).toHaveBeenCalledOnce();
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('focus'));
    expect(pause).toHaveBeenCalledOnce();
    dispose();
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('blur'));
    expect(pause).toHaveBeenCalledOnce();
  });
  it('cannot start a live clock while already hidden', () => {
    const doc = new Visibility(); doc.visibilityState = 'hidden'; const pause = vi.fn();
    const dispose = subscribeAutoPause(doc, new EventTarget(), pause);
    expect(pause).toHaveBeenCalledOnce();
    dispose();
  });
});
