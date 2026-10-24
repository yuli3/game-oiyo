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
    });
  });

  describe("renderShareCardToContext", () => {
    it("calls canvas rendering APIs with expected properties", () => {
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
      };

      renderShareCardToContext(mockCtx, options);

      // Verify canvas filled background
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 600, 600);
      // Verify fillText called for title and score
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });
});
