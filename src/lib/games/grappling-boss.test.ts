import { describe, expect, it } from "vitest";
import {
  initializeGrapplingBoss,
  stepGrapplingBoss,
  fireGrappleHookToNearestAnchor,
  runGrapplingBossMonteCarloAudit,
} from "./grappling-boss";

describe("grappling-boss engine", () => {
  it("initializes arena anchors, boss entities, and FABRIK tentacles", () => {
    const state = initializeGrapplingBoss();
    expect(state.status).toBe("playing");
    expect(state.playerHp).toBe(100);
    expect(state.boss.hp).toBe(1000);
    expect(state.boss.tentacles.length).toBe(4);
    expect(state.anchors.length).toBeGreaterThanOrEqual(5);

    // Each tentacle should have 5 IK joints
    expect(state.boss.tentacles[0].joints.length).toBe(5);
  });

  it("attaches grapple hook and generates pendulum swing momentum", () => {
    let state = initializeGrapplingBoss();
    const initialY = state.player.y;

    // Fire hook
    fireGrappleHookToNearestAnchor(state.player, state.anchors);
    expect(state.player.isHooked).toBe(true);
    expect(state.player.ropeLength).toBeGreaterThan(0);

    // Step swing with horizontal input
    for (let i = 0; i < 15; i++) {
      state = stepGrapplingBoss(state, 0.1, { moveAxis: 1 });
    }

    expect(state.player.vx).not.toBe(0);
    expect(state.player.y).not.toBe(initialY);
  });

  it("updates FABRIK tentacle joints tracking player position", () => {
    let state = initializeGrapplingBoss();
    const tentacle = state.boss.tentacles[0];
    const initialTipX = tentacle.joints[tentacle.joints.length - 1].x;

    // Step boss simulation
    for (let i = 0; i < 10; i++) {
      state = stepGrapplingBoss(state, 0.1, { moveAxis: 0 });
    }

    const updatedTipX = state.boss.tentacles[0].joints[4].x;
    expect(updatedTipX).not.toBe(initialTipX);
  });

  it("fires player weapon and damages boss into enraged phase 2", () => {
    let state = initializeGrapplingBoss();
    // Fire barrage of arrows directly at boss
    for (let i = 0; i < 20; i++) {
      state = stepGrapplingBoss(state, 0.1, {
        moveAxis: 0,
        fireWeapon: true,
        aimX: state.boss.x,
        aimY: state.boss.y,
      });
    }

    expect(state.boss.hp).toBeLessThan(1000);
    expect(state.score).toBeGreaterThan(0);

    // Inflict enough damage to trigger phase 2 (< 500 HP)
    state.boss.hp = 450;
    state = stepGrapplingBoss(state, 0.1, { moveAxis: 0 });
    expect(state.boss.phase).toBe(2);
  });

  it("runs Monte Carlo audit and verifies aerial combat viability", () => {
    const audit = runGrapplingBossMonteCarloAudit(15);
    expect(audit.survivedTrials).toBeGreaterThan(0);
    expect(audit.averageDamageDealt).toBeGreaterThan(0);
  });
});
