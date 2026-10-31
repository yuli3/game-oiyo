import { describe, it, expect } from 'vitest';
import {
  ShockwaveDistortion2D,
  ChromaticAberrationFilter,
  NeonGlowBloomPass,
} from './post-fx-shaders';

describe('Post-FX Juice Shader & Filter Suite (Research Goal 5)', () => {
  it('1. triggers shockwave, expands radius, and calculates refraction displacement', () => {
    const shockwave = new ShockwaveDistortion2D(4);
    expect(shockwave.capacity).toBe(4);

    // Initial state: no displacement
    const initialDisp = shockwave.getDisplacementAt(100, 100);
    expect(initialDisp.intensity).toBe(0);
    expect(initialDisp.dx).toBe(0);

    // Trigger at (100, 100)
    shockwave.trigger(100, 100, { maxRadius: 150, speed: 500, thickness: 30, amplitude: 20 });
    expect(shockwave.waves[0].active).toBe(true);

    // Step 0.1s: wave radius expanded to 50
    shockwave.update(0.1);
    expect(shockwave.waves[0].radius).toBeCloseTo(50, 1);

    // Sample displacement at radius 50 (e.g. at (150, 100))
    const dispAtCrest = shockwave.getDisplacementAt(150, 100);
    expect(dispAtCrest.intensity).toBeGreaterThan(0);
    expect(dispAtCrest.dx).toBeGreaterThan(0); // Pushed outwards along X

    // Step 1.0s: wave expires
    shockwave.update(1.0);
    expect(shockwave.waves[0].active).toBe(false);
  });

  it('2. computes chromatic aberration channel offset based on speed and trauma', () => {
    // Low speed, no trauma -> 0 shift
    const idleOffset = ChromaticAberrationFilter.computeOffsets(100, 0);
    expect(idleOffset.intensity).toBe(0);
    expect(idleOffset.rOffset.x).toBe(0);
    expect(idleOffset.bOffset.x).toBe(0);

    // High speed (500px/s) -> distinct red/blue channel split
    const fastOffset = ChromaticAberrationFilter.computeOffsets(500, 0, 4.0);
    expect(fastOffset.intensity).toBeGreaterThan(0.4);
    expect(fastOffset.rOffset.x).toBeLessThan(0); // Red shifted left
    expect(fastOffset.bOffset.x).toBeGreaterThan(0); // Blue shifted right
  });

  it('3. executes NeonGlowBloomPass aura method without error', () => {
    const mockCtx: any = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
    };

    expect(() => {
      NeonGlowBloomPass.renderNeonAura(mockCtx, 100, 100, 50, '#ffffff', '#38bdf8', 1.0);
    }).not.toThrow();
  });
});
