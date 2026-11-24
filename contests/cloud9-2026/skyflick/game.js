// SKYFLICK: booth-ready 60 s flick trainer. Canvas 2D, no build, works offline from a file:// double-click.
// States: attract → countdown → play → results → (initials) → board → attract. Every screen times out back to attract.
(function () {
  'use strict';
  const L = window.SkyLogic;
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  const params = new URLSearchParams(location.search);
  const STORE = 'skyflick.board.v1';
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('skyflick') : null;

  // ── canvas size ─────────────────────────────────────────────────
  let W = 0, H = 0, DPR = 1, U = 1; // U = 1 unit relative to a 1080p screen height
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.min(W / 1920, H / 1080) * 1.6;
    U = Math.max(0.55, Math.min(1.4, U));
  }
  window.addEventListener('resize', resize); resize();

  // ── daily seed: every player at the booth gets the same sky today ──
  const today = new Date().toISOString().slice(0, 10);
  const daySeed = params.has('seed') ? +params.get('seed') : [...today].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);

  // ── storage ─────────────────────────────────────────────────────
  const loadBoard = () => { try { return L.parseBoard(localStorage.getItem(STORE)); } catch { return []; } };
  const saveBoard = (b) => { try { localStorage.setItem(STORE, JSON.stringify(b)); } catch { /* private mode: board lives in memory */ } chan?.postMessage({ type: 'board', board: b }); };
  let board = loadBoard();

  // ── audio (synthesised, no files) ───────────────────────────────
  let ac = null, muted = params.has('mute');
  function tone(freq, dur = 0.08, type = 'sine', vol = 0.18, slide = 0) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime, o = ac.createOscillator(), v = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* audio blocked */ }
  }
  const sfx = {
    pop: (combo) => { tone(520 + Math.min(combo, 25) * 28, 0.07, 'triangle', 0.2, 240); },
    gold: () => { tone(880, 0.12, 'sine', 0.18); setTimeout(() => tone(1320, 0.18, 'sine', 0.16), 70); },
    storm: () => { tone(90, 0.35, 'sawtooth', 0.25, -40); },
    miss: () => { tone(200, 0.05, 'square', 0.05); },
    beep: (hi) => tone(hi ? 1040 : 620, 0.12, 'square', 0.12),
    end: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.16), i * 110)),
  };

  // ── background: sky + parallax clouds ───────────────────────────
  const SKIES = {
    warmup: ['#7fc8ff', '#d9f0ff'], flick: ['#3d8bf2', '#a8dcff'], storm: ['#2a3150', '#5b6687'], overdrive: ['#ff6a5c', '#ffc36b'], idle: ['#0e2552', '#3f6fb8'],
  };
  const clouds = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: 0.1 + Math.random() * 0.8, s: 0.5 + Math.random() * 1.3, z: 0.3 + (i % 3) * 0.35, seed: Math.random() * 100 }));
  let skyNow = SKIES.idle.slice();
  const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function drawCloud(x, y, s, alpha, dark) {
    g.globalAlpha = alpha;
    g.fillStyle = dark ? '#3a4160' : '#ffffff';
    const r = 38 * s * U;
    g.beginPath();
    for (const [dx, dy, k] of [[0, 0, 1], [0.9, 0.15, 0.8], [-0.9, 0.2, 0.75], [0.4, -0.45, 0.85], [-0.4, -0.35, 0.7], [1.6, 0.35, 0.55], [-1.6, 0.4, 0.5]]) {
      g.moveTo(x + dx * r + k * r, y + dy * r); g.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2);
    }
    g.fill(); g.globalAlpha = 1;
  }
  function drawSky(dt, key) {
    const target = SKIES[key] || SKIES.idle;
    skyNow = [mix(skyNow[0], target[0], Math.min(1, dt * 2.5)), mix(skyNow[1], target[1], Math.min(1, dt * 2.5))];
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, skyNow[0]); gr.addColorStop(1, skyNow[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (const c of clouds) {
      c.x += dt * 0.012 * c.z * (key === 'overdrive' ? 3 : key === 'storm' ? 2 : 1);
      if (c.x > 1.2) c.x = -0.2;
      drawCloud(c.x * W, c.y * H, c.s * (0.7 + c.z * 0.6), 0.18 + c.z * 0.35, key === 'storm');
    }
  }

  // ── particles and floating text ─────────────────────────────────
  const parts = [], floats = [];
  function burst(x, y, color, n = 18) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (120 + Math.random() * 380) * U; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, t: 0, color, r: (2 + Math.random() * 4) * U }); }
  }
  function floatText(x, y, text, color, size = 34) { floats.push({ x, y, text, color, size, t: 0 }); }
  function drawFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * U * dt; p.vx *= 0.98;
      g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt; if (f.t > 0.9) { floats.splice(i, 1); continue; }
      g.globalAlpha = 1 - f.t / 0.9; text(f.text, f.x, f.y - f.t * 70 * U, f.size, f.color, 'center', 900, true);
    }
    g.globalAlpha = 1;
  }

  function text(s, x, y, size, color = '#fff', align = 'center', weight = 800, shadow = false) {
    g.font = `${weight} ${Math.round(size * U)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    g.textAlign = align; g.textBaseline = 'middle';
    if (shadow) { g.fillStyle = 'rgba(6,16,40,0.45)'; g.fillText(s, x + 3 * U, y + 3 * U); }
    g.fillStyle = color; g.fillText(s, x, y);
  }

  // ── targets ─────────────────────────────────────────────────────
  function drawTarget(t, now) {
    const age = now - t.born, k = Math.max(0, 1 - age / t.life);
    const r = t.radius * U * (age < 90 ? age / 90 : 1);
    const x = t.x * W, y = t.y * H;
    if (t.kind === 'storm') {
      drawCloud(x, y, r / (38 * U) * 1.9, 0.97, true);
      g.fillStyle = '#ffe14d'; g.beginPath();
      g.moveTo(x + r * 0.25, y - r * 0.8); g.lineTo(x - r * 0.35, y + r * 0.15); g.lineTo(x + r * 0.02, y + r * 0.12); g.lineTo(x - r * 0.2, y + r * 0.95); g.lineTo(x + r * 0.42, y - r * 0.12); g.lineTo(x + r * 0.05, y - r * 0.1); g.closePath(); g.fill();
    } else {
      const gold = t.kind === 'gold';
      const gl = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      gl.addColorStop(0, '#ffffff'); gl.addColorStop(0.45, gold ? '#ffe27a' : '#7ff0ff'); gl.addColorStop(1, gold ? '#ff9f1c' : '#1e90ff');
      g.shadowColor = gold ? '#ffcf40' : '#7fe8ff'; g.shadowBlur = 24 * U;
      g.fillStyle = gl; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      if (gold) text('9', x, y + 2 * U, r / U * 1.05, '#7a3d00', 'center', 900);
    }
    // timer ring
    g.strokeStyle = t.kind === 'storm' ? 'rgba(255,225,77,0.7)' : 'rgba(255,255,255,0.95)'; g.lineWidth = 5 * U;
    g.beginPath(); g.arc(x, y, r + 9 * U, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.stroke();
  }

  // ── state ───────────────────────────────────────────────────────
  let state = 'attract', stateAt = performance.now(), lastInput = performance.now();
  let run = null, runStart = 0, targets = [], nextSpawn = 0, rand = null, lastPos = null, shake = 0, result = null, entry = null, place = null;
  let demo = { targets: [], next: 0, rand: L.rng(9), aim: { x: 0.5, y: 0.5 } };
  const pointer = { x: -100, y: -100, seen: false };
  const go = (s) => { state = s; stateAt = performance.now(); };

  function startRun() {
    run = L.newRun(daySeed); rand = L.rng(daySeed); targets = []; lastPos = null; nextSpawn = 0; result = null; place = null; entry = null;
    go('countdown');
  }
  function endRun(now) {
    result = L.summary(run); sfx.end();
    entry = L.qualifies(board, result.score) ? { tag: ['A', 'A', 'A'], slot: 0 } : null;
    go('results');
  }
  function commitEntry(tag) {
    const r = L.insert(board, { tag, score: result.score, acc: result.accuracy, react: result.avgReact, day: today });
    board = r.board; place = r.place; saveBoard(board); entry = null; go('board');
  }

  // ── input ───────────────────────────────────────────────────────
  const btns = []; // clickable regions drawn this frame: {x,y,w,h,fn}
  function button(label, x, y, w, h, fn, primary) {
    const hot = pointer.x > x && pointer.x < x + w && pointer.y > y && pointer.y < y + h;
    g.fillStyle = primary ? (hot ? '#ffd23f' : '#ffc107') : hot ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)';
    roundRect(x, y, w, h, 14 * U); g.fill();
    text(label, x + w / 2, y + h / 2 + 1, 30, primary ? '#3b2300' : '#fff', 'center', 900);
    btns.push({ x, y, w, h, fn });
  }
  function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function onDown(e) {
    e.preventDefault();
    const now = performance.now(); lastInput = now;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true;
    for (const b of btns) if (e.clientX > b.x && e.clientX < b.x + b.w && e.clientY > b.y && e.clientY < b.y + b.h) { b.fn(); return; }
    if (state === 'attract') { tone(1); startRun(); return; }
    if (state !== 'play') return;
    const tms = now - runStart;
    // hit test: nearest target whose ring contains the click (small grace radius for touch)
    let best = null, bd = Infinity;
    for (const t of targets) {
      const d = Math.hypot(e.clientX - t.x * W, e.clientY - t.y * H);
      if (d <= t.radius * U * 1.15 + (e.pointerType === 'touch' ? 14 : 4) && d < bd) { best = t; bd = d; }
    }
    if (!best) { L.apply(run, { type: 'miss' }); sfx.miss(); floatText(e.clientX, e.clientY, 'MISS', 'rgba(255,255,255,0.8)', 22); return; }
    targets.splice(targets.indexOf(best), 1);
    const pts = L.apply(run, { type: 'hit', kind: best.kind, reactMs: Math.round(now - best.born), life: best.life, phase: L.phaseAt(tms).id });
    const x = best.x * W, y = best.y * H;
    if (best.kind === 'storm') { sfx.storm(); shake = 0.35; burst(x, y, '#5b6687', 26); floatText(x, y, '−400 STORM', '#ffe14d', 34); }
    else {
      best.kind === 'gold' ? sfx.gold() : sfx.pop(run.combo);
      burst(x, y, best.kind === 'gold' ? '#ffcf40' : '#9ff3ff', best.kind === 'gold' ? 30 : 18);
      floatText(x, y, `+${pts}`, best.kind === 'gold' ? '#ffe27a' : '#ffffff', best.kind === 'gold' ? 44 : 34);
    }
  }
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  let resetArm = 0;
  window.addEventListener('keydown', (e) => {
    lastInput = performance.now();
    if (e.key === 'f' || e.key === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); return; }
    if (e.key === 'm' || e.key === 'M') { muted = !muted; return; }
    if (e.key === 'R' && e.shiftKey) { // operator: Shift+R twice within 2 s clears the board
      if (performance.now() - resetArm < 2000) { board = []; saveBoard(board); floatText(W / 2, H / 2, 'LEADERBOARD CLEARED', '#fff', 40); resetArm = 0; } else resetArm = performance.now();
      return;
    }
    if (e.key === 'Escape' && state !== 'attract') { go('attract'); return; }
    if (state === 'results' && entry) {
      if (/^[a-z0-9]$/i.test(e.key)) { entry.tag[entry.slot] = e.key.toUpperCase(); entry.slot = Math.min(2, entry.slot + 1); }
      else if (e.key === 'Backspace') entry.slot = Math.max(0, entry.slot - 1);
      else if (e.key === 'Enter') commitEntry(entry.tag.join(''));
    } else if ((e.key === ' ' || e.key === 'Enter') && state === 'attract') startRun();
  });
  chan && (chan.onmessage = (m) => { if (m.data?.type === 'board') board = L.parseBoard(JSON.stringify(m.data.board)); });

  // ── screens ─────────────────────────────────────────────────────
  function drawTitle(y) {
    text('SKYFLICK', W / 2, y, 120, '#ffffff', 'center', 900, true);
    text('60 SECONDS · FLICK THE ORBS · DODGE THE STORMS', W / 2, y + 80 * U, 26, 'rgba(255,255,255,0.9)', 'center', 700);
  }
  function drawBoardPanel(x, y, w, highlight, rows = L.BOARD_SIZE) {
    g.fillStyle = 'rgba(6,16,40,0.55)'; roundRect(x, y, w, 64 * U + 46 * U * rows, 18 * U); g.fill();
    text(`TODAY'S SKY · TOP ${rows}`, x + w / 2, y + 32 * U, 26, '#ffd23f', 'center', 900);
    for (let i = 0; i < rows; i++) {
      const e = board[i], yy = y + 82 * U + i * 46 * U;
      if (highlight === i + 1) { g.fillStyle = 'rgba(255,210,63,0.25)'; roundRect(x + 10 * U, yy - 21 * U, w - 20 * U, 42 * U, 10 * U); g.fill(); }
      text(String(i + 1).padStart(2, ' '), x + 40 * U, yy, 26, 'rgba(255,255,255,0.7)', 'center', 800);
      text(e ? e.tag : '---', x + 90 * U, yy, 28, '#fff', 'left', 900);
      text(e ? e.score.toLocaleString('en-US') : '', x + w - 30 * U, yy, 28, '#fff', 'right', 900);
    }
  }

  function attract(now, dt) {
    drawSky(dt, 'idle');
    // demo bot flicking at targets so the booth never looks dead
    if (now > demo.next) { const s = L.spawn(20_000, demo.rand, null); s.kind = 'orb'; s.vx = s.vy = 0; s.x = s.x < 0.5 ? 0.06 + s.x * 0.4 : 0.74 + (s.x - 0.5) * 0.4; demo.targets.push({ ...s, born: now }); demo.next = now + 650; }
    const tgt = demo.targets[0];
    if (tgt) { demo.aim.x += (tgt.x - demo.aim.x) * Math.min(1, dt * 9); demo.aim.y += (tgt.y - demo.aim.y) * Math.min(1, dt * 9); if (Math.hypot(tgt.x - demo.aim.x, tgt.y - demo.aim.y) < 0.01) { burst(tgt.x * W, tgt.y * H, '#9ff3ff', 12); demo.targets.shift(); } }
    demo.targets = demo.targets.filter((t) => now - t.born < t.life);
    for (const t of demo.targets) drawTarget(t, now);
    drawFx(dt);
    crosshair(demo.aim.x * W, demo.aim.y * H, 'rgba(255,255,255,0.6)');
    g.fillStyle = 'rgba(6,16,40,0.35)'; g.fillRect(0, 0, W, H);
    drawTitle(H * 0.2);
    const pulse = 0.75 + 0.25 * Math.sin(now / 260);
    g.globalAlpha = pulse; text(matchMedia('(pointer: coarse)').matches ? 'TAP TO PLAY' : 'CLICK TO PLAY', W / 2, H * 0.42, 54, '#ffd23f', 'center', 900, true); g.globalAlpha = 1;
    const bw = Math.min(560 * U, W * 0.9);
    drawBoardPanel(W / 2 - bw / 2, H * 0.52, bw, null, Math.max(3, Math.min(5, Math.floor((H * 0.45 - 64 * U) / (46 * U)))));
  }

  function countdown(now, dt) {
    drawSky(dt, 'warmup');
    const t = (now - stateAt) / 1000, n = 3 - Math.floor(t);
    if (n !== countdown.last) { countdown.last = n; if (n > 0) sfx.beep(false); }
    if (t >= 3) { sfx.beep(true); runStart = now; nextSpawn = now + 250; countdown.last = null; go('play'); return; }
    text(String(n), W / 2, H / 2, 260, '#ffffff', 'center', 900, true);
    text('Hit the glowing orbs fast. Gold “9” = double. Storm clouds cost 400.', W / 2, H / 2 + 170 * U, 28, '#fff', 'center', 700, true);
  }

  function play(now, dt) {
    const tms = now - runStart;
    const ph = L.phaseAt(tms);
    if (tms >= L.ROUND_MS) { for (const t of targets) L.apply(run, { type: 'expire', kind: t.kind }); targets = []; endRun(now); return; }
    drawSky(dt, ph.id);
    if (play.phase !== ph.id) { play.phase = ph.id; play.banner = now; }
    // spawn
    if (now >= nextSpawn) {
      const s = L.spawn(tms, rand, lastPos);
      targets.push({ ...s, born: now }); lastPos = s;
      nextSpawn = now + s.gap;
    }
    // move + expire
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      t.x += t.vx * dt * (H / W); t.y += t.vy * dt;
      if (t.x < 0.06 || t.x > 0.94) t.vx *= -1;
      if (t.y < 0.22 || t.y > 0.88) t.vy *= -1;
      if (now - t.born > t.life) { L.apply(run, { type: 'expire', kind: t.kind }); targets.splice(i, 1); }
    }
    g.save();
    if (shake > 0) { shake -= dt; g.translate((Math.random() - 0.5) * 24 * U * shake * 3, (Math.random() - 0.5) * 24 * U * shake * 3); }
    for (const t of targets) drawTarget(t, now);
    drawFx(dt);
    g.restore();
    // HUD
    const left = Math.max(0, L.ROUND_MS - tms);
    g.fillStyle = 'rgba(6,16,40,0.35)'; g.fillRect(0, 0, W, 10 * U);
    g.fillStyle = ph.id === 'overdrive' ? '#ffd23f' : '#ffffff'; g.fillRect(0, 0, W * (left / L.ROUND_MS), 10 * U);
    text(run.score.toLocaleString('en-US'), 40 * U, 62 * U, 56, '#fff', 'left', 900, true);
    text(`${Math.ceil(left / 1000)}s`, W - 40 * U, 62 * U, 56, left < 10_000 ? '#ffd23f' : '#fff', 'right', 900, true);
    const m = L.multiplier(run.combo);
    if (run.combo > 1) text(`COMBO ${run.combo}${m > 1 ? `  ×${m}` : ''}`, W / 2, 62 * U, 40, m >= 5 ? '#ffd23f' : '#fff', 'center', 900, true);
    if (now - play.banner < 1300) { g.globalAlpha = 1 - (now - play.banner) / 1300; text(ph.name, W / 2, H * 0.5, 110, '#ffffff', 'center', 900, true); g.globalAlpha = 1; }
    crosshair(pointer.x, pointer.y, '#ffffff');
  }

  function results(now, dt) {
    drawSky(dt, 'idle');
    drawFx(dt);
    g.fillStyle = 'rgba(6,16,40,0.45)'; g.fillRect(0, 0, W, H);
    const r = result;
    text('TIME!', W / 2, H * 0.12, 64, '#ffd23f', 'center', 900, true);
    text(r.score.toLocaleString('en-US'), W / 2, H * 0.22, 96, '#fff', 'center', 900, true);
    text(r.rank.name, W / 2, H * 0.325, 44, '#9ff3ff', 'center', 900, true);
    if (r.rank.next) text(`${r.rank.next.need.toLocaleString('en-US')} more for ${r.rank.next.name}`, W / 2, H * 0.37, 24, 'rgba(255,255,255,0.85)', 'center', 700);
    const stats = [['ACCURACY', `${r.accuracy}%`], ['AVG REACTION', r.avgReact ? `${r.avgReact} ms` : '—'], ['FASTEST', r.bestReact ? `${r.bestReact} ms` : '—'], ['BEST COMBO', String(r.bestCombo)]];
    const sw = Math.min(300 * U, W / 4.2);
    stats.forEach(([k, v], i) => { const x = W / 2 + (i - 1.5) * sw; text(v, x, H * 0.44, 34, '#fff', 'center', 900, true); text(k, x, H * 0.44 + 32 * U, 16, 'rgba(255,255,255,0.75)', 'center', 800); });
    const idle = now - lastInput;
    if (entry) {
      text('NEW HIGH SCORE! ENTER YOUR TAG', W / 2, H * 0.54, 26, '#ffd23f', 'center', 900, true);
      const bw = 96 * U, gap = 20 * U, x0 = W / 2 - (bw * 3 + gap * 2) / 2, y0 = H * 0.58;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (bw + gap);
        button('▲', x, y0, bw, 44 * U, () => { entry.slot = i; entry.tag[i] = cycle(entry.tag[i], 1); });
        g.fillStyle = i === entry.slot ? 'rgba(255,210,63,0.35)' : 'rgba(255,255,255,0.15)'; roundRect(x, y0 + 50 * U, bw, 80 * U, 14 * U); g.fill();
        text(entry.tag[i], x + bw / 2, y0 + 92 * U, 60, '#fff', 'center', 900);
        button('▼', x, y0 + 138 * U, bw, 44 * U, () => { entry.slot = i; entry.tag[i] = cycle(entry.tag[i], -1); });
      }
      button('SAVE', W / 2 - 140 * U, y0 + 198 * U, 280 * U, 64 * U, () => commitEntry(entry.tag.join('')), true);
      if (idle > 25_000) commitEntry(entry.tag.join(''));
    } else {
      button('PLAY AGAIN', W / 2 - 310 * U, H * 0.62, 290 * U, 76 * U, startRun, true);
      button('LEADERBOARD', W / 2 + 20 * U, H * 0.62, 290 * U, 76 * U, () => go('board'));
      if (idle > 15_000) go('attract');
    }
    crosshair(pointer.x, pointer.y, '#ffffff');
  }
  const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const cycle = (c, d) => CH[(CH.indexOf(c) + d + CH.length) % CH.length];

  function boardScreen(now, dt) {
    drawSky(dt, 'idle');
    g.fillStyle = 'rgba(6,16,40,0.3)'; g.fillRect(0, 0, W, H);
    const bw = Math.min(620 * U, W * 0.92);
    text(place ? `YOU PLACED #${place}` : 'LEADERBOARD', W / 2, H * 0.1, 56, '#ffd23f', 'center', 900, true);
    drawBoardPanel(W / 2 - bw / 2, H * 0.16, bw, place);
    button('PLAY AGAIN', W / 2 - 150 * U, H * 0.16 + 64 * U + 46 * U * L.BOARD_SIZE + 24 * U, 300 * U, 76 * U, startRun, true);
    if (now - lastInput > 12_000) go('attract');
    crosshair(pointer.x, pointer.y, '#ffffff');
  }

  function crosshair(x, y, color) {
    if (!pointer.seen && state !== 'attract') return;
    g.strokeStyle = color; g.lineWidth = 2.5 * U;
    const r = 14 * U;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.moveTo(x - r - 8 * U, y); g.lineTo(x - r + 5 * U, y); g.moveTo(x + r - 5 * U, y); g.lineTo(x + r + 8 * U, y);
    g.moveTo(x, y - r - 8 * U); g.lineTo(x, y - r + 5 * U); g.moveTo(x, y + r - 5 * U); g.lineTo(x, y + r + 8 * U);
    g.stroke();
  }

  // ── loop ────────────────────────────────────────────────────────
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    btns.length = 0;
    g.clearRect(0, 0, W, H);
    if (state === 'attract') attract(now, dt);
    else if (state === 'countdown') countdown(now, dt);
    else if (state === 'play') play(now, dt);
    else if (state === 'results') results(now, dt);
    else boardScreen(now, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test hook for automated booth checks (headless): exposes read-only state.
  window.__sky = { get state() { return state; }, get run() { return run; }, get targets() { return targets; }, get board() { return board; }, daySeed };
})();
