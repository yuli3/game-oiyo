// Number line dial for the number-guessing game (2026-11-23). Instead of only
// typing a number, drag a ball along a ruler that zooms in as the range
// narrows. Ruled-out stretches are hatched, earlier guesses stand as flags
// coloured by temperature (hot / warm / cold).

import { useEffect, useRef } from "react";
import type { NumberGuessingState } from "../../lib/games/number-guessing";

const W = 360;
const H = 150;
const DPR = 2;
const PAD_X = 22;
const RULER_Y = 96;

const TEMP_COLOR = { hot: "#e03131", warm: "#f08c00", cold: "#1c7ed6", exact: "#2f9e44" } as const;

/** Visible window: the open range plus a margin of ruled-out numbers on each side. */
export function viewWindow(s: Pick<NumberGuessingState, "min" | "max" | "lowerBound" | "upperBound">): [number, number] {
  const span = Math.max(1, s.upperBound - s.lowerBound);
  const pad = Math.max(2, Math.ceil(span * 0.18));
  return [Math.max(s.min, s.lowerBound - pad), Math.min(s.max, s.upperBound + pad)];
}

function tickStep(span: number): number {
  const raw = span / 8;
  const p = 10 ** Math.floor(Math.log10(Math.max(1, raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return Math.max(1, m * p);
  return Math.max(1, 10 * p);
}

export interface NumberLineDialProps {
  state: NumberGuessingState;
  value: number | null;
  disabled?: boolean;
  label: string;
  onChange: (n: number) => void;
}

export default function NumberLineDial({ state, value, disabled = false, label, onChange }: NumberLineDialProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ state, value });
  live.current = { state, value };
  const dragging = useRef(false);

  useEffect(() => {
    let raf = 0;
    let lo = viewWindow(state)[0];
    let hi = viewWindow(state)[1];
    let time = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const { state: s, value: v } = live.current;
      const [tlo, thi] = viewWindow(s);
      const k = 1 - Math.pow(0.002, dt);
      lo += (tlo - lo) * k;
      hi += (thi - hi) * k;
      const toX = (n: number) => PAD_X + ((n - lo) / Math.max(1e-6, hi - lo)) * (W - PAD_X * 2);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#14213d");
        bg.addColorStop(1, "#1f3b5c");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        // open range glow
        const ax = toX(s.lowerBound - 0.5);
        const bx = toX(s.upperBound + 0.5);
        ctx.fillStyle = "rgba(255,212,59,0.16)";
        ctx.fillRect(ax, RULER_Y - 30, bx - ax, 44);
        // ruled-out hatch
        ctx.save();
        ctx.beginPath(); ctx.rect(0, RULER_Y - 30, ax, 44); ctx.rect(bx, RULER_Y - 30, W - bx, 44); ctx.clip();
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2;
        for (let x = -60; x < W + 60; x += 9) { ctx.beginPath(); ctx.moveTo(x, RULER_Y + 14); ctx.lineTo(x + 44, RULER_Y - 30); ctx.stroke(); }
        ctx.restore();
        // ruler
        ctx.strokeStyle = "#e9ecef"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(PAD_X - 8, RULER_Y); ctx.lineTo(W - PAD_X + 8, RULER_Y); ctx.stroke();
        const step = tickStep(hi - lo);
        ctx.fillStyle = "#ced4da"; ctx.font = "700 10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let n = Math.ceil(lo / step) * step; n <= hi; n += step) {
          const x = toX(n);
          ctx.strokeStyle = "rgba(233,236,239,0.8)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, RULER_Y - 6); ctx.lineTo(x, RULER_Y + 6); ctx.stroke();
          ctx.fillText(String(n), x, RULER_Y + 10);
        }
        // bounds labels
        ctx.fillStyle = "#ffd43b"; ctx.font = "800 11px system-ui"; ctx.textBaseline = "alphabetic";
        ctx.fillText(String(s.lowerBound), Math.max(16, ax + 8), RULER_Y + 38);
        ctx.fillText(String(s.upperBound), Math.min(W - 16, bx - 8), RULER_Y + 38);
        // earlier guesses as flags
        for (const a of s.attempts) {
          const x = toX(a.guess);
          if (x < -10 || x > W + 10) continue;
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, RULER_Y); ctx.lineTo(x, RULER_Y - 26); ctx.stroke();
          ctx.fillStyle = TEMP_COLOR[a.temperature];
          ctx.beginPath(); ctx.moveTo(x, RULER_Y - 26); ctx.lineTo(x + (a.direction === "higher" ? 12 : -12), RULER_Y - 21); ctx.lineTo(x, RULER_Y - 16); ctx.closePath(); ctx.fill();
        }
        // ball marker
        if (v !== null && Number.isFinite(v)) {
          const x = toX(v);
          const bob = Math.sin(time * 5) * 2;
          ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, RULER_Y); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(x, 40 + bob, 13, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#e03131"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x - 18, 40 + bob, 13, -0.6, 0.6); ctx.stroke();
          ctx.beginPath(); ctx.arc(x + 18, 40 + bob, 13, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
          ctx.fillStyle = "#ffd43b"; ctx.font = "900 22px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const lx = Math.max(30, Math.min(W - 30, x));
          ctx.fillText(String(v), lx, 14);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // the loop reads props from a ref, so it starts once
  }, []);

  const pickAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = live.current.state;
    const r = e.currentTarget.getBoundingClientRect();
    const [lo, hi] = viewWindow(s);
    const x = ((e.clientX - r.left) / r.width) * W;
    const n = Math.round(lo + ((x - PAD_X) / (W - PAD_X * 2)) * (hi - lo));
    onChange(Math.max(s.lowerBound, Math.min(s.upperBound, n)));
  };

  return (
    <canvas
      ref={canvasRef}
      width={W * DPR}
      height={H * DPR}
      tabIndex={disabled ? -1 : 0}
      role="slider"
      aria-label={label}
      aria-valuemin={state.lowerBound}
      aria-valuemax={state.upperBound}
      aria-valuenow={value ?? undefined}
      onPointerDown={(e) => { if (disabled) return; e.preventDefault(); dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); pickAt(e); }}
      onPointerMove={(e) => { if (dragging.current && !disabled) pickAt(e); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={(e) => {
        if (disabled) return;
        const cur = value ?? Math.floor((state.lowerBound + state.upperBound) / 2);
        const d = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(state.lowerBound, cur - d)); }
        else if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(state.upperBound, cur + d)); }
      }}
      className="mb-3 block w-full touch-none select-none rounded-2xl border border-border"
    />
  );
}
