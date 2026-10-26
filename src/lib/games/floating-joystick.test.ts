import { describe, it, expect, beforeEach } from 'vitest';
import { FloatingJoystick } from './floating-joystick';

describe('FloatingJoystick', () => {
  let joystick: FloatingJoystick;

  beforeEach(() => {
    joystick = new FloatingJoystick({ maxRadius: 50, deadzone: 10 });
  });

  it('initializes in inactive state', () => {
    const s = joystick.getState();
    expect(s.active).toBe(false);
    expect(s.touchId).toBeNull();
    expect(s.intensity).toBe(0);
    expect(s.vectorX).toBe(0);
    expect(s.vectorY).toBe(0);
  });

  it('starts at touch origin coordinates', () => {
    joystick.start(1, 100, 200);
    const s = joystick.getState();
    expect(s.active).toBe(true);
    expect(s.touchId).toBe(1);
    expect(s.originX).toBe(100);
    expect(s.originY).toBe(200);
    expect(s.intensity).toBe(0);
  });

  it('respects deadzone and outputs zero intensity within deadzone', () => {
    joystick.start(1, 100, 100);
    joystick.move(1, 105, 105); // dist ~ 7.07 < deadzone(10)

    const s = joystick.getState();
    expect(s.intensity).toBe(0);
    expect(s.vectorX).toBe(0);
    expect(s.vectorY).toBe(0);
  });

  it('computes direction and normalized intensity past deadzone', () => {
    joystick.start(1, 100, 100);
    // move right by 30px (deadzone is 10, maxRadius is 50, effective range 40, dist 30 -> (30-10)/40 = 0.5)
    joystick.move(1, 130, 100);

    const s = joystick.getState();
    expect(s.intensity).toBeCloseTo(0.5);
    expect(s.vectorX).toBeCloseTo(0.5);
    expect(s.vectorY).toBeCloseTo(0);
    expect(s.deltaX).toBe(30);
    expect(s.deltaY).toBe(0);
  });

  it('clamps at maxRadius and caps intensity at 1.0', () => {
    joystick.start(1, 100, 100);
    // move right by 100px (> 50)
    joystick.move(1, 200, 100);

    const s = joystick.getState();
    expect(s.intensity).toBe(1.0);
    expect(s.vectorX).toBe(1.0);
    expect(s.deltaX).toBe(50);
  });

  it('ignores move and end from mismatched touchId', () => {
    joystick.start(1, 100, 100);

    const movedOther = joystick.move(2, 140, 100);
    expect(movedOther).toBe(false);
    expect(joystick.getState().intensity).toBe(0);

    const endedOther = joystick.end(2);
    expect(endedOther).toBe(false);
    expect(joystick.getState().active).toBe(true);

    const endedSelf = joystick.end(1);
    expect(endedSelf).toBe(true);
    expect(joystick.getState().active).toBe(false);
  });
});
