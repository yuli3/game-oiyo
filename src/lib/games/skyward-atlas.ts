export interface FlightState {
  x: number; y: number; z: number;
  speed: number;
  pitch: number; roll: number; yaw: number;
  verticalSpeed: number;
  throttle: number;
  fuel: number;
  stalled: boolean;
}

export interface FlightInput {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
}

export interface Atmosphere {
  windX: number;
  windZ: number;
  density: number;
}

export const FLIGHT_SECONDS = 8 * 60;
export const START_STATE: FlightState = {
  x: 0, y: 620, z: 1400,
  speed: 82, pitch: 0, roll: 0, yaw: Math.PI,
  verticalSpeed: 0, throttle: 0.62, fuel: 100, stalled: false,
};

export type SkywardTutorialStep = 0 | 1 | 2 | 3;
export function nextSkywardTutorialStep(step: SkywardTutorialStep, state: FlightState, gates: number): SkywardTutorialStep {
  if (step === 0 && Math.abs(state.throttle - START_STATE.throttle) >= 0.04) return 1;
  if (step === 1 && (Math.abs(state.pitch) >= 0.04 || Math.abs(state.roll) >= 0.08)) return 2;
  if (step === 2 && gates > 0) return 3;
  return step;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function wrapAngle(value: number): number {
  const tau = Math.PI * 2;
  return ((value + Math.PI) % tau + tau) % tau - Math.PI;
}

export function airDensity(altitude: number): number {
  return clamp(Math.exp(-Math.max(0, altitude) / 8_500), 0.18, 1);
}

export function stallSpeed(altitude: number): number {
  return 48 / Math.sqrt(airDensity(altitude));
}

export function indicatedAirspeed(trueSpeed: number, altitude: number): number {
  return Math.max(0, trueSpeed * Math.sqrt(airDensity(altitude)));
}

export function stepFlight(
  state: FlightState,
  input: FlightInput,
  atmosphere: Atmosphere,
  deltaSeconds: number,
): FlightState {
  const dt = clamp(deltaSeconds, 0, 0.05);
  const throttle = clamp(state.throttle + clamp(input.throttle, -1, 1) * dt * 0.32, 0, 1);
  const density = clamp(atmosphere.density, 0.18, 1.05);
  const pitchAuthority = clamp(state.speed / 62, 0.25, 1.25);
  const rollAuthority = clamp(state.speed / 50, 0.3, 1.35);
  const pitch = clamp(state.pitch + clamp(input.pitch, -1, 1) * dt * 0.58 * pitchAuthority, -0.72, 0.72);
  const roll = clamp(state.roll + clamp(input.roll, -1, 1) * dt * 0.92 * rollAuthority, -1.25, 1.25);
  const yawRate = clamp(input.yaw, -1, 1) * 0.32 + Math.sin(roll) * clamp(state.speed / 95, 0.2, 1.2) * 0.52;
  const yaw = wrapAngle(state.yaw + yawRate * dt);
  const drag = 0.0026 * state.speed * state.speed * density * (1 + Math.abs(pitch) * 0.45);
  const thrust = 29 * throttle * (0.74 + density * 0.26);
  const gravityAlongPath = Math.sin(pitch) * 9.81;
  const speed = clamp(state.speed + (thrust - drag - gravityAlongPath) * dt, 25, 165);
  const stall = indicatedAirspeed(speed, state.y) < stallSpeed(state.y) + 2;
  const liftFactor = stall ? 0.2 : clamp((speed / stallSpeed(state.y)) ** 2, 0.3, 2.2);
  const targetVertical = Math.sin(pitch) * speed * liftFactor - (stall ? 18 : 0);
  const verticalSpeed = state.verticalSpeed + (targetVertical - state.verticalSpeed) * Math.min(1, dt * 2.4);
  const horizontal = Math.max(0, Math.cos(pitch) * speed);
  const fuel = Math.max(0, state.fuel - dt * (0.018 + throttle * 0.055));

  return {
    x: state.x + (Math.sin(yaw) * horizontal + atmosphere.windX) * dt,
    y: Math.max(4, state.y + verticalSpeed * dt),
    z: state.z + (Math.cos(yaw) * horizontal + atmosphere.windZ) * dt,
    speed, pitch, roll, yaw, verticalSpeed, throttle: fuel <= 0 ? 0 : throttle,
    fuel, stalled: stall,
  };
}

export function flightScore(distance: number, gates: number, landingQuality: number): number {
  return Math.max(0, Math.round(distance * 0.18 + gates * 1_500 + clamp(landingQuality, 0, 1) * 4_000));
}

