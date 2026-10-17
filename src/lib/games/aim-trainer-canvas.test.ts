import { describe, it, expect } from 'vitest';
import {
  isTargetHit,
  createHitSparks,
  updateSparks,
  createRipple,
  updateRipples,
  createFloatingLabel,
  updateFloatingLabels,
  MODE_COLORS,
} from './aim-trainer-canvas';

describe('AimTrainer Canvas Engine Helpers', () => {
  it('detects precise mouse clicks inside target radius', () => {
    // Target at (100, 100), radius 20
    expect(isTargetHit(100, 100, 100, 100, 20, false)).toBe(true);
    expect(isTargetHit(115, 100, 100, 100, 20, false)).toBe(true);
    expect(isTargetHit(123, 100, 100, 100, 20, false)).toBe(true); // Within 20 + 4 = 24
    expect(isTargetHit(125, 100, 100, 100, 20, false)).toBe(false); // Outside 24
  });

  it('provides generous padding for mobile touch taps', () => {
    // Target at (100, 100), radius 20
    // On touch, padding is max(12, 24 - 20) = 12, effective radius = 32
    expect(isTargetHit(130, 100, 100, 100, 20, true)).toBe(true);
    expect(isTargetHit(135, 100, 100, 100, 20, true)).toBe(false);
  });

  it('creates and updates hit spark particles with physics decay', () => {
    const sparks = createHitSparks(50, 50, '#38bdf8', 8, () => 0.5);
    expect(sparks.length).toBe(8);
    expect(sparks[0].x).toBe(50);
    expect(sparks[0].y).toBe(50);

    const updated = updateSparks(sparks, 0.1);
    expect(updated.length).toBe(8);
    expect(updated[0].life).toBeCloseTo(0.18, 2);
    expect(updated[0].x).not.toBe(50); // Moved by velocity

    // Test expiration
    const expired = updateSparks(sparks, 0.35);
    expect(expired.length).toBe(0);
  });

  it('creates and updates shockwave ripples', () => {
    const ripple = createRipple(100, 100, '#38bdf8', 40);
    expect(ripple.radius).toBe(4);

    const updated = updateRipples([ripple], 0.1);
    expect(updated.length).toBe(1);
    expect(updated[0].radius).toBeGreaterThan(4);

    const expired = updateRipples([ripple], 0.3);
    expect(expired.length).toBe(0);
  });

  it('creates and floats text labels upwards', () => {
    const label = createFloatingLabel('+1', 100, 100, '#38bdf8');
    expect(label.y).toBe(100);

    const updated = updateFloatingLabels([label], 0.1);
    expect(updated.length).toBe(1);
    expect(updated[0].y).toBeLessThan(100); // Floated up

    const expired = updateFloatingLabels([label], 0.5);
    expect(expired.length).toBe(0);
  });

  it('has valid theme colors defined for all modes', () => {
    const modes = ['gridshot', 'flick', 'precision', 'tracking', 'recovery', 'flash'] as const;
    for (const mode of modes) {
      expect(MODE_COLORS[mode]).toBeDefined();
      expect(MODE_COLORS[mode].primary).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
