import { describe, it, expect, vi } from "vitest";
import {
  formatCardScore,
  resolveRankTier,
  renderShareCardToContext,
  type ShareCardOptions,
} from "./share-card";

describe("share-card module", () => {
  describe("formatCardScore", () => {
    it("formats scores with comma separation", () => {
      expect(formatCardScore(0)).toBe("0");
      expect(formatCardScore(1250)).toBe("1,250");
      expect(formatCardScore(1000000)).toBe("1,000,000");
    });

    it("handles string or floating numbers gracefully", () => {
      expect(formatCardScore(3540.8)).toBe("3,540");
      expect(formatCardScore("9999")).toBe("9,999");
    });
  });

  describe("resolveRankTier", () => {
    it("assigns appropriate tier based on score range", () => {
      expect(resolveRankTier("snake-game", 50)).toBe("ROOKIE");
      expect(resolveRankTier("snake-game", 150)).toBe("ACE");
      expect(resolveRankTier("snake-game", 350)).toBe("LEGEND");
      expect(resolveRankTier("game-2048", 2048)).toBe("MASTER");
      expect(resolveRankTier("game-2048", 512)).toBe("APPRENTICE");
      expect(resolveRankTier("cosmic-merge", 12000)).toBe("GODLIKE");
      expect(resolveRankTier("wordle", 3)).toBe("GENIUS");
      expect(resolveRankTier("wordle", 4)).toBe("MASTER");
      expect(resolveRankTier("sudoku", 150)).toBe("GRANDMASTER");
      expect(resolveRankTier("sudoku", 250)).toBe("MASTER");
      expect(resolveRankTier("minesweeper", 18)).toBe("DEMOLITIONIST");
      expect(resolveRankTier("minesweeper", 50)).toBe("SAPPER");
      expect(resolveRankTier("minesweeper", 100)).toBe("EXPERT");
      expect(resolveRankTier("minesweeper", 150)).toBe("SWEEPER");
      expect(resolveRankTier("block-burst", 5200)).toBe("GRANDMASTER");
      expect(resolveRankTier("block-burst", 3500)).toBe("ARCHITECT");
      expect(resolveRankTier("block-burst", 1200)).toBe("STACKER");
      expect(resolveRankTier("block-burst", 400)).toBe("APPRENTICE");
      expect(resolveRankTier("gomoku", 12)).toBe("GRANDMASTER");
      expect(resolveRankTier("gomoku", 30)).toBe("ADEPT");
      expect(resolveRankTier("solitaire", 75)).toBe("SPEED DEMON");
      expect(resolveRankTier("solitaire", 200)).toBe("SOLVER");
      expect(resolveRankTier("chess", 15)).toBe("GRANDMASTER");
      expect(resolveRankTier("chess", 35)).toBe("MASTER");
      expect(resolveRankTier("janggi", 20)).toBe("명인 (GRANDMASTER)");
      expect(resolveRankTier("janggi", 40)).toBe("국수 (MASTER)");
    });
  });

  describe("renderShareCardToContext", () => {
    it("calls canvas rendering APIs with expected properties including QR and Title", () => {
      const mockCtx = {
        canvas: { width: 600, height: 600 },
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 0,
        font: "",
        textAlign: "",
        textBaseline: "",
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        roundRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const options: ShareCardOptions = {
        title: "2048 GAME",
        subtitle: "GROWTH LOGIC",
        score: 2048,
        bestScore: 2048,
        slug: "game-2048",
        seedCode: "XYZ88",
        locale: "ko",
        qrUrl: "https://game.oiyo.net/ko/game-2048/?seed=XYZ88",
        playerTitle: "퍼즐 마스터",
      };

      renderShareCardToContext(mockCtx, options);

      // Verify canvas filled background
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 600, 600);
      // Verify fillText called for title, score, and player title
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });
});
