/**
 * OIYO GSAP Cinematic Boss Director & Combo Tension Engine (`cinematic-director.ts`)
 *
 * Implements Research Goal 7:
 * - CinematicBossDirector: Orchestrates multi-stage boss entrance cutscenes using gsap.timeline
 * - ComboTensionDirector: Hitstop, dynamic slow-motion, and combo punch scaling
 */

import { gsap } from 'gsap';

// ============================================================================
// 1. CinematicBossDirector (Orchestrated Boss Entrance Sequence)
// ============================================================================

export interface BossIntroState {
  cameraZoom: number;
  bossAlpha: number;
  eyeGlow: number;
  warningTextScale: number;
  warningAlpha: number;
  timeScale: number;
  inCutscene: boolean;
}

export class CinematicBossDirector {
  public state: BossIntroState = {
    cameraZoom: 1.0,
    bossAlpha: 1.0,
    eyeGlow: 0.0,
    warningTextScale: 0.5,
    warningAlpha: 0.0,
    timeScale: 1.0,
    inCutscene: false,
  };

  private activeTimeline: gsap.core.Timeline | null = null;

  /**
   * Plays a 2-second cinematic boss awakening intro sequence.
   */
  public playBossIntro(onComplete?: () => void): gsap.core.Timeline {
    if (this.activeTimeline) {
      this.activeTimeline.kill();
    }

    this.state.inCutscene = true;
    this.state.bossAlpha = 0.0;
    this.state.eyeGlow = 0.0;
    this.state.warningAlpha = 0.0;
    this.state.warningTextScale = 0.5;

    const tl = gsap.timeline({
      onComplete: () => {
        this.state.inCutscene = false;
        this.state.timeScale = 1.0;
        if (onComplete) onComplete();
      },
    });

    // Stage 1: Ambient slow-mo & eye awaken
    tl.to(this.state, {
      timeScale: 0.2,
      eyeGlow: 1.0,
      bossAlpha: 1.0,
      duration: 0.6,
      ease: 'power2.out',
    })
    // Stage 2: Warning text slam & camera snap
    .to(
      this.state,
      {
        warningAlpha: 1.0,
        warningTextScale: 1.2,
        cameraZoom: 1.15,
        duration: 0.4,
        ease: 'back.out(2)',
      },
      '-=0.1'
    )
    // Stage 3: Hold and recover camera & timeScale to normal 1.0
    .to(this.state, {
      warningAlpha: 0.0,
      warningTextScale: 1.4,
      cameraZoom: 1.0,
      timeScale: 1.0,
      duration: 0.6,
      ease: 'power3.inOut',
    });

    this.activeTimeline = tl;
    return tl;
  }

  public skip(): void {
    if (this.activeTimeline) {
      this.activeTimeline.progress(1);
    }
  }

  public dispose(): void {
    if (this.activeTimeline) {
      this.activeTimeline.kill();
      this.activeTimeline = null;
    }
  }
}

// ============================================================================
// 2. ComboTensionDirector (Hitstop & Dynamic Combat Pace)
// ============================================================================

export class ComboTensionDirector {
  public hitstopTimeRemaining: number = 0;
  public comboScale: number = 1.0;
  public vignettePulse: number = 0.0;

  /**
   * Applies an impactful hitstop (freeze-frame) for critical hits.
   */
  public triggerHitstop(durationSec: number = 0.045): void {
    this.hitstopTimeRemaining = Math.max(this.hitstopTimeRemaining, durationSec);
  }

  /**
   * Pulses combo badge scale and screen vignette when combo increases.
   */
  public pulseCombo(comboCount: number): void {
    const intensity = Math.min(2.0, 1.0 + comboCount * 0.15);
    this.comboScale = intensity;
    this.vignettePulse = Math.min(1.0, comboCount * 0.2);

    gsap.to(this, {
      comboScale: 1.0,
      vignettePulse: 0.0,
      duration: 0.35,
      ease: 'elastic.out(1, 0.4)',
    });
  }

  public update(dtSeconds: number): boolean {
    if (this.hitstopTimeRemaining > 0) {
      this.hitstopTimeRemaining -= dtSeconds;
      return true; // Game should freeze frame
    }
    return false;
  }
}
