export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
  knobDistance: number;
}

export function neonJoystick(dx: number, dy: number): JoystickVector {
  const distance = Math.hypot(dx, dy);
  // WHY (2026-11-13): Returning to center must clear the previous frame's direction.
  if (!Number.isFinite(distance) || distance <= 8) {
    return { x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 };
  }
  const magnitude = Math.min(1, distance / 60);
  const angle = Math.atan2(dy, dx);
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude,
    magnitude, angle, knobDistance: Math.min(distance, 60) };
}

export function neonCanvasSize(width: number, height: number, pixelRatio: number) {
  // WHY (2026-11-13): DPR 3/4 phones otherwise pay 9/16x fill cost. Integer sizes
  // also avoid resetting the canvas every frame at fractional desktop zoom.
  const ratio = Number.isFinite(pixelRatio) ? Math.max(1, Math.min(2, pixelRatio)) : 1;
  return { width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)), ratio };
}
