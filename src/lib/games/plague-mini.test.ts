import { describe, it, expect, beforeEach } from 'vitest';
import { PlagueEngine, TRAITS } from './plague-mini';

describe('PlagueEngine', () => {
  let engine: PlagueEngine;

  beforeEach(() => {
    engine = new PlagueEngine();
  });

  it('initializes world regions with correct population and Patient Zero', () => {
    expect(engine.regions.length).toBe(10);
    expect(engine.totalPopulation).toBeGreaterThan(6_000_000_000);
    expect(engine.totalInfected).toBe(10);
    expect(engine.cureProgress).toBe(0);
    expect(engine.isCureStarted).toBe(false);

    const eastAsia = engine.regions.find(r => r.id === 'east_asia')!;
    expect(eastAsia.infected).toBe(10);
  });

  it('unlocks traits with prerequisites and recalculates pathogen stats', () => {
    engine.dnaPoints = 50;

    // Air 2 requires Air 1
    expect(engine.canUnlockTrait('air_2')).toBe(false);
    expect(engine.canUnlockTrait('air_1')).toBe(true);

    const unlockedAir1 = engine.unlockTrait('air_1');
    expect(unlockedAir1).toBe(true);
    expect(engine.unlockedTraits.has('air_1')).toBe(true);
    expect(engine.dnaPoints).toBe(50 - TRAITS.air_1.cost);

    // Now Air 2 can be unlocked
    expect(engine.canUnlockTrait('air_2')).toBe(true);
    engine.unlockTrait('air_2');
    expect(engine.infectivity).toBeGreaterThan(30);
  });

  it('spreads infection mathematically through SIRD day steps', () => {
    const initialInfected = engine.totalInfected;

    // Advance 10 days
    for (let i = 0; i < 10; i++) {
      engine.stepDay();
    }

    expect(engine.totalInfected).toBeGreaterThan(initialInfected);
    expect(engine.totalHealthy).toBeLessThan(engine.totalPopulation);
  });

  it('triggers border closures when severe mortality or heavy infection occurs', () => {
    const eastAsia = engine.regions.find(r => r.id === 'east_asia')!;
    eastAsia.infected = 800_000_000; // heavy infection
    eastAsia.dead = 100_000;

    engine.stepDay();

    expect(eastAsia.airportClosed).toBe(true);
  });

  it('pops DNA and Cure bubbles and updates points/cure progress', () => {
    engine.spawnBubble('dna', 50, 50, 5);
    expect(engine.bubbles.length).toBeGreaterThan(0);

    const bubbleId = engine.bubbles[engine.bubbles.length - 1].id;
    const initialDna = engine.dnaPoints;

    const res = engine.popBubble(bubbleId);
    expect(res?.type).toBe('dna');
    expect(engine.dnaPoints).toBe(initialDna + 5);

    // Test Cure Bubble pop
    engine.cureProgress = 40;
    engine.spawnBubble('cure', 20, 20, 3);
    const cureBubble = engine.bubbles[engine.bubbles.length - 1];
    engine.popBubble(cureBubble.id);
    expect(engine.cureProgress).toBe(37);
  });

  it('transfers infection via aircraft/sea transit arrivals', () => {
    const greenland = engine.regions.find(r => r.id === 'greenland')!;
    expect(greenland.infected).toBe(0);

    // Create infected ship to Greenland
    engine.vehicles.push({
      id: 'ship_greenland',
      type: 'ship',
      fromId: 'east_asia',
      toId: 'greenland',
      progress: 0.95,
      speed: 1.0,
      isInfected: true,
    });

    // Advance 0.1 second to trigger arrival
    engine.updateVehicles(0.1);

    expect(greenland.infected).toBeGreaterThan(0);
  });

  it('genetic reshuffle knocks back existing cure research', () => {
    engine.cureProgress = 50;
    engine.dnaPoints = 100;
    engine.unlockTrait('genetic_hardening');
    engine.unlockTrait('genetic_reshuffle');

    expect(engine.cureProgress).toBe(25); // reduced by 25%
  });
});
