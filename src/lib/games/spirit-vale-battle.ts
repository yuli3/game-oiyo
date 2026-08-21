import { SPIRITS, damageMultiplier, matchup, type Matchup, type Spirit } from "./spirit-vale";
import { stageOf, type Stage } from "./spirit-vale-evolution";
import { chooseWildSkill, skillById, skillsFor, type Skill } from "./spirit-vale-skills";

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
  stage: Stage;
  /** Damage reduction applied to the next hit taken, from a guard art. */
  guard: number;
}

export type BattlePhase = "active" | "won" | "lost" | "caught" | "fled" | "exhausted";

export type LogEntry =
  | {
      kind: "attack";
      by: "player" | "wild";
      spiritId: string;
      skillId: string;
      damage: number;
      matchup: Matchup;
    }
  | { kind: "miss"; by: "player" | "wild"; spiritId: string; skillId: string }
  | { kind: "guard"; by: "player" | "wild"; spiritId: string }
  | { kind: "drain"; by: "player" | "wild"; amount: number }
  | { kind: "weaken"; by: "player" | "wild" }
  | { kind: "capture"; success: boolean; chance: number }
  | { kind: "faint"; side: "player" | "wild"; spiritId: string }
  | { kind: "flee" };

export interface BattleState {
  player: Combatant | null;
  wild: Combatant;
  turn: number;
  phase: BattlePhase;
  log: LogEntry[];
  /** Accumulated from `weaken` arts, added to the capture chance. */
  captureBonus: number;
  /** Entries added by the most recent turn, for driving hit animations. */
  lastEvents: LogEntry[];
}

export type BattleAction =
  | { type: "skill"; skillId: string }
  | { type: "capture" }
  | { type: "flee" };

/**
 * Battles end after this many turns. Two mutually resistant spirits with low
 * attack can otherwise chip at each other forever, and an arcade page should
 * never trap the player in a fight they cannot resolve.
 */
export const MAX_TURNS = 30;

/** Damage spread, so identical matchups don't play out identically every time. */
const VARIANCE_MIN = 0.85;
const VARIANCE_SPAN = 0.3;

export function makeCombatant(spirit: Spirit, stage: Stage = 1): Combatant {
  return { spirit, hp: spirit.hp, maxHp: spirit.hp, stage, guard: 0 };
}

/**
 * `player` is null when the wanderer has caught nothing yet: with no spirit to
 * send out they can still attempt a bare-handed capture or walk away. It makes
 * the first catch the hard one and every catch after it easier, which is the
 * loop we want rather than a starter handed over for free.
 */
export function createBattle(
  wild: Spirit,
  player: Spirit | null,
  wildStage: Stage = 1,
  playerStage: Stage = 1,
): BattleState {
  return {
    player: player ? makeCombatant(player, playerStage) : null,
    wild: makeCombatant(wild, wildStage),
    turn: 1,
    phase: "active",
    log: [],
    captureBonus: 0,
    lastEvents: [],
  };
}

/**
 * Damage for one skill. Untyped strikes ignore the 오행 matchup entirely, which
 * is what makes them the reliable option against a bad pairing.
 */
export function computeDamage(
  attacker: Combatant,
  defender: Combatant,
  skill: Skill,
  roll: () => number,
): number {
  if (skill.power <= 0) return 0;
  const mult = skill.typed ? damageMultiplier(attacker.spirit.element, defender.spirit.element) : 1;
  const variance = VARIANCE_MIN + roll() * VARIANCE_SPAN;
  const raw = attacker.spirit.attack * skill.power * mult * variance;
  const blocked = raw * (1 - defender.guard);
  // Floor of 1: a resisted hit should still register as a hit, otherwise a bad
  // matchup reads as a broken button.
  return Math.max(1, Math.round(blocked));
}

/**
 * Capture odds rise as the wild spirit weakens. At full health it is a long
 * shot; nearly fainted it is likely but never certain, so the last point of HP
 * can't be treated as a guaranteed catch.
 */
export function captureChance(wild: Combatant, bonus = 0): number {
  const ratio = wild.maxHp > 0 ? wild.hp / wild.maxHp : 0;
  return Math.min(0.9, 0.15 + 0.6 * (1 - ratio) + bonus);
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
    return {
      ...state,
      phase: "fled",
      log: [...state.log, { kind: "flee" }],
      lastEvents: [{ kind: "flee" }],
    };
  }

  // Guard is not cleared here: it is consumed by the hit it absorbs, inside
  // `useSkill`. That keeps "blocks the next attack" true no matter whose turn
  // order the speed check produced.
  const cur: BattleState = state;

  if (action.type === "capture") {
    const chance = captureChance(cur.wild, cur.captureBonus);
    const success = roll() < chance;
    log.push({ kind: "capture", success, chance });
    if (success) {
      return { ...cur, phase: "caught", log: [...cur.log, ...log], lastEvents: log };
    }
    // A failed capture costs the turn: the wild spirit still gets to act.
    return wildTurn(cur, log, roll);
  }

  if (!cur.player) {
    // Nothing to act with; treat as a wasted turn rather than a crash.
    return wildTurn(cur, log, roll);
  }

  const skill = skillById(cur.player.spirit, cur.player.stage, action.skillId)
    ?? skillsFor(cur.player.spirit, cur.player.stage)[0];

  const wildFirst = cur.wild.spirit.speed > cur.player.spirit.speed;
  if (wildFirst) {
    const afterWild = wildAct(cur, log, roll);
    if (afterWild.phase !== "active") return { ...afterWild, lastEvents: log };
    const afterPlayer = useSkill(afterWild, "player", skill, log, roll);
    if (afterPlayer.phase !== "active") return { ...afterPlayer, lastEvents: log };
    return finishTurn(afterPlayer, log);
  }

  const afterPlayer = useSkill(cur, "player", skill, log, roll);
  if (afterPlayer.phase !== "active") return { ...afterPlayer, lastEvents: log };
  return wildTurn(afterPlayer, log, roll);
}

/** The wild spirit acts, then the turn closes. */
function wildTurn(state: BattleState, log: LogEntry[], roll: () => number): BattleState {
  const next = wildAct(state, log, roll);
  if (next.phase !== "active") return { ...next, lastEvents: log };
  return finishTurn(next, log);
}

function wildAct(state: BattleState, log: LogEntry[], roll: () => number): BattleState {
  if (!state.player) return state;
  const skill = chooseWildSkill(state.wild.spirit, state.wild.stage, roll);
  return useSkill(state, "wild", skill, log, roll);
}

/**
 * Apply one skill from one side. Damage, misses, guards, drains and capture
 * softening all flow through here so the two sides can never diverge.
 */
function useSkill(
  state: BattleState,
  by: "player" | "wild",
  skill: Skill,
  log: LogEntry[],
  roll: () => number,
): BattleState {
  const attacker = by === "player" ? state.player : state.wild;
  const defender = by === "player" ? state.wild : state.player;
  if (!attacker || !defender) return state;

  if (roll() >= skill.accuracy) {
    log.push({ kind: "miss", by, spiritId: attacker.spirit.id, skillId: skill.id });
    return state;
  }

  let nextAttacker: Combatant = attacker;
  let nextDefender: Combatant = defender;
  let captureBonus = state.captureBonus;

  if (skill.effect === "guard" && skill.guard) {
    nextAttacker = { ...attacker, guard: skill.guard };
    log.push({ kind: "guard", by, spiritId: attacker.spirit.id });
  }

  if (skill.power > 0) {
    const dmg = computeDamage(attacker, defender, skill, roll);
    log.push({
      kind: "attack",
      by,
      spiritId: attacker.spirit.id,
      skillId: skill.id,
      damage: dmg,
      matchup: matchup(attacker.spirit.element, defender.spirit.element),
    });
    // The block is spent on the hit it just absorbed.
    nextDefender = { ...damaged(defender, dmg), guard: 0 };

    if (skill.drain) {
      // Healing is capped at the pool it came from, so a drain can top a
      // spirit up but never inflate it past full.
      const healed = Math.max(1, Math.round(dmg * skill.drain));
      const before = nextAttacker.hp;
      nextAttacker = { ...nextAttacker, hp: Math.min(nextAttacker.maxHp, nextAttacker.hp + healed) };
      const gained = nextAttacker.hp - before;
      if (gained > 0) log.push({ kind: "drain", by, amount: gained });
    }
  }

  if (skill.effect === "weaken" && skill.captureBonus) {
    // Only the player's softening helps a capture; a wild spirit using it is
    // just chipping away.
    if (by === "player") captureBonus = Math.min(0.5, captureBonus + skill.captureBonus);
    log.push({ kind: "weaken", by });
  }

  const merged: BattleState =
    by === "player"
      ? { ...state, player: nextAttacker, wild: nextDefender, captureBonus }
      : { ...state, wild: nextAttacker, player: nextDefender, captureBonus };

  if (nextDefender.hp <= 0) {
    const side = by === "player" ? "wild" : "player";
    log.push({ kind: "faint", side, spiritId: nextDefender.spirit.id });
    return {
      ...merged,
      phase: by === "player" ? "won" : "lost",
      log: [...state.log, ...log],
    };
  }

  return merged;
}

function finishTurn(state: BattleState, log: LogEntry[]): BattleState {
  const turn = state.turn + 1;
  const phase: BattlePhase = turn > MAX_TURNS ? "exhausted" : "active";
  return { ...state, turn, phase, log: [...state.log, ...log], lastEvents: log };
}

/**
 * Pick the party member with the best matchup against the wild spirit, breaking
 * ties on raw attack. This is what the UI auto-sends out, so a player who
 * doesn't want to micromanage still benefits from having caught a spread of
 * elements — the collection has a mechanical payoff, not just a checklist.
 */
export { skillsFor, stageOf };

export function explainBattleEnd(state: BattleState): { phase: BattlePhase; faintMatchup: Matchup | null } {
  const faint = [...state.log].reverse().find((entry) => entry.kind === "faint");
  const attack = faint
    ? [...state.log].reverse().find((entry) => entry.kind === "attack")
    : undefined;
  return {
    phase: state.phase,
    faintMatchup: attack && attack.kind === "attack" ? attack.matchup : null,
  };
}

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
