import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Game2048Direction } from '../../lib/games/game-2048';
import { createTonePlayer, type TonePlayer } from '../../lib/games/tone';

interface Game2048PixiCanvasProps {
  board: readonly (number | null)[];
  onDirection: (dir: Game2048Direction) => void;
  muted: boolean;
  reducedMotion: boolean;
}

// Tile color scheme (Hex numbers for PixiJS Graphics)
const TILE_COLORS: Record<number, { bg: number; text: string; glow?: number }> = {
  2: { bg: 0x27272a, text: '#f4f4f5' },
  4: { bg: 0x3f3f46, text: '#f4f4f5' },
  8: { bg: 0x0284c7, text: '#ffffff', glow: 0x38bdf8 },
  16: { bg: 0x0369a1, text: '#ffffff', glow: 0x0ea5e9 },
  32: { bg: 0x16a34a, text: '#ffffff', glow: 0x4ade80 },
  64: { bg: 0x15803d, text: '#ffffff', glow: 0x22c55e },
  128: { bg: 0xeab308, text: '#000000', glow: 0xfef08a },
  256: { bg: 0xf59e0b, text: '#000000', glow: 0xfde047 },
  512: { bg: 0xf97316, text: '#ffffff', glow: 0xfb923c },
  1024: { bg: 0xef4444, text: '#ffffff', glow: 0xf87171 },
  2048: { bg: 0xa855f7, text: '#ffffff', glow: 0xc084fc },
};

// Harmonic chords for tile values
const TILE_NOTES: Record<number, number> = {
  2: 220.0,   // A3
  4: 261.63,  // C4
  8: 329.63,  // E4
  16: 392.00, // G4
  32: 440.00, // A4
  64: 523.25, // C5
  128: 587.33,// D5
  256: 659.25,// E5
  512: 783.99,// G5
  1024: 880.0,// A5
  2048: 1046.5,// C6 Celestial Chime
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: number;
  life: number;
}

export default function Game2048PixiCanvas({
  board,
  onDirection,
  muted,
  reducedMotion,
}: Game2048PixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const toneRef = useRef<TonePlayer | null>(null);
  const boardRef = useRef<readonly (number | null)[]>(board);
  boardRef.current = board;

  const onDirectionRef = useRef(onDirection);
  onDirectionRef.current = onDirection;

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Audio
  useEffect(() => {
    toneRef.current = createTonePlayer();
    return () => {
      toneRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const canvasWrap = containerRef.current;
    if (!canvasWrap) return;

    const BOARD_SIZE = 360;
    const GRID_COUNT = 4;
    const PADDING = 10;
    const GAP = 8;
    const TILE_SIZE = (BOARD_SIZE - PADDING * 2 - GAP * (GRID_COUNT - 1)) / GRID_COUNT;

    const app = new Application();

    const initPixi = async () => {
      await app.init({
        width: BOARD_SIZE,
        height: BOARD_SIZE,
        resolution: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
        autoDensity: true,
        antialias: true,
        backgroundAlpha: 0,
      });

      if (!active) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      canvasWrap.innerHTML = '';
      canvasWrap.appendChild(app.canvas);

      // Root scene container
      const rootContainer = new Container();
      app.stage.addChild(rootContainer);

      // Background board graphics
      const bgGraphics = new Graphics();
      bgGraphics.roundRect(0, 0, BOARD_SIZE, BOARD_SIZE, 16);
      bgGraphics.fill({ color: 0x18181b, alpha: 0.6 });
      bgGraphics.stroke({ color: 0x27272a, width: 2 });

      // Draw background cell slots
      for (let r = 0; r < GRID_COUNT; r++) {
        for (let c = 0; c < GRID_COUNT; c++) {
          const x = PADDING + c * (TILE_SIZE + GAP);
          const y = PADDING + r * (TILE_SIZE + GAP);
          bgGraphics.roundRect(x, y, TILE_SIZE, TILE_SIZE, 10);
          bgGraphics.fill({ color: 0x27272a, alpha: 0.4 });
        }
      }
      rootContainer.addChild(bgGraphics);

      // Tiles container
      const tilesContainer = new Container();
      rootContainer.addChild(tilesContainer);

      // Particles graphics layer
      const particlesGraphics = new Graphics();
      rootContainer.addChild(particlesGraphics);

      // Keep previous board values to detect merges and trigger juice
      let prevBoard = [...boardRef.current];

      // Render function
      const renderTiles = (currentBoard: readonly (number | null)[]) => {
        tilesContainer.removeChildren();

        for (let i = 0; i < currentBoard.length; i++) {
          const val = currentBoard[i];
          if (!val) continue;

          const r = Math.floor(i / GRID_COUNT);
          const c = i % GRID_COUNT;
          const x = PADDING + c * (TILE_SIZE + GAP);
          const y = PADDING + r * (TILE_SIZE + GAP);

          const tileContainer = new Container();
          tileContainer.x = x + TILE_SIZE / 2;
          tileContainer.y = y + TILE_SIZE / 2;

          const tileGfx = new Graphics();
          const cfg = TILE_COLORS[val] || { bg: 0x581c87, text: '#ffffff', glow: 0x7e22ce };

          // Glow outline on higher tier tiles
          if (cfg.glow && val >= 64) {
            tileGfx.roundRect(-TILE_SIZE / 2 - 2, -TILE_SIZE / 2 - 2, TILE_SIZE + 4, TILE_SIZE + 4, 12);
            tileGfx.stroke({ color: cfg.glow, width: 2, alpha: 0.5 });
          }

          // Tile base
          tileGfx.roundRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 10);
          tileGfx.fill({ color: cfg.bg });
          tileContainer.addChild(tileGfx);

          // Tile text
          const fontSize = val >= 1024 ? 20 : val >= 128 ? 24 : 28;
          const style = new TextStyle({
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize,
            fontWeight: '900',
            fill: cfg.text,
            align: 'center',
          });
          const text = new Text({ text: String(val), style });
          text.anchor.set(0.5);
          tileContainer.addChild(text);

          // Check if newly merged or spawned for juice
          const prevVal = prevBoard[i];
          if (prevVal && prevVal !== val && val >= 4) {
            // Merge detected!
            tileContainer.scale.set(1.25);
            // Spawn spark particles around merge center
            if (!reducedMotion) {
              for (let p = 0; p < 8; p++) {
                const angle = (p / 8) * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                particlesRef.current.push({
                  x: x + TILE_SIZE / 2,
                  y: y + TILE_SIZE / 2,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  alpha: 1,
                  size: 2.5 + Math.random() * 2,
                  color: cfg.glow || cfg.bg,
                  life: 20,
                });
              }
            }
            // Trigger sound & haptics
            if (!mutedRef.current) {
              const note = TILE_NOTES[val] || 880;
              toneRef.current?.play(note, 0.12, 0.05);
            }
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(val >= 512 ? [20, 20, 40] : 10);
              } catch {}
            }
            if (val >= 256 && !reducedMotion) {
              shakeRef.current = 6;
            }
          }

          tilesContainer.addChild(tileContainer);
        }

        prevBoard = [...currentBoard];
      };

      // Initial render
      renderTiles(boardRef.current);

      // Pixi Ticker for 120fps juice, animations, and particles
      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;

        // Animate tile bounce scale back to 1.0
        for (const child of tilesContainer.children) {
          if (child.scale.x > 1.0) {
            child.scale.x = Math.max(1.0, child.scale.x - 0.04 * delta);
            child.scale.y = Math.max(1.0, child.scale.y - 0.04 * delta);
          }
        }

        // Camera Screen Shake
        if (shakeRef.current > 0) {
          shakeRef.current -= 0.5 * delta;
          const mag = shakeRef.current;
          rootContainer.x = (Math.random() - 0.5) * mag;
          rootContainer.y = (Math.random() - 0.5) * mag;
        } else {
          rootContainer.x = 0;
          rootContainer.y = 0;
        }

        // Update & Render Particles
        particlesGraphics.clear();
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.alpha -= 0.04 * delta;
          p.life -= delta;

          if (p.life <= 0 || p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          particlesGraphics.circle(p.x, p.y, p.size);
          particlesGraphics.fill({ color: p.color, alpha: p.alpha });
        }
      });

      // Pointer gesture handling directly on canvas
      const canvasEl = app.canvas;
      const onPointerDown = (e: PointerEvent) => {
        touchStartRef.current = { x: e.clientX, y: e.clientY };
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!touchStartRef.current) return;
        const dx = e.clientX - touchStartRef.current.x;
        const dy = e.clientY - touchStartRef.current.y;
        touchStartRef.current = null;

        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (Math.max(absX, absY) < 20) return; // ignore tap

        if (absX > absY) {
          onDirectionRef.current(dx > 0 ? 'right' : 'left');
        } else {
          onDirectionRef.current(dy > 0 ? 'down' : 'up');
        }
      };

      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      canvasEl.style.touchAction = 'none';
      canvasEl.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);

      // External update trigger
      (canvasWrap as any).__update2048Board = renderTiles;

      return () => {
        canvasEl.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
      };
    };

    let cleanupListeners: (() => void) | undefined;
    void initPixi().then((cl) => {
      cleanupListeners = cl;
    });

    return () => {
      active = false;
      cleanupListeners?.();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  // Update tiles when board prop changes
  useEffect(() => {
    const wrap = containerRef.current as any;
    if (wrap?.__update2048Board) {
      wrap.__update2048Board(board);
    }
  }, [board]);

  return (
    <div
      data-game-surface
      className="relative aspect-square w-full max-w-sm mx-auto rounded-2xl border border-border bg-card/40 overflow-hidden shadow-inner touch-none select-none flex items-center justify-center"
    >
      <div ref={containerRef} className="w-full h-full flex items-center justify-center touch-none" />
    </div>
  );
}
