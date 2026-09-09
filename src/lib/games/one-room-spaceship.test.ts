import {describe, expect, it} from 'vitest';
import {assignShip, createShip, crewChoice, startShip, stepShip, shipIncident} from './one-room-spaceship';
describe('one room spaceship', () => {
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
