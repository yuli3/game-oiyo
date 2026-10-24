import { describe, expect, it } from "vitest";
import { generateQrMatrix, generateChallengeQrSvg } from "./challenge-qr";

describe("challenge-qr matrix & svg generator", () => {
  it("generates a valid 2D boolean matrix with finder patterns", () => {
    const url = "https://game.oiyo.net/play/game-2048?seed=12345";
    const matrix = generateQrMatrix(url);

    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);

    // Verify top-left 7x7 finder pattern structure:
    // Row 0 has 7 black modules
    for (let c = 0; c < 7; c++) {
      expect(matrix[0][c]).toBe(true);
    }
    // Row 1 has black at cols 0 and 6, white at cols 1-5
    expect(matrix[1][0]).toBe(true);
    expect(matrix[1][1]).toBe(false);
    expect(matrix[1][5]).toBe(false);
    expect(matrix[1][6]).toBe(true);

    // Center of finder is black (rows 2, 3, 4, cols 2, 3, 4)
    expect(matrix[3][3]).toBe(true);
  });

  it("scales version dynamically for long challenge URLs", () => {
    const shortUrl = "https://game.oiyo.net";
    const longUrl = "https://game.oiyo.net/ko/play/wordle?seed=9876543210&score=12000&rival=MASTER_CHALLENGER&mode=hardcore";

    const mShort = generateQrMatrix(shortUrl);
    const mLong = generateQrMatrix(longUrl);

    expect(mLong.length).toBeGreaterThan(mShort.length);
  });

  it("generates clean standalone SVG string", () => {
    const url = "https://game.oiyo.net/ko/challenge/minesweeper";
    const svg = generateChallengeQrSvg(url, { size: 200, color: "#0284c7" });

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="200"');
    expect(svg).toContain('fill="#0284c7"');
    expect(svg).toContain("<path d=");
  });
});
