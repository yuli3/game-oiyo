export type System = 'oxygen' | 'cooling' | 'power' | 'thrust';
export const SYSTEMS: readonly System[] = ['oxygen', 'cooling', 'power', 'thrust'];
export function shipIncident(elapsed: number): System | null {
  const block = Math.floor(elapsed / 10);
  return block === 1 || block === 7 ? 'cooling' : block === 3 ? 'power' : block === 5 ? 'oxygen' : null;
}
export type ShipState = Readonly<{
  elapsed: number; oxygen: number; heat: number; power: number; distance: number;
  primary: System; secondary: System; crew: 'computer' | 'human'; status: 'ready' | 'flying' | 'lost' | 'arrived';
}>;
export function createShip(crew: ShipState['crew'] = 'computer'): ShipState {
  return {elapsed: 0, oxygen: 75, heat: 25, power: 75, distance: 0,
    primary: 'thrust', secondary: 'oxygen', crew, status: 'ready'};
}
export function crewChoice(s: ShipState): System {
  const risk: Record<System, number> = {
    oxygen: 70 - s.oxygen, cooling: s.heat - 30,
    power: 65 - s.power, thrust: (s.elapsed / 90 * 65 - s.distance) * 2,
  };
  return SYSTEMS.filter(k => k !== s.primary).sort((a, b) => risk[b] - risk[a])[0]!;
}
export function assignShip(s: ShipState, primary: System): ShipState {
  if (s.status === 'lost' || s.status === 'arrived') return s;
  if (s.primary === primary) return s;
  if (s.crew === 'human' && s.secondary === primary) return s;
  const next = {...s, primary};
  return s.crew === 'human' ? next : {...next, secondary: crewChoice(next)};
}
export function assignCrew(s: ShipState, secondary: System): ShipState {
  if (s.crew !== 'human' || s.primary === secondary || s.status === 'lost' || s.status === 'arrived') return s;
  return {...s, secondary};
}
export function startShip(s: ShipState): ShipState {
  return s.status === 'ready' ? {...s, status: 'flying'} : s;
}
/** One deterministic second. Crew also reallocates when the captain changes stations. */
export function stepShip(s: ShipState): ShipState {
  if (s.status !== 'flying') return s;
  const secondary = s.crew === 'computer' && s.elapsed % 10 === 0 ? crewChoice(s) : s.secondary;
  const active = (k: System) => s.primary === k || secondary === k;
  const storm = Math.floor(s.elapsed / 10) % 3 === 1;
  const incident = shipIncident(s.elapsed);
  const missed = s.elapsed % 10 === 9 && incident !== null && s.primary !== incident;
  const oxygen = Math.min(100, s.oxygen + (active('oxygen') ? 2.6 : -1.3)) - (missed && incident === 'oxygen' ? 80 : 0);
  const heat = Math.max(0, s.heat + (active('cooling') ? -3.8 : 1.4) + (active('thrust') ? .8 : 0) + (storm ? .5 : 0)) + (missed && incident === 'cooling' ? 85 : 0);
  const power = Math.min(100, s.power + (active('power') ? 3.4 : -1.1)) - (missed && incident === 'power' ? 80 : 0);
  const distance = s.distance + (active('thrust') ? 1.3 : .15);
  const elapsed = s.elapsed + 1;
  const lost = oxygen <= 0 || heat >= 100 || power <= 0;
  return {...s, elapsed, oxygen, heat, power, distance, secondary,
    status: lost ? 'lost' : elapsed >= 90 ? (distance >= 65 ? 'arrived' : 'lost') : 'flying'};
}
