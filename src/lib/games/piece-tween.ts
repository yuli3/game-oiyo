/** Cell-to-cell lerp for DOM boards. Engine state stays on the destination square. */

export const PIECE_TWEEN_MS = 220;
export const DISC_FLIP_MS = 280;

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export function tweenProgress(startedAt: number, durationMs: number, now: number, reducedMotion = false): number {
  if (reducedMotion || durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - startedAt) / durationMs));
}

/** Translate in cell units for a piece already painted on the destination cell. */
export function tweenFromDelta(
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  t: number,
): { dxCells: number; dyCells: number } {
  const remain = 1 - easeOutCubic(t);
  return {
    dxCells: (fromCol - toCol) * remain,
    dyCells: (fromRow - toRow) * remain,
  };
}

export function indexToRowCol(index: number, cols: number): { row: number; col: number } {
  return { row: Math.floor(index / cols), col: ((index % cols) + cols) % cols };
}

/** King moved two files: the rook that also slides in that castle. */
export function castleRookDelta(
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): { fromRow: number; fromCol: number; toRow: number; toCol: number } | null {
  if (fromRow !== toRow || Math.abs(toCol - fromCol) !== 2) return null;
  const kingside = toCol > fromCol;
  return {
    fromRow,
    fromCol: kingside ? 7 : 0,
    toRow,
    toCol: kingside ? 5 : 3,
  };
}

export function visualSquare(
  row: number,
  col: number,
  flipped: boolean,
  size = 8,
): { row: number; col: number } {
  if (!flipped) return { row, col };
  return { row: size - 1 - row, col: size - 1 - col };
}
