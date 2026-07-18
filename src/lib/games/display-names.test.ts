import { describe, expect, it } from "vitest";
import { gameDisplayName } from "./display-names";

describe("gameDisplayName", () => {
  it("uses six-locale canonical names", () => {
    expect(gameDisplayName("chess", "ko")).toBe("체스");
    expect(gameDisplayName("chess", "zh")).toBe("国际象棋");
    expect(gameDisplayName("texas-holdem", "fr")).toBe("Texas Hold'em");
  });

  it("localizes difficulty, puzzle size and aim-trainer dimensions", () => {
    expect(gameDisplayName("minesweeper-intermediate", "es")).toBe("Buscaminas · Intermedio");
    expect(gameDisplayName("puzzle15-4", "ja")).toBe("15パズル · 4×4");
    expect(gameDisplayName("aim-trainer:precision:hard", "fr")).toBe("Entraîneur de visée · Précision · Difficile");
  });

  it("keeps an unknown legacy key unchanged instead of inventing English copy", () => {
    expect(gameDisplayName("old-custom-game", "ko")).toBe("old-custom-game");
  });
});
