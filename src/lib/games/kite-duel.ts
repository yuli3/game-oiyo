/**
 * 연싸움 (Kite Duel) — an OIYO original one-phone kite fight for the lunar new year.
 * Two kites fly over one sky, each tied to its own reel. Cross your string over the rival's
 * and whip your kite faster than theirs: the faster string saws through the slower one.
 * The first string to snap loses. Play against 20 computer rivals (wind, gusts, magpies)
 * or with a friend on one phone (each drags on their own half of the screen).
 */

export const KITE_SLUG = "kite-duel";

export const FIELD_W = 360;
export const FIELD_H = 600;
export const MATCH_SECONDS = 60;
export const KITE_R = 16;

export interface Rival {
  id: string;
  /** Max kite speed (px/s). */
  speed: number;
  /** Seconds between AI decisions (lower = sharper). */
  think: number;
  /** 0..1: how readily it goes for a crossing. */
  nerve: number;
  /** Saw wiggle amplitude in px. */
  wiggle: number;
  /** String strength multiplier (glass coating). */
  hp: number;
  wind: number; // steady wind px/s² to the right (negative = left)
  gust: number; // gust amplitude
  birds: number; // magpies crossing the sky
}

export const RIVALS: readonly Rival[] = [
  { id: "kid", speed: 150, think: 0.8, nerve: 0.35, wiggle: 30, hp: 0.8, wind: 0, gust: 0, birds: 0 },
  { id: "cousin", speed: 170, think: 0.7, nerve: 0.45, wiggle: 34, hp: 0.85, wind: 0, gust: 0, birds: 0 },
  { id: "neighbor", speed: 185, think: 0.65, nerve: 0.5, wiggle: 38, hp: 0.9, wind: 25, gust: 0, birds: 0 },
  { id: "classmate", speed: 200, think: 0.6, nerve: 0.55, wiggle: 40, hp: 0.95, wind: -30, gust: 0, birds: 0 },
  { id: "uncle", speed: 210, think: 0.55, nerve: 0.55, wiggle: 44, hp: 1, wind: 40, gust: 20, birds: 0 },
  { id: "aunt", speed: 220, think: 0.5, nerve: 0.6, wiggle: 46, hp: 1, wind: -45, gust: 30, birds: 0 },
  { id: "captain", speed: 230, think: 0.48, nerve: 0.6, wiggle: 48, hp: 1.05, wind: 30, gust: 50, birds: 0 },
  { id: "twins", speed: 240, think: 0.45, nerve: 0.65, wiggle: 50, hp: 1.05, wind: -20, gust: 60, birds: 0 },
  { id: "ferry", speed: 245, think: 0.42, nerve: 0.65, wiggle: 52, hp: 1.1, wind: 50, gust: 40, birds: 1 },
  { id: "market", speed: 250, think: 0.4, nerve: 0.7, wiggle: 54, hp: 1.1, wind: -50, gust: 50, birds: 1 },
  { id: "riverbank", speed: 258, think: 0.38, nerve: 0.7, wiggle: 56, hp: 1.15, wind: 0, gust: 80, birds: 2 },
  { id: "mill", speed: 265, think: 0.36, nerve: 0.72, wiggle: 58, hp: 1.15, wind: 60, gust: 60, birds: 2 },
  { id: "school", speed: 272, think: 0.34, nerve: 0.75, wiggle: 60, hp: 1.2, wind: -60, gust: 70, birds: 2 },
  { id: "village", speed: 280, think: 0.32, nerve: 0.75, wiggle: 62, hp: 1.2, wind: 40, gust: 90, birds: 3 },
  { id: "county", speed: 288, think: 0.3, nerve: 0.78, wiggle: 64, hp: 1.25, wind: -70, gust: 80, birds: 3 },
  { id: "province", speed: 296, think: 0.28, nerve: 0.8, wiggle: 66, hp: 1.25, wind: 70, gust: 100, birds: 3 },
  { id: "glassmaker", speed: 304, think: 0.26, nerve: 0.82, wiggle: 68, hp: 1.4, wind: 0, gust: 110, birds: 2 },
  { id: "storm", speed: 312, think: 0.24, nerve: 0.85, wiggle: 70, hp: 1.3, wind: 90, gust: 130, birds: 4 },
  { id: "champion", speed: 320, think: 0.22, nerve: 0.88, wiggle: 72, hp: 1.35, wind: -60, gust: 120, birds: 4 },
  { id: "master", speed: 330, think: 0.2, nerve: 0.9, wiggle: 76, hp: 1.45, wind: 50, gust: 140, birds: 4 },
];
export const RIVAL_COUNT = RIVALS.length;

export interface Vec { x: number; y: number }

export interface Kite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number; // 0..100*mult
  maxHp: number;
  speed: number;
  target: Vec | null;
  stun: number; // seconds tumbling after a bird hit
  cut: boolean;
}

export interface Bird { x: number; y: number; vx: number; flap: number }

export interface Duel {
  rival: number;
  time: number;
  kites: [Kite, Kite];
  anchors: [Vec, Vec];
  birds: Bird[];
  crossed: boolean;
  cross: Vec | null;
  /** Damage dealt this step (for sparks/sound). */
  sawing: 0 | 1 | null;
  rng: () => number;
  ai: { next: number; side: number; phase: number };
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Player 0 (red) reels from the bottom left, player 1 (blue / computer) from the top right. */
export const ANCHORS: [Vec, Vec] = [{ x: 70, y: FIELD_H + 10 }, { x: FIELD_W - 70, y: -10 }];

export const PLAYER_SPEED = 300;

function kite(x: number, y: number, speed: number, hpMult: number): Kite {
  return { x, y, vx: 0, vy: 0, hp: 100 * hpMult, maxHp: 100 * hpMult, speed, target: null, stun: 0, cut: false };
}

export function newDuel(rival: number, seed: number, twoPlayer = false): Duel {
  const r = RIVALS[rival];
  const rng = mulberry(seed);
  const birds: Bird[] = [];
  for (let k = 0; k < r.birds; k++) {
    const dir = rng() < 0.5 ? 1 : -1;
    birds.push({ x: rng() * FIELD_W, y: 140 + rng() * (FIELD_H - 280), vx: dir * (50 + rng() * 40), flap: rng() * 6 });
  }
  return {
    rival,
    time: 0,
    kites: [kite(110, FIELD_H * 0.68, PLAYER_SPEED, 1), kite(FIELD_W - 110, FIELD_H * 0.32, twoPlayer ? PLAYER_SPEED : r.speed, twoPlayer ? 1 : r.hp)],
    anchors: ANCHORS,
    birds,
    crossed: false,
    cross: null,
    sawing: null,
    rng,
    ai: { next: 0, side: 1, phase: 0 },
  };
}

/** Segment intersection point of p1-p2 and p3-p4, or null. */
export function intersect(p1: Vec, p2: Vec, p3: Vec, p4: Vec): Vec | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

export function windAt(d: Duel): number {
  const r = RIVALS[d.rival];
  return r.wind + r.gust * Math.sin(d.time * 0.9) * Math.sin(d.time * 0.37 + 1);
}

/** Saw damage per second per px/s of speed advantage. */
export const SAW_RATE = 0.16;

/** Simple computer pilot: cross the rival string, then whip back and forth across it. */
export function thinkAi(d: Duel, who: 0 | 1, rival: Rival): void {
  const me = d.kites[who];
  const foe = d.kites[1 - who];
  const anchor = d.anchors[1 - who];
  if (d.time < d.ai.next && me.target) {
    if (d.crossed) {
      // keep whipping: oscillate along the normal of the foe string
      const sx = foe.x - anchor.x;
      const sy = foe.y - anchor.y;
      const len = Math.hypot(sx, sy) || 1;
      const nx = -sy / len;
      const ny = sx / len;
      const amp = rival.wiggle * Math.sin(d.time * 9 + d.ai.phase);
      const c = d.cross ?? { x: me.x, y: me.y };
      me.target = { x: (me.x + c.x) / 2 + nx * amp, y: (me.y + c.y) / 2 + ny * amp + (who === 1 ? -10 : 10) };
    }
    return;
  }
  d.ai.next = d.time + rival.think * (0.7 + d.rng() * 0.6);
  // which side of the foe string am I on?
  const sx = foe.x - anchor.x;
  const sy = foe.y - anchor.y;
  const len = Math.hypot(sx, sy) || 1;
  const nx = -sy / len;
  const ny = sx / len;
  const side = Math.sign((me.x - anchor.x) * nx + (me.y - anchor.y) * ny) || 1;
  const losing = d.crossed && me.hp / me.maxHp < foe.hp / foe.maxHp - 0.25;
  if (losing && d.rng() > rival.nerve) {
    // back off to its own corner
    me.target = { x: who === 1 ? FIELD_W - 60 : 60, y: who === 1 ? 90 : FIELD_H - 90 };
    return;
  }
  if (d.rng() < rival.nerve) {
    // aim at a point on the far side of the foe string, between its middle and the kite
    const t = 0.45 + d.rng() * 0.4;
    const px = anchor.x + sx * t;
    const py = anchor.y + sy * t;
    const off = 40 + d.rng() * 40;
    me.target = { x: px - nx * side * off, y: py - ny * side * off };
  } else {
    me.target = { x: 40 + d.rng() * (FIELD_W - 80), y: who === 1 ? 60 + d.rng() * 220 : FIELD_H - 60 - d.rng() * 220 };
  }
  d.ai.phase = d.rng() * 6;
}

export interface StepEvents { cut: 0 | 1 | null; bird: 0 | 1 | null; crossedNow: boolean }

export function stepDuel(d: Duel, dt: number, aiSides: ReadonlyArray<0 | 1>): StepEvents {
  const ev: StepEvents = { cut: null, bird: null, crossedNow: false };
  if (duelWinner(d) !== null) return ev;
  d.time += dt;
  const r = RIVALS[d.rival];
  for (const s of aiSides) thinkAi(d, s, r);
  const wind = windAt(d);
  d.kites.forEach((k, i) => {
    if (k.cut) {
      // drifting away
      k.vx += wind * dt * 2;
      k.vy += (i === 0 ? -40 : 40) * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      return;
    }
    k.stun = Math.max(0, k.stun - dt);
    const vmax = k.speed * (k.stun > 0 ? 0.35 : 1);
    let ax = wind;
    let ay = 0;
    if (k.target && k.stun <= 0) {
      ax += (k.target.x - k.x) * 60 - k.vx * 12;
      ay += (k.target.y - k.y) * 60 - k.vy * 12;
    } else {
      ax -= k.vx * 2;
      ay -= k.vy * 2;
      // untended kites climb gently away from the reel
      ay += i === 0 ? -20 : 20;
    }
    k.vx += ax * dt;
    k.vy += ay * dt;
    const v = Math.hypot(k.vx, k.vy);
    if (v > vmax) {
      k.vx *= vmax / v;
      k.vy *= vmax / v;
    }
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    // walls
    if (k.x < KITE_R) { k.x = KITE_R; k.vx = Math.abs(k.vx) * 0.3; }
    if (k.x > FIELD_W - KITE_R) { k.x = FIELD_W - KITE_R; k.vx = -Math.abs(k.vx) * 0.3; }
    if (k.y < KITE_R) { k.y = KITE_R; k.vy = Math.abs(k.vy) * 0.3; }
    if (k.y > FIELD_H - KITE_R) { k.y = FIELD_H - KITE_R; k.vy = -Math.abs(k.vy) * 0.3; }
  });
  // magpies
  for (const b of d.birds) {
    b.x += b.vx * dt;
    b.flap += dt * 10;
    if (b.x < -30) { b.x = FIELD_W + 30; b.y = 140 + d.rng() * (FIELD_H - 280); }
    if (b.x > FIELD_W + 30) { b.x = -30; b.y = 140 + d.rng() * (FIELD_H - 280); }
    d.kites.forEach((k, i) => {
      if (!k.cut && k.stun <= 0 && Math.hypot(k.x - b.x, k.y - b.y) < KITE_R + 10) {
        k.stun = 1.1;
        k.vx = b.vx * 1.5;
        k.vy = (i === 0 ? 1 : -1) * 120;
        ev.bird = i as 0 | 1;
      }
    });
  }
  // strings
  const [a, b] = d.kites;
  const was = d.crossed;
  d.sawing = null;
  if (!a.cut && !b.cut) {
    d.cross = intersect(d.anchors[0], a, d.anchors[1], b);
    d.crossed = d.cross !== null;
    if (d.crossed && !was) ev.crossedNow = true;
    if (d.crossed) {
      const va = Math.hypot(a.vx, a.vy) * (a.stun > 0 ? 0.3 : 1);
      const vb = Math.hypot(b.vx, b.vy) * (b.stun > 0 ? 0.3 : 1);
      const edge = va - vb;
      if (Math.abs(edge) > 25) {
        const victim = edge > 0 ? b : a;
        victim.hp -= (Math.abs(edge) - 25) * SAW_RATE * dt * 10;
        d.sawing = edge > 0 ? 0 : 1;
        if (victim.hp <= 0) {
          victim.hp = 0;
          victim.cut = true;
          ev.cut = victim === a ? 0 : 1;
        }
      }
    }
  } else {
    d.crossed = false;
    d.cross = null;
  }
  return ev;
}

/** 0 or 1 = that side won, 2 = draw, null = still flying. */
export function duelWinner(d: Duel): 0 | 1 | 2 | null {
  if (d.kites[1].cut) return 0;
  if (d.kites[0].cut) return 1;
  if (d.time >= MATCH_SECONDS) {
    const ra = d.kites[0].hp / d.kites[0].maxHp;
    const rb = d.kites[1].hp / d.kites[1].maxHp;
    if (Math.abs(ra - rb) < 0.02) return 2;
    return ra > rb ? 0 : 1;
  }
  return null;
}

export function setTarget(d: Duel, side: 0 | 1, x: number, y: number): void {
  d.kites[side].target = { x: Math.max(KITE_R, Math.min(FIELD_W - KITE_R, x)), y: Math.max(KITE_R, Math.min(FIELD_H - KITE_R, y)) };
}

export function timeLeft(d: Duel): number {
  return Math.max(0, MATCH_SECONDS - d.time);
}
