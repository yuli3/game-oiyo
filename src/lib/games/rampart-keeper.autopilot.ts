// Test helper: a simple player that builds a fixed wall and drops boulders on the lead invader.
import { BLOCKS, canDrop, createSiege, dropBoulder, leadInvader, placeBlock, startSiege, stepSiege, type BlockKind, type Siege } from "./rampart-keeper";

export function autoBuild(s: Siege): void {
  const order: [BlockKind, number][] = [["stone", 1], ["stone", 2], ["stone", 1], ["stone", 2], ["plank", 3], ["stone", 3], ["plank", 0], ["plank", 4], ["stone", 1], ["stone", 2], ["plank", 5], ["stone", 3], ["plank", 0], ["stone", 4]];
  for (const [kind, col] of order) {
    if (s.budgetLeft < BLOCKS[kind].cost) continue;
    placeBlock(s, kind, col);
  }
  while (s.budgetLeft >= 1 && placeBlock(s, "plank", s.blocks.length % 6)) { /* fill */ }
}

export function autoplay(index: number, maxMs = 120_000): Siege {
  const s = createSiege(index);
  autoBuild(s);
  startSiege(s);
  while (s.phase === "siege" && s.time < maxMs) {
    const lead = leadInvader(s);
    if (lead && canDrop(s) && lead.body.position.x < 560) {
      dropBoulder(s, lead.body.position.x + lead.body.velocity.x * 22);
    }
    stepSiege(s);
  }
  return s;
}

/** Builds the same wall but never drops a boulder. */
export function wallsOnly(index: number, maxMs = 120_000): Siege {
  const s = createSiege(index);
  autoBuild(s);
  startSiege(s);
  while (s.phase === "siege" && s.time < maxMs) stepSiege(s);
  return s;
}

/** Builds nothing and never drops a boulder. */
export function idle(index: number, maxMs = 120_000): Siege {
  const s = createSiege(index);
  startSiege(s);
  while (s.phase === "siege" && s.time < maxMs) stepSiege(s);
  return s;
}
