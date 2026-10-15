import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  BARE,
  CAMERA_POSES,
  FEED,
  LEN,
  MARK_Z,
  ROOM_Z,
  STEP_CAP,
  TRACK,
  cellX,
  createHunt,
  makeHunt,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepHunt,
  type Act,
  type HuntState,
} from "./quiet-hunt";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "opened-feed": ["S", "R", "R"],
  "two-shots": ["S", "R", "S", "R"],
  "kept-west": ["R", "S", "R", "R", "S"],
  "east-feed": ["S", "R", "S", "R", "S", "R"],
};

function replay(id: string, actions: readonly Act[]): HuntState {
  return actions.reduce((state, action) => stepHunt(state, action), createHunt(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createHunt(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: HuntState): string {
  // The wind is part of the photograph, so the same traces with the vane elsewhere are a different picture.
  return `${state.cells.join("")}:${state.wind}`;
}

function shortest(start: HuntState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: HuntState[] = [start];
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
      const next = stepHunt(cur, action);
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
      if (nextDist >= STEP_CAP || nextDist >= goalDist) continue;
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

describe("quiet hunt", () => {
  it("puts east on screen-right and the mark above the field from the +z camera", () => {
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
      const field = new Vector3(cellX(2), 0.2, ROOM_Z);
      expect(mark.project(camera).y).toBeGreaterThan(field.project(camera).y);
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

  it("keeps one hand-checked order for each hunt, and the mark keeps a feed and a bare plot", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createHunt(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.steps).toBe(0);
      expect(start.read).toEqual([]);
      expect(start.cells).not.toEqual(start.goal);
      expect(start.goal.some((cell) => cell === FEED)).toBe(true);
      expect(start.goal.some((cell) => cell === BARE)).toBe(true);
      expect(start.goalWind).toBeGreaterThanOrEqual(0);
      expect(start.goalWind).toBeLessThan(LEN);
      let state = start;
      for (const action of solution) {
        const before = state;
        state = stepHunt(state, action);
        expect(state).not.toBe(before);
        if (action !== solution[solution.length - 1]) expect(state.status).toBe("play");
      }
      expect(state.status).toBe("win");
      expect(state.steps).toBe(solution.length);
      expect(state.read).toEqual(solution);
      expect(state.loseReason).toBeNull();
      expect(state.cells).toEqual(state.goal);
      expect(state.wind).toBe(state.goalWind);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("reads only the westernmost footprint and walks the wind one plot east", () => {
    const read = stepHunt(makeHunt({
      cells: [TRACK, TRACK, FEED, BARE, BARE],
      wind: 0,
      goal: [FEED, FEED, FEED, FEED, FEED],
      goalWind: 4,
    }), "R");
    expect(read.cells).toEqual([FEED, TRACK, FEED, BARE, BARE]);
    expect(read.wind).toBe(1);

    const onto = stepHunt(makeHunt({
      cells: [BARE, TRACK, BARE, BARE, BARE],
      wind: 0,
      goal: [FEED, FEED, FEED, FEED, FEED],
      goalWind: 4,
    }), "R");
    expect(onto.cells).toEqual([BARE, FEED, BARE, BARE, BARE]);
    expect(onto.wind).toBe(1);
    expect(stepHunt(onto, "S").cells).toEqual([BARE, BARE, BARE, BARE, BARE]);

    const off = stepHunt(makeHunt({
      cells: [TRACK, BARE, BARE, BARE, BARE],
      wind: 0,
      goal: [FEED, FEED, FEED, FEED, FEED],
      goalWind: 4,
    }), "R");
    expect(off.cells).toEqual([FEED, BARE, BARE, BARE, BARE]);
    expect(off.wind).toBe(1);
    expect(stepHunt(off, "S")).toBe(off);

    const held = stepHunt(makeHunt({
      cells: [BARE, BARE, BARE, BARE, TRACK],
      wind: 4,
      goal: [FEED, FEED, FEED, FEED, FEED],
      goalWind: 0,
    }), "R");
    expect(held.cells).toEqual([BARE, BARE, BARE, BARE, FEED]);
    expect(held.wind).toBe(4);
  });

  it("clears only the feed under the wind", () => {
    const shot = stepHunt(makeHunt({
      cells: [FEED, FEED, TRACK, BARE, BARE],
      wind: 0,
      goal: [TRACK, TRACK, TRACK, TRACK, TRACK],
    }), "S");
    expect(shot.cells).toEqual([BARE, FEED, TRACK, BARE, BARE]);
    expect(shot.wind).toBe(0);

    const missed = makeHunt({
      cells: [TRACK, FEED, BARE, BARE, BARE],
      wind: 0,
      goal: [BARE, BARE, BARE, BARE, BARE],
    });
    expect(stepHunt(missed, "S")).toBe(missed);
  });

  it("leaves an act with nothing to read or shoot on the same field", () => {
    const bare = makeHunt({
      cells: [BARE, BARE, BARE, BARE, BARE],
      wind: 2,
      goal: [FEED, BARE, BARE, BARE, BARE],
      goalWind: 0,
    });
    expect(stepHunt(bare, "R")).toBe(bare);
    expect(stepHunt(bare, "S")).toBe(bare);
    expect(bare.steps).toBe(0);
    expect(openActions(bare)).toEqual([]);
    const tracks = makeHunt({
      cells: [TRACK, TRACK, TRACK, TRACK, TRACK],
      wind: 1,
      goal: [BARE, BARE, BARE, BARE, BARE],
    });
    expect(stepHunt(tracks, "S")).toBe(tracks);
  });

  it("wins on the eighth act when the mark matches, and stops when it does not", () => {
    const aimed = makeHunt({
      cells: [FEED, BARE, BARE, BARE, BARE],
      wind: 0,
      goal: [BARE, BARE, BARE, BARE, BARE],
      goalWind: 0,
      steps: 7,
    });
    const won = stepHunt(aimed, "S");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.loseReason).toBeNull();
    expect(won.wind).toBe(0);

    const missed = makeHunt({
      cells: [FEED, BARE, BARE, BARE, BARE],
      wind: 0,
      goal: [FEED, FEED, FEED, FEED, FEED],
      goalWind: 1,
      steps: 7,
    });
    const capped = stepHunt(missed, "S");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);

    const still = makeHunt({
      cells: [BARE, BARE, BARE, BARE, BARE],
      wind: 0,
      goal: [FEED, BARE, BARE, BARE, BARE],
      goalWind: 0,
      steps: 7,
    });
    expect(stepHunt(still, "R")).toBe(still);
    expect(still.steps).toBe(7);

    const early = makeHunt({
      cells: [FEED, TRACK, TRACK, BARE, BARE],
      wind: 0,
      goal: [BARE, FEED, FEED, BARE, BARE],
      goalWind: 2,
      steps: 7,
    });
    expect(stepHunt(early, "R").status).not.toBe("win");
    expect(stepHunt(early, "S").status).not.toBe("win");
    expect(shortest(early)).toEqual([]);
  });

  it("counts two equal-length orders as more than one answer", () => {
    const split = makeHunt({
      cells: [TRACK, TRACK, BARE, BARE, FEED],
      wind: 3,
      goal: [FEED, FEED, BARE, BARE, BARE],
      goalWind: 4,
    });
    const shootLate = ["R", "S", "R"] as const;
    const shootLast = ["R", "R", "S"] as const;
    expect(shootLate.reduce((state, action) => stepHunt(state, action), split).status).toBe("win");
    expect(shootLast.reduce((state, action) => stepHunt(state, action), split).status).toBe("win");
    expect(shortest(split)).toEqual([]);
  });

  it("stops a resigned or finished field on the same state", () => {
    const start = createHunt(seedFor("opened-feed"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(stopped.steps).toBe(start.steps);
    expect(resign(stopped)).toBe(stopped);
    expect(stepHunt(stopped, "R")).toBe(stopped);
    const won = replay("opened-feed", SOLUTIONS["opened-feed"]);
    expect(stepHunt(won, "S")).toBe(won);
    expect(resign(won)).toBe(won);
    const lost = stepHunt(makeHunt({
      cells: [FEED, BARE, BARE, BARE, BARE],
      wind: 0,
      goal: [FEED, FEED, FEED, FEED, FEED],
      goalWind: 1,
      steps: 7,
    }), "S");
    expect(stepHunt(lost, "R")).toBe(lost);
    expect(resign(lost)).toBe(lost);
  });

  it("rebuilds the same field from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const hunt = createHunt(seed);
      expect(createHunt(seed)).toEqual(hunt);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(hunt.cells).toHaveLength(LEN);
      expect(hunt.goal).toHaveLength(LEN);
      seen.add(hunt.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createHunt(Number.NaN).puzzleId).toBe(createHunt(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createHunt(seedFor("opened-feed")))).toEqual(["R", "S"]);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./quiet-hunt.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/QuietHunt.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/QuietHuntScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(screen.includes("openActions")).toBe(false);
    expect(logic.includes("opened-feed: [")).toBe(false);
    expect(logic.includes("two-shots: [")).toBe(false);
    expect(logic.includes("kept-west: [")).toBe(false);
    expect(logic.includes("east-feed: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("setFromUnitVectors")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
    expect(screen.includes("一時停止")).toBe(true);
  });
});
