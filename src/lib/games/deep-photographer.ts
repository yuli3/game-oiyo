/**
 * 의도 (2026-10-15 세운): 심해 사진가는 공격이 없다.
 * 빛을 한 칸 올리면 빔 안의 생물은 어두운 쪽(+x)으로 한 칸 피하고, 포식자는 빛 쪽(−x)으로 한 칸 다가온다.
 * 빛을 내리면 생물은 그대로 있고 포식자만 어둠으로 한 칸 물러난다.
 * 생물이 표식 위에 있고, 밝기가 그 장면과 같고, 포식자가 빔 밖에 있을 때만 셔터가 그 한 장면을 남긴다.
 * 네 장면은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 생물을 옮기지 않는다.
 *
 * 카메라 0 은 월드 +z 다. 그래서 화면 오른쪽이 월드 +x, 곧 해구의 어두운 끝이다.
 */

export const STEP_CAP = 8;
export const LAMP_MAX = 3;
export const SUBJECT_MAX = 3;
export const PREDATOR_MAX = 5;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and looks at the trench,
 * so screen-right stays world +x. The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 0.85, 4.8],
  [1.3, 1.15, 4.4],
  [0, 0.28, 3.8],
  [-1.25, 0.95, 4.5],
];

export const ACTIONS = ["bright", "dim", "shutter"] as const;
export type Action = (typeof ACTIONS)[number];
export type LoseReason = "cap" | "resign" | "miss" | "taken";
export type MissKind = "lamp-high" | "lamp-low" | "subject" | "predator";

export interface ShotState {
  readonly puzzleId: string;
  readonly lamp: number;
  readonly subject: number;
  readonly predator: number;
  readonly need: number;
  readonly seat: number;
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly miss: readonly MissKind[];
  readonly lastAction: Action | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly lamp: number;
  readonly subject: number;
  readonly predator: number;
  readonly need: number;
  readonly seat: number;
}

/**
 * edge-light: one brighter step puts the fish on the mark and leaves the predator in the dark.
 * washout: the fish is already on the mark and the lamp is too hot. Dimming does not move the fish.
 * step-then-ease: the fish steps onto the mark only when the lamp overshoots, then dimming sets the exposure.
 * long-swim: two brighter steps carry the fish to the far mark as the predator stops on the beam's edge.
 */
const PUZZLES: readonly PuzzleDef[] = [
  { id: "edge-light", lamp: 1, subject: 0, predator: 4, need: 2, seat: 1 },
  { id: "washout", lamp: 2, subject: 0, predator: 3, need: 1, seat: 0 },
  { id: "step-then-ease", lamp: 2, subject: 0, predator: 4, need: 2, seat: 1 },
  { id: "long-swim", lamp: 1, subject: 0, predator: 5, need: 3, seat: 2 },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Stations run from the lamp at −x toward the dark at +x. Camera 0 maps +x to screen-right. */
export function stationX(index: number): number {
  return -0.93 + index * 0.62;
}

/** The beam covers stations strictly before the lamp index. Lamp 0 leaves the trench dark. */
export function inBeam(index: number, lamp: number): boolean {
  return index < lamp;
}

function missOf(state: ShotState): MissKind[] {
  const found: MissKind[] = [];
  if (state.lamp > state.need) found.push("lamp-high");
  if (state.lamp < state.need) found.push("lamp-low");
  if (state.subject !== state.seat) found.push("subject");
  if (state.predator < state.lamp) found.push("predator");
  return found;
}

function caught(before: ShotState, subject: number, predator: number): boolean {
  return before.predator >= before.subject && predator <= subject;
}

function finish(
  state: ShotState,
  next: {
    lamp: number;
    subject: number;
    predator: number;
    action: Action;
    won: boolean;
    miss: readonly MissKind[];
    taken: boolean;
  },
): ShotState {
  const steps = state.steps + 1;
  const capped = !next.won && !next.taken && next.miss.length === 0 && steps >= STEP_CAP;
  const loseReason: LoseReason | null = next.won ? null : next.taken ? "taken" : next.miss.length > 0 ? "miss" : capped ? "cap" : null;
  return {
    ...state,
    lamp: next.lamp,
    subject: next.subject,
    predator: next.predator,
    steps,
    lastAction: next.action,
    miss: next.miss,
    status: next.won ? "win" : loseReason ? "lose" : "play",
    loseReason,
  };
}

export function stepShot(state: ShotState, action: Action): ShotState {
  if (state.status !== "play") return state;
  if (action === "shutter") {
    const miss = missOf(state);
    return finish(state, {
      lamp: state.lamp,
      subject: state.subject,
      predator: state.predator,
      action,
      won: miss.length === 0,
      miss,
      taken: false,
    });
  }
  if (action === "dim") {
    if (state.lamp <= 0) return state;
    return finish(state, {
      lamp: state.lamp - 1,
      subject: state.subject,
      predator: Math.min(PREDATOR_MAX, state.predator + 1),
      action,
      won: false,
      miss: [],
      taken: false,
    });
  }
  if (state.lamp >= LAMP_MAX) return state;
  const lamp = state.lamp + 1;
  const subject = inBeam(state.subject, lamp) ? Math.min(SUBJECT_MAX, state.subject + 1) : state.subject;
  const predator = Math.max(0, state.predator - 1);
  return finish(state, {
    lamp,
    subject,
    predator,
    action,
    won: false,
    miss: [],
    taken: caught(state, subject, predator),
  });
}

export function openActions(state: ShotState): Action[] {
  return ACTIONS.filter((action) => stepShot(state, action) !== state);
}

export function mixSeed(seed: number): number {
  let mixed = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  mixed = (mixed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function puzzleIndexForSeed(seed: number): number {
  return mixSeed(seed) % PUZZLES.length;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

function makeState(puzzle: PuzzleDef, steps = 0, pose?: { lamp: number; subject: number; predator: number }): ShotState {
  return {
    puzzleId: puzzle.id,
    lamp: pose?.lamp ?? puzzle.lamp,
    subject: pose?.subject ?? puzzle.subject,
    predator: pose?.predator ?? puzzle.predator,
    need: puzzle.need,
    seat: puzzle.seat,
    steps,
    status: "play",
    loseReason: null,
    miss: [],
    lastAction: null,
  };
}

export function createShot(seed = 0): ShotState {
  return makeState(PUZZLES[puzzleIndexForSeed(seed)] ?? PUZZLES[0]);
}

export function makeShot(input: {
  lamp: number;
  subject: number;
  predator: number;
  need?: number;
  seat?: number;
  steps?: number;
}): ShotState {
  return makeState(
    {
      id: "custom",
      lamp: input.lamp,
      subject: input.subject,
      predator: input.predator,
      need: input.need ?? 1,
      seat: input.seat ?? 0,
    },
    input.steps ?? 0,
    { lamp: input.lamp, subject: input.subject, predator: input.predator },
  );
}

export function resign(state: ShotState): ShotState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
