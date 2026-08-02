export type MazeDifficulty = "easy" | "medium" | "hard";
export const MAZE_SIZES = { easy: 11, medium: 15, hard: 21 } as const;
function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
export function generateSeededMaze(size: number, seed: number) {
  const m = Array.from({ length: size }, () => Array(size).fill(1));
  const cells: [number, number][] = [[0, 0]];
  m[0][0] = 0;
  const random = rng(seed);
  while (cells.length) {
    const [r, c] = cells[cells.length - 1],
      n: [number, number][] = [];
    for (const [dr, dc] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && m[nr][nc] === 1)
        n.push([nr, nc]);
    }
    if (!n.length) {
      cells.pop();
      continue;
    }
    const [nr, nc] = n[Math.floor(random() * n.length)];
    m[r + (nr - r) / 2][c + (nc - c) / 2] = 0;
    m[nr][nc] = 0;
    cells.push([nr, nc]);
  }
  m[size - 1][size - 1] = 0;
  if (m[size - 2][size - 1] && m[size - 1][size - 2]) m[size - 2][size - 1] = 0;
  return m;
}
export function moveMaze(
  maze: number[][],
  pos: [number, number],
  dr: number,
  dc: number,
) {
  const r = pos[0] + dr,
    c = pos[1] + dc;
  return r >= 0 &&
    c >= 0 &&
    r < maze.length &&
    c < maze.length &&
    maze[r][c] === 0
    ? ([r, c] as [number, number])
    : pos;
}
export function serializeMaze(
  seed: number,
  difficulty: MazeDifficulty,
  pos: [number, number],
  seconds: number,
) {
  return JSON.stringify({
    v: 1,
    seed,
    difficulty,
    pos,
    seconds,
    savedAt: Date.now(),
  });
}
export function parseMaze(raw: string | null, now = Date.now()) {
  try {
    const x = JSON.parse(raw ?? "");
    if (
      x?.v !== 1 ||
      !Number.isInteger(x.seed) ||
      !["easy", "medium", "hard"].includes(x.difficulty) ||
      !Array.isArray(x.pos) ||
      x.pos.length !== 2 ||
      x.pos.some((n: unknown) => !Number.isInteger(n)) ||
      !Number.isInteger(x.seconds) ||
      x.seconds < 0 ||
      !Number.isFinite(x.savedAt) ||
      x.savedAt > now + 60000 ||
      now - x.savedAt > 24 * 3600000
    )
      return null;
    const size = MAZE_SIZES[x.difficulty as MazeDifficulty],
      maze = generateSeededMaze(size, x.seed);
    if (
      x.pos.some((n: number) => n < 0 || n >= size) ||
      maze[x.pos[0]][x.pos[1]] !== 0 ||
      (x.pos[0] === size - 1 && x.pos[1] === size - 1)
    )
      return null;
    return {
      seed: x.seed >>> 0,
      difficulty: x.difficulty as MazeDifficulty,
      pos: x.pos as [number, number],
      seconds: x.seconds,
      maze,
    };
  } catch {
    return null;
  }
}
