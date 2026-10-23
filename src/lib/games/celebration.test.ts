import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { celebrate, disposeCelebration } from "./celebration";

// Browser APIs are the boundary here; the real burst field and renderer run unchanged.
class ElementSurface {
  children: ElementSurface[] = [];
  parentElement: ElementSurface | null = null;
  style = {};
  isConnected = true;
  widthWrites = 0;
  private backingWidth = 300;
  height = 150;
  get width() { return this.backingWidth; }
  set width(value: number) { this.backingWidth = Math.trunc(value); this.widthWrites++; }
  appendChild(child: ElementSurface) {
    child.remove();
    child.parentElement = this;
    child.isConnected = this.isConnected;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((x) => x !== this);
    this.parentElement = null;
    this.isConnected = false;
  }
  contains(node: ElementSurface): boolean { return node === this || this.children.some((child) => child.contains(node)); }
  setAttribute() {}
  getBoundingClientRect() { return { width: 399, height: 201, left: 20, top: 30 }; }
  getContext() { return context; }
}

const noop = () => {};
const context = new Proxy({}, { get: () => noop, set: () => true });
let body: ElementSurface;
let target: ElementSurface;
let documentSurface: { body: ElementSurface; documentElement: ElementSurface; fullscreenElement: ElementSurface | null; createElement: () => ElementSurface };
let frames: Map<number, FrameRequestCallback>;
let mutations: (() => void)[];
let nextFrame: number;
let now: number;

function tick() {
  now += 16;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(now));
}

beforeEach(() => {
  body = new ElementSurface();
  target = new ElementSurface();
  body.appendChild(target);
  documentSurface = { body, documentElement: body, fullscreenElement: null, createElement: () => new ElementSurface() };
  frames = new Map(); mutations = []; nextFrame = 0; now = 0;
  vi.stubGlobal("document", documentSurface);
  vi.stubGlobal("window", { devicePixelRatio: 1.25, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "#fff", fontFamily: "sans-serif" }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("MutationObserver", class {
    constructor(private callback: () => void) {}
    observe() { mutations.push(this.callback); }
    disconnect() { mutations = mutations.filter((callback) => callback !== this.callback); }
  });
});

afterEach(() => vi.unstubAllGlobals());

test("celebration stays inside the game's native fullscreen subtree", () => {
  documentSurface.fullscreenElement = target;
  // Only the DOM boundary is substituted, not the public celebration or its particles.
  celebrate(target as unknown as HTMLElement, { preset: "tiles" });
  tick();
  expect(target.children).toHaveLength(1);
});

test("removing the game stops its pending celebration and removes its overlay", () => {
  celebrate(target as unknown as HTMLElement, { preset: "tiles" });
  target.remove();
  [...mutations].forEach((callback) => callback());
  expect(frames.size).toBe(0);
  expect(body.children).toHaveLength(0);
});

test("fractional screen scaling allocates a stable integer canvas buffer", () => {
  celebrate(target as unknown as HTMLElement, { preset: "tiles" });
  const canvas = body.children.find((child) => child !== target)!;
  tick(); tick(); tick();
  expect(canvas.width).toBe(499);
  expect(canvas.widthWrites).toBe(1);
});

test("an active effect follows native fullscreen entry and exit", () => {
  celebrate(target as unknown as HTMLElement, { preset: "tiles" });
  const canvas = body.children.find((child) => child !== target)!;
  documentSurface.fullscreenElement = target;
  tick();
  expect(canvas.parentElement).toBe(target);
  documentSurface.fullscreenElement = null;
  tick();
  expect(canvas.parentElement).toBe(body);
});

test("explicit game cleanup is idempotent and a later celebration still works", () => {
  const game = target as unknown as HTMLElement;
  celebrate(game, { preset: "cards" });
  disposeCelebration(game); disposeCelebration(game);
  expect(frames.size).toBe(0);
  expect(mutations).toHaveLength(0);
  expect(body.children).toEqual([target]);
  celebrate(game, { preset: "cards" });
  expect(frames.size).toBe(1);
});

test("a completed effect releases its overlay, observer and animation", () => {
  celebrate(target as unknown as HTMLElement, { preset: "sparks", label: "WIN" });
  for (let frame = 0; frame < 300; frame++) tick();
  expect(body.children).toEqual([target]);
  expect(frames.size).toBe(0);
  expect(mutations).toHaveLength(0);
});

test("reduced motion without a label creates no overlay or animation", () => {
  vi.stubGlobal("window", { devicePixelRatio: 1, matchMedia: () => ({ matches: true }) });
  celebrate(target as unknown as HTMLElement, { preset: "sparks" });
  expect(body.children).toEqual([target]);
  expect(frames.size).toBe(0);
});
