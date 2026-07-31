export const MINESWEEPER_ONBOARDING_KEY = "oiyo:minesweeper-onboarding:v1";

export interface MinesweeperOnboarding {
  version: 1;
  revealed: boolean;
  flagged: boolean;
  chorded: boolean;
}

export type MinesweeperOnboardingMilestone = "revealed" | "flagged" | "chorded";
export type MinesweeperOnboardingStep = "reveal" | "flag" | "chord" | null;

type OnboardingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function freshMinesweeperOnboarding(): MinesweeperOnboarding {
  return { version: 1, revealed: false, flagged: false, chorded: false };
}

// Teach-by-play order: dig first, then flagging, then chord — each step is
// unlocked by actually performing the previous action, never by reading text.
export function nextMinesweeperOnboardingStep(state: MinesweeperOnboarding): MinesweeperOnboardingStep {
  if (!state.revealed) return "reveal";
  if (!state.flagged) return "flag";
  if (!state.chorded) return "chord";
  return null;
}

export function advanceMinesweeperOnboarding(
  state: MinesweeperOnboarding,
  milestone: MinesweeperOnboardingMilestone,
): MinesweeperOnboarding {
  if (state[milestone]) return state;
  return { ...state, [milestone]: true };
}

export function parseMinesweeperOnboarding(raw: string | null): MinesweeperOnboarding {
  if (!raw) return freshMinesweeperOnboarding();
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 ||
      typeof value.revealed !== "boolean" || typeof value.flagged !== "boolean" || typeof value.chorded !== "boolean") {
      return freshMinesweeperOnboarding();
    }
    return { version: 1, revealed: value.revealed, flagged: value.flagged, chorded: value.chorded };
  } catch {
    return freshMinesweeperOnboarding();
  }
}

export function serializeMinesweeperOnboarding(state: MinesweeperOnboarding): string {
  return JSON.stringify({ version: 1, revealed: state.revealed, flagged: state.flagged, chorded: state.chorded });
}

export function loadMinesweeperOnboarding(
  storage: OnboardingStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): MinesweeperOnboarding {
  if (!storage) return freshMinesweeperOnboarding();
  try { return parseMinesweeperOnboarding(storage.getItem(MINESWEEPER_ONBOARDING_KEY)); } catch { return freshMinesweeperOnboarding(); }
}

export function storeMinesweeperOnboarding(
  state: MinesweeperOnboarding,
  storage: OnboardingStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): void {
  if (!storage) return;
  try { storage.setItem(MINESWEEPER_ONBOARDING_KEY, serializeMinesweeperOnboarding(state)); } catch { /* best-effort local progress */ }
}
