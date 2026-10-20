// Greedy placement plus a bounded rearrangement search.
// Depth stays small because every extra meld multiplies the hand's combinations
// (2026-10-20). Level 1 never moves a tile already on the table. Levels 2 and 3
// may detach an end, or lift one meld, then have to use those tiles again with
// at least one tile from the hand.

import type { AiLevel } from "./types";
import {
  checkPlay,
  meldOptions,
  validateMeld,
  type Meld,
  type RummyAction,
  type RummyState,
  type Tile,
} from "../tile-rummy";

const DEPTH: Record<AiLevel, number> = { 1: 1, 2: 2, 3: 3 };
const BRANCH: Record<AiLevel, number> = { 1: 4, 2: 6, 3: 8 };

interface Step {
  table: Meld[];
  handLeft: Tile[];
  loose: Tile[];
  gain: number;
}

function take(tiles: readonly Tile[], used: Set<number>): Tile[] {
  return tiles.filter((tile) => !used.has(tile.id));
}

function extensions(table: readonly Meld[], tile: Tile): Meld[][] {
  const next: Meld[][] = [];
  for (let index = 0; index < table.length; index++) {
    const meld = table[index];
    for (const where of ["start", "end"] as const) {
      const tiles = where === "start" ? [tile, ...meld.tiles] : [...meld.tiles, tile];
      for (const shape of [meld.shape, "group", "run"] as const) {
        if (!shape) continue;
        const candidate: Meld = { tiles, shape };
        if (!validateMeld(candidate).ok) continue;
        next.push(table.map((current, currentIndex) => (currentIndex === index ? candidate : current)));
        break;
      }
    }
  }
  return next;
}

function proposals(table: readonly Meld[], handLeft: readonly Tile[], loose: readonly Tile[], level: AiLevel, depth: number, opened: boolean): Step[] {
  const steps: Step[] = [];
  const pool = [...handLeft, ...loose];
  for (const meld of meldOptions(pool)) {
    const ids = new Set(meld.tiles.map((tile) => tile.id));
    const usesHand = handLeft.some((tile) => ids.has(tile.id));
    const usesLoose = loose.some((tile) => ids.has(tile.id));
    if (loose.length > 0 ? !usesLoose : !usesHand) continue;
    if (!opened && loose.length > 0) continue;
    steps.push({
      table: table.concat([meld]),
      handLeft: take(handLeft, ids),
      loose: take(loose, ids),
      gain: handLeft.filter((tile) => ids.has(tile.id)).length,
    });
  }

  for (const tile of [...handLeft, ...loose]) {
    const fromHand = handLeft.some((candidate) => candidate.id === tile.id);
    if (!fromHand && !opened) continue;
    for (const nextTable of extensions(table, tile)) {
      const ids = new Set([tile.id]);
      steps.push({
        table: nextTable,
        handLeft: fromHand ? take(handLeft, ids) : handLeft.slice(),
        loose: fromHand ? loose.slice() : take(loose, ids),
        gain: fromHand ? 1 : 0,
      });
    }
  }

  if (opened && loose.length === 0 && depth === 0 && level >= 2) {
    for (let index = 0; index < table.length; index++) {
      const meld = table[index];
      if (meld.tiles.length < 4) continue;
      for (const end of [0, meld.tiles.length - 1]) {
        const freed = meld.tiles[end];
        const rest: Meld = { tiles: meld.tiles.filter((_, tileIndex) => tileIndex !== end) };
        if (!validateMeld(rest).ok) continue;
        const nextTable = table.map((current, currentIndex) => (currentIndex === index ? rest : current));
        steps.push({ table: nextTable, handLeft: handLeft.slice(), loose: [freed], gain: 0 });
      }
    }
  }

  if (opened && loose.length === 0 && depth === 0 && level >= 3) {
    table.forEach((meld, index) => {
      const nextTable = table.filter((_, currentIndex) => currentIndex !== index);
      steps.push({ table: nextTable, handLeft: handLeft.slice(), loose: meld.tiles.slice(), gain: 0 });
    });
  }

  steps.sort((a, b) => b.gain - a.gain);
  const kept = steps.slice(0, BRANCH[level]);
  if (level >= 2) {
    for (const step of steps) {
      if (step.loose.length > 0 && kept.length < BRANCH[level] + 4 && !kept.includes(step)) kept.push(step);
    }
  }
  return kept;
}

/** A legal draw, or a play. Drawing is the fallback when no placement is legal. */
export function chooseRummyAction(state: RummyState, level: AiLevel): RummyAction {
  const seat = state.turn;
  const opened = state.opened[seat];
  // A box, not a `let`, so the closure assignment stays visible to the return
  // (TS treats a closed-over `let` as still null). 2026-10-20.
  const best: { current: { table: Meld[]; score: number } | null } = { current: null };

  const consider = (table: Meld[]) => {
    const check = checkPlay(state, seat, table);
    if (!check.ok) return;
    const score = (check.goesOut ? 10_000 : 0) + (check.added ?? 0) * 100 + (check.addedPoints ?? 0);
    if (!best.current || score > best.current.score) best.current = { table, score };
  };

  const walk = (table: Meld[], handLeft: Tile[], loose: Tile[], depth: number) => {
    if (depth > 0 && loose.length === 0) consider(table);
    if (depth >= DEPTH[level]) return;
    for (const step of proposals(table, handLeft, loose, level, depth, opened)) {
      walk(step.table, step.handLeft, step.loose, depth + 1);
    }
  };

  walk(state.table, state.hands[seat], [], 0);
  return best.current ? { type: "play", table: best.current.table } : { type: "draw" };
}
