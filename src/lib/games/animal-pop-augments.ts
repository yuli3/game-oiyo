import {
  parseAugmentOffer,
  parseAugmentOwned,
  rollAugmentOffer,
  takeAugment,
  type AugmentDef,
  type AugmentOwned,
} from "./augment";
import {
  ANIMAL_NO_MODS,
  ANIMAL_TIME_LIMIT,
  addAnimalTime,
  animalMatchTimeBonus,
  parseAnimal,
  serializeAnimal,
  type AnimalBoard,
  type AnimalMods,
} from "./animal-pop";

/**
 * Augment mode for Animal Pop: one card before the clock starts and one more
 * at each score mark, picked from three while the clock is stopped. A separate
 * save and a separate best keep the classic 60-second record meaning what it
 * always meant. 2026-10-06
 */
export const ANIMAL_AUGMENT_SAVE = "oiyo:animal-pop-augment:v1";
export const ANIMAL_AUGMENT_BEST = "oiyo:animal-pop-augment-best:v1";

export const ANIMAL_AUGMENTS = [
  { id: "score", tier: "silver", max: 3 },
  { id: "clock", tier: "silver", max: 3 },
  { id: "long", tier: "silver", max: 3 },
  { id: "lineBlast", tier: "gold", max: 1 },
  { id: "fewer", tier: "gold", max: 1 },
  { id: "chainTime", tier: "gold", max: 1 },
  { id: "freeSwap", tier: "gold", max: 1 },
  { id: "stampede", tier: "prismatic", max: 1 },
  { id: "double", tier: "prismatic", max: 1 },
  { id: "wild", tier: "prismatic", max: 1 },
  { id: "second", tier: "prismatic", max: 1 },
] as const satisfies readonly AugmentDef[];

export type AnimalAugmentId = (typeof ANIMAL_AUGMENTS)[number]["id"];
export type AnimalOwned = AugmentOwned<AnimalAugmentId>;

/** Score marks that owe a pick. The first one is the card before the round starts. */
const PICK_MARKS = [0, 300, 800, 1500, 2500, 4000, 6000, 8500, 11500, 15000];
const PICK_STEP_AFTER = 4000;
export const ANIMAL_CLOCK_SECONDS = 10;
export const ANIMAL_SECOND_SECONDS = 20;
export const ANIMAL_CHAIN_TIME = 2;

export interface AnimalRun {
  owned: AnimalOwned;
  rng: number;
  picks: number;
  offer: AnimalAugmentId[] | null;
  secondUsed: boolean;
}

export function animalPicksOwed(score: number): number {
  let owed = 0;
  for (const mark of PICK_MARKS) if (score >= mark) owed += 1;
  const last = PICK_MARKS[PICK_MARKS.length - 1];
  if (score >= last + PICK_STEP_AFTER) owed += Math.floor((score - last) / PICK_STEP_AFTER);
  return owed;
}

export function animalMods(owned: AnimalOwned): AnimalMods {
  return {
    ...ANIMAL_NO_MODS,
    types: owned.fewer ? ANIMAL_NO_MODS.types - 1 : ANIMAL_NO_MODS.types,
    lineBlast: Boolean(owned.lineBlast),
    stampede: Boolean(owned.stampede),
    freeSwap: Boolean(owned.freeSwap),
  };
}

export function offerAnimalAugments(run: AnimalRun, score: number): AnimalRun {
  const owed = animalPicksOwed(score);
  if (run.offer || run.picks >= owed) return run;
  const rolled = rollAugmentOffer(ANIMAL_AUGMENTS, run.owned, run.rng);
  // Nothing left to offer: the pick is spent so the round never stalls on an empty draft.
  if (rolled.offer.length === 0) return { ...run, rng: rolled.rng, picks: owed };
  return { ...run, rng: rolled.rng, offer: rolled.offer };
}

export function createAnimalRun(seed: number): AnimalRun {
  return offerAnimalAugments({ owned: {}, rng: (seed ^ 0x61756721) >>> 0, picks: 0, offer: null, secondUsed: false }, 0);
}

/** Taking a card. Two cards act on the clock the moment they are taken. */
export function pickAnimalAugment(run: AnimalRun, id: AnimalAugmentId, timeLeft: number): { run: AnimalRun; timeLeft: number } {
  if (!run.offer || !run.offer.includes(id)) return { run, timeLeft };
  let next = timeLeft;
  if (id === "clock") next = addAnimalTime(timeLeft, ANIMAL_CLOCK_SECONDS);
  if (id === "double") next = Math.max(1, Math.ceil(timeLeft / 2));
  return { run: { ...run, owned: takeAugment(ANIMAL_AUGMENTS, run.owned, id), picks: run.picks + 1, offer: null }, timeLeft: next };
}

export function scoreAnimalAugmented(cleared: number, waves: number, feverSeconds: number, owned: AnimalOwned) {
  const wild = Boolean(owned.wild);
  const nextFeverSeconds = waves >= (wild ? 3 : 5) ? 10 : feverSeconds;
  const fever = nextFeverSeconds > 0 ? (wild ? 3 : 2) : 1;
  const mult = (1 + 0.25 * (owned.score ?? 0)) * (owned.double ? 2 : 1) * (cleared >= 4 ? 1 + 0.5 * (owned.long ?? 0) : 1);
  return { points: Math.round(cleared * 10 * waves * fever * mult), feverSeconds: nextFeverSeconds };
}

export function animalAugmentedTimeBonus(cleared: number, waves: number, owned: AnimalOwned) {
  return animalMatchTimeBonus(cleared, waves) + (owned.chainTime && waves >= 2 ? ANIMAL_CHAIN_TIME : 0);
}

/** The clock ran out. With the second-chance card unused, the round goes on. */
export function animalTimeUp(run: AnimalRun): { run: AnimalRun; timeLeft: number } {
  if (!run.owned.second || run.secondUsed) return { run, timeLeft: 0 };
  return { run: { ...run, secondUsed: true }, timeLeft: Math.min(ANIMAL_TIME_LIMIT, ANIMAL_SECOND_SECONDS) };
}

export function serializeAnimalRun(seed: number, board: AnimalBoard, score: number, timeLeft: number, feverSeconds: number, run: AnimalRun) {
  return JSON.stringify({
    v: 1,
    base: serializeAnimal(seed, board, score, timeLeft, feverSeconds),
    owned: run.owned,
    rng: run.rng,
    picks: run.picks,
    offer: run.offer,
    secondUsed: run.secondUsed,
  });
}

export function parseAnimalRun(raw: string | null, now = Date.now()) {
  try {
    const data: unknown = JSON.parse(raw ?? "");
    if (!data || typeof data !== "object") return null;
    const saved = data as Record<string, unknown>;
    if (saved.v !== 1 || typeof saved.base !== "string") return null;
    const base = parseAnimal(saved.base, now);
    if (!base) return null;
    const count = (value: unknown, cap: number) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? Math.min(cap, value) : null);
    const rng = count(saved.rng, 0xffff_ffff);
    const picks = count(saved.picks, 10_000);
    if (rng === null || picks === null) return null;
    const owned = parseAugmentOwned(ANIMAL_AUGMENTS, saved.owned);
    const run: AnimalRun = { owned, rng, picks, offer: parseAugmentOffer(ANIMAL_AUGMENTS, owned, saved.offer), secondUsed: saved.secondUsed === true };
    return { ...base, run };
  } catch {
    return null;
  }
}

export function readAnimalAugmentBest(): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(ANIMAL_AUGMENT_BEST) ?? "0");
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function writeAnimalAugmentBest(score: number): number {
  const best = Math.max(readAnimalAugmentBest(), Math.floor(score));
  try { localStorage.setItem(ANIMAL_AUGMENT_BEST, JSON.stringify(best)); } catch { /* storage is best-effort */ }
  return best;
}
