export const GOMOKU_SIZE = 15;
export const GOMOKU_CELL_COUNT = GOMOKU_SIZE * GOMOKU_SIZE;

export type GomokuPlayer = 1 | 2;
export type GomokuCell = GomokuPlayer | null;
export type GomokuBoard = GomokuCell[];
export type GomokuResult = GomokuPlayer | 0 | null;

const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;

export interface GomokuMove {
  board: GomokuBoard;
  nextPlayer: GomokuPlayer;
  result: GomokuResult;
}

export function createGomokuBoard(): GomokuBoard {
  return Array<GomokuCell>(GOMOKU_CELL_COUNT).fill(null);
}

export function getGomokuResult(board: readonly GomokuCell[], lastIndex: number): GomokuResult {
  if (board.length !== GOMOKU_CELL_COUNT || !Number.isInteger(lastIndex) || lastIndex < 0 || lastIndex >= board.length) return null;
  const player = board[lastIndex];
  if (player === null) return board.every((cell) => cell !== null) ? 0 : null;

  const x = lastIndex % GOMOKU_SIZE;
  const y = Math.floor(lastIndex / GOMOKU_SIZE);
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    for (const sign of [-1, 1] as const) {
      for (let distance = 1; distance < 5; distance++) {
        const nextX = x + dx * distance * sign;
        const nextY = y + dy * distance * sign;
        if (nextX < 0 || nextX >= GOMOKU_SIZE || nextY < 0 || nextY >= GOMOKU_SIZE) break;
        if (board[nextY * GOMOKU_SIZE + nextX] !== player) break;
        count++;
      }
    }
    if (count >= 5) return player;
  }
  return board.every((cell) => cell !== null) ? 0 : null;
}

export function placeGomokuStone(board: readonly GomokuCell[], index: number, player: GomokuPlayer): GomokuMove | null {
  if (board.length !== GOMOKU_CELL_COUNT || !Number.isInteger(index) || index < 0 || index >= board.length || board[index] !== null) return null;
  const nextBoard = [...board];
  nextBoard[index] = player;
  return {
    board: nextBoard,
    nextPlayer: player === 1 ? 2 : 1,
    result: getGomokuResult(nextBoard, index),
  };
}
