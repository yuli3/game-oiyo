import type { ElementId, Spirit } from "./spirit-vale";
import type { Stage } from "./spirit-vale-evolution";

/* ────────────────────────────────────────────────────────────────────────────
 * Skills — what a spirit can actually do on its turn.
 *
 * One "attack" button is not a battle, it is a metronome. Each spirit gets
 * three moves that trade against each other, so a turn is a decision:
 *
 *   · strike  — always lands, modest damage. The safe tempo move.
 *   · surge   — the phase's signature. Big, element-typed, but less accurate.
 *   · art     — a support move that costs damage to buy something else
 *               (guarding, sapping, or softening the target for capture).
 *
 * Accuracy is what makes the big move a gamble rather than a strictly better
 * button, and `captureBonus` is what makes a support move worth a turn when the
 * point of the fight is to catch rather than to win.
 *
 * No strings live here — the six locales name these in the component, the same
 * way the battle log does.
 * ────────────────────────────────────────────────────────────────────────── */

export type SkillKind = "strike" | "surge" | "art";

/** What the support move of each phase actually does. */
export type ArtEffect = "guard" | "drain" | "weaken";

export interface Skill {
  id: string;
  kind: SkillKind;
  /** Multiplier on the user's attack stat. 0 for a pure support move. */
  power: number;
  /** 0..1 chance to land. */
  accuracy: number;
  /** Whether the 오행 matchup applies — plain strikes are untyped. */
  typed: boolean;
  effect?: ArtEffect;
  /** Added to the capture chance for the rest of the battle, 0..1. */
  captureBonus?: number;
  /** Fraction of damage dealt that is returned to the user as health. */
  drain?: number;
  /** Fraction of incoming damage blocked on the opponent's next turn. */
  guard?: number;
}

const STRIKE: Skill = {
  id: "strike",
  kind: "strike",
  power: 0.85,
  accuracy: 1,
  typed: false,
};

/**
 * The signature move of each phase. All five share a shape — high power, ~78%
 * accuracy, fully typed — so the 오행 matchup stays the thing that separates
 * them rather than a stat spread nobody can see.
 */
const SURGE: Record<ElementId, Skill> = {
  wood: { id: "wood-surge", kind: "surge", power: 1.55, accuracy: 0.78, typed: true },
  fire: { id: "fire-surge", kind: "surge", power: 1.7, accuracy: 0.72, typed: true },
  earth: { id: "earth-surge", kind: "surge", power: 1.45, accuracy: 0.85, typed: true },
  metal: { id: "metal-surge", kind: "surge", power: 1.6, accuracy: 0.76, typed: true },
  water: { id: "water-surge", kind: "surge", power: 1.5, accuracy: 0.8, typed: true },
};

/**
 * Support moves, assigned so each phase plays differently:
 *   wood/water drain (they nourish on the 상생 cycle),
 *   earth/metal guard (the solid phases),
 *   fire weakens — it burns the target down for the catch.
 */
const ART: Record<ElementId, Skill> = {
  wood: {
    id: "wood-art",
    kind: "art",
    power: 0.55,
    accuracy: 0.9,
    typed: true,
    effect: "drain",
    drain: 0.6,
  },
  water: {
    id: "water-art",
    kind: "art",
    power: 0.5,
    accuracy: 0.92,
    typed: true,
    effect: "drain",
    drain: 0.7,
  },
  earth: {
    id: "earth-art",
    kind: "art",
    power: 0,
    accuracy: 1,
    typed: false,
    effect: "guard",
    guard: 0.55,
  },
  metal: {
    id: "metal-art",
    kind: "art",
    power: 0,
    accuracy: 1,
    typed: false,
    effect: "guard",
    guard: 0.65,
  },
  fire: {
    id: "fire-art",
    kind: "art",
    power: 0.35,
    accuracy: 0.95,
    typed: true,
    effect: "weaken",
    captureBonus: 0.18,
  },
};

/**
 * The three moves a spirit knows. The signature surge only unlocks at stage 2:
 * a freshly caught spirit fights with a strike and its art, which gives
 * evolution something to deliver beyond bigger numbers.
 */
export function skillsFor(spirit: Spirit, stage: Stage): Skill[] {
  const base = [STRIKE, ART[spirit.element]];
  if (stage >= 2) base.splice(1, 0, SURGE[spirit.element]);
  return base;
}

export function skillById(spirit: Spirit, stage: Stage, id: string): Skill | null {
  return skillsFor(spirit, stage).find((s) => s.id === id) ?? null;
}

/** Wild spirits pick a move rather than always using their strongest. */
export function chooseWildSkill(spirit: Spirit, stage: Stage, roll: () => number): Skill {
  const options = skillsFor(spirit, stage);
  // Weighted toward the signature move when it is available, so a wild
  // encounter is threatening without being a coin flip every turn.
  const r = roll();
  if (options.length >= 3) {
    if (r < 0.45) return options[1];
    if (r < 0.8) return options[0];
    return options[2];
  }
  return r < 0.65 ? options[0] : options[1];
}
