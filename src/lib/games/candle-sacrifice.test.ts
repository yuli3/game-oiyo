import { describe, expect, it } from 'vitest';
import {
  applyWinningFormationPreset,
  clickPlayerLane,
  createCandleSacrificeState,
  drawFromDeck,
  ringCombatBell,
  selectHandCard,
} from './candle-sacrifice';

describe('Candle Sacrifice Deck (#142)', () => {
  it('initializes with 4 lanes, 2 life candles, 0 scale balance, and a starter hand', () => {
    const state = createCandleSacrificeState();
    expect(state.playerRow).toHaveLength(4);
    expect(state.candlesRemaining).toBe(2);
    expect(state.scaleBalance).toBe(0);
    expect(state.hand).toHaveLength(4);
  });

  it('sacrifices a 0-cost Squirrel on the board to summon a 1-Blood Stoat and gain a Bone', () => {
    let state = createCandleSacrificeState();
    const squirrelCard = state.hand.find((c) => c.key === 'squirrel')!;
    const stoatCard = state.hand.find((c) => c.key === 'stoat')!;

    // Place Squirrel on lane 0
    state = selectHandCard(state, squirrelCard.id);
    state = clickPlayerLane(state, 0);
    expect(state.playerRow[0]?.key).toBe('squirrel');

    // Select 1-Blood Stoat and sacrifice lane 0
    const bonesBefore = state.bones;
    state = selectHandCard(state, stoatCard.id);
    state = clickPlayerLane(state, 0);
    expect(state.playerRow[0]?.key).toBe('stoat');
    expect(state.bones).toBe(bonesBefore + 1);
  });

  it('draws from the Squirrel deck and Main deck', () => {
    let state = createCandleSacrificeState();
    const handCount = state.hand.length;
    state = drawFromDeck(state, 'squirrel');
    expect(state.hand).toHaveLength(handCount + 1);
    state = drawFromDeck(state, 'main');
    expect(state.hand).toHaveLength(handCount + 2);
  });

  it('tips the Balance Scale to +5 and wins the duel when ringing the Combat Bell with a lethal formation', () => {
    let state = createCandleSacrificeState();
    state = applyWinningFormationPreset(state);
    state = ringCombatBell(state);
    expect(state.scaleBalance).toBe(5);
    expect(state.status).toBe('victory');
  });
});
