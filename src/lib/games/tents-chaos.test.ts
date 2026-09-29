import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mulberry32 } from "./daily";
import { DAILY_BOARD } from "./tents-save";
import { countTentsSolutions, generateUniqueTents, validateTents, type Pos, type TentsPuzzle } from "./tents";
import {
  CHAOS_POOL,
  addChaosAugment,
  chaosBoard,
  chaosDaySeed,
  chaosEffects,
  chaosElapsedSec,
  chaosNeighborVerdict,
  chaosOffer,
  chaosShareLine,
  chaosShareUrl,
  hintAriaCount,
  visibleHint,
} from "./tents-chaos";

function dailySalt(dayIndex: number): number {
  return (0x74656e ^ Math.imul(dayIndex + 1, 2654435761)) >>> 0;
}

function key(cell: Pos): string {
  return `${cell[0]}:${cell[1]}`;
}

describe("tents daily chaos", () => {
  it("keeps the same board and the same three cards for one day", () => {
    const first = chaosBoard(12);
    const offer = chaosOffer(12);
    expect(chaosBoard(12).puzzle).toEqual(first.puzzle);
    expect(chaosBoard(12).solution).toEqual(first.solution);
    expect(chaosOffer(12)).toEqual(offer);
    expect(new Set(offer).size).toBe(3);
    expect(offer.every((id) => (CHAOS_POOL as readonly string[]).includes(id))).toBe(true);
  });

  it("uses a different salt from the classic daily board", () => {
    expect(chaosDaySeed(4)).not.toBe(dailySalt(4));
    const differs = [0, 1, 2, 3, 4].some((day) => {
      const daily = generateUniqueTents(DAILY_BOARD.size, DAILY_BOARD.pairs, mulberry32(dailySalt(day))).puzzle;
      return JSON.stringify(daily) !== JSON.stringify(chaosBoard(day).puzzle);
    });
    expect(differs).toBe(true);
    expect(chaosBoard(4).puzzle.size).toBe(DAILY_BOARD.size);
    expect(chaosBoard(4).solution).toHaveLength(DAILY_BOARD.pairs);
  });

  it("changes the offer across days without depending on the pick", () => {
    const seen = new Set<string>();
    for (let day = 0; day < 24; day += 1) seen.add(chaosOffer(day).join(","));
    expect(seen.size).toBeGreaterThan(1);
    const before = chaosBoard(9).puzzle;
    chaosOffer(9);
    expect(chaosBoard(9).puzzle).toEqual(before);
  });

  it("rejects a fourth augment and keeps a duplicate pick", () => {
    const one = addChaosAugment([], "fog");
    expect(one.ok && one.active).toEqual(["fog"]);
    const again = addChaosAugment(["fog"], "fog");
    expect(again.ok && again.active).toEqual(["fog"]);
    const three = addChaosAugment(["fog", "hourglass", "flashlight"], "banned");
    expect(three).toEqual({ ok: false, reason: "cap" });
  });

  it("hides half the hints and never the whole line", () => {
    const effects = chaosEffects(2);
    const size = chaosBoard(2).puzzle.size;
    expect(effects.fogRows).toHaveLength(Math.floor(size / 2));
    expect(effects.fogCols).toHaveLength(Math.floor(size / 2));
    expect(effects.fogRows.length).toBeLessThan(size);
    expect(effects.fogCols.length).toBeLessThan(size);
    expect(new Set(effects.fogRows).size).toBe(effects.fogRows.length);
    expect(visibleHint(4, true)).toBe("·");
    expect(visibleHint(4, true).includes("4")).toBe(false);
    expect(hintAriaCount(4, true, "숨김")).toBe("숨김");
    expect(hintAriaCount(4, true, "숨김").includes("4")).toBe(false);
    expect(hintAriaCount(4, false, "숨김")).toBe("4");
  });

  it("keeps banned, trail, and safe grass off the unique solution's conflicts", () => {
    const day = 6;
    const { puzzle, solution } = chaosBoard(day);
    const effects = chaosEffects(day);
    const trees = new Set(puzzle.trees.map(key));
    const tents = new Set(solution.map(key));
    expect(countTentsSolutions(puzzle, 2)).toBe(1);
    expect(effects.banned).toHaveLength(3);
    for (const cell of effects.banned) {
      expect(trees.has(key(cell))).toBe(false);
      expect(tents.has(key(cell))).toBe(false);
    }
    expect(tents.has(key(effects.trailhead))).toBe(true);
    expect(trees.has(key(effects.safeGrass))).toBe(false);
    expect(tents.has(key(effects.safeGrass))).toBe(false);
    expect(effects.banned.some((cell) => key(cell) === key(effects.safeGrass))).toBe(false);
    expect(validateTents(solution, puzzle, { banned: effects.banned }).complete).toBe(true);
    expect(validateTents([effects.banned[0], ...solution], puzzle, { banned: effects.banned }).error).toBe("banned");
  });

  it("judges a flashlight neighbor without placing a tent", () => {
    const puzzle: TentsPuzzle = {
      size: 3,
      trees: [[1, 1]],
      rowHints: [0, 1, 0],
      colHints: [0, 1, 0],
    };
    expect(chaosNeighborVerdict([1, 2], puzzle, [])).toBe("legal");
    expect(chaosNeighborVerdict([0, 0], puzzle, [])).toBe("illegal");
    expect(chaosNeighborVerdict([1, 2], puzzle, [[1, 2]])).toBe("illegal");
    expect(chaosNeighborVerdict([1, 2], puzzle, [], [[1, 2]])).toBe("illegal");
    expect(chaosNeighborVerdict([1, 1], puzzle, [])).toBe("illegal");
  });

  it("formats the text share line", () => {
    expect(chaosShareUrl("ko")).toBe("https://game.oiyo.net/ko/tents-and-trees/");
    expect(chaosShareLine("텐트 카오스", "안개 캠프", 48, chaosShareUrl("ko"))).toBe(
      "텐트 카오스 · 안개 캠프 · 48s · https://game.oiyo.net/ko/tents-and-trees/",
    );
    expect(chaosElapsedSec(1_000, 1_000)).toBe(0);
    expect(chaosElapsedSec(1_000, 48_400)).toBe(47);
  });

  it("does not put augment UI on Lost Ark pages", () => {
    const root = join(process.cwd(), "src/pages");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.startsWith("lostark") && entry.name.endsWith(".astro")) files.push(path);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source.includes("Augment")).toBe(false);
      expect(source.includes("chaosAugment")).toBe(false);
    }
  });
});
