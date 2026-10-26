import { describe, expect, it } from 'vitest';
import {
  applyGoldenFeatherPackPreset,
  createCozyGliderState,
  moveOrGlideToNode,
  restAtCampfire,
} from './cozy-glider';

describe('Cozy Peak Glider (#143)', () => {
  it('initializes at Seashell Beach Camp (elevation 0) with 2 Golden Feathers', () => {
    const state = createCozyGliderState();
    expect(state.currentNodeId).toBe('beach-start');
    expect(state.elevation).toBe(0);
    expect(state.maxFeathers).toBe(2);
    expect(state.activeFeathers).toBe(2);
  });

  it('climbs to Lighthouse Rock Chest, awards a permanent Golden Feather, and glides back to recharge', () => {
    let state = createCozyGliderState();
    state = moveOrGlideToNode(state, 'coastal-chest');
    expect(state.currentNodeId).toBe('coastal-chest');
    expect(state.maxFeathers).toBe(3);

    // Glide back down to beach
    state = moveOrGlideToNode(state, 'beach-start');
    expect(state.currentNodeId).toBe('beach-start');
    expect(state.activeFeathers).toBe(3);
  });

  it('recharges all active feathers when resting at a campfire', () => {
    let state = createCozyGliderState();
    state = { ...state, activeFeathers: 0, maxFeathers: 4 };
    state = restAtCampfire(state);
    expect(state.activeFeathers).toBe(4);
  });

  it('reaches Hawk Peak Summit (550m) when climbing with sufficient Golden Feathers', () => {
    let state = createCozyGliderState();
    state = applyGoldenFeatherPackPreset(state);
    state = moveOrGlideToNode(state, 'hawk-peak');
    expect(state.currentNodeId).toBe('hawk-peak');
    expect(state.elevation).toBe(5);
    expect(state.status).toBe('summit-reached');
  });
});
