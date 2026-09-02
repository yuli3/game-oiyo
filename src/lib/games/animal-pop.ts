export const ANIMAL_SIZE = 7,
  ANIMAL_TYPES = ["🐵", "🐱", "🐷", "🐭", "🐰", "🐶", "🐤"] as const;
/** Round length and remaining-time cap (seconds). Matches save-game validation. */
export const ANIMAL_TIME_LIMIT = 60;
/** Successful 3-match. */
export const ANIMAL_TIME_BONUS_MATCH = 1;
/** Extra second when 4+ tiles clear in one swap (including cascades). */
export const ANIMAL_TIME_BONUS_LONG = 1;
/** Extra second when a cascade continues (waves >= 2). */
export const ANIMAL_TIME_BONUS_COMBO = 1;
export function animalMatchTimeBonus(cleared: number, waves: number) {
  if (cleared < 3 || waves < 1) return 0;
  return (
    ANIMAL_TIME_BONUS_MATCH +
    (cleared >= 4 ? ANIMAL_TIME_BONUS_LONG : 0) +
    (waves >= 2 ? ANIMAL_TIME_BONUS_COMBO : 0)
  );
}
export function addAnimalTime(timeLeft: number, bonus: number) {
  return Math.min(ANIMAL_TIME_LIMIT, Math.max(0, timeLeft + bonus));
}
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
export type AnimalFall = { animal:string; fromRow:number; toRow:number; column:number; spawned:boolean };
export type AnimalCascadeStep = { before:AnimalBoard; matched:number[]; collapsed:AnimalBoard; falls:AnimalFall[]; seed:number };
function collapseWithMotion(board: AnimalBoard, m: boolean[][], seed: number) {
  const out = Array.from({ length: 7 }, () => Array<string>(7).fill(""));
  const falls:AnimalFall[]=[];
  let rng = seed;
  for (let c = 0; c < 7; c++) {
    const keep:{animal:string;row:number}[]=[];
    for (let r = 6; r >= 0; r--) if (!m[r][c]) keep.push({animal:board[r][c],row:r});
    let spawnIndex=0;
    for (let r = 6, i = 0; r >= 0; r--, i++) {
      if (i < keep.length) {out[r][c]=keep[i].animal;if(keep[i].row!==r)falls.push({animal:keep[i].animal,fromRow:keep[i].row,toRow:r,column:c,spawned:false});}
      else {
        const n = next(rng); rng = n[0]; const animal=ANIMAL_TYPES[Math.floor(n[1] * ANIMAL_TYPES.length)];
        out[r][c] = animal; falls.push({animal,fromRow:-1-spawnIndex++,toRow:r,column:c,spawned:true});
      }
    }
  }
  return { board: out, seed: rng, falls };
}
function collapse(board: AnimalBoard, m: boolean[][], seed: number) {
  const {board:nextBoard,seed:nextSeed}=collapseWithMotion(board,m,seed);return{board:nextBoard,seed:nextSeed};
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
    return { valid: false, board, seed, cleared: 0, waves: 0, steps: [] as AnimalCascadeStep[] };
  let current = board.map((r) => [...r]);
  [
    current[Math.floor(from / 7)][from % 7],
    current[Math.floor(to / 7)][to % 7],
  ] = [
    current[Math.floor(to / 7)][to % 7],
    current[Math.floor(from / 7)][from % 7],
  ];
  if (!any(findAnimalMatches(current)))
    return { valid: false, board, seed, cleared: 0, waves: 0, steps: [] as AnimalCascadeStep[] };
  let cleared = 0,
    waves = 0,
    rng = seed;
  const steps:AnimalCascadeStep[]=[];
  while (waves < 20) {
    const m = findAnimalMatches(current);
    if (!any(m)) break;
    waves++;
    const matched=m.flatMap((row,r)=>row.flatMap((value,c)=>value?[r*7+c]:[]));
    cleared += matched.length;
    const before=current.map(row=>[...row]);
    const x = collapseWithMotion(current, m, rng);
    steps.push({before,matched,collapsed:x.board.map(row=>[...row]),falls:x.falls,seed:x.seed});
    current = x.board;
    rng = x.seed;
  }
  return { valid: true, board: current, seed: rng, cleared, waves, steps };
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
      x.timeLeft > ANIMAL_TIME_LIMIT ||
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
