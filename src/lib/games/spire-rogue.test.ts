import { describe, expect, it } from 'vitest';
import {
  computeCardDamage,
  createInitialSpireState,
  endPlayerTurn,
  isNodeSelectable,
  pickCardReward,
  playSpireCard,
  resolveCampfireChoice,
  selectSpireNode,
} from './spire-rogue';

describe('Spire Deckbuilder Rogue (#136)', () => {
  it('initializes Spire map with 2 selectable floor-0 nodes and 10 starter cards', () => {
    const state = createInitialSpireState();
    expect(state.phase).toBe('map');
    expect(state.masterDeck).toHaveLength(10);
    expect(isNodeSelectable(state, 'f0-c0')).toBe(true);
    expect(isNodeSelectable(state, 'f0-c2')).toBe(true);
    expect(isNodeSelectable(state, 'f1-c1')).toBe(false);
  });

  it('enters combat when selecting a floor-0 node and draws 5 cards with 3 energy', () => {
    let state = createInitialSpireState();
    state = selectSpireNode(state, 'f0-c0');
    expect(state.phase).toBe('combat');
    expect(state.hand).toHaveLength(5);
    expect(state.drawPile).toHaveLength(5);
    expect(state.player.energy).toBe(3);
    expect(state.enemy).not.toBeNull();
    expect(state.enemy?.intent.damage).toBeGreaterThan(0);
  });

  it('plays attack and defend cards, applying Vulnerable (+50% damage) and Block', () => {
    let state = createInitialSpireState();
    state = selectSpireNode(state, 'f0-c0');

    // Move bash and strike into hand if not already there
    const bashCard = [...state.hand, ...state.drawPile].find((c) => c.id === 'bash')!;
    const strikeCard = [...state.hand, ...state.drawPile].find((c) => c.id === 'strike')!;
    state = {
      ...state,
      hand: [bashCard, strikeCard],
    };

    const initialEnemyHp = state.enemy!.hp;
    // Play Bash (2 energy, 8 dmg + 2 Vulnerable)
    state = playSpireCard(state, bashCard.uid);
    expect(state.player.energy).toBe(1);
    expect(state.enemy?.hp).toBe(initialEnemyHp - 8);
    expect(state.enemy?.vulnerable).toBe(2);

    // Strike should now deal 6 * 1.5 = 9 damage
    expect(computeCardDamage(strikeCard, state.player, state.enemy)).toBe(9);
    state = playSpireCard(state, strikeCard.uid);
    expect(state.player.energy).toBe(0);
    expect(state.enemy?.hp).toBe(initialEnemyHp - 17);
  });

  it('executes enemy intent on endPlayerTurn and mitigates damage with player Block', () => {
    let state = createInitialSpireState();
    state = selectSpireNode(state, 'f0-c0');
    // Jaw Worm turn 0 attacks for 11 damage
    const defendCard = [...state.hand, ...state.drawPile].find((c) => c.id === 'defend')!;
    state = {
      ...state,
      hand: [defendCard],
    };
    state = playSpireCard(state, defendCard.uid);
    expect(state.player.block).toBe(5);

    const hpBefore = state.player.hp;
    state = endPlayerTurn(state);
    // 11 attack - 5 block = 6 damage taken
    expect(state.player.hp).toBe(hpBefore - 6);
    expect(state.turn).toBe(2);
    expect(state.hand).toHaveLength(5);
  });

  it('transitions to reward phase on enemy defeat, adds drafted card, and supports campfire rest/smith', () => {
    let state = createInitialSpireState();
    state = selectSpireNode(state, 'f0-c0');
    // Set enemy HP to 5 and play a Strike
    const strikeCard = [...state.hand, ...state.drawPile].find((c) => c.id === 'strike')!;
    state = {
      ...state,
      enemy: { ...state.enemy!, hp: 5 },
      hand: [strikeCard],
    };
    state = playSpireCard(state, strikeCard.uid);
    expect(state.phase).toBe('reward');
    expect(state.rewardChoices).toHaveLength(3);

    const chosen = state.rewardChoices[0];
    state = pickCardReward(state, chosen);
    expect(state.phase).toBe('map');
    expect(state.masterDeck).toHaveLength(11);

    // Simulate entering a campfire node directly
    state = {
      ...state,
      currentNodeId: 'f2-c0',
      map: state.map.map((n) => (n.id === 'f2-c0' ? { ...n, cleared: true } : n)),
    };
    state = selectSpireNode(state, 'f3-c0');
    expect(state.phase).toBe('campfire');
    state = resolveCampfireChoice(state, 'smith');
    expect(state.phase).toBe('map');
    expect(state.masterDeck.filter((c) => c.upgraded).length).toBe(3);
  });
});
