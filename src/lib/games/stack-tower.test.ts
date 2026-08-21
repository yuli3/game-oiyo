import { describe, expect, it } from "vitest";
import {
  BASE_WIDTH,
  MAX_SPEED,
  PERFECT_EPSILON,
  PERFECT_REWARD,
  START_SPEED,
  cameraOffset,
  createTowerState,
  dropOnto,
  explainTowerMiss,
  spawnNextBlock,
  stepBlock,
  type Block,
} from "./stack-tower";

const W = 360;

describe("stack tower initial state", () => {
  it("centers the base block and starts the moving block at the left edge", () => {
    const state = createTowerState(W);
    expect(state.stack).toEqual([{ x: (W - BASE_WIDTH) / 2, w: BASE_WIDTH, hue: 210 }]);
    expect(state.cur.x).toBe(0);
    expect(state.dir).toBe(1);
    expect(state.speed).toBe(START_SPEED);
    expect(state.combo).toBe(0);
  });
});

describe("stack tower block movement", () => {
  const block: Block = { x: 100, w: 150, hue: 200 };

  it("moves by dir * speed * deltaScale", () => {
    const { block: next } = stepBlock(block, 1, 10, 1, W);
    expect(next.x).toBe(110);
  });

  it("bounces off the left edge and clamps to 0", () => {
    const { block: next, dir } = stepBlock({ ...block, x: 5 }, -1, 10, 1, W);
    expect(next.x).toBe(0);
    expect(dir).toBe(1);
  });

  it("bounces off the right edge and clamps inside the field", () => {
    const { block: next, dir } = stepBlock({ ...block, x: W - 155 }, 1, 10, 1, W);
    expect(next.x).toBe(W - block.w);
    expect(dir).toBe(-1);
  });

  it("scales displacement with deltaScale for frame-rate independence", () => {
    const at1x = stepBlock(block, 1, 10, 1, W).block.x;
    const at2x = stepBlock(block, 1, 10, 2, W).block.x;
    expect(at2x - block.x).toBeCloseTo((at1x - block.x) * 2, 8);
  });
});

describe("stack tower drop resolution", () => {
  const prev: Block = { x: 100, w: 150, hue: 210 };

  it("misses when there is no overlap at all", () => {
    expect(dropOnto({ x: 400, w: 50, hue: 0 }, prev, 3)).toEqual({ kind: "miss" });
  });

  it("names the side of a complete miss", () => {
    expect(explainTowerMiss({ x: 0, w: 50, hue: 0 }, prev)).toBe("left");
    expect(explainTowerMiss({ x: 260, w: 50, hue: 0 }, prev)).toBe("right");
    expect(explainTowerMiss({ x: 120, w: 50, hue: 0 }, prev)).toBeNull();
  });

  it("keeps only the geometric overlap on a non-perfect landing and resets the combo", () => {
    const cur: Block = { x: 120, w: 150, hue: 40 }; // offset by 20px, well outside PERFECT_EPSILON
    const outcome = dropOnto(cur, prev, 5);
    expect(outcome.kind).toBe("landed");
    if (outcome.kind !== "landed") throw new Error("unreachable");
    expect(outcome.perfect).toBe(false);
    expect(outcome.combo).toBe(0);
    // overlap is [120, 250] intersect [100, 250] = [120, 250] -> width 130
    expect(outcome.block).toEqual({ x: 120, w: 130, hue: 40 });
  });

  it("keeps the moving block's width (grown toward BASE_WIDTH) on a dead-centre landing and extends the combo", () => {
    const shrunkPrev: Block = { x: 100, w: 100, hue: 210 };
    const cur: Block = { x: 100 + PERFECT_EPSILON, w: 100, hue: 40 }; // within epsilon of dead-centre
    const outcome = dropOnto(cur, shrunkPrev, 2);
    expect(outcome.kind).toBe("landed");
    if (outcome.kind !== "landed") throw new Error("unreachable");
    expect(outcome.perfect).toBe(true);
    expect(outcome.combo).toBe(3);
    expect(outcome.block).toEqual({ x: 100, w: 100 + PERFECT_REWARD, hue: 40 });
  });

  it("caps the perfect-landing regrowth at BASE_WIDTH rather than overshooting it", () => {
    const wideStack: Block = { x: 50, w: BASE_WIDTH, hue: 210 };
    const cur: Block = { x: 50, w: BASE_WIDTH, hue: 40 };
    const outcome = dropOnto(cur, wideStack, 0);
    expect(outcome.kind).toBe("landed");
    if (outcome.kind !== "landed") throw new Error("unreachable");
    expect(outcome.block.w).toBe(BASE_WIDTH);
  });
});

describe("stack tower next-block spawn", () => {
  it("enters from the left and moves right after the tower was sliding left", () => {
    const { block, dir } = spawnNextBlock(120, 200, -1, 3, W);
    expect(block.x).toBe(0);
    expect(dir).toBe(1);
  });

  it("enters from the right and moves left after the tower was sliding right", () => {
    const { block, dir } = spawnNextBlock(120, 200, 1, 3, W);
    expect(block.x).toBe(W - 120);
    expect(dir).toBe(-1);
  });

  it("cycles the hue and increments speed, capped at MAX_SPEED", () => {
    const { block, speed } = spawnNextBlock(120, 350, 1, 3, W);
    expect(block.hue).toBe((350 + 24) % 360);
    expect(speed).toBeCloseTo(3.09, 8);
    const { speed: capped } = spawnNextBlock(120, 200, 1, MAX_SPEED, W);
    expect(capped).toBe(MAX_SPEED);
  });
});

describe("stack tower camera", () => {
  it("stays at 0 until the tower passes the halfway mark of the viewport", () => {
    expect(cameraOffset(1, 480)).toBe(0);
    expect(cameraOffset(5, 480)).toBe(0); // 5*26=130, well under 480-160=320
  });

  it("follows the tower once it climbs past the fold", () => {
    // towerTop = 20*26 = 520; viewport headroom = 480-160 = 320 -> offset 200
    expect(cameraOffset(20, 480)).toBe(200);
  });
});
