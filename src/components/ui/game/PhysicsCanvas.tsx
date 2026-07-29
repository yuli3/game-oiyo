import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { createPhysicsWorld, type PhysicsPair } from '../../../lib/games/physics-world';
import { usePrefersReducedMotion } from '../../../lib/games/reduced-motion';

export interface PhysicsCanvasHandle {
  engine: Matter.Engine;
  world: Matter.World;
}

interface PhysicsCanvasProps {
  width: number;
  height: number;
  gravity?: { x: number; y: number };
  /** Static scenery, built once. Return the bodies to add. */
  setup: (world: Matter.World, engine: Matter.Engine) => Matter.Body[];
  /** Draw one frame. The canvas is already cleared. */
  draw: (ctx: CanvasRenderingContext2D, engine: Matter.Engine) => void;
  onCollisionStart?: (pairs: PhysicsPair[]) => void;
  /** Receives the engine once booted, so the parent can add dynamic bodies. */
  onReady?: (handle: PhysicsCanvasHandle) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * A Matter.js world rendered to a 2D canvas.
 *
 * `touch-none` is not optional here — it marks the element as a gesture-driven
 * play surface, which is also what exempts it from the global button rules in
 * global.css (see the 2026-07-29 note there about taps being swallowed).
 *
 * Under prefers-reduced-motion the world still simulates but the canvas is only
 * repainted when the parent asks, via the `draw` closure's own state; we do not
 * silently freeze physics, because a frozen board reads as a broken game rather
 * than a calmer one.
 */
export const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  width, height, gravity, setup, draw, onCollisionStart, onReady, className = '', ariaLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Held in refs so changing a closure does not tear down and rebuild the world,
  // which would reset every body mid-game.
  const drawRef = useRef(draw);
  const collideRef = useRef(onCollisionStart);
  drawRef.current = draw;
  collideRef.current = onCollisionStart;

  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const handle = createPhysicsWorld(Matter as never, {
      gravity,
      setup: (world, engine) => setup(world as Matter.World, engine as Matter.Engine),
      onCollisionStart: (pairs) => collideRef.current?.(pairs),
    });
    onReady?.({ engine: handle.engine as Matter.Engine, world: handle.world as Matter.World });

    let raf = 0;
    const frame = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        drawRef.current(ctx, handle.engine as Matter.Engine);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      handle.destroy();
    };
    // Intentionally mount-only: setup/gravity define the board, and re-running
    // them would rebuild the world underneath a game in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      aria-label={ariaLabel}
      role="img"
      className={`touch-none max-w-full ${prefersReducedMotion ? '' : 'transition-opacity'} ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
};
