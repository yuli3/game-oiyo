import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  TRIES,
  brokenLine,
  createBoard,
  createCase,
  submitOrder,
  togglePlace,
  tray,
  type PlaceId,
} from "./omission-detective";

function permutations(items: readonly PlaceId[]): PlaceId[][] {
  if (items.length <= 1) return [items.slice()];
  const out: PlaceId[][] = [];
  for (let index = 0; index < items.length; index += 1) {
    const head = items[index] as PlaceId;
    for (const tail of permutations(items.slice(0, index).concat(items.slice(index + 1)))) out.push([head, ...tail]);
  }
  return out;
}

describe("omission detective", () => {
  it("builds one order that the three lines all allow", () => {
    for (let seed = 0; seed < 24; seed += 1) {
      const daily = createCase(seed);
      expect(createCase(seed)).toEqual(daily);
      expect(new Set(daily.lines.flat()).size).toBe(daily.order.length);
      expect(brokenLine(daily.lines, daily.order)).toBeNull();
      const fits = permutations(daily.order).filter((order) => brokenLine(daily.lines, order) === null);
      expect(fits).toEqual([daily.order]);
      expect(tray(daily).join()).not.toBe(daily.order.join());
    }
  });

  it("spends a try on a wrong order and stops after three", () => {
    const daily = createCase(3);
    let board = createBoard(daily);
    expect(submitOrder(board)).toEqual(board);
    const wrong = [...daily.order].reverse() as PlaceId[];
    for (const place of wrong) board = togglePlace(board, place);
    board = submitOrder(board);
    expect(board.phase).toBe("ask");
    expect(board.tries).toBe(1);
    expect(board.broken).not.toBeNull();
    board = submitOrder(board);
    board = submitOrder(board);
    expect(board.phase).toBe("lost");
    expect(board.tries).toBe(TRIES);
    expect(submitOrder(board)).toEqual(board);
  });

  it("accepts the true order", () => {
    const daily = createCase(9);
    let board = createBoard(daily);
    board = togglePlace(board, daily.order[0] as PlaceId);
    board = togglePlace(board, daily.order[0] as PlaceId);
    expect(board.picks).toEqual([]);
    for (const place of daily.order) board = togglePlace(board, place);
    board = submitOrder(board);
    expect(board.phase).toBe("won");
    expect(board.tries).toBe(1);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/omission-detective.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="omission-detective"');
    expect(catalog).toContain('slug: "omission-detective"');
    expect(GAME_ID).toBe("omission-detective");
  });
});
