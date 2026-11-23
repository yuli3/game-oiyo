// Path overlay for grid path puzzles (Arrow Walk, Number Trail, 2026-11-23).
// Draws the walked route as a glowing line over an n×n board whose cells are
// exact 1/n tiles, and, when `walker` is set, sends a little runner along it.

import { useEffect, useState } from "react";

interface Props {
  size: number;
  cells: readonly number[];
  /** Animate a runner along the route (restarts whenever the route changes). */
  walker?: boolean;
  /** Tone of the line: normal, solved (bright) or blocked (warning). */
  tone?: "normal" | "solved" | "blocked";
}

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduce(mq.matches);
      const on = () => setReduce(mq.matches);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    } catch {
      return undefined;
    }
  }, []);
  return reduce;
}

export default function PathOverlay({ size, cells, walker = false, tone = "normal" }: Props) {
  const reduce = useReducedMotion();
  if (cells.length === 0) return null;
  const pts = cells.map((c) => [(c % size) + 0.5, Math.floor(c / size) + 0.5] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const color = tone === "solved" ? "text-primary" : tone === "blocked" ? "text-destructive" : "text-primary/70";
  const [hx, hy] = pts[pts.length - 1]!;
  const dur = Math.max(0.6, cells.length * 0.16);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`pointer-events-none absolute inset-0 z-10 size-full ${color}`}
      aria-hidden="true"
    >
      {pts.length > 1 && (
        <>
          <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={0.3} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={0.08} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      <circle cx={pts[0]![0]} cy={pts[0]![1]} r={0.13} fill="currentColor" />
      <circle cx={hx} cy={hy} r={0.12} fill="currentColor" stroke="var(--color-background)" strokeWidth={0.05} />
      {walker && !reduce && pts.length > 1 && (
        <circle key={d} r={0.14} fill="var(--color-background)" stroke="currentColor" strokeWidth={0.06}>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}
    </svg>
  );
}
