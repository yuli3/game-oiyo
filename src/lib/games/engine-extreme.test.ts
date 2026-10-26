import { describe, expect, it } from 'vitest';
import { createSeededRng } from './engine-v2';
import {
  packInputBitmask,
  ProceduralAtlasBaker,
  RenderCommandRingBuffer,
  RenderOpCode,
  SdfLightField2D,
  unpackInputBitmask,
} from './engine-v3-render';
import {
  FallingSandAutomata2D,
  generateVoronoiBiomeGrid2D,
  SandElement,
  solveWaveFunctionCollapse2D,
  XpbdSoftBody2D,
} from './engine-v35-world';
import {
  decodeReplayToken,
  DeterministicReplayTape,
  encodeReplayToken,
  fnv1a32Checksum,
  LockstepPeerSession,
  ReplayGhostSampler,
  StudioGizmoInspector,
} from './engine-v4-net-tools';

describe('OIYO Web-Unity Engine v3.0 ~ v4.0 Extreme 9-Item Suite', () => {
  it('Item 1: packs/unpacks zero-GC RenderCommandRingBuffer and 32-bit input bitmasks', () => {
    const cmdBuf = new RenderCommandRingBuffer(64);
    cmdBuf.pushCameraTransform(120, 80, 1.5, 0.05);
    cmdBuf.pushSprite(50, 60, 32, 32, 0, 1.0, 7);
    cmdBuf.pushCircleGlow(100, 100, 24, 1.2, 0.8, 3);
    cmdBuf.pushLineBeam(0, 0, 200, 150, 4, 0.9, 5);

    expect(cmdBuf.getCount()).toBe(4);
    expect(cmdBuf.getRawFloat32View().length).toBe(32);

    const spriteCmd = cmdBuf.readCommand(1);
    expect(spriteCmd?.op).toBe(RenderOpCode.DRAW_SPRITE);
    expect(spriteCmd?.f7).toBe(7);

    const mask = packInputBitmask({ up: true, right: true, primary: true, dash: true });
    const unpacked = unpackInputBitmask(mask);
    expect(unpacked.up).toBe(true);
    expect(unpacked.right).toBe(true);
    expect(unpacked.primary).toBe(true);
    expect(unpacked.dash).toBe(true);
    expect(unpacked.down).toBe(false);
  });

  it('Item 2: computes 2D Signed Distance Field (SDF) and raymarches soft shadows around walls', () => {
    const sdf = new SdfLightField2D(12, 12);
    // Wall pillar at (6, 6)
    sdf.rebuildFromObstacleMask((x, y) => x === 6 && y === 6);

    expect(sdf.sampleSdf(6, 6)).toBe(0);
    expect(sdf.sampleSdf(6, 3)).toBeCloseTo(3, 1);

    const light = {
      x: 2,
      y: 6,
      radius: 12,
      intensity: 1.2,
      penumbraHardness: 8,
      r: 1.0,
      g: 0.9,
      b: 0.7,
    };

    // Unobstructed point at (4, 6) vs occluded shadow point behind wall at (10, 6)
    const litColor = sdf.evaluateMultiLightColor(4, 6, [light]);
    const shadowedColor = sdf.evaluateMultiLightColor(10, 6, [light]);
    expect(litColor.luma).toBeGreaterThan(shadowedColor.luma * 3);
  });

  it('Item 3: packs procedural sprites into a single texture atlas via shelf bin-packing', () => {
    const baker = new ProceduralAtlasBaker(256, 256);
    const regions = baker.packBatch([
      { id: 'boss-hull', width: 64, height: 64 },
      { id: 'laser-orb', width: 32, height: 32 },
      { id: 'spark-glow', width: 16, height: 16 },
    ]);

    expect(regions.length).toBe(3);
    const orb = baker.getRegion('laser-orb');
    expect(orb).toBeDefined();
    expect(orb!.u1).toBeGreaterThan(orb!.u0);
    expect(baker.getOccupancyRatio()).toBeGreaterThan(0);
  });

  it('Item 4: simulates Noita-style Falling-Sand density displacement and chemical reactions', () => {
    const sandSim = new FallingSandAutomata2D(8, 8);
    // Build a cup around (3, 3) so water cannot fall or spread sideways
    sandSim.setCell(3, 4, SandElement.WALL);
    sandSim.setCell(2, 4, SandElement.WALL);
    sandSim.setCell(4, 4, SandElement.WALL);
    sandSim.setCell(2, 3, SandElement.WALL);
    sandSim.setCell(4, 3, SandElement.WALL);

    // Sand above water -> sand sinks below water
    sandSim.setCell(3, 2, SandElement.SAND);
    sandSim.setCell(3, 3, SandElement.WATER);
    sandSim.step();
    expect(sandSim.getCell(3, 3)).toBe(SandElement.SAND);
    expect(sandSim.getCell(3, 2)).toBe(SandElement.WATER);

    // Acid dissolves wood and turns into steam
    sandSim.setCell(5, 4, SandElement.ACID);
    sandSim.setCell(5, 5, SandElement.WOOD);
    const res = sandSim.step();
    expect(res.activeReactions).toBeGreaterThanOrEqual(1);
    expect(sandSim.getCell(5, 5)).toBe(SandElement.EMPTY);
  });

  it('Item 5: solves XPBD area-preserving soft-body jelly and slices rope segments on swipe', () => {
    const soft = new XpbdSoftBody2D();
    const p0 = soft.addParticle(0, 0, 0); // pinned top anchor
    const p1 = soft.addParticle(0, 30, 1);
    const p2 = soft.addParticle(30, 30, 1);
    const p3 = soft.addParticle(30, 0, 1);

    soft.addDistanceConstraint(p0, p1, 0.0001);
    soft.addDistanceConstraint(p1, p2, 0.0001);
    soft.addDistanceConstraint(p2, p3, 0.0001);
    soft.addDistanceConstraint(p3, p0, 0.0001);
    soft.lockRestAreaFromCurrentShape();
    expect(soft.restArea).toBeCloseTo(900, 1);

    soft.step(0.05, 200, 4);
    expect(soft.particles[p1].y).toBeGreaterThan(30);

    // Swipe horizontal blade across (x=-10..10, y=15) to sever the p0-p1 vertical rope
    const cutCount = soft.sliceBySegment(-10, 15, 10, 15);
    expect(cutCount).toBeGreaterThanOrEqual(1);
  });

  it('Item 6: collapses Wave Function Collapse (WFC) socket grids and classifies Voronoi Whittaker biomes', () => {
    const rng = createSeededRng(42);
    const grid = solveWaveFunctionCollapse2D(
      4,
      4,
      [
        { id: 'sea', weight: 3, sockets: ['water', 'water', 'water', 'water'] },
        { id: 'coast', weight: 2, sockets: ['water', 'coast', 'land', 'coast'] },
        { id: 'island', weight: 2, sockets: ['land', 'land', 'land', 'land'] },
      ],
      rng
    );
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(4);

    const biomes = generateVoronoiBiomeGrid2D(4, 4, [
      { x: 0, y: 0, temperature: 0.1, moisture: 0.8 },
      { x: 3, y: 3, temperature: 0.9, moisture: 0.1 },
    ]);
    expect(biomes[0][0]).toBe('glacier');
    expect(biomes[3][3]).toBe('volcanic');
  });

  it('Item 7: compresses DeterministicReplayTape into a compact URL token and samples Ghost playback', () => {
    const tape = new DeterministicReplayTape(20261026, 60);
    tape.recordFrame(0, 0);
    tape.recordFrame(12, 5); // frame 12: mask 5
    tape.recordFrame(13, 5); // unchanged -> RLE skipped
    tape.recordFrame(45, 9); // frame 45: mask 9
    tape.recordFrame(120, 0);

    const token = encodeReplayToken(tape.exportPayload());
    expect(token.length).toBeLessThan(60);

    const decoded = decodeReplayToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.seed).toBe(20261026);
    expect(decoded!.events.length).toBe(3);

    const ghost = new ReplayGhostSampler(decoded!);
    expect(ghost.sampleInputAtFrame(5)).toBe(0);
    expect(ghost.sampleInputAtFrame(20)).toBe(5);
    expect(ghost.sampleInputAtFrame(60)).toBe(9);
    expect(ghost.sampleInputAtFrame(130)).toBe(0);
  });

  it('Item 8: records Unity Gizmos debug primitives and calculates p50/p95/p99 frame jitter', () => {
    const gizmo = new StudioGizmoInspector(true);
    gizmo.beginFrame(16.2);
    gizmo.beginFrame(16.6);
    gizmo.beginFrame(19.4);
    gizmo.drawAabb(10, 10, 40, 40, 'collider', 'Player');
    gizmo.drawViewCone(50, 50, 0, Math.PI / 3, 120);

    const summary = gizmo.getTelemetrySummary();
    expect(summary.activeGizmoCount).toBe(2);
    expect(summary.p95Ms).toBeGreaterThanOrEqual(16.6);
    expect(summary.fps).toBeGreaterThan(50);
  });

  it('Item 9: synchronizes P2P Lockstep inputs, detects GGPO prediction rollbacks, and computes FNV-1a checksums', () => {
    const session = new LockstepPeerSession(2);
    const pkt = session.submitLocalInput(10, 0b101);
    expect(pkt.frame).toBe(12);

    // At frame 12, remote packet hasn't arrived yet -> predicts last confirmed mask (0)
    const predictedStep = session.resolveFrameInputs(12);
    expect(predictedStep.localMask).toBe(0b101);
    expect(predictedStep.remoteMask).toBe(0);
    expect(predictedStep.isRemotePredicted).toBe(true);

    // Late remote packet arrives for frame 12 with mask 0b110 -> triggers GGPO rollback!
    const rollbackCheck = session.receiveRemotePacket({
      type: 'INPUT_FRAME',
      frame: 12,
      inputMask: 0b110,
    });
    expect(rollbackCheck.needsRollback).toBe(true);
    expect(rollbackCheck.rollbackFromFrame).toBe(12);

    const hashA = fnv1a32Checksum([10.5, 20.25, 100]);
    const hashB = fnv1a32Checksum([10.5, 20.25, 100]);
    const hashC = fnv1a32Checksum([10.5, 20.26, 100]);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });
});
