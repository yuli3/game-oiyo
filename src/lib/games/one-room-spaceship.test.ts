import {recordShipArrival, getBestForConditions} from './one-room-spaceship-client';
import {describe, expect, it, vi} from 'vitest';
import {SYSTEMS, assignShip, assignCrew, createShip, crewChoice, startShip, stepShip, shipIncident} from './one-room-spaceship';
describe('one room spaceship', () => {
  it('persists an arrival through the validated records contract and isolates modes', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value)});
    try {
      const conditions = {seed: 'voyage-v2', difficulty: 'computer', assist: 'hint' as const};
      expect(recordShipArrival(createShip(), conditions)).toBeNull();
      recordShipArrival({...createShip(), status: 'arrived', distance: 82.5}, conditions);
      expect(getBestForConditions('one-room-spaceship', conditions)?.value).toBe(82.5);
      recordShipArrival({...createShip(), status: 'arrived', distance: 70}, conditions);
      expect(getBestForConditions('one-room-spaceship', conditions)?.value).toBe(82.5);
      expect(getBestForConditions('one-room-spaceship', {...conditions, difficulty: 'human'})).toBeNull();
    } finally {vi.unstubAllGlobals();}
  });
  it('requires the captain, not the crew, at the incident deadline', () => {
    const s = {...startShip(createShip('human')), elapsed: 19, heat: 25,
      primary: 'thrust' as const, secondary: 'cooling' as const};
    expect(stepShip(s).status).toBe('lost');
    const handedOver = assignShip(assignCrew(s, 'oxygen'), 'cooling');
    expect(stepShip(handedOver).status).toBe('flying');
  });
  it('does not resolve an incident by briefly visiting the station before the deadline', () => {
    let s = {...startShip(createShip('human')), elapsed: 18};
    s = stepShip(assignShip(s, 'cooling'));
    expect(s.status).toBe('flying');
    expect(stepShip(assignShip(s, 'thrust')).status).toBe('lost');
  });
  it('cannot refresh the computer decision by spamming the same station', () => {
    const s = {...startShip(createShip()), elapsed: 5, oxygen: 1, secondary: 'power' as const};
    expect(assignShip(s, s.primary)).toBe(s);
  });
  it('admits a human crew solution using actual station handovers', () => {
    let s = startShip(createShip('human'));
    while (s.status === 'flying') {
      const primary = shipIncident(s.elapsed) ?? (s.heat > 70 ? 'cooling' : s.oxygen < 30 ? 'oxygen' : s.power < 25 ? 'power' : 'thrust');
      if (s.secondary === primary) s = assignCrew(s, SYSTEMS.find(k => k !== s.primary && k !== primary)!);
      s = assignShip(s, primary);
      if (s.elapsed % 10 === 0) s = assignCrew(s, crewChoice(s));
      s = stepShip(s);
    }
    expect(s.status).toBe('arrived'); expect(s.elapsed).toBe(90);
  });
  it('keeps human crew assignments at ten-second boundaries and prevents duplicate stations', () => {
    const s = startShip(createShip('human'));
    const assigned = assignCrew(s, 'power');
    expect(stepShip(assigned).secondary).toBe('power');
    expect(assignCrew(s, 'thrust')).toBe(s);
    expect(assignShip(s, 'oxygen')).toBe(s);
  });
  it('does not permit reassignment after the voyage ends', () => {
    const s = {...createShip('human'), status: 'arrived' as const};
    expect(assignCrew(s, 'power')).toBe(s); expect(assignShip(s, 'cooling')).toBe(s);
  });
  it('never advances before launch or after an ending', () => {
    const ready = createShip(); expect(stepShip(ready)).toBe(ready);
    const ended = {...ready, status: 'lost' as const}; expect(stepShip(ended)).toBe(ended);
  });
  it('crew covers a different system and prioritizes a critical oxygen reserve', () => {
    const ship = {...createShip(), oxygen: 2};
    expect(crewChoice(ship)).toBe('oxygen');
    expect(assignShip(ship, 'oxygen').secondary).not.toBe('oxygen');
  });
  it('has a reproducible full ninety-second survival policy', () => {
    const run = () => {let s = startShip(createShip());
      while (s.status === 'flying') {
        s = assignShip(s, shipIncident(s.elapsed) ?? (s.heat > 70 ? 'cooling' : s.oxygen < 30 ? 'oxygen' : s.power < 25 ? 'power' : 'thrust'));
        s = stepShip(s);
      } return s;
    };
    expect(run()).toEqual(run()); expect(run().elapsed).toBe(90);
    expect(run().status).toBe('arrived'); expect(run().distance).toBeGreaterThanOrEqual(65);
  });
  it('does not let the computer win without captain intervention', () => {
    let s = startShip(createShip()); while(s.status === 'flying') s = stepShip(s);
    expect(s.status).toBe('lost'); expect(s.elapsed).toBeLessThan(90);
  });
  it('fails immediately when a resource reaches a lethal threshold', () => {
    const ship = {...startShip(createShip()), elapsed: 1, oxygen: .1, secondary: 'power' as const};
    expect(stepShip(ship).status).toBe('lost');
  });
});
