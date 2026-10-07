import { useCallback, useEffect, useRef, useState } from "react";
import type { AimDifficulty } from "../../lib/games/aim-trainer";
import {
  FLASH_FUSE_MS,
  FLASH_ROUND_TIMEOUT_MS,
  FLASH_SENS_DEFAULT,
  FLASH_SENS_MAX,
  FLASH_SENS_MIN,
  FLASH_TARGET_RADIUS_DEG,
  angleDiff,
  clampFlashSens,
  degreesToPixels,
  flashBlindness,
  flashWhiteness,
  isOnFlashTarget,
  nextFlashRound,
  yawToScreenX,
  type FlashRound,
} from "../../lib/games/flash-dodge";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

/* Flash-dodge drill ("삥 피하기"): face the doorway, turn away before the flash pops, turn back
 * and shoot the target that steps out. Unlike the other aim modes this one rotates a view
 * instead of moving a cursor, so it owns its own field: a canvas strip driven by the yaw angle.
 * The parent keeps the clock, the score and the result screen. */

export interface AimFlashCopy {
  field: string;
  lock: string;
  mouse: string;
  touch: string;
  sens: string;
  dodged: string;
  blinded: string;
  faceDoor: string;
}

interface Props {
  diff: AimDifficulty;
  copy: AimFlashCopy;
  tone: (frequency: number, duration?: number) => void;
  onHit: (reactionMs: number) => void;
  onMiss: () => void;
}

type Stage = "wait" | "fuse" | "live";

const SENS_KEY = "oiyo:aim-flash-sens";
const FACING_DEG = 25; // the flash is only thrown while the player is actually watching the doorway
// On touch one swipe across the whole field turns this far at the default sensitivity. A phone
// field is about 300px wide, so a per-pixel rate tuned for a mouse could never finish the turn.
const TOUCH_SWIPE_DEG = 200;
const TAP_MOVE_PX = 10;
const TAP_MS = 280;

function readSens(): number {
  try {
    const stored = window.localStorage.getItem(SENS_KEY);
    return stored === null ? FLASH_SENS_DEFAULT : clampFlashSens(Number(stored));
  } catch {
    return FLASH_SENS_DEFAULT;
  }
}

export default function AimFlashField({ diff, copy, tone, onHit, onMiss }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [locked, setLocked] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [sens, setSens] = useState(FLASH_SENS_DEFAULT);

  // Per-frame state lives in refs: a re-render per mouse move would stutter the view.
  const yaw = useRef(0);
  const sensRef = useRef(FLASH_SENS_DEFAULT);
  const stage = useRef<Stage>("wait");
  const round = useRef<FlashRound>(nextFlashRound());
  const facedMs = useRef(0);
  const stageAt = useRef(0);
  const blindness = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const note = useRef<{ text: string; good: boolean; at: number } | null>(null);
  const lockedRef = useRef(false);
  const coarseRef = useRef(false);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const callbacks = useRef({ tone, onHit, onMiss, copy });
  callbacks.current = { tone, onHit, onMiss, copy };
  const drag = useRef<{ x: number; startX: number; startY: number; at: number; moved: number } | null>(null);

  useEffect(() => {
    const stored = readSens();
    sensRef.current = stored;
    setSens(stored);
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => { coarseRef.current = query.matches; setCoarse(query.matches); };
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const startRound = useCallback(() => {
    round.current = nextFlashRound();
    stage.current = "wait";
    facedMs.current = 0;
    blindness.current = 0;
  }, []);

  const fire = useCallback(() => {
    if (stage.current !== "live") return;
    const now = performance.now();
    const { tone: play, onHit: hit, onMiss: miss, copy: text } = callbacks.current;
    if (isOnFlashTarget(yaw.current, diff)) {
      const clean = blindness.current < 0.25;
      note.current = { text: clean ? text.dodged : text.blinded, good: clean, at: now };
      play(clean ? 880 : 620, 0.07);
      hit(now - stageAt.current);
      startRound();
    } else {
      play(180, 0.06);
      miss();
    }
  }, [diff, startRound]);

  // Pointer lock (mouse). The lock is asked for on mount because the Start click that mounted
  // this field still counts as a user gesture; if the browser refuses, the overlay asks for a click.
  const requestLock = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || coarseRef.current || !canvas.requestPointerLock) return;
    try {
      const result = canvas.requestPointerLock() as unknown;
      if (result && typeof (result as Promise<void>).catch === "function") (result as Promise<void>).catch(() => undefined);
    } catch {
      /* the overlay stays up and the next click tries again */
    }
  }, []);

  useEffect(() => {
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      lockedRef.current = isLocked;
      setLocked(isLocked);
      // Losing the lock mid-round would leave a flash in the air nobody can answer.
      if (!isLocked) startRound();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!lockedRef.current) return;
      yaw.current += event.movementX * sensRef.current;
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!lockedRef.current || event.button !== 0) return;
      fire();
    };
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    const timer = window.setTimeout(requestLock, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      if (document.pointerLockElement === canvasRef.current) document.exitPointerLock?.();
    };
  }, [fire, requestLock, startRound]);

  // Touch: drag turns the view, a short tap fires.
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") {
      if (!lockedRef.current) requestLock();
      return;
    }
    drag.current = { x: event.clientX, startX: event.clientX, startY: event.clientY, at: performance.now(), moved: 0 };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current || event.pointerType === "mouse") return;
    const dx = event.clientX - current.x;
    current.x = event.clientX;
    current.moved = Math.max(current.moved, Math.hypot(event.clientX - current.startX, event.clientY - current.startY));
    const fieldWidth = wrapRef.current?.clientWidth || 300;
    yaw.current += dx * (TOUCH_SWIPE_DEG / fieldWidth) * (sensRef.current / FLASH_SENS_DEFAULT);
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const current = drag.current;
    drag.current = null;
    if (!current || event.pointerType === "mouse") return;
    if (current.moved <= TAP_MOVE_PX && performance.now() - current.at <= TAP_MS) fire();
  };

  // Game loop + drawing.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(wrap.clientWidth * ratio));
      const height = Math.max(1, Math.round(wrap.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    startRound();
    lastFrame.current = null;
    let raf = 0;

    const draw = (now: number) => {
      const width = canvas.width;
      const height = canvas.height;
      const view = yaw.current;
      const unit = height / 100;

      context.fillStyle = "#1e293b";
      context.fillRect(0, 0, width, height * 0.5);
      context.fillStyle = "#334155";
      context.fillRect(0, height * 0.5, width, height * 0.5);

      // Pillars every 30° give the turn something to slide past. The one straight behind is marked.
      for (let index = 0; index < 12; index += 1) {
        const worldYaw = index * 30;
        if (worldYaw === 0) continue;
        const x = yawToScreenX(worldYaw, view, width, 6);
        if (x === null) continue;
        const pillar = Math.max(2, degreesToPixels(3.2, width));
        context.fillStyle = worldYaw === 180 ? "#7c2d12" : "#475569";
        context.fillRect(x - pillar / 2, height * 0.24, pillar, height * 0.52);
      }

      // Doorway at yaw 0.
      const doorX = yawToScreenX(0, view, width, 12);
      if (doorX !== null) {
        const doorWidth = degreesToPixels(18, width);
        context.fillStyle = "#0f172a";
        context.fillRect(doorX - doorWidth / 2, height * 0.26, doorWidth, height * 0.5);
        context.strokeStyle = "#cbd5e1";
        context.lineWidth = Math.max(2, unit * 0.8);
        context.strokeRect(doorX - doorWidth / 2, height * 0.26, doorWidth, height * 0.5);
        if (stage.current === "live") {
          const radius = Math.max(4, degreesToPixels(FLASH_TARGET_RADIUS_DEG[diff], width));
          context.fillStyle = "#f97316";
          context.beginPath();
          context.arc(doorX, height * 0.5, radius, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#fff7ed";
          context.beginPath();
          context.arc(doorX, height * 0.5, radius * 0.38, 0, Math.PI * 2);
          context.fill();
        }
      }

      // The flash in the air: a ring that closes as the fuse burns down.
      if (stage.current === "fuse") {
        const flashX = yawToScreenX(round.current.flashYaw, view, width, 8);
        if (flashX !== null) {
          const left = 1 - Math.min(1, (now - stageAt.current) / FLASH_FUSE_MS[diff]);
          const y = height * (0.36 - 0.06 * (1 - left));
          context.fillStyle = "#fde047";
          context.beginPath();
          context.arc(flashX, y, unit * 2.2, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = "#fef9c3";
          context.lineWidth = Math.max(2, unit * 0.7);
          context.beginPath();
          context.arc(flashX, y, unit * (2.6 + 7 * left), 0, Math.PI * 2);
          context.stroke();
        }
      }

      // Crosshair.
      context.strokeStyle = "#f8fafc";
      context.lineWidth = Math.max(1.5, unit * 0.45);
      context.beginPath();
      context.moveTo(width / 2 - unit * 2.4, height / 2);
      context.lineTo(width / 2 + unit * 2.4, height / 2);
      context.moveTo(width / 2, height / 2 - unit * 2.4);
      context.lineTo(width / 2, height / 2 + unit * 2.4);
      context.stroke();

      // Blindness. Reduced motion swaps the white burst for a dark veil: same penalty, no flicker.
      if (stage.current === "live" && blindness.current > 0) {
        const white = flashWhiteness(blindness.current, now - stageAt.current);
        if (white > 0) {
          context.globalAlpha = Math.min(0.94, white);
          context.fillStyle = reducedRef.current ? "#020617" : "#ffffff";
          context.fillRect(0, 0, width, height);
          context.globalAlpha = 1;
        }
      }

      const text = callbacks.current.copy;
      context.textAlign = "center";
      context.font = `700 ${Math.round(unit * 4.6)}px system-ui, sans-serif`;
      const current = note.current;
      if (current && now - current.at < 800) {
        context.fillStyle = current.good ? "#4ade80" : "#fca5a5";
        context.fillText(current.text, width / 2, height * 0.16);
      } else if (stage.current === "wait" && Math.abs(angleDiff(view, 0)) > FACING_DEG && (lockedRef.current || coarseRef.current)) {
        context.fillStyle = "#e2e8f0";
        context.fillText(text.faceDoor, width / 2, height * 0.16);
      }
    };

    const frame = (now: number) => {
      const delta = lastFrame.current === null ? 0 : Math.min(100, now - lastFrame.current);
      lastFrame.current = now;
      const active = (lockedRef.current || coarseRef.current) && !document.hidden;
      if (active) {
        if (stage.current === "wait") {
          if (Math.abs(angleDiff(yaw.current, 0)) <= FACING_DEG) facedMs.current += delta;
          if (facedMs.current >= round.current.delayMs) {
            stage.current = "fuse";
            stageAt.current = now;
            callbacks.current.tone(1320, 0.05);
          }
        } else if (stage.current === "fuse") {
          if (now - stageAt.current >= FLASH_FUSE_MS[diff]) {
            blindness.current = flashBlindness(yaw.current, round.current.flashYaw);
            stage.current = "live";
            stageAt.current = now;
            callbacks.current.tone(240, 0.12);
          }
        } else if (now - stageAt.current >= FLASH_ROUND_TIMEOUT_MS) {
          callbacks.current.onMiss();
          startRound();
        }
      } else if (stage.current !== "wait") {
        startRound();
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [diff, startRound]);

  const changeSens = (value: number) => {
    const next = clampFlashSens(value);
    sensRef.current = next;
    setSens(next);
    try { window.localStorage.setItem(SENS_KEY, String(next)); } catch { /* storage is best-effort */ }
  };

  return (
    <div>
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-auto aspect-video w-full touch-none overflow-hidden rounded-2xl border border-border bg-muted/40"
      >
        <canvas ref={canvasRef} role="img" aria-label={copy.field} className="block h-full w-full cursor-crosshair" />
        {!locked && !coarse && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center text-sm font-bold text-foreground">
            {copy.lock}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">{coarse ? copy.touch : copy.mouse}</p>
      <label className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
        <span>{copy.sens}</span>
        <input
          type="range"
          min={FLASH_SENS_MIN}
          max={FLASH_SENS_MAX}
          step={0.01}
          value={sens}
          onChange={(event) => changeSens(Number(event.target.value))}
          className="w-40 accent-primary"
        />
        <span className="w-10 tabular-nums text-foreground">{sens.toFixed(2)}</span>
      </label>
    </div>
  );
}
