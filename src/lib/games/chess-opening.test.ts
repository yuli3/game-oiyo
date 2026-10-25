import { describe, it, expect } from "vitest";
import { identifyChessOpening, CHESS_OPENINGS } from "./chess-opening";

describe("Chess Opening Book Detector (Goal #7)", () => {
  it("identifies standard Ruy Lopez from 5 moves", () => {
    const moves = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"];
    const opening = identifyChessOpening(moves);
    expect(opening).not.toBeNull();
    expect(opening?.code).toBe("C60");
    expect(opening?.name.en).toContain("Ruy Lopez");
  });

  it("identifies Sicilian Defense immediately on move 2", () => {
    const moves = ["e4", "c5"];
    const opening = identifyChessOpening(moves);
    expect(opening?.code).toBe("B20");
    expect(opening?.name.ko).toBe("시실리안 디펜스");
  });

  it("identifies Italian Game when bishop moves to c4", () => {
    const moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"];
    const opening = identifyChessOpening(moves);
    expect(opening?.code).toBe("C50");
    expect(opening?.name.en).toContain("Italian Game");
  });

  it("returns null for non-standard opening or empty history", () => {
    expect(identifyChessOpening([])).toBeNull();
    expect(identifyChessOpening(["h4", "h5"])).toBeNull();
  });

  it("has complete multilingual translations for all curated openings", () => {
    for (const op of CHESS_OPENINGS) {
      expect(op.name.ko).toBeTruthy();
      expect(op.name.en).toBeTruthy();
      expect(op.name.ja).toBeTruthy();
      expect(op.name.zh).toBeTruthy();
      expect(op.name.fr).toBeTruthy();
      expect(op.name.es).toBeTruthy();
    }
  });
});
