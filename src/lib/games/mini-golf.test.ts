import { describe, it, expect } from "vitest";
import {
  createInitialGolfState,
  executePutt,
  setAim,
  updateGolfPhysics,
  advanceToNextHole,
  COURSES,
} from "./mini-golf";

describe("mini-golf logic", () => {
  it("initializes at Hole 1 with 0 strokes and aiming status", () => {
    const state = createInitialGolfState();
    expect(state.currentHoleIndex).toBe(0);
    expect(state.strokesThisHole).toBe(0);
    expect(state.totalStrokes).toBe(0);
    expect(state.status).toBe("aiming");
    expect(state.ball.x).toBe(COURSES[0].startPos.x);
    expect(state.ball.z).toBe(COURSES[0].startPos.z);
  });

  it("updates aim angle and power", () => {
    let state = createInitialGolfState();
    state = setAim(state, -Math.PI / 4, 0.8);
    expect(state.aimAngle).toBe(-Math.PI / 4);
    expect(state.aimPower).toBe(0.8);
  });

  it("executes putt, increments stroke count and enters rolling state", () => {
    let state = createInitialGolfState();
    state = setAim(state, -Math.PI / 2, 0.5);
    state = executePutt(state);

    expect(state.strokesThisHole).toBe(1);
    expect(state.totalStrokes).toBe(1);
    expect(state.status).toBe("rolling");
    expect(state.ball.vz).toBeLessThan(0); // rolling towards -Z
  });

  it("decelerates ball with friction and returns to aiming when stopped", () => {
    let state = createInitialGolfState();
    state = setAim(state, -Math.PI / 2, 0.15); // gentle putt
    state = executePutt(state);

    // Simulate frames until stopped
    for (let i = 0; i < 300; i++) {
      state = updateGolfPhysics(state, 0.016);
      if (state.status === "aiming") break;
    }

    expect(state.status).toBe("aiming");
    expect(state.ball.vx).toBe(0);
    expect(state.ball.vz).toBe(0);
  });

  it("detects ball entering hole and advances status to holed", () => {
    let state = createInitialGolfState();
    state = executePutt(state);

    // Place ball right next to hole with slow speed
    const hole = COURSES[0];
    state.ball.x = hole.holePos.x;
    state.ball.z = hole.holePos.z + 0.1;
    state.ball.vz = -0.5;

    state = updateGolfPhysics(state, 0.016);
    expect(state.status).toBe("holed");
    expect(state.scoreCard.length).toBe(1);
    expect(state.scoreCard[0].hole).toBe(1);
  });

  it("advances to next hole correctly", () => {
    let state = createInitialGolfState(0);
    state.status = "holed";
    state = advanceToNextHole(state);

    expect(state.currentHoleIndex).toBe(1);
    expect(state.strokesThisHole).toBe(0);
    expect(state.status).toBe("aiming");
    expect(state.ball.z).toBe(COURSES[1].startPos.z);
  });

  it("bounces off boundary wall and sets wall_hit event", () => {
    let state = createInitialGolfState(0);
    state = executePutt(state);
    // Position ball near left boundary moving left
    state.ball.x = COURSES[0].bounds.minX + 0.1;
    state.ball.vx = -5;

    state = updateGolfPhysics(state, 0.03);
    expect(state.ball.vx).toBeGreaterThan(0); // bounced to the right
    expect(state.lastEvent).toBe("wall_hit");
  });

  it("handles water hazard by penalizing 1 stroke and resetting to tee", () => {
    let state = createInitialGolfState(2); // Hole 3 has water tiles at (-2, 0)
    state = executePutt(state);
    const initialStrokes = state.strokesThisHole;

    // Place ball inside water tile
    state.ball.x = -2;
    state.ball.z = 0;

    state = updateGolfPhysics(state, 0.016);
    expect(state.status).toBe("aiming");
    expect(state.strokesThisHole).toBe(initialStrokes + 1);
    expect(state.ball.x).toBe(COURSES[2].startPos.x);
    expect(state.ball.z).toBe(COURSES[2].startPos.z);
    expect(state.lastEvent).toBe("water_hazard");
  });
});
