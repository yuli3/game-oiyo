import { describe, expect, it } from "vitest";
import {
  changeRunnerLane,
  createInitialSubwayRunnerGame,
  jumpRunner,
  slideRunner,
  stepSubwayRunner,
} from "./subway-runner";

describe("Subway Mini-Parkour 3D Core Physics", () => {
  it("initializes a valid runner state with 3-lane player and obstacles", () => {
    const game = createInitialSubwayRunnerGame();
    expect(game.player.lane).toBe(0);
    expect(game.speed).toBeGreaterThan(10);
    expect(game.obstacles.length).toBeGreaterThan(10);
    expect(game.status).toBe("running");
  });

  it("changes lane left and right within [-1, 1] bounds", () => {
    let game = createInitialSubwayRunnerGame();
    game = changeRunnerLane(game, 1);
    expect(game.player.targetLane).toBe(1);

    // Cannot exceed right bound
    game = changeRunnerLane(game, 1);
    expect(game.player.targetLane).toBe(1);

    game = changeRunnerLane(game, -1);
    expect(game.player.targetLane).toBe(0);

    game = changeRunnerLane(game, -1);
    expect(game.player.targetLane).toBe(-1);

    // Cannot exceed left bound
    game = changeRunnerLane(game, -1);
    expect(game.player.targetLane).toBe(-1);
  });

  it("applies jump impulse and prevents mid-air double jump", () => {
    let game = createInitialSubwayRunnerGame();
    game = jumpRunner(game);
    expect(game.player.vy).toBeGreaterThan(0);

    // Step into air
    const { game: midAir } = stepSubwayRunner(game, 0.05);
    expect(midAir.player.y).toBeGreaterThan(0);

    const attemptedDoubleJump = jumpRunner(midAir);
    expect(attemptedDoubleJump.player.vy).toBe(midAir.player.vy);
  });

  it("slides under slide barrier and avoids crash", () => {
    let game = createInitialSubwayRunnerGame();
    game = slideRunner(game);
    expect(game.player.isSliding).toBe(true);

    // Place a slide barrier directly at player position
    game.obstacles = [
      {
        id: "test-slide-barrier",
        lane: 0,
        z: 0.1,
        type: "barrier_slide",
      },
    ];

    const { game: nextGame, crashed } = stepSubwayRunner(game, 0.02);
    expect(crashed).toBe(false);
    expect(nextGame.status).toBe("running");
  });

  it("crashes into jump barrier if not jumping", () => {
    const game = createInitialSubwayRunnerGame();
    game.obstacles = [
      {
        id: "test-jump-barrier",
        lane: 0,
        z: 0.1,
        type: "barrier_jump",
      },
    ];

    const { game: nextGame, crashed } = stepSubwayRunner(game, 0.02);
    expect(crashed).toBe(true);
    expect(nextGame.status).toBe("gameover");
  });

  it("collects coins in player lane and increments score", () => {
    const game = createInitialSubwayRunnerGame();
    game.obstacles = [
      {
        id: "test-coin",
        lane: 0,
        z: 0.1,
        type: "coin",
      },
    ];

    const { game: nextGame, collectedCoinCount } = stepSubwayRunner(game, 0.02);
    expect(collectedCoinCount).toBe(1);
    expect(nextGame.coins).toBe(1);
    expect(nextGame.score).toBeGreaterThan(game.score);
  });
});
