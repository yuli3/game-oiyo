import { describe, expect, it } from 'vitest';
import {
  clearFrame,
  composite,
  createFrame,
  hex,
  HitStopController,
  PAL,
  PixelFxController,
  PixelPainter,
  RAMP,
  type PixelFxPresetName,
} from './pixelfx-engine';
import { runDungeonRogueMonteCarloAudit } from './dot-dungeon-rogue';
import { runDotMinerMonteCarloAudit } from './dot-miner';
import { runDotFarmMonteCarloAudit } from './dot-farm';
import { runDotFishingMonteCarloAudit } from './dot-fishing';
import { runDotTowerMonteCarloAudit } from './dot-tower';

describe('pixelfx-engine dual-buffer & HitStopController', () => {
  it('creates a dual-buffer PixelFrame and composites opaque color + additive light glow', () => {
    const frame = createFrame(16, 16, -8, -8);
    const painter = new PixelPainter(frame);

    // Draw an opaque center pixel and an additive light halo
    painter.dot(0, 0, hex('#ff4a5a'), 1);
    painter.glow(0, 0, 4, hex('#ffe066'), 0.8);

    const out = new Uint8ClampedArray(16 * 16 * 4);
    composite(frame, out, 1);

    // Center pixel at (8, 8) should have full alpha (255) and brightened RGB from additive glow
    const centerIdx = (8 * 16 + 8) * 4;
    expect(out[centerIdx + 3]).toBe(255);
    expect(out[centerIdx]).toBeGreaterThanOrEqual(0xff);
    expect(out[centerIdx + 1]).toBeGreaterThan(0x4a);

    // Adjacent pixel at (9, 8) has no opaque color but receives additive light glow
    const glowIdx = (8 * 16 + 9) * 4;
    expect(out[glowIdx + 3]).toBeGreaterThan(0);

    clearFrame(frame);
    expect(frame.color.every((v) => v === 0)).toBe(true);
    expect(frame.light.every((v) => v === 0)).toBe(true);
  });

  it('fades pixels via 4x4 Bayer ordered dithering without half-alpha smudging', () => {
    const frame = createFrame(8, 8, 0, 0);
    const painter = new PixelPainter(frame);
    const gold = RAMP.gold[5];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        painter.put(x, y, gold, 0.5);
      }
    }

    // With alpha = 0.5 over an 8x8 grid (four 4x4 Bayer tiles), ~half the pixels are drawn opaque and ~half are 0
    let drawn = 0;
    for (let i = 0; i < frame.color.length; i++) {
      if (frame.color[i] !== 0) {
        drawn++;
        expect(frame.color[i] >>> 24).toBe(255);
      }
    }
    expect(drawn).toBe(32);
  });

  it('spawns, renders, and expires all 6 4-beat PixelFX presets', () => {
    const presets: PixelFxPresetName[] = [
      'slash-impact',
      'frost-nova',
      'coin-sparkle',
      'ore-shatter',
      'nature-bloom',
      'water-splash',
    ];

    for (const preset of presets) {
      const ctrl = new PixelFxController(24);
      ctrl.spawn(preset, 40, 40, { duration: 0.4 });
      expect(ctrl.getActiveCount()).toBe(1);

      // Advance to contact spike / follow-through beat (t = 0.12s)
      ctrl.update(0.05);
      ctrl.update(0.05);
      ctrl.update(0.02);

      const inst = {
        id: 1,
        preset,
        x: 40,
        y: 40,
        t: 0.12,
        duration: 0.4,
        seed: 42,
        palette: 'fire' as const,
        scale: 2,
      };
      const rgba = ctrl.renderInstanceBuffer(inst);
      const nonZeroBytes = rgba.some((b) => b > 0);
      expect(nonZeroBytes).toBe(true);

      // Advance past duration (clamped at 0.05s per step)
      for (let i = 0; i < 10; i++) ctrl.update(0.05);
      expect(ctrl.getActiveCount()).toBe(0);
    }
  });

  it('freezes simulation frames during HitStopController active window and recovers cleanly', () => {
    const hitStop = new HitStopController();
    expect(hitStop.isFreezing()).toBe(false);
    expect(hitStop.getTimeScale()).toBe(1);

    hitStop.trigger(60);
    expect(hitStop.isFreezing()).toBe(true);
    expect(hitStop.getTimeScale()).toBe(0);

    // Step 30ms -> still freezing
    expect(hitStop.update(0.03)).toBe(true);
    expect(hitStop.getTimeScale()).toBe(0);

    // Step another 40ms -> freeze window completed
    expect(hitStop.update(0.04)).toBe(false);
    expect(hitStop.isFreezing()).toBe(false);
    expect(hitStop.getTimeScale()).toBe(1);
    expect(Object.keys(PAL).length).toBeGreaterThanOrEqual(12);
  });

  it('validates Monte Carlo balance audits across all 5 Dot Arcade engines', () => {
    const rogue = runDungeonRogueMonteCarloAudit(10, 30);
    expect(rogue.runs).toBe(10);
    expect(rogue.survivalRate).toBeGreaterThan(0);

    const miner = runDotMinerMonteCarloAudit(10, 30);
    expect(miner.runs).toBe(10);
    expect(miner.avgDepthMax).toBeGreaterThanOrEqual(1);
    expect(miner.survivalRate).toBeGreaterThan(0);

    const farm = runDotFarmMonteCarloAudit(8, 6);
    expect(farm.runs).toBe(8);
    expect(farm.avgTotalHarvested).toBeGreaterThanOrEqual(1);
    expect(farm.avgFinalMoney).toBeGreaterThan(100);

    const fishing = runDotFishingMonteCarloAudit(12);
    expect(fishing.runs).toBe(12);
    expect(fishing.catchRate).toBeGreaterThan(0.5);
    expect(fishing.avgGoldEarned).toBeGreaterThan(0);

    const tower = runDotTowerMonteCarloAudit(6, 160);
    expect(tower.runs).toBe(6);
    expect(tower.avgKills).toBeGreaterThan(0);
    expect(tower.avgCastleHpRemaining).toBeGreaterThan(0);
  });
});
