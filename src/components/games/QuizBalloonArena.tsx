// Shared answer arena for the quiz games (2026-11-23). The four answers used to
// be a 2x2 grid of plain buttons. Now they are balloons rising over a sky on a
// canvas: pop the right one before they drift off the top. Wrong pops shake the
// screen, the right pop bursts into confetti. Keys 1-4 still answer.
// Pure helpers (layout, hit test, rise) are exported for tests.

import { useEffect, useRef } from "react";

export const ARENA_W = 360;
export const ARENA_H = 300;
const DPR = 2;
const COLORS = ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c"];

export interface BalloonSlot { x: number; y0: number; r: number; sway: number }

/** Four starting slots, staggered so neighbours never overlap. */
export function balloonSlots(count: number): BalloonSlot[] {
  const r = 40;
  return Array.from({ length: count }, (_, i) => ({
    x: (ARENA_W / (count + 1)) * (i + 1),
    y0: ARENA_H - 30 + (i % 2) * 60,
    r,
    sway: 1.1,
  }));
}

/** Balloon centre at `t` seconds for a round that lasts `durationS` seconds. */
export function balloonPos(slot: BalloonSlot, t: number, durationS: number): { x: number; y: number } {
  // every balloon rises at the same speed, so the stagger between neighbours holds
  const travel = ARENA_H + 60 + slot.r * 2;
  const y = slot.y0 - (travel * t) / durationS;
  const x = slot.x + Math.sin(t * slot.sway * 2) * 10;
  return { x, y };
}

export function hitBalloon(slots: BalloonSlot[], t: number, durationS: number, px: number, py: number, popped: readonly boolean[]): number {
  let best = -1;
  let bestD = Infinity;
  slots.forEach((s, i) => {
    if (popped[i]) return;
    const p = balloonPos(s, t, durationS);
    const d = Math.hypot(px - p.x, py - p.y);
    if (d < s.r * 1.15 && d < bestD) { best = i; bestD = d; }
  });
  return best;
}

/** Splits a label into at most two lines that fit a balloon. */
export function balloonLines(text: string, maxChars = 7): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return [clean];
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    let a = "";
    let b = "";
    for (const w of words) {
      if (!b && (a + " " + w).trim().length <= Math.max(maxChars, Math.ceil(clean.length / 2))) a = (a + " " + w).trim();
      else b = (b + " " + w).trim();
    }
    return [a, b].filter(Boolean);
  }
  const mid = Math.ceil(clean.length / 2);
  return [clean.slice(0, mid), clean.slice(mid)];
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number }

interface Props {
  options: string[];
  answer: string;
  selected: string | null;
  onPick: (option: string) => void;
  /** seconds the balloons take to float away; on timeout `onPick("")` is called */
  durationS?: number;
  ariaLabel: string;
}

export default function QuizBalloonArena({ options, answer, selected, onPick, durationS = 12, ariaLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slots = useRef(balloonSlots(options.length));
  const popped = useRef<boolean[]>(options.map(() => false));
  const sparks = useRef<Spark[]>([]);
  const t = useRef(0);
  const frozen = useRef(false);
  const shake = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const burst = (i: number, right: boolean) => {
    const p = balloonPos(slots.current[i]!, t.current, durationS);
    for (let k = 0; k < (right ? 26 : 12); k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (right ? 220 : 110);
      sparks.current.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9, color: right ? COLORS[k % 4]! : "#adb5bd", r: 2 + Math.random() * 3 });
    }
  };

  // when an answer lands (tap, key, or timeout), pop balloons and freeze the rise
  useEffect(() => {
    if (selected === null) return;
    frozen.current = true;
    options.forEach((o, i) => {
      if (o === selected && !popped.current[i]) { popped.current[i] = true; burst(i, o === answer); }
    });
    if (selected !== answer) shake.current = 0.35;
  }, [selected]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!frozen.current) t.current += dt;
      shake.current = Math.max(0, shake.current - dt);
      if (!frozen.current && t.current >= durationS && selectedRef.current === null) {
        frozen.current = true;
        pickRef.current("");
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (shake.current > 0) ctx.translate((Math.random() - 0.5) * 14 * shake.current, (Math.random() - 0.5) * 10 * shake.current);
        const sky = ctx.createLinearGradient(0, 0, 0, ARENA_H);
        sky.addColorStop(0, "#d0ebff");
        sky.addColorStop(1, "#fff9db");
        ctx.fillStyle = sky;
        ctx.fillRect(-10, -10, ARENA_W + 20, ARENA_H + 20);
        // clouds
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        for (let k = 0; k < 3; k++) {
          const cx = ((k * 140 + now / 60) % (ARENA_W + 120)) - 60;
          const cy = 40 + k * 70;
          ctx.beginPath(); ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2); ctx.ellipse(cx + 20, cy - 7, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
        }
        // timer: a fuse along the top
        const left = Math.max(0, 1 - t.current / durationS);
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(12, 8, ARENA_W - 24, 6);
        ctx.fillStyle = left < 0.25 ? "#fa5252" : "#fab005";
        ctx.fillRect(12, 8, (ARENA_W - 24) * left, 6);
        // balloons
        slots.current.forEach((s, i) => {
          const isAnswer = options[i] === answer;
          const reveal = selectedRef.current !== null;
          if (popped.current[i]) return;
          const p = balloonPos(s, t.current, durationS);
          // string
          ctx.strokeStyle = "rgba(73,80,87,0.5)";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y + s.r); ctx.quadraticCurveTo(p.x + 8, p.y + s.r + 24, p.x - 2, p.y + s.r + 46); ctx.stroke();
          const base = reveal && !isAnswer ? "#ced4da" : COLORS[i % 4]!;
          const g = ctx.createRadialGradient(p.x - s.r * 0.35, p.y - s.r * 0.4, 4, p.x, p.y, s.r);
          g.addColorStop(0, "#ffffff");
          g.addColorStop(0.3, base);
          g.addColorStop(1, base);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, s.r * 0.92, s.r, 0, 0, Math.PI * 2); ctx.fill();
          if (reveal && isAnswer) { ctx.strokeStyle = "#2f9e44"; ctx.lineWidth = 4; ctx.stroke(); }
          ctx.fillStyle = base;
          ctx.beginPath(); ctx.moveTo(p.x - 5, p.y + s.r + 6); ctx.lineTo(p.x + 5, p.y + s.r + 6); ctx.lineTo(p.x, p.y + s.r - 2); ctx.fill();
          // label
          const lines = balloonLines(options[i] ?? "");
          ctx.fillStyle = "#212529";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const size = lines.some((l) => l.length > 5) ? 14 : 17;
          ctx.font = `800 ${size}px system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
          lines.forEach((l, k) => ctx.fillText(l, p.x, p.y + (k - (lines.length - 1) / 2) * (size + 3)));
          ctx.font = "700 11px system-ui, sans-serif";
          ctx.fillStyle = "rgba(33,37,41,0.55)";
          ctx.fillText(String(i + 1), p.x, p.y - s.r + 14);
        });
        sparks.current = sparks.current.filter((sp) => sp.life > 0);
        for (const sp of sparks.current) {
          sp.life -= dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 260 * dt;
          ctx.globalAlpha = Math.max(0, sp.life / 0.9);
          ctx.fillStyle = sp.color;
          ctx.fillRect(sp.x - sp.r / 2, sp.y - sp.r / 2, sp.r, sp.r * 1.6);
        }
        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [answer, durationS, options]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (selectedRef.current !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ARENA_W;
    const y = ((e.clientY - rect.top) / rect.height) * ARENA_H;
    const i = hitBalloon(slots.current, t.current, durationS, x, y, popped.current);
    if (i >= 0) onPick(options[i]!);
  };

  return (
    <canvas
      ref={canvasRef}
      width={ARENA_W * DPR}
      height={ARENA_H * DPR}
      onPointerDown={onDown}
      className="block w-full touch-none select-none rounded-2xl border border-border"
      aria-label={`${ariaLabel}: ${options.map((o, i) => `${i + 1} ${o}`).join(", ")}`}
      role="img"
    />
  );
}
