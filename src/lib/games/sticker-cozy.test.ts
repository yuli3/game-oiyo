import { describe, it, expect } from "vitest";
import {
  createStickerCozyState,
  ROOM_THEMES,
  triggerTweezersHint,
  tryPlaceStickerAt,
} from "./sticker-cozy";

describe("Sticker Book Cozy Engine", () => {
  it("initializes room with 8 unplaced stickers and selects the first sticker", () => {
    const state = createStickerCozyState(0);
    expect(state.totalCount).toBe(8);
    expect(state.placedCount).toBe(0);
    expect(state.selectedStickerId).toBe("warm_rug");
    expect(state.isRoomComplete).toBe(false);
  });

  it("snaps sticker into place when dropped within SNAP_RADIUS and rejects distant drops", () => {
    const state = createStickerCozyState(0);
    const rugSpec = ROOM_THEMES[0].stickers[0];

    // Drop far away -> fails
    const miss = tryPlaceStickerAt(state, rugSpec.id, 20, 20);
    expect(miss.snapped).toBe(false);
    expect(state.placedCount).toBe(0);

    // Drop within SNAP_RADIUS -> snaps!
    const hit = tryPlaceStickerAt(
      state,
      rugSpec.id,
      rugSpec.targetX + 12,
      rugSpec.targetY - 10
    );
    expect(hit.snapped).toBe(true);
    expect(state.placedCount).toBe(1);
    expect(state.score).toBeGreaterThan(100);
    expect(state.selectedStickerId).toBe("oak_desk");
  });

  it("highlights the next unplaced sticker with triggerTweezersHint", () => {
    const state = createStickerCozyState(1);
    const hinted = triggerTweezersHint(state);
    expect(hinted?.id).toBe("checker_mat");
    expect(state.highlightedStickerId).toBe("checker_mat");
  });

  it("completes the room when all 8 stickers are snapped into place", () => {
    const state = createStickerCozyState(0);
    for (const spec of ROOM_THEMES[0].stickers) {
      const res = tryPlaceStickerAt(state, spec.id, spec.targetX, spec.targetY);
      expect(res.snapped).toBe(true);
    }
    expect(state.placedCount).toBe(8);
    expect(state.isRoomComplete).toBe(true);
  });
});
