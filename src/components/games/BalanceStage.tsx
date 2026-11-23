// Balance Game stage (2026-11-23): replaces the two plain choice buttons with a
// swipeable prompt card over a canvas seesaw. Swipe (or tap a half) to drop
// your coin on side A or B; the crowd's coins pile up on the pans and the beam
// tips to the real split. Hook (design lens): funny/social "am I with the
// majority?" moments.

import { useEffect, useRef, useState } from "react";

const W = 360;
const H = 170;
const DPR = 2;
const PIVOT_X = W / 2;
const PIVOT_Y = 60;
const ARM = 130;

export interface SeesawProps {
  /** Crowd share of A in 0..1, or null before anyone answered. */
  shareA: number | null;
  /** Bumps each time the player drops a coin. */
  dropKey: number;
  dropSide: "a" | "b" | null;
  ariaLabel: string;
}

/** Canvas seesaw: beam tips toward the heavier side, coins stack on each pan. */
export function BalanceSeesaw({ shareA, dropKey, dropSide, ariaLabel }: SeesawProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const target = useRef({ shareA, dropKey, dropSide });
  target.current = { shareA, dropKey, dropSide };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let tilt = 0;
    let vel = 0;
    let seenDrop = target.current.dropKey;
    let drop: { side: "a" | "b"; t: number } | null = null;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { shareA: share, dropKey: dk, dropSide: ds } = target.current;
      if (dk !== seenDrop) {
        seenDrop = dk;
        if (ds) { drop = { side: ds, t: 0 }; vel += ds === "a" ? -1.6 : 1.6; }
      }
      // spring toward the crowd split (A heavier → tip left = negative)
      const want = share === null ? 0 : (0.5 - share) * 0.5;
      vel += (want - tilt) * 30 * dt;
      vel *= Math.pow(0.04, dt);
      tilt += vel * dt;
      if (drop) { drop.t += dt; if (drop.t > 0.9) drop = null; }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);
        // stand
        ctx.fillStyle = "#8b6b4a";
        ctx.beginPath(); ctx.moveTo(PIVOT_X, PIVOT_Y); ctx.lineTo(PIVOT_X - 30, H - 10); ctx.lineTo(PIVOT_X + 30, H - 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#6e5238"; ctx.beginPath(); ctx.roundRect(PIVOT_X - 60, H - 14, 120, 10, 5); ctx.fill();
        const cos = Math.cos(tilt);
        const sin = Math.sin(tilt);
        const ends = [[-1, "a"], [1, "b"]] as const;
        // pans hang straight down from the beam ends
        for (const [dir, side] of ends) {
          const ex = PIVOT_X + dir * ARM * cos;
          const ey = PIVOT_Y + dir * ARM * sin;
          const py = ey + 52;
          ctx.strokeStyle = "rgba(120,100,80,0.8)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 34, py); ctx.moveTo(ex, ey); ctx.lineTo(ex + 34, py); ctx.stroke();
          ctx.fillStyle = side === "a" ? "#4c6ef5" : "#f76707";
          ctx.beginPath(); ctx.ellipse(ex, py, 40, 9, 0, 0, Math.PI * 2); ctx.fill();
          // coin pile proportional to the share (max 10 coins)
          const s = share === null ? 0 : side === "a" ? share : 1 - share;
          const coins = share === null ? 0 : Math.max(1, Math.round(s * 10));
          for (let k = 0; k < coins; k++) {
            const row = Math.floor(k / 4);
            const col = k % 4;
            const cx = ex - 21 + col * 14 + (row % 2) * 7;
            const cy = py - 6 - row * 8;
            ctx.fillStyle = "#f2c230"; ctx.beginPath(); ctx.ellipse(cx, cy, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.fillStyle = "#ffffff"; ctx.font = "900 15px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(side.toUpperCase(), ex, py + 1);
          if (share !== null) {
            ctx.fillStyle = side === "a" ? "#4c6ef5" : "#f76707"; ctx.font = "800 14px system-ui";
            ctx.fillText(`${Math.round(s * 100)}%`, ex, py + 24);
          }
          if (drop && drop.side === side) {
            const k = Math.min(1, drop.t / 0.4);
            const y = -10 + (py - 30) * k * k;
            ctx.fillStyle = "#ffd43b"; ctx.beginPath(); ctx.arc(ex, y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2; ctx.stroke();
            if (drop.t > 0.4) {
              ctx.strokeStyle = `rgba(255,212,59,${1 - (drop.t - 0.4) / 0.5})`; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.arc(ex, py - 10, 20 + (drop.t - 0.4) * 60, 0, Math.PI * 2); ctx.stroke();
            }
          }
        }
        // beam
        ctx.strokeStyle = "#5c4030"; ctx.lineWidth = 8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(PIVOT_X - ARM * cos, PIVOT_Y - ARM * sin); ctx.lineTo(PIVOT_X + ARM * cos, PIVOT_Y + ARM * sin); ctx.stroke();
        ctx.fillStyle = "#f2c230"; ctx.beginPath(); ctx.arc(PIVOT_X, PIVOT_Y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W * DPR}
      height={H * DPR}
      role="img"
      aria-label={ariaLabel}
      className="pointer-events-none mx-auto block w-full max-w-sm select-none"
    />
  );
}

export interface SwipeCardProps {
  a: string;
  b: string;
  hint: string;
  pickALabel: string;
  pickBLabel: string;
  onPick: (side: "a" | "b") => void;
}

const SWIPE_PX = 70;

/** Prompt card: drag left for A, right for B, or tap a half. */
export function SwipeCard({ a, b, hint, pickALabel, pickBLabel, onPick }: SwipeCardProps) {
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<"a" | "b" | null>(null);
  const start = useRef<{ x: number; id: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { setDx(0); setFly(null); }, [a, b]);

  const finish = (side: "a" | "b") => {
    setFly(side);
    window.setTimeout(() => onPick(side), 160);
  };

  const lean = Math.max(-1, Math.min(1, dx / SWIPE_PX));
  const x = fly === "a" ? -420 : fly === "b" ? 420 : dx;
  return (
    <div className="relative w-full max-w-xl touch-pan-y select-none">
      <div
        role="group"
        aria-label={hint}
        style={{ "--card-x": `${x}px`, "--card-rot": `${x * 0.05}deg` } as React.CSSProperties}
        className={`grid cursor-grab grid-cols-2 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md translate-x-(--card-x) rotate-(--card-rot) active:cursor-grabbing ${dragging ? "" : "transition-transform duration-200"}`}
        onPointerDown={(e) => {
          if (fly) return;
          start.current = { x: e.clientX, id: e.pointerId };
          setDragging(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => { if (start.current && start.current.id === e.pointerId) setDx(e.clientX - start.current.x); }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          setDragging(false);
          if (!s || fly) return;
          const d = e.clientX - s.x;
          if (d <= -SWIPE_PX) { finish("a"); return; }
          if (d >= SWIPE_PX) { finish("b"); return; }
          setDx(0);
          if (Math.abs(d) < 8) {
            const r = e.currentTarget.getBoundingClientRect();
            finish(e.clientX - r.left < r.width / 2 ? "a" : "b");
          }
        }}
        onPointerCancel={() => { start.current = null; setDragging(false); setDx(0); }}
      >
        <button
          type="button"
          tabIndex={0}
          aria-label={`${pickALabel}: ${a}`}
          onClick={(e) => { if (e.detail === 0) finish("a"); }}
          className={`flex min-h-36 flex-col items-center justify-center gap-2 border-r border-border p-4 text-center text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${lean < -0.3 ? "bg-primary/15" : "bg-transparent"}`}
        >
          <span className="text-2xl font-black text-primary">A</span>
          <span className="text-foreground">{a}</span>
        </button>
        <button
          type="button"
          tabIndex={0}
          aria-label={`${pickBLabel}: ${b}`}
          onClick={(e) => { if (e.detail === 0) finish("b"); }}
          className={`flex min-h-36 flex-col items-center justify-center gap-2 p-4 text-center text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chart-2 ${lean > 0.3 ? "bg-chart-2/15" : "bg-transparent"}`}
        >
          <span className="text-2xl font-black text-chart-2">B</span>
          <span className="text-foreground">{b}</span>
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">← A · {hint} · B →</p>
    </div>
  );
}
