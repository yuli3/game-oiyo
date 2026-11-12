import { describe, expect, it } from 'vitest';
import { neonJoystick, neonCanvasSize } from './neon-survivor-input';

describe('Neon cross-device input and canvas', () => {
  it('clears motion on returning to the deadzone, including its boundary', () => {
    expect(neonJoystick(60, 0).x).toBe(1);
    expect(neonJoystick(8, 0).magnitude).toBe(0);
    expect(neonJoystick(0, 0).x).toBe(0);
    expect(neonJoystick(NaN, 0).magnitude).toBe(0);
  });
  it('limits diagonal motion to the same magnitude as an axis', () => {
    const diagonal = neonJoystick(100, 100);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.knobDistance).toBe(60);
  });
  it('caps high-DPR phones and rounds fractional desktop zoom to stable pixels', () => {
    expect(neonCanvasSize(375, 812, 3)).toEqual({ width: 750, height: 1624, ratio: 2 });
    expect(neonCanvasSize(321, 701, 1.25)).toEqual({ width: 401, height: 876, ratio: 1.25 });
    expect(neonCanvasSize(812, 375, 2)).toEqual({ width: 1624, height: 750, ratio: 2 });
  });
});
