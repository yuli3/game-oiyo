/**
 * #146 Dome Keeper Drill Defense (`dome-keeper.ts`)
 *
 * Powered by OIYO Web-Unity Engine v2.0 ~ v5.0 (`shatterBoxVoronoi2D`, `createSeededRng`).
 * Dual-loop underground drill mining & surface glass-dome alien wave defense.
 */

import { createSeededRng } from './engine-v2';
import { shatterBoxVoronoi2D, type ShatterShard2D } from './engine-v5';

export type StratumTileKind = 'empty' | 'dirt' | 'rock' | 'iron' | 'cobalt' | 'relic';

export interface MineCell {
  row: number;
  col: number;
  kind: StratumTileKind;
  hp: number;
  maxHp: number;
  ironYield: number;
  cobaltYield: number;
}

export interface AlienInvader {
  id: string;
  name: string;
  angleDeg: number; // 15..165 degrees around dome arc
  distance: number; // 100 -> 0 (0 = hitting dome)
  hp: number;
  maxHp: number;
  attackDamage: number;
  speed: number;
  isBoss: boolean;
}

export interface DomeKeeperState {
  seed: number;
  wave: number;
  maxWaves: number;
  phase: 'mining' | 'defense';
  status: 'playing' | 'won' | 'lost';
  waveTimerSec: number;
  domeHp: number;
  maxDomeHp: number;
  domeShield: number;
  iron: number;
  cobalt: number;
  relicExtracted: boolean;
  keeperRow: number;
  keeperCol: number;
  drillPowerLv: number;
  jetpackLv: number;
  laserCannonLv: number;
  turretAngleDeg: number;
  grid: MineCell[][];
  invaders: AlienInvader[];
  recentShards: ShatterShard2D[];
  totalBlocksMined: number;
  totalAliensDefeated: number;
  lastEvent: string;
}

export const MINE_ROWS = 5;
export const MINE_COLS = 7;

export function createInitialDomeKeeperState(seed: number = 20261026): DomeKeeperState {
  const rng = createSeededRng(seed);
  const grid: MineCell[][] = [];

  for (let r = 0; r < MINE_ROWS; r++) {
    const rowCells: MineCell[] = [];
    for (let c = 0; c < MINE_COLS; c++) {
      // Top center elevator shaft starts excavated
      if (r === 0 && c === 3) {
        rowCells.push({
          row: r,
          col: c,
          kind: 'empty',
          hp: 0,
          maxHp: 1,
          ironYield: 0,
          cobaltYield: 0,
        });
        continue;
      }

      // Relic core at bottom center
      if (r === MINE_ROWS - 1 && c === 3) {
        rowCells.push({
          row: r,
          col: c,
          kind: 'relic',
          hp: 60,
          maxHp: 60,
          ironYield: 10,
          cobaltYield: 6,
        });
        continue;
      }

      const roll = rng();
      let kind: StratumTileKind = 'dirt';
      let maxHp = 15 + r * 6;
      let ironYield = 0;
      let cobaltYield = 0;

      if (roll < 0.28) {
        kind = 'iron';
        maxHp = 22 + r * 8;
        ironYield = 3 + Math.floor(r * 0.8);
      } else if (roll < 0.42 && r >= 1) {
        kind = 'cobalt';
        maxHp = 28 + r * 10;
        cobaltYield = 2 + Math.floor(r * 0.5);
      } else if (roll < 0.68 && r >= 1) {
        kind = 'rock';
        maxHp = 26 + r * 9;
      }

      rowCells.push({
        row: r,
        col: c,
        kind,
        hp: maxHp,
        maxHp,
        ironYield,
        cobaltYield,
      });
    }
    grid.push(rowCells);
  }

  return {
    seed,
    wave: 1,
    maxWaves: 3,
    phase: 'mining',
    status: 'playing',
    waveTimerSec: 30,
    domeHp: 120,
    maxDomeHp: 120,
    domeShield: 25,
    iron: 6,
    cobalt: 2,
    relicExtracted: false,
    keeperRow: 0,
    keeperCol: 3,
    drillPowerLv: 1,
    jetpackLv: 1,
    laserCannonLv: 1,
    turretAngleDeg: 90,
    grid,
    invaders: [],
    recentShards: [],
    totalBlocksMined: 0,
    totalAliensDefeated: 0,
    lastEvent: 'Mining Phase started. Excavate Iron & Cobalt before the alien wave arrives!',
  };
}

export function isAdjacentToExcavated(grid: MineCell[][], row: number, col: number): boolean {
  if (row < 0 || row >= MINE_ROWS || col < 0 || col >= MINE_COLS) return false;
  if (grid[row][col].kind === 'empty') return true;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < MINE_ROWS && nc >= 0 && nc < MINE_COLS && grid[nr][nc].kind === 'empty') {
      return true;
    }
  }
  return false;
}

export function drillMineCell(state: DomeKeeperState, row: number, col: number): DomeKeeperState {
  if (state.status !== 'playing' || state.phase !== 'mining') return state;
  if (row < 0 || row >= MINE_ROWS || col < 0 || col >= MINE_COLS) return state;

  const target = state.grid[row][col];
  if (target.kind === 'empty') return state;
  if (!isAdjacentToExcavated(state.grid, row, col)) {
    return {
      ...state,
      lastEvent: 'Tile is sealed deep underground — excavate an adjacent tunnel first!',
    };
  }

  const drillDamage = 12 + state.drillPowerLv * 10;
  const nextHp = Math.max(0, target.hp - drillDamage);
  const broken = nextHp === 0;

  const nextGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
  nextGrid[row][col].hp = nextHp;

  let iron = state.iron;
  let cobalt = state.cobalt;
  let relicExtracted = state.relicExtracted;
  let totalBlocksMined = state.totalBlocksMined;
  let recentShards = state.recentShards;
  let lastEvent = `Drilled (${row},${col}) [${target.kind.toUpperCase()}] for ${drillDamage} dmg.`;

  if (broken) {
    nextGrid[row][col].kind = 'empty';
    iron += target.ironYield;
    cobalt += target.cobaltYield;
    totalBlocksMined += 1;
    if (target.kind === 'relic') {
      relicExtracted = true;
    }

    // Engine v5.0 Voronoi Shatter Physics for ore destruction
    recentShards = shatterBoxVoronoi2D(
      col * 64 + 32,
      row * 48 + 24,
      48,
      36,
      col * 64 + 32,
      row * 48 + 24,
      180,
      6
    );

    lastEvent = `Excavated ${target.kind.toUpperCase()}! +${target.ironYield} Iron, +${target.cobaltYield} Cobalt.`;
  }

  const nextTimer = Math.max(0, state.waveTimerSec - 5);
  let nextState: DomeKeeperState = {
    ...state,
    grid: nextGrid,
    iron,
    cobalt,
    relicExtracted,
    keeperRow: broken ? row : state.keeperRow,
    keeperCol: broken ? col : state.keeperCol,
    waveTimerSec: nextTimer,
    recentShards,
    totalBlocksMined,
    lastEvent,
  };

  if (relicExtracted && state.wave >= state.maxWaves) {
    return {
      ...nextState,
      status: 'won',
      lastEvent: 'Ancient Relic Core extracted! Dome orbital warp shield activated — Victory!',
    };
  }

  if (nextTimer === 0) {
    nextState = startAlienWaveDefense(nextState);
  }

  return nextState;
}

export function upgradeDomeSystem(
  state: DomeKeeperState,
  upgradeKind: 'drill' | 'jetpack' | 'laser' | 'shield'
): DomeKeeperState {
  if (state.status !== 'playing') return state;

  if (upgradeKind === 'drill') {
    const cost = state.drillPowerLv * 4;
    if (state.iron < cost) return { ...state, lastEvent: `Need ${cost} Iron for Drill Lv.${state.drillPowerLv + 1}` };
    return {
      ...state,
      iron: state.iron - cost,
      drillPowerLv: state.drillPowerLv + 1,
      lastEvent: `Upgraded Plasma Drill to Lv.${state.drillPowerLv + 1}!`,
    };
  }

  if (upgradeKind === 'jetpack') {
    const cost = state.jetpackLv * 3;
    if (state.iron < cost) return { ...state, lastEvent: `Need ${cost} Iron for Jetpack Lv.${state.jetpackLv + 1}` };
    return {
      ...state,
      iron: state.iron - cost,
      jetpackLv: state.jetpackLv + 1,
      lastEvent: `Upgraded Haul Jetpack to Lv.${state.jetpackLv + 1}!`,
    };
  }

  if (upgradeKind === 'laser') {
    const cost = state.laserCannonLv * 4;
    if (state.iron < cost) return { ...state, lastEvent: `Need ${cost} Iron for Laser Lv.${state.laserCannonLv + 1}` };
    return {
      ...state,
      iron: state.iron - cost,
      laserCannonLv: state.laserCannonLv + 1,
      lastEvent: `Upgraded Dome Laser Array to Lv.${state.laserCannonLv + 1}!`,
    };
  }

  // shield repair with Cobalt
  if (state.cobalt < 2) {
    return { ...state, lastEvent: 'Need 2 Cobalt to recharge Dome Shield & Hull!' };
  }
  return {
    ...state,
    cobalt: state.cobalt - 2,
    domeHp: Math.min(state.maxDomeHp, state.domeHp + 30),
    domeShield: state.domeShield + 25,
    lastEvent: 'Consumed 2 Cobalt: Restored +30 Dome HP and +25 Overcharge Shield!',
  };
}

export function startAlienWaveDefense(state: DomeKeeperState): DomeKeeperState {
  if (state.status !== 'playing') return state;
  const w = state.wave;
  const invaders: AlienInvader[] = [
    {
      id: `w${w}-swarmer-L`,
      name: 'Chitin Swarmer',
      angleDeg: 35,
      distance: 80,
      hp: 24 + w * 12,
      maxHp: 24 + w * 12,
      attackDamage: 12 + w * 4,
      speed: 20,
      isBoss: false,
    },
    {
      id: `w${w}-spitter-R`,
      name: 'Acid Spitter',
      angleDeg: 145,
      distance: 90,
      hp: 30 + w * 14,
      maxHp: 30 + w * 14,
      attackDamage: 15 + w * 5,
      speed: 18,
      isBoss: false,
    },
  ];

  if (w >= 2) {
    invaders.push({
      id: `w${w}-goliath-C`,
      name: w === state.maxWaves ? 'Apex Leviathan Boss' : 'Armored Diver',
      angleDeg: 90,
      distance: 100,
      hp: 50 + w * 22,
      maxHp: 50 + w * 22,
      attackDamage: 22 + w * 6,
      speed: 15,
      isBoss: w === state.maxWaves,
    });
  }

  return {
    ...state,
    phase: 'defense',
    waveTimerSec: 0,
    keeperRow: 0,
    keeperCol: 3,
    invaders,
    lastEvent: `ALERT: Wave ${w}/${state.maxWaves} Alien Assault detected! Man the Dome Laser!`,
  };
}

export function fireDomeLaserAtInvader(state: DomeKeeperState, invaderId: string): DomeKeeperState {
  if (state.status !== 'playing' || state.phase !== 'defense') return state;

  const targetIdx = state.invaders.findIndex((inv) => inv.id === invaderId);
  if (targetIdx === -1) return state;

  const laserDmg = 22 + state.laserCannonLv * 14;
  const target = state.invaders[targetIdx];
  const nextInvaders: AlienInvader[] = [];
  let totalAliensDefeated = state.totalAliensDefeated;
  let iron = state.iron;

  for (let i = 0; i < state.invaders.length; i++) {
    const inv = { ...state.invaders[i] };
    if (i === targetIdx) {
      inv.hp = Math.max(0, inv.hp - laserDmg);
    }
    if (inv.hp === 0) {
      totalAliensDefeated += 1;
      iron += inv.isBoss ? 8 : 3;
    } else {
      inv.distance = Math.max(0, inv.distance - inv.speed);
      nextInvaders.push(inv);
    }
  }

  // Remaining invaders at distance === 0 strike the dome
  let domeShield = state.domeShield;
  let domeHp = state.domeHp;
  for (const inv of nextInvaders) {
    if (inv.distance === 0) {
      let dmg = inv.attackDamage;
      const absorbed = Math.min(domeShield, dmg);
      domeShield -= absorbed;
      dmg -= absorbed;
      domeHp = Math.max(0, domeHp - dmg);
    }
  }

  if (domeHp === 0) {
    return {
      ...state,
      domeHp: 0,
      domeShield: 0,
      invaders: nextInvaders,
      status: 'lost',
      lastEvent: 'The Glass Dome shattered under alien bombardment!',
    };
  }

  if (nextInvaders.length === 0) {
    if (state.wave >= state.maxWaves) {
      return {
        ...state,
        domeHp,
        domeShield,
        iron,
        invaders: [],
        totalAliensDefeated,
        status: 'won',
        lastEvent: `Final Wave ${state.wave} repelled! The colony dome stands victorious!`,
      };
    }

    return {
      ...state,
      wave: state.wave + 1,
      phase: 'mining',
      waveTimerSec: 30,
      domeHp,
      domeShield,
      iron,
      invaders: [],
      totalAliensDefeated,
      turretAngleDeg: target.angleDeg,
      lastEvent: `Wave ${state.wave} cleared! Returning to underground mining for Wave ${state.wave + 1}.`,
    };
  }

  return {
    ...state,
    domeHp,
    domeShield,
    iron,
    invaders: nextInvaders,
    totalAliensDefeated,
    turretAngleDeg: target.angleDeg,
    lastEvent: `Fired Dome Laser (${laserDmg} DMG) at ${target.name}!`,
  };
}

export function applyRelicOverdrivePreset(state: DomeKeeperState): DomeKeeperState {
  const base = createInitialDomeKeeperState(state.seed);
  // Carve straight shaft down col 3 to the Relic Core and upgrade systems
  const nextGrid = base.grid.map((row) =>
    row.map((cell) => {
      if (cell.col === 3 && cell.row < MINE_ROWS - 1) {
        return { ...cell, kind: 'empty' as const, hp: 0 };
      }
      if (cell.col === 3 && cell.row === MINE_ROWS - 1) {
        return { ...cell, hp: 10 };
      }
      return cell;
    })
  );

  return {
    ...base,
    wave: 3,
    grid: nextGrid,
    iron: 24,
    cobalt: 10,
    drillPowerLv: 3,
    jetpackLv: 3,
    laserCannonLv: 3,
    domeShield: 60,
    keeperRow: MINE_ROWS - 2,
    keeperCol: 3,
    totalBlocksMined: 8,
    totalAliensDefeated: 5,
    lastEvent: 'Overdrive Preset Loaded: Central shaft excavated to Relic Core at (4,3) on Wave 3!',
  };
}
