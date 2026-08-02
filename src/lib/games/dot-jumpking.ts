export const JUMP_W = 400,
  JUMP_H = 600,
  JUMP_SAVE_VERSION = 1;
export type JumpStatus = "playing" | "over";
export type JumpPlatform = { x: number; y: number; w: number };
export type JumpState = {
  v: 1;
  seed: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  charge: number;
  aim: number;
  camY: number;
  maxClimb: number;
  status: JumpStatus;
  frames: number;
};

function random(seed: number, index: number) {
  let x = (seed ^ (index * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
export function platformAt(seed: number, index: number): JumpPlatform {
  return {
    x: Math.round(random(seed, index) * 310),
    y: 460 - index * 90,
    w: 90,
  };
}
export function visiblePlatforms(state: JumpState) {
  const first = Math.max(
    0,
    Math.floor((460 - (state.camY + JUMP_H + 100)) / 90),
  );
  const last = Math.max(first, Math.ceil((460 - (state.camY - 120)) / 90));
  return Array.from({ length: last - first + 1 }, (_, i) =>
    platformAt(state.seed, first + i),
  );
}
export function createJumpState(seed = Date.now() >>> 0): JumpState {
  return {
    v: 1,
    seed: seed >>> 0,
    x: 200,
    y: 508,
    vx: 0,
    vy: 0,
    onGround: true,
    charge: 0,
    aim: 200,
    camY: 0,
    maxClimb: 508,
    status: "playing",
    frames: 0,
  };
}
export function chargeJump(
  state: JumpState,
  amount = 1.6,
  aim = state.aim,
): JumpState {
  return state.status === "playing" && state.onGround
    ? {
        ...state,
        charge: Math.min(100, state.charge + amount),
        aim: Math.max(0, Math.min(400, aim)),
      }
    : state;
}
export function releaseJump(state: JumpState): JumpState {
  if (state.status !== "playing" || !state.onGround || state.charge <= 0)
    return state;
  const power = state.charge / 100,
    dir = Math.max(-1, Math.min(1, (state.aim - state.x) / 200));
  return {
    ...state,
    onGround: false,
    vy: -(7 + power * 9),
    vx: dir * (2 + power * 4),
    charge: 0,
  };
}
export function stepJump(state: JumpState, scale = 1): JumpState {
  if (state.status !== "playing" || !Number.isFinite(scale) || scale <= 0)
    return state;
  let { x, y, vx, vy, onGround, camY, maxClimb } = state;
  if (!onGround) {
    vy += 0.35 * scale;
    const prev = y;
    y += vy * scale;
    x += vx * scale;
    if (x < 12) {
      x = 12;
      vx *= -0.6;
    }
    if (x > 388) {
      x = 388;
      vx *= -0.6;
    }
    if (vy > 0) {
      for (const p of visiblePlatforms({
        ...state,
        x,
        y,
        vx,
        vy,
        onGround,
        camY,
        maxClimb,
      })) {
        if (
          prev + 12 <= p.y &&
          y + 12 >= p.y &&
          x >= p.x - 6 &&
          x <= p.x + p.w + 6
        ) {
          y = p.y - 12;
          vy = 0;
          vx = 0;
          onGround = true;
          break;
        }
      }
      if (!onGround && y + 12 >= 540 && maxClimb > 400) {
        y = 528;
        vy = 0;
        vx = 0;
        onGround = true;
      }
    }
  }
  maxClimb = Math.min(maxClimb, y);
  camY = Math.min(camY, y - 300);
  const status: JumpStatus = y > camY + 680 ? "over" : "playing";
  return {
    ...state,
    x,
    y,
    vx,
    vy,
    onGround,
    camY,
    maxClimb,
    status,
    frames: state.frames + 1,
  };
}
export function jumpHeight(state: JumpState) {
  return Math.max(0, Math.floor((508 - state.maxClimb) / 10));
}
export function serializeJump(state: JumpState) {
  return JSON.stringify({ ...state, savedAt: Date.now() });
}
export function parseJump(
  raw: string | null,
  now = Date.now(),
): JumpState | null {
  try {
    const x = JSON.parse(raw ?? "");
    const nums = [
      "seed",
      "x",
      "y",
      "vx",
      "vy",
      "charge",
      "aim",
      "camY",
      "maxClimb",
      "frames",
    ];
    if (
      x?.v !== 1 ||
      x.status !== "playing" ||
      typeof x.onGround !== "boolean" ||
      nums.some((k) => !Number.isFinite(x[k])) ||
      x.seed < 0 ||
      x.x < 0 ||
      x.x > 400 ||
      x.charge < 0 ||
      x.charge > 100 ||
      !Number.isFinite(x.savedAt) ||
      now - x.savedAt > 24 * 60 * 60 * 1000 ||
      x.savedAt > now + 60000
    )
      return null;
    const { savedAt: _, ...state } = x;
    return state as JumpState;
  } catch {
    return null;
  }
}
