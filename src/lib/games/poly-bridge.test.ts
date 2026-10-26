import { describe, expect, it } from 'vitest';
import {
  addOrConnectBridgeNode,
  applyAutoTrussBlueprint,
  createBridgeLevelState,
  startBridgeSimulation,
  stepBridgePhysics,
} from './poly-bridge';

describe('Poly Bridge Truss Architect (#139)', () => {
  it('initializes level 0 with 4 pinned anchors and $2500 budget', () => {
    const state = createBridgeLevelState(0);
    expect(state.phase).toBe('build');
    expect(state.nodes).toHaveLength(4);
    expect(state.nodes.every((n) => n.pinned)).toBe(true);
    expect(state.budget).toBe(2500);
  });

  it('connects nodes with beams and tracks spent budget', () => {
    let state = createBridgeLevelState(0);
    // Select left anchor (180, 220)
    state = addOrConnectBridgeNode(state, 180, 220);
    expect(state.selectedNodeId).toBe(0);

    // Place a road node at (280, 220)
    state = addOrConnectBridgeNode(state, 280, 220);
    expect(state.nodes).toHaveLength(5);
    expect(state.beams).toHaveLength(1);
    expect(state.spent).toBeGreaterThan(0);
  });

  it('collapses when truck drives into an unbridged gorge', () => {
    let state = createBridgeLevelState(0);
    state = startBridgeSimulation(state);
    for (let i = 0; i < 60; i++) {
      state = stepBridgePhysics(state, 0.03);
      if (state.phase === 'collapsed') break;
    }
    expect(state.phase).toBe('collapsed');
  });

  it('supports truck safely across the gorge using the Auto-Truss Blueprint', () => {
    let state = createBridgeLevelState(0);
    state = applyAutoTrussBlueprint(state);
    expect(state.spent).toBeLessThanOrEqual(state.budget);
    expect(state.beams.length).toBeGreaterThan(10);

    state = startBridgeSimulation(state);
    for (let i = 0; i < 180; i++) {
      state = stepBridgePhysics(state, 0.03);
      if (state.phase !== 'simulating') break;
    }
    expect(state.phase).toBe('victory');
  });
});
