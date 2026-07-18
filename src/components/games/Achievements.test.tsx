import { describe, expect, it } from "vitest";

import { buildBestEntries, cohortTag } from "./Achievements";

describe("Achievements records projection", () => {
  it("labels exact cohorts without claiming cross-board comparability", () => {
    expect(cohortTag("daily-2026-07-18")).toBe("2026-07-18");
    expect(cohortTag("classic-demo-v1")).toBe("v1");
    expect(cohortTag("free-123456789")).toBe("#456789");
  });

  it("merges general and condition-scoped PBs by achieved time and caps the view", () => {
    const conditions = { seed: "daily-2026-07-18", difficulty: "intermediate", assist: "none" as const };
    const conditional = Array.from({ length: 11 }, (_, index) => ({
      key: `condition-${index}`,
      game: "minesweeper-intermediate",
      record: { value: 100 - index, unit: "seconds" as const, conditions },
      achievedAt: `2026-07-18T${String(index).padStart(2, "0")}:00:00.000Z`,
    }));
    const rows = buildBestEntries(
      { "game-2048": { value: 4096, unit: "score" } },
      { "game-2048": "2026-07-17T12:00:00.000Z" },
      conditional,
    );
    expect(rows).toHaveLength(10);
    expect(rows[0]).toMatchObject({ key: "conditional:condition-10", cohort: "2026-07-18" });
    expect(rows.some(({ key }) => key === "general:game-2048")).toBe(false);
  });
});
