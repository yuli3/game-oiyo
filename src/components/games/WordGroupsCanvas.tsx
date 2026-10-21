// Pixi only draws the 4×4 board. React still owns the guess (2026-10-21).
import { useEffect, useRef } from "react";
import type { Application, Container, Graphics, Text } from "pixi.js";

const TILE_W = 64;
const TILE_H = 48;
const GAP = 6;
const COLS = 4;
const LIFT = 8;
const GATHER_MS = 720;
const SHAKE_MS = 420;
const ROW_MS = 520;

export function groupBoardPixels(count: number): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(count / COLS));
  return {
    width: COLS * TILE_W + (COLS - 1) * GAP,
    height: rows * TILE_H + Math.max(0, rows - 1) * GAP,
  };
}

function home(index: number): { x: number; y: number } {
  return { x: (index % COLS) * (TILE_W + GAP), y: Math.floor(index / COLS) * (TILE_H + GAP) };
}

function tileAt(x: number, y: number, words: readonly string[]): string | null {
  if (x < 0 || y < 0) return null;
  const pitchX = TILE_W + GAP;
  const pitchY = TILE_H + GAP;
  const col = Math.floor(x / pitchX);
  const row = Math.floor(y / pitchY);
  if (col < 0 || row < 0 || col >= COLS) return null;
  if (x - col * pitchX >= TILE_W || y - row * pitchY >= TILE_H) return null;
  return words[row * COLS + col] ?? null;
}

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

interface Glyph {
  root: Container;
  body: Graphics;
  text: Text;
  word: string;
}

export interface WordGroupsCanvasProps {
  words: readonly string[];
  selected: readonly string[];
  reducedMotion: boolean;
  interactive: boolean;
  gatherKey: number;
  shake: { seq: number; words: readonly string[] } | null;
  row: { seq: number; words: readonly string[] } | null;
  label: string;
  onTap: (word: string) => void;
  onGatherDone: () => void;
  onMotionDone: () => void;
}

export default function WordGroupsCanvas(props: WordGroupsCanvasProps) {
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
      const pixels = groupBoardPixels(Math.max(propsRef.current.words.length, 1));
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
      canvas.style.width = `${pixels.width}px`;
      canvas.style.height = `${pixels.height}px`;
      canvas.style.touchAction = "none";
      canvas.tabIndex = 0;
      canvas.setAttribute("data-groups-canvas", "true");
      canvas.setAttribute("role", "group");
      canvas.setAttribute("aria-label", propsRef.current.label);
      wrap.replaceChildren(canvas);

      const idle = { fill: readColor("--muted", 0xe4e6dc), ink: readColor("--foreground", 0x243024), edge: readColor("--border", 0xc5cbb8) };
      const hot = { fill: readColor("--foreground", 0x243024), ink: readColor("--background", 0xf7f3e6), edge: readColor("--foreground", 0x243024) };
      const layer = new PIXI.Container();
      instance.stage.addChild(layer);
      const glyphs = new Map<string, Glyph>();
      let seenGather = -1;
      let seenShake = -1;
      let seenRow = -1;
      let wordKey = "";
      let gather: { start: number; dur: number; homes: Map<string, { x: number; y: number; fromX: number; fromY: number }> } | null = null;
      let shake: { start: number; words: readonly string[] } | null = null;
      let row: { start: number; homes: Map<string, { x: number; y: number; toX: number; toY: number }> } | null = null;
      let gatherNotified = false;
      let motionNotified = false;

      const paint = (glyph: Glyph, on: boolean) => {
        const tone = on ? hot : idle;
        glyph.body.clear().roundRect(0, 0, TILE_W, TILE_H, 10).fill({ color: tone.fill }).stroke({ color: tone.edge, width: 2 });
        glyph.text.style.fill = tone.ink;
      };

      const make = (word: string): Glyph => {
        const root = new PIXI.Container();
        const body = new PIXI.Graphics();
        const text = new PIXI.Text({
          text: word,
          style: { fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: "700", fill: idle.ink, align: "center", wordWrap: true, wordWrapWidth: TILE_W - 8 },
        });
        text.anchor.set(0.5);
        text.position.set(TILE_W / 2, TILE_H / 2);
        root.addChild(body, text);
        const glyph = { root, body, text, word };
        paint(glyph, false);
        return glyph;
      };

      const resize = (count: number) => {
        const next = groupBoardPixels(Math.max(count, 1));
        instance.renderer.resize(next.width, next.height);
        canvas.style.width = `${next.width}px`;
        canvas.style.height = `${next.height}px`;
      };

      const rebuild = () => {
        const current = propsRef.current;
        for (const glyph of glyphs.values()) glyph.root.destroy({ children: true });
        glyphs.clear();
        layer.removeChildren();
        resize(current.words.length);
        current.words.forEach((word, index) => {
          const glyph = make(word);
          const spot = home(index);
          glyph.root.position.set(spot.x, spot.y);
          layer.addChild(glyph.root);
          glyphs.set(word, glyph);
        });
        wordKey = current.words.join("\n");
        shake = null;
        row = null;
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
        shake = null;
        row = null;
        propsRef.current.onMotionDone();
      };

      const placeIdle = () => {
        const current = propsRef.current;
        current.words.forEach((word, index) => {
          const glyph = glyphs.get(word);
          if (!glyph) return;
          const spot = home(index);
          const lifted = current.selected.includes(word);
          paint(glyph, lifted);
          glyph.root.position.set(spot.x, spot.y - (lifted ? LIFT : 0));
        });
      };

      const startGather = () => {
        rebuild();
        gatherNotified = false;
        const current = propsRef.current;
        const pixelsNow = groupBoardPixels(Math.max(current.words.length, 1));
        const homes = new Map<string, { x: number; y: number; fromX: number; fromY: number }>();
        current.words.forEach((word, index) => {
          const glyph = glyphs.get(word);
          if (!glyph) return;
          const spot = home(index);
          const angle = (index / Math.max(1, current.words.length)) * Math.PI * 2;
          const fromX = pixelsNow.width / 2 + Math.cos(angle) * pixelsNow.width * 0.9 - TILE_W / 2;
          const fromY = pixelsNow.height / 2 + Math.sin(angle) * pixelsNow.height * 0.9 - TILE_H / 2;
          homes.set(word, { x: spot.x, y: spot.y, fromX, fromY });
          glyph.root.position.set(current.reducedMotion ? spot.x : fromX, current.reducedMotion ? spot.y : fromY);
        });
        if (current.reducedMotion) {
          gather = null;
          requestAnimationFrame(finishGather);
          return;
        }
        gather = { start: performance.now(), dur: GATHER_MS, homes };
      };

      const sync = () => {
        const current = propsRef.current;
        canvas.setAttribute("aria-label", current.label);
        if (current.gatherKey !== seenGather) {
          seenGather = current.gatherKey;
          seenShake = current.shake?.seq ?? seenShake;
          seenRow = current.row?.seq ?? seenRow;
          startGather();
          return;
        }
        if (current.words.join("\n") !== wordKey) rebuild();
        if (gather) return;
        if (current.row && current.row.seq !== seenRow) {
          seenRow = current.row.seq;
          motionNotified = false;
          const homes = new Map<string, { x: number; y: number; toX: number; toY: number }>();
          const width = groupBoardPixels(current.words.length).width;
          const span = current.row.words.length * TILE_W + Math.max(0, current.row.words.length - 1) * GAP;
          const originX = Math.max(0, (width - span) / 2);
          current.row.words.forEach((word, index) => {
            const glyph = glyphs.get(word);
            if (!glyph) return;
            homes.set(word, { x: glyph.root.x, y: glyph.root.y, toX: originX + index * (TILE_W + GAP), toY: 0 });
          });
          if (current.reducedMotion || homes.size === 0) {
            requestAnimationFrame(finishMotion);
            return;
          }
          row = { start: performance.now(), homes };
          return;
        }
        if (current.shake && current.shake.seq !== seenShake) {
          seenShake = current.shake.seq;
          motionNotified = false;
          if (current.reducedMotion) {
            requestAnimationFrame(finishMotion);
            return;
          }
          shake = { start: performance.now(), words: current.shake.words };
          return;
        }
        if (!shake && !row) placeIdle();
      };
      syncRef.current = sync;
      sync();

      canvas.addEventListener("pointerdown", (event: PointerEvent) => {
        const current = propsRef.current;
        if (!current.interactive || gather || shake || row) return;
        const rect = canvas.getBoundingClientRect();
        const word = tileAt(event.clientX - rect.left, event.clientY - rect.top, current.words);
        if (word) current.onTap(word);
      });

      instance.ticker.add(() => {
        const now = performance.now();
        const current = propsRef.current;
        if (gather) {
          const t = ease(Math.min(1, (now - gather.start) / gather.dur));
          gather.homes.forEach((spot, word) => {
            const glyph = glyphs.get(word);
            if (!glyph) return;
            glyph.root.position.set(spot.fromX + (spot.x - spot.fromX) * t, spot.fromY + (spot.y - spot.fromY) * t);
          });
          if (t >= 1) finishGather();
        }
        if (row) {
          const t = ease(Math.min(1, (now - row.start) / ROW_MS));
          row.homes.forEach((spot, word) => {
            const glyph = glyphs.get(word);
            if (!glyph) return;
            glyph.root.position.set(spot.x + (spot.toX - spot.x) * t, spot.y + (spot.toY - spot.y) * t);
          });
          if (t >= 1) finishMotion();
        }
        if (shake) {
          const t = Math.min(1, (now - shake.start) / SHAKE_MS);
          const wobble = Math.sin(t * Math.PI * 6) * 6 * (1 - t);
          current.words.forEach((word, index) => {
            const glyph = glyphs.get(word);
            if (!glyph) return;
            const spot = home(index);
            const hit = shake?.words.includes(word);
            glyph.root.position.set(spot.x + (hit ? wobble : 0), spot.y - (current.selected.includes(word) ? LIFT : 0));
          });
          if (t >= 1) finishMotion();
        }
      });
    })();

    return () => {
      disposed = true;
      syncRef.current = null;
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={wrapRef} className="mx-auto w-fit" />;
}
