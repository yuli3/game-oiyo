import { describe, expect, it } from "vitest";
import { generateSeededMaze, moveMaze, parseMaze, serializeMaze } from "./maze";
describe("maze engine", () => {
  it("generates deterministic mazes", () =>
    expect(generateSeededMaze(11, 7)).toEqual(generateSeededMaze(11, 7)));
  it("moves only through paths", () => {
    const m = generateSeededMaze(11, 2),
      p: [number, number] = [0, 0];
    expect(
      [
        [1, 0],
        [0, 1],
      ]
        .map(([r, c]) => m[r][c])
        .includes(0),
    ).toBe(true);
    expect(moveMaze(m, p, -1, 0)).toBe(p);
  });
  it("restores valid active state", () => {
    expect(parseMaze(serializeMaze(3, "easy", [0, 0], 4))?.seconds).toBe(4);
    expect(parseMaze('{"v":9}')).toBeNull();
  });
});
