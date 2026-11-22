// Test helper players for Snowman Stack.
import { WORLD_W, canDrop, createGame, drop, step, trolleyX, type Game } from "./snowman-stack";

/**
 * Waits until the snowman has stopped rocking, then drops when the trolley is `dx` px past
 * the top piece (dx = 0 is a careful player; the sign alternates when `alternate` is set).
 */
export function autoplay(index: number, dx = 0, alternate = false, maxSteps = 60 * 70): Game {
  const g = createGame(index);
  let calm = 0;
  while (g.phase === "play" && g.steps < maxSteps) {
    const top = g.pieces[g.pieces.length - 1];
    calm = !top || Math.abs(top.body.parent.angularVelocity) < 0.003 ? calm + 1 : 0;
    if (canDrop(g) && calm > 20) {
      const sign = alternate && g.pieces.length % 2 === 0 ? -1 : 1;
      const target = top ? top.body.position.x + dx * sign : WORLD_W / 2;
      if (Math.abs(trolleyX(g) - target) < 2.5) drop(g);
    }
    step(g);
  }
  return g;
}

/** Drops every piece the moment it is allowed, wherever the trolley is. */
export function careless(index: number, maxSteps = 60 * 70): Game {
  const g = createGame(index);
  while (g.phase === "play" && g.steps < maxSteps) {
    if (canDrop(g)) drop(g);
    step(g);
  }
  return g;
}
