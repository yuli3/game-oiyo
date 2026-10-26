/**
 * studio-engine-runtime.ts
 *
 * Universal Platform Runtime Bridge for the OIYO Web-Unity Engine v5.0.
 * Automatically attaches to all 145+ studio games via `GamePlayBeacon` and `useArcadePortal`:
 * - Adaptive Frame-Budget Profiler (`evaluateAdaptiveQualityTier` -> `data-engine-tier`, `data-engine-dpr`)
 * - Unity `OnApplicationPause` visibility lifecycle & background state protection
 * - Unified Studio Engine SDK Registry (`window.__OIYO_ENGINE__`)
 */

import { evaluateAdaptiveQualityTier, type QualityProfileRecommendation } from './engine-v2';
import { StudioGizmoInspector, type FrameTelemetrySummary } from './engine-v4-net-tools';

export const STUDIO_ENGINE_VERSION = '5.0.0';

export interface StudioEngineSnapshot {
  version: string;
  activeSlug: string;
  isPausedByVisibility: boolean;
  quality: QualityProfileRecommendation;
  telemetry: FrameTelemetrySummary;
}

export class StudioEngineMonitor {
  public readonly version: string = STUDIO_ENGINE_VERSION;
  public activeSlug: string;
  public isPausedByVisibility: boolean = false;
  public readonly gizmo: StudioGizmoInspector;
  private readonly frameDeltaSamples: number[] = [];
  private readonly maxSamples: number = 60;

  constructor(slug: string = 'global', enableGizmo: boolean = false) {
    this.activeSlug = slug;
    this.gizmo = new StudioGizmoInspector(enableGizmo, 60);
  }

  public recordFrameDelta(dtMs: number): void {
    const cleanDt = Math.max(1, Math.min(200, dtMs));
    this.frameDeltaSamples.push(cleanDt);
    if (this.frameDeltaSamples.length > this.maxSamples) {
      this.frameDeltaSamples.shift();
    }
    this.gizmo.beginFrame(cleanDt);
  }

  public setVisibilityPaused(paused: boolean): void {
    this.isPausedByVisibility = paused;
  }

  public getSnapshot(): StudioEngineSnapshot {
    return {
      version: this.version,
      activeSlug: this.activeSlug,
      isPausedByVisibility: this.isPausedByVisibility,
      quality: evaluateAdaptiveQualityTier(this.frameDeltaSamples),
      telemetry: this.gizmo.getTelemetrySummary(),
    };
  }
}
