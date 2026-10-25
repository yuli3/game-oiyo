import { describe, expect, it } from "vitest";
import {
  calculateEffectiveBgmGain,
  calculateEffectiveSfxGain,
  calculateFilterCutoff,
  calculatePitchedFrequency,
  createDefaultMixerConfig,
} from "./audio-mixer";

describe("audio-mixer", () => {
  describe("calculatePitchedFrequency", () => {
    it("returns base frequency when variance random value is center (0.5)", () => {
      const base = 440;
      const pitched = calculatePitchedFrequency(base, 0.04, 0.5);
      expect(pitched).toBe(440);
    });

    it("applies negative variance when random value is 0", () => {
      const base = 440;
      const pitched = calculatePitchedFrequency(base, 0.04, 0);
      expect(pitched).toBe(Math.round(440 * 0.96 * 10) / 10);
    });

    it("applies positive variance when random value is 1", () => {
      const base = 440;
      const pitched = calculatePitchedFrequency(base, 0.04, 1);
      expect(pitched).toBe(Math.round(440 * 1.04 * 10) / 10);
    });
  });

  describe("gain and ducking calculations", () => {
    it("computes normal BGM and SFX gain from default config", () => {
      const config = createDefaultMixerConfig();
      expect(calculateEffectiveBgmGain(config)).toBeCloseTo(0.7, 2);
      expect(calculateEffectiveSfxGain(config)).toBeCloseTo(0.8, 2);
    });

    it("ducks BGM gain when isDuckingActive is true", () => {
      const config = { ...createDefaultMixerConfig(), isDuckingActive: true };
      const ducked = calculateEffectiveBgmGain(config, 0.4);
      // 1.0 * 0.7 * 0.4 = 0.28
      expect(ducked).toBeCloseTo(0.28, 2);
    });
  });

  describe("filter cutoff calculation", () => {
    it("returns open cutoff when low-pass is inactive", () => {
      expect(calculateFilterCutoff(false, 500, 20000)).toBe(20000);
    });

    it("returns muffled cutoff when low-pass is active", () => {
      expect(calculateFilterCutoff(true, 500, 20000)).toBe(500);
    });
  });
});
