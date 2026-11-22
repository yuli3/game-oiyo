import { describe, expect, it } from "vitest";
import { SNOWMAN_STAGES, buildStage, canDrop, createGame, drop, heightCm, stageScore, stageStars, step } from "./snowman-stack";
import { autoplay, careless } from "./snowman-stack.autopilot";

describe("snowman stack stages", () => {
  it("has 20 stages that grow taller, windier and touchier", () => {
    expect(SNOWMAN_STAGES).toBe(20);
    expect(buildStage(0).pieces.length).toBe(3);
    expect(buildStage(19).pieces.length).toBeGreaterThan(buildStage(0).pieces.length);
    expect(buildStage(19).grip).toBeLessThan(buildStage(0).grip);
    const grounds = new Set(Array.from({ length: SNOWMAN_STAGES }, (_, i) => buildStage(i).ground));
    expect([...grounds].sort()).toEqual(["field", "ice", "stump"]);
    expect(buildStage(0).wind).toBe(0);
    expect(buildStage(11).wind).toBeGreaterThan(0);
    expect(buildStage(7)).toEqual(buildStage(7));
  });

  it("every stage is cleared with 3 stars by a careful player", () => {
    for (let i = 0; i < SNOWMAN_STAGES; i++) {
      const g = autoplay(i);
      expect(g.phase, `stage ${i + 1}`).toBe("won");
      expect(stageStars(g), `stage ${i + 1}`).toBe(3);
      expect(stageScore(g)).toBeGreaterThan(0);
      expect(heightCm(g)).toBeGreaterThan(50);
    }
  }, 120_000);

  it("sloppy aim costs stars early and topples the snowman later", () => {
    expect(stageStars(autoplay(0, 18))).toBeLessThan(3);
    const late = [13, 14, 15, 16, 17, 18].filter((i) => autoplay(i, 18).phase !== "won");
    expect(late.length).toBeGreaterThanOrEqual(4);
  }, 120_000);

  it("dropping without aiming rarely works", () => {
    const won = Array.from({ length: SNOWMAN_STAGES }, (_, i) => careless(i)).filter((g) => g.phase === "won").length;
    expect(won).toBeLessThanOrEqual(6);
  }, 120_000);
});

describe("snowman stack rules", () => {
  it("only drops the next piece after the previous one landed", () => {
    const g = createGame(0);
    expect(drop(g)).toBe(true);
    expect(canDrop(g)).toBe(false);
    for (let i = 0; i < 200 && !canDrop(g); i++) step(g);
    expect(g.pivot).not.toBeNull();
    expect(canDrop(g)).toBe(true);
  });

  it("is deterministic", () => {
    const a = autoplay(9);
    const b = autoplay(9);
    expect(a.steps).toBe(b.steps);
    expect(stageScore(a)).toBe(stageScore(b));
  });
});
