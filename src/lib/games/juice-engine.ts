/**
 * Juice Engine: Unity-grade game feel & tactile feedback for web games.
 * Includes:
 * 1. Trauma-based screen shake (Trauma^2)
 * 2. Hit-Stop (Micro frame freezing on heavy impacts)
 * 3. Mobile tactile haptic feedback (navigator.vibrate)
 */

export interface ScreenShakeState {
  trauma: number; // 0.0 to 1.0
  decay: number;  // Decay rate per second (default 1.2)
  maxOffset: number; // Max pixel offset at trauma=1 (default 16)
  maxAngle: number;  // Max rotational degree at trauma=1 (default 3.0)
}

export function createShakeState(options?: Partial<ScreenShakeState>): ScreenShakeState {
  return {
    trauma: 0,
    decay: options?.decay ?? 1.2,
    maxOffset: options?.maxOffset ?? 16,
    maxAngle: options?.maxAngle ?? 3.0,
  };
}

export function addTrauma(state: ScreenShakeState, amount: number): ScreenShakeState {
  return {
    ...state,
    trauma: Math.min(1.0, Math.max(0, state.trauma + amount)),
  };
}

export function updateShake(
  state: ScreenShakeState,
  dtSeconds: number,
  timeSeed: number = Date.now() / 1000
): { state: ScreenShakeState; offset: { x: number; y: number; angle: number } } {
  const trauma = Math.max(0, state.trauma - state.decay * dtSeconds);
  const shakeAmount = trauma * trauma; // Non-linear Trauma^2 response

  if (shakeAmount <= 0.0001) {
    return {
      state: { ...state, trauma: 0 },
      offset: { x: 0, y: 0, angle: 0 },
    };
  }

  // Deterministic pseudo-random harmonics using sin frequencies
  const x = Math.sin(timeSeed * 45) * state.maxOffset * shakeAmount;
  const y = Math.cos(timeSeed * 53) * state.maxOffset * shakeAmount;
  const angle = Math.sin(timeSeed * 37) * state.maxAngle * shakeAmount;

  return {
    state: { ...state, trauma },
    offset: { x, y, angle },
  };
}

export interface HitStopState {
  active: boolean;
  remainingMs: number;
}

export function createHitStopState(): HitStopState {
  return { active: false, remainingMs: 0 };
}

export function triggerHitStop(state: HitStopState, durationMs: number = 60): HitStopState {
  return {
    active: true,
    remainingMs: Math.max(state.remainingMs, durationMs),
  };
}

export function updateHitStop(
  state: HitStopState,
  dtMs: number
): { state: HitStopState; isPaused: boolean } {
  if (!state.active) {
    return { state, isPaused: false };
  }

  const remainingMs = state.remainingMs - dtMs;
  if (remainingMs <= 0) {
    return {
      state: { active: false, remainingMs: 0 },
      isPaused: true, // Last frame of hit-stop
    };
  }

  return {
    state: { active: true, remainingMs },
    isPaused: true,
  };
}

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "combo";

export function triggerHaptic(style: HapticStyle = "light"): boolean {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return false;
  }

  try {
    switch (style) {
      case "light":
        return navigator.vibrate(12);
      case "medium":
        return navigator.vibrate(25);
      case "heavy":
        return navigator.vibrate(45);
      case "success":
        return navigator.vibrate([15, 30, 25]);
      case "warning":
        return navigator.vibrate([30, 40, 30]);
      case "combo":
        return navigator.vibrate([10, 20, 15, 20, 25]);
      default:
        return navigator.vibrate(15);
    }
  } catch {
    return false;
  }
}
