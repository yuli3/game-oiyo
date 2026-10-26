// Mini Motorways Traffic (#144) — 8x6 urban commuter grid with color-coded Houses,
// Destination Malls with demand pins, Road tiles, Roundabouts/Traffic Lights,
// Motorway #1 express overpass, BFS shortest-path commuter routing, and 30-trip goal.
// WHY: Inspired by Mini Motorways' minimalist road-network flow and congestion control.

export type CommuterColor = 'crimson' | 'cobalt' | 'amber';

export type UrbanCellKind = 'empty' | 'road' | 'house' | 'mall';

export interface UrbanCell {
  row: number;
  col: number;
  kind: UrbanCellKind;
  color?: CommuterColor;
  hasRoundabout: boolean;
  demandPins: number;
  maxPins: number;
}

export interface MotorwayBridge {
  id: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface MiniMotorwaysState {
  status: 'planning' | 'victory' | 'gridlock';
  week: number;
  tripsCompleted: number;
  tripGoal: number;
  roadTilesLeft: number;
  roundaboutsLeft: number;
  motorwaysLeft: number;
  selectedTool: 'road' | 'roundabout' | 'motorway' | 'erase';
  pendingMotorwayStart: { row: number; col: number } | null;
  motorways: MotorwayBridge[];
  grid: UrbanCell[][];
  connectedHousesCount: number;
  logKo: string;
  logEn: string;
}

export const CITY_ROWS = 6;
export const CITY_COLS = 8;
export const TRIP_GOAL = 30;

function createBaseGrid(): UrbanCell[][] {
  const grid: UrbanCell[][] = [];
  for (let r = 0; r < CITY_ROWS; r++) {
    const row: UrbanCell[] = [];
    for (let c = 0; c < CITY_COLS; c++) {
      row.push({
        row: r,
        col: c,
        kind: 'empty',
        hasRoundabout: false,
        demandPins: 0,
        maxPins: 6,
      });
    }
    grid.push(row);
  }

  // Crimson Houses (West) -> Crimson Mall (East)
  grid[1][0] = { ...grid[1][0], kind: 'house', color: 'crimson' };
  grid[2][0] = { ...grid[2][0], kind: 'house', color: 'crimson' };
  grid[1][6] = {
    ...grid[1][6],
    kind: 'mall',
    color: 'crimson',
    demandPins: 2,
    maxPins: 6,
  };

  // Cobalt Houses (North-West) -> Cobalt Mall (South-East)
  grid[0][2] = { ...grid[0][2], kind: 'house', color: 'cobalt' };
  grid[4][5] = {
    ...grid[4][5],
    kind: 'mall',
    color: 'cobalt',
    demandPins: 2,
    maxPins: 6,
  };

  // Amber Houses (South-West) -> Amber Mall (North-East)
  grid[5][1] = { ...grid[5][1], kind: 'house', color: 'amber' };
  grid[0][7] = {
    ...grid[0][7],
    kind: 'mall',
    color: 'amber',
    demandPins: 1,
    maxPins: 6,
  };

  // Starter road stub
  grid[1][1].kind = 'road';
  grid[1][2].kind = 'road';

  return grid;
}

export function canReachColorMall(
  grid: UrbanCell[][],
  motorways: MotorwayBridge[],
  startRow: number,
  startCol: number,
  color: CommuterColor
): { reachable: boolean; distance: number; usesRoundabout: boolean } {
  const visited = new Set<string>();
  const queue: Array<{
    r: number;
    c: number;
    dist: number;
    roundabout: boolean;
  }> = [{ r: startRow, c: startCol, dist: 0, roundabout: false }];
  visited.add(`${startRow},${startCol}`);

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cell = grid[cur.r][cur.c];
    if (cell.kind === 'mall' && cell.color === color && cur.dist > 0) {
      return {
        reachable: true,
        distance: cur.dist,
        usesRoundabout: cur.roundabout,
      };
    }

    // 4-way road/mall adjacency
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= CITY_ROWS || nc < 0 || nc >= CITY_COLS) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;

      const nextCell = grid[nr][nc];
      if (
        nextCell.kind === 'road' ||
        (nextCell.kind === 'mall' && nextCell.color === color)
      ) {
        visited.add(key);
        queue.push({
          r: nr,
          c: nc,
          dist: cur.dist + 1,
          roundabout: cur.roundabout || nextCell.hasRoundabout,
        });
      }
    }

    // Express Motorway overpass jumps
    for (const mw of motorways) {
      if (mw.fromRow === cur.r && mw.fromCol === cur.c) {
        const key = `${mw.toRow},${mw.toCol}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            r: mw.toRow,
            c: mw.toCol,
            dist: cur.dist + 1,
            roundabout: true,
          });
        }
      } else if (mw.toRow === cur.r && mw.toCol === cur.c) {
        const key = `${mw.fromRow},${mw.fromCol}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            r: mw.fromRow,
            c: mw.fromCol,
            dist: cur.dist + 1,
            roundabout: true,
          });
        }
      }
    }
  }

  return { reachable: false, distance: 999, usesRoundabout: false };
}

function countConnectedHouses(
  grid: UrbanCell[][],
  motorways: MotorwayBridge[]
): number {
  let count = 0;
  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      const cell = grid[r][c];
      if (cell.kind === 'house' && cell.color) {
        if (canReachColorMall(grid, motorways, r, c, cell.color).reachable) {
          count += 1;
        }
      }
    }
  }
  return count;
}

export function createMiniMotorwaysState(): MiniMotorwaysState {
  const grid = createBaseGrid();
  return {
    status: 'planning',
    week: 1,
    tripsCompleted: 0,
    tripGoal: TRIP_GOAL,
    roadTilesLeft: 24,
    roundaboutsLeft: 2,
    motorwaysLeft: 1,
    selectedTool: 'road',
    pendingMotorwayStart: null,
    motorways: [],
    grid,
    connectedHousesCount: countConnectedHouses(grid, []),
    logKo: '🛣️ 같은 색상 주택(🏠)과 쇼핑몰(🏢)을 도로 타일이나 고속도로(Motorway #1)로 연결해 30회 통근을 달성하세요!',
    logEn: '🛣️ Connect matching colored Houses (🏠) and Malls (🏢) with Roads or Motorway #1 to complete 30 commuter trips!',
  };
}

export function clickUrbanCell(
  state: MiniMotorwaysState,
  row: number,
  col: number
): MiniMotorwaysState {
  if (state.status !== 'planning') return state;
  if (row < 0 || row >= CITY_ROWS || col < 0 || col >= CITY_COLS) return state;

  const nextGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
  const cell = nextGrid[row][col];

  if (state.selectedTool === 'road') {
    if (cell.kind === 'empty' && state.roadTilesLeft > 0) {
      cell.kind = 'road';
      const connected = countConnectedHouses(nextGrid, state.motorways);
      return {
        ...state,
        grid: nextGrid,
        roadTilesLeft: state.roadTilesLeft - 1,
        connectedHousesCount: connected,
      };
    }
  } else if (state.selectedTool === 'roundabout') {
    if (cell.kind === 'road' && !cell.hasRoundabout && state.roundaboutsLeft > 0) {
      cell.hasRoundabout = true;
      return {
        ...state,
        grid: nextGrid,
        roundaboutsLeft: state.roundaboutsLeft - 1,
        logKo: `🔄 [${row + 1}, ${col + 1}] 교차로에 회전교차로(Roundabout)를 설치해 통근 처리량을 2배로 높였습니다!`,
        logEn: `🔄 Installed a Roundabout at [${row + 1}, ${col + 1}], doubling intersection throughput!`,
      };
    }
  } else if (state.selectedTool === 'motorway') {
    if (!state.pendingMotorwayStart) {
      return {
        ...state,
        pendingMotorwayStart: { row, col },
        logKo: `🌉 고속도로 시점 [${row + 1}, ${col + 1}] 선택됨 — 연결할 종점 타일을 클릭하세요.`,
        logEn: `🌉 Motorway #1 start [${row + 1}, ${col + 1}] selected — click destination tile.`,
      };
    }
    const start = state.pendingMotorwayStart;
    if ((start.row !== row || start.col !== col) && state.motorwaysLeft > 0) {
      if (nextGrid[start.row][start.col].kind === 'empty') {
        nextGrid[start.row][start.col].kind = 'road';
      }
      if (cell.kind === 'empty') {
        cell.kind = 'road';
      }
      const nextMotorways: MotorwayBridge[] = [
        ...state.motorways,
        {
          id: `mw-${state.motorways.length + 1}`,
          fromRow: start.row,
          fromCol: start.col,
          toRow: row,
          toCol: col,
        },
      ];
      const connected = countConnectedHouses(nextGrid, nextMotorways);
      return {
        ...state,
        grid: nextGrid,
        motorways: nextMotorways,
        motorwaysLeft: state.motorwaysLeft - 1,
        pendingMotorwayStart: null,
        connectedHousesCount: connected,
        logKo: `🌉 고속도로 #1 개통 완료! ([${start.row + 1},${start.col + 1}] ↔ [${row + 1},${col + 1}])`,
        logEn: `🌉 Motorway #1 Express Overpass opened! ([${start.row + 1},${start.col + 1}] ↔ [${row + 1},${col + 1}])`,
      };
    }
  } else if (state.selectedTool === 'erase') {
    if (cell.kind === 'road') {
      const refundedRoundabout = cell.hasRoundabout ? 1 : 0;
      cell.kind = 'empty';
      cell.hasRoundabout = false;
      const connected = countConnectedHouses(nextGrid, state.motorways);
      return {
        ...state,
        grid: nextGrid,
        roadTilesLeft: state.roadTilesLeft + 1,
        roundaboutsLeft: state.roundaboutsLeft + refundedRoundabout,
        connectedHousesCount: connected,
      };
    }
  }

  return state;
}

export function stepCommuterTraffic(
  state: MiniMotorwaysState
): MiniMotorwaysState {
  if (state.status !== 'planning') return state;

  const nextGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
  let tripsDelta = 0;

  // Each mall gains +1 demand pin per rush hour step
  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      const cell = nextGrid[r][c];
      if (cell.kind === 'mall') {
        cell.demandPins += 1;
      }
    }
  }

  // Every connected house dispatches commuters to its matching mall
  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      const house = nextGrid[r][c];
      if (house.kind === 'house' && house.color) {
        const route = canReachColorMall(
          nextGrid,
          state.motorways,
          r,
          c,
          house.color
        );
        if (route.reachable) {
          const served = route.usesRoundabout ? 4 : 3;
          tripsDelta += served;
          // Reduce demand pins on matching mall
          for (let mr = 0; mr < CITY_ROWS; mr++) {
            for (let mc = 0; mc < CITY_COLS; mc++) {
              const mall = nextGrid[mr][mc];
              if (mall.kind === 'mall' && mall.color === house.color) {
                mall.demandPins = Math.max(0, mall.demandPins - 2);
              }
            }
          }
        }
      }
    }
  }

  const nextTrips = state.tripsCompleted + tripsDelta;
  let status: MiniMotorwaysState['status'] = 'planning';

  if (nextTrips >= state.tripGoal) {
    status = 'victory';
  } else {
    // Check if any mall overflowed maxPins
    const overflow = nextGrid.some((row) =>
      row.some((c) => c.kind === 'mall' && c.demandPins >= c.maxPins)
    );
    if (overflow) {
      status = 'gridlock';
    }
  }

  return {
    ...state,
    status,
    week: state.week + 1,
    tripsCompleted: nextTrips,
    grid: nextGrid,
    logKo:
      status === 'victory'
        ? `🏆 누적 통근 ${nextTrips}회 달성! 도시 교통망 마스터 클리어!`
        : status === 'gridlock'
          ? '🚨 쇼핑몰 대기 핀이 한계치(6개)를 초과해 도심 그리드락이 발생했습니다!'
          : `🚗 주간 통근 처리 완료: 이번 주 +${tripsDelta}대 도착 (누적 ${nextTrips} / ${state.tripGoal})`,
    logEn:
      status === 'victory'
        ? `🏆 Completed ${nextTrips} commuter trips! Urban Traffic Master Cleared!`
        : status === 'gridlock'
          ? '🚨 A destination mall exceeded 6 demand pins and triggered urban gridlock!'
          : `🚗 Rush hour dispatched +${tripsDelta} commuters (Total ${nextTrips} / ${state.tripGoal})`,
  };
}

export function applyAutoHighwayNetworkPreset(
  state: MiniMotorwaysState
): MiniMotorwaysState {
  const nextGrid = createBaseGrid();

  // Connect Crimson (row 1, col 1..5) + (2,1) for second Crimson House + Roundabout at (1,3)
  nextGrid[2][1].kind = 'road';
  for (let c = 1; c <= 5; c++) {
    nextGrid[1][c].kind = 'road';
  }
  nextGrid[1][3].hasRoundabout = true;

  // Connect Cobalt (col 2, row 1..4 -> row 4, col 2..4)
  for (let r = 1; r <= 4; r++) {
    nextGrid[r][2].kind = 'road';
  }
  for (let c = 2; c <= 4; c++) {
    nextGrid[4][c].kind = 'road';
  }

  // Express Motorway #1 from Amber House neighbor (5,2) directly to Amber Mall neighbor (0,6)
  nextGrid[5][2].kind = 'road';
  nextGrid[0][6].kind = 'road';
  const motorways: MotorwayBridge[] = [
    { id: 'mw-1', fromRow: 5, fromCol: 2, toRow: 0, toCol: 6 },
  ];

  return {
    ...state,
    status: 'planning',
    grid: nextGrid,
    motorways,
    roadTilesLeft: 12,
    roundaboutsLeft: 1,
    motorwaysLeft: 0,
    connectedHousesCount: countConnectedHouses(nextGrid, motorways),
    logKo: '⚡ 전 색상 간선도로 + 회전교차로 + 고속도로 #1 고가교 프리셋이 개통되었습니다! 『🚗 주간 통근 진행』을 눌러보세요!',
    logEn: '⚡ Loaded Full Arterial Road + Roundabout + Motorway #1 Overpass Network! Click Dispatch Commuters!',
  };
}
