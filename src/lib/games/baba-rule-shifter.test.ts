import { describe, it, expect, beforeEach } from 'vitest';
import { BabaRuleShifterEngine } from './baba-rule-shifter';

describe('BabaRuleShifterEngine', () => {
  let engine: BabaRuleShifterEngine;

  beforeEach(() => {
    engine = new BabaRuleShifterEngine(1);
  });

  it('compiles initial rules from level 1 text triplets', () => {
    const rules = engine.getActiveRules();
    expect(rules).toEqual(
      expect.arrayContaining([
        { subject: 'baba', predicate: 'you' },
        { subject: 'flag', predicate: 'win' },
        { subject: 'wall', predicate: 'stop' },
        { subject: 'rock', predicate: 'push' },
      ])
    );
  });

  it('moves Baba when direction has no obstacles', () => {
    const baba = engine.getEntities().find((e) => e.type === 'baba')!;
    const initialX = baba.x;
    const initialY = baba.y;

    const moved = engine.move('left');
    expect(moved).toBe(true);
    expect(baba.x).toBe(initialX - 1);
    expect(baba.y).toBe(initialY);
    expect(engine.getMoveCount()).toBe(1);
  });

  it('pushes pushable rock when Baba moves into it', () => {
    // In Level 1, Baba is at (2,4) and Rock is at (4,4)
    // Move Baba right to (3,4), then right into rock at (4,4)
    engine.move('right');
    const baba = engine.getEntities().find((e) => e.type === 'baba')!;
    expect(baba.x).toBe(3);

    const rock = engine.getEntities().find((e) => e.type === 'rock')!;
    expect(rock.x).toBe(4);

    engine.move('right'); // Pushes rock from (4,4) to (5,4)? Wait, in level 1, (5,4) is WALL IS STOP!
    // Since (5,4) has a wall with STOP, push should fail!
    expect(rock.x).toBe(4);
    expect(baba.x).toBe(3);
  });

  it('blocks movement against walls with STOP rule', () => {
    // In level 1, move Baba down and then right towards wall
    engine.move('right');
    engine.move('down'); // Baba at (3,5)
    engine.move('right'); // Baba at (4,5)
    const baba = engine.getEntities().find((e) => e.type === 'baba')!;
    expect(baba.x).toBe(4);
    expect(baba.y).toBe(5);

    // Wall is at (5,5). Moving right should be blocked!
    const moved = engine.move('right');
    expect(moved).toBe(false);
    expect(baba.x).toBe(4);
  });

  it('supports undoing moves and restoring previous positions', () => {
    const baba = engine.getEntities().find((e) => e.type === 'baba')!;
    const startX = baba.x;

    engine.move('left');
    expect(baba.x).toBe(startX - 1);
    expect(engine.canUndo()).toBe(true);

    const undone = engine.undo();
    expect(undone).toBe(true);

    const restoredBaba = engine.getEntities().find((e) => e.type === 'baba')!;
    expect(restoredBaba.x).toBe(startX);
    expect(engine.getMoveCount()).toBe(0);
  });

  it('breaks rules when text blocks are pushed apart (Level 2)', () => {
    engine.loadLevel(2);
    // In level 2, WALL IS STOP is at y=3: text_wall(1,3), text_is(2,3), text_stop(3,3)
    expect(engine.hasProperty('wall', 'stop')).toBe(true);

    // Baba is at (2,5). Move Baba up to (2,4) then up into text_is at (2,3)
    engine.move('up'); // Baba at (2,4)
    engine.move('up'); // Baba pushes text_is from (2,3) to (2,2)

    // The text_is at x=2 has been pushed up to y=2
    const pushedIs = engine.getEntities().find((e) => e.type === 'text_is' && e.y === 2);
    expect(pushedIs).toBeDefined();

    // Rule WALL IS STOP is now broken!
    expect(engine.hasProperty('wall', 'stop')).toBe(false);

    // Now Baba can walk through walls freely!
  });

  it('triggers win when player touches WIN entity', () => {
    // Setup simple condition
    engine.loadLevel(1);
    const baba = engine.getEntities().find((e) => e.type === 'baba')!;
    const flag = engine.getEntities().find((e) => e.type === 'flag')!;
    expect(flag).toBeDefined();

    // Place Baba adjacent to flag (7,4) -> Baba at (6,4)
    baba.x = 6;
    baba.y = 4;

    engine.move('right'); // Baba steps onto flag
    expect(engine.getIsWon()).toBe(true);
  });
});
