import type { ElementId, Spirit } from "./spirit-vale";
import type { Stage } from "./spirit-vale-evolution";

/* ────────────────────────────────────────────────────────────────────────────
 * Creature body plans — the numbers a renderer needs to build a spirit out of
 * primitives, with no three.js and no meshes in sight.
 *
 * There are no model files to load, so every creature is assembled at runtime.
 * The thing that decides whether that reads as a creature or as a pile of
 * shapes is anatomy: a silhouette you can name, and eyes. Eyes do more work
 * than any other feature here, which is why they get their own parameters
 * (size, spread, height, and a highlight) instead of being two dots bolted on.
 *
 * Three inputs shape a spirit:
 *   · the earthly branch gives the silhouette   (ox is bulky and horned,
 *     snake has no limbs, rooster is a biped with a crest and a fan tail)
 *   · the 오행 phase gives the signature         (fire wears a flame crest,
 *     water grows fins, metal grows plates)
 *   · the stage gives bulk and ornament          (so evolution is visible for
 *     free — the same body simply grows)
 * ────────────────────────────────────────────────────────────────────────── */

export type LimbKind = "quadruped" | "biped" | "serpentine" | "avian";
export type EarKind = "none" | "round" | "pointed" | "horns" | "antlers";
export type TailKind = "none" | "thin" | "bushy" | "serpent" | "fan";
export type AccentKind = "leaf" | "flame" | "stone" | "plate" | "fin";

export interface Palette {
  body: string;
  belly: string;
  accent: string;
  eye: string;
}

export interface BodyPlan {
  /** Overall multiplier — grows with stage. */
  scale: number;
  torso: {
    /** Along the spine. */
    length: number;
    girth: number;
    /** 0 = horizontal spine, 1 = fully upright. */
    lift: number;
  };
  head: {
    size: number;
    /** Muzzle length; 0 for a flat face. */
    snout: number;
    /** How far the head sits ahead of the torso. */
    forward: number;
  };
  eye: {
    size: number;
    /** Horizontal separation as a fraction of head size. */
    spread: number;
    height: number;
    /** Highlight radius relative to the eye — the thing that makes it alive. */
    highlight: number;
  };
  limbs: {
    kind: LimbKind;
    length: number;
    thickness: number;
  };
  ears: {
    kind: EarKind;
    size: number;
  };
  tail: {
    kind: TailKind;
    length: number;
  };
  accent: {
    kind: AccentKind;
    /** How many accent pieces to place along the spine. */
    count: number;
    scale: number;
  };
  palette: Palette;
}

/* ── Element signatures ──────────────────────────────────────────────────── */

const ELEMENT_PALETTE: Record<ElementId, Palette> = {
  wood: { body: "#5c9e4a", belly: "#cfe6a8", accent: "#7ec850", eye: "#1d2b1a" },
  fire: { body: "#d2673c", belly: "#f6d0a8", accent: "#f2a03d", eye: "#33150d" },
  earth: { body: "#c2984f", belly: "#efdcae", accent: "#8d6a35", eye: "#2f2515" },
  metal: { body: "#9aa6b0", belly: "#e2e8ec", accent: "#c7d0d6", eye: "#20272c" },
  water: { body: "#4c81c0", belly: "#c6dcf2", accent: "#6fb3e0", eye: "#132436" },
};

const ELEMENT_ACCENT: Record<ElementId, AccentKind> = {
  wood: "leaf",
  fire: "flame",
  earth: "stone",
  metal: "plate",
  water: "fin",
};

/* ── Silhouettes, by earthly branch ──────────────────────────────────────── */

type Silhouette = Omit<BodyPlan, "palette" | "scale" | "accent" | "eye"> & {
  /** Baseline size before stage growth. */
  base: number;
  eye: Omit<BodyPlan["eye"], "highlight">;
};

/**
 * One entry per branch, in the canonical order (子 rat … 亥 pig). These are
 * tuned by silhouette rather than by realism: the goal is that a player can
 * tell an ox from a rabbit at a glance, at thumbnail size, with flat shading
 * and no texture.
 */
const SILHOUETTES: readonly Silhouette[] = [
  // 子 rat — small, low, long thin tail, big ears.
  {
    base: 0.62,
    torso: { length: 1.0, girth: 0.62, lift: 0.15 },
    head: { size: 0.52, snout: 0.34, forward: 0.62 },
    eye: { size: 0.13, spread: 0.5, height: 0.16 },
    limbs: { kind: "quadruped", length: 0.34, thickness: 0.1 },
    ears: { kind: "round", size: 0.3 },
    tail: { kind: "thin", length: 1.25 },
  },
  // 丑 ox — heavy, wide, horned, short tail.
  {
    base: 1.15,
    torso: { length: 1.35, girth: 1.06, lift: 0.05 },
    head: { size: 0.66, snout: 0.42, forward: 0.86 },
    eye: { size: 0.11, spread: 0.62, height: 0.12 },
    limbs: { kind: "quadruped", length: 0.62, thickness: 0.22 },
    ears: { kind: "horns", size: 0.44 },
    tail: { kind: "thin", length: 0.7 },
  },
  // 寅 tiger — powerful chest, big head, bushy tail.
  {
    base: 1.0,
    torso: { length: 1.25, girth: 0.9, lift: 0.1 },
    head: { size: 0.74, snout: 0.3, forward: 0.8 },
    eye: { size: 0.15, spread: 0.52, height: 0.2 },
    limbs: { kind: "quadruped", length: 0.55, thickness: 0.19 },
    ears: { kind: "round", size: 0.24 },
    tail: { kind: "bushy", length: 1.0 },
  },
  // 卯 rabbit — upright, tall ears, round tail.
  {
    base: 0.7,
    torso: { length: 0.86, girth: 0.7, lift: 0.55 },
    head: { size: 0.58, snout: 0.18, forward: 0.4 },
    eye: { size: 0.17, spread: 0.5, height: 0.2 },
    limbs: { kind: "quadruped", length: 0.42, thickness: 0.12 },
    ears: { kind: "pointed", size: 0.72 },
    tail: { kind: "bushy", length: 0.3 },
  },
  // 辰 dragon — long serpentine body, antlers, no ordinary legs.
  {
    base: 1.1,
    torso: { length: 1.8, girth: 0.66, lift: 0.35 },
    head: { size: 0.66, snout: 0.46, forward: 0.9 },
    eye: { size: 0.14, spread: 0.54, height: 0.2 },
    limbs: { kind: "serpentine", length: 0.3, thickness: 0.13 },
    ears: { kind: "antlers", size: 0.5 },
    tail: { kind: "serpent", length: 1.5 },
  },
  // 巳 snake — pure serpent: no limbs, no ears.
  {
    base: 0.8,
    torso: { length: 1.7, girth: 0.5, lift: 0.3 },
    head: { size: 0.48, snout: 0.34, forward: 0.8 },
    eye: { size: 0.12, spread: 0.56, height: 0.14 },
    limbs: { kind: "serpentine", length: 0, thickness: 0 },
    ears: { kind: "none", size: 0 },
    tail: { kind: "serpent", length: 1.6 },
  },
  // 午 horse — long legs, long neck, flowing tail.
  {
    base: 1.1,
    torso: { length: 1.3, girth: 0.78, lift: 0.12 },
    head: { size: 0.56, snout: 0.56, forward: 0.95 },
    eye: { size: 0.12, spread: 0.58, height: 0.18 },
    limbs: { kind: "quadruped", length: 0.82, thickness: 0.14 },
    ears: { kind: "pointed", size: 0.3 },
    tail: { kind: "bushy", length: 0.9 },
  },
  // 未 goat — compact, curled horns.
  {
    base: 0.9,
    torso: { length: 1.05, girth: 0.82, lift: 0.1 },
    head: { size: 0.56, snout: 0.36, forward: 0.72 },
    eye: { size: 0.12, spread: 0.6, height: 0.14 },
    limbs: { kind: "quadruped", length: 0.5, thickness: 0.14 },
    ears: { kind: "horns", size: 0.38 },
    tail: { kind: "thin", length: 0.36 },
  },
  // 申 monkey — biped, long grasping tail.
  {
    base: 0.82,
    torso: { length: 0.92, girth: 0.7, lift: 0.7 },
    head: { size: 0.6, snout: 0.22, forward: 0.34 },
    eye: { size: 0.16, spread: 0.48, height: 0.18 },
    limbs: { kind: "biped", length: 0.52, thickness: 0.12 },
    ears: { kind: "round", size: 0.26 },
    tail: { kind: "thin", length: 1.4 },
  },
  // 酉 rooster — avian, crest, fan tail.
  {
    base: 0.8,
    torso: { length: 0.9, girth: 0.74, lift: 0.72 },
    head: { size: 0.48, snout: 0.34, forward: 0.4 },
    eye: { size: 0.14, spread: 0.56, height: 0.2 },
    limbs: { kind: "avian", length: 0.5, thickness: 0.09 },
    ears: { kind: "pointed", size: 0.34 },
    tail: { kind: "fan", length: 0.8 },
  },
  // 戌 dog — balanced, alert, bushy tail.
  {
    base: 0.92,
    torso: { length: 1.12, girth: 0.78, lift: 0.14 },
    head: { size: 0.62, snout: 0.42, forward: 0.76 },
    eye: { size: 0.15, spread: 0.52, height: 0.18 },
    limbs: { kind: "quadruped", length: 0.52, thickness: 0.15 },
    ears: { kind: "pointed", size: 0.34 },
    tail: { kind: "bushy", length: 0.8 },
  },
  // 亥 pig — round, low, big snout.
  {
    base: 1.0,
    torso: { length: 1.15, girth: 1.0, lift: 0.06 },
    head: { size: 0.58, snout: 0.46, forward: 0.74 },
    eye: { size: 0.1, spread: 0.6, height: 0.14 },
    limbs: { kind: "quadruped", length: 0.36, thickness: 0.17 },
    ears: { kind: "round", size: 0.32 },
    tail: { kind: "thin", length: 0.34 },
  },
];

/* ── Stage growth ────────────────────────────────────────────────────────── */

/** Overall size per stage — a grown spirit should read as bigger immediately. */
const STAGE_SCALE: Record<Stage, number> = { 1: 1, 2: 1.22, 3: 1.45 };
/** Ornament grows faster than the body, so evolution adds detail, not just size. */
const STAGE_ACCENT: Record<Stage, { count: number; scale: number }> = {
  1: { count: 2, scale: 0.8 },
  2: { count: 4, scale: 1.0 },
  3: { count: 6, scale: 1.25 },
};

/**
 * A fully-resolved body plan. Deterministic: the same spirit at the same stage
 * always produces exactly the same creature, on every device.
 */
export function formFor(spirit: Spirit, stage: Stage): BodyPlan {
  const sil = SILHOUETTES[spirit.branch] ?? SILHOUETTES[0];
  const accent = STAGE_ACCENT[stage];

  // Horned silhouettes grow their horns with stage; a stage-3 ox should be
  // unmistakably more imposing than the one that was just caught.
  const hornGrowth = sil.ears.kind === "horns" || sil.ears.kind === "antlers" ? 1 + (stage - 1) * 0.35 : 1;

  return {
    scale: sil.base * STAGE_SCALE[stage],
    torso: { ...sil.torso },
    head: { ...sil.head },
    eye: {
      ...sil.eye,
      // A hard specular dot is what separates "eye" from "hole". It shrinks
      // slightly as the creature grows so older forms read as sharper.
      highlight: stage === 3 ? 0.3 : 0.36,
    },
    limbs: { ...sil.limbs },
    ears: { kind: sil.ears.kind, size: sil.ears.size * hornGrowth },
    tail: { ...sil.tail },
    accent: {
      kind: ELEMENT_ACCENT[spirit.element],
      count: accent.count,
      scale: accent.scale,
    },
    palette: ELEMENT_PALETTE[spirit.element],
  };
}

/** Approximate standing height, used to seat a spirit on the ground. */
export function standingHeight(plan: BodyPlan): number {
  const legs = plan.limbs.kind === "serpentine" ? plan.torso.girth * 0.5 : plan.limbs.length;
  return (legs + plan.torso.girth + plan.head.size) * plan.scale;
}
