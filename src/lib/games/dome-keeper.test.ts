import { describe, expect, it } from 'vitest';
import {
  applyRelicOverdrivePreset,
  createInitialDomeKeeperState,
  drillMineCell,
  fireDomeLaserAtInvader,
  startAlienWaveDefense,
  upgradeDomeSystem,
} from './dome-keeper';

describe('Dome Keeper Drill Defense (#146 dome-keeper)', () => {
  it('initializes underground stratum with excavated shaft at (0,3) and Relic Core at (4,3)', () => {
    const state = createInitialDomeKeeperState(20261026);
    expect(state.phase).toBe('mining');
    expect(state.grid[0][3].kind).toBe('empty');
    expect(state.grid[4][3].kind).toBe('relic');
    expect(state.iron).toBe(6);
  });

  it('excavates adjacent underground tiles, generates Engine v5.0 Voronoi shatter shards, and upgrades drill', () => {
    let state = createInitialDomeKeeperState(20261026);
    state = upgradeDomeSystem(state, 'drill');
    expect(state.drillPowerLv).toBe(2);

    // Drill (1,3) directly below (0,3) until broken
    state = drillMineCell(state, 1, 3);
    state = drillMineCell(state, 1, 3);
    expect(state.grid[1][3].kind).toBe('empty');
    expect(state.recentShards.length).toBeGreaterThan(0);
    expect(state.totalBlocksMined).toBe(1);
  });

  it('transitions to Alien Wave Defense, fires Dome Laser, and clears Relic Overdrive Preset to win', () => {
    let state = createInitialDomeKeeperState(20261026);
    state = startAlienWaveDefense(state);
    expect(state.phase).toBe('defense');
    expect(state.invaders.length).toBe(2);

    const firstId = state.invaders[0].id;
    state = fireDomeLaserAtInvader(state, firstId);
    expect(state.turretAngleDeg).toBe(35);

    // Load Relic Overdrive Preset on Wave 3 and extract the Relic Core at (4,3)
    let preset = applyRelicOverdrivePreset(state);
    preset = drillMineCell(preset, 4, 3);
    expect(preset.relicExtracted).toBe(true);
    expect(preset.status).toBe('won');
  });
});
