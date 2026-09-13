export const TIME_LOOP_RULESET_VERSION = "time-loop-rescue-v2";
export const TIME_LOOP_STEP_SECONDS = 1 / 30;
export const TIME_LOOP_TICKS = 600;
export const TIME_LOOP_MAX_LOOPS = 3;

export type TimeLoopInput = Readonly<{ x: -1 | 0 | 1; y: -1 | 0 | 1 }>;
export type TimeLoopPoint = Readonly<{ x: number; y: number }>;
export type TimeLoopPhase = "playing" | "rescued" | "failed";

export type TimeLoopMission = Readonly<{
  phase: TimeLoopPhase;
  loop: number;
  tick: number;
  player: TimeLoopPoint;
  carrying: boolean;
  recordings: readonly (readonly TimeLoopPoint[])[];
  currentRecording: readonly TimeLoopPoint[];
}>;

export type TimeLoopAction =
  | Readonly<{ type: "tick"; input: TimeLoopInput }>
  | Readonly<{ type: "commit-loop" }>
  | Readonly<{ type: "reset" }>;

const SCALE = 1_000;
const PLAYER_RADIUS = 17 * SCALE;
const SPEED_PER_TICK = 5_933;

export const TIME_LOOP_ROOM = Object.freeze({
  width: 960 * SCALE,
  height: 540 * SCALE,
  start: Object.freeze({ x: 92 * SCALE, y: 270 * SCALE }),
  door: Object.freeze({ x: 468 * SCALE, y: 205 * SCALE, width: 24 * SCALE, height: 130 * SCALE }),
  plate: Object.freeze({ x: 160 * SCALE, y: 120 * SCALE, radius: 34 * SCALE }),
  rescue: Object.freeze({ x: 750 * SCALE, y: 255 * SCALE, radius: 18 * SCALE }),
  exit: Object.freeze({ x: 830 * SCALE, y: 440 * SCALE, width: 76 * SCALE, height: 62 * SCALE }),
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const squaredDistance = (a: TimeLoopPoint, b: TimeLoopPoint) => {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return x * x + y * y;
};

function move(point: TimeLoopPoint, input: TimeLoopInput, doorOpen: boolean): TimeLoopPoint {
  const diagonal = input.x !== 0 && input.y !== 0;
  const delta = diagonal ? Math.round(SPEED_PER_TICK / Math.SQRT2) : SPEED_PER_TICK;
  const next = {
    x: clamp(point.x + input.x * delta, PLAYER_RADIUS, TIME_LOOP_ROOM.width - PLAYER_RADIUS),
    y: clamp(point.y + input.y * delta, PLAYER_RADIUS, TIME_LOOP_ROOM.height - PLAYER_RADIUS),
  };
  const door = TIME_LOOP_ROOM.door;
  const overlapsDivider = (x: number) => x + PLAYER_RADIUS > door.x && x - PLAYER_RADIUS < door.x + door.width;
  const inPassage = doorOpen && point.y - PLAYER_RADIUS >= door.y && point.y + PLAYER_RADIUS <= door.y + door.height;
  if (overlapsDivider(next.x) && !inPassage) {
    next.x = point.x < door.x + door.width / 2 ? door.x - PLAYER_RADIUS : door.x + door.width + PLAYER_RADIUS;
  }
  if (overlapsDivider(next.x)) {
    next.y = clamp(next.y, door.y + PLAYER_RADIUS, door.y + door.height - PLAYER_RADIUS);
  }
  return next;
}

// Capture resolved positions: replay must preserve collisions and the door state
// experienced by the original run, without re-simulating it in a different loop.
export function timeLoopGhostPosition(recording: readonly TimeLoopPoint[], tick: number): TimeLoopPoint {
  const index = Math.min(Math.max(0, Math.trunc(tick)), recording.length) - 1;
  return recording[index] ?? TIME_LOOP_ROOM.start;
}

export function timeLoopGhosts(mission: TimeLoopMission): readonly TimeLoopPoint[] {
  return mission.recordings.map((recording) => timeLoopGhostPosition(recording, mission.tick));
}

export function isTimeLoopPlateHeld(mission: TimeLoopMission): boolean {
  const reach = TIME_LOOP_ROOM.plate.radius + PLAYER_RADIUS;
  return [mission.player, ...timeLoopGhosts(mission)]
    .some((point) => squaredDistance(point, TIME_LOOP_ROOM.plate) <= reach * reach);
}

export function createTimeLoopMission(): TimeLoopMission {
  return {
    phase: "playing",
    loop: 1,
    tick: 0,
    player: TIME_LOOP_ROOM.start,
    carrying: false,
    recordings: [],
    currentRecording: [],
  };
}

function commitLoop(mission: TimeLoopMission): TimeLoopMission {
  if (mission.phase !== "playing") return mission;
  if (mission.currentRecording.length === 0) return mission;
  if (mission.loop >= TIME_LOOP_MAX_LOOPS) return { ...mission, phase: "failed" };
  return {
    ...mission,
    loop: mission.loop + 1,
    tick: 0,
    player: TIME_LOOP_ROOM.start,
    carrying: false,
    recordings: [...mission.recordings, mission.currentRecording],
    currentRecording: [],
  };
}

export function advanceTimeLoop(mission: TimeLoopMission, action: TimeLoopAction): TimeLoopMission {
  if (action.type === "reset") return createTimeLoopMission();
  if (action.type === "commit-loop") return commitLoop(mission);
  if (mission.phase !== "playing") return mission;

  const player = move(mission.player, action.input, isTimeLoopPlateHeld(mission));
  const rescueReach = TIME_LOOP_ROOM.rescue.radius + PLAYER_RADIUS;
  const carrying = mission.carrying
    || squaredDistance(player, TIME_LOOP_ROOM.rescue) <= rescueReach * rescueReach;
  const exit = TIME_LOOP_ROOM.exit;
  const rescued = carrying && player.x >= exit.x && player.x <= exit.x + exit.width
    && player.y >= exit.y && player.y <= exit.y + exit.height;
  const next: TimeLoopMission = {
    ...mission,
    phase: rescued ? "rescued" : "playing",
    tick: mission.tick + 1,
    player,
    carrying,
    currentRecording: [...mission.currentRecording, player],
  };
  return next.tick >= TIME_LOOP_TICKS ? commitLoop(next) : next;
}

export function timeLoopFingerprint(mission: TimeLoopMission): string {
  return JSON.stringify({
    ruleset: TIME_LOOP_RULESET_VERSION,
    phase: mission.phase,
    loop: mission.loop,
    tick: mission.tick,
    player: mission.player,
    carrying: mission.carrying,
    recordings: mission.recordings,
    currentRecording: mission.currentRecording,
  });
}
