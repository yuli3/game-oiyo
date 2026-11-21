import { describe, expect, it } from 'vitest';
import {
  buildSpireMap,
  CARD_DEFS,
  type CardId,
  computeCardDamage,
  createInitialSpireState,
  endPlayerTurn,
  isNodeSelectable,
  pickCardReward,
  playSpireCard,
  resolveCampfireChoice,
  selectSpireNode,
  SPIRE_FLOOR_COUNT,
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

  it('builds a 10-50 floor tower where every node links upward and the last floor is the boss', () => {
    const map = buildSpireMap();
    expect(SPIRE_FLOOR_COUNT).toBeGreaterThanOrEqual(10);
    expect(SPIRE_FLOOR_COUNT).toBeLessThanOrEqual(50);
    const last = map.filter((n) => n.floor === SPIRE_FLOOR_COUNT - 1);
    expect(last.map((n) => n.type)).toEqual(['boss']);
    for (const node of map) {
      if (node.floor < SPIRE_FLOOR_COUNT - 1) expect(node.nextIds.length, node.id).toBeGreaterThan(0);
      for (const id of node.nextIds) expect(map.find((n) => n.id === id)?.floor).toBe(node.floor + 1);
    }
  });

  it('a simple greedy player can climb all ten floors and beat the boss', () => {
    const path = ['f0-c0', 'f1-c0', 'f2-c0', 'f3-c0', 'f4-c0', 'f5-c1', 'f6-c1', 'f7-c0', 'f8-c0', 'f9-boss'];
    let s = createInitialSpireState();
    for (const id of path) {
      expect(isNodeSelectable(s, id), id).toBe(true);
      s = selectSpireNode(s, id);
      if (s.phase === 'campfire') s = resolveCampfireChoice(s, s.player.hp < s.player.maxHp * 0.6 ? 'rest' : 'smith');
      for (let turn = 0; turn < 80 && s.phase === 'combat'; turn++) {
        for (let guard = 0; guard < 12 && s.phase === 'combat'; guard++) {
          const e = s.enemy!;
          const incoming = (e.intent.damage + e.strength) * Math.max(1, e.intent.hits);
          const needBlock = incoming - s.player.block > 6;
          const playable = s.hand.filter(
            (c) => CARD_DEFS[c.id].cost <= s.player.energy && !(CARD_DEFS[c.id].hpCost && s.player.hp <= 10)
          );
          if (!playable.length) break;
          const score = (id: CardId) => {
            const d = CARD_DEFS[id];
            if (d.type === 'power' || d.strength || d.energyGain) return 100;
            if (d.vulnerable) return 90;
            if (d.draw) return 80;
            if (d.damageFromBlock) return s.player.block > 10 ? 70 : 5;
            if (d.block) return needBlock ? 75 : 20;
            return 50 + (d.damage ?? 0) * (d.hits ?? 1);
          };
          playable.sort((a, b) => score(b.id) - score(a.id));
          const before = s;
          s = playSpireCard(s, playable[0].uid);
          if (s === before) break;
        }
        if (s.phase === 'combat') s = endPlayerTurn(s);
      }
      if (s.phase === 'reward') s = pickCardReward(s, s.rewardChoices[0]);
    }
    expect(s.phase).toBe('victory');
  });
});
