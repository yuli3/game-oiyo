import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  EMPTY,
  FIRE,
  ICE,
  LEN,
  MARK_Z,
  ROOM_Z,
  STEP_CAP,
  WATER,
  cellX,
  createRoom,
  makeRoom,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepRoom,
  type Act,
  type RoomState,
} from "./sentence-dungeon";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "first-thaw": ["M", "Q", "D"],
  "twin-ice": ["M", "M", "Q", "D"],
  "shore-water": ["M", "D", "Q", "Q"],
  "long-clause": ["Q", "D", "M", "Q", "D"],
};

function replay(id: string, actions: readonly Act[]): RoomState {
  return actions.reduce((state, action) => stepRoom(state, action), createRoom(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createRoom(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: RoomState): string {
  return state.cells.join("");
}

function shortest(start: RoomState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: RoomState[] = [start];
  let head = 0;
  let goalDist = Number.POSITIVE_INFINITY;
  let goalWays = 0;
  const goalPaths: Act[][] = [];
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    const curKey = key(cur);
    const curDist = dist.get(curKey) ?? 0;
    if (curDist > goalDist) continue;
    const curWays = ways.get(curKey) ?? 0;
    const curPath = via.get(curKey) ?? [];
    for (const action of ACTS) {
      const next = stepRoom(cur, action);
      if (next === cur || next.status === "lose") continue;
      const nextDist = curDist + 1;
      const path = [...curPath, action];
      if (next.status === "win") {
        if (nextDist < goalDist) {
          goalDist = nextDist;
          goalWays = curWays;
          goalPaths.length = 0;
          if (curWays === 1) goalPaths.push(path);
        } else if (nextDist === goalDist) {
          goalWays += curWays;
          goalPaths.length = 0;
        }
        continue;
      }
      if (nextDist >= goalDist) continue;
      const id = key(next);
      const prev = dist.get(id);
      if (prev === undefined) {
        dist.set(id, nextDist);
        ways.set(id, curWays);
        if (curWays === 1) via.set(id, path);
        queue.push(next);
      } else if (nextDist === prev) {
        ways.set(id, (ways.get(id) ?? 0) + curWays);
        via.delete(id);
      }
    }
  }
  if (goalWays !== 1) return [];
  return goalPaths;
}

describe("sentence dungeon", () => {
  it("puts east on screen-right and the mark above the corridor from the +z camera", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(cellX(LEN - 1)).toBeGreaterThan(cellX(0));
    expect(MARK_Z).toBeLessThan(ROOM_Z);
    const page = new Vector3(0, 0, 0);
    for (const pose of CAMERA_POSES) {
      expect(pose[2]).toBeGreaterThan(2);
      expect(Math.hypot(pose[0], pose[1])).toBeLessThan(pose[2]);
      const camera = new PerspectiveCamera(36, 1, 0.1, 40);
      camera.position.set(pose[0], pose[1], pose[2]);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const dir = new Vector3();
      camera.getWorldDirection(dir);
      expect(dir.z).toBeLessThan(-0.7);
      expect(dir.dot(page.clone().sub(camera.position).normalize())).toBeGreaterThan(0.9);
      const mark = new Vector3(cellX(2), 0.35, MARK_Z);
      const room = new Vector3(cellX(2), 0.2, ROOM_Z);
      expect(mark.project(camera).y).toBeGreaterThan(room.project(camera).y);
    }
    const camera = new PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const east = new Vector3(cellX(LEN - 1), 0, 0);
    const west = new Vector3(cellX(0), 0, 0);
    expect(east.dot(right)).toBeGreaterThan(west.dot(right));
  });

  it("keeps one hand-checked sentence for each room", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createRoom(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.steps).toBe(0);
      expect(start.read).toEqual([]);
      expect(start.cells).not.toEqual(start.goal);
      let state = start;
      for (const action of solution) {
        const before = state;
        state = stepRoom(state, action);
        expect(state).not.toBe(before);
        expect(state.cells).not.toEqual(before.cells);
        if (action !== solution[solution.length - 1]) expect(state.status).toBe("play");
      }
      expect(state.status).toBe("win");
      expect(state.steps).toBe(solution.length);
      expect(state.read).toEqual(solution);
      expect(state.loseReason).toBeNull();
      expect(state.cells).toEqual(state.goal);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("reads only the westernmost pair and leaves a sentence with no subject unread", () => {
    const start = createRoom(seedFor("first-thaw"));
    expect(stepRoom(start, "Q")).toBe(start);
    expect(stepRoom(start, "D")).toBe(start);
    const melted = stepRoom(start, "M");
    expect(melted).not.toBe(start);
    expect(melted.cells).toEqual([FIRE, WATER, FIRE, EMPTY, EMPTY]);
    expect(melted.steps).toBe(1);
    expect(stepRoom(melted, "M")).toBe(melted);

    const both = makeRoom({
      cells: [FIRE, ICE, FIRE, ICE, EMPTY],
      goal: [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    });
    expect(stepRoom(both, "M").cells).toEqual([FIRE, WATER, FIRE, ICE, EMPTY]);
  });

  it("wins on the eighth sentence when the mark matches, and stops when it does not", () => {
    const drying = makeRoom({
      cells: [FIRE, WATER, EMPTY, EMPTY, EMPTY],
      goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY],
      steps: 7,
    });
    const won = stepRoom(drying, "D");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.loseReason).toBeNull();

    const melting = makeRoom({
      cells: [FIRE, ICE, EMPTY, EMPTY, EMPTY],
      goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY],
      steps: 7,
    });
    const capped = stepRoom(melting, "M");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    expect(capped.cells[1]).toBe(WATER);

    const quiet = makeRoom({
      cells: [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY],
      steps: 7,
    });
    expect(stepRoom(quiet, "M")).toBe(quiet);
    expect(quiet.steps).toBe(7);

    const late = makeRoom({
      cells: [FIRE, ICE, FIRE, EMPTY, EMPTY],
      goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY],
      steps: 7,
    });
    expect(shortest(late)).toEqual([]);
  });

  it("counts two equal-length sentences as more than one answer", () => {
    const split = makeRoom({
      cells: [FIRE, ICE, FIRE, ICE, FIRE],
      goal: [FIRE, EMPTY, FIRE, EMPTY, FIRE],
    });
    const eastThen = ["M", "D", "M", "D"] as const;
    const bothThen = ["M", "M", "D", "D"] as const;
    expect(eastThen.reduce((state, action) => stepRoom(state, action), split).status).toBe("win");
    expect(bothThen.reduce((state, action) => stepRoom(state, action), split).status).toBe("win");
    expect(shortest(split)).toEqual([]);
  });

  it("stops a resigned or finished room on the same state", () => {
    const start = createRoom(seedFor("first-thaw"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(stopped.steps).toBe(start.steps);
    expect(resign(stopped)).toBe(stopped);
    expect(stepRoom(stopped, "M")).toBe(stopped);
    const won = replay("first-thaw", SOLUTIONS["first-thaw"]);
    expect(stepRoom(won, "D")).toBe(won);
    expect(resign(won)).toBe(won);
    const lost = stepRoom(makeRoom({
      cells: [FIRE, ICE, EMPTY, EMPTY, EMPTY],
      goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY],
      steps: 7,
    }), "M");
    expect(stepRoom(lost, "D")).toBe(lost);
    expect(resign(lost)).toBe(lost);
  });

  it("rebuilds the same room from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const room = createRoom(seed);
      expect(createRoom(seed)).toEqual(room);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(room.cells).toHaveLength(LEN);
      expect(room.goal).toHaveLength(LEN);
      seen.add(room.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createRoom(Number.NaN).puzzleId).toBe(createRoom(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createRoom(seedFor("first-thaw")))).toEqual(["M"]);
    expect(openActions(createRoom(seedFor("long-clause"))).length).toBe(3);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./sentence-dungeon.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/SentenceDungeon.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/SentenceDungeonScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("first-thaw: [")).toBe(false);
    expect(logic.includes("twin-ice: [")).toBe(false);
    expect(logic.includes("shore-water: [")).toBe(false);
    expect(logic.includes("long-clause: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("setFromUnitVectors")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
    expect(screen.includes("一時停止")).toBe(true);
  });
});
