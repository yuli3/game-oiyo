export const ANIMAL_SIZE = 7,
  ANIMAL_TYPES = ["🐵", "🐱", "🐷", "🐭", "🐰", "🐶", "🐤"] as const;
export type AnimalBoard = string[][];
export type AnimalSwap = { from: number; to: number };
function next(seed: number) {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return [x >>> 0, (x >>> 0) / 4294967296] as const;
}
export function findAnimalMatches(board: AnimalBoard) {
  const m = board.map((r) => r.map(() => false));
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++) {
      if (c === 0 || board[r][c - 1] !== board[r][c]) {
        let n = 1;
        while (c + n < 7 && board[r][c + n] === board[r][c]) n++;
        if (n >= 3) for (let i = 0; i < n; i++) m[r][c + i] = true;
      }
      if (r === 0 || board[r - 1][c] !== board[r][c]) {
        let n = 1;
        while (r + n < 7 && board[r + n][c] === board[r][c]) n++;
        if (n >= 3) for (let i = 0; i < n; i++) m[r + i][c] = true;
      }
    }
  return m;
}
const any = (m: boolean[][]) => m.some((r) => r.some(Boolean));
function collapse(board: AnimalBoard, m: boolean[][], seed: number) {
  const out = Array.from({ length: 7 }, () => Array<string>(7).fill(""));
  let rng = seed;
  for (let c = 0; c < 7; c++) {
    const keep = [];
    for (let r = 6; r >= 0; r--) if (!m[r][c]) keep.push(board[r][c]);
    for (let r = 6, i = 0; r >= 0; r--, i++) {
      if (i < keep.length) out[r][c] = keep[i];
      else {
        const n = next(rng);
        rng = n[0];
        out[r][c] = ANIMAL_TYPES[Math.floor(n[1] * ANIMAL_TYPES.length)];
      }
    }
  }
  return { board: out, seed: rng };
}
export function createAnimalBoard(seed: number) {
  let rng = seed >>> 0,
    board: AnimalBoard = Array.from({ length: 7 }, () =>
      Array.from({ length: 7 }, () => {
        const n = next(rng);
        rng = n[0];
        return ANIMAL_TYPES[Math.floor(n[1] * ANIMAL_TYPES.length)];
      }),
    );
  for (let i = 0; i < 30 && any(findAnimalMatches(board)); i++) {
    const x = collapse(board, findAnimalMatches(board), rng);
    board = x.board;
    rng = x.seed;
  }
  return { board, seed: rng };
}
export function swapAnimals(
  board: AnimalBoard,
  from: number,
  to: number,
  seed: number,
) {
  if (
    from < 0 ||
    to < 0 ||
    from >= 49 ||
    to >= 49 ||
    Math.abs(Math.floor(from / 7) - Math.floor(to / 7)) +
      Math.abs((from % 7) - (to % 7)) !==
      1
  )
    return { valid: false, board, seed, cleared: 0, waves: 0 };
  let current = board.map((r) => [...r]);
  [
    current[Math.floor(from / 7)][from % 7],
    current[Math.floor(to / 7)][to % 7],
  ] = [
    current[Math.floor(to / 7)][to % 7],
    current[Math.floor(from / 7)][from % 7],
  ];
  if (!any(findAnimalMatches(current)))
    return { valid: false, board, seed, cleared: 0, waves: 0 };
  let cleared = 0,
    waves = 0,
    rng = seed;
  while (waves < 20) {
    const m = findAnimalMatches(current);
    if (!any(m)) break;
    waves++;
    cleared += m.flat().filter(Boolean).length;
    const x = collapse(current, m, rng);
    current = x.board;
    rng = x.seed;
  }
  return { valid: true, board: current, seed: rng, cleared, waves };
}
export function serializeAnimal(
  seed: number,
  board: AnimalBoard,
  score: number,
  timeLeft: number,
) {
  return JSON.stringify({
    v: 1,
    seed,
    board,
    score,
    timeLeft,
    savedAt: Date.now(),
  });
}
export function parseAnimal(raw: string | null, now = Date.now()) {
  try {
    const x = JSON.parse(raw ?? "");
    if (
      x?.v !== 1 ||
      !Number.isInteger(x.seed) ||
      !Array.isArray(x.board) ||
      x.board.length !== 7 ||
      x.board.some(
        (r: unknown) =>
          !Array.isArray(r) ||
          (r as unknown[]).length !== 7 ||
          (r as unknown[]).some((v) => !ANIMAL_TYPES.includes(v as never)),
      ) ||
      !Number.isFinite(x.score) ||
      x.score < 0 ||
      !Number.isInteger(x.timeLeft) ||
      x.timeLeft <= 0 ||
      x.timeLeft > 60 ||
      !Number.isFinite(x.savedAt) ||
      now - x.savedAt > 24 * 3600000 ||
      x.savedAt > now + 60000
    )
      return null;
    return {
      seed: x.seed >>> 0,
      board: x.board as AnimalBoard,
      score: x.score,
      timeLeft: x.timeLeft,
    };
  } catch {
    return null;
  }
}
