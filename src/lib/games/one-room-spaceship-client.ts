export * from './one-room-spaceship';
import {recordBestForConditions, type BestConditions} from './records';
import type {ShipState} from './one-room-spaceship';
export {getBestForConditions} from './records';
export function recordShipArrival(ship: ShipState, conditions: BestConditions) {
  if (ship.status !== 'arrived') return null;
  return recordBestForConditions('one-room-spaceship', Math.round(ship.distance * 10) / 10, 'score', conditions);
}
