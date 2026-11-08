import { describe, expect, it } from "vitest";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  createInitialShadowDodgeState,
  runShadowDodgeMonteCarloAudit,
  setPlayerTarget,
  startShadowDodgeGame,
  stepShadowDodge,
  triggerShadowDash,
  triggerShadowPulse,
} from "./shadow-dodge";

describe("Shadow Dodge (#157 shadow-dodge) Core Engine", () => {
  it("initializes arena and starts game with centered player and 3 HP", () => {
    let state = createInitialShadowDodgeState(500);
    expect(state.status).toBe("idle");
    expect(state.highScore).toBe(500);

    state = startShadowDodgeGame(state);
    expect(state.status).toBe("playing");
    expect(state.player.hp).toBe(3);
    expect(state.player.x).toBe(ARENA_WIDTH / 2);
    expect(state.player.y).toBe(ARENA_HEIGHT / 2);
  });

  it("detects near-miss grazing, triggers bullet-time slow-mo, and charges Shadow Energy", () => {
    let state = startShadowDodgeGame(createInitialShadowDodgeState());

    // Place a hazard inside grazeRadius (34px) but outside hitRadius (9px)
    state.hazards = [
      {
        id: "test-graze-orb",
        kind: "orb",
        x: state.player.x + 24,
        y: state.player.y,
        vx: 0,
        vy: 10,
        speed: 10,
        radius: 6,
        grazed: false,
      },
    ];

    state = stepShadowDodge(state, 0.02);

    expect(state.totalGrazes).toBe(1);
    expect(state.combo).toBe(1);
    expect(state.player.shadowEnergy).toBeGreaterThan(0);
    expect(state.timeScale).toBeLessThan(1.0); // Bullet-time activated!
    expect(state.lastEvent).toBe("graze");
  });

  it("reduces HP and resets combo on direct hazard collision, then triggers gameover at 0 HP", () => {
    let state = startShadowDodgeGame(createInitialShadowDodgeState());
    state.combo = 5;
    state.player.hp = 1;

    // Place hazard directly on player center
    state.hazards = [
      {
        id: "test-hit-orb",
        kind: "orb",
        x: state.player.x,
        y: state.player.y,
        vx: 0,
        vy: 0,
        speed: 0,
        radius: 8,
        grazed: false,
      },
    ];

    state = stepShadowDodge(state, 0.02);
    expect(state.player.hp).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.status).toBe("gameover");
    expect(state.lastEvent).toBe("gameover");
  });

  it("executes Phase-Shift Dash and vaporizes all hazards on Shadow Pulse at 100 energy", () => {
    let state = startShadowDodgeGame(createInitialShadowDodgeState());
    state = setPlayerTarget(state, state.player.x + 100, state.player.y);
    state = triggerShadowDash(state);

    expect(state.player.dashCooldown).toBeGreaterThan(0);
    expect(state.player.invulnerableTimer).toBeGreaterThan(0);
    expect(state.lastEvent).toBe("dash");

    // Charge energy to 100 and spawn hazards
    state.player.shadowEnergy = 100;
    state.hazards = [
      {
        id: "h1",
        kind: "orb",
        x: 100,
        y: 100,
        vx: 10,
        vy: 10,
        speed: 14,
        radius: 8,
        grazed: false,
      },
      {
        id: "h2",
        kind: "seeker",
        x: 200,
        y: 200,
        vx: -10,
        vy: 10,
        speed: 14,
        radius: 9,
        grazed: false,
      },
    ];

    const prevScore = state.score;
    state = triggerShadowPulse(state);

    expect(state.hazards.length).toBe(0);
    expect(state.player.shadowEnergy).toBe(0);
    expect(state.score).toBeGreaterThan(prevScore + 500);
    expect(state.pulsesTriggered).toBe(1);
    expect(state.lastEvent).toBe("pulse");
  });

  it("passes deterministic Monte Carlo balance audit across skill tiers", () => {
    const novice = runShadowDodgeMonteCarloAudit(15, "novice", 42);
    const adept = runShadowDodgeMonteCarloAudit(15, "adept", 42);
    const master = runShadowDodgeMonteCarloAudit(15, "master", 42);

    expect(adept.avgScore).toBeGreaterThan(novice.avgScore);
    expect(master.avgScore).toBeGreaterThan(adept.avgScore);
    expect(master.avgSurvivalSec).toBeGreaterThan(novice.avgSurvivalSec);
  });
});
