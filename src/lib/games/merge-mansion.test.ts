import { describe, it, expect, beforeEach } from 'vitest';
import { MergeMansionEngine } from './merge-mansion';

describe('MergeMansionEngine', () => {
  let engine: MergeMansionEngine;

  beforeEach(() => {
    engine = new MergeMansionEngine();
  });

  it('initializes a 63-cell board with 3 spawners and starter items', () => {
    expect(engine.board.length).toBe(63);
    expect(engine.board[1]?.isSpawner).toBe(true);
    expect(engine.board[3]?.isSpawner).toBe(true);
    expect(engine.board[5]?.isSpawner).toBe(true);
    expect(engine.energy).toBe(50);
    expect(engine.stars).toBe(0);
  });

  it('spawns new item on tap, consuming 1 energy', () => {
    const prevEnergy = engine.energy;
    const res = engine.tapSpawner(1); // Tool Box
    expect(res.success).toBe(true);
    expect(engine.energy).toBe(prevEnergy - 1);
    expect(res.spawnedIndex).toBeDefined();
    expect(engine.board[res.spawnedIndex!]?.chain).toBe('tools');
  });

  it('moves an item to an empty cell', () => {
    const item = engine.board[15]!;
    expect(item).toBeDefined();
    const res = engine.moveOrMerge(15, 20); // 20 is empty
    expect(res.action).toBe('moved');
    expect(engine.board[15]).toBeNull();
    expect(engine.board[20]?.id).toBe(item.id);
  });

  it('merges two identical tier items into next tier', () => {
    // 15 and 16 are tools tier 1
    const res = engine.moveOrMerge(15, 16);
    expect(res.action).toBe('merged');
    expect(res.newTier).toBe(2);
    expect(engine.board[15]).toBeNull();
    expect(engine.board[16]?.chain).toBe('tools');
    expect(engine.board[16]?.tier).toBe(2);
    expect(engine.stars).toBeGreaterThan(0);
  });

  it('clears cobweb when matching item is merged into cobwebbed cell', () => {
    // Cell 23 is a cobwebbed tools tier 2
    expect(engine.board[23]?.isCobwebbed).toBe(true);

    // Place a free tools tier 2 at cell 22
    engine.board[22] = { id: 'temp-t2', chain: 'tools', tier: 2 };

    const res = engine.moveOrMerge(22, 23);
    expect(res.action).toBe('unlockedCobweb');
    expect(res.newTier).toBe(3);
    expect(engine.board[23]?.isCobwebbed).toBe(false);
    expect(engine.board[23]?.tier).toBe(3);
    expect(engine.board[22]).toBeNull();
  });

  it('disallows moving a cobwebbed item directly', () => {
    expect(engine.board[23]?.isCobwebbed).toBe(true);
    const res = engine.moveOrMerge(23, 24);
    expect(res.action).toBe('none');
    expect(engine.board[23]?.isCobwebbed).toBe(true);
  });

  it('completes quest when required items exist, consuming them', () => {
    const firstQuest = engine.quests[0];
    // Required: tools T2, cleaning T1
    engine.board = Array(63).fill(null);
    engine.board[10] = { id: 'q-tools-2', chain: 'tools', tier: 2 };
    engine.board[11] = { id: 'q-clean-1', chain: 'cleaning', tier: 1 };

    const res = engine.completeQuest(firstQuest.id);
    expect(res.success).toBe(true);
    expect(firstQuest.completed).toBe(true);
    expect(engine.completedQuests).toContain(firstQuest.id);
    expect(engine.stars).toBe(firstQuest.starsReward);
    // Consumed
    expect(engine.board[10]).toBeNull();
    expect(engine.board[11]).toBeNull();
  });

  it('fails quest completion if items are missing', () => {
    const firstQuest = engine.quests[0];
    // Clear tools tier 2
    const res = engine.completeQuest(firstQuest.id);
    expect(res.success).toBe(false);
    expect(firstQuest.completed).toBe(false);
  });
});
