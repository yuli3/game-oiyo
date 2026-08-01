import {
  LOWER_CATEGORIES,
  refreshYahtzeePossibleScores,
  UPPER_CATEGORIES,
  type CategoryScore,
  type DiceValue,
  type GameState,
  type LowerCategory,
  type UpperCategory,
} from "./yahtzee";

export const YAHTZEE_SAVE_KEY = "oiyo:yahtzee-state:v1";

export interface YahtzeeSaveV1 {
  version: 1;
  state: GameState;
  rngState: number;
  seconds: number;
  savedAtEpochMs: number;
}

type YahtzeeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const UPPER_MAX: Record<UpperCategory, number> = { aces: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30 };
const LOWER_MAX: Record<LowerCategory, number> = { threeOfAKind: 30, fourOfAKind: 30, fullHouse: 25, smallStraight: 30, largeStraight: 40, yahtzee: 50, chance: 30 };

function parseCell(value: unknown, maximum: number): CategoryScore | null {
  if (!isRecord(value) || typeof value.used !== "boolean") return null;
  if (value.used) {
    if (!Number.isInteger(value.score) || (value.score as number) < 0 || (value.score as number) > maximum) return null;
    return { score: value.score as number, used: true };
  }
  if (value.score !== null) return null;
  return { score: null, used: false };
}

export function parseYahtzeeSave(raw: string | null, nowEpochMs = Date.now()): YahtzeeSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.state)) return null;
    if (!Number.isInteger(value.rngState) || (value.rngState as number) < 0 || (value.rngState as number) > 0xffff_ffff) return null;
    if (!Number.isInteger(value.seconds) || (value.seconds as number) < 0 || (value.seconds as number) > 604_800) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;
    const candidate = value.state;
    if (candidate.isGameOver !== false || !Number.isInteger(candidate.round) || (candidate.round as number) < 1 || (candidate.round as number) > 13) return null;
    if (!Number.isInteger(candidate.rollsLeft) || (candidate.rollsLeft as number) < 0 || (candidate.rollsLeft as number) > 3) return null;
    if (!Array.isArray(candidate.diceValues) || candidate.diceValues.length !== 5 || candidate.diceValues.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) return null;
    if (!Array.isArray(candidate.heldDice) || candidate.heldDice.length !== 5 || candidate.heldDice.some((held) => typeof held !== "boolean")) return null;
    if (candidate.rollsLeft === 3 && candidate.heldDice.some(Boolean)) return null;
    if (!isRecord(candidate.scorecard) || !isRecord(candidate.scorecard.upper) || !isRecord(candidate.scorecard.lower)) return null;

    const upper = {} as GameState["scorecard"]["upper"];
    const lower = {} as GameState["scorecard"]["lower"];
    for (const category of UPPER_CATEGORIES) {
      const cell = parseCell(candidate.scorecard.upper[category], UPPER_MAX[category]);
      if (!cell) return null;
      upper[category] = cell;
    }
    for (const category of LOWER_CATEGORIES) {
      const cell = parseCell(candidate.scorecard.lower[category], LOWER_MAX[category]);
      if (!cell) return null;
      lower[category] = cell;
    }
    if (Object.keys(candidate.scorecard.upper).length !== UPPER_CATEGORIES.length || Object.keys(candidate.scorecard.lower).length !== LOWER_CATEGORIES.length) return null;
    const used = [...UPPER_CATEGORIES.map((category) => upper[category]), ...LOWER_CATEGORIES.map((category) => lower[category])].filter((cell) => cell.used).length;
    if (candidate.round !== used + 1) return null;
    const upperSum = UPPER_CATEGORIES.reduce((sum, category) => sum + (upper[category].score ?? 0), 0);
    const upperBonus = upperSum >= 63 ? 35 : 0;
    if (candidate.scorecard.upperBonus !== upperBonus) return null;
    const rawYahtzeeBonusCount = candidate.scorecard.yahtzeeBonusCount;
    if (!Number.isInteger(rawYahtzeeBonusCount)) return null;
    const yahtzeeBonusCount = rawYahtzeeBonusCount as number;
    if (yahtzeeBonusCount < 0 || yahtzeeBonusCount > used) return null;
    if (yahtzeeBonusCount > 0 && lower.yahtzee.score !== 50) return null;
    const lowerSum = LOWER_CATEGORIES.reduce((sum, category) => sum + (lower[category].score ?? 0), 0);
    const totalScore = upperSum + upperBonus + lowerSum + yahtzeeBonusCount * 100;
    if (candidate.scorecard.totalScore !== totalScore) return null;

    let state: GameState = {
      diceValues: [...candidate.diceValues] as DiceValue[],
      heldDice: [...candidate.heldDice],
      rollsLeft: candidate.rollsLeft as number,
      round: candidate.round as number,
      isGameOver: false,
      scorecard: { upper, lower, upperBonus, yahtzeeBonusCount, totalScore },
    };
    if (state.rollsLeft < 3) state = refreshYahtzeePossibleScores(state);
    return { version: 1, state, rngState: value.rngState as number, seconds: value.seconds as number, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch {
    return null;
  }
}

export function restoredYahtzeeSeconds(save: YahtzeeSaveV1, nowEpochMs = Date.now()): number {
  return save.seconds + Math.max(0, Math.floor((nowEpochMs - save.savedAtEpochMs) / 1000));
}

export function loadYahtzeeSave(nowEpochMs = Date.now(), storage: YahtzeeStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): YahtzeeSaveV1 | null {
  if (!storage) return null;
  try { return parseYahtzeeSave(storage.getItem(YAHTZEE_SAVE_KEY), nowEpochMs); } catch { return null; }
}

export function storeYahtzeeSave(save: Omit<YahtzeeSaveV1, "version">, storage: YahtzeeStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(YAHTZEE_SAVE_KEY, JSON.stringify({ version: 1, ...save })); } catch { /* best-effort active game */ }
}

export function clearYahtzeeSave(storage: YahtzeeStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(YAHTZEE_SAVE_KEY); } catch { /* best-effort active game */ }
}
