/**
 * Procedural Camera Trauma & Screen Shake Engine.
 * Implements non-linear trauma decay (Shake = Trauma^2) and multi-axis displacement
 * based on Squirrel Eiserloh's GDC "Math for Game Programmers: Juicing Your Cameras With Math".
 */

export interface CameraShakeConfig {
  /** Maximum pixel displacement along X and Y axes. Default: 16px */
  maxOffsetPx?: number;
  /** Maximum rotational tilt in degrees. Default: 3.5 deg */
  maxAngleDeg?: number;
  /** Linear decay rate per second (Trauma reduces to 0 in 1/decayRate seconds). Default: 1.5 */
  decayRate?: number;
  /** Power exponent for shake curve: Trauma^power. Default: 2 (quadratic) */
  exponent?: number;
  /** Optional deterministic or custom random noise generator in [-1, 1] */
  noiseFn?: () => number;
}

export interface CameraShakeOffset {
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  trauma: number;
  shake: number;
  isShaking: boolean;
}

export interface ScreenTraumaState {
  trauma: number;
  config: Required<CameraShakeConfig>;
}

export function defaultNoise(): number {
  return Math.random() * 2 - 1;
}

export function createCameraShake(config: CameraShakeConfig = {}): ScreenTraumaState {
  return {
    trauma: 0,
    config: {
      maxOffsetPx: config.maxOffsetPx ?? 16,
      maxAngleDeg: config.maxAngleDeg ?? 3.5,
      decayRate: config.decayRate ?? 1.5,
      exponent: config.exponent ?? 2,
      noiseFn: config.noiseFn ?? defaultNoise,
    },
  };
}

/**
 * Adds trauma to the camera, clamping maximum trauma at 1.0.
 */
export function addTrauma(
  state: ScreenTraumaState,
  amount: number
): ScreenTraumaState {
  const nextTrauma = Math.min(1, Math.max(0, state.trauma + Math.max(0, amount)));
  return {
    ...state,
    trauma: nextTrauma,
  };
}

/**
 * Updates trauma decay over dt seconds and calculates current camera displacement and tilt.
 */
export function updateCameraShake(
  state: ScreenTraumaState,
  dtSeconds: number
): { state: ScreenTraumaState; offset: CameraShakeOffset } {
  const dt = Math.max(0, dtSeconds);
  const nextTrauma = Math.max(0, state.trauma - state.config.decayRate * dt);
  const nextState: ScreenTraumaState = {
    ...state,
    trauma: nextTrauma,
  };

  if (nextTrauma <= 0.001) {
    return {
      state: { ...nextState, trauma: 0 },
      offset: {
        offsetX: 0,
        offsetY: 0,
        rotationDeg: 0,
        trauma: 0,
        shake: 0,
        isShaking: false,
      },
    };
  }

  // Non-linear power curve: Shake = Trauma^exponent
  const shake = Math.pow(nextTrauma, state.config.exponent);
  const noise = state.config.noiseFn;

  const offsetX = state.config.maxOffsetPx * shake * noise();
  const offsetY = state.config.maxOffsetPx * shake * noise();
  const rotationDeg = state.config.maxAngleDeg * shake * noise();

  return {
    state: nextState,
    offset: {
      offsetX,
      offsetY,
      rotationDeg,
      trauma: nextTrauma,
      shake,
      isShaking: true,
    },
  };
}

// ── Backward-compatible & Engine alias exports ──
export type ScreenShakeEngine = ScreenTraumaState;
export const createScreenShakeEngine = createCameraShake;
export const addScreenShakeTrauma = addTrauma;
export function stepScreenShake(engine: ScreenTraumaState, dtSeconds: number): ScreenTraumaState {
  return updateCameraShake(engine, dtSeconds).state;
}
export function sampleScreenShakeOffset(engine: ScreenTraumaState, _timeSeconds?: number): CameraShakeOffset {
  return updateCameraShake(engine, 0).offset;
}
