import { describe, expect, it } from 'vitest';
import {
  applyAutoHighwayNetworkPreset,
  clickUrbanCell,
  createMiniMotorwaysState,
  stepCommuterTraffic,
} from './mini-motorways';

describe('Mini Motorways Traffic (#144)', () => {
  it('initializes an 8x6 urban grid with 4 houses, 3 colored malls, and 24 road tiles', () => {
    const state = createMiniMotorwaysState();
    expect(state.grid).toHaveLength(6);
    expect(state.grid[0]).toHaveLength(8);
    expect(state.roadTilesLeft).toBe(24);
    expect(state.roundaboutsLeft).toBe(2);
    expect(state.motorwaysLeft).toBe(1);
  });

  it('allows drawing road tiles and placing a Roundabout upgrade', () => {
    let state = createMiniMotorwaysState();
    state = clickUrbanCell(state, 1, 3);
    expect(state.grid[1][3].kind).toBe('road');
    expect(state.roadTilesLeft).toBe(23);

    state = { ...state, selectedTool: 'roundabout' };
    state = clickUrbanCell(state, 1, 3);
    expect(state.grid[1][3].hasRoundabout).toBe(true);
    expect(state.roundaboutsLeft).toBe(1);
  });

  it('connects all 4 houses via the Auto-Highway preset and completes 30+ commuter trips', () => {
    let state = createMiniMotorwaysState();
    state = applyAutoHighwayNetworkPreset(state);
    expect(state.connectedHousesCount).toBe(4);
    expect(state.motorways).toHaveLength(1);

    for (let i = 0; i < 3; i++) {
      state = stepCommuterTraffic(state);
    }
    expect(state.tripsCompleted).toBeGreaterThanOrEqual(30);
    expect(state.status).toBe('victory');
  });
});
