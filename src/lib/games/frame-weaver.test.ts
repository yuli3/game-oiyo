import { describe, it, expect } from "vitest";
import {
  applyHintStep,
  CHAPTERS,
  checkChapterSolved,
  createFrameWeaverState,
  interactSlots,
  togglePanelZoom,
} from "./frame-weaver";

describe("Frame Weaver engine", () => {
  it("initializes 4 comic panels in a 2x2 grid", () => {
    const state = createFrameWeaverState(0);
    expect(state.panels).toHaveLength(4);
    expect(state.isChapterCleared).toBe(false);
    const slots = state.panels.map((p) => p.slot).sort();
    expect(slots).toEqual([0, 1, 2, 3]);
  });

  it("toggles zoom level on panels", () => {
    const state = createFrameWeaverState(0);
    expect(togglePanelZoom(state, "seeker_room")).toBe(true);
    const seeker = state.panels.find((p) => p.id === "seeker_room");
    expect(seeker?.zoom).toBe(1);
    expect(togglePanelZoom(state, "seeker_room")).toBe(true);
    expect(seeker?.zoom).toBe(0);
  });

  it("swaps panel slots and stacks stencils when zoomed in", () => {
    const state = createFrameWeaverState(0);
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
    const state = createFrameWeaverState(0);
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

  it("ships ten chapters (stage range 10-50), none solved at the start", () => {
    expect(CHAPTERS).toHaveLength(10);
    CHAPTERS.forEach((spec, i) => {
      expect(spec.chapterNum).toBe(i + 1);
      expect(new Set(spec.panels.map((p) => p.initialSlot)).size).toBe(4);
      for (const loc of ["ko", "en", "ja", "zh", "fr", "es"] as const) {
        expect(spec.title[loc]).toBeTruthy();
        expect(spec.objective[loc]).not.toMatch(/\{|undefined/);
      }
      expect(checkChapterSolved(createFrameWeaverState(i))).toBe(false);
    });
  });

  it("solves every chapter step-by-step using applyHintStep", () => {
    for (let ch = 0; ch < CHAPTERS.length; ch++) {
      const state = createFrameWeaverState(ch);
      for (let step = 0; step < 10; step++) {
        if (state.isChapterCleared) break;
        applyHintStep(state);
      }
      expect(state.isChapterCleared).toBe(true);
    }
  });
});
