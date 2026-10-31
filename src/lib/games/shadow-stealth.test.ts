import { describe, it, expect } from 'vitest';
import {
  createShadowStealthGame,
  stepShadowStealth,
  isPointInShadow,
  isLineOccluded,
  runShadowStealthBalanceAudit,
  INPUT_RIGHT,
  INPUT_DOWN,
  INPUT_LEFT,
  INPUT_UP,
  INPUT_SHURIKEN,
  INPUT_SMOKE,
  INPUT_TAKEDOWN,
} from './shadow-stealth';
import { isPointInViewCone2D, type ViewConeConfig } from './engine';

describe('Shinobi Shadow Infiltration Engine (#155)', () => {
  it('1. initializes fortress layout with 4 samurai guards, walls, shadows and deterministic replay tape', () => {
    const game = createShadowStealthGame(20261031);
    expect(game.guards.length).toBe(4);
    expect(game.walls.length).toBeGreaterThan(6);
    expect(game.shadows.length).toBe(5);
    expect(game.player.shurikens).toBe(3);
    expect(game.player.smokeBombs).toBe(1);
    expect(game.player.hasScroll).toBe(false);
    expect(game.replayTape.seed).toBe(20261031);
  });

  it('2. evaluates view cone raycasting and blocks LOS through walls', () => {
    const cone: ViewConeConfig = {
      originX: 100,
      originY: 100,
      facingRad: 0, // facing right
      fovRad: Math.PI / 2, // 90 deg
      maxRange: 150,
    };

    // Target inside cone, unobstructed
    const vis1 = isPointInViewCone2D(cone, 180, 100);
    expect(vis1.detected).toBe(true);
    expect(vis1.zone).toBe('alert');

    // Target occluded by wall
    const walls = [{ x: 130, y: 70, w: 20, h: 60 }];
    const visOccluded = isPointInViewCone2D(cone, 180, 100, (x0, y0, x1, y1) =>
      isLineOccluded(x0, y0, x1, y1, walls, [])
    );
    expect(visOccluded.detected).toBe(false);
  });

  it('3. verifies shadow stealth concealment mechanics', () => {
    const game = createShadowStealthGame();
    // Starting location is inside shadow
    expect(isPointInShadow(game.player.x, game.player.y, game.shadows)).toBe(true);

    // Open courtyard is not in shadow
    expect(isPointInShadow(200, 200, game.shadows)).toBe(false);
  });

  it('4. executes shuriken distraction, smoke cover, stealth takedown and records tape', () => {
    const game = createShadowStealthGame();

    // Move player right
    stepShadowStealth(game, INPUT_RIGHT, 1 / 60);
    expect(game.frameIndex).toBe(1);

    // Throw shuriken
    stepShadowStealth(game, INPUT_SHURIKEN, 1 / 60);
    expect(game.player.shurikens).toBe(2);
    expect(game.shurikens.length).toBe(1);

    // Deploy smoke bomb
    stepShadowStealth(game, INPUT_SMOKE, 1 / 60);
    expect(game.player.smokeBombs).toBe(0);
    expect(game.smokeClouds.length).toBe(1);

    // Position player directly behind Guard #1 for takedown
    const guard = game.guards[0];
    guard.x = 200;
    guard.y = 200;
    guard.facingRad = 0; // facing right (+x)
    game.player.x = 185; // behind guard (-x)
    game.player.y = 200;

    const res = stepShadowStealth(game, INPUT_TAKEDOWN, 1 / 60);
    expect(res.takedowns).toBe(1);
    expect(guard.state).toBe('unconscious');

    // Replay tape exports valid payload
    const payload = game.replayTape.exportPayload();
    expect(payload.events.length).toBeGreaterThan(0);
  });

  it('5. passes Monte Carlo automated infiltration balance audit with >=80% clear rate', () => {
    const audit = runShadowStealthBalanceAudit(10);
    expect(audit.passed).toBe(true);
    expect(audit.clearRate).toBeGreaterThanOrEqual(0.8);
    expect(audit.victories).toBeGreaterThanOrEqual(8);
    expect(audit.sampleReplayToken).toBeDefined();
    expect(audit.sampleReplayToken?.startsWith('v1.')).toBe(true);
  });
});
