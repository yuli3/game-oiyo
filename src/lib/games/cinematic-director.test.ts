import { describe, it, expect, vi } from 'vitest';
import {
  CinematicBossDirector,
  ComboTensionDirector,
} from './cinematic-director';

describe('GSAP Cinematic Director & Combo Tension Suite (Research Goal 7)', () => {
  it('1. plays boss intro timeline, sets inCutscene, and recovers state on complete', () => {
    const director = new CinematicBossDirector();
    const onComplete = vi.fn();

    const tl = director.playBossIntro(onComplete);
    expect(director.state.inCutscene).toBe(true);
    expect(tl).toBeDefined();

    // Skip to completion
    director.skip();
    expect(director.state.inCutscene).toBe(false);
    expect(director.state.timeScale).toBe(1.0);
    expect(director.state.cameraZoom).toBe(1.0);
    expect(onComplete).toHaveBeenCalled();

    director.dispose();
  });

  it('2. triggers hitstop freeze frame and pulses combo tension scaling', () => {
    const comboDirector = new ComboTensionDirector();

    // Trigger hitstop
    comboDirector.triggerHitstop(0.05);
    expect(comboDirector.hitstopTimeRemaining).toBeCloseTo(0.05);

    // Update steps
    const isFrozen = comboDirector.update(0.02);
    expect(isFrozen).toBe(true);
    expect(comboDirector.hitstopTimeRemaining).toBeCloseTo(0.03);

    // Pulse combo
    comboDirector.pulseCombo(5);
    expect(comboDirector.comboScale).toBeGreaterThan(1.0);
    expect(comboDirector.vignettePulse).toBeGreaterThan(0);
  });
});
