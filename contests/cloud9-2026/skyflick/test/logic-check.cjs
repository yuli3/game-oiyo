const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

test('phases cover the full 60 s round in order', () => {
  assert.equal(L.phaseAt(0).id, 'warmup');
  assert.equal(L.phaseAt(25_000).id, 'flick');
  assert.equal(L.phaseAt(45_000).id, 'storm');
  assert.equal(L.phaseAt(59_999).id, 'overdrive');
  for (let i = 1; i < L.PHASES.length; i++) assert.equal(L.PHASES[i].from, L.PHASES[i - 1].to);
  assert.equal(L.PHASES.at(-1).to, L.ROUND_MS);
});

test('spawns stay inside the field, warm-up has no decoys, later phases get harder', () => {
  const r = L.rng(42);
  let last = null;
  const warm = [], late = [];
  for (let ms = 0; ms < 60_000; ms += 300) {
    const s = L.spawn(ms, r, last);
    assert.ok(s.x >= 0.08 && s.x <= 0.92 && s.y >= 0.24 && s.y <= 0.86);
    (ms < 20_000 ? warm : ms >= 50_000 ? late : []).push(s);
    last = s;
  }
  assert.ok(warm.every((s) => s.kind !== 'storm' && s.vx === 0));
  const avg = (a, k) => a.reduce((x, s) => x + s[k], 0) / a.length;
  assert.ok(avg(late, 'radius') < avg(warm, 'radius'));
  assert.ok(avg(late, 'life') < avg(warm, 'life'));
  assert.ok(late.some((s) => s.kind === 'storm'));
});

test('consecutive targets are a real flick apart most of the time', () => {
  const r = L.rng(7);
  let last = null, far = 0, n = 0;
  for (let ms = 0; ms < 60_000; ms += 400) { const s = L.spawn(ms, r, last); if (last) { n++; if (Math.hypot(s.x - last.x, s.y - last.y) >= 0.28) far++; } last = s; }
  assert.ok(far / n > 0.95);
});

test('scoring: faster is worth more, combo and overdrive multiply, storm costs', () => {
  const slow = L.hitPoints({ kind: 'orb', reactMs: 1000, life: 1000, combo: 0, phase: 'warmup' });
  const fast = L.hitPoints({ kind: 'orb', reactMs: 200, life: 1000, combo: 0, phase: 'warmup' });
  assert.equal(slow, 100);
  assert.equal(fast, 220);
  assert.equal(L.hitPoints({ kind: 'orb', reactMs: 1000, life: 1000, combo: 10, phase: 'warmup' }), 300);
  assert.equal(L.hitPoints({ kind: 'gold', reactMs: 1000, life: 1000, combo: 0, phase: 'overdrive' }), 400);
  assert.equal(L.multiplier(100), 5);
  const run = L.newRun(1);
  L.apply(run, { type: 'hit', kind: 'orb', reactMs: 300, life: 1000, phase: 'warmup' });
  L.apply(run, { type: 'hit', kind: 'storm' });
  assert.equal(run.combo, 0);
  assert.equal(run.score, 0, 'score never goes below zero');
});

test('summary and rank', () => {
  const run = L.newRun(1);
  for (let i = 0; i < 30; i++) L.apply(run, { type: 'hit', kind: 'orb', reactMs: 400, life: 1000, phase: 'flick' });
  L.apply(run, { type: 'miss' });
  const s = L.summary(run);
  assert.equal(s.hits, 30);
  assert.equal(s.accuracy, 97);
  assert.equal(s.avgReact, 400);
  assert.equal(s.bestCombo, 30);
  assert.equal(s.score, 19_000);
  assert.equal(s.rank.name, "BREEZE");
  assert.equal(L.rankFor(0).name, 'DRIZZLE');
  assert.equal(L.rankFor(140_000).name, 'NINTH SKY');
  assert.equal(L.rankFor(140_000).next, null);
  assert.equal(L.rankFor(5_000).next.need, 10_000);
});

test('leaderboard keeps top 10, ties go to the earlier run, tags sanitised', () => {
  let b = [];
  for (let i = 0; i < 12; i++) b = L.insert(b, { tag: `p${i}`, score: i * 100, at: i }).board;
  assert.equal(b.length, 10);
  assert.equal(b[0].score, 1100);
  assert.equal(b.at(-1).score, 200);
  assert.ok(!L.qualifies(b, 150));
  assert.ok(L.qualifies(b, 250));
  const r = L.insert(b, { tag: 'zz!', score: 1100, at: 99 });
  assert.equal(r.place, 2);
  assert.equal(r.board[1].tag, 'ZZ-');
  assert.deepEqual(L.parseBoard('not json'), []);
  assert.equal(L.parseBoard(JSON.stringify(b)).length, 10);
});
