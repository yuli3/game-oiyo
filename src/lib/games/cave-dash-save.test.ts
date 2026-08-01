import { describe, expect, it } from "vitest";
import { createCaveDash, flapCaveDash, stepCaveDash } from "./cave-dash";
import { parseCaveDashSave } from "./cave-dash-save";

const NOW = 1_800_000_000_000;
const active = () => {
  let state = createCaveDash(42);
  for (let frame = 0; frame < 30; frame += 1) {
    if (frame % 12 === 0) state = flapCaveDash(state);
    state = stepCaveDash(state);
  }
  return state;
};
const raw = (state = active(), savedAtEpochMs = NOW) => JSON.stringify({ version: 1, state, savedAtEpochMs });

describe("Cave Dash save trust boundary", () => {
  it("restores an active deterministic snapshot", () => {
    expect(parseCaveDashSave(raw(), NOW)).toEqual({ version: 1, state: active(), savedAtEpochMs: NOW });
  });

  it("rejects terminal, future and malformed physics", () => {
    const state = active();
    expect(parseCaveDashSave(raw({ ...state, status: "over" }), NOW)).toBeNull();
    expect(parseCaveDashSave(raw(state, NOW + 300_001), NOW)).toBeNull();
    expect(parseCaveDashSave(raw({ ...state, y: -1 }), NOW)).toBeNull();
    expect(parseCaveDashSave(raw({ ...state, speed: 99 }), NOW)).toBeNull();
    expect(parseCaveDashSave(raw({ ...state, rngState: -1 }), NOW)).toBeNull();
  });

  it("rejects malformed walls and clones accepted wall data", () => {
    const state = { ...active(), walls: [{ x: 200, gapY: 120, passed: false }] };
    const parsed = parseCaveDashSave(raw(state), NOW)!;
    expect(parsed.state.walls).toEqual(state.walls);
    expect(parsed.state.walls).not.toBe(state.walls);
    expect(parseCaveDashSave(raw({ ...state, walls: [{ x: 200, gapY: 999, passed: false }] }), NOW)).toBeNull();
  });
});
