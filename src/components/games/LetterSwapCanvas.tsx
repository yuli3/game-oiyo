// Pixi board for letter swap (2026-10-21). React owns the words and the swap
// count. This canvas draws the tiles, arcs two letters into each other's cells,
// and flips a line once that word is complete.

import { useEffect, useRef } from "react";
import type { Application, Container, Graphics, Text } from "pixi.js";
import {
  TILE_PX,
  boardPixels,
  tileAt,
  tileOrigin,
  type Mark,
} from "../../lib/games/letter-swap";

type Pixi = typeof import("pixi.js");

export interface LetterSwapCanvasProps {
  size: 3 | 5;
  cells: readonly (string | null)[];
  marks: readonly Mark[];
  selected: number | null;
  interactive: boolean;
  reducedMotion: boolean;
  gatherKey: number;
  swap: { seq: number; a: number; b: number } | null;
  flip: { seq: number; cells: readonly number[] } | null;
  onTap: (index: number) => void;
  onDrop: (from: number, to: number) => void;
  onGatherDone: () => void;
  onMotionDone: () => void;
}

interface Palette {
  fill: number;
  edge: number;
  ink: number;
}

interface Glyph {
  root: Container;
  body: Graphics;
  ring: Graphics;
  text: Text;
  letter: string;
}

interface Motion {
  index: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ctrlX: number;
  ctrlY: number;
  start: number;
  dur: number;
  letter: string;
}

const GATHER_MS = 720;
const ARC_MS = 340;
const FLIP_MS = 380;
const FLIP_GAP = 45;

function readColor(name: string, fallback: number): number {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return fallback;
  return (Number(match[1]) << 16) + (Number(match[2]) << 8) + Number(match[3]);
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function quad(a: number, c: number, b: number, t: number): number {
  const u = 1 - t;
  return u * u * a + 2 * u * t * c + t * t * b;
}

export default function LetterSwapCanvas(props: LetterSwapCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    syncRef.current?.();
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let disposed = false;
    let app: Application | null = null;

    void (async () => {
      const PIXI = await import("pixi.js");
      if (disposed) return;
      const pixels = boardPixels(propsRef.current.size);
      const instance = new PIXI.Application();
      await instance.init({
        width: pixels.width,
        height: pixels.height,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        antialias: true,
        backgroundAlpha: 0,
      });
      if (disposed) {
        instance.destroy(true);
        return;
      }
      app = instance;
      const canvas = instance.canvas;
      canvas.style.display = "block";
      // The hit test uses a fixed 44px pitch, so the canvas cannot stretch with the page (2026-10-21).
      canvas.style.width = `${pixels.width}px`;
      canvas.style.height = `${pixels.height}px`;
      // A drag has to swap letters. The page around the board still scrolls.
      canvas.style.touchAction = "none";
      canvas.tabIndex = 0;
      canvas.setAttribute("data-letter-canvas", "true");
      wrap.replaceChildren(canvas);

      const colors: Record<Exclude<Mark, "hole">, Palette> = {
        correct: { fill: readColor("--chart-1", 0x3c9a4a), edge: readColor("--chart-1", 0x3c9a4a), ink: readColor("--primary-foreground", 0xf7f3e6) },
        present: { fill: readColor("--warning", 0xe0b04a), edge: readColor("--warning", 0xe0b04a), ink: readColor("--warning-foreground", 0x3a2a10) },
        absent: { fill: readColor("--muted", 0xe4e6dc), edge: readColor("--border", 0xc5cbb8), ink: readColor("--muted-foreground", 0x5c6458) },
      };
      const ringColor = readColor("--primary", 0x3d6b32);
      const layer = new PIXI.Container();
      instance.stage.addChild(layer);
      const glyphs = new Map<number, Glyph>();
      let seenGather = -1;
      let seenSwap = -1;
      let seenFlip = -1;
      let gather: { start: number; dur: number; homes: Map<number, { x: number; y: number; fromX: number; fromY: number }> } | null = null;
      let arcs: Motion[] = [];
      let flips: { index: number; start: number }[] = [];
      let gatherNotified = false;
      let motionNotified = false;
      let drag: { index: number; x: number; y: number; moved: boolean } | null = null;
      let snapHome: number | null = null;

      const paint = (glyph: Glyph, mark: Mark) => {
        const tone = colors[mark === "hole" ? "absent" : mark];
        glyph.body.clear().roundRect(0, 0, TILE_PX, TILE_PX, 8).fill({ color: tone.fill }).stroke({ color: tone.edge, width: 2 });
        glyph.text.style.fill = tone.ink;
      };

      const make = (letter: string, mark: Mark): Glyph => {
        const root = new PIXI.Container();
        const body = new PIXI.Graphics();
        const ring = new PIXI.Graphics().roundRect(-3, -3, TILE_PX + 6, TILE_PX + 6, 10).stroke({ color: ringColor, width: 3 });
        ring.visible = false;
        const text = new PIXI.Text({
          text: letter,
          style: { fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: "700", fill: colors.absent.ink },
        });
        text.anchor.set(0.5);
        text.position.set(TILE_PX / 2, TILE_PX / 2);
        root.addChild(body, ring, text);
        const glyph = { root, body, ring, text, letter };
        paint(glyph, mark);
        return glyph;
      };

      const rebuild = () => {
        const current = propsRef.current;
        for (const glyph of glyphs.values()) glyph.root.destroy({ children: true });
        glyphs.clear();
        layer.removeChildren();
        for (let index = 0; index < current.cells.length; index++) {
          const letter = current.cells[index];
          if (letter == null) continue;
          const glyph = make(letter, current.marks[index] ?? "absent");
          const home = tileOrigin(index, current.size);
          glyph.root.position.set(home.x, home.y);
          layer.addChild(glyph.root);
          glyphs.set(index, glyph);
        }
        arcs = [];
        flips = [];
        drag = null;
      };

      const finishGather = () => {
        if (gatherNotified) return;
        gatherNotified = true;
        gather = null;
        propsRef.current.onGatherDone();
      };

      const finishMotion = () => {
        if (motionNotified) return;
        motionNotified = true;
        propsRef.current.onMotionDone();
      };

      const startGather = () => {
        const current = propsRef.current;
        rebuild();
        gatherNotified = false;
        const homes = new Map<number, { x: number; y: number; fromX: number; fromY: number }>();
        const pixelsNow = boardPixels(current.size);
        let n = 0;
        glyphs.forEach((glyph, index) => {
          const home = tileOrigin(index, current.size);
          const angle = (n / Math.max(1, glyphs.size)) * Math.PI * 2;
          const fromX = pixelsNow.width / 2 + Math.cos(angle) * pixelsNow.width * 0.85 - TILE_PX / 2;
          const fromY = pixelsNow.height / 2 + Math.sin(angle) * pixelsNow.height * 0.85 - TILE_PX / 2;
          n += 1;
          homes.set(index, { x: home.x, y: home.y, fromX, fromY });
          glyph.root.position.set(current.reducedMotion ? home.x : fromX, current.reducedMotion ? home.y : fromY);
        });
        if (current.reducedMotion) {
          gather = null;
          requestAnimationFrame(finishGather);
          return;
        }
        gather = { start: performance.now(), dur: GATHER_MS, homes };
      };

      const syncLetters = (skip: Set<number>) => {
        const current = propsRef.current;
        glyphs.forEach((glyph, index) => {
          if (skip.has(index)) return;
          const letter = current.cells[index] ?? "";
          if (glyph.letter !== letter) {
            glyph.letter = letter;
            glyph.text.text = letter;
          }
          paint(glyph, current.marks[index] ?? "absent");
          glyph.ring.visible = current.selected === index;
          if (!drag || drag.index !== index) {
            const home = tileOrigin(index, current.size);
            glyph.root.position.set(home.x, home.y);
            glyph.root.scale.y = 1;
          }
        });
      };

      const startArc = (swap: { a: number; b: number }) => {
        const current = propsRef.current;
        const left = glyphs.get(swap.a);
        const right = glyphs.get(swap.b);
        if (!left || !right) return;
        motionNotified = false;
        const ax = left.root.x;
        const ay = left.root.y;
        const bx = right.root.x;
        const by = right.root.y;
        const homeA = tileOrigin(swap.a, current.size);
        const homeB = tileOrigin(swap.b, current.size);
        const mx = (ax + homeB.x) / 2;
        const my = (ay + homeB.y) / 2;
        const dx = homeB.x - ax;
        const dy = homeB.y - ay;
        const len = Math.hypot(dx, dy) || 1;
        const bend = 36;
        const now = performance.now();
        const dur = current.reducedMotion ? 0 : ARC_MS;
        arcs = [
          { index: swap.a, fromX: ax, fromY: ay, toX: homeB.x, toY: homeB.y, ctrlX: mx + (-dy / len) * bend, ctrlY: my + (dx / len) * bend, start: now, dur, letter: left.letter },
          { index: swap.b, fromX: bx, fromY: by, toX: homeA.x, toY: homeA.y, ctrlX: mx - (-dy / len) * bend, ctrlY: my - (dx / len) * bend, start: now, dur, letter: right.letter },
        ];
        if (dur === 0) landArc();
      };

      const landArc = (holdMotion = false) => {
        arcs = [];
        syncLetters(new Set());
        if (!holdMotion && flips.length === 0) finishMotion();
      };

      const queueFlip = (cells: readonly number[]) => {
        motionNotified = false;
        const now = performance.now();
        flips = cells.map((index, order) => ({ index, start: now + order * (propsRef.current.reducedMotion ? 0 : FLIP_GAP) }));
        if (propsRef.current.reducedMotion) {
          flips = [];
          syncLetters(new Set());
          finishMotion();
        }
      };

      const sync = () => {
        const current = propsRef.current;
        if (current.gatherKey !== seenGather) {
          seenGather = current.gatherKey;
          seenSwap = current.swap?.seq ?? seenSwap;
          seenFlip = current.flip?.seq ?? seenFlip;
          startGather();
          return;
        }
        if (gather) return;
        if (current.swap && current.swap.seq !== seenSwap) {
          seenSwap = current.swap.seq;
          snapHome = null;
          startArc(current.swap);
        } else if (snapHome !== null) {
          const home = tileOrigin(snapHome, current.size);
          const glyph = glyphs.get(snapHome);
          if (glyph) glyph.root.position.set(home.x, home.y);
          snapHome = null;
        }
        if (current.flip && current.flip.seq !== seenFlip) {
          seenFlip = current.flip.seq;
          if (arcs.length === 0) queueFlip(current.flip.cells);
        }
        const busy = new Set<number>([...arcs.map((arc) => arc.index), ...flips.map((flip) => flip.index)]);
        if (drag) busy.add(drag.index);
        syncLetters(busy);
      };
      syncRef.current = sync;

      const localPoint = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };

      const onDown = (event: PointerEvent) => {
        const current = propsRef.current;
        if (!current.interactive || gather || arcs.length || flips.length) return;
        const point = localPoint(event);
        const index = tileAt(point.x, point.y, current.size, current.cells);
        if (index === null) return;
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // A pointer that is already gone should still select the cell (2026-10-21).
        }
        drag = { index, x: event.clientX, y: event.clientY, moved: false };
      };
      const onMove = (event: PointerEvent) => {
        if (!drag) return;
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true;
        if (!drag.moved) return;
        const glyph = glyphs.get(drag.index);
        if (!glyph) return;
        const point = localPoint(event);
        glyph.root.position.set(point.x - TILE_PX / 2, point.y - TILE_PX / 2);
      };
      const onUp = (event: PointerEvent) => {
        const current = drag;
        drag = null;
        if (!current) return;
        const propsNow = propsRef.current;
        if (!current.moved) {
          const home = tileOrigin(current.index, propsNow.size);
          glyphs.get(current.index)?.root.position.set(home.x, home.y);
          propsNow.onTap(current.index);
          return;
        }
        const point = localPoint(event);
        const target = tileAt(point.x, point.y, propsNow.size, propsNow.cells);
        if (target === null || target === current.index) {
          const home = tileOrigin(current.index, propsNow.size);
          glyphs.get(current.index)?.root.position.set(home.x, home.y);
          return;
        }
        snapHome = current.index;
        propsNow.onDrop(current.index, target);
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      instance.ticker.add(() => {
        const now = performance.now();
        if (gather) {
          const t = ease(Math.min(1, (now - gather.start) / gather.dur));
          gather.homes.forEach((home, index) => {
            const glyph = glyphs.get(index);
            if (!glyph) return;
            glyph.root.position.set(home.fromX + (home.x - home.fromX) * t, home.fromY + (home.y - home.fromY) * t);
          });
          if (t >= 1) finishGather();
        }
        if (arcs.length) {
          let done = true;
          for (const arc of arcs) {
            const t = arc.dur === 0 ? 1 : ease(Math.min(1, (now - arc.start) / arc.dur));
            const glyph = glyphs.get(arc.index);
            if (!glyph) continue;
            glyph.root.position.set(quad(arc.fromX, arc.ctrlX, arc.toX, t), quad(arc.fromY, arc.ctrlY, arc.toY, t));
            if (t < 1) done = false;
          }
          if (done) {
            const pending = propsRef.current.flip;
            const shouldFlip = Boolean(pending && pending.seq === seenFlip && flips.length === 0);
            landArc(shouldFlip);
            if (shouldFlip && pending) queueFlip(pending.cells);
          }
        }
        if (flips.length) {
          let done = true;
          for (const flip of flips) {
            const glyph = glyphs.get(flip.index);
            if (!glyph) continue;
            const t = Math.min(1, Math.max(0, (now - flip.start) / FLIP_MS));
            const scale = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;
            glyph.root.scale.y = scale;
            const home = tileOrigin(flip.index, propsRef.current.size);
            glyph.root.y = home.y + (1 - scale) * (TILE_PX / 2);
            if (t < 1) done = false;
          }
          if (done) {
            flips = [];
            syncLetters(new Set());
            finishMotion();
          }
        }
      });
      sync();
    })();

    return () => {
      disposed = true;
      syncRef.current = null;
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={wrapRef} className="mx-auto w-fit" />;
}
