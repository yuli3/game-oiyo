import { describe, it, expect, beforeEach } from 'vitest';
import { FTLEngine } from './ftl-mini';

describe('FTLEngine', () => {
  let engine: FTLEngine;

  beforeEach(() => {
    engine = new FTLEngine();
  });

  it('initializes player and enemy ships with proper rooms, weapons, and crew', () => {
    expect(engine.player.hull).toBe(30);
    expect(engine.player.maxHull).toBe(30);
    expect(engine.player.rooms.length).toBe(6);
    expect(engine.player.weapons.length).toBe(2);
    expect(engine.player.crew.length).toBe(3);

    expect(engine.enemy.hull).toBeGreaterThan(0);
    expect(engine.enemy.weapons.length).toBeGreaterThanOrEqual(1);
  });

  it('allocates and deallocates reactor power correctly', () => {
    const initialFree = engine.player.reactorPower;
    const engines = engine.player.rooms.find(r => r.system === 'engines')!;
    const initialEngPower = engines.powered;

    // Allocate +1 to engines
    const ok = engine.allocatePower(engines.id, 1);
    expect(ok).toBe(true);
    expect(engines.powered).toBe(initialEngPower + 1);
    expect(engine.player.reactorPower).toBe(initialFree - 1);

    // Deallocate -1 from engines
    const okDown = engine.allocatePower(engines.id, -1);
    expect(okDown).toBe(true);
    expect(engines.powered).toBe(initialEngPower);
    expect(engine.player.reactorPower).toBe(initialFree);
  });

  it('calculates evasion dynamically based on engine power and manned helm', () => {
    const initialEvasion = engine.player.evasion;

    // Moving pilot out of helm drops evasion bonus
    const pilot = engine.player.crew.find(c => c.id === 'c_pilot')!;
    engine.orderCrewMove(pilot.id, 'p_shields');

    // Simulate 2 seconds to complete move
    engine.update(2.0);
    expect(pilot.roomId).toBe('p_shields');
    expect(engine.player.evasion).toBeLessThan(initialEvasion);
  });

  it('charges weapons over time and launches projectiles toward target rooms', () => {
    const burstLaser = engine.player.weapons.find(w => w.id === 'p_burst_laser')!;
    burstLaser.chargeProgress = 0.95;

    // Update 0.5s to trigger fire
    engine.update(0.5);

    expect(burstLaser.chargeProgress).toBeLessThan(0.5); // reset
    expect(engine.projectiles.length).toBeGreaterThan(0);
  });

  it('absorbs non-piercing laser shots with energy shields', () => {
    engine.enemy.shields = 1;
    engine.enemy.evasion = 0; // eliminate RNG evasion for deterministic test

    // Fire a laser with 0 pierce directly at enemy shields
    engine.projectiles.push({
      id: 'test_laser',
      weaponType: 'laser',
      sourceShip: 'player',
      targetRoomId: 'e_shields',
      startX: 30,
      startY: 50,
      currentX: 70,
      currentY: 50,
      targetX: 70,
      targetY: 50,
      progress: 0.99,
      speed: 1.0,
      damage: 1,
      pierce: 0,
      fireChance: 0,
    });

    engine.update(0.1);

    // Shield should absorb the laser shot
    expect(engine.enemy.shields).toBe(0);
    expect(engine.enemy.hull).toBe(engine.enemy.maxHull); // hull undamaged!
  });

  it('missiles pierce shields and damage room systems and hull directly', () => {
    engine.enemy.shields = 1;
    engine.enemy.evasion = 0;
    const initialHull = engine.enemy.hull;
    const weaponRoom = engine.enemy.rooms.find(r => r.id === 'e_weapons')!;

    // Fire missile with pierce 9 at weapon room
    engine.projectiles.push({
      id: 'test_missile',
      weaponType: 'missile',
      sourceShip: 'player',
      targetRoomId: 'e_weapons',
      startX: 30,
      startY: 50,
      currentX: 70,
      currentY: 50,
      targetX: 70,
      targetY: 50,
      progress: 0.99,
      speed: 1.0,
      damage: 2,
      pierce: 9,
      fireChance: 0,
    });

    engine.update(0.1);

    expect(engine.enemy.shields).toBe(1); // shields remained intact
    expect(engine.enemy.hull).toBe(initialHull - 2); // hull damaged
    expect(weaponRoom.damage).toBeGreaterThan(0); // system damaged
  });

  it('crew repairs damaged systems when stationed in the room', () => {
    const shieldRoom = engine.player.rooms.find(r => r.id === 'p_shields')!;
    shieldRoom.damage = 1.0;
    const engCrew = engine.player.crew.find(c => c.id === 'c_eng')!;
    engCrew.roomId = 'p_shields';
    engCrew.targetRoomId = null;

    // Simulate 2 seconds of repairs
    engine.update(2.0);

    expect(shieldRoom.damage).toBeLessThan(1.0);
  });
});
