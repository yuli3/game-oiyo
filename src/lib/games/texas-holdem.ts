import {
  compareHands,
  evaluateBest,
  makeDeck,
  shuffleDeck,
  type Card,
} from "./poker";
export type HoldemStage = "preflop" | "flop" | "turn" | "river" | "showdown";
export type HoldemAction = "advance" | "fold";
export type HoldemState = {
  seed: number;
  deck: Card[];
  stage: HoldemStage;
  folded: boolean;
  actions: HoldemAction[];
};
export function createHoldem(seed: number): HoldemState {
  return {
    seed: seed >>> 0,
    deck: shuffleDeck(makeDeck(), seed >>> 0),
    stage: "preflop",
    folded: false,
    actions: [],
  };
}
export function actHoldem(state: HoldemState, action: HoldemAction) {
  if (state.stage === "showdown") return state;
  if (action === "fold")
    return {
      ...state,
      stage: "showdown" as const,
      folded: true,
      actions: [...state.actions, action],
    };
  const stage: HoldemStage =
    state.stage === "preflop"
      ? "flop"
      : state.stage === "flop"
        ? "turn"
        : state.stage === "turn"
          ? "river"
          : "showdown";
  return { ...state, stage, actions: [...state.actions, action] };
}
export function holdemCards(state: HoldemState) {
  return {
    player: [state.deck[0], state.deck[2]],
    opponent: [state.deck[1], state.deck[3]],
    board: state.deck.slice(4, 9),
  };
}
export function holdemOutcome(state: HoldemState) {
  if (state.stage !== "showdown") return null;
  if (state.folded) return "lose" as const;
  const c = holdemCards(state),
    cmp = compareHands(
      evaluateBest([...c.player, ...c.board]),
      evaluateBest([...c.opponent, ...c.board]),
    );
  return cmp > 0 ? "win" : cmp < 0 ? "lose" : "tie";
}
export function serializeHoldem(state: HoldemState) {
  return JSON.stringify({
    v: 1,
    seed: state.seed,
    actions: state.actions,
    savedAt: Date.now(),
  });
}
export function parseHoldem(raw: string | null, now = Date.now()) {
  try {
    const x = JSON.parse(raw ?? "");
    if (
      x?.v !== 1 ||
      !Number.isInteger(x.seed) ||
      !Array.isArray(x.actions) ||
      x.actions.length > 4 ||
      x.actions.some((a: unknown) => a !== "advance" && a !== "fold") ||
      !Number.isFinite(x.savedAt) ||
      x.savedAt > now + 60000 ||
      now - x.savedAt > 24 * 3600000
    )
      return null;
    const state = x.actions.reduce(
      (s: HoldemState, a: HoldemAction) => actHoldem(s, a),
      createHoldem(x.seed),
    );
    return state.stage === "showdown" ? null : state;
  } catch {
    return null;
  }
}
