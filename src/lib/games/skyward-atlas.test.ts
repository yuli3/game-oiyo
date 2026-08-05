import { describe, expect, it } from "vitest";
import {
  START_STATE, airDensity, flightScore, indicatedAirspeed, stallSpeed, stepFlight,
} from "./skyward-atlas";

const calm = { windX: 0, windZ: 0, density: 0.92 };
const neutral = { pitch: 0, roll: 0, yaw: 0, throttle: 0 };

describe("Skyward Atlas flight model", () => {
  it("reduces density and raises true stall speed with altitude", () => {
    expect(airDensity(8_500)).toBeLessThan(airDensity(0));
    expect(stallSpeed(8_500)).toBeGreaterThan(stallSpeed(0));
  });
  it("distinguishes indicated from true airspeed", () => {
    expect(indicatedAirspeed(100, 5_000)).toBeLessThan(100);
  });
  it("throttle accelerates the aircraft", () => {
    let state = { ...START_STATE, speed: 60, throttle: 0.8 };
    for (let i = 0; i < 100; i++) state = stepFlight(state, { ...neutral, throttle: 1 }, calm, 0.05);
    expect(state.speed).toBeGreaterThan(60);
  });
  it("bank produces a coordinated heading change", () => {
    let state = { ...START_STATE, roll: 0.7 };
    for (let i = 0; i < 20; i++) state = stepFlight(state, neutral, calm, 0.05);
    expect(state.yaw).not.toBeCloseTo(START_STATE.yaw);
  });
  it("low indicated speed enters a stall and descends", () => {
    let state = { ...START_STATE, speed: 35, y: 900 };
    for (let i = 0; i < 30; i++) state = stepFlight(state, neutral, calm, 0.05);
    expect(state.stalled).toBe(true);
    expect(state.verticalSpeed).toBeLessThan(0);
  });
  it("scores gates and landing quality", () => {
    expect(flightScore(10_000, 3, 1)).toBe(10_300);
  });
});
