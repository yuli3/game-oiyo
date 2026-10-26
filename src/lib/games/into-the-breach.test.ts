import { describe, expect, it } from 'vitest';
import { IntoTheBreachEngine } from './into-the-breach';

describe('IntoTheBreachEngine', () => {
  it('initializes grid, mechs, and initial enemies correctly', () => {
    const engine = new IntoTheBreachEngine();
    expect(engine.state.gridWidth).toBe(8);
    expect(engine.state.gridHeight).toBe(8);
    expect(engine.state.mechs.length).toBe(3);
    expect(engine.state.enemies.length).toBe(3);
    expect(engine.state.powerGrid).toBe(6);
    expect(engine.state.turn).toBe(1);
    expect(engine.state.phase).toBe('player');
  });

  it('calculates valid moves for a mech according to move range and obstacles', () => {
    const engine = new IntoTheBreachEngine();
    const combatMech = engine.state.mechs.find((m) => m.id === 'mech-combat')!;
    const moves = engine.getValidMoves(combatMech);

    expect(moves.length).toBeGreaterThan(0);
    // Cannot move into water tile (0, 0)
    expect(moves.some((m) => m.x === 0 && m.y === 0)).toBe(false);
  });

  it('moves mech to valid destination', () => {
    const engine = new IntoTheBreachEngine();
    const combatMech = engine.state.mechs.find((m) => m.id === 'mech-combat')!;

    const validMoves = engine.getValidMoves(combatMech);
    const target = validMoves[0];

    const success = engine.moveMech(combatMech.id, target.x, target.y);
    expect(success).toBe(true);
    expect(combatMech.x).toBe(target.x);
    expect(combatMech.y).toBe(target.y);
    expect(combatMech.hasMoved).toBe(true);
  });

  it('performs Titan Prime punch with knockback', () => {
    const engine = new IntoTheBreachEngine();
    const combatMech = engine.state.mechs.find((m) => m.id === 'mech-combat')!;
    // Place combat mech right next to an enemy
    combatMech.x = 2;
    combatMech.y = 3;
    const enemy = engine.state.enemies[0];
    enemy.x = 1;
    enemy.y = 3;
    enemy.hp = 3;

    // Open tile behind enemy (0, 3)
    engine.state.grid[3][0].terrain = 'ground';

    const attacked = engine.executeAttack(combatMech.id, 1, 3);
    expect(attacked).toBe(true);
    expect(enemy.hp).toBe(1); // 3 - 2 damage
    expect(enemy.x).toBe(0); // pushed 1 tile left from (1, 3) to (0, 3)
    expect(enemy.y).toBe(3);
  });

  it('deals collision damage when knocked into an obstacle', () => {
    const engine = new IntoTheBreachEngine();
    const combatMech = engine.state.mechs.find((m) => m.id === 'mech-combat')!;
    combatMech.x = 3;
    combatMech.y = 4;

    const enemy = engine.state.enemies[0];
    enemy.x = 2;
    enemy.y = 4;
    enemy.hp = 3;

    // Obstacle mountain at (1, 4)
    engine.state.grid[4][1].terrain = 'mountain';

    // Punch pushing into mountain
    const attacked = engine.executeAttack(combatMech.id, 2, 4);
    expect(attacked).toBe(true);
    // 2 direct punch damage + 1 collision damage = 3 damage!
    expect(enemy.hp).toBe(0);
    expect(enemy.isDead).toBe(true);
  });

  it('instantly kills non-flying units pushed into water', () => {
    const engine = new IntoTheBreachEngine();
    const combatMech = engine.state.mechs.find((m) => m.id === 'mech-combat')!;
    combatMech.x = 1;
    combatMech.y = 0;

    const enemy = engine.state.enemies[0];
    enemy.x = 0;
    enemy.y = 1;
    enemy.hp = 3;

    // Set (0, 0) as water
    engine.state.grid[0][0].terrain = 'water';

    // Punch from (0, 1) towards (0, 0) (dy = -1)
    combatMech.x = 0;
    combatMech.y = 2;

    const attacked = engine.executeAttack(combatMech.id, 0, 1);
    expect(attacked).toBe(true);
    expect(enemy.isDead).toBe(true);
  });

  it('resolves turn end with enemy attacks and grid power tracking', () => {
    const engine = new IntoTheBreachEngine();
    expect(engine.state.powerGrid).toBeGreaterThan(0);

    engine.endTurn();
    expect(engine.state.turn).toBe(2);
    expect(engine.state.phase).toBe('player');
    // Mechs should have action states refreshed
    for (const mech of engine.state.mechs) {
      expect(mech.hasMoved).toBe(false);
      expect(mech.hasAttacked).toBe(false);
    }
  });
});
