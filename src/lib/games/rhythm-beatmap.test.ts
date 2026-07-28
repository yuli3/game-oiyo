import { describe, expect, it } from "vitest";
import {
  GOOD_MS,
  PERFECT_MS,
  RHYTHM_CURVE,
  beatToSeconds,
  comboAfterJudgement,
  generateChart,
  judgeOffset,
  levelFromRhythmRecord,
  nearestNoteIndex,
  noteProgress,
  rhythmDifficulty,
  rhythmRecordExtra,
  scoreForJudgement,
  secondsToBeat,
} from "./rhythm-beatmap";

describe("Rhythm Tap beatmap contracts", () => {
  it("keeps the difficulty curve centralized, bounded, and escalating", () => {
    const first = rhythmDifficulty(1);
    const last = rhythmDifficulty(RHYTHM_CURVE.length);
    expect(last.bpm).toBeGreaterThan(first.bpm);
    expect(last.approachSeconds).toBeLessThan(first.approachSeconds);
    // Out-of-range levels clamp instead of returning undefined.
    expect(rhythmDifficulty(0)).toEqual(first);
    expect(rhythmDifficulty(99)).toEqual(last);
  });

  it("converts between beats and seconds consistently", () => {
    expect(beatToSeconds(4, 120)).toBeCloseTo(2);
    expect(secondsToBeat(2, 120)).toBeCloseTo(4);
    expect(secondsToBeat(beatToSeconds(7.5, 137), 137)).toBeCloseTo(7.5);
  });

  it("generates the same chart for the same seed so runs are comparable", () => {
    const a = generateChart(3, 11);
    const b = generateChart(3, 11);
    expect(b).toEqual(a);
    // A different seed must actually change the chart, or patterns are unlearnable
    // for the wrong reason: every run identical.
    expect(generateChart(3, 12)).not.toEqual(a);
  });

  it("emits notes on a rising beat grid inside the chart's lane count", () => {
    const level = 2;
    const chart = generateChart(level, 5, 4);
    const { lanes } = rhythmDifficulty(level);
    expect(chart.notes.length).toBeGreaterThan(0);
    expect(chart.leadInBeats).toBeGreaterThan(0);
    let previous = -1;
    for (const note of chart.notes) {
      expect(note.beat).toBeGreaterThanOrEqual(previous);
      expect(note.lane).toBeGreaterThanOrEqual(0);
      expect(note.lane).toBeLessThan(lanes);
      previous = note.beat;
    }
  });

  it("places notes on an even grid — the rhythm the old random spawn never had", () => {
    // Level 1 is one note per beat, so every gap must be exactly one beat.
    const chart = generateChart(1, 3, 4);
    const beatSeconds = beatToSeconds(1, chart.bpm);
    const times = chart.notes.map((note) => beatToSeconds(note.beat, chart.bpm));
    expect(times.length).toBeGreaterThan(4);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i] - times[i - 1]).toBeCloseTo(beatSeconds, 6);
    }
  });

  it("renders identically at 60Hz and 120Hz", () => {
    const approach = 1.7;
    const noteSeconds = 4;
    const advance = (steps: number, stepSeconds: number) => {
      let song = 0;
      for (let i = 0; i < steps; i += 1) song += stepSeconds;
      return noteProgress(noteSeconds, song, approach);
    };
    const at60 = advance(180, 1 / 60);
    const at120 = advance(360, 1 / 120);
    expect(at120).toBeCloseTo(at60, 6);
  });

  it("judges by milliseconds so scroll speed cannot change the windows", () => {
    expect(judgeOffset(0)).toBe("perfect");
    expect(judgeOffset(-PERFECT_MS)).toBe("perfect");
    expect(judgeOffset(PERFECT_MS + 1)).toBe("good");
    expect(judgeOffset(-GOOD_MS)).toBe("good");
    expect(judgeOffset(GOOD_MS + 1)).toBe("miss");
  });

  it("rewards precision and breaks the combo only on a miss", () => {
    expect(scoreForJudgement("perfect", 10)).toBeGreaterThan(scoreForJudgement("good", 10));
    expect(scoreForJudgement("miss", 10)).toBe(0);
    expect(comboAfterJudgement(7, "perfect")).toBe(8);
    expect(comboAfterJudgement(7, "good")).toBe(8);
    expect(comboAfterJudgement(7, "miss")).toBe(0);
  });

  it("derives note position from time remaining, identically at any frame rate", () => {
    const approach = 1.5;
    // Spawn, midpoint, hit line, past the line.
    expect(noteProgress(3, 1.5, approach)).toBeCloseTo(0);
    expect(noteProgress(3, 2.25, approach)).toBeCloseTo(0.5);
    expect(noteProgress(3, 3, approach)).toBeCloseTo(1);
    expect(noteProgress(3, 3.3, approach)).toBeGreaterThan(1);
  });

  it("resolves a press to the nearest note and ignores anything outside GOOD", () => {
    const notes = [1.0, 2.0, 3.0];
    expect(nearestNoteIndex(notes, 2.01)).toBe(1);
    expect(nearestNoteIndex(notes, 2.94)).toBe(2);
    // 100ms early is just past the GOOD window: no note is consumed.
    expect(nearestNoteIndex(notes, 2.9)).toBeNull();
    expect(nearestNoteIndex(notes, 2.2)).toBeNull();
    expect(nearestNoteIndex([], 1)).toBeNull();
  });

  it("round-trips the level through the saved record", () => {
    expect(levelFromRhythmRecord(rhythmRecordExtra(4, 30))).toBe(4);
    expect(levelFromRhythmRecord(undefined)).toBe(1);
    expect(levelFromRhythmRecord("garbage")).toBe(1);
    expect(levelFromRhythmRecord(rhythmRecordExtra(99, 0))).toBe(RHYTHM_CURVE.length);
  });
});
