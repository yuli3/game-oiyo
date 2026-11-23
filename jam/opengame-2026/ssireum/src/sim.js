// Pure match logic for Sandpit Kings: balance, stamina, techniques, reversals.
// No rendering here so the rules can be tested in isolation.

export const TECH = {
  lift: { key: 'lift', ko: '들배지기', en: 'Belt Lift', beats: 'twist' },
  trip: { key: 'trip', ko: '안다리걸기', en: 'Inner Trip', beats: 'lift' },
  twist: { key: 'twist', ko: '잡채기', en: 'Belt Twist', beats: 'trip' },
};
export const counterOf = (type) => Object.values(TECH).find((t) => t.beats === type).key;

export const WINDUP = 0.42;
export const LIMIT = 1.0; // |lean| past this means falling over

export function makeWrestler(side, opts = {}) {
  return {
    side,
    f: side === 0 ? 1 : -1,
    name: opts.name || (side === 0 ? 'You' : 'Rival'),
    str: opts.str ?? 1,
    speed: opts.speed ?? 1, // wind-up speed: faster wind-ups are harder to read
    lean: 0,
    stamina: 100,
    drive: 0,
    tech: null,       // { type, t }
    cooldown: 0,
    overT: 0,         // time spent past the balance limit
    stagger: 0,
  };
}

export function strength(w) {
  return w.str * (0.45 + 0.55 * Math.max(0, w.stamina) / 100);
}

// how open the defender is to each technique, 0..1
export function vulnerability(def, type) {
  const tired = (1 - def.stamina / 100) * 0.35;
  if (type === 'lift') return clamp01((def.lean - 0.2) / 0.6 + tired);
  if (type === 'trip') return clamp01((-def.lean - 0.2) / 0.6 + tired);
  return clamp01((Math.abs(def.lean) - 0.4) / 0.5 + tired + (def.stagger > 0 ? 0.45 : 0));
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// one fixed step of the standing grapple. Returns an event or null.
//   { kind: 'throw', attacker, defender, type, reversal }
//   { kind: 'blocked', attacker, defender, type }
//   { kind: 'fall', loser }   (lost balance by being pushed/pulled over)
export function step(match, dt, rng) {
  const [a, b] = match.w;
  for (const w of match.w) {
    w.cooldown = Math.max(0, w.cooldown - dt);
    w.stagger = Math.max(0, w.stagger - dt);
  }
  // techniques in their wind-up freeze pushing for the attacker
  const da = a.tech ? 0 : a.drive, db = b.tech ? 0 : b.drive;
  const sa = strength(a), sb = strength(b);
  // pair motion in world x
  const F = a.f * da * sa + b.f * db * sb;
  match.vx += F * 2.2 * dt;
  match.vx *= Math.exp(-4 * dt);
  match.x += match.vx * dt;

  // lean: your own drive tips you forward, your rival's drive tips you back
  for (const [w, o, dw, dO, sw, sO] of [[a, b, da, db, sa, sb], [b, a, db, da, sb, sa]]) {
    const ratio = sO / Math.max(0.2, sw);
    let rate = 0.32 * dw - 0.45 * dO * ratio;
    if (dw > 0 && dO < 0) rate += 0.32; // pushing into a pull: overcommit
    if (Math.abs(dw) < 0.1) rate -= w.lean * 1.4; // standing tall recovers balance
    else rate -= w.lean * 0.35;
    w.lean += rate * dt;
    w.lean = Math.max(-1.25, Math.min(1.25, w.lean));
    w.stamina += (Math.abs(dw) > 0.1 ? -7 : 9) * dt;
    if (match.suddenDeath) w.stamina -= 6 * dt;
    w.stamina = Math.max(0, Math.min(100, w.stamina));
    if (Math.abs(w.lean) > LIMIT) w.overT += dt; else w.overT = Math.max(0, w.overT - dt * 2);
  }
  for (const w of match.w) if (w.overT > 0.55) return { kind: 'fall', loser: w, dir: Math.sign(w.lean) * w.f };

  // techniques
  for (const [w, o] of [[a, b], [b, a]]) {
    if (!w.tech) continue;
    w.tech.t += dt * w.speed;
    // reversal: the defender answered with the move that beats this one
    if (o.tech && o.tech.type === counterOf(w.tech.type) && o.tech.t < w.tech.t) {
      const ev = { kind: 'throw', attacker: o, defender: w, type: o.tech.type, reversal: true };
      a.tech = b.tech = null;
      return ev;
    }
    if (w.tech.t >= WINDUP) {
      const type = w.tech.type;
      w.tech = null;
      const v = vulnerability(o, type) + (strength(w) - strength(o)) * 0.15;
      const ok = v > 0.62 || (v > 0.3 && rng() < (v - 0.3) / 0.32 * 0.7);
      if (ok) { o.tech = null; return { kind: 'throw', attacker: w, defender: o, type, reversal: false }; }
      // blocked: the attacker over-reached and is now off balance
      w.cooldown = 0.9;
      w.stamina = Math.max(0, w.stamina - 12);
      w.lean += type === 'trip' ? 0.55 : type === 'lift' ? -0.5 : (w.lean >= 0 ? 0.5 : -0.5);
      w.stagger = 0.6;
      return { kind: 'blocked', attacker: w, defender: o, type };
    }
  }
  return null;
}

export function startTech(w, type) {
  if (w.tech || w.cooldown > 0 || w.stamina < 12) return false;
  w.tech = { type, t: 0 };
  w.stamina -= 14;
  return true;
}

// rival AI: chooses pushing, attacks openings, and answers wind-ups
export function aiThink(ai, me, rival, dt, rng) {
  ai.timer = (ai.timer || 0) - dt;
  // answer a wind-up after a human-ish reaction time
  if (rival.tech && !ai.answered && rival.tech.t > ai.react) {
    ai.answered = true;
    if (rng() < ai.counter) startTech(me, counterOf(rival.tech.type));
  }
  if (!rival.tech) { ai.answered = false; ai.react = 0.12 + rng() * 0.22 * (1.4 - ai.skill); }
  if (ai.timer > 0) return;
  ai.timer = 0.12 + rng() * 0.25;
  // attack an opening
  let best = null, bestV = 0;
  for (const t of Object.keys(TECH)) {
    const v = vulnerability(rival, t) * (ai.pref[t] || 1);
    if (v > bestV) { bestV = v; best = t; }
  }
  if (bestV > 0.7 - ai.skill * 0.12 && rng() < 0.3 + ai.skill * 0.5) { startTech(me, best); return; }
  if (rng() < 0.03 * ai.aggro * (1 - ai.skill * 0.8)) { startTech(me, Object.keys(TECH)[(rng() * 3) | 0]); return; }
  // balance management
  if (me.lean < -0.45) me.drive = 1;
  else if (me.lean > 0.55) me.drive = -1;
  else if (rival.drive > 0.5 && rng() < 0.3 * ai.skill) me.drive = -1; // feint pull to make them overcommit
  else me.drive = rng() < 0.65 * ai.aggro ? 1 : rng() < 0.5 ? 0 : -1;
}
