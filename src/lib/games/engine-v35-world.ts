/**
 * OIYO Web-Unity Engine v3.5 — Advanced Physics & Procedural World Generation (`engine-v35-world.ts`)
 *
 * Implements Horizon 2 of the Studio Engine Upgrade Roadmap:
 * 4. Falling-Sand Cellular Automata (`FallingSandAutomata2D`: Sand/Water/Fire/Oil/Wood/Acid/Steam/Stone reactions)
 * 5. XPBD Soft-Body & Cuttable Rope Physics (`XpbdSoftBody2D`: Area-preserving jelly & swipe line-segment slicing)
 * 6. Universal Wave Function Collapse & Voronoi Biome Generator (`WaveFunctionCollapse2D` & `generateVoronoiBiomes2D`)
 */

// ============================================================================
// 4. Falling-Sand Multi-Element Cellular Automata (Noita-Grade Pixel Physics)
// ============================================================================

export const enum SandElement {
  EMPTY = 0,
  WALL = 1,
  SAND = 2,
  WATER = 3,
  OIL = 4,
  FIRE = 5,
  WOOD = 6,
  ACID = 7,
  STEAM = 8,
  STONE = 9,
}

const ELEMENT_DENSITY: Record<SandElement, number> = {
  [SandElement.EMPTY]: 0,
  [SandElement.STEAM]: 1,
  [SandElement.FIRE]: 2,
  [SandElement.OIL]: 4,
  [SandElement.WATER]: 6,
  [SandElement.ACID]: 7,
  [SandElement.SAND]: 9,
  [SandElement.WOOD]: 100,
  [SandElement.STONE]: 100,
  [SandElement.WALL]: 999,
};

export class FallingSandAutomata2D {
  public readonly width: number;
  public readonly height: number;
  private readonly cells: Uint8Array;
  private readonly updatedStamp: Uint32Array;
  private stepCounter: number = 0;

  constructor(width: number, height: number) {
    this.width = Math.max(4, width);
    this.height = Math.max(4, height);
    this.cells = new Uint8Array(this.width * this.height);
    this.updatedStamp = new Uint32Array(this.width * this.height);
  }

  public getCell(x: number, y: number): SandElement {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return SandElement.WALL;
    }
    return this.cells[y * this.width + x] as SandElement;
  }

  public setCell(x: number, y: number, element: SandElement): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.cells[y * this.width + x] = element;
  }

  private swapCells(x1: number, y1: number, x2: number, y2: number): void {
    const idx1 = y1 * this.width + x1;
    const idx2 = y2 * this.width + x2;
    const tmp = this.cells[idx1];
    this.cells[idx1] = this.cells[idx2];
    this.cells[idx2] = tmp;
    this.updatedStamp[idx1] = this.stepCounter;
    this.updatedStamp[idx2] = this.stepCounter;
  }

  private canDisplace(mover: SandElement, target: SandElement): boolean {
    if (target === SandElement.EMPTY) return true;
    if (target >= SandElement.WOOD) return false;
    return ELEMENT_DENSITY[mover] > ELEMENT_DENSITY[target];
  }

  /**
   * Advances one cellular automata tick with chemical reactions and density displacement.
   */
  public step(): { activeReactions: number } {
    this.stepCounter += 1;
    const stamp = this.stepCounter;
    let activeReactions = 0;

    // Bottom-to-top scan for falling/liquid elements
    for (let y = this.height - 1; y >= 0; y--) {
      const leftToRight = (y + stamp) % 2 === 0;
      for (let i = 0; i < this.width; i++) {
        const x = leftToRight ? i : this.width - 1 - i;
        const idx = y * this.width + x;
        if (this.updatedStamp[idx] === stamp) continue;

        const el = this.cells[idx] as SandElement;
        if (el === SandElement.EMPTY || el === SandElement.WALL || el === SandElement.WOOD || el === SandElement.STONE) {
          continue;
        }

        // 1. Granular Powder: SAND
        if (el === SandElement.SAND) {
          if (y + 1 < this.height) {
            if (this.canDisplace(el, this.getCell(x, y + 1))) {
              this.swapCells(x, y, x, y + 1);
              continue;
            }
            const dir = (x + stamp) % 2 === 0 ? 1 : -1;
            if (this.canDisplace(el, this.getCell(x + dir, y + 1))) {
              this.swapCells(x, y, x + dir, y + 1);
              continue;
            }
            if (this.canDisplace(el, this.getCell(x - dir, y + 1))) {
              this.swapCells(x, y, x - dir, y + 1);
              continue;
            }
          }
          continue;
        }

        // 2. Liquids: WATER, OIL, ACID
        if (el === SandElement.WATER || el === SandElement.OIL || el === SandElement.ACID) {
          // Chemical reaction for ACID dissolving soluble neighbors
          if (el === SandElement.ACID) {
            const neighbors = [
              { nx: x, ny: y + 1 },
              { nx: x - 1, ny: y },
              { nx: x + 1, ny: y },
            ];
            let dissolved = false;
            for (const { nx, ny } of neighbors) {
              const target = this.getCell(nx, ny);
              if (target === SandElement.WOOD || target === SandElement.SAND || target === SandElement.STONE) {
                this.setCell(nx, ny, SandElement.EMPTY);
                this.setCell(x, y, SandElement.STEAM);
                this.updatedStamp[idx] = stamp;
                activeReactions += 1;
                dissolved = true;
                break;
              }
            }
            if (dissolved) continue;
          }

          if (y + 1 < this.height && this.canDisplace(el, this.getCell(x, y + 1))) {
            this.swapCells(x, y, x, y + 1);
            continue;
          }
          const dir = (x + y + stamp) % 2 === 0 ? 1 : -1;
          if (y + 1 < this.height && this.canDisplace(el, this.getCell(x + dir, y + 1))) {
            this.swapCells(x, y, x + dir, y + 1);
            continue;
          }
          if (this.canDisplace(el, this.getCell(x + dir, y))) {
            this.swapCells(x, y, x + dir, y);
            continue;
          }
          if (this.canDisplace(el, this.getCell(x - dir, y))) {
            this.swapCells(x, y, x - dir, y);
            continue;
          }
          continue;
        }

        // 3. Gases & Plasma: FIRE & STEAM (rise upward)
        if (el === SandElement.FIRE) {
          const neighbors = [
            { nx: x, ny: y - 1 },
            { nx: x, ny: y + 1 },
            { nx: x - 1, ny: y },
            { nx: x + 1, ny: y },
          ];
          for (const { nx, ny } of neighbors) {
            const nEl = this.getCell(nx, ny);
            if (nEl === SandElement.OIL || nEl === SandElement.WOOD) {
              this.setCell(nx, ny, SandElement.FIRE);
              this.updatedStamp[ny * this.width + nx] = stamp;
              activeReactions += 1;
            } else if (nEl === SandElement.WATER) {
              this.setCell(x, y, SandElement.STEAM);
              this.updatedStamp[idx] = stamp;
              activeReactions += 1;
              break;
            }
          }
          if (this.getCell(x, y) === SandElement.FIRE && y > 0 && this.getCell(x, y - 1) === SandElement.EMPTY) {
            this.swapCells(x, y, x, y - 1);
          }
          continue;
        }

        if (el === SandElement.STEAM) {
          if (y > 0 && this.getCell(x, y - 1) === SandElement.EMPTY) {
            this.swapCells(x, y, x, y - 1);
          }
        }
      }
    }

    return { activeReactions };
  }

  public countElement(element: SandElement): number {
    let count = 0;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] === element) count += 1;
    }
    return count;
  }
}

// ============================================================================
// 5. XPBD Soft-Body Jelly & Swipe-Cuttable Rope Physics Solver
// ============================================================================

export interface XpbdParticle2D {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  invMass: number; // 0 = pinned anchor
}

export interface XpbdDistanceConstraint {
  id: number;
  idxA: number;
  idxB: number;
  restLength: number;
  compliance: number; // 0 = rigid, >0 = elastic soft spring
  active: boolean;
}

export class XpbdSoftBody2D {
  public readonly particles: XpbdParticle2D[] = [];
  public readonly constraints: XpbdDistanceConstraint[] = [];
  public restArea: number = 0;

  public addParticle(x: number, y: number, invMass: number = 1.0): number {
    const idx = this.particles.length;
    this.particles.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx: 0,
      vy: 0,
      invMass,
    });
    return idx;
  }

  public addDistanceConstraint(idxA: number, idxB: number, compliance: number = 0.001): number {
    const pA = this.particles[idxA];
    const pB = this.particles[idxB];
    const restLength = Math.hypot(pB.x - pA.x, pB.y - pA.y);
    const id = this.constraints.length;
    this.constraints.push({
      id,
      idxA,
      idxB,
      restLength,
      compliance,
      active: true,
    });
    return id;
  }

  /**
   * Computes signed polygon area of the particle ring (for jelly inflation/volume preservation).
   */
  public computeSignedPolygonArea(): number {
    const n = this.particles.length;
    if (n < 3) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const p0 = this.particles[i];
      const p1 = this.particles[(i + 1) % n];
      sum += p0.x * p1.y - p1.x * p0.y;
    }
    return 0.5 * sum;
  }

  public lockRestAreaFromCurrentShape(): void {
    this.restArea = Math.abs(this.computeSignedPolygonArea());
  }

  /**
   * Steps XPBD integration + distance constraint projection + polygon area restoration.
   */
  public step(dtSeconds: number, gravityY: number = 300, subSteps: number = 4): void {
    const subDt = Math.max(0.0005, dtSeconds / Math.max(1, subSteps));

    for (let s = 0; s < subSteps; s++) {
      // 1. Predict positions
      for (const p of this.particles) {
        if (p.invMass <= 0) continue;
        p.prevX = p.x;
        p.prevY = p.y;
        p.vy += gravityY * subDt;
        p.x += p.vx * subDt;
        p.y += p.vy * subDt;
      }

      // 2. Project XPBD distance constraints
      for (const c of this.constraints) {
        if (!c.active) continue;
        const pA = this.particles[c.idxA];
        const pB = this.particles[c.idxB];
        const wSum = pA.invMass + pB.invMass;
        if (wSum <= 0) continue;

        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0.00001) continue;

        const alphaTilde = c.compliance / (subDt * subDt);
        const error = dist - c.restLength;
        const deltaLambda = -error / (wSum + alphaTilde);
        const corrX = (dx / dist) * deltaLambda;
        const corrY = (dy / dist) * deltaLambda;

        pA.x -= corrX * pA.invMass;
        pA.y -= corrY * pA.invMass;
        pB.x += corrX * pB.invMass;
        pB.y += corrY * pB.invMass;
      }

      // 3. Soft-body area-preservation pressure inflation (if restArea > 0)
      if (this.restArea > 0 && this.particles.length >= 3) {
        const currentArea = Math.abs(this.computeSignedPolygonArea());
        const areaError = this.restArea - currentArea;
        if (Math.abs(areaError) > 0.01) {
          let cx = 0;
          let cy = 0;
          for (const p of this.particles) {
            cx += p.x;
            cy += p.y;
          }
          cx /= this.particles.length;
          cy /= this.particles.length;

          const pressureScale = (areaError / this.restArea) * 0.15;
          for (const p of this.particles) {
            if (p.invMass <= 0) continue;
            p.x += (p.x - cx) * pressureScale;
            p.y += (p.y - cy) * pressureScale;
          }
        }
      }

      // 4. Update velocities from corrected positions
      for (const p of this.particles) {
        if (p.invMass <= 0) continue;
        p.vx = (p.x - p.prevX) / subDt;
        p.vy = (p.y - p.prevY) / subDt;
      }
    }
  }

  /**
   * Slices any active rope/spring constraint intersected by user blade swipe segment (x1,y1)->(x2,y2).
   */
  public sliceBySegment(x1: number, y1: number, x2: number, y2: number): number {
    let severedCount = 0;
    for (const c of this.constraints) {
      if (!c.active) continue;
      const pA = this.particles[c.idxA];
      const pB = this.particles[c.idxB];
      if (segmentsIntersect2D(x1, y1, x2, y2, pA.x, pA.y, pB.x, pB.y)) {
        c.active = false;
        severedCount += 1;
      }
    }
    return severedCount;
  }
}

export function segmentsIntersect2D(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const ccw = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) =>
    (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
  return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
         ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);
}

// ============================================================================
// 6. Universal Wave Function Collapse (WFC) & Voronoi Biome Generator
// ============================================================================

export interface WfcTileRule<TTileId extends string> {
  id: TTileId;
  weight: number;
  /** Socket tags for [North, East, South, West]. Adjacent tiles must have matching sockets. */
  sockets: [string, string, string, string];
}

export function solveWaveFunctionCollapse2D<TTileId extends string>(
  width: number,
  height: number,
  rules: ReadonlyArray<WfcTileRule<TTileId>>,
  rng: () => number
): TTileId[][] {
  const nTiles = rules.length;
  if (nTiles === 0) {
    throw new Error('WFC requires at least 1 tile rule');
  }

  // Domains: each cell holds boolean array of remaining compatible tile indices
  const domains: boolean[][][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Array.from({ length: nTiles }, () => true))
  );

  const countPossible = (x: number, y: number): number => {
    let c = 0;
    for (let i = 0; i < nTiles; i++) {
      if (domains[y][x][i]) c += 1;
    }
    return c;
  };

  const shannonEntropy = (x: number, y: number): number => {
    let sumWeights = 0;
    let sumWeightLogWeight = 0;
    for (let i = 0; i < nTiles; i++) {
      if (domains[y][x][i]) {
        const w = Math.max(0.001, rules[i].weight);
        sumWeights += w;
        sumWeightLogWeight += w * Math.log(w);
      }
    }
    if (sumWeights <= 0) return 0;
    return Math.log(sumWeights) - sumWeightLogWeight / sumWeights;
  };

  const dirs = [
    { dx: 0, dy: -1, myDir: 0, theirDir: 2 }, // North
    { dx: 1, dy: 0, myDir: 1, theirDir: 3 },  // East
    { dx: 0, dy: 1, myDir: 2, theirDir: 0 },  // South
    { dx: -1, dy: 0, myDir: 3, theirDir: 1 }, // West
  ];

  const propagate = (startX: number, startY: number): void => {
    const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      for (const d of dirs) {
        const nx = curr.x + d.dx;
        const ny = curr.y + d.dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        let changed = false;
        for (let tIdx = 0; tIdx < nTiles; tIdx++) {
          if (!domains[ny][nx][tIdx]) continue;
          const targetSocket = rules[tIdx].sockets[d.theirDir];

          // Check if at least one allowed tile in curr has matching socket
          let supported = false;
          for (let myIdx = 0; myIdx < nTiles; myIdx++) {
            if (domains[curr.y][curr.x][myIdx] && rules[myIdx].sockets[d.myDir] === targetSocket) {
              supported = true;
              break;
            }
          }

          if (!supported && countPossible(nx, ny) > 1) {
            domains[ny][nx][tIdx] = false;
            changed = true;
          }
        }

        if (changed) {
          stack.push({ x: nx, y: ny });
        }
      }
    }
  };

  const maxIterations = width * height * 2;
  for (let iter = 0; iter < maxIterations; iter++) {
    let minEntropy = Infinity;
    let bestX = -1;
    let bestY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const count = countPossible(x, y);
        if (count > 1) {
          const e = shannonEntropy(x, y) + rng() * 0.0001;
          if (e < minEntropy) {
            minEntropy = e;
            bestX = x;
            bestY = y;
          }
        }
      }
    }

    if (bestX === -1) break; // All cells collapsed!

    // Weighted random collapse at (bestX, bestY)
    let totalW = 0;
    for (let i = 0; i < nTiles; i++) {
      if (domains[bestY][bestX][i]) totalW += rules[i].weight;
    }

    let pick = rng() * totalW;
    let chosenIdx = 0;
    for (let i = 0; i < nTiles; i++) {
      if (!domains[bestY][bestX][i]) continue;
      pick -= rules[i].weight;
      if (pick <= 0) {
        chosenIdx = i;
        break;
      }
    }

    for (let i = 0; i < nTiles; i++) {
      domains[bestY][bestX][i] = i === chosenIdx;
    }

    propagate(bestX, bestY);
  }

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const idx = domains[y][x].findIndex(Boolean);
      return rules[Math.max(0, idx)].id;
    })
  );
}

export type BiomeKind = 'glacier' | 'taiga' | 'forest' | 'savanna' | 'desert' | 'volcanic';

export interface VoronoiSeedPoint {
  x: number;
  y: number;
  temperature: number; // [0..1]
  moisture: number;    // [0..1]
}

export function classifyWhittakerBiome(temperature: number, moisture: number): BiomeKind {
  if (temperature < 0.25) return 'glacier';
  if (temperature < 0.45) return 'taiga';
  if (temperature > 0.82 && moisture < 0.25) return 'volcanic';
  if (moisture < 0.3) return 'desert';
  if (moisture < 0.6) return 'savanna';
  return 'forest';
}

export function generateVoronoiBiomeGrid2D(
  width: number,
  height: number,
  seeds: ReadonlyArray<VoronoiSeedPoint>
): BiomeKind[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      let bestDistSq = Infinity;
      let nearest = seeds[0] ?? { x: 0, y: 0, temperature: 0.5, moisture: 0.5 };
      for (const s of seeds) {
        const dx = s.x - x;
        const dy = s.y - y;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          nearest = s;
        }
      }
      return classifyWhittakerBiome(nearest.temperature, nearest.moisture);
    })
  );
}
