import { describe, expect, it } from "vitest";
import {
  ArchetypeEcsWorld,
  ArcLengthSpline2D,
  computeAdaptiveFmodMix,
  computeDijkstraFlowField2D,
  createFixedTimestep,
  EcsComponentFlag,
  evaluatePostProcessVolume,
  FallingSandAutomata2D,
  SandElement,
  SaveMigrationVault,
  solveFabrikChain2D,
  ZeroGcObjectPool,
} from "./engine";

describe("Unified Engine SDK (engine.ts barrel)", () => {
  it("exports v2.0 core algorithms seamlessly", () => {
    const ts = createFixedTimestep(1000 / 60, 1.0);
    expect(ts.fixedDeltaMs).toBeCloseTo(1000 / 60);

    const pool = new ZeroGcObjectPool(4, (idx) => ({ id: idx, active: false, val: 0 }));
    const obj = pool.acquire((item) => { item.val = 42; });
    expect(obj.active).toBe(true);
    expect(obj.val).toBe(42);

    const grid = computeDijkstraFlowField2D(4, 4, () => false, [{ x: 3, y: 3 }]);
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(4);

    const fmod = computeAdaptiveFmodMix(0.5, 0.8);
    expect(fmod.ambientPadGain).toBeGreaterThan(0);
  });

  it("exports v3.5 world simulation systems", () => {
    const sand = new FallingSandAutomata2D(8, 8);
    sand.setCell(4, 0, SandElement.SAND);
    sand.step();
    expect(sand.getCell(4, 1)).toBe(SandElement.SAND);
  });

  it("exports v5.0 extreme systems", () => {
    const ecs = new ArchetypeEcsWorld(64);
    const e = ecs.spawn(EcsComponentFlag.TRANSFORM | EcsComponentFlag.HEALTH, 10, 20, 100);
    expect(e).toBeGreaterThanOrEqual(0);
    expect(ecs.x[e]).toBe(10);
    expect(ecs.y[e]).toBe(20);

    const ik = solveFabrikChain2D(
      [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
      15,
      15
    );
    expect(ik.joints.length).toBe(3);

    const spline = new ArcLengthSpline2D([
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
    ]);
    const mid = spline.sampleAtDistance(spline.totalLength * 0.5);
    expect(mid.x).toBeGreaterThan(0);

    const pp = evaluatePostProcessVolume({
      damageTrauma: 0.5,
      temperatureCelsius: -30,
      isTimeFrozen: false,
    });
    expect(pp.frostVignetteAlpha).toBeGreaterThan(0);

    const vault = new SaveMigrationVault<{ score: number }>(2);
    vault.registerMigration(1, (old: { points: number }) => ({ score: old.points }));
    const packed = vault.pack({ score: 250 });
    const unpacked = vault.unpackAndMigrate(packed);
    expect(unpacked.status).toBe("ok");
    expect(unpacked.payload?.score).toBe(250);
  });
});
