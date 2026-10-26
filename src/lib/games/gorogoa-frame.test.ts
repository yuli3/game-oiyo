import { describe, it, expect } from "vitest";
import {
  applyHintStep,
  checkChapterSolved,
  createGorogoaState,
  interactSlots,
  togglePanelZoom,
} from "./gorogoa-frame";

describe("Gorogoa Frame Weaver Engine", () => {
  it("initializes 4 comic panels in a 2x2 grid", () => {
    const state = createGorogoaState(0);
    expect(state.panels).toHaveLength(4);
    expect(state.isChapterCleared).toBe(false);
    const slots = state.panels.map((p) => p.slot).sort();
    expect(slots).toEqual([0, 1, 2, 3]);
  });

  it("toggles zoom level on panels", () => {
    const state = createGorogoaState(0);
    expect(togglePanelZoom(state, "seeker_room")).toBe(true);
    const seeker = state.panels.find((p) => p.id === "seeker_room");
    expect(seeker?.zoom).toBe(1);
    expect(togglePanelZoom(state, "seeker_room")).toBe(true);
    expect(seeker?.zoom).toBe(0);
  });

  it("swaps panel slots and stacks stencils when zoomed in", () => {
    const state = createGorogoaState(0);
    // Swap slot 0 (crimson_tree) and slot 1 (seeker_room)
    const swapRes = interactSlots(state, 0, 1);
    expect(swapRes.action).toBe("swapped");
    expect(state.panels.find((p) => p.id === "seeker_room")?.slot).toBe(0);
    expect(state.panels.find((p) => p.id === "crimson_tree")?.slot).toBe(1);

    // Zoom into stone_arch (slot 2) and stack onto fountain_courtyard (slot 3)
    togglePanelZoom(state, "stone_arch");
    const stackRes = interactSlots(state, 2, 3);
    expect(stackRes.action).toBe("stacked");
    expect(
      state.panels.find((p) => p.id === "fountain_courtyard")?.stackedStencilFromId
    ).toBe("stone_arch");
  });

  it("solves Chapter 1 when zoom, horizontal alignment, and stencil stack conditions are met", () => {
    const state = createGorogoaState(0);
    togglePanelZoom(state, "seeker_room");
    togglePanelZoom(state, "crimson_tree");
    // Swap slot 0 and 1 so seeker_room is Left (0) and crimson_tree is Right (1)
    interactSlots(state, 0, 1);
    // Zoom stone_arch and stack onto fountain_courtyard
    togglePanelZoom(state, "stone_arch");
    interactSlots(state, 2, 3);

    expect(checkChapterSolved(state)).toBe(true);
    expect(state.isChapterCleared).toBe(true);
  });

  it("solves all 3 chapters step-by-step using applyHintStep", () => {
    for (let ch = 0; ch < 3; ch++) {
      const state = createGorogoaState(ch);
      for (let step = 0; step < 10; step++) {
        if (state.isChapterCleared) break;
        applyHintStep(state);
      }
      expect(state.isChapterCleared).toBe(true);
    }
  });
});
