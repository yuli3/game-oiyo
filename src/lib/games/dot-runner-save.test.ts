import { describe, expect, it } from "vitest";
import { createDotRunner, jumpDotRunner, stepDotRunner } from "./dot-runner";
import { parseDotRunnerSave } from "./dot-runner-save";

const NOW = 1_800_000_000_000;
function payload() {
  let state = jumpDotRunner(createDotRunner(42));
  for (let i = 0; i < 9; i += 1) state = stepDotRunner(state);
  return { version: 1, state, savedAtEpochMs: NOW };
}
describe("dot runner save", () => {
  it("round-trips and clones a valid snapshot", () => {
    const source = payload();
    const parsed = parseDotRunnerSave(JSON.stringify(source), NOW)!;
    expect(parsed).toEqual(source);
    expect(parsed.state).not.toBe(source.state);
  });
  it.each([
    ["terminal", (p: ReturnType<typeof payload>) => { p.state.status = "over"; }],
    ["future", (p: ReturnType<typeof payload>) => { p.savedAtEpochMs = NOW + 300_001; }],
    ["score", (p: ReturnType<typeof payload>) => { p.state.score += 1; }],
    ["rng", (p: ReturnType<typeof payload>) => { p.state.rngState = -1; }],
    ["entity", (p: ReturnType<typeof payload>) => { p.state.items = [{ x: 10, y: 10, w: 999, h: 15, speed: 5 }]; }],
  ])("rejects %s corruption", (_name, mutate) => {
    const value = payload(); mutate(value);
    expect(parseDotRunnerSave(JSON.stringify(value), NOW)).toBeNull();
  });
});
