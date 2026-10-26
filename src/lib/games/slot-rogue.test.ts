import { describe, expect, it } from 'vitest';
import {
  createSlotRogueState,
  draftSymbol,
  injectSynergyComboPreset,
  rerollDraftChoices,
  spinSlotGrid,
} from './slot-rogue';

describe('Slot Synergy Rogue (#140)', () => {
  it('initializes with 7 starter symbols, 5 coins, and 5 spins until the first rent due', () => {
    const state = createSlotRogueState();
    expect(state.status).toBe('ready');
    expect(state.inventory).toHaveLength(7);
    expect(state.coins).toBe(5);
    expect(state.spinsLeftInCycle).toBe(5);
    expect(state.rentTargets[0]).toBe(25);
  });

  it('evaluates adjacency synergies (Cat+Milk, Miner+Ore->Gem) and pays out coins on spin', () => {
    let state = createSlotRogueState();
    state = injectSynergyComboPreset(state);
    const afterSpin = spinSlotGrid(state, 42);
    expect(afterSpin.totalSpins).toBe(1);
    expect(afterSpin.lastSpinPayout).toBeGreaterThan(20);
    expect(afterSpin.coins).toBeGreaterThan(state.coins);
    expect(afterSpin.status).toBe('draft');
  });

  it('supports drafting new symbols into inventory and spending reroll tokens', () => {
    let state = createSlotRogueState();
    state = spinSlotGrid(state, 7);
    const beforeCount = state.inventory.length;
    const afterReroll = rerollDraftChoices(state);
    expect(afterReroll.rerollTokens).toBe(2);

    const picked = afterReroll.draftChoices[0];
    const afterDraft = draftSymbol(afterReroll, picked);
    expect(afterDraft.inventory).toHaveLength(beforeCount + 1);
    expect(afterDraft.status).toBe('ready');
  });

  it('collects rent at the end of a 5-spin cycle and advances rentCycle or evicts if short', () => {
    let state = createSlotRogueState();
    state = { ...state, coins: 100 };
    for (let i = 0; i < 5; i++) {
      state = spinSlotGrid(state, i + 10);
      if (state.status === 'draft') {
        state = draftSymbol(state, 'skip');
      }
    }
    expect(state.rentCycle).toBe(1);
    expect(state.status).toBe('rent-paid');
    expect(state.spinsLeftInCycle).toBe(5);
  });
});
