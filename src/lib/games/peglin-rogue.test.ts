import { describe, expect, it } from "vitest";
import {
  createInitialPeglinGame,
  firePeglinBall,
  stepPeglinPhysics,
} from "./peglin-rogue";

describe("Peglin Roguelike Core Physics & Battle", () => {
  it("initializes a valid game board with pegs, player HP, and an enemy", () => {
    const game = createInitialPeglinGame(1);
    expect(game.playerHp).toBe(100);
    expect(game.enemy.hp).toBeGreaterThan(0);
    expect(game.pegs.length).toBeGreaterThan(30);
    expect(game.status).toBe("aiming");
  });

  it("launches ball with appropriate velocity vector on fire", () => {
    const game = createInitialPeglinGame(1);
    const fired = firePeglinBall(game, Math.PI / 2); // shooting straight down

    expect(fired.status).toBe("firing");
    expect(fired.activeBall).toBeDefined();
    expect(fired.activeBall?.vy).toBeGreaterThan(300);
  });

  it("registers elastic collision with pegs and accumulates turn damage", () => {
    const game = createInitialPeglinGame(1);
    const fired = firePeglinBall(game, Math.PI / 2);

    // Place ball right next to the first peg moving directly towards it
    const targetPeg = fired.pegs[0];
    fired.activeBall!.x = targetPeg.x;
    fired.activeBall!.y = targetPeg.y - targetPeg.radius - 2;
    fired.activeBall!.vx = 0;
    fired.activeBall!.vy = 200;

    const stepRes = stepPeglinPhysics(fired, 0.02);
    expect(stepRes.pegHitCount).toBe(1);
    expect(stepRes.game.currentTurnDamage).toBeGreaterThan(0);
    expect(stepRes.game.pegs[0].hit).toBe(true);
  });

  it("resolves turn, damages enemy, and resets aiming when ball exits bottom", () => {
    const game = createInitialPeglinGame(1);
    const fired = firePeglinBall(game, Math.PI / 2);

    fired.currentTurnDamage = 50;
    fired.activeBall!.y = 390; // below board height 380

    const initialEnemyHp = fired.enemy.hp;
    const stepRes = stepPeglinPhysics(fired, 0.02);

    expect(stepRes.enemyDamaged).toBe(50);
    expect(stepRes.game.enemy.hp).toBe(initialEnemyHp - 50);
    expect(stepRes.game.activeBall).toBeNull();
  });

  it("declares victory when enemy HP reaches 0", () => {
    const game = createInitialPeglinGame(1);
    const fired = firePeglinBall(game, Math.PI / 2);

    fired.currentTurnDamage = 150; // enough to kill first enemy (80 HP)
    fired.activeBall!.y = 390;

    const stepRes = stepPeglinPhysics(fired, 0.02);
    expect(stepRes.game.status).toBe("won");
    expect(stepRes.game.enemy.hp).toBe(0);
  });
});
