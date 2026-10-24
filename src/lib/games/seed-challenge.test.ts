import { describe, it, expect } from "vitest";
import {
  encodeSeed,
  decodeSeed,
  buildChallengeUrl,
  parseChallengeUrl,
  generateChallengeCopy,
  evaluateChallengeResult,
} from "./seed-challenge";

describe("seed-challenge module", () => {
  describe("encodeSeed & decodeSeed", () => {
    it("encodes and decodes positive integer seeds correctly", () => {
      const original = 123456789;
      const encoded = encodeSeed(original);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
      expect(decodeSeed(encoded)).toBe(original);
    });

    it("handles zero and small numbers", () => {
      expect(decodeSeed(encodeSeed(0))).toBe(0);
      expect(decodeSeed(encodeSeed(42))).toBe(42);
    });

    it("falls back to a default seed when decoding invalid strings", () => {
      expect(decodeSeed("")).toBeGreaterThan(0);
      expect(decodeSeed("!@#$%^")).toBeGreaterThan(0);
    });

    it("normalizes case-insensitive input", () => {
      const code = encodeSeed(99999);
      expect(decodeSeed(code.toLowerCase())).toBe(99999);
      expect(decodeSeed(code.toUpperCase())).toBe(99999);
    });
  });

  describe("buildChallengeUrl", () => {
    it("constructs full challenge URL with seed and score", () => {
      const url = buildChallengeUrl({
        baseUrl: "https://game.oiyo.net",
        locale: "ko",
        slug: "game-2048",
        seed: 88421,
        score: 3500,
      });

      expect(url).toContain("https://game.oiyo.net/ko/games/game-2048");
      expect(url).toContain("seed=");
      expect(url).toContain("challenge=3500");
    });

    it("supports optional score for pure seed matching", () => {
      const url = buildChallengeUrl({
        baseUrl: "https://game.oiyo.net",
        locale: "en",
        slug: "wordle",
        seed: 1234,
      });

      expect(url).toContain("/en/games/wordle");
      expect(url).toContain("seed=");
      expect(url).not.toContain("challenge=");
    });
  });

  describe("parseChallengeUrl", () => {
    it("parses valid challenge query params", () => {
      const encoded = encodeSeed(777);
      const params = new URLSearchParams(`seed=${encoded}&challenge=1200`);
      const parsed = parseChallengeUrl(params);

      expect(parsed.isChallenge).toBe(true);
      expect(parsed.seed).toBe(777);
      expect(parsed.challengerScore).toBe(1200);
      expect(parsed.seedCode).toBe(encoded);
    });

    it("returns null or non-challenge when params are missing", () => {
      const params = new URLSearchParams("");
      const parsed = parseChallengeUrl(params);

      expect(parsed.isChallenge).toBe(false);
      expect(parsed.challengerScore).toBeUndefined();
    });

    it("ignores invalid challenger score", () => {
      const encoded = encodeSeed(777);
      const params = new URLSearchParams(`seed=${encoded}&challenge=not_a_number`);
      const parsed = parseChallengeUrl(params);

      expect(parsed.isChallenge).toBe(true);
      expect(parsed.challengerScore).toBeUndefined();
    });
  });

  describe("generateChallengeCopy", () => {
    it("generates Korean challenge message with score and url", () => {
      const text = generateChallengeCopy({
        locale: "ko",
        gameTitle: "2048 게임",
        score: 2048,
        url: "https://game.oiyo.net/ko/games/game-2048?seed=XYZ&challenge=2048",
      });

      expect(text).toContain("2048 게임");
      expect(text).toContain("2,048점");
      expect(text).toContain("https://game.oiyo.net");
    });

    it("generates English challenge message", () => {
      const text = generateChallengeCopy({
        locale: "en",
        gameTitle: "Snake Arcade",
        score: 350,
        url: "https://game.oiyo.net/en/games/snake-game?seed=XYZ&challenge=350",
      });

      expect(text).toContain("Snake Arcade");
      expect(text).toContain("350 pts");
      expect(text).toContain("Can you beat my score on the exact same seed?");
    });
  });

  describe("evaluateChallengeResult", () => {
    it("correctly evaluates win, lose, and tie", () => {
      expect(evaluateChallengeResult(500, 400)).toEqual({
        outcome: "win",
        diff: 100,
      });

      expect(evaluateChallengeResult(300, 400)).toEqual({
        outcome: "lose",
        diff: -100,
      });

      expect(evaluateChallengeResult(400, 400)).toEqual({
        outcome: "tie",
        diff: 0,
      });
    });

    it("handles undefined challenger score as solo run", () => {
      expect(evaluateChallengeResult(500, undefined)).toEqual({
        outcome: "solo",
        diff: 0,
      });
    });
  });
});
