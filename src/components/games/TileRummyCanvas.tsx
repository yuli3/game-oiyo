// Pixi table for number tiles (2026-10-21 quality pass). React owns the rules;
// this canvas only draws the current layout, animates tiles toward their spots
// (so laid, drawn and AI tiles fly instead of popping), and turns pointer
// gestures into tap and drop callbacks. Every frame runs in the Pixi ticker.

import { useEffect, useRef } from "react";
import type { Application, Container, Graphics, Text } from "pixi.js";
import type { Meld, Tile, TileColor } from "../../lib/games/tile-rummy";
import type { TableTheme } from "../../lib/games/tile-rummy-augments";
import { TILE_RUMMY_SPRITES } from "../../lib/games/sprites";
import {
  hitDrop,
  hitTile,
  layoutTable,
  type DropTarget,
  type TableLayout,
  type TileSpot,
} from "../../lib/games/tile-rummy-layout";

type Pixi = typeof import("pixi.js");

export type TableFx =
  | { seq: number; kind: "lay"; ids: number[]; combo: number }
  | { seq: number; kind: "error" }
  | { seq: number; kind: "win" };

export interface RivalSeat {
  tiles: number;
  opened: boolean;
}

export interface TileRummyCanvasProps {
  table: readonly Meld[];
  loose: readonly Tile[];
  hand: readonly Tile[];
  selected: readonly number[];
  hinted: ReadonlySet<number>;
  rivals: readonly RivalSeat[];
  turn: number;
  playing: boolean;
  poolCount: number;
  peek: Tile | null;
  theme: TableTheme;
  reducedMotion: boolean;
  interactive: boolean;
  /** Table tiles can be lifted only after the player has opened. */
  tableLocked: boolean;
  actorSeat: number | null;
  fx: TableFx | null;
  labels: { table: string; hand: string; loose: string; newLine: string; pool: string; rival: (n: number) => string };
  canDrop: (tileId: number, from: TileSpot, target: DropTarget) => boolean;
  onTap: (spot: TileSpot) => void;
  onDrop: (tileId: number, from: TileSpot, target: DropTarget) => boolean;
  onPile: () => void;
}

const INK: Record<TileColor, number> = { crimson: 0xc4283f, amber: 0xc27400, teal: 0x0b7f86, violet: 0x6a3cc0 };
const THEMES: Record<TableTheme, { base: number; dark: number; line: number; grain: number }> = {
  felt: { base: 0x1e5a3c, dark: 0x143f29, line: 0x3f8f63, grain: 0x2a6e4a },
  walnut: { base: 0x684327, dark: 0x472d19, line: 0xa1703f, grain: 0x7a5232 },
  midnight: { base: 0x1a2747, dark: 0x101931, line: 0x4a62a8, grain: 0x24365f },
};

interface TileSprite {
  root: Container;
  ring: Graphics;
  hint: Graphics;
  x: number;
  y: number;
  tx: number;
  ty: number;
  scale: number;
  w: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: number;
}

interface Popup {
  text: Text;
  life: number;
}

function drawStar(g: Graphics, cx: number, cy: number, outer: number, inner: number) {
  const points: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.poly(points);
}

function drawMark(g: Graphics, color: TileColor, cx: number, cy: number, r: number) {
  // A shape per color, so the colors still read for color-blind players.
  if (color === "crimson") g.circle(cx, cy, r);
  else if (color === "amber") g.poly([cx, cy - r, cx + r, cy + r * 0.8, cx - r, cy + r * 0.8]);
  else if (color === "teal") g.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
  else g.poly([cx, cy - r, cx + r, cy, cx, cy + r, cx - r, cy]);
  g.fill({ color: INK[color] });
}

function makeTile(PIXI: Pixi, tile: Tile, w: number, h: number): TileSprite {
  const root = new PIXI.Container();
  const shadow = new PIXI.Graphics().roundRect(2, 3, w, h, 7).fill({ color: 0x000000, alpha: 0.32 });
  const body = new PIXI.Graphics()
    .roundRect(0, 0, w, h, 7)
    .fill({ color: 0xefe6cf })
    .roundRect(1.5, 1.5, w - 3, h * 0.5, 6)
    .fill({ color: 0xfffbf1, alpha: 0.75 })
    .roundRect(0, 0, w, h, 7)
    .stroke({ color: 0xbfae86, width: 1 });
  root.addChild(shadow, body);
  if (tile.kind === "joker") {
    const star = new PIXI.Graphics();
    drawStar(star, w / 2, h * 0.45, w * 0.36, w * 0.15);
    star.fill({ color: 0xe8b21c }).stroke({ color: 0x8c6300, width: 1.5 });
    const sparkle = new PIXI.Graphics().circle(w * 0.42, h * 0.38, w * 0.05).fill({ color: 0xfff6c8 });
    root.addChild(star, sparkle);
  } else if (tile.color) {
    const numeral = new PIXI.Text({
      text: String(tile.value),
      style: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: Math.round(h * 0.46), fontWeight: "900", fill: INK[tile.color] },
    });
    numeral.anchor.set(0.5);
    numeral.position.set(w / 2, h * 0.42);
    const mark = new PIXI.Graphics();
    drawMark(mark, tile.color, w / 2, h * 0.8, h * 0.075);
    root.addChild(numeral, mark);
  }
  const hint = new PIXI.Graphics().roundRect(-2, -2, w + 4, h + 4, 9).stroke({ color: 0x7ee0a8, width: 2, alpha: 0.95 });
  const ring = new PIXI.Graphics().roundRect(-3, -3, w + 6, h + 6, 10).stroke({ color: 0xffd34d, width: 3 });
  hint.visible = false;
  ring.visible = false;
  root.addChild(hint, ring);
  return { root, ring, hint, x: 0, y: 0, tx: 0, ty: 0, scale: 1, w };
}

export default function TileRummyCanvas(props: TileRummyCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const renderRef = useRef<(() => void) | null>(null);
  const fxRef = useRef<((fx: TableFx) => void) | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let disposed = false;
    let app: Application | null = null;
    let observer: ResizeObserver | null = null;
    const cleanups: (() => void)[] = [];

    void (async () => {
      const PIXI = await import("pixi.js");
      if (disposed) return;
      const instance = new PIXI.Application();
      await instance.init({
        width: Math.max(280, wrap.clientWidth),
        height: 400,
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
      canvas.style.width = "100%";
      canvas.style.touchAction = "none";
      wrap.replaceChildren(canvas);

      const scene = new PIXI.Container();
      const felt = new PIXI.Graphics();
      const chrome = new PIXI.Graphics();
      const glow = new PIXI.Graphics();
      const tileLayer = new PIXI.Container();
      const dragLayer = new PIXI.Container();
      const sparks = new PIXI.Graphics();
      const textLayer = new PIXI.Container();
      const popupLayer = new PIXI.Container();
      scene.addChild(felt, chrome, glow, textLayer, tileLayer, dragLayer, sparks, popupLayer);
      instance.stage.addChild(scene);

      const sprites = new Map<number, TileSprite>();
      const particles: Particle[] = [];
      const popups: Popup[] = [];
      const avatars: { body: Container; ring: Graphics; dots: Graphics; seat: number }[] = [];
      let layout: TableLayout | null = null;
      let shake = 0;
      let clock = 0;
      // The canvas is touch-none so tiles can be dragged; a swipe on bare cloth
      // scrolls whatever holds the table instead, so a tall table stays reachable.
      let pan: { y: number; pointer: number } | null = null;
      const scroller = (): Element => {
        for (let node = wrap.parentElement; node; node = node.parentElement) {
          const overflow = getComputedStyle(node).overflowY;
          if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return node;
        }
        return document.scrollingElement ?? document.documentElement;
      };
      let drag: { spot: TileSpot; sprite: TileSprite; sx: number; sy: number; ox: number; oy: number; active: boolean; pointer: number } | null = null;

      const label = (text: string, x: number, y: number, size = 12, alpha = 0.85) => {
        const node = new PIXI.Text({ text, style: { fontFamily: "system-ui, sans-serif", fontSize: size, fontWeight: "700", fill: 0xf4efe2 } });
        node.alpha = alpha;
        node.position.set(x, y);
        textLayer.addChild(node);
        return node;
      };

      const drawFelt = (current: TableLayout, theme: TableTheme) => {
        const colors = THEMES[theme];
        felt.clear();
        felt.roundRect(0, 0, current.width, current.height, 18).fill({ color: colors.dark });
        felt.roundRect(4, 4, current.width - 8, current.height - 8, 15).fill({ color: colors.base });
        // Grain: fixed pseudo-random flecks, so the cloth does not shimmer between renders.
        let seed = 7;
        const next = () => {
          seed = (seed * 16807) % 2147483647;
          return seed / 2147483647;
        };
        if (theme === "walnut") {
          for (let y = 10; y < current.height; y += 9) felt.rect(6, y, current.width - 12, 1 + next() * 1.5).fill({ color: colors.grain, alpha: 0.5 });
        } else {
          for (let i = 0; i < Math.floor((current.width * current.height) / 900); i++) {
            felt.circle(6 + next() * (current.width - 12), 6 + next() * (current.height - 12), 0.8 + next()).fill({ color: colors.grain, alpha: 0.6 });
          }
        }
        felt.roundRect(4, 4, current.width - 8, current.height - 8, 15).stroke({ color: colors.line, width: 1.5, alpha: 0.6 });
      };

      const drawChrome = (current: TableLayout, p: TileRummyCanvasProps) => {
        const colors = THEMES[p.theme];
        chrome.clear();
        textLayer.removeChildren().forEach((child) => child.destroy());
        // Pool pile: a stack of face-down tiles with its count.
        const { pile } = current;
        const stack = Math.min(4, Math.ceil(p.poolCount / 12));
        for (let i = stack; i >= 0; i--) {
          chrome.roundRect(pile.x - i * 2, pile.y - i * 2, pile.w, pile.h, 7).fill({ color: i === 0 ? 0x2b3a67 : 0x1d2849 }).stroke({ color: 0x6f84c7, width: 1, alpha: 0.7 });
        }
        drawStar(chrome, pile.x + pile.w / 2, pile.y + pile.h / 2, pile.w * 0.2, pile.w * 0.08);
        chrome.fill({ color: 0x9fb2ef, alpha: 0.7 });
        label(p.labels.pool, pile.x - 6, pile.y + pile.h + 4, 11);
        // Section labels and meld trays.
        label(p.labels.table, current.tableBox.x, current.tableBox.y - 18);
        current.melds.forEach((box) => {
          chrome.roundRect(box.x, box.y, box.w, box.h, 9).fill({ color: 0x000000, alpha: 0.18 }).stroke({ color: colors.line, width: 1, alpha: 0.45 });
        });
        const zone = current.newZone;
        for (let x = zone.x; x < zone.x + zone.w; x += 10) chrome.rect(x, zone.y, 5, 1.5).fill({ color: colors.line, alpha: 0.8 });
        for (let x = zone.x; x < zone.x + zone.w; x += 10) chrome.rect(x, zone.y + zone.h - 1.5, 5, 1.5).fill({ color: colors.line, alpha: 0.8 });
        const plus = label(`+ ${p.labels.newLine}`, zone.x + 8, zone.y + zone.h / 2 - 8, 12, 0.7);
        if (plus.width > zone.w - 12) plus.text = "+";
        if (current.looseBox) label(p.labels.loose, current.looseBox.x, current.looseBox.y, 12);
        chrome.roundRect(current.handBox.x - 4, current.handBox.y + 14, current.handBox.w + 8, current.handBox.h - 6, 12).fill({ color: 0x000000, alpha: 0.22 });
        label(p.labels.hand, current.handBox.x, current.handBox.y - 12);
        if (p.peek) {
          label("▲", pile.x - 24, pile.y + pile.h / 2 - 8, 12, 0.7);
        }
      };

      const drawAvatars = (current: TableLayout, p: TileRummyCanvasProps) => {
        avatars.forEach((avatar) => avatar.body.destroy({ children: true }));
        avatars.length = 0;
        current.rivals.forEach((box, index) => {
          const seat = index + 1;
          const body = new PIXI.Container();
          body.position.set(box.x + box.w / 2, box.y + 22);
          const ring = new PIXI.Graphics().circle(0, 0, 22).stroke({ color: 0xffd34d, width: 3 });
          const mood = p.playing && p.turn === seat ? "think" : "idle";
          const avatarNum = Math.min(3, Math.max(1, seat)) as 1 | 2 | 3;
          const spriteUrl = TILE_RUMMY_SPRITES.avatars[avatarNum][mood];
          const avatarSprite = PIXI.Sprite.from(spriteUrl);
          avatarSprite.anchor.set(0.5);
          avatarSprite.width = 38;
          avatarSprite.height = 38;
          const dots = new PIXI.Graphics();
          const info = new PIXI.Text({
            text: `${p.labels.rival(seat)} · ${p.rivals[index]?.tiles ?? 0}${p.rivals[index]?.opened ? " ✓" : ""}`,
            style: { fontFamily: "system-ui, sans-serif", fontSize: 10, fontWeight: "700", fill: 0xf4efe2 },
          });
          info.anchor.set(0.5, 0);
          info.position.set(0, 23);
          body.addChild(ring, avatarSprite, dots, info);
          scene.addChild(body);
          avatars.push({ body, ring, dots, seat });
        });
      };

      const originFor = (spot: TileSpot, p: TileRummyCanvasProps, current: TableLayout) => {
        if (spot.zone === "hand") return { x: current.pile.x, y: current.pile.y };
        if (spot.zone === "table" && p.actorSeat && p.actorSeat > 0) {
          const box = current.rivals[p.actorSeat - 1];
          if (box) return { x: box.x + box.w / 2, y: box.y + 20 };
        }
        return null;
      };

      const render = () => {
        const p = propsRef.current;
        const width = Math.max(280, wrap.clientWidth);
        const current = layoutTable({ width, table: p.table, loose: p.loose, hand: p.hand, rivals: p.rivals.length });
        layout = current;
        if (instance.renderer.width !== current.width || instance.renderer.height !== current.height) {
          instance.renderer.resize(current.width, current.height);
        }
        drawFelt(current, p.theme);
        drawChrome(current, p);
        drawAvatars(current, p);
        const selected = new Set(p.selected);
        const seen = new Set<number>();
        const tiles = new Map<number, Tile>();
        p.table.forEach((meld) => meld.tiles.forEach((tile) => tiles.set(tile.id, tile)));
        [...p.loose, ...p.hand].forEach((tile) => tiles.set(tile.id, tile));
        for (const spot of current.spots) {
          const tile = tiles.get(spot.id);
          if (!tile) continue;
          seen.add(spot.id);
          let sprite = sprites.get(spot.id);
          if (!sprite || sprite.root.destroyed) {
            sprite = makeTile(PIXI, tile, current.tileW, current.tileH);
            const origin = originFor(spot, p, current);
            sprite.x = origin?.x ?? spot.x;
            sprite.y = origin?.y ?? spot.y;
            sprite.scale = origin ? 0.7 : 0.85;
            sprites.set(spot.id, sprite);
            tileLayer.addChild(sprite.root);
          } else if (sprite.w !== current.tileW) {
            // The tile size changed with the width: rebuild at the new size in place.
            const fresh = makeTile(PIXI, tile, current.tileW, current.tileH);
            Object.assign(fresh, { x: sprite.x, y: sprite.y, scale: sprite.scale });
            sprite.root.destroy({ children: true });
            sprite = fresh;
            sprites.set(spot.id, sprite);
            tileLayer.addChild(sprite.root);
          }
          const lifted = selected.has(spot.id) && spot.zone !== "table";
          sprite.tx = spot.x;
          sprite.ty = spot.y - (lifted ? 8 : 0);
          sprite.ring.visible = selected.has(spot.id);
          sprite.hint.visible = !sprite.ring.visible && p.hinted.has(spot.id);
          if (p.reducedMotion) {
            sprite.x = sprite.tx;
            sprite.y = sprite.ty;
            sprite.scale = 1;
          }
        }
        for (const [id, sprite] of sprites) {
          if (seen.has(id) || (drag && drag.spot.id === id)) continue;
          sprite.root.destroy({ children: true });
          sprites.delete(id);
        }
      };
      renderRef.current = render;

      const burst = (x: number, y: number, color: number, count: number) => {
        if (propsRef.current.reducedMotion) return;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 3;
          particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: 26 + Math.random() * 14, size: 1.5 + Math.random() * 2.5, color });
        }
      };

      const popup = (text: string, x: number, y: number, color: number) => {
        const node = new PIXI.Text({ text, style: { fontFamily: "system-ui, sans-serif", fontSize: 22, fontWeight: "900", fill: color, stroke: { color: 0x000000, width: 4 } } });
        node.anchor.set(0.5);
        node.position.set(x, y);
        popupLayer.addChild(node);
        popups.push({ text: node, life: 50 });
      };

      fxRef.current = (fx) => {
        const current = layout;
        if (!current) return;
        if (fx.kind === "error") {
          if (!propsRef.current.reducedMotion) shake = 6;
          return;
        }
        if (fx.kind === "lay") {
          const spots = current.spots.filter((spot) => fx.ids.includes(spot.id));
          spots.forEach((spot) => burst(spot.x + current.tileW / 2, spot.y + current.tileH / 2, 0xffe08a, 6));
          const anchor = spots[0];
          if (anchor && fx.combo > 1) popup(`COMBO ×${fx.combo}`, Math.min(current.width - 70, anchor.x + 50), anchor.y - 6, 0xffd34d);
          spots.forEach((spot) => {
            const sprite = sprites.get(spot.id);
            if (sprite) sprite.scale = 1.18;
          });
          return;
        }
        for (let i = 0; i < 4; i++) burst(current.width * (0.2 + i * 0.2), current.tableBox.y + 30, [0xffd34d, 0x7ee0a8, 0xe58fb5, 0x7cc4e8][i], 18);
      };

      const toLocal = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scale = rect.width > 0 ? (layout?.width ?? rect.width) / rect.width : 1;
        return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
      };

      const drawDropGlow = () => {
        glow.clear();
        const current = layout;
        const p = propsRef.current;
        if (!current || !drag?.active) return;
        const from = drag.spot;
        current.melds.forEach((box, index) => {
          const ok = p.canDrop(from.id, from, { type: "meld", index, side: "start" }) || p.canDrop(from.id, from, { type: "meld", index, side: "end" });
          if (ok) glow.roundRect(box.x - 3, box.y - 3, box.w + 6, box.h + 6, 11).stroke({ color: 0x7ee0a8, width: 3, alpha: 0.6 + Math.sin(clock / 6) * 0.3 });
        });
        if (p.canDrop(from.id, from, { type: "new" })) {
          const zone = current.newZone;
          glow.roundRect(zone.x - 3, zone.y - 3, zone.w + 6, zone.h + 6, 11).stroke({ color: 0x7ee0a8, width: 3, alpha: 0.6 + Math.sin(clock / 6) * 0.3 });
        }
      };

      const onDown = (event: PointerEvent) => {
        const p = propsRef.current;
        const current = layout;
        if (!current) return;
        const point = toLocal(event);
        const { pile } = current;
        if (p.interactive && point.x >= pile.x - 8 && point.x <= pile.x + pile.w && point.y >= pile.y - 8 && point.y <= pile.y + pile.h) {
          p.onPile();
          return;
        }
        const spot = hitTile(current, point.x, point.y);
        if (!spot || !p.interactive) {
          pan = { y: event.clientY, pointer: event.pointerId };
          return;
        }
        const sprite = sprites.get(spot.id);
        if (!sprite) return;
        sprite.scale = 0.95;
        drag = { spot, sprite, sx: point.x, sy: point.y, ox: point.x - sprite.x, oy: point.y - sprite.y, active: false, pointer: event.pointerId };
        canvas.setPointerCapture(event.pointerId);
      };

      const onMove = (event: PointerEvent) => {
        if (pan && event.pointerId === pan.pointer) {
          scroller().scrollBy(0, pan.y - event.clientY);
          pan.y = event.clientY;
          return;
        }
        if (!drag || event.pointerId !== drag.pointer) return;
        const point = toLocal(event);
        if (!drag.active) {
          if (Math.hypot(point.x - drag.sx, point.y - drag.sy) < 8) return;
          if (drag.spot.zone === "table" && propsRef.current.tableLocked) return;
          drag.active = true;
          dragLayer.addChild(drag.sprite.root);
        }
        drag.sprite.x = point.x - drag.ox;
        drag.sprite.y = point.y - drag.oy - 6;
        drag.sprite.tx = drag.sprite.x;
        drag.sprite.ty = drag.sprite.y;
        drag.sprite.scale = 1.12;
      };

      const onUp = (event: PointerEvent) => {
        if (pan && event.pointerId === pan.pointer) pan = null;
        if (!drag || event.pointerId !== drag.pointer) return;
        const current = drag;
        drag = null;
        glow.clear();
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        tileLayer.addChild(current.sprite.root);
        current.sprite.scale = 1;
        const p = propsRef.current;
        if (!current.active) {
          p.onTap(current.spot);
          return;
        }
        const point = toLocal(event);
        const target = layout ? hitDrop(layout, point.x, point.y) : null;
        const accepted = target ? p.onDrop(current.spot.id, current.spot, target) : false;
        if (!accepted) {
          // Back to where it came from; the parent plays the error cue when a drop was refused.
          current.sprite.tx = current.spot.x;
          current.sprite.ty = current.spot.y;
          if (target && target.type !== "hand") shake = p.reducedMotion ? 0 : 5;
        }
        render();
      };

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      cleanups.push(() => {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
      });

      instance.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        clock += delta;
        const p = propsRef.current;
        const ease = p.reducedMotion ? 1 : Math.min(1, 0.22 * delta);
        for (const sprite of sprites.values()) {
          sprite.x += (sprite.tx - sprite.x) * ease;
          sprite.y += (sprite.ty - sprite.y) * ease;
          if (!drag || drag.sprite !== sprite) sprite.scale += (1 - sprite.scale) * Math.min(1, 0.18 * delta);
          sprite.root.position.set(sprite.x, sprite.y);
          sprite.root.scale.set(sprite.scale);
        }
        avatars.forEach((avatar) => {
          const thinking = p.playing && p.turn === avatar.seat;
          avatar.ring.visible = thinking;
          avatar.ring.alpha = 0.55 + Math.sin(clock / 8) * 0.45;
          avatar.dots.clear();
          if (thinking) {
            for (let i = 0; i < 3; i++) {
              const bob = p.reducedMotion ? 0 : Math.sin(clock / 6 + i) * 2;
              avatar.dots.circle(-8 + i * 8, -30 + bob, 2.5).fill({ color: 0xffffff, alpha: 0.9 });
            }
          }
        });
        drawDropGlow();
        if (shake > 0) {
          shake = Math.max(0, shake - 0.45 * delta);
          scene.position.set((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake);
        } else scene.position.set(0, 0);
        sparks.clear();
        for (let i = particles.length - 1; i >= 0; i--) {
          const spark = particles[i];
          spark.x += spark.vx * delta;
          spark.y += spark.vy * delta;
          spark.vy += 0.12 * delta;
          spark.life -= delta;
          if (spark.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          sparks.circle(spark.x, spark.y, spark.size).fill({ color: spark.color, alpha: Math.min(1, spark.life / 20) });
        }
        for (let i = popups.length - 1; i >= 0; i--) {
          const item = popups[i];
          item.life -= delta;
          item.text.y -= 0.6 * delta;
          item.text.alpha = Math.min(1, item.life / 20);
          if (item.life <= 0) {
            item.text.destroy();
            popups.splice(i, 1);
          }
        }
      });

      observer = new ResizeObserver(() => render());
      observer.observe(wrap);
      render();
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      renderRef.current = null;
      fxRef.current = null;
      app?.destroy(true, { children: true });
    };
  }, []);

  useEffect(() => {
    renderRef.current?.();
  });

  useEffect(() => {
    if (props.fx) fxRef.current?.(props.fx);
  }, [props.fx]);

  return <div ref={wrapRef} data-game-surface className="w-full touch-none select-none" aria-hidden="true" />;
}
