/**
 * Poly Bridge Truss Architect (#139) — Verlet Structural Stress & Bridge Physics Engine
 *
 * Implements:
 * - 3 Gorge Levels with fixed anchor pins (Left/Right banks, central pier, suspension towers)
 * - 3 Materials: Road Deck (`road`), Wood Truss (`wood`), Steel Girder/Cable (`steel`)
 * - Verlet point-mass position integration & iterative distance constraint relaxation
 * - Real-time tensile/compressive Stress Ratio (0% green -> 100% red fracture) & beam snapping
 * - 1-click Auto-Truss Blueprint builder & Heavy Truck traversal simulation
 */

export type BridgeMaterial = 'road' | 'wood' | 'steel';

export interface MaterialSpec {
  id: BridgeMaterial;
  costPerUnit: number; // cost per 60px
  maxLength: number;
  maxStrain: number; // relative stretch/compression before fracture
  stiffness: number;
  mass: number;
}

export const MATERIAL_SPECS: Record<BridgeMaterial, MaterialSpec> = {
  road: {
    id: 'road',
    costPerUnit: 110,
    maxLength: 135,
    maxStrain: 0.16,
    stiffness: 0.92,
    mass: 2.2,
  },
  wood: {
    id: 'wood',
    costPerUnit: 65,
    maxLength: 145,
    maxStrain: 0.18,
    stiffness: 0.88,
    mass: 1.2,
  },
  steel: {
    id: 'steel',
    costPerUnit: 140,
    maxLength: 185,
    maxStrain: 0.28,
    stiffness: 0.98,
    mass: 1.8,
  },
};

export interface BridgeNode {
  id: number;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  baseX: number;
  baseY: number;
  pinned: boolean;
}

export interface BridgeBeam {
  id: number;
  nodeA: number;
  nodeB: number;
  material: BridgeMaterial;
  restLength: number;
  stressRatio: number; // 0..1+
  broken: boolean;
  cost: number;
}

export interface BridgeTruck {
  x: number;
  y: number;
  vy: number;
  angle: number;
  weight: number;
  speed: number;
}

export interface BridgeLevelDef {
  index: number;
  nameKey: string;
  budget: number;
  truckWeight: number;
  leftBankX: number;
  rightBankX: number;
  deckY: number;
  anchors: Array<{ x: number; y: number }>;
  blueprintNodes: Array<{ x: number; y: number }>;
  blueprintBeams: Array<{ a: number; b: number; material: BridgeMaterial }>;
}

export const BRIDGE_LEVELS: BridgeLevelDef[] = [
  {
    index: 0,
    nameKey: 'pine_creek',
    budget: 2500,
    truckWeight: 180,
    leftBankX: 180,
    rightBankX: 580,
    deckY: 220,
    anchors: [
      { x: 180, y: 220 }, // 0: Left deck anchor
      { x: 580, y: 220 }, // 1: Right deck anchor
      { x: 180, y: 290 }, // 2: Left lower cliff anchor
      { x: 580, y: 290 }, // 3: Right lower cliff anchor
    ],
    blueprintNodes: [
      { x: 280, y: 220 }, // 4
      { x: 380, y: 220 }, // 5
      { x: 480, y: 220 }, // 6
      { x: 280, y: 155 }, // 7 (top truss)
      { x: 380, y: 145 }, // 8 (top truss apex)
      { x: 480, y: 155 }, // 9 (top truss)
    ],
    blueprintBeams: [
      // Road deck
      { a: 0, b: 4, material: 'road' },
      { a: 4, b: 5, material: 'road' },
      { a: 5, b: 6, material: 'road' },
      { a: 6, b: 1, material: 'road' },
      // Top arch & verticals
      { a: 0, b: 7, material: 'wood' },
      { a: 7, b: 8, material: 'wood' },
      { a: 8, b: 9, material: 'wood' },
      { a: 9, b: 1, material: 'wood' },
      { a: 4, b: 7, material: 'wood' },
      { a: 5, b: 8, material: 'wood' },
      { a: 6, b: 9, material: 'wood' },
      { a: 4, b: 8, material: 'wood' },
      { a: 6, b: 8, material: 'wood' },
      // Lower cliff struts
      { a: 2, b: 4, material: 'steel' },
      { a: 3, b: 6, material: 'steel' },
    ],
  },
  {
    index: 1,
    nameKey: 'twin_canyon',
    budget: 2400,
    truckWeight: 230,
    leftBankX: 160,
    rightBankX: 600,
    deckY: 220,
    anchors: [
      { x: 160, y: 220 }, // 0: Left bank
      { x: 600, y: 220 }, // 1: Right bank
      { x: 380, y: 270 }, // 2: Central stone pier
    ],
    blueprintNodes: [
      { x: 270, y: 220 }, // 3
      { x: 380, y: 220 }, // 4
      { x: 490, y: 220 }, // 5
      { x: 270, y: 150 }, // 6
      { x: 380, y: 150 }, // 7
      { x: 490, y: 150 }, // 8
    ],
    blueprintBeams: [
      { a: 0, b: 3, material: 'road' },
      { a: 3, b: 4, material: 'road' },
      { a: 4, b: 5, material: 'road' },
      { a: 5, b: 1, material: 'road' },
      { a: 2, b: 4, material: 'steel' },
      { a: 2, b: 3, material: 'steel' },
      { a: 2, b: 5, material: 'steel' },
      { a: 0, b: 6, material: 'wood' },
      { a: 6, b: 7, material: 'wood' },
      { a: 7, b: 8, material: 'wood' },
      { a: 8, b: 1, material: 'wood' },
      { a: 3, b: 6, material: 'wood' },
      { a: 4, b: 7, material: 'wood' },
      { a: 5, b: 8, material: 'wood' },
    ],
  },
  {
    index: 2,
    nameKey: 'suspension_abyss',
    budget: 3200,
    truckWeight: 260,
    leftBankX: 160,
    rightBankX: 600,
    deckY: 225,
    anchors: [
      { x: 160, y: 225 }, // 0: Left deck
      { x: 600, y: 225 }, // 1: Right deck
      { x: 160, y: 105 }, // 2: Left suspension tower top
      { x: 600, y: 105 }, // 3: Right suspension tower top
    ],
    blueprintNodes: [
      { x: 270, y: 225 }, // 4
      { x: 380, y: 225 }, // 5
      { x: 490, y: 225 }, // 6
      { x: 380, y: 150 }, // 7
    ],
    blueprintBeams: [
      { a: 0, b: 4, material: 'road' },
      { a: 4, b: 5, material: 'road' },
      { a: 5, b: 6, material: 'road' },
      { a: 6, b: 1, material: 'road' },
      { a: 2, b: 4, material: 'steel' },
      { a: 2, b: 7, material: 'steel' },
      { a: 3, b: 6, material: 'steel' },
      { a: 3, b: 7, material: 'steel' },
      { a: 4, b: 7, material: 'wood' },
      { a: 5, b: 7, material: 'wood' },
      { a: 6, b: 7, material: 'wood' },
    ],
  },
];

export interface PolyBridgeState {
  phase: 'build' | 'simulating' | 'victory' | 'collapsed';
  levelIndex: number;
  selectedMaterial: BridgeMaterial;
  selectedNodeId: number | null;
  nodes: BridgeNode[];
  beams: BridgeBeam[];
  budget: number;
  spent: number;
  maxStressPeak: number;
  brokenBeamsCount: number;
  truck: BridgeTruck;
  levelsCleared: number;
  nextId: number;
}

export function computeBeamCost(length: number, material: BridgeMaterial): number {
  const spec = MATERIAL_SPECS[material];
  return Math.max(15, Math.round((length / 60) * spec.costPerUnit));
}

export function createBridgeLevelState(
  levelIndex = 0,
  levelsCleared = 0
): PolyBridgeState {
  const safeIdx = ((levelIndex % BRIDGE_LEVELS.length) + BRIDGE_LEVELS.length) % BRIDGE_LEVELS.length;
  const lvl = BRIDGE_LEVELS[safeIdx];

  const nodes: BridgeNode[] = lvl.anchors.map((a, idx) => ({
    id: idx,
    x: a.x,
    y: a.y,
    oldX: a.x,
    oldY: a.y,
    baseX: a.x,
    baseY: a.y,
    pinned: true,
  }));

  return {
    phase: 'build',
    levelIndex: safeIdx,
    selectedMaterial: 'road',
    selectedNodeId: null,
    nodes,
    beams: [],
    budget: lvl.budget,
    spent: 0,
    maxStressPeak: 0,
    brokenBeamsCount: 0,
    truck: {
      x: lvl.leftBankX - 70,
      y: lvl.deckY,
      vy: 0,
      angle: 0,
      weight: lvl.truckWeight,
      speed: 105,
    },
    levelsCleared,
    nextId: nodes.length,
  };
}

export function applyAutoTrussBlueprint(state: PolyBridgeState): PolyBridgeState {
  const lvl = BRIDGE_LEVELS[state.levelIndex];
  const baseState = createBridgeLevelState(state.levelIndex, state.levelsCleared);

  const nodes = [...baseState.nodes];
  let nextId = baseState.nextId;

  for (const bn of lvl.blueprintNodes) {
    nodes.push({
      id: nextId++,
      x: bn.x,
      y: bn.y,
      oldX: bn.x,
      oldY: bn.y,
      baseX: bn.x,
      baseY: bn.y,
      pinned: false,
    });
  }

  const beams: BridgeBeam[] = [];
  let spent = 0;

  for (const bb of lvl.blueprintBeams) {
    const na = nodes[bb.a];
    const nb = nodes[bb.b];
    if (!na || !nb) continue;
    const len = Math.hypot(nb.x - na.x, nb.y - na.y);
    const cost = computeBeamCost(len, bb.material);
    spent += cost;
    beams.push({
      id: nextId++,
      nodeA: na.id,
      nodeB: nb.id,
      material: bb.material,
      restLength: len,
      stressRatio: 0,
      broken: false,
      cost,
    });
  }

  return {
    ...baseState,
    nodes,
    beams,
    spent,
    nextId,
  };
}

export function addOrConnectBridgeNode(
  state: PolyBridgeState,
  targetX: number,
  targetY: number
): PolyBridgeState {
  if (state.phase !== 'build') return state;

  // Snap to existing node within 24px
  const existing = state.nodes.find(
    (n) => Math.hypot(n.x - targetX, n.y - targetY) <= 24
  );

  if (state.selectedNodeId === null) {
    if (existing) {
      return {
        ...state,
        selectedNodeId: existing.id,
      };
    }
    return state;
  }

  const fromNode = state.nodes.find((n) => n.id === state.selectedNodeId);
  if (!fromNode) {
    return { ...state, selectedNodeId: null };
  }

  if (existing && existing.id === fromNode.id) {
    return { ...state, selectedNodeId: null };
  }

  const destX = existing ? existing.x : Math.round(targetX / 10) * 10;
  const destY = existing ? existing.y : Math.round(targetY / 10) * 10;
  const dist = Math.hypot(destX - fromNode.x, destY - fromNode.y);
  const spec = MATERIAL_SPECS[state.selectedMaterial];

  if (dist < 25 || dist > spec.maxLength) {
    return { ...state, selectedNodeId: existing ? existing.id : null };
  }

  const cost = computeBeamCost(dist, state.selectedMaterial);
  if (state.spent + cost > state.budget) {
    return { ...state, selectedNodeId: null };
  }

  let nodes = [...state.nodes];
  let nextId = state.nextId;
  let toNodeId: number;

  if (existing) {
    toNodeId = existing.id;
  } else {
    toNodeId = nextId++;
    nodes.push({
      id: toNodeId,
      x: destX,
      y: destY,
      oldX: destX,
      oldY: destY,
      baseX: destX,
      baseY: destY,
      pinned: false,
    });
  }

  // Prevent duplicate beam between same pair
  const duplicate = state.beams.some(
    (b) =>
      (b.nodeA === fromNode.id && b.nodeB === toNodeId) ||
      (b.nodeA === toNodeId && b.nodeB === fromNode.id)
  );
  if (duplicate) {
    return { ...state, selectedNodeId: toNodeId };
  }

  const newBeam: BridgeBeam = {
    id: nextId++,
    nodeA: fromNode.id,
    nodeB: toNodeId,
    material: state.selectedMaterial,
    restLength: dist,
    stressRatio: 0,
    broken: false,
    cost,
  };

  return {
    ...state,
    nodes,
    beams: [...state.beams, newBeam],
    spent: state.spent + cost,
    selectedNodeId: toNodeId,
    nextId,
  };
}

export function startBridgeSimulation(state: PolyBridgeState): PolyBridgeState {
  if (state.phase !== 'build') return state;
  const lvl = BRIDGE_LEVELS[state.levelIndex];
  const nodes = state.nodes.map((n) => ({
    ...n,
    x: n.baseX,
    y: n.baseY,
    oldX: n.baseX,
    oldY: n.baseY,
  }));
  const beams = state.beams.map((b) => ({
    ...b,
    stressRatio: 0,
    broken: false,
  }));

  return {
    ...state,
    phase: 'simulating',
    selectedNodeId: null,
    nodes,
    beams,
    maxStressPeak: 0,
    brokenBeamsCount: 0,
    truck: {
      x: lvl.leftBankX - 70,
      y: lvl.deckY,
      vy: 0,
      angle: 0,
      weight: lvl.truckWeight,
      speed: 105,
    },
  };
}

export function resetBridgeToBuild(state: PolyBridgeState): PolyBridgeState {
  const lvl = BRIDGE_LEVELS[state.levelIndex];
  return {
    ...state,
    phase: 'build',
    nodes: state.nodes.map((n) => ({
      ...n,
      x: n.baseX,
      y: n.baseY,
      oldX: n.baseX,
      oldY: n.baseY,
    })),
    beams: state.beams.map((b) => ({
      ...b,
      stressRatio: 0,
      broken: false,
    })),
    truck: {
      x: lvl.leftBankX - 70,
      y: lvl.deckY,
      vy: 0,
      angle: 0,
      weight: lvl.truckWeight,
      speed: 105,
    },
  };
}

export function stepBridgePhysics(state: PolyBridgeState, dt: number): PolyBridgeState {
  if (state.phase !== 'simulating') return state;

  const clampedDt = Math.min(dt, 0.04);
  const lvl = BRIDGE_LEVELS[state.levelIndex];
  const nodes = state.nodes.map((n) => ({ ...n }));
  const beams = state.beams.map((b) => ({ ...b }));
  const nodeMap = new Map<number, BridgeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const truck = { ...state.truck };

  // 1. Advance truck horizontally
  truck.x += truck.speed * clampedDt;

  // Check if truck is over the gorge or on solid banks
  let supported = false;
  if (truck.x <= lvl.leftBankX || truck.x >= lvl.rightBankX) {
    truck.y = lvl.deckY;
    truck.vy = 0;
    truck.angle = 0;
    supported = true;
  } else {
    // Find unbroken road beam spanning truck.x
    for (const beam of beams) {
      if (beam.broken || beam.material !== 'road') continue;
      const na = nodeMap.get(beam.nodeA);
      const nb = nodeMap.get(beam.nodeB);
      if (!na || !nb) continue;
      const leftN = na.x <= nb.x ? na : nb;
      const rightN = na.x <= nb.x ? nb : na;

      if (truck.x >= leftN.x - 6 && truck.x <= rightN.x + 6) {
        const span = Math.max(1, rightN.x - leftN.x);
        const t = Math.max(0, Math.min(1, (truck.x - leftN.x) / span));
        truck.y = leftN.y + (rightN.y - leftN.y) * t;
        truck.vy = 0;
        truck.angle = Math.atan2(rightN.y - leftN.y, rightN.x - leftN.x);
        supported = true;

        // Apply truck downward weight load to both road endpoints
        if (!leftN.pinned) leftN.y += truck.weight * (1 - t) * clampedDt * 0.055;
        if (!rightN.pinned) rightN.y += truck.weight * t * clampedDt * 0.055;
        break;
      }
    }
  }

  if (!supported) {
    truck.vy += 480 * clampedDt;
    truck.y += truck.vy * clampedDt;
    truck.angle += 1.5 * clampedDt;
  }

  // 2. Verlet position integration for free bridge nodes
  const gravity = 28;
  for (const n of nodes) {
    if (n.pinned) continue;
    const vx = (n.x - n.oldX) * 0.94;
    const vy = (n.y - n.oldY) * 0.94;
    n.oldX = n.x;
    n.oldY = n.y;
    n.x += vx;
    n.y += vy + gravity * clampedDt * clampedDt;
  }

  // 3. Constraint relaxation & structural stress check (10 iterations)
  let maxStressPeak = state.maxStressPeak;
  let brokenBeamsCount = state.brokenBeamsCount;

  for (let iter = 0; iter < 10; iter++) {
    for (const beam of beams) {
      if (beam.broken) continue;
      const na = nodeMap.get(beam.nodeA);
      const nb = nodeMap.get(beam.nodeB);
      if (!na || !nb) continue;

      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const diff = (dist - beam.restLength) / dist;
      const spec = MATERIAL_SPECS[beam.material];

      if (iter === 9) {
        const strain = Math.abs(dist - beam.restLength) / beam.restLength;
        const stressRatio = Math.min(1.5, strain / spec.maxStrain);
        beam.stressRatio = stressRatio;
        maxStressPeak = Math.max(maxStressPeak, stressRatio);

        if (stressRatio >= 1.0) {
          beam.broken = true;
          brokenBeamsCount += 1;
          continue;
        }
      }

      const correction = diff * spec.stiffness * 0.5;
      if (!na.pinned && !nb.pinned) {
        na.x += dx * correction;
        na.y += dy * correction;
        nb.x -= dx * correction;
        nb.y -= dy * correction;
      } else if (!na.pinned) {
        na.x += dx * correction * 2;
        na.y += dy * correction * 2;
      } else if (!nb.pinned) {
        nb.x -= dx * correction * 2;
        nb.y -= dy * correction * 2;
      }
    }
  }

  // Check collapse or victory
  if (truck.y > lvl.deckY + 95) {
    return {
      ...state,
      phase: 'collapsed',
      nodes,
      beams,
      truck,
      maxStressPeak,
      brokenBeamsCount,
    };
  }

  if (truck.x >= lvl.rightBankX + 55) {
    return {
      ...state,
      phase: 'victory',
      nodes,
      beams,
      truck,
      maxStressPeak,
      brokenBeamsCount,
      levelsCleared: Math.max(state.levelsCleared, state.levelIndex + 1),
    };
  }

  return {
    ...state,
    nodes,
    beams,
    truck,
    maxStressPeak,
    brokenBeamsCount,
  };
}
