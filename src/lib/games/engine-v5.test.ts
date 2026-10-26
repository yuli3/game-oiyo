import { describe, expect, it } from 'vitest';
import {
  ArchetypeEcsWorld,
  ArcLengthSpline2D,
  btCondition,
  btInvert,
  btSelector,
  btSequence,
  computeSteeringBoids2D,
  EcsComponentFlag,
  evaluateBayer4x4Dither,
  evaluatePostProcessVolume,
  runMonteCarloBalanceAudit,
  SaveMigrationVault,
  shatterBoxVoronoi2D,
  solveFabrikChain2D,
  synthesizeFormantSyllable,
} from './engine-v5';

describe('OIYO Web-Unity Engine v5.0 — 10-Pillar Extreme SDK (engine-v5)', () => {
  it('Pillar 1: spawns, queries, and steps SoA ECS entities with zero heap allocations', () => {
    const world = new ArchetypeEcsWorld(128);
    const e1 = world.spawn(EcsComponentFlag.TRANSFORM | EcsComponentFlag.VELOCITY, 10, 20);
    const e2 = world.spawn(EcsComponentFlag.TRANSFORM | EcsComponentFlag.HEALTH, 50, 50);

    world.vx[e1] = 100;
    world.vy[e1] = -40;

    const moved = world.stepKinematics(0.5);
    expect(moved).toBe(1);
    expect(world.x[e1]).toBeCloseTo(60, 2);
    expect(world.y[e1]).toBeCloseTo(0, 2);
    expect(world.x[e2]).toBe(50);

    world.destroy(e2);
    expect(world.getActiveCount()).toBe(1);
  });

  it('Pillar 2: solves 2D FABRIK multi-joint inverse kinematics chains', () => {
    const chain = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 60, y: 0 },
    ];
    const solved = solveFabrikChain2D(chain, 35, 35, 12, 0.5);
    expect(solved.reached).toBe(true);
    expect(solved.joints[0].x).toBeCloseTo(0, 2);
    expect(solved.joints[2].x).toBeCloseTo(35, 0);
    expect(solved.joints[2].y).toBeCloseTo(35, 0);
  });

  it('Pillar 3: shatters rigid boxes into Voronoi radial shards with outward impulse', () => {
    const shards = shatterBoxVoronoi2D(100, 100, 60, 40, 100, 100, 240, 8);
    expect(shards.length).toBe(8);
    expect(shards[0].verticesLocal.length).toBe(3);
    expect(Math.hypot(shards[0].vx, shards[0].vy)).toBeGreaterThan(5);
  });

  it('Pillar 4: computes Reynolds Boid steering with neighbor separation and goal seeking', () => {
    const agent = { id: 1, x: 50, y: 50, vx: 10, vy: 0, maxSpeed: 80, radius: 10 };
    const crowdingNeighbor = { id: 2, x: 52, y: 50, vx: 10, vy: 0, maxSpeed: 80, radius: 10 };
    const vel = computeSteeringBoids2D(agent, [crowdingNeighbor], 200, 50);
    expect(Math.hypot(vel.vx, vel.vy)).toBeLessThanOrEqual(80.1);
  });

  it('Pillar 5: executes composable Behavior Tree nodes over a shared Blackboard', () => {
    interface BossBb {
      hp: number;
      enraged: boolean;
      attacked: boolean;
    }

    const tree = btSelector<BossBb>([
      btSequence([
        btCondition((bb) => bb.hp < 30),
        btInvert(btCondition((bb) => bb.enraged)),
        (bb) => {
          bb.enraged = true;
          return 'SUCCESS';
        },
      ]),
      (bb) => {
        bb.attacked = true;
        return 'SUCCESS';
      },
    ]);

    const bb: BossBb = { hp: 20, enraged: false, attacked: false };
    expect(tree(bb)).toBe('SUCCESS');
    expect(bb.enraged).toBe(true);
    expect(bb.attacked).toBe(false);

    // Second tick: already enraged -> falls through to attack branch
    expect(tree(bb)).toBe('SUCCESS');
    expect(bb.attacked).toBe(true);
  });

  it('Pillar 6 & 7: synthesizes Formant voice syllables and evaluates Post-Process + Bayer 4x4 dithering', () => {
    const voice = synthesizeFormantSyllable('A'.charCodeAt(0), 'fairy-soprano');
    expect(voice.fundamentalHz).toBeGreaterThan(250);
    expect(voice.formant2Hz).toBeGreaterThan(voice.formant1Hz);

    expect(evaluateBayer4x4Dither(0, 0, 0.95)).toBe(1);
    expect(evaluateBayer4x4Dither(0, 0, 0.0)).toBe(0);

    const pp = evaluatePostProcessVolume({
      damageTrauma: 0.8,
      temperatureCelsius: -55,
      isTimeFrozen: true,
    });
    expect(pp.chromaticAberrationPx).toBeGreaterThan(3);
    expect(pp.frostVignetteAlpha).toBeGreaterThan(0.5);
    expect(pp.desaturationRatio).toBe(0.92);
  });

  it('Pillar 8: parameterizes Catmull-Rom splines by arc-length for constant-speed conveyor/missile travel', () => {
    const spline = new ArcLengthSpline2D([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 150, y: 50 },
    ]);
    expect(spline.totalLength).toBeGreaterThan(140);

    const mid = spline.sampleAtDistance(spline.totalLength * 0.5);
    expect(mid.x).toBeGreaterThan(40);
    expect(mid.x).toBeLessThan(110);
  });

  it('Pillar 9: migrates versioned saves and recovers from shadowBackup when primary checksum fails', () => {
    const vault = new SaveMigrationVault<{ gold: number; gems: number }>(2);
    vault.registerMigration(1, (v1: { coins: number }) => ({
      gold: v1.coins,
      gems: 5,
    }));

    // Pack v1 envelope manually via temporary v1 vault
    const v1Vault = new SaveMigrationVault<{ coins: number }>(1);
    const v1Env = v1Vault.pack({ coins: 250 });

    const migrated = vault.unpackAndMigrate(v1Env);
    expect(migrated.status).toBe('migrated');
    expect(migrated.payload).toEqual({ gold: 250, gems: 5 });

    // Tamper primary checksum -> recovers from valid shadow backup
    const validLatest = vault.pack({ gold: 900, gems: 20 });
    const tamperedPrimary = { ...validLatest, checksum: 12345 };
    const recovered = vault.unpackAndMigrate(tamperedPrimary, validLatest);
    expect(recovered.status).toBe('recovered-from-backup');
    expect(recovered.payload?.gold).toBe(900);
  });

  it('Pillar 10: audits game balance via headless Monte-Carlo runs and Gini dominance coefficient', () => {
    const archetypes = ['blade', 'frost', 'poison'];
    const report = runMonteCarloBalanceAudit(300, (idx) => ({
      won: idx % 2 === 0,
      turns: 12 + (idx % 5),
      winningArchetypeId: archetypes[idx % archetypes.length],
    }));

    expect(report.totalRuns).toBe(300);
    expect(report.winRate).toBeCloseTo(0.5, 2);
    expect(report.archetypeGiniCoefficient).toBeLessThan(0.1);
    expect(report.isBalanced).toBe(true);
  });
});
