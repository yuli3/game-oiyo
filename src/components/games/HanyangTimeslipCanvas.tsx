// Pixi 8 renderer for Hanyang Timeslip (2026-11-16).
// Draws the town, the side-view fields and the gate desk at a 160×144 virtual
// resolution, scaled by whole pixels. It also runs the fixed-step field
// simulation from src/lib/games/hanyang-timeslip.ts (rules live there; this file
// only reads state, plays effects, and forwards events to React).

import { useEffect, useRef, type RefObject } from "react";
import type { Application, Graphics, Sprite, Texture } from "pixi.js";
import { PALETTE, renderSheetRGBA, layoutSheet, type SpriteId } from "../../lib/games/hanyang-timeslip-art";
import { MOBS, NPCS, PHYSICS, TILE, TOWN_MAP, VIEW_H, VIEW_W, expToNext } from "../../lib/games/hanyang-timeslip-config";
import {
  riftOpen,
  shardCount,
  stepField,
  stepTown,
  swordBox,
  townPixel,
  type Dir,
  type FieldEvent,
  type FieldState,
  type Game,
  type TownEvent,
  type TownState,
  type Traveler,
} from "../../lib/games/hanyang-timeslip";
import { createBurstField, createHitstop, createShake, JUICE } from "../../lib/games/juice";

type Pixi = typeof import("pixi.js");

export const SHEET_URL = "/assets/sprites/hanyang-timeslip/sheet.webp";

export type TimeslipScene = "title" | "town" | "field" | "gate" | "ending";

export interface GateView {
  traveler: Traveler | null;
  bagOpen: boolean;
  /** Seconds since the traveller started walking in. */
  enterT: number;
  stamp: { approve: boolean; t: number } | null;
}

export interface TimeslipView {
  scene: TimeslipScene;
  game: Game;
  town: TownState;
  field: FieldState | null;
  gate: GateView;
}

export interface TimeslipInput {
  dirs: Dir[];
  a: boolean;
  aPressed: boolean;
  bPressed: boolean;
}

export interface HanyangTimeslipCanvasProps {
  viewRef: RefObject<TimeslipView>;
  inputRef: RefObject<TimeslipInput>;
  pausedRef: RefObject<boolean>;
  reducedMotion: boolean;
  onTownEvents: (events: TownEvent[]) => void;
  onFieldEvents: (events: FieldEvent[]) => void;
  /** Vertical pixels kept free for the page chrome around the screen. */
  reserveHeight: number;
  /** Called with the visible scale so React can size overlays. */
  onScale?: (scale: number) => void;
}

// ─── 3×5 pixel font for the HUD and damage numbers ───────────────────────────
const GLYPHS: Record<string, string> = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
  "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001010010010",
  "8": "111101111101111", "9": "111101111001111", L: "100100100100111", V: "101101101101010",
  "+": "000010111010000", "-": "000000111000000", "!": "010010010000010", "/": "001001010100100",
  X: "101101010101101", P: "111101111100100", H: "101101111101101", E: "111100111100111",
};

function drawText(g: Graphics, text: string, x: number, y: number, color: number, scale = 1, shadow = true): number {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      for (let i = 0; i < 15; i++) {
        if (glyph[i] !== "1") continue;
        const px = cx + (i % 3) * scale;
        const py = y + Math.floor(i / 3) * scale;
        if (shadow) g.rect(px + scale, py + scale, scale, scale).fill(PALETTE.k);
        g.rect(px, py, scale, scale).fill(color);
      }
    }
    cx += 4 * scale;
  }
  return cx - x;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  t: number;
  color: number;
  scale: number;
}

const TOWN_TILE: Record<string, SpriteId> = {
  "#": "tileFortress", G: "tileGate", ".": "tileGrass", ",": "tileFlowers", "=": "tileDirt", _: "tileStone",
  R: "tileRoof", E: "tileEaves", H: "tileWall", D: "tileDoor", S: "tileDirt", "~": "tileWater0",
};
const TOWN_OVERLAY: Record<string, SpriteId> = { T: "tileTree", F: "tileFence", J: "tileJangseung", X: "tileRift0" };
const NPC_SPRITE: Record<string, [SpriteId, SpriteId]> = {
  innkeeper: ["innkeeper0", "innkeeper1"],
  smith: ["smith0", "smith1"],
  sage: ["sage0", "sage1"],
  guard: ["guard0", "guard1"],
};
const ITEM_SPRITE: Record<string, SpriteId> = {
  rice: "itemRice", fan: "itemFan", brush: "itemBrush", herb: "itemHerb",
  phone: "itemPhone", earbuds: "itemEarbuds", cup: "itemCup", bottle: "itemBottle",
};
const TRAVELER_SPRITE: SpriteId[] = ["traveler0", "traveler1", "traveler2", "traveler3"];
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export default function HanyangTimeslipCanvas(props: HanyangTimeslipCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let disposed = false;
    let app: Application | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const PIXI: Pixi = await import("pixi.js");
      if (disposed) return;
      const instance = new PIXI.Application();
      await instance.init({ width: VIEW_W, height: VIEW_H, resolution: 1, antialias: false, background: PALETTE.k, preference: "webgl" });
      if (disposed) {
        instance.destroy(true);
        return;
      }
      app = instance;
      const canvas = instance.canvas;
      canvas.style.display = "block";
      canvas.style.imageRendering = "pixelated";
      canvas.style.touchAction = "none";
      canvas.setAttribute("aria-hidden", "true");
      wrap.appendChild(canvas);

      const fit = () => {
        const width = wrap.clientWidth || VIEW_W;
        // Leave room for the header and the touch controls below the screen.
        const height = window.innerHeight - propsRef.current.reserveHeight;
        const scale = Math.max(1, Math.min(Math.floor(width / VIEW_W), Math.floor(height / VIEW_H), 6));
        canvas.style.width = `${VIEW_W * scale}px`;
        canvas.style.height = `${VIEW_H * scale}px`;
        propsRef.current.onScale?.(scale);
      };
      fit();
      resizeObserver = new ResizeObserver(fit);
      resizeObserver.observe(wrap);
      window.addEventListener("resize", fit);

      // ─── Textures: the baked WebP, or the same art rebuilt in memory ───
      const { frames } = layoutSheet();
      let base: Texture;
      try {
        base = await PIXI.Assets.load<Texture>(SHEET_URL);
      } catch {
        const sheet = renderSheetRGBA();
        const c = document.createElement("canvas");
        c.width = sheet.width;
        c.height = sheet.height;
        c.getContext("2d")?.putImageData(new ImageData(sheet.data as Uint8ClampedArray<ArrayBuffer>, sheet.width, sheet.height), 0, 0);
        base = PIXI.Texture.from(c);
      }
      if (disposed) return;
      base.source.scaleMode = "nearest";
      const tex = {} as Record<SpriteId, Texture>;
      for (const id of Object.keys(frames) as SpriteId[]) {
        const f = frames[id];
        tex[id] = new PIXI.Texture({ source: base.source, frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h) });
      }
      const sprite = (id: SpriteId, anchorX = 0, anchorY = 0): Sprite => {
        const s = new PIXI.Sprite(tex[id]);
        s.anchor.set(anchorX, anchorY);
        return s;
      };

      const root = new PIXI.Container();
      instance.stage.addChild(root);

      // ─── Town layer (built once) ───
      const town = new PIXI.Container();
      const water: Sprite[] = [];
      let rift: Sprite | null = null;
      TOWN_MAP.forEach((row, ty) => {
        for (let tx = 0; tx < row.length; tx++) {
          const ch = row[tx];
          const baseId = TOWN_TILE[ch] ?? "tileGrass";
          const t = sprite(baseId);
          t.position.set(tx * TILE, ty * TILE);
          town.addChild(t);
          if (ch === "~") water.push(t);
          const over = TOWN_OVERLAY[ch];
          if (over) {
            const o = sprite(over);
            o.position.set(tx * TILE, ty * TILE);
            town.addChild(o);
            if (ch === "X") rift = o;
          }
        }
      });
      const npcSprites = new Map<string, Sprite>();
      for (const npc of NPCS) {
        const s = sprite(NPC_SPRITE[npc.id][0]);
        s.position.set(npc.tx * TILE, npc.ty * TILE);
        town.addChild(s);
        npcSprites.set(npc.id, s);
      }
      const townHero = sprite("heroDown0", 0.5, 0);
      town.addChild(townHero);
      root.addChild(town);

      // ─── Field layer (rebuilt per field) ───
      const fieldLayer = new PIXI.Container();
      const sky = new PIXI.Graphics();
      const far = new PIXI.Container();
      const world = new PIXI.Container();
      const tiles = new PIXI.Container();
      const actors = new PIXI.Container();
      const fx = new PIXI.Graphics();
      const popG = new PIXI.Graphics();
      world.addChild(tiles, actors, fx, popG);
      fieldLayer.addChild(sky, far, world);
      root.addChild(fieldLayer);
      const fieldHero = sprite("heroSide0", 0.5, 1);
      const slash = sprite("slash0", 0.5, 0.5);
      let builtField: FieldState | null = null;
      const mobSprites = new Map<number, Sprite>();
      const pickupSprites = new Map<number, Sprite>();
      const gearSprites: Sprite[] = [];
      let goalSprite: Sprite | null = null;

      const buildField = (field: FieldState) => {
        builtField = field;
        tiles.removeChildren().forEach((c) => c.destroy());
        far.removeChildren().forEach((c) => c.destroy());
        actors.removeChildren();
        for (const s of mobSprites.values()) s.destroy();
        mobSprites.clear();
        for (const s of pickupSprites.values()) s.destroy();
        pickupSprites.clear();
        goalSprite = null;
        const riftWorld = field.id === "rift";
        sky.clear();
        const bands = riftWorld ? [PALETTE.k, PALETTE.V, PALETTE.v, PALETTE.V] : [PALETTE.n, 0xb8e0f4, 0xd8eef0, PALETTE.p];
        bands.forEach((c, i) => sky.rect(0, (i * VIEW_H) / bands.length, VIEW_W, VIEW_H / bands.length + 1).fill(c));
        // Far ridge drawn as columns so it stays pixel-crisp.
        const ridge = new PIXI.Graphics();
        const ridgeW = field.cols * TILE;
        for (let x = 0; x < ridgeW; x += 2) {
          const top = Math.round(70 + 12 * Math.sin(x / 37) + 6 * Math.sin(x / 13 + 2));
          ridge.rect(x, top, 2, VIEW_H - top).fill(riftWorld ? PALETTE.V : 0x6fae8f);
        }
        far.addChild(ridge);
        if (!riftWorld) {
          for (let x = 8; x < ridgeW; x += 40) {
            const p = sprite("tilePine");
            p.position.set(x, 96);
            far.addChild(p);
          }
        }
        field.grid.forEach((row, ty) => {
          for (let tx = 0; tx < row.length; tx++) {
            const ch = row[tx];
            if (ch === ".") continue;
            let id: SpriteId = "tileGround";
            if (ch === "#") id = (field.grid[ty - 1]?.[tx] ?? ".") === "#" ? "tileGround" : "tileGroundTop";
            else if (ch === "r") id = "tileRock";
            else if (ch === "=") id = "tilePlatform";
            const s = sprite(id);
            s.position.set(tx * TILE, ty * TILE);
            tiles.addChild(s);
          }
        });
        if (field.goal) {
          goalSprite = sprite("tileJangseung");
          goalSprite.position.set(field.goal.x, field.goal.y);
          tiles.addChild(goalSprite);
        }
        actors.addChild(fieldHero, slash);
      };

      // ─── Gate layer ───
      const gate = new PIXI.Container();
      const gateBg = new PIXI.Graphics();
      for (let y = 0; y < 80; y += TILE) for (let x = 0; x < VIEW_W; x += TILE) {
        const s = sprite("tileFortress");
        s.position.set(x, y);
        gate.addChild(s);
      }
      gateBg.rect(36, 8, 88, 66).fill(PALETTE.B);
      gateBg.rect(36, 8, 88, 3).fill(PALETTE.k);
      gateBg.rect(32, 6, 4, 70).fill(PALETTE.r).rect(124, 6, 4, 70).fill(PALETTE.r);
      gateBg.rect(0, 72, VIEW_W, 8).fill(PALETTE.O);
      gateBg.rect(0, 80, VIEW_W, VIEW_H - 80).fill(PALETTE.o);
      for (let y = 88; y < VIEW_H; y += 12) gateBg.rect(0, y, VIEW_W, 1).fill(PALETTE.O);
      gateBg.rect(44, 88, 30, 34).fill(PALETTE.k).rect(45, 89, 28, 32).fill(PALETTE.p);
      gate.addChild(gateBg);
      const gateTraveler = sprite("traveler0", 0.5, 1);
      gateTraveler.scale.set(3);
      const hopae = sprite("hopae");
      hopae.scale.set(2);
      hopae.position.set(6, 84);
      const portrait = sprite("traveler0", 0.5, 0.5);
      portrait.position.set(59, 105);
      const items = [sprite("itemRice", 0.5, 0.5), sprite("itemFan", 0.5, 0.5)];
      items.forEach((s, i) => {
        s.scale.set(2);
        s.position.set(106 + i * 30, 108);
      });
      const bundle = new PIXI.Graphics();
      bundle.circle(120, 110, 15).fill(PALETTE.R).circle(119, 108, 13).fill(PALETTE.r).rect(112, 93, 16, 5).fill(PALETTE.r).rect(118, 98, 4, 4).fill(PALETTE.R);
      const stampG = new PIXI.Graphics();
      gate.addChild(gateTraveler, hopae, portrait, bundle, ...items, stampG);
      root.addChild(gate);

      const hud = new PIXI.Graphics();
      instance.stage.addChild(hud);

      // ─── Juice ───
      const reduced = () => propsRef.current.reducedMotion;
      const shake = createShake({ reducedMotion: reduced });
      const hitstop = createHitstop({ reducedMotion: reduced });
      const bursts = createBurstField(160);
      const popups: Popup[] = [];
      const popup = (text: string, x: number, y: number, color: number, scale = 1) => {
        if (popups.length > 24) popups.shift();
        popups.push({ text, x, y, t: 0, color, scale });
      };

      const fieldFx = (events: FieldEvent[]) => {
        for (const e of events) {
          if (e.type === "hit") {
            popup(String(e.dmg), e.x - 4, e.y - 6, e.crit ? PALETTE.y : PALETTE.w, e.crit ? 2 : 1);
            if (!reduced()) bursts.emit("sparks", e.x, e.y + 6, [hex(PALETTE.w), hex(PALETTE.y)], { count: e.crit ? 10 : 6, scale: 0.12 });
            hitstop.trigger(e.kind === "boss" || e.crit ? JUICE.hitstop.boss : JUICE.hitstop.hit);
            if (e.crit) shake.kick(2, 120);
          } else if (e.type === "kill") {
            popup(`+${e.exp}`, e.x - 6, e.y - 14, PALETTE.c);
            if (!reduced()) bursts.emit("coins", e.x, e.y + 6, [hex(PALETTE.y), hex(PALETTE.c), hex(PALETTE.v)], { count: 12, scale: 0.15 });
          } else if (e.type === "hurt") {
            const h = propsRef.current.viewRef.current.field?.hero;
            if (h) popup(`-${e.dmg}`, h.x, h.y - 8, PALETTE.r);
            shake.kick(3, JUICE.shake.failMs);
          } else if (e.type === "pickup") {
            if (!reduced()) bursts.emit("stardust", e.x, e.y, [hex(e.kind === "coin" ? PALETTE.y : PALETTE.r), hex(PALETTE.w)], { count: 8, scale: 0.1 });
          } else if (e.type === "levelup") {
            const h = propsRef.current.viewRef.current.field?.hero;
            if (h) popup(`LV${e.level}`, h.x - 4, h.y - 16, PALETTE.y, 2);
            if (!reduced() && h) bursts.emit("stardust", h.x + 5, h.y, [hex(PALETTE.y), hex(PALETTE.c)], { count: 20, scale: 0.14 });
          } else if (e.type === "boss-dead" || e.type === "goal") {
            shake.kick(4, 300);
            const h = propsRef.current.viewRef.current.field?.hero;
            if (!reduced() && h) bursts.emit("shards", h.x + 5, h.y, [hex(PALETTE.c), hex(PALETTE.v), hex(PALETTE.w)], { count: 30, scale: 0.15 });
          }
        }
      };

      // ─── Loop ───
      let acc = 0;
      let clock = 0;
      instance.ticker.add((ticker) => {
        const p = propsRef.current;
        const view = p.viewRef.current;
        const input = p.inputRef.current;
        const dtMs = Math.min(50, ticker.deltaMS);
        clock += dtMs / 1000;
        const paused = p.pausedRef.current || view.scene === "title" || view.scene === "ending";

        // Simulation.
        if (!paused && view.scene === "town") {
          const events = stepTown(view.town, input.dirs[input.dirs.length - 1] ?? null, dtMs / 1000, view.game.progress);
          if (events.length) p.onTownEvents(events);
        } else if (!paused && view.scene === "field" && view.field) {
          const allowed = hitstop.consume(dtMs);
          acc += allowed / 1000;
          let first = true;
          while (acc >= PHYSICS.step) {
            acc -= PHYSICS.step;
            const events = stepField(view.game, view.field, {
              left: input.dirs.includes("left"),
              right: input.dirs.includes("right"),
              jumpHeld: input.a || input.dirs.includes("up"),
              jumpPressed: first && input.aPressed,
              attackPressed: first && input.bPressed,
            }, PHYSICS.step);
            if (first) {
              input.aPressed = false;
              input.bPressed = false;
            }
            first = false;
            if (events.length) {
              fieldFx(events);
              p.onFieldEvents(events);
            }
            if (view.field?.done) break;
          }
        } else {
          acc = 0;
        }
        if (view.scene === "gate") {
          view.gate.enterT += dtMs / 1000;
          if (view.gate.stamp) view.gate.stamp.t += dtMs / 1000;
        }
        if (!paused) view.game.playMs += dtMs;
        bursts.step(dtMs);
        for (const pop of popups) pop.t += dtMs / 1000;
        while (popups.length && popups[0].t > 0.9) popups.shift();

        // Rendering.
        const offset = shake.sample(dtMs);
        root.position.set(Math.round(offset.x), Math.round(offset.y));
        const sceneTown = view.scene === "town" || view.scene === "title" || view.scene === "ending";
        town.visible = sceneTown;
        fieldLayer.visible = view.scene === "field";
        gate.visible = view.scene === "gate";

        if (sceneTown) {
          const tframe = Math.floor(clock * 2) % 2;
          for (const w of water) w.texture = tex[tframe ? "tileWater1" : "tileWater0"];
          if (rift) {
            const r = rift as Sprite;
            r.texture = tex[Math.floor(clock * 4) % 2 ? "tileRift1" : "tileRift0"];
            r.alpha = riftOpen(view.game.progress) ? 1 : 0.3;
          }
          const blink = Math.floor(clock * 10) % 25 === 0;
          for (const [id, s] of npcSprites) s.texture = tex[NPC_SPRITE[id][blink ? 1 : 0]];
          const pos = townPixel(view.town);
          const d = view.town.dir;
          const walking = view.town.move !== null;
          const leg = walking && view.town.move && view.town.move.t > 0.25 && view.town.move.t < 0.75;
          let id: SpriteId = "heroDown0";
          if (d === "down") id = leg ? (view.town.steps % 2 ? "heroDown1" : "heroDown2") : "heroDown0";
          else if (d === "up") id = leg ? (view.town.steps % 2 ? "heroUp1" : "heroUp2") : "heroUp0";
          else id = leg ? "heroSide1" : "heroSide0";
          townHero.texture = tex[id];
          townHero.scale.x = d === "left" ? -1 : 1;
          townHero.position.set(Math.round(pos.x + 8), Math.round(pos.y));
          let camX = pos.x + 8 - VIEW_W / 2;
          let camY = pos.y + 8 - VIEW_H / 2;
          if (view.scene !== "town") {
            camX = 80 + Math.sin(clock * 0.15) * 60;
            camY = 60;
          }
          camX = Math.max(0, Math.min(TOWN_MAP[0].length * TILE - VIEW_W, camX));
          camY = Math.max(-10, Math.min(TOWN_MAP.length * TILE - VIEW_H, camY));
          town.position.set(-Math.round(camX), -Math.round(camY));
        }

        if (view.scene === "field" && view.field) {
          const field = view.field;
          if (builtField !== field) buildField(field);
          const h = field.hero;
          const camX = Math.max(0, Math.min(field.cols * TILE - VIEW_W, h.x + h.w / 2 - VIEW_W / 2 + h.face * 12));
          world.position.set(-Math.round(camX), 0);
          far.position.set(-Math.round(camX * 0.45), 0);
          let hid: SpriteId = "heroSide0";
          if (h.attackT >= 0) hid = "heroAttack";
          else if (!h.onGround) hid = "heroJump";
          else if (h.runT > 0) hid = Math.floor(h.runT * 9) % 2 ? "heroSide1" : "heroSide0";
          fieldHero.texture = tex[hid];
          fieldHero.scale.x = h.face;
          fieldHero.position.set(Math.round(h.x + h.w / 2), Math.round(h.y + h.h));
          fieldHero.alpha = h.invulnT > 0 && Math.floor(clock * 16) % 2 === 0 ? 0.35 : 1;
          const box = swordBox(h);
          slash.visible = h.attackT >= 0 && h.attackT < 0.22;
          if (slash.visible) {
            slash.texture = tex[h.attackT < 0.08 || !box ? "slash0" : "slash1"];
            slash.scale.x = h.face;
            slash.position.set(Math.round(h.x + h.w / 2 + h.face * 11), Math.round(h.y + 6));
          }
          // Mobs.
          const alive = new Set<number>();
          for (const m of field.mobs) {
            alive.add(m.id);
            let s = mobSprites.get(m.id);
            if (!s) {
              s = sprite(m.kind === "boss" ? "boss0" : m.kind === "phone" ? "phone0" : "bottle0", 0.5, 1);
              actors.addChildAt(s, 0);
              mobSprites.set(m.id, s);
            }
            const f2 = Math.floor(m.t * (m.kind === "boss" ? 3 : 5)) % 2;
            s.texture = tex[`${m.kind}${f2}` as SpriteId];
            s.scale.x = m.kind === "phone" ? 1 : m.dir;
            s.tint = m.flashT > 0 ? 0xff9a9a : 0xffffff;
            const extra = m.kind === "phone" ? 1 : 0;
            s.position.set(Math.round(m.x + m.w / 2), Math.round(m.y + m.h + extra + (m.kind === "boss" ? 4 : 0)));
          }
          for (const [id, s] of mobSprites) if (!alive.has(id)) {
            s.destroy();
            mobSprites.delete(id);
          }
          for (const item of field.pickups) {
            let s = pickupSprites.get(item.id);
            if (!s) {
              s = sprite(item.kind === "coin" ? "coin" : "heart", 0.5, 0.5);
              actors.addChildAt(s, 0);
              pickupSprites.set(item.id, s);
            }
            s.visible = !item.taken;
            s.position.set(item.x + 4, Math.round(item.y + 4 + Math.sin(clock * 4 + item.id) * 1.5));
          }
          while (gearSprites.length < field.projectiles.length) {
            const g = sprite("gear", 0.5, 0.5);
            actors.addChild(g);
            gearSprites.push(g);
          }
          gearSprites.forEach((g, i) => {
            const pj = field.projectiles[i];
            g.visible = Boolean(pj);
            if (pj) {
              g.position.set(Math.round(pj.x + 8), Math.round(pj.y + 8));
              g.rotation = reduced() ? 0 : clock * 10 * Math.sign(pj.vx);
            }
          });
          fx.clear();
          bursts.forEach((pt, progress) => {
            const size = Math.max(1, Math.round(pt.size * (1 - progress)));
            fx.rect(Math.round(pt.x), Math.round(pt.y), size, size).fill(pt.color);
          });
          popG.clear();
          for (const pop of popups) drawText(popG, pop.text, Math.round(pop.x), Math.round(pop.y - pop.t * 22), pop.color, pop.scale);
        }

        if (view.scene === "gate") {
          const g = view.gate;
          const t = g.traveler;
          gateTraveler.visible = Boolean(t);
          hopae.visible = Boolean(t);
          portrait.visible = Boolean(t);
          bundle.visible = Boolean(t) && !g.bagOpen;
          items.forEach((s) => (s.visible = Boolean(t) && g.bagOpen));
          if (t) {
            const k = Math.min(1, g.enterT / 0.6);
            const leaving = g.stamp ? Math.min(1, Math.max(0, (g.stamp.t - 0.5) / 0.5)) : 0;
            const away = g.stamp?.approve ? 1 : -1;
            gateTraveler.texture = tex[TRAVELER_SPRITE[t.look]];
            gateTraveler.position.set(Math.round(-30 + 110 * k + away * 120 * leaving), 75 + (k < 1 ? Math.round(Math.abs(Math.sin(k * 12)) * -2) : 0));
            portrait.texture = tex[TRAVELER_SPRITE[t.portrait]];
            t.items.forEach((it, i) => (items[i].texture = tex[ITEM_SPRITE[it]]));
          }
          stampG.clear();
          if (g.stamp && g.stamp.t < 1.1) {
            const pop = reduced() ? 1 : Math.min(1, g.stamp.t / 0.15) * (1 + Math.max(0, 0.15 - Math.abs(g.stamp.t - 0.15)));
            const r = 22 * pop;
            const cx = 80;
            const cy = 40;
            if (g.stamp.approve) {
              stampG.circle(cx, cy, r).stroke({ width: 5, color: PALETTE.g }).circle(cx, cy, r).stroke({ width: 1, color: PALETTE.k });
            } else {
              stampG.moveTo(cx - r, cy - r).lineTo(cx + r, cy + r).moveTo(cx + r, cy - r).lineTo(cx - r, cy + r).stroke({ width: 6, color: PALETTE.r });
            }
          }
        }

        // HUD.
        hud.clear();
        if (view.scene === "town" || view.scene === "field") {
          const hero = view.game.hero;
          hud.rect(0, 0, VIEW_W, 10).fill({ color: PALETTE.k, alpha: 0.72 });
          drawText(hud, `LV${hero.level}`, 2, 2, PALETTE.y, 1, false);
          const hpW = 40;
          hud.rect(26, 2, hpW + 2, 5).fill(PALETTE.k);
          hud.rect(27, 3, Math.round((hpW * hero.hp) / hero.maxHp), 3).fill(hero.hp / hero.maxHp < 0.3 ? PALETTE.y : PALETTE.r);
          const next = expToNext(hero.level);
          hud.rect(27, 7, Math.round((hpW * Math.min(next, hero.exp)) / next), 1).fill(PALETTE.c);
          drawText(hud, String(hero.hp), 70, 2, PALETTE.w, 1, false);
          hud.circle(98, 5, 3).fill(PALETTE.y).rect(97, 4, 2, 2).fill(PALETTE.k);
          drawText(hud, String(Math.min(99999, hero.coins)), 103, 2, PALETTE.w, 1, false);
          const shards = shardCount(view.game.progress);
          for (let i = 0; i < 3; i++) {
            const x = 140 + i * 7;
            hud.poly([x + 2, 1, x + 5, 5, x + 2, 9, x - 1, 5]).fill(i < shards ? PALETTE.c : PALETTE.V);
          }
          if (view.scene === "field" && view.field) {
            const boss = view.field.mobs.find((m) => m.kind === "boss");
            if (boss) {
              hud.rect(30, VIEW_H - 8, 100, 5).fill(PALETTE.k);
              hud.rect(31, VIEW_H - 7, Math.round((98 * Math.max(0, boss.hp)) / MOBS.boss.hp), 3).fill(PALETTE.v);
            }
          }
        }
      });

      const onVisibility = () => {
        if (document.hidden) instance.ticker.stop();
        else instance.ticker.start();
      };
      document.addEventListener("visibilitychange", onVisibility);
      const cleanup = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("resize", fit);
      };
      (instance as unknown as { __cleanup?: () => void }).__cleanup = cleanup;
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (app) {
        (app as unknown as { __cleanup?: () => void }).__cleanup?.();
        app.destroy(true, { children: true });
        app = null;
      }
    };
  }, []);

  return <div ref={wrapRef} className="flex w-full justify-center" />;
}
