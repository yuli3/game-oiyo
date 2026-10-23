// Draws BurstField particles on a canvas laid exactly over one game element (its board,
// canvas or stage), so a win reads as part of the game instead of paper falling over the
// page. The overlay follows the element while it scrolls, ignores pointer input, and is
// removed when the last particle ends. Reduced motion skips particles and shows only the
// optional label, without movement.
// 2026-10-23

import { useCallback, useRef } from "react";
import { createBurstField, type BurstField, type BurstPresetName, type Particle } from "./juice";

export interface CelebrateOptions {
  preset: BurstPresetName;
  /** Colors from the game's palette. Defaults to the page's --primary. */
  colors?: readonly string[];
  /** Origin inside the element, 0..1 on each axis. Defaults to the centre, a little low. */
  origin?: { x: number; y: number };
  /** Emits the preset again at these extra origins, e.g. both sides of a board. */
  extraOrigins?: readonly { x: number; y: number }[];
  /** Short label that rises from the origin, e.g. "NEW BEST". */
  label?: string;
  scale?: number;
}

interface Stage {
  canvas: HTMLCanvasElement;
  field: BurstField;
  labels: { text: string; x: number; y: number; ageMs: number }[];
  frame: number;
  last: number;
  observer?: MutationObserver;
}

const LABEL_MS = 1100;
const stages = new WeakMap<HTMLElement, Stage>();

function mountStage(target: HTMLElement, canvas: HTMLCanvasElement) {
  // Native fullscreen excludes body siblings, regardless of z-index (PR19 review, 2026-10-23).
  const fullscreen = document.fullscreenElement;
  const host = fullscreen?.contains(target) ? fullscreen : document.body;
  if (canvas.parentElement !== host) host.appendChild(canvas);
}

/** Releases an active effect when its owning game/ref is replaced or unmounted. */
export function disposeCelebration(target: HTMLElement | null | undefined): void {
  if (!target) return;
  const stage = stages.get(target);
  if (!stage) return;
  cancelAnimationFrame(stage.frame);
  stage.frame = 0;
  stage.observer?.disconnect();
  stage.canvas.remove();
  stages.delete(target);
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function defaultColors(target: HTMLElement): string[] {
  const primary = getComputedStyle(target).getPropertyValue("--primary").trim();
  return primary ? [primary, "#ffffff"] : ["#ffffff"];
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
  const fade = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  ctx.globalAlpha = Math.max(0, fade);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  const s = p.size;
  if (p.shape === "ring") {
    ctx.globalAlpha = Math.max(0, 1 - progress) * 0.8;
    ctx.lineWidth = 3 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s + progress * 90, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  switch (p.shape) {
    case "shard":
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, s * 0.6);
      ctx.lineTo(-s * 0.5, s * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const r = i % 2 === 0 ? s : s * 0.38;
        const a = (i * Math.PI) / 4;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "tile":
    case "card": {
      const w = p.shape === "card" ? s * 0.72 : s;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -s / 2, w, s, s * 0.18);
      ctx.fill();
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-w / 2 + 2, -s / 2 + 2, w - 4, s * 0.22);
      break;
    }
    case "coin":
      // A coin turning on its axis: squash the width by the rotation.
      ctx.scale(Math.max(0.15, Math.abs(Math.cos(p.rot * 2))), 1);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha *= 0.4;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-s * 0.3, -s * 0.3, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "leaf":
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "note":
      ctx.beginPath();
      ctx.ellipse(0, s * 0.4, s * 0.42, s * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(s * 0.3, -s * 0.8, s * 0.14, s * 1.2);
      break;
    case "spark":
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = Math.max(1, s * 0.22);
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function ensureStage(target: HTMLElement): Stage | null {
  const existing = stages.get(target);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", pointerEvents: "none", zIndex: "60", left: "0", top: "0" });
  mountStage(target, canvas);
  const stage: Stage = { canvas, field: createBurstField(), labels: [], frame: 0, last: 0 };
  stages.set(target, stage);
  // Direct celebrate(canvasRef.current) callers do not use our callback ref. Observe
  // removal too, so a background tab's paused rAF cannot retain a departed game.
  stage.observer = new MutationObserver(() => {
    if (!target.isConnected) disposeCelebration(target);
  });
  stage.observer.observe(document.documentElement, { childList: true, subtree: true });
  return stage;
}

function run(target: HTMLElement, stage: Stage) {
  if (stage.frame) return;
  stage.last = performance.now();
  const tick = (now: number) => {
    if (!target.isConnected) { disposeCelebration(target); return; }
    const dt = Math.min(50, now - stage.last);
    stage.last = now;
    const rect = target.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { canvas } = stage;
    mountStage(target, canvas);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    // Canvas stores integer dimensions; compare the same rounded units to avoid
    // reallocating its drawing buffer on every frame at e.g. DPR 1.25.
    const pixelWidth = Math.round(w * dpr);
    const pixelHeight = Math.round(h * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    canvas.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    const ctx = canvas.getContext("2d");
    stage.field.step(dt);
    for (const label of stage.labels) label.ageMs += dt;
    stage.labels = stage.labels.filter((label) => label.ageMs < LABEL_MS);
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      stage.field.forEach((p, progress) => {
        ctx.globalCompositeOperation = "source-over";
        drawParticle(ctx, p, progress);
      });
      ctx.globalCompositeOperation = "source-over";
      const font = getComputedStyle(target).fontFamily || "sans-serif";
      for (const label of stage.labels) {
        const t = label.ageMs / LABEL_MS;
        const still = prefersReducedMotion();
        const rise = still ? 0 : t * 28;
        const pop = still ? 1 : t < 0.15 ? 0.7 + (t / 0.15) * 0.4 : t < 0.25 ? 1.1 - ((t - 0.15) / 0.1) * 0.1 : 1;
        ctx.globalAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
        ctx.save();
        ctx.translate(label.x, label.y - rise);
        ctx.scale(pop, pop);
        ctx.font = `900 ${Math.round(Math.min(34, Math.max(20, w / 12)))}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.strokeText(label.text, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (stage.field.live === 0 && stage.labels.length === 0) {
      disposeCelebration(target);
      return;
    }
    stage.frame = requestAnimationFrame(tick);
  };
  stage.frame = requestAnimationFrame(tick);
}

/** Celebrates on top of `target`. Safe to call during SSR or with a null target: it does nothing. */
export function celebrate(target: HTMLElement | null | undefined, options: CelebrateOptions): void {
  if (!target || typeof window === "undefined" || typeof document === "undefined" || !target.isConnected) return;
  const reduced = prefersReducedMotion();
  if (reduced && !options.label) return;
  const rect = target.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const stage = ensureStage(target);
  if (!stage) return;
  const colors = options.colors && options.colors.length > 0 ? options.colors : defaultColors(target);
  const origin = options.origin ?? { x: 0.5, y: 0.62 };
  const scale = (options.scale ?? 1) * Math.min(1.3, Math.max(0.6, rect.width / 480));
  if (!reduced) {
    for (const o of [origin, ...(options.extraOrigins ?? [])]) {
      stage.field.emit(options.preset, o.x * rect.width, o.y * rect.height, colors, { scale });
    }
  }
  if (options.label) stage.labels.push({ text: options.label, x: origin.x * rect.width, y: origin.y * rect.height - 24, ageMs: 0 });
  run(target, stage);
}

/** Callback ref + celebrate bound to that element, for components without a handy ref. */
export function useCelebration<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const setRef = useCallback((node: T | null) => {
    if (ref.current !== node) disposeCelebration(ref.current);
    ref.current = node;
  }, []);
  const fire = useCallback((options: CelebrateOptions) => celebrate(ref.current, options), []);
  return { ref: setRef, celebrate: fire, element: ref };
}
