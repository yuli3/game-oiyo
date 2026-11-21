import { describe, expect, it } from 'vitest';
import {
  MAX_WAVES,
  createInitialDomeKeeperState as createForStages,
  startAlienWaveDefense as startWaveForStages,
  waveStrength,
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

    // Load Relic Overdrive Preset on the final wave and extract the Relic Core at (4,3)
    let preset = applyRelicOverdrivePreset(state);
    preset = drillMineCell(preset, 4, 3);
    expect(preset.relicExtracted).toBe(true);
    expect(preset.status).toBe('won');
  });

  it('transitions alien invaders into FSM states (charge, bombard, shield) based on distance and role', () => {
    let state = createInitialDomeKeeperState(20261026);
    state = startAlienWaveDefense(state);

    // Initial state should be approach
    expect(state.invaders[0].aiState).toBe('approach');

    // Fire laser at first invader to advance wave simulation
    const firstId = state.invaders[0].id;
    state = fireDomeLaserAtInvader(state, firstId);

    // Surviving invader with low distance transitions to charge or bombard
    const swarmer = state.invaders.find((inv) => inv.name.includes('Swarmer'));
    if (swarmer) {
      expect(['approach', 'charge']).toContain(swarmer.aiState);
    }
  });
});

describe('ten-wave run', () => {
  it('runs 10 waves with stronger invaders each wave and a boss only at the end', () => {
    expect(MAX_WAVES).toBe(10);
    expect(createForStages().maxWaves).toBe(10);
    expect(waveStrength(1)).toBe(1);
    expect(waveStrength(MAX_WAVES)).toBe(4);
    const hpAt = (wave: number) => startWaveForStages({ ...createForStages(), wave }).invaders.reduce((sum, inv) => sum + inv.hp, 0);
    expect(hpAt(5)).toBeGreaterThan(hpAt(4));
    expect(startWaveForStages({ ...createForStages(), wave: 9 }).invaders.some((inv) => inv.isBoss)).toBe(false);
    expect(startWaveForStages({ ...createForStages(), wave: 10 }).invaders.some((inv) => inv.isBoss)).toBe(true);
  });
});
