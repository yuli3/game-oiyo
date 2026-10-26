import { describe, expect, it } from 'vitest';
import { CrossyRoadEngine } from './crossy-road';

describe('CrossyRoadEngine', () => {
  it('initializes lanes, player position, and initial state', () => {
    const engine = new CrossyRoadEngine();
    expect(engine.state.playerX).toBe(0);
    expect(engine.state.playerLane).toBe(2);
    expect(engine.state.isAlive).toBe(true);
    expect(engine.state.lanes.length).toBeGreaterThanOrEqual(30);
  });

  it('hops forward and updates score correctly', () => {
    const engine = new CrossyRoadEngine();
    const success = engine.hop(0, 1);
    expect(success).toBe(true);
    expect(engine.state.isHopping).toBe(true);
    expect(engine.state.hopTargetLane).toBe(3);

    // Fast-forward hop animation
    engine.update(0.2);
    expect(engine.state.isHopping).toBe(false);
    expect(engine.state.playerLane).toBe(3);
    expect(engine.state.score).toBe(1);
  });

  it('prevents hopping into trees on grass lanes', () => {
    const engine = new CrossyRoadEngine();
    // Place a tree right in front of player
    const nextLane = engine.state.lanes.find((l) => l.index === 3);
    if (nextLane) {
      nextLane.type = 'grass';
      nextLane.trees = [0];
    }

    const success = engine.hop(0, 1);
    expect(success).toBe(false);
    expect(engine.state.playerLane).toBe(2);
  });

  it('kills player when car collides on road', () => {
    const engine = new CrossyRoadEngine();
    // Move to road lane
    const roadLane = engine.state.lanes.find((l) => l.index === 3)!;
    roadLane.type = 'road';
    roadLane.vehicles = [
      { x: 0, width: 2, speed: 0, type: 'car', color: '#ff0000' },
    ];

    engine.hop(0, 1);
    engine.update(0.2); // finish hop

    // Road check should kill player
    engine.update(0.01);
    expect(engine.state.isAlive).toBe(false);
    expect(engine.state.deathReason).toBe('car');
  });

  it('kills player by drowning if landing on river without log', () => {
    const engine = new CrossyRoadEngine();
    const riverLane = engine.state.lanes.find((l) => l.index === 3)!;
    riverLane.type = 'river';
    riverLane.logs = []; // No logs!

    engine.hop(0, 1);
    engine.update(0.2); // finish hop onto river

    engine.update(0.01);
    expect(engine.state.isAlive).toBe(false);
    expect(engine.state.deathReason).toBe('drown');
  });

  it('rides floating log on river without drowning', () => {
    const engine = new CrossyRoadEngine();
    const riverLane = engine.state.lanes.find((l) => l.index === 3)!;
    riverLane.type = 'river';
    riverLane.logs = [
      { x: 0, width: 3, speed: 2 }, // log right under player x:0
    ];

    engine.hop(0, 1);
    engine.update(0.2); // finish hop onto log

    engine.update(0.1);
    expect(engine.state.isAlive).toBe(true);
    // Player drifts with log speed (0.2s * 2 + 0.1s * 2 = 0.6)
    expect(engine.state.playerX).toBeCloseTo(0.6, 1);
  });

  it('triggers eagle swoop when idling too long', () => {
    const engine = new CrossyRoadEngine();
    engine.update(4.0); // idle for 4 seconds
    expect(engine.state.isAlive).toBe(false);
    expect(engine.state.deathReason).toBe('eagle');
    expect(engine.state.eagleActive).toBe(true);
  });
});
