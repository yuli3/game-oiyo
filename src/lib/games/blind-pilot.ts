/**
 * 의도 (2026-10-15 세운): 블라인드 파일럿은 창 없이 계기와 외측 마커 호출만으로 착륙한다.
 * 계기 하나가 바늘을 멈춘 채 거짓 눈금을 보여 준다. 나머지 바늘은 기체를 따라간다.
 * 날을 수평으로 만들기 전에는 기수와 출력이 움직이지 않는다. 출력을 올리면 기수도 한 칸 들린다.
 * 착륙은 기수·날개·출력이 모두 가운데일 때만 성공하고, 아니면 어긋난 축을 그대로 말한다.
 * 네 접근은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 기체를 흔들지 않는다.
 *
 * 카메라 0 은 월드 +z 에서 패널을 본다. 양수 눈금의 바늘 끝은 화면 오른쪽(월드 +x)으로 기운다.
 */

export const STEP_CAP = 8;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. View 0 sits on world +z and looks at the panel, so screen-right is world +x
 * and screen-up is world +y. The view button only changes which of these is used.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 0.35, 4.8],
  [4.8, 0.35, 0],
  [0, 0.35, -4.8],
  [-4.8, 0.35, 0],
];

export const ACTIONS = ["pitch+", "pitch-", "bank+", "bank-", "power+", "power-", "land"] as const;
export type Action = (typeof ACTIONS)[number];
export type Axis = "pitch" | "bank" | "power";
export type Trim = -1 | 0 | 1;
export type LoseReason = "cap" | "resign" | "miss";

export interface Miss {
  readonly axis: Axis;
  readonly value: -1 | 1;
}

export interface PilotState {
  readonly puzzleId: string;
  readonly pitch: Trim;
  readonly bank: Trim;
  readonly power: Trim;
  readonly dead: Axis;
  readonly stuck: Trim;
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly miss: readonly Miss[];
  readonly lastAction: Action | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly pitch: Trim;
  readonly bank: Trim;
  readonly power: Trim;
  readonly dead: Axis;
  readonly stuck: Trim;
}

/**
 * outer-marker: the horizon is frozen on level while the nose is actually high.
 * wing-low: the ball is frozen on center while the left wing is down, so the nose cannot move yet.
 * thrust-pitch: power is frozen on set and actually low. Adding thrust also raises the low nose.
 * night-turn: the horizon is frozen nose-high while the nose is level. Level the wings, then cut power.
 */
const PUZZLES: readonly PuzzleDef[] = [
  { id: "outer-marker", pitch: 1, bank: 0, power: 0, dead: "pitch", stuck: 0 },
  { id: "wing-low", pitch: 1, bank: -1, power: 0, dead: "bank", stuck: 0 },
  { id: "thrust-pitch", pitch: -1, bank: 0, power: -1, dead: "power", stuck: 0 },
  { id: "night-turn", pitch: 0, bank: 1, power: 1, dead: "pitch", stuck: 1 },
];

const AXES: readonly Axis[] = ["pitch", "bank", "power"];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function clamp(value: number): Trim {
  if (value >= 1) return 1;
  if (value <= -1) return -1;
  return 0;
}

/** A zero reading stays at 0, not -0, so later equality checks hold. */
export function needleAngle(reading: number): number {
  if (reading === 0) return 0;
  return -reading * 0.55;
}

/** Tip of a needle that stands on +y at rest, after needleAngle. Camera 0 maps +x to screen-right. */
export function needleTip(reading: number): [number, number] {
  const angle = needleAngle(reading);
  return [-Math.sin(angle), Math.cos(angle)];
}

export function needle(state: PilotState, axis: Axis): Trim {
  if (axis === state.dead) return state.stuck;
  if (axis === "pitch") return state.pitch;
  if (axis === "bank") return state.bank;
  return state.power;
}

function missOf(state: PilotState): Miss[] {
  const found: Miss[] = [];
  for (const axis of AXES) {
    const value = axis === "pitch" ? state.pitch : axis === "bank" ? state.bank : state.power;
    if (value !== 0) found.push({ axis, value });
  }
  return found;
}

function finish(state: PilotState, next: { pitch: Trim; bank: Trim; power: Trim; action: Action; won: boolean; miss: readonly Miss[] }): PilotState {
  const steps = state.steps + 1;
  const capped = !next.won && next.miss.length === 0 && steps >= STEP_CAP;
  return {
    ...state,
    pitch: next.pitch,
    bank: next.bank,
    power: next.power,
    steps,
    lastAction: next.action,
    miss: next.miss,
    status: next.won ? "win" : next.miss.length > 0 || capped ? "lose" : "play",
    loseReason: next.won ? null : next.miss.length > 0 ? "miss" : capped ? "cap" : null,
  };
}

export function stepPilot(state: PilotState, action: Action): PilotState {
  if (state.status !== "play") return state;
  if (action === "land") {
    const miss = missOf(state);
    const won = miss.length === 0;
    return finish(state, { pitch: state.pitch, bank: state.bank, power: state.power, action, won, miss });
  }
  const axis: Axis = action.startsWith("pitch") ? "pitch" : action.startsWith("bank") ? "bank" : "power";
  const dir: Trim = action.endsWith("+") ? 1 : -1;
  // Ailerons first. Pitch and thrust stay locked while a wing is down, so the order is part of the approach.
  if (axis !== "bank" && state.bank !== 0) return state;
  let pitch = state.pitch;
  let bank = state.bank;
  let power = state.power;
  if (axis === "pitch") pitch = clamp(pitch + dir);
  if (axis === "bank") bank = clamp(bank + dir);
  if (axis === "power") {
    power = clamp(power + dir);
    // Adding thrust raises the nose. Cutting thrust does not lower it.
    if (dir === 1) pitch = clamp(pitch + 1);
  }
  if (pitch === state.pitch && bank === state.bank && power === state.power) return state;
  return finish(state, { pitch, bank, power, action, won: false, miss: [] });
}

export function openActions(state: PilotState): Action[] {
  return ACTIONS.filter((action) => stepPilot(state, action) !== state);
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

function makeState(puzzle: PuzzleDef, steps = 0, attitude?: { pitch: Trim; bank: Trim; power: Trim }): PilotState {
  return {
    puzzleId: puzzle.id,
    pitch: attitude?.pitch ?? puzzle.pitch,
    bank: attitude?.bank ?? puzzle.bank,
    power: attitude?.power ?? puzzle.power,
    dead: puzzle.dead,
    stuck: puzzle.stuck,
    steps,
    status: "play",
    loseReason: null,
    miss: [],
    lastAction: null,
  };
}

export function createPilot(seed = 0): PilotState {
  return makeState(PUZZLES[puzzleIndexForSeed(seed)]);
}

export function makePilot(input: {
  pitch: Trim;
  bank: Trim;
  power: Trim;
  dead?: Axis;
  stuck?: Trim;
  steps?: number;
}): PilotState {
  return makeState(
    { id: "custom", pitch: input.pitch, bank: input.bank, power: input.power, dead: input.dead ?? "pitch", stuck: input.stuck ?? 0 },
    input.steps ?? 0,
    { pitch: input.pitch, bank: input.bank, power: input.power },
  );
}

export function resign(state: PilotState): PilotState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
