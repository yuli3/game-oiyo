import { describe, it, expect, vi } from 'vitest';
import {
  PixiWebGpuBridge,
  PixiParticleStorm2D,
  PixiVectorSpriteCache,
} from './pixi-engine';

describe('PixiJS v8 Next-Gen WebGPU Engine (Research Goal 1)', () => {
  it('1. verifies PixiParticleStorm2D pooling, emit, and updates', () => {
    const storm = new PixiParticleStorm2D(128);
    expect(storm.capacity).toBe(128);
    expect(storm.particles.length).toBe(128);

    // Initial state: no active particles
    expect(storm.particles.filter((p) => p.active).length).toBe(0);

    // Emit 16 particles
    storm.emit(100, 100, { count: 16, color: 0xff0000 });
    const activeCount = storm.particles.filter((p) => p.active).length;
    expect(activeCount).toBe(16);

    // Update particles (life decreases, position advances)
    const firstActive = storm.particles.find((p) => p.active);
    expect(firstActive).toBeDefined();
    const initialLife = firstActive?.life ?? 0;

    storm.updateAndRender(0.1);
    expect(firstActive?.life).toBeLessThan(initialLife);

    // Expire particles
    storm.updateAndRender(2.0);
    expect(storm.particles.filter((p) => p.active).length).toBe(0);
  });

  it('2. verifies PixiVectorSpriteCache context reuse and cleanup', () => {
    let buildCalls = 0;
    const builder = (ctx: any) => {
      buildCalls++;
      ctx.circle(0, 0, 10);
    };

    const ctx1 = PixiVectorSpriteCache.getOrCreateContext('player-hull', builder);
    expect(ctx1).toBeDefined();
    expect(buildCalls).toBe(1);

    // Second call with same key should return cached instance without rebuild
    const ctx2 = PixiVectorSpriteCache.getOrCreateContext('player-hull', builder);
    expect(ctx2).toBe(ctx1);
    expect(buildCalls).toBe(1);

    // Clear cache
    PixiVectorSpriteCache.clear();
  });

  it('3. verifies PixiWebGpuBridge safe destruction without throwing', () => {
    expect(() => {
      PixiWebGpuBridge.destroySafely(null);
    }).not.toThrow();

    const mockApp: any = {
      destroy: vi.fn(),
    };
    PixiWebGpuBridge.destroySafely(mockApp);
    expect(mockApp.destroy).toHaveBeenCalled();
  });
});
