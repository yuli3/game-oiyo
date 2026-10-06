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
// 2026-09-27: the six-locale guide promises ten seconds of double score after
// five cascade waves; keep that scoring rule independent of animation timing.
export function scoreAnimalMatch(cleared: number, waves: number, feverSeconds: number) {
  const nextFeverSeconds = waves >= 5 ? 10 : feverSeconds;
  return {
    points: cleared * 10 * waves * (nextFeverSeconds > 0 ? 2 : 1),
    feverSeconds: nextFeverSeconds,
  };
}
export function tickAnimalFever(feverSeconds: number) {
  return Math.max(0, feverSeconds - 1);
}
export type AnimalBoard = string[][];
/**
 * Rule changes the augment mode switches on. The classic round always runs on
 * ANIMAL_NO_MODS, so its scores stay comparable with earlier records. 2026-10-06
 */
export interface AnimalMods {
  /** How many animal kinds can drop in. Fewer kinds means more cascades. */
  types: number;
  /** A straight run of four or more clears its whole row or column. */
  lineBlast: boolean;
  /** A straight run of five or more clears every animal of that kind. */
  stampede: boolean;
  /** A swap that matches nothing still goes through. */
  freeSwap: boolean;
}
export const ANIMAL_NO_MODS: AnimalMods = { types: ANIMAL_TYPES.length, lineBlast: false, stampede: false, freeSwap: false };
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
/** Matches plus whatever an active rule adds to them. Never marks anything when there is no match. */
export function findAnimalClears(board: AnimalBoard, mods: AnimalMods = ANIMAL_NO_MODS) {
  const m = findAnimalMatches(board);
  if (!mods.lineBlast && !mods.stampede) return m;
  const rows: number[] = [], cols: number[] = [], kinds = new Set<string>();
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++) {
      if (c === 0 || board[r][c - 1] !== board[r][c]) {
        let n = 1;
        while (c + n < 7 && board[r][c + n] === board[r][c]) n++;
        if (n >= 4) rows.push(r);
        if (n >= 5) kinds.add(board[r][c]);
      }
      if (r === 0 || board[r - 1][c] !== board[r][c]) {
        let n = 1;
        while (r + n < 7 && board[r + n][c] === board[r][c]) n++;
        if (n >= 4) cols.push(c);
        if (n >= 5) kinds.add(board[r][c]);
      }
    }
  if (mods.lineBlast) {
    for (const r of rows) for (let c = 0; c < 7; c++) m[r][c] = true;
    for (const c of cols) for (let r = 0; r < 7; r++) m[r][c] = true;
  }
  if (mods.stampede && kinds.size > 0)
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (kinds.has(board[r][c])) m[r][c] = true;
  return m;
}
export type AnimalFall = { animal:string; fromRow:number; toRow:number; column:number; spawned:boolean };
export type AnimalCascadeStep = { before:AnimalBoard; matched:number[]; collapsed:AnimalBoard; falls:AnimalFall[]; seed:number };
function collapseWithMotion(board: AnimalBoard, m: boolean[][], seed: number, types: number = ANIMAL_TYPES.length) {
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
        const n = next(rng); rng = n[0]; const animal=ANIMAL_TYPES[Math.floor(n[1] * types)];
        out[r][c] = animal; falls.push({animal,fromRow:-1-spawnIndex++,toRow:r,column:c,spawned:true});
      }
    }
  }
  return { board: out, seed: rng, falls };
}
function collapse(board: AnimalBoard, m: boolean[][], seed: number) {
  const {board:nextBoard,seed:nextSeed}=collapseWithMotion(board,m,seed);return{board:nextBoard,seed:nextSeed};
}
/** Whether any swap of two neighbours would make a match. */
export function hasAnimalMove(board: AnimalBoard) {
  for (let i = 0; i < 49; i++) {
    for (const j of [i + 1, i + 7]) {
      if (j >= 49 || (j === i + 1 && i % 7 === 6)) continue;
      const trial = board.map((row) => [...row]);
      const a = trial[Math.floor(i / 7)][i % 7];
      trial[Math.floor(i / 7)][i % 7] = trial[Math.floor(j / 7)][j % 7];
      trial[Math.floor(j / 7)][j % 7] = a;
      if (any(findAnimalMatches(trial))) return true;
    }
  }
  return false;
}
/**
 * A board with no possible match used to leave the player waiting for the clock
 * (seen in play on 2026-10-06). The same animals are dealt again from the seed
 * until the board has a move and no ready-made match, so the result is still
 * reproducible from the save. Returns the board untouched when it has a move.
 */
export function reshuffleAnimalBoard(board: AnimalBoard, seed: number) {
  if (hasAnimalMove(board)) return { board, seed, reshuffled: false };
  let rng = seed >>> 0;
  const tiles = board.flat();
  for (let attempt = 0; attempt < 60; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const n = next(rng);
      rng = n[0];
      const j = Math.floor(n[1] * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    const dealt = Array.from({ length: 7 }, (_, r) => tiles.slice(r * 7, r * 7 + 7));
    if (!any(findAnimalMatches(dealt)) && hasAnimalMove(dealt)) return { board: dealt, seed: rng, reshuffled: true };
  }
  // The tiles on hand cannot make a playable board (far too few of each kind): deal a fresh one.
  let fresh = createAnimalBoard(rng || 1);
  for (let attempt = 0; attempt < 20 && !hasAnimalMove(fresh.board); attempt++) fresh = createAnimalBoard(fresh.seed + 1);
  return { board: fresh.board, seed: fresh.seed, reshuffled: true };
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
  mods: AnimalMods = ANIMAL_NO_MODS,
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
    return { valid: false, board, seed, cleared: 0, waves: 0, steps: [] as AnimalCascadeStep[], reshuffled: false };
  let current = board.map((r) => [...r]);
  [
    current[Math.floor(from / 7)][from % 7],
    current[Math.floor(to / 7)][to % 7],
  ] = [
    current[Math.floor(to / 7)][to % 7],
    current[Math.floor(from / 7)][from % 7],
  ];
  if (!any(findAnimalMatches(current)))
    return mods.freeSwap
      ? { valid: true, board: current, seed, cleared: 0, waves: 0, steps: [] as AnimalCascadeStep[], reshuffled: false }
      : { valid: false, board, seed, cleared: 0, waves: 0, steps: [] as AnimalCascadeStep[], reshuffled: false };
  const types = Math.min(ANIMAL_TYPES.length, Math.max(3, Math.floor(mods.types)));
  let cleared = 0,
    waves = 0,
    rng = seed;
  const steps:AnimalCascadeStep[]=[];
  while (waves < 20) {
    const m = findAnimalClears(current, mods);
    if (!any(m)) break;
    waves++;
    const matched=m.flatMap((row,r)=>row.flatMap((value,c)=>value?[r*7+c]:[]));
    cleared += matched.length;
    const before=current.map(row=>[...row]);
    const x = collapseWithMotion(current, m, rng, types);
    steps.push({before,matched,collapsed:x.board.map(row=>[...row]),falls:x.falls,seed:x.seed});
    current = x.board;
    rng = x.seed;
  }
  // With free swaps a board without a match is still playable, so it is left alone.
  if (mods.freeSwap) return { valid: true, board: current, seed: rng, cleared, waves, steps, reshuffled: false };
  const dealt = reshuffleAnimalBoard(current, rng);
  return { valid: true, board: dealt.board, seed: dealt.seed, cleared, waves, steps, reshuffled: dealt.reshuffled };
}
export function serializeAnimal(
  seed: number,
  board: AnimalBoard,
  score: number,
  timeLeft: number,
  feverSeconds = 0,
) {
  return JSON.stringify({
    v: 1,
    seed,
    board,
    score,
    timeLeft,
    feverSeconds,
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
      (x.feverSeconds !== undefined &&
        (!Number.isInteger(x.feverSeconds) || x.feverSeconds < 0 || x.feverSeconds > 10)) ||
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
      // 2026-09-27: pre-Fever v1 saves lack this additive field; keep their
      // board/score and resume without Fever rather than rejecting the round.
      feverSeconds: x.feverSeconds ?? 0,
    };
  } catch {
    return null;
  }
}
