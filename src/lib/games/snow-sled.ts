/**
 * 눈썰매 (Snow Sled) — an OIYO original top-down downhill sled run.
 * Drag left and right to steer the sled down a snowy hill: pass between each pair of flags,
 * dodge pine trees and snowmen, grab lucky pouches and hit ramps to fly. Every course is seeded,
 * and its par time comes from an autopilot that follows the clean line, so each run has a time to beat.
 */

import { mulberry } from "./pixel-kit";

export const SLED_SLUG = "snow-sled";
export const FIELD_W = 360;
export const FIELD_H = 600;
export const SLED_SCREEN_Y = 150;

export type ObjKind = "tree" | "snowman" | "pouch" | "ice" | "ramp";
export interface Obj { kind: ObjKind; x: number; y: number; w: number; h: number; taken?: boolean }
export interface Gate { x: number; y: number; half: number; passed: boolean | null }

export interface Course {
  index: number;
  length: number;
  gates: Gate[];
  objs: Obj[];
  par: number;
  night: boolean;
  vmax: number;
}

export interface CourseSpec { length: number; gates: number; gap: number; trees: number; snowmen: number; pouches: number; ice: number; ramps: number; night: boolean; vmax: number }

function specFor(i: number): CourseSpec {
  const band = Math.floor(i / 5);
  const k = i % 5;
  const len = 2600 + i * 180;
  const base: CourseSpec = { length: len, gates: 6 + Math.floor(i / 2), gap: 70 - Math.min(26, i), trees: 0, snowmen: 0, pouches: 4, ice: 0, ramps: 0, night: false, vmax: 300 + i * 4 };
  switch (band) {
    case 0: return { ...base, gap: 78 - k * 2 };
    case 1: return { ...base, trees: 10 + k * 3 };
    case 2: return { ...base, trees: 10 + k * 2, snowmen: 4 + k, pouches: 8 };
    case 3: return { ...base, trees: 12 + k * 2, snowmen: 3, ice: 3 + k };
    case 4: return { ...base, trees: 14 + k * 2, snowmen: 4, ramps: 3 + k, ice: 2 };
    default: return { ...base, trees: 18 + k * 2, snowmen: 6, ramps: 3, ice: 3, pouches: 10, night: true };
  }
}

export const COURSE_COUNT = 30;
export const SPECS: readonly CourseSpec[] = Array.from({ length: COURSE_COUNT }, (_, i) => specFor(i));

/** Path x at world y: straight lines between gate centres (start in the middle). */
export function pathX(c: Pick<Course, "gates">, y: number): number {
  let px = FIELD_W / 2;
  let py = 0;
  for (const g of c.gates) {
    if (y <= g.y) return px + ((g.x - px) * (y - py)) / Math.max(1, g.y - py);
    px = g.x;
    py = g.y;
  }
  return px;
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, pad = 0): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w + pad * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad * 2;
}

export function buildCourse(index: number): Course {
  const sp = SPECS[index];
  const rand = mulberry(9001 + index * 131);
  const gates: Gate[] = [];
  const step = (sp.length - 500) / sp.gates;
  let lastX = FIELD_W / 2;
  for (let g = 0; g < sp.gates; g++) {
    const y = 360 + g * step + (rand() - 0.5) * step * 0.2;
    const swing = 70 + Math.min(90, index * 4);
    let x = lastX + (rand() < 0.5 ? -1 : 1) * (40 + rand() * swing);
    x = Math.max(60, Math.min(FIELD_W - 60, x));
    gates.push({ x, y, half: sp.gap / 2, passed: null });
    lastX = x;
  }
  const course: Course = { index, length: sp.length, gates, objs: [], par: 0, night: sp.night, vmax: sp.vmax };
  const objs: Obj[] = [];
  const place = (kind: ObjKind, count: number, w: number, h: number, onPath: boolean) => {
    let tries = 0;
    let made = 0;
    while (made < count && tries < count * 60) {
      tries += 1;
      const y = 300 + rand() * (sp.length - 450);
      const px = pathX(course, y);
      const x = onPath ? px + (rand() - 0.5) * 16 : 20 + rand() * (FIELD_W - 40);
      const o: Obj = { kind, x, y, w, h };
      const hazard = kind === "tree" || kind === "snowman";
      if (hazard) {
        // keep the clean line clear, including a little before and after
        let clear = true;
        for (let dy = -40; dy <= 40; dy += 10) if (Math.abs(pathX(course, y + dy) - x) < 46 + w / 2) clear = false;
        if (!clear) continue;
      }
      if (gates.some((g) => Math.abs(g.y - y) < 40 && (hazard || kind === "ice" || kind === "ramp"))) continue;
      if (objs.some((p) => overlaps(p, o, 10))) continue;
      if (kind === "ice" && Math.abs(pathX(course, y - 50) - pathX(course, y + 50)) > 30) continue;
      objs.push(o);
      made += 1;
    }
  };
  place("ramp", sp.ramps, 44, 18, true);
  place("ice", sp.ice, 90, 70, true);
  place("pouch", Math.ceil(sp.pouches / 2), 16, 16, true);
  place("pouch", Math.floor(sp.pouches / 2), 16, 16, false);
  place("tree", sp.trees, 22, 26, false);
  place("snowman", sp.snowmen, 22, 26, false);
  objs.sort((a, b) => a.y - b.y);
  course.objs = objs;
  course.par = parFor(course);
  return course;
}

export interface Run {
  course: Course;
  x: number;
  y: number;
  v: number;
  vx: number;
  tx: number;
  time: number;
  tumble: number;
  air: number;
  onIce: boolean;
  missed: number;
  pouches: number;
  crashes: number;
  finished: boolean;
}

export const MISS_PENALTY = 2;
export const POUCH_BONUS = 0.5;

export function newRun(course: Course): Run {
  course.gates.forEach((g) => (g.passed = null));
  course.objs.forEach((o) => (o.taken = false));
  return { course, x: FIELD_W / 2, y: 0, v: 140, vx: 0, tx: FIELD_W / 2, time: 0, tumble: 0, air: 0, onIce: false, missed: 0, pouches: 0, crashes: 0, finished: false };
}

export interface SledEvents { gate: "pass" | "miss" | null; crash: ObjKind | null; pouch: boolean; ramp: boolean; finish: boolean }

export function steer(r: Run, x: number): void {
  r.tx = Math.max(16, Math.min(FIELD_W - 16, x));
}

export function stepRun(r: Run, dt: number): SledEvents {
  const ev: SledEvents = { gate: null, crash: null, pouch: false, ramp: false, finish: false };
  if (r.finished) return ev;
  r.time += dt;
  const c = r.course;
  if (r.tumble > 0) {
    r.tumble -= dt;
    r.v = Math.max(40, r.v - 300 * dt);
  } else {
    r.v = Math.min(c.vmax, r.v + 70 * dt);
  }
  if (r.air > 0) r.air -= dt;
  const grip = r.tumble > 0 ? 0 : r.onIce && r.air <= 0 ? 0.08 : 1;
  const maxLat = 0.9 * r.v + 80;
  const want = Math.max(-maxLat, Math.min(maxLat, (r.tx - r.x) * 6));
  r.vx += (want - r.vx) * Math.min(1, dt * 12 * grip);
  if (r.air <= 0) r.v -= Math.abs(r.vx) * 0.12 * dt * (r.onIce ? 0 : 1);
  r.x = Math.max(12, Math.min(FIELD_W - 12, r.x + r.vx * dt));
  const prevY = r.y;
  r.y += r.v * dt;

  for (const g of c.gates) {
    if (g.passed !== null || r.y < g.y || prevY >= g.y) continue;
    const ok = Math.abs(r.x - g.x) <= g.half;
    g.passed = ok;
    ev.gate = ok ? "pass" : "miss";
    if (!ok) r.missed += 1;
  }
  r.onIce = false;
  const me = { x: r.x, y: r.y, w: 18, h: 22 };
  for (const o of c.objs) {
    if (o.y > r.y + 40) break;
    if (o.y < r.y - 60 || o.taken) continue;
    if (!overlaps(me, o)) continue;
    if (o.kind === "ice") r.onIce = true;
    else if (o.kind === "pouch") {
      o.taken = true;
      r.pouches += 1;
      ev.pouch = true;
    } else if (o.kind === "ramp") {
      if (r.air <= 0) {
        r.air = 0.55 + r.v / 1200;
        r.v = Math.min(c.vmax + 40, r.v + 40);
        ev.ramp = true;
      }
    } else if (r.air <= 0 && r.tumble <= 0) {
      o.taken = true; // knocked over
      r.tumble = 0.9;
      r.crashes += 1;
      r.vx = (r.x < o.x ? -1 : 1) * 120;
      ev.crash = o.kind;
    }
  }
  if (r.y >= c.length) {
    r.finished = true;
    ev.finish = true;
  }
  return ev;
}

/** Final time with penalties and bonuses. */
export function finalTime(r: Run): number {
  return Math.max(0, r.time + r.missed * MISS_PENALTY - r.pouches * POUCH_BONUS);
}

/** 0 stars = too slow to clear (over 1.5× par). */
export function starsFor(time: number, par: number): 0 | 1 | 2 | 3 {
  if (time <= par) return 3;
  if (time <= par * 1.2) return 2;
  if (time <= par * 1.5) return 1;
  return 0;
}

/** Autopilot: aim a little ahead along the clean line (used for par and tests). */
export function autopilot(r: Run, look = 70): void {
  steer(r, pathX(r.course, r.y + look));
}

function parFor(c: Course): number {
  const r = newRun(c);
  let guard = 0;
  while (!r.finished && guard < 60 * 120) {
    autopilot(r);
    stepRun(r, 1 / 60);
    guard += 1;
  }
  const t = finalTime(r);
  c.gates.forEach((g) => (g.passed = null));
  c.objs.forEach((o) => (o.taken = false));
  return Math.ceil(t * 1.12 * 10) / 10;
}

export const COURSES: readonly Course[] = Array.from({ length: COURSE_COUNT }, (_, i) => buildCourse(i));
