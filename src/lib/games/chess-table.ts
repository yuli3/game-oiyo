import {
  chessApplyState,
  chessBestStateMove,
  chessDrawReason,
  chessInCheck,
  chessLegalStateMoves,
  chessPositionKey,
  createInitialChessState,
  isWhitePiece,
  type ChessMove,
  type ChessState,
} from "./ai/chess";

/** The table uses the in-repo TypeScript rules engine. Unity and Playground are not this runtime. */
export const CHESS_TABLE_ENGINE = "src/lib/games/ai/chess.ts" as const;
export const CHESS_TABLE_SECONDS = 600;
export const CHESS_TABLE_REJECTED_RUNTIMES = ["unity-webgl", "google-playground"] as const;

export type ChessTableEnd = "checkmate" | "stalemate" | "resign" | "time" | "draw";

export type ChessTableState = {
  position: ChessState;
  selected: [number, number] | null;
  whiteSeconds: number;
  blackSeconds: number;
  history: string[];
  end: ChessTableEnd | null;
  winner: "white" | "black" | null;
};

export function createChessTable(): ChessTableState {
  const position = createInitialChessState();
  return {
    position,
    selected: null,
    whiteSeconds: CHESS_TABLE_SECONDS,
    blackSeconds: CHESS_TABLE_SECONDS,
    history: [chessPositionKey(position)],
    end: null,
    winner: null,
  };
}

function finish(table: ChessTableState, end: ChessTableEnd, winner: "white" | "black" | null): ChessTableState {
  return { ...table, selected: null, end, winner };
}

export function chessTableOutcome(table: ChessTableState): ChessTableState {
  if (table.end) return table;
  const draw = chessDrawReason(table.position, table.history);
  if (draw) return finish(table, "draw", null);
  const legal = chessLegalStateMoves(table.position);
  if (legal.length > 0) return table;
  const white = table.position.whiteToMove;
  const mate = chessInCheck(table.position.board, white);
  return finish(table, mate ? "checkmate" : "stalemate", mate ? (white ? "black" : "white") : null);
}

export function chessTablePick(table: ChessTableState, square: [number, number]): ChessTableState {
  if (table.end || !table.position.whiteToMove) return table;
  const [row, column] = square;
  if (table.selected) {
    const legal = chessLegalStateMoves(table.position).filter((move) =>
      move.from[0] === table.selected?.[0] && move.from[1] === table.selected?.[1]
      && move.to[0] === row && move.to[1] === column);
    if (legal.length > 0) {
      const move = legal.find((entry) => entry.promotion === "q") ?? legal[0]!;
      return chessTableApply(table, move);
    }
  }
  const piece = table.position.board[row]?.[column];
  if (piece && isWhitePiece(piece)) return { ...table, selected: square };
  return { ...table, selected: null };
}

export function chessTableApply(table: ChessTableState, move: ChessMove): ChessTableState {
  if (table.end) return table;
  const position = chessApplyState(table.position, move);
  const next = chessTableOutcome({
    ...table,
    position,
    selected: null,
    history: [...table.history, chessPositionKey(position)],
  });
  return next;
}

export function chessTableAiReply(table: ChessTableState): ChessTableState {
  if (table.end || table.position.whiteToMove) return table;
  const move = chessBestStateMove(table.position, 1);
  return move ? chessTableApply(table, move) : chessTableOutcome(table);
}

export function chessTableClock(table: ChessTableState, elapsedSeconds: number): ChessTableState {
  if (table.end || elapsedSeconds <= 0) return table;
  const white = table.position.whiteToMove;
  const whiteSeconds = white ? Math.max(0, table.whiteSeconds - elapsedSeconds) : table.whiteSeconds;
  const blackSeconds = white ? table.blackSeconds : Math.max(0, table.blackSeconds - elapsedSeconds);
  const next = { ...table, whiteSeconds, blackSeconds };
  if ((white && whiteSeconds === 0) || (!white && blackSeconds === 0)) return finish(next, "time", white ? "black" : "white");
  return next;
}

export function chessTableResign(table: ChessTableState): ChessTableState {
  if (table.end) return table;
  return finish(table, "resign", "black");
}
