/**
 * Authoritative Connect Four rules for the multiplayer room PoC.
 * Deliberately separate from src/lib/games/ai/connectfour.ts (the single-player
 * vs-AI move picker) and the ConnectFour.tsx component — this file is the only
 * thing the Durable Object trusts, so it stays a small, self-contained, pure
 * function with no dependency on either.
 */
export type ConnectFourCell = 0 | 1 | 2;
export type ConnectFourBoard = ConnectFourCell[][];

export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLS = 7;

export type ConnectFourState = {
  board: ConnectFourBoard;
  turn: ConnectFourCell; // 1 | 2, whose turn it is
  winner: ConnectFourCell | 0 | "draw" | null; // null = in progress
  seatMark: Record<string, ConnectFourCell>; // seatId -> 1 | 2, assigned on first two joins
};

export function createConnectFourState(): ConnectFourState {
  return {
    board: Array.from({ length: CONNECT_FOUR_ROWS }, () => Array(CONNECT_FOUR_COLS).fill(0) as ConnectFourCell[]),
    turn: 1,
    winner: null,
    seatMark: {},
  };
}

function dropRow(board: ConnectFourBoard, col: number): number {
  for (let r = CONNECT_FOUR_ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
  return -1;
}

function wins(board: ConnectFourBoard, row: number, col: number, mark: ConnectFourCell): boolean {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
    let n = 1;
    for (const s of [1, -1] as const) {
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i * s;
        const c = col + dc * i * s;
        if (r < 0 || r >= CONNECT_FOUR_ROWS || c < 0 || c >= CONNECT_FOUR_COLS || board[r][c] !== mark) break;
        n++;
      }
    }
    if (n >= 4) return true;
  }
  return false;
}

function isFull(board: ConnectFourBoard): boolean {
  return board[0].every((cell) => cell !== 0);
}

/**
 * Room-authority `applyAction` for `createLocalRoomEmulator`. Assigns marks to
 * the first two seats to move (in join order), rejects moves from a seat that
 * hasn't been assigned a mark yet, out-of-turn moves, out-of-range/full columns,
 * and any move once the game has a winner or is drawn.
 */
/**
 * Marks are tied to the seat's join order, not move order: `createLocalRoomEmulator`
 * assigns seat ids `seat-1`, `seat-2`, ... in the order rooms are joined, so a
 * seat's mark is fully determined by its id — a slower-joining seat can't
 * grab mark 1 just by racing to move first.
 */
function markForSeat(seatId: string): ConnectFourCell | null {
  const match = /^seat-([1-9]\d*)$/.exec(seatId);
  if (!match) return null;
  const seatNumber = Number(match[1]);
  if (seatNumber === 1) return 1;
  if (seatNumber === 2) return 2;
  return null; // third+ seat in the room is a spectator, not a player
}

export function applyConnectFourAction(
  state: ConnectFourState,
  action: Record<string, unknown>,
  seatId: string,
): ConnectFourState | null {
  if (state.winner !== null) return null;

  let mark = state.seatMark[seatId];
  const seatMark = { ...state.seatMark };
  if (mark === undefined) {
    const derived = markForSeat(seatId);
    if (derived === null) return null; // spectator seat — no mark, no moves
    mark = derived;
    seatMark[seatId] = mark;
  }
  if (mark !== state.turn) return null;

  const col = action.col;
  if (typeof col !== "number" || !Number.isInteger(col) || col < 0 || col >= CONNECT_FOUR_COLS) return null;
  const board = state.board.map((row) => [...row]);
  const row = dropRow(board, col);
  if (row === -1) return null;
  board[row][col] = mark;

  const won = wins(board, row, col, mark);
  const draw = !won && isFull(board);
  return {
    board,
    turn: mark === 1 ? 2 : 1,
    winner: won ? mark : draw ? "draw" : null,
    seatMark,
  };
}
