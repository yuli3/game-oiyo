import { describe, it, expect, beforeEach } from 'vitest';
import {
  PaperFlightEngine,
  getBiomeForZ,
} from './paper-flight-3d';

describe('PaperFlightEngine', () => {
  let engine: PaperFlightEngine;

  beforeEach(() => {
    engine = new PaperFlightEngine(42);
  });

  it('initializes in ready state with a generated flight course', () => {
    expect(engine.status).toBe('ready');
    expect(engine.course.rings.length).toBeGreaterThan(10);
    expect(engine.course.thermals.length).toBeGreaterThan(5);
    expect(engine.course.cranes.length).toBeGreaterThan(10);
    expect(engine.plane.y).toBe(20);
    expect(engine.plane.stamina).toBe(100);
  });

  it('launches into flying state', () => {
    engine.launch();
    expect(engine.status).toBe('flying');
    expect(engine.plane.vz).toBeLessThan(-15);
  });

  it('dives when pitched down, increasing forward speed and descent', () => {
    engine.launch();
    engine.plane.pitch = -0.35; // Set downward dive attitude
    const initialVz = engine.plane.vz;

    // Maintain dive
    for (let i = 0; i < 30; i++) {
      engine.update(0.016, -0.5, 0, false);
    }

    expect(engine.plane.pitch).toBeLessThan(0);
    // Forward velocity should increase in magnitude (more negative)
    expect(engine.plane.vz).toBeLessThan(initialVz);
  });

  it('stalls when pitched up too steeply or airspeed drops', () => {
    engine.launch();

    // Pitch up hard to force stall
    for (let i = 0; i < 40; i++) {
      engine.update(0.016, 1.0, 0, false);
    }

    expect(engine.plane.isStalled).toBe(true);
  });

  it('gains vertical lift inside a thermal updraft', () => {
    engine.launch();
    // Position plane inside the first thermal
    const thermal = engine.course.thermals[0];
    engine.plane.x = thermal.x;
    engine.plane.y = 10;
    engine.plane.z = thermal.z;

    const initialVy = engine.plane.vy;
    engine.update(0.016, 0, 0, false);

    expect(engine.plane.inThermal).toBe(true);
    expect(engine.plane.vy).toBeGreaterThan(initialVy);
  });

  it('collects boost rings and gains speed burst', () => {
    engine.launch();
    const ring = engine.course.rings[0];
    engine.plane.x = ring.x;
    engine.plane.y = ring.y;
    engine.plane.z = ring.z;

    const prevVz = engine.plane.vz;
    engine.update(0.016, 0, 0, false);

    expect(ring.passed).toBe(true);
    expect(engine.ringsCount).toBe(1);
    expect(engine.score).toBeGreaterThan(0);
    expect(engine.plane.vz).toBeLessThan(prevVz);
  });

  it('transitions to landed status when touching ground', () => {
    engine.launch();
    engine.plane.y = 0.1;
    engine.plane.vy = -5;

    engine.update(0.05, 0, 0, false);

    expect(engine.plane.y).toBe(0);
    expect(engine.status).toBe('landed');
  });

  it('returns correct biomes along distance corridor', () => {
    expect(getBiomeForZ(-100)).toBe('study');
    expect(getBiomeForZ(-800)).toBe('park');
    expect(getBiomeForZ(-1800)).toBe('clouds');
    expect(getBiomeForZ(-2800)).toBe('canyon');
    expect(getBiomeForZ(-3400)).toBe('aurora');
  });
});
