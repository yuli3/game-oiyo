export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLS = 7;

export type ConnectFourPlayer = 1 | 2;
export type ConnectFourCell = ConnectFourPlayer | 0;
export type ConnectFourBoard = ConnectFourCell[][];
export type ConnectFourResult = ConnectFourPlayer | 0 | null; // 0 = draw, null = in progress

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;

export interface ConnectFourMove {
  board: ConnectFourBoard;
  row: number;
  nextPlayer: ConnectFourPlayer;
  result: ConnectFourResult;
  winCells: number[][] | null;
}

export function createConnectFourBoard(): ConnectFourBoard {
  return Array.from({ length: CONNECT_FOUR_ROWS }, () => Array(CONNECT_FOUR_COLS).fill(0) as ConnectFourCell[]);
}

export function findDropRow(board: readonly ConnectFourCell[][], col: number): number {
  if (col < 0 || col >= CONNECT_FOUR_COLS) return -1;
  for (let row = CONNECT_FOUR_ROWS - 1; row >= 0; row -= 1) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

export function isBoardFull(board: readonly ConnectFourCell[][]): boolean {
  return board[0].every((cell) => cell !== 0);
}

export function checkWinAt(board: readonly ConnectFourCell[][], row: number, col: number, player: ConnectFourPlayer): number[][] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const cells: number[][] = [[row, col]];
    for (const sign of [1, -1] as const) {
      for (let step = 1; step < 4; step += 1) {
        const r = row + dr * step * sign;
        const c = col + dc * step * sign;
        if (r < 0 || r >= CONNECT_FOUR_ROWS || c < 0 || c >= CONNECT_FOUR_COLS || board[r][c] !== player) break;
        cells.push([r, c]);
      }
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return null;
}

/** Immutable drop: returns the new board, landing row, and outcome, or null if the column is full. */
export function dropDisc(board: readonly ConnectFourCell[][], col: number, player: ConnectFourPlayer): ConnectFourMove | null {
  const row = findDropRow(board, col);
  if (row === -1) return null;
  const nextBoard = board.map((r) => [...r]) as ConnectFourBoard;
  nextBoard[row][col] = player;
  const winCells = checkWinAt(nextBoard, row, col, player);
  const result: ConnectFourResult = winCells ? player : isBoardFull(nextBoard) ? 0 : null;
  return { board: nextBoard, row, nextPlayer: player === 1 ? 2 : 1, result, winCells };
}
