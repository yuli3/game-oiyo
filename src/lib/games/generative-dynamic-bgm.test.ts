import { describe, it, expect } from "vitest";
import {
  DynamicStemMixer,
  ProceduralPatternSequencer,
  SCALE_A_MINOR_PENTATONIC,
} from "./generative-dynamic-bgm";

describe("Generative Dynamic BGM Engine", () => {
  it("modulates stem volumes dynamically according to tension level", () => {
    const mixer = new DynamicStemMixer();

    // 초기 평상시 (Level 1)
    mixer.setTensionLevel(1);
    expect(mixer.getStemVolume("bass")).toBeGreaterThan(0.5);
    expect(mixer.getStemVolume("arp")).toBe(0.0);
    expect(mixer.getStemVolume("drums")).toBe(0.0);

    // 콤보 상승 (Level 2)
    mixer.setTensionLevel(2);
    expect(mixer.getStemVolume("arp")).toBeGreaterThan(0.5);
    expect(mixer.getStemVolume("drums")).toBeGreaterThan(0.5);
    expect(mixer.getStemVolume("lead")).toBe(0.0);

    // 피버 모드 (Level 3)
    mixer.setTensionLevel(3);
    expect(mixer.getStemVolume("lead")).toBeGreaterThan(0.7);
    expect(mixer.getStemVolume("drums")).toBeGreaterThan(0.9);
  });

  it("sequences 16-step pentatonic patterns and rhythmic beats", () => {
    const sequencer = new ProceduralPatternSequencer();

    const firstStep = sequencer.advanceStep();
    expect(firstStep.step).toBe(0);
    expect(firstStep.isKick).toBe(true);
    expect(SCALE_A_MINOR_PENTATONIC).toContain(firstStep.bassFreq);

    // 4번째 스텝 (스네어 비트)
    for (let i = 0; i < 3; i++) sequencer.advanceStep();
    const snareStep = sequencer.advanceStep();
    expect(snareStep.step).toBe(4);
    expect(snareStep.isSnare).toBe(true);
  });
});
