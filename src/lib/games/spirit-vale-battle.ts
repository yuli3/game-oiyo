import { SPIRITS, damageMultiplier, matchup, type Matchup, type Spirit } from "./spirit-vale";

/* ────────────────────────────────────────────────────────────────────────────
 * Spirit Vale — turn-based battles, with no renderer and no strings.
 *
 * Every function here is pure and takes its randomness as an argument, so a
 * whole battle can be replayed exactly in a test. The log is emitted as
 * structured entries rather than sentences: the six locales live in the
 * component, and putting Korean in this module would make the rules
 * untranslatable and untestable at the same time.
 *
 * The 오행 matchup does the heavy lifting — attacking the phase you generate is
 * a penalty, so there is no single "best" spirit, only a better answer to what
 * is standing in front of you.
 * ────────────────────────────────────────────────────────────────────────── */

export interface Combatant {
  spirit: Spirit;
  hp: number;
  maxHp: number;
}

export type BattlePhase = "active" | "won" | "lost" | "caught" | "fled" | "exhausted";

export type LogEntry =
  | { kind: "attack"; by: "player" | "wild"; spiritId: string; damage: number; matchup: Matchup }
  | { kind: "capture"; success: boolean; chance: number }
  | { kind: "faint"; side: "player" | "wild"; spiritId: string }
  | { kind: "flee" };

export interface BattleState {
  player: Combatant | null;
  wild: Combatant;
  turn: number;
  phase: BattlePhase;
  log: LogEntry[];
}

export type BattleAction = { type: "attack" } | { type: "capture" } | { type: "flee" };

/**
 * Battles end after this many turns. Two mutually resistant spirits with low
 * attack can otherwise chip at each other forever, and an arcade page should
 * never trap the player in a fight they cannot resolve.
 */
export const MAX_TURNS = 30;

/** Damage spread, so identical matchups don't play out identically every time. */
const VARIANCE_MIN = 0.85;
const VARIANCE_SPAN = 0.3;

export function makeCombatant(spirit: Spirit): Combatant {
  return { spirit, hp: spirit.hp, maxHp: spirit.hp };
}

/**
 * `player` is null when the wanderer has caught nothing yet: with no spirit to
 * send out they can still attempt a bare-handed capture or walk away. It makes
 * the first catch the hard one and every catch after it easier, which is the
 * loop we want rather than a starter handed over for free.
 */
export function createBattle(wild: Spirit, player: Spirit | null): BattleState {
  return {
    player: player ? makeCombatant(player) : null,
    wild: makeCombatant(wild),
    turn: 1,
    phase: "active",
    log: [],
  };
}

export function computeDamage(attacker: Spirit, defender: Spirit, roll: () => number): number {
  const mult = damageMultiplier(attacker.element, defender.element);
  const variance = VARIANCE_MIN + roll() * VARIANCE_SPAN;
  // Floor of 1: a resisted hit should still register as a hit, otherwise a bad
  // matchup reads as a broken button.
  return Math.max(1, Math.round(attacker.attack * mult * variance));
}

/**
 * Capture odds rise as the wild spirit weakens. At full health it is a long
 * shot; nearly fainted it is likely but never certain, so the last point of HP
 * can't be treated as a guaranteed catch.
 */
export function captureChance(wild: Combatant): number {
  const ratio = wild.maxHp > 0 ? wild.hp / wild.maxHp : 0;
  return Math.min(0.9, 0.15 + 0.6 * (1 - ratio));
}

function damaged(c: Combatant, amount: number): Combatant {
  return { ...c, hp: Math.max(0, c.hp - amount) };
}

/**
 * Advance one turn. Returns a new state; never mutates the one passed in, so a
 * caller can keep the previous state for an undo or a replay.
 *
 * Order of play is decided by speed, which is the only thing speed does — so a
 * fast, fragile spirit really can win a race it would lose to attrition.
 */
export function resolveTurn(state: BattleState, action: BattleAction, roll: () => number): BattleState {
  if (state.phase !== "active") return state;

  const log: LogEntry[] = [];

  if (action.type === "flee") {
    return { ...state, phase: "fled", log: [...state.log, { kind: "flee" }] };
  }

  if (action.type === "capture") {
    const chance = captureChance(state.wild);
    const success = roll() < chance;
    log.push({ kind: "capture", success, chance });
    if (success) {
      return { ...state, phase: "caught", log: [...state.log, ...log] };
    }
    // A failed capture costs the turn: the wild spirit still gets to act.
    return afterPlayerAction(state, log, roll);
  }

  // attack
  if (!state.player) {
    // Nothing to attack with; treat as a wasted turn rather than a crash.
    return afterPlayerAction(state, log, roll);
  }

  const wildFirst = state.wild.spirit.speed > state.player.spirit.speed;
  if (wildFirst) {
    const afterWild = wildStrike(state, log, roll);
    if (afterWild.phase !== "active") return afterWild;
    return playerStrike(afterWild, log, roll, true);
  }

  const afterPlayer = playerStrike(state, log, roll, false);
  if (afterPlayer.phase !== "active") return afterPlayer;
  return wildStrikeAndAdvance(afterPlayer, log, roll);
}

function playerStrike(
  state: BattleState,
  log: LogEntry[],
  roll: () => number,
  advance: boolean,
): BattleState {
  if (!state.player) return state;
  const dmg = computeDamage(state.player.spirit, state.wild.spirit, roll);
  log.push({
    kind: "attack",
    by: "player",
    spiritId: state.player.spirit.id,
    damage: dmg,
    matchup: matchup(state.player.spirit.element, state.wild.spirit.element),
  });
  const wild = damaged(state.wild, dmg);
  if (wild.hp <= 0) {
    log.push({ kind: "faint", side: "wild", spiritId: wild.spirit.id });
    return { ...state, wild, phase: "won", log: [...state.log, ...log] };
  }
  const next = { ...state, wild };
  return advance ? finishTurn(next, log) : next;
}

function wildStrike(state: BattleState, log: LogEntry[], roll: () => number): BattleState {
  if (!state.player) return state;
  const dmg = computeDamage(state.wild.spirit, state.player.spirit, roll);
  log.push({
    kind: "attack",
    by: "wild",
    spiritId: state.wild.spirit.id,
    damage: dmg,
    matchup: matchup(state.wild.spirit.element, state.player.spirit.element),
  });
  const player = damaged(state.player, dmg);
  if (player.hp <= 0) {
    log.push({ kind: "faint", side: "player", spiritId: player.spirit.id });
    return { ...state, player, phase: "lost", log: [...state.log, ...log] };
  }
  return { ...state, player };
}

function wildStrikeAndAdvance(state: BattleState, log: LogEntry[], roll: () => number): BattleState {
  const next = wildStrike(state, log, roll);
  if (next.phase !== "active") return next;
  return finishTurn(next, log);
}

/** The wild spirit's free swing after a capture attempt or an empty party. */
function afterPlayerAction(state: BattleState, log: LogEntry[], roll: () => number): BattleState {
  if (!state.player) {
    // No one to hit, so the turn simply passes.
    return finishTurn(state, log);
  }
  return wildStrikeAndAdvance(state, log, roll);
}

function finishTurn(state: BattleState, log: LogEntry[]): BattleState {
  const turn = state.turn + 1;
  const phase: BattlePhase = turn > MAX_TURNS ? "exhausted" : "active";
  return { ...state, turn, phase, log: [...state.log, ...log] };
}

/**
 * Pick the party member with the best matchup against the wild spirit, breaking
 * ties on raw attack. This is what the UI auto-sends out, so a player who
 * doesn't want to micromanage still benefits from having caught a spread of
 * elements — the collection has a mechanical payoff, not just a checklist.
 */
export function bestAgainst(wild: Spirit, partyIds: string[]): Spirit | null {
  const party = partyIds
    .map((id) => SPIRITS.find((s) => s.id === id))
    .filter((s): s is Spirit => Boolean(s));
  if (party.length === 0) return null;

  return party.reduce((best, cur) => {
    const bm = damageMultiplier(best.element, wild.element);
    const cm = damageMultiplier(cur.element, wild.element);
    if (cm !== bm) return cm > bm ? cur : best;
    return cur.attack > best.attack ? cur : best;
  });
}
