// SKYFLICK pure game logic: run timeline, spawning, scoring, ranks, leaderboard.
// No DOM. Loaded as a classic script in the browser (window.SkyLogic) and with require() in tests.
(function (root) {
  'use strict';

  const ROUND_MS = 60_000;
  const PHASES = [
    { id: 'warmup', name: 'WARM-UP', from: 0, to: 20_000, life: [1400, 1100], radius: [46, 38], moving: 0, decoy: 0, gold: 0.04, gap: [520, 380] },
    { id: 'flick', name: 'FLICK', from: 20_000, to: 40_000, life: [1050, 850], radius: [38, 30], moving: 0.6, decoy: 0.12, gold: 0.06, gap: [420, 300] },
    { id: 'storm', name: 'STORM', from: 40_000, to: 50_000, life: [900, 720], radius: [32, 26], moving: 0.8, decoy: 0.25, gold: 0.08, gap: [360, 260] },
    { id: 'overdrive', name: 'OVERDRIVE ×2', from: 50_000, to: ROUND_MS, life: [800, 650], radius: [30, 24], moving: 0.9, decoy: 0.22, gold: 0.12, gap: [300, 220] },
  ];
  const RANKS = [
    { min: 0, name: 'DRIZZLE' },
    { min: 15_000, name: 'BREEZE' },
    { min: 35_000, name: 'GALE' },
    { min: 60_000, name: 'JETSTREAM' },
    { min: 95_000, name: 'STRATOSPHERE' },
    { min: 140_000, name: 'NINTH SKY' },
  ];

  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

  function phaseAt(ms) {
    return PHASES.find((p) => ms >= p.from && ms < p.to) ?? PHASES[PHASES.length - 1];
  }

  /** Deterministic PRNG so every booth run with the same seed is reproducible in tests. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Next target spec at run time `ms`. `rand` is a 0..1 function. Positions are normalised 0..1 inside a safe area.
   * kind: 'orb' (normal), 'gold' (bonus), 'storm' (decoy, do not hit).
   */
  function spawn(ms, rand, lastPos) {
    const p = phaseAt(ms);
    const t = (ms - p.from) / (p.to - p.from);
    const r = rand();
    const kind = r < p.decoy ? 'storm' : r < p.decoy + p.gold ? 'gold' : 'orb';
    // Flick distance: at least 0.28 of the field away from the previous target so every hit is a real flick.
    let x, y, tries = 0;
    do {
      x = 0.08 + rand() * 0.84;
      y = 0.24 + rand() * 0.62;
      tries++;
    } while (lastPos && Math.hypot(x - lastPos.x, y - lastPos.y) < 0.28 && tries < 12);
    const moving = rand() < p.moving;
    const ang = rand() * Math.PI * 2;
    const speed = moving ? lerp(0.05, 0.12, t) : 0; // field widths per second
    return {
      kind, x, y,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      life: Math.round(lerp(p.life[0], p.life[1], t) * (kind === 'gold' ? 0.8 : 1)),
      radius: Math.round(lerp(p.radius[0], p.radius[1], t) * (kind === 'gold' ? 0.85 : 1)),
      gap: Math.round(lerp(p.gap[0], p.gap[1], t)),
      phase: p.id,
    };
  }

  /** Combo multiplier: x1 at 0-4 hits, then +1 every 5 hits, max x5. */
  const multiplier = (combo) => Math.min(5, 1 + Math.floor(combo / 5));

  /**
   * Points for a hit. reactMs: time from spawn to hit. life: target lifetime.
   * Faster = more: 100 base + up to 150 speed bonus, x2 for gold, x combo, x2 in overdrive.
   */
  function hitPoints({ kind, reactMs, life, combo, phase }) {
    if (kind === 'storm') return -400;
    const speed = Math.max(0, 1 - reactMs / life);
    let pts = 100 + Math.round(150 * speed);
    if (kind === 'gold') pts *= 2;
    pts *= multiplier(combo);
    if (phase === 'overdrive') pts *= 2;
    return pts;
  }

  function newRun(seed) {
    return { seed, score: 0, combo: 0, bestCombo: 0, hits: 0, misses: 0, expired: 0, storms: 0, reacts: [], golds: 0 };
  }

  /** Apply one event to the run stats. ev: {type:'hit', kind, reactMs, life, phase} | {type:'miss'} | {type:'expire', kind} */
  function apply(run, ev) {
    if (ev.type === 'hit') {
      if (ev.kind === 'storm') { run.score = Math.max(0, run.score - 400); run.combo = 0; run.storms++; return -400; }
      const pts = hitPoints({ ...ev, combo: run.combo });
      run.score += pts; run.combo++; run.hits++;
      run.bestCombo = Math.max(run.bestCombo, run.combo);
      run.reacts.push(ev.reactMs);
      if (ev.kind === 'gold') run.golds++;
      return pts;
    }
    if (ev.type === 'miss') { run.misses++; run.combo = 0; return 0; }
    if (ev.type === 'expire') { if (ev.kind !== 'storm') { run.expired++; run.combo = 0; } return 0; }
    return 0;
  }

  function summary(run) {
    const shots = run.hits + run.misses + run.storms;
    const avg = run.reacts.length ? Math.round(run.reacts.reduce((a, b) => a + b, 0) / run.reacts.length) : null;
    const sorted = [...run.reacts].sort((a, b) => a - b);
    const best = sorted.length ? sorted[0] : null;
    return {
      score: run.score,
      accuracy: shots ? Math.round((run.hits / shots) * 100) : 0,
      avgReact: avg,
      bestReact: best,
      bestCombo: run.bestCombo,
      hits: run.hits,
      golds: run.golds,
      rank: rankFor(run.score),
    };
  }

  function rankFor(score) {
    let r = RANKS[0];
    for (const x of RANKS) if (score >= x.min) r = x;
    const i = RANKS.indexOf(r);
    const next = RANKS[i + 1] ?? null;
    return { name: r.name, index: i, next: next ? { name: next.name, need: next.min - score } : null };
  }

  // ── Leaderboard (offline, booth-local) ──────────────────────────
  const BOARD_SIZE = 10;
  const cleanTag = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, '-');

  /** Insert an entry, keep top N by score then earlier time. Returns { board, place } (place 1-based or null). */
  function insert(board, entry) {
    const e = { tag: cleanTag(entry.tag), score: Math.max(0, Math.round(entry.score)), acc: entry.acc ?? 0, react: entry.react ?? null, at: entry.at ?? Date.now(), day: entry.day };
    const all = [...board, e].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, BOARD_SIZE);
    const place = all.indexOf(e);
    return { board: all, place: place >= 0 ? place + 1 : null };
  }

  /** Would this score enter the board? */
  const qualifies = (board, score) => score > 0 && (board.length < BOARD_SIZE || score > board[board.length - 1].score);

  function parseBoard(raw) {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x) => x && typeof x.score === 'number' && typeof x.tag === 'string').slice(0, BOARD_SIZE) : [];
    } catch { return []; }
  }

  const api = { ROUND_MS, PHASES, RANKS, phaseAt, rng, spawn, multiplier, hitPoints, newRun, apply, summary, rankFor, insert, qualifies, parseBoard, cleanTag, BOARD_SIZE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SkyLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
