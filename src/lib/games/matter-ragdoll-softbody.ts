/**
 * OIYO Matter.js Soft-Body & Destructible Ragdoll Engine (`matter-ragdoll-softbody.ts`)
 *
 * Implements Research Goal 6:
 * - SoftBodyLattice2D: Organic mass-spring jelly mesh with cross-damped structural constraints
 * - ModularRagdoll2D: Hierarchical pin-jointed mechanical ragdoll with impulse threshold joint severing
 */

import Matter from 'matter-js';

const {
  Bodies,
  Composite,
  Constraint,
} = Matter;

// ============================================================================
// 1. SoftBodyLattice2D (Jelly & Slime Physics)
// ============================================================================

export interface SoftBodyConfig {
  x: number;
  y: number;
  columns: number;
  rows: number;
  columnGap: number;
  rowGap: number;
  particleRadius: number;
  stiffness?: number; // 0.05..0.4 (lower = jello, higher = rubber)
  damping?: number;   // 0.05..0.2
}

export class SoftBodyLattice2D {
  public composite: Matter.Composite;
  public particles: Matter.Body[] = [];
  public constraints: Matter.Constraint[] = [];
  public readonly config: Required<SoftBodyConfig>;

  constructor(config: SoftBodyConfig) {
    this.config = {
      x: config.x,
      y: config.y,
      columns: Math.max(2, config.columns),
      rows: Math.max(2, config.rows),
      columnGap: Math.max(5, config.columnGap),
      rowGap: Math.max(5, config.rowGap),
      particleRadius: Math.max(2, config.particleRadius),
      stiffness: config.stiffness ?? 0.12,
      damping: config.damping ?? 0.08,
    };

    this.composite = Composite.create({ label: 'SoftBodyLattice' });
    this.buildLattice();
  }

  private buildLattice(): void {
    const { x, y, columns, rows, columnGap, rowGap, particleRadius, stiffness, damping } = this.config;
    const grid: Matter.Body[][] = [];

    // 1. Create 2D array of particles
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < columns; c++) {
        const px = x + (c - (columns - 1) / 2) * columnGap;
        const py = y + (r - (rows - 1) / 2) * rowGap;

        const p = Bodies.circle(px, py, particleRadius, {
          density: 0.002,
          frictionAir: 0.02,
          restitution: 0.6,
        });

        this.particles.push(p);
        grid[r][c] = p;
        Composite.add(this.composite, p);
      }
    }

    // 2. Connect horizontal, vertical, and cross diagonal structural springs
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const current = grid[r][c];

        // Horizontal constraint
        if (c < columns - 1) {
          const right = grid[r][c + 1];
          this.addSpring(current, right, stiffness, damping);
        }

        // Vertical constraint
        if (r < rows - 1) {
          const down = grid[r + 1][c];
          this.addSpring(current, down, stiffness, damping);
        }

        // Diagonal cross springs (gives volumetric shear resistance)
        if (r < rows - 1 && c < columns - 1) {
          const diagDownRight = grid[r + 1][c + 1];
          this.addSpring(current, diagDownRight, stiffness * 0.8, damping);

          const diagDownLeft = grid[r + 1][c];
          const right = grid[r][c + 1];
          this.addSpring(diagDownLeft, right, stiffness * 0.8, damping);
        }
      }
    }
  }

  private addSpring(bodyA: Matter.Body, bodyB: Matter.Body, stiffness: number, damping: number): void {
    const spring = Constraint.create({
      bodyA,
      bodyB,
      stiffness,
      damping,
      render: { visible: false },
    });
    this.constraints.push(spring);
    Composite.add(this.composite, spring);
  }

  /**
   * Calculates center of mass of the jelly softbody.
   */
  public getCenterOfMass(): { x: number; y: number } {
    let totalX = 0;
    let totalY = 0;
    const len = this.particles.length;
    if (len === 0) return { x: 0, y: 0 };

    for (let i = 0; i < len; i++) {
      totalX += this.particles[i].position.x;
      totalY += this.particles[i].position.y;
    }
    return { x: totalX / len, y: totalY / len };
  }
}

// ============================================================================
// 2. ModularRagdoll2D (Destructible Jointed Mechanical Boss)
// ============================================================================

export interface RagdollPart {
  id: string;
  body: Matter.Body;
  severable: boolean;
}

export interface RagdollJoint {
  id: string;
  constraint: Matter.Constraint;
  breakImpulseThreshold: number; // Impulse force above which joint snaps
  intact: boolean;
}

export class ModularRagdoll2D {
  public composite: Matter.Composite;
  public parts: Map<string, RagdollPart> = new Map();
  public joints: RagdollJoint[] = [];

  constructor() {
    this.composite = Composite.create({ label: 'ModularRagdoll' });
  }

  public addPart(id: string, body: Matter.Body, severable: boolean = true): void {
    this.parts.set(id, { id, body, severable });
    Composite.add(this.composite, body);
  }

  public addJoint(
    id: string,
    partIdA: string,
    partIdB: string,
    options: {
      pointA?: { x: number; y: number };
      pointB?: { x: number; y: number };
      stiffness?: number;
      breakImpulseThreshold?: number;
    } = {}
  ): void {
    const partA = this.parts.get(partIdA);
    const partB = this.parts.get(partIdB);
    if (!partA || !partB) {
      throw new Error(`Cannot connect joint: Part '${partIdA}' or '${partIdB}' not found.`);
    }

    const constraint = Constraint.create({
      bodyA: partA.body,
      bodyB: partB.body,
      pointA: options.pointA ?? { x: 0, y: 0 },
      pointB: options.pointB ?? { x: 0, y: 0 },
      stiffness: options.stiffness ?? 0.85,
    });

    const jointRecord: RagdollJoint = {
      id,
      constraint,
      breakImpulseThreshold: options.breakImpulseThreshold ?? 350,
      intact: true,
    };

    this.joints.push(jointRecord);
    Composite.add(this.composite, constraint);
  }

  /**
   * Evaluates joint stresses and snaps any joint that exceeds its break threshold.
   */
  public evaluateJointStress(): string[] {
    const severedJointIds: string[] = [];

    for (const j of this.joints) {
      if (!j.intact || !j.constraint.bodyA || !j.constraint.bodyB) continue;

      const vA = j.constraint.bodyA.velocity;
      const vB = j.constraint.bodyB.velocity;
      const relSpeed = Math.hypot(vA.x - vB.x, vA.y - vB.y);
      const massFactor = (j.constraint.bodyA.mass + j.constraint.bodyB.mass) / 2;
      const stressImpulse = relSpeed * massFactor * 10;

      if (stressImpulse >= j.breakImpulseThreshold) {
        // Sever the joint!
        j.intact = false;
        Composite.remove(this.composite, j.constraint);
        severedJointIds.push(j.id);
      }
    }

    return severedJointIds;
  }
}
