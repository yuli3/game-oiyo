import * as THREE from 'three';
import { makeRng, clamp, damp } from './rng.js';
import { generateLevel, buildLevelMeshes, cellToWorld, worldToCell, isBlocked, makeStoneLantern, makeGate, CELL, OPEN } from './level.js';
import { InkPipeline } from './post.js';
import { Audio } from './audio.js';
import { TALISMANS, applyTalismans, offerTalismans } from './talismans.js';
import { makePlayer, makeWisp, makeBrute, makeShade, makeFox, makeNightKing, makeSeed, makeInkOrb, makeMote, makeFirefly, makeRing, makePointer, Particles } from './models.js';

const FINAL_STAGE = 12;
const CAM_Y = 27, CAM_Z = 15;
const $ = (id) => document.getElementById(id);

// ---------- renderer / scene ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const pipeline = new InkPipeline(renderer);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141c);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 120);
const hemi = new THREE.HemisphereLight(0xffffff, 0x7a7468, 1.5);
const moon = new THREE.DirectionalLight(0xffffff, 1.8);
moon.position.set(-12, 30, -8);
scene.add(hemi, moon);
const lanternLight = new THREE.PointLight(0xfff0dc, 10, 14, 1.4);
scene.add(lanternLight);

let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  pipeline.setSize(Math.floor(w * pixelRatio), Math.floor(h * pixelRatio));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const audio = new Audio();
const embers = new Particles(scene, 700, 0xffa040, 0.22, true);
const inkDrops = new Particles(scene, 500, 0x0f0d0b, 0.26, false);
const sparks = new Particles(scene, 300, 0xd6ff6a, 0.16, true);

// ---------- input ----------
const keys = new Set();
const mouse = { x: 0, y: 0, down: false, world: new THREE.Vector3() };
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyM') { const m = audio.toggleMute(); flashBanner(m ? 'Sound off' : 'Sound on', '', 900); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && (state === 'play' || state === 'pause')) togglePause();
  if (state === 'talisman' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    const n = Number(e.code.slice(-1)) - 1;
    if (currentOffer[n]) chooseTalisman(currentOffer[n]);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouse.down = true; if (e.button === 2) dashRequest = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('blur', () => { keys.clear(); mouse.down = false; if (state === 'play') togglePause(); });
let dashRequest = false;

const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
function updateMouseWorld() {
  const ndc = new THREE.Vector2((mouse.x / window.innerWidth) * 2 - 1, -(mouse.y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(aimPlane, mouse.world);
}

// ---------- state ----------
let state = 'title';
let run = null;
let level = null;
let levelGroup = null;
let lanterns = [];
let gate = null;
let enemies = [];
let seeds = [];
let orbs = [];
let motes = [];
let fireflies = [];
let fires = [];
let bolts = [];
let telegraphs = [];
let boss = null;
let flow = null;
let flowCell = -1;
let stageTime = 0;
let spawnTimer = 0;
let dawn = 0;
let hurt = 0;
let shake = 0;
let hitStop = 0;
let currentOffer = [];
let titleT = 0;
const burstFx = []; // {x,z,r,t,life}

const player = {
  mesh: makePlayer(),
  x: 0, z: 0, vx: 0, vz: 0,
  light: 100, invuln: 0, dashT: 0, dashCd: 0, fireCd: 0,
  dirX: 0, dirZ: 1, trailAcc: 0,
};
scene.add(player.mesh);
const pointer = makePointer();
scene.add(pointer);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hashString(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function newRun(daily = false) {
  const day = daily ? todayKey() : null;
  const seed = daily ? hashString(`inklight-${day}`) : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  run = { seed, daily: day, stage: 1, score: 0, kills: 0, levels: {}, stats: applyTalismans({}), time: 0, lanternsLit: 0, paintedSum: 0, rng: makeRng(seed ^ 0x9e3779b9) };
  tipsShown.clear();
}

// ---------- first-night tips ----------
const tipsShown = new Set();
let tipTimer = 0;
function tip(id, text, ms = 4200) {
  if (tipsShown.has(id) || !run || run.stage > 2) return;
  tipsShown.add(id);
  const el = $('tip');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function clearStage() {
  if (levelGroup) { scene.remove(levelGroup); disposeGroup(levelGroup); }
  for (const l of lanterns) { scene.remove(l.mesh); scene.remove(l.ring); }
  if (gate) scene.remove(gate.mesh);
  for (const e of enemies) scene.remove(e.mesh);
  for (const s of seeds) scene.remove(s.mesh);
  for (const o of orbs) scene.remove(o.mesh);
  for (const m of motes) scene.remove(m.mesh);
  for (const f of fires) scene.remove(f.mesh);
  for (const b of bolts) scene.remove(b.line);
  for (const t of telegraphs) scene.remove(t.mesh);
  for (const f of fireflies) scene.remove(f.mesh);
  if (boss) scene.remove(boss.mesh);
  enemies = []; seeds = []; orbs = []; motes = []; fires = []; bolts = []; telegraphs = []; fireflies = []; lanterns = []; gate = null; boss = null;
  burstFx.length = 0;
  embers.clear(); inkDrops.clear(); sparks.clear();
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); }
  });
}

function startStage(stage) {
  clearStage();
  level = generateLevel(stage, run ? run.seed : 1);
  levelGroup = buildLevelMeshes(level);
  scene.add(levelGroup);
  const size = level.N * CELL;
  pipeline.resetPaint({ x: -size / 2, z: -size / 2 }, size, (x, z) => { const c = worldToCell(level, x, z); return !isBlocked(level, c.i, c.j); });
  const p = cellToWorld(level, level.start.i, level.start.j);
  player.x = p.x; player.z = p.z; player.vx = player.vz = 0;
  player.invuln = 1.5; player.dashT = 0; player.dashCd = 0; player.fireCd = 0.3;
  if (run) player.light = Math.max(player.light, run.stats.maxLight * 0.75);
  for (const L of level.lanterns) {
    const w = cellToWorld(level, L.i, L.j);
    const mesh = makeStoneLantern(level.district);
    mesh.position.set(w.x, 0, w.z);
    const ring = makeRing(); ring.position.set(w.x, 0.06, w.z); ring.scale.setScalar(2.2); ring.material.opacity = 0;
    scene.add(mesh, ring);
    lanterns.push({ mesh, ring, x: w.x, z: w.z, lit: false, progress: 0 });
  }
  if (level.gate) {
    const g = level.gate;
    const w = cellToWorld(level, g.i, g.j);
    const mesh = makeGate(level.district);
    mesh.position.set(w.x, 0, w.z);
    mesh.rotation.y = (g.dir === 'n' || g.dir === 's') ? 0 : Math.PI / 2;
    scene.add(mesh);
    gate = { mesh, x: w.x, z: w.z, open: false, t: 0 };
  }
  // starting plaza is lit: a little hope at the start of every night
  pipeline.paint(player.x, player.z, 4.5, 1);
  if (level.boss) spawnBoss(stage);
  syncFireflies();
  flowCell = -1;
  stageTime = 0;
  spawnTimer = 2.5;
  dawn = 0;
  const d = level.district;
  scene.background.set(0x10141c);
  updateHudStatic();
  if (state === 'play' && stage === 1) setTimeout(() => tip('move', 'WASD to walk · hold the mouse button to throw flame seeds'), 2800);
  if (state === 'play' && level.boss && stage === 4) setTimeout(() => tip('boss', 'Its ink armor only breaks inside the glow of a lit stone lantern', 6000), 3200);
  if (state === 'play') {
    flashBanner(level.boss ? bossTitle(stage) : `Night ${stage}`, level.boss ? 'Lure it into the light of the stone lanterns' : `${d.name} · ${d.ko}`, 2600);
  }
}

function bossTitle(stage) {
  return stage === 4 ? 'The Great Dokkaebi' : stage === 8 ? 'The Nine-Tailed Fox' : 'The King of the Long Night';
}

// ---------- collision ----------
function collides(x, z, r) {
  const c = worldToCell(level, x, z);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const i = c.i + di, j = c.j + dj;
    if (!isBlocked(level, i, j)) continue;
    const w = cellToWorld(level, i, j);
    const h = CELL / 2;
    const px = clamp(x, w.x - h, w.x + h), pz = clamp(z, w.z - h, w.z + h);
    if ((x - px) ** 2 + (z - pz) ** 2 < r * r) return true;
  }
  for (const l of lanterns) if ((x - l.x) ** 2 + (z - l.z) ** 2 < (r + 0.55) ** 2) return true;
  return false;
}
function moveCircle(ent, dx, dz, r) {
  let hit = false;
  if (!collides(ent.x + dx, ent.z, r)) ent.x += dx; else hit = true;
  if (!collides(ent.x, ent.z + dz, r)) ent.z += dz; else hit = true;
  return hit;
}
function lineBlocked(x0, z0, x1, z1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.8);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const c = worldToCell(level, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
    if (isBlocked(level, c.i, c.j)) return true;
  }
  return false;
}

// ---------- flow field toward the player ----------
function updateFlow() {
  const c = worldToCell(level, player.x, player.z);
  const id = level.idx(c.i, c.j);
  if (id === flowCell && flow) return;
  flowCell = id;
  const N = level.N;
  flow = new Int16Array(N * N).fill(-1);
  const q = new Int32Array(N * N); let qh = 0, qt = 0;
  if (isBlocked(level, c.i, c.j)) return;
  flow[id] = 0; q[qt++] = id;
  while (qh < qt) {
    const cur = q[qh++]; const ci = cur % N, cj = (cur / N) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (isBlocked(level, ni, nj)) continue;
      const nid = nj * N + ni;
      if (flow[nid] >= 0) continue;
      flow[nid] = flow[cur] + 1; q[qt++] = nid;
    }
  }
}
function flowDir(ent) {
  const c = worldToCell(level, ent.x, ent.z);
  const N = level.N;
  let best = null, bestV = flow ? flow[level.idx(c.i, c.j)] : -1;
  if (bestV < 0) return null;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = c.i + di, nj = c.j + dj;
    if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
    const v = flow[nj * N + ni];
    if (v >= 0 && v < bestV) { bestV = v; best = [ni, nj]; }
  }
  if (!best) return null;
  const w = cellToWorld(level, best[0], best[1]);
  return { x: w.x - ent.x, z: w.z - ent.z };
}

// ---------- enemies ----------
const ENEMY = {
  wisp: { hp: 22, speed: 4.3, r: 0.45, dmg: 7, score: 10, make: () => makeWisp() },
  brute: { hp: 75, speed: 2.5, r: 0.75, dmg: 15, score: 30, make: () => makeBrute() },
  elite: { hp: 170, speed: 2.8, r: 0.95, dmg: 20, score: 70, make: () => makeBrute(0x2f5fb3, 1.3) },
  shade: { hp: 32, speed: 3.1, r: 0.5, dmg: 4, drain: 12, score: 15, make: () => makeShade() },
  fox: { hp: 38, speed: 3.6, r: 0.55, dmg: 6, score: 25, ranged: true, make: () => makeFox(1, 3) },
};

function spawnEnemy(type, x, z) {
  const def = ENEMY[type];
  const scale = 1 + (run.stage - 1) * 0.09;
  const mesh = def.make();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const e = { type, def, mesh, x, z, vx: 0, vz: 0, hp: def.hp * scale, maxHp: def.hp * scale, hitCd: 0, flash: 0, t: Math.random() * 10, state: 'move', stateT: 0, shootCd: 1.5 + Math.random() * 1.5, rise: 0.6 };
  enemies.push(e);
  inkDrops.emit(x, 0.4, z, 14, 2.5, 2.5, 0.6);
  return e;
}

function pickSpawnCell(minD, maxD, preferDark) {
  for (let tries = 0; tries < 40; tries++) {
    const [i, j] = level.reachable[(Math.random() * level.reachable.length) | 0];
    const w = cellToWorld(level, i, j);
    const d = Math.hypot(w.x - player.x, w.z - player.z);
    if (d < minD || d > maxD) continue;
    if (preferDark && pipeline.paintedAt(w.x, w.z) > 0.5) continue;
    return { x: w.x + (Math.random() - 0.5) * 1.2, z: w.z + (Math.random() - 0.5) * 1.2 };
  }
  return null;
}

function enemyTypeForStage(stage) {
  const r = Math.random();
  if (stage >= 6 && r < 0.06 + stage * 0.006) return 'elite';
  if (stage >= 3 && r < 0.3) return 'fox';
  if (stage >= 2 && r < 0.48) return 'shade';
  if (r < 0.7) return 'wisp';
  return 'brute';
}

function directorUpdate(dt) {
  if (level.boss) return;
  const allLit = lanterns.every((l) => l.lit);
  const maxAlive = 7 + run.stage * 2 + (allLit ? 6 : 0);
  spawnTimer -= dt;
  if (spawnTimer <= 0 && enemies.length < maxAlive) {
    spawnTimer = Math.max(0.45, 2.3 - run.stage * 0.13 - stageTime * 0.004) * (allLit ? 0.6 : 1);
    const type = enemyTypeForStage(run.stage);
    const p = pickSpawnCell(11, 26, type === 'shade');
    if (p) spawnEnemy(type, p.x, p.z);
  }
}

function damageEnemy(e, amount, kx = 0, kz = 0) {
  if (e.hp <= 0) return;
  e.hp -= amount;
  e.flash = 0.12;
  e.vx += kx; e.vz += kz;
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  run.kills++;
  run.score += Math.round(e.def.score * (1 + run.stage * 0.25));
  audio.kill();
  inkDrops.emit(e.x, 0.8, e.z, 26, 4.5, 3, 0.9);
  embers.emit(e.x, 0.8, e.z, 10, 3, 3, 0.6);
  pipeline.paint(e.x, e.z, 1.6, 1);
  const n = e.type === 'elite' ? 4 : e.type === 'brute' ? 2 : 1;
  for (let k = 0; k < n; k++) spawnMote(e.x + (Math.random() - 0.5), e.z + (Math.random() - 0.5));
  if (run.stats.hunger) gainLight(run.stats.hunger);
  hitStop = Math.max(hitStop, e.type === 'elite' ? 0.06 : 0.02);
}

function spawnMote(x, z) {
  const mesh = makeMote(); mesh.position.set(x, 0.5, z); scene.add(mesh);
  motes.push({ mesh, x, z, t: 0 });
}

function gainLight(v) { player.light = Math.min(run.stats.maxLight, player.light + v); }

function hurtPlayer(amount, fromX, fromZ) {
  if (player.invuln > 0 || player.dashT > 0 || state !== 'play') return;
  const dmg = amount * (1 - run.stats.ward);
  player.light -= dmg;
  player.invuln = 0.55;
  hurt = 1; shake = Math.max(shake, 0.35);
  audio.hurt();
  const dx = player.x - fromX, dz = player.z - fromZ, d = Math.hypot(dx, dz) || 1;
  player.vx += dx / d * 9; player.vz += dz / d * 9;
  inkDrops.emit(player.x, 1, player.z, 12, 3, 2, 0.5);
  if (player.light <= 0) gameOver(false);
}

function updateEnemies(dt) {
  const lightR = lightRadius();
  for (const e of enemies) {
    e.t += dt; e.hitCd -= dt; e.flash -= dt;
    if (e.rise > 0) { e.rise -= dt; e.mesh.position.set(e.x, -e.rise * 2, e.z); continue; }
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 0.001;
    let speed = e.def.speed;
    if (run.stats.bind && dist < lightR) speed *= 1 - run.stats.bind;
    const painted = pipeline.paintedAt(e.x, e.z);
    if (e.type === 'shade' && painted > 0.5) { damageEnemy(e, 14 * dt); speed *= 0.6; }
    if (e.hp <= 0) continue;
    let mx = 0, mz = 0;
    if (e.type === 'brute' || e.type === 'elite') {
      if (e.state === 'move') {
        e.stateT -= dt;
        if (dist < 7 && e.stateT <= 0 && !lineBlocked(e.x, e.z, player.x, player.z)) { e.state = 'windup'; e.stateT = 0.65; e.cx = dx / dist; e.cz = dz / dist; }
      } else if (e.state === 'windup') {
        e.stateT -= dt; speed = 0;
        e.mesh.userData.club.rotation.x = -1.2 * (1 - e.stateT / 0.65);
        if (e.stateT <= 0) { e.state = 'charge'; e.stateT = 0.55; }
      } else if (e.state === 'charge') {
        e.stateT -= dt;
        const hit = moveCircle(e, e.cx * 12 * dt, e.cz * 12 * dt, e.def.r);
        e.mesh.userData.club.rotation.x = 0.8;
        if (e.stateT <= 0 || hit) { e.state = 'move'; e.stateT = 1.6; if (hit) { shake = Math.max(shake, 0.15); inkDrops.emit(e.x, 0.5, e.z, 10, 3, 2, 0.5); } }
        speed = 0;
      }
    }
    if (e.def.ranged) {
      e.shootCd -= dt;
      const want = 7.5;
      if (dist < want - 1.5 && !lineBlocked(e.x, e.z, player.x, player.z)) { mx = -dx / dist; mz = -dz / dist; }
      if (e.shootCd <= 0 && dist < 13 && !lineBlocked(e.x, e.z, player.x, player.z)) {
        e.shootCd = 2.4 - Math.min(0.9, run.stage * 0.06);
        fireOrb(e.x, e.z, dx / dist, dz / dist, 8.5, 8);
      }
    }
    if (speed > 0 && mx === 0 && mz === 0) {
      if (dist < CELL * 1.2 || !lineBlocked(e.x, e.z, player.x, player.z) && dist < 9) { mx = dx / dist; mz = dz / dist; }
      else {
        const f = flowDir(e);
        if (f) { const fl = Math.hypot(f.x, f.z) || 1; mx = f.x / fl; mz = f.z / fl; }
      }
      if (e.def.ranged && dist < 8 && dist > 5.5) { mx = -dz / dist * 0.8; mz = dx / dist * 0.8; } // circle-strafe
    }
    // separation
    for (const o of enemies) {
      if (o === e) continue;
      const ox = e.x - o.x, oz = e.z - o.z, od = ox * ox + oz * oz, rr = (e.def.r + o.def.r) * 1.1;
      if (od < rr * rr && od > 0.0001) { const k = 1 / Math.sqrt(od); mx += ox * k * 0.6; mz += oz * k * 0.6; }
    }
    e.vx = damp(e.vx, 0, 6, dt); e.vz = damp(e.vz, 0, 6, dt);
    moveCircle(e, (mx * speed + e.vx) * dt, (mz * speed + e.vz) * dt, e.def.r);
    // contact damage
    if (dist < e.def.r + 0.45 && e.hitCd <= 0) {
      e.hitCd = 0.9;
      hurtPlayer(e.state === 'charge' ? e.def.dmg * 1.5 : e.def.dmg, e.x, e.z);
      if (e.def.drain) { player.light -= e.def.drain * (1 - run.stats.ward) * 0.5; pipeline.erase(player.x, player.z, 2, 0.6); }
    }
    // visuals
    e.mesh.position.set(e.x, e.type === 'wisp' ? Math.sin(e.t * 4) * 0.15 : 0, e.z);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (e.type === 'shade') e.mesh.userData.body.scale.y = 1 + Math.sin(e.t * 6) * 0.06;
    if (e.type === 'fox') e.mesh.userData.tails.rotation.y = Math.sin(e.t * 3) * 0.3;
    const s = e.flash > 0 ? 1.15 : 1;
    e.mesh.scale.setScalar((e.type === 'elite' ? 1.3 : 1) * s);
  }
  enemies = enemies.filter((e) => { if (e.hp <= 0) { scene.remove(e.mesh); return false; } return true; });
}

// ---------- projectiles ----------
function fireOrb(x, z, dx, dz, speed, dmg, size = 1) {
  const mesh = makeInkOrb(); mesh.scale.setScalar(size); mesh.position.set(x, 1, z); scene.add(mesh);
  orbs.push({ mesh, x, z, vx: dx * speed, vz: dz * speed, dmg, life: 4, r: 0.35 * size });
}

function throwSeeds() {
  const st = run.stats;
  const ax = mouse.world.x - player.x, az = mouse.world.z - player.z;
  const base = Math.atan2(ax, az);
  const dist = clamp(Math.hypot(ax, az), 2, 14);
  const n = st.seeds;
  for (let k = 0; k < n; k++) {
    const a = base + (k - (n - 1) / 2) * 0.2;
    const mesh = makeSeed();
    const sx = player.x + Math.sin(a) * 0.6, sz = player.z + Math.cos(a) * 0.6;
    mesh.position.set(sx, 1.4, sz);
    scene.add(mesh);
    const speed = 19;
    seeds.push({ mesh, x: sx, z: sz, vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, travel: 0, max: dist, pierce: st.pierce, hit: new Set() });
  }
  player.light -= 1.2;
  player.fireCd = st.fireDelay;
  audio.throw();
}

function burst(x, z, radiusMul = 1, dmgMul = 1) {
  const st = run.stats;
  const r = st.burstRadius * radiusMul;
  const dmg = st.damage * dmgMul;
  audio.burst();
  embers.emit(x, 0.6, z, 26, 5 * radiusMul, 3.5, 0.7);
  pipeline.paint(x, z, r * 0.95, 1);
  burstFx.push({ x, z, r: r * 1.6, t: 0, life: 0.5 });
  shake = Math.max(shake, 0.12);
  const hitList = [];
  for (const e of enemies) {
    if (e.rise > 0) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < r + e.def.r) {
      const fall = d < r * 0.5 ? 1 : 0.65;
      const k = 6 / (d + 0.5);
      damageEnemy(e, dmg * fall, (e.x - x) * k, (e.z - z) * k);
      hitList.push(e);
    }
  }
  if (boss) {
    const d = Math.hypot(boss.x - x, boss.z - z);
    if (d < r + boss.r) damageBoss(dmg);
  }
  if (st.thunder) {
    const targets = enemies.filter((e) => e.hp > 0 && !hitList.includes(e) && Math.hypot(e.x - x, e.z - z) < 7).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, st.thunder + 1);
    for (const t of targets) { damageEnemy(t, dmg * 0.6); addBolt(x, z, t.x, t.z); }
  }
}

function addBolt(x0, z0, x1, z1) {
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 0.9;
    pts.push(new THREE.Vector3(x0 + (x1 - x0) * t + j, 1 + Math.random() * 0.4, z0 + (z1 - z0) * t - j));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd24a }));
  scene.add(line);
  bolts.push({ line, t: 0.18 });
  sparks.emit(x1, 1, z1, 8, 3, 2, 0.4);
}

function updateProjectiles(dt) {
  for (const s of seeds) {
    const step = Math.hypot(s.vx, s.vz) * dt;
    s.x += s.vx * dt; s.z += s.vz * dt; s.travel += step;
    s.mesh.position.set(s.x, 1.4 - (s.travel / s.max) * 0.9, s.z);
    embers.emit(s.x, s.mesh.position.y, s.z, 1, 0.6, 0.5, 0.35);
    let done = s.travel >= s.max;
    const c = worldToCell(level, s.x, s.z);
    if (isBlocked(level, c.i, c.j)) { s.x -= s.vx * dt; s.z -= s.vz * dt; done = true; }
    for (const e of enemies) {
      if (done || e.rise > 0 || s.hit.has(e)) continue;
      if (Math.hypot(e.x - s.x, e.z - s.z) < e.def.r + 0.3) {
        if (s.pierce > 0) { s.pierce--; s.hit.add(e); damageEnemy(e, run.stats.damage * 0.5); embers.emit(e.x, 1, e.z, 6, 2, 1, 0.3); }
        else done = true;
      }
    }
    if (!done && boss && Math.hypot(boss.x - s.x, boss.z - s.z) < boss.r + 0.3) done = true;
    if (done) { s.dead = true; burst(s.x, s.z); scene.remove(s.mesh); }
  }
  seeds = seeds.filter((s) => !s.dead);

  for (const o of orbs) {
    o.x += o.vx * dt; o.z += o.vz * dt; o.life -= dt;
    o.mesh.position.set(o.x, 1, o.z);
    const c = worldToCell(level, o.x, o.z);
    if (isBlocked(level, c.i, c.j) || o.life <= 0) { o.dead = true; inkDrops.emit(o.x, 1, o.z, 8, 2, 1, 0.4); }
    else if (Math.hypot(player.x - o.x, player.z - o.z) < o.r + 0.4) { o.dead = true; hurtPlayer(o.dmg, o.x, o.z); pipeline.erase(o.x, o.z, 1.6, 0.8); }
    // flame seeds can burn ink orbs out of the air
    else if (burstFx.some((b) => b.t < 0.15 && Math.hypot(b.x - o.x, b.z - o.z) < b.r * 0.6)) { o.dead = true; embers.emit(o.x, 1, o.z, 6, 2, 1, 0.4); }
    if (o.dead) scene.remove(o.mesh);
  }
  orbs = orbs.filter((o) => !o.dead);

  for (const m of motes) {
    m.t += dt;
    const dx = player.x - m.x, dz = player.z - m.z, d = Math.hypot(dx, dz);
    if (d < 4) { const k = (14 / Math.max(d, 0.3)) * dt; m.x += dx * Math.min(1, k * 0.4); m.z += dz * Math.min(1, k * 0.4); }
    m.mesh.position.set(m.x, 0.6 + Math.sin(m.t * 5) * 0.15, m.z);
    m.mesh.rotation.y += dt * 3;
    if (d < 0.7) { m.dead = true; gainLight(3.5); audio.pickup(); sparks.emit(m.x, 0.8, m.z, 5, 1.5, 1.5, 0.3); }
    if (m.t > 14) m.dead = true;
    if (m.dead) scene.remove(m.mesh);
  }
  motes = motes.filter((m) => !m.dead);

  for (const f of fires) {
    f.t -= dt;
    f.mesh.scale.setScalar(Math.max(0.01, f.t / 2.5));
    if (Math.random() < 0.3) embers.emit(f.x, 0.2, f.z, 1, 0.5, 2, 0.5);
    for (const e of enemies) if (Math.hypot(e.x - f.x, e.z - f.z) < 1 + e.def.r) damageEnemy(e, 28 * dt);
    if (boss && Math.hypot(boss.x - f.x, boss.z - f.z) < 1 + boss.r) damageBoss(18 * dt);
    if (f.t <= 0) { scene.remove(f.mesh); f.dead = true; }
  }
  fires = fires.filter((f) => !f.dead);

  for (const b of bolts) { b.t -= dt; if (b.t <= 0) { scene.remove(b.line); b.line.geometry.dispose(); b.dead = true; } }
  bolts = bolts.filter((b) => !b.dead);

  for (const b of burstFx) b.t += dt;
  while (burstFx.length && burstFx[0].t > burstFx[0].life) burstFx.shift();
}

function syncFireflies() {
  const want = run ? run.stats.fireflies : 0;
  while (fireflies.length < want) { const mesh = makeFirefly(); scene.add(mesh); fireflies.push({ mesh, a: fireflies.length * 2, x: 0, z: 0 }); }
}

function updateFireflies(dt) {
  const n = fireflies.length;
  fireflies.forEach((f, i) => {
    const a = stageTime * 2.6 + (i / n) * Math.PI * 2;
    f.x = player.x + Math.cos(a) * 2.3; f.z = player.z + Math.sin(a) * 2.3;
    f.mesh.position.set(f.x, 1.2 + Math.sin(stageTime * 5 + i) * 0.2, f.z);
    if (Math.random() < 0.4) sparks.emit(f.x, 1.2, f.z, 1, 0.2, 0.2, 0.3);
    for (const e of enemies) if (Math.hypot(e.x - f.x, e.z - f.z) < e.def.r + 0.45) damageEnemy(e, 34 * dt);
    if (boss && Math.hypot(boss.x - f.x, boss.z - f.z) < boss.r + 0.45) damageBoss(20 * dt);
  });
}

// ---------- boss ----------
function spawnBoss(stage) {
  const c = cellToWorld(level, (level.N - 1) / 2, 5);
  let mesh, hp, r;
  if (stage === 4) { mesh = makeBrute(0xb8322a, 2.3); hp = 1150; r = 1.6; }
  else if (stage === 8) { mesh = makeFox(2.1, 9); hp = 1500; r = 1.4; }
  else { mesh = makeNightKing(); hp = 2400; r = 1.7; }
  const armorMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0b0a09, transparent: true, opacity: 0.32, depthWrite: false }));
  armorMesh.position.y = r * 1.2;
  mesh.add(armorMesh);
  mesh.position.set(c.x, 0, c.z);
  scene.add(mesh);
  boss = { stage, mesh, armorMesh, x: c.x, z: c.z, hp, maxHp: hp, r, t: 0, state: 'intro', stateT: 2, slamCd: 3, chargeCd: 5, summonCd: 8, volleyCd: 2.5, teleCd: 7, ringCd: 4, vx: 0, vz: 0, armored: true, flash: 0 };
  $('bossBar').classList.remove('hidden');
  $('bossName').textContent = bossTitle(stage);
  audio.roar();
}

function damageBoss(amount) {
  if (!boss || boss.hp <= 0 || boss.state === 'intro') return;
  const mult = boss.armored ? 0.12 : 1;
  boss.hp -= amount * mult;
  boss.flash = 0.1;
  if (boss.armored && Math.random() < 0.3) inkDrops.emit(boss.x, boss.r * 1.5, boss.z, 3, 2, 1, 0.3);
  if (boss.hp <= 0) {
    run.score += 1500 * (boss.stage / 4);
    inkDrops.emit(boss.x, 2, boss.z, 120, 9, 6, 1.4);
    embers.emit(boss.x, 2, boss.z, 120, 9, 6, 1.4);
    audio.roar(); shake = 1; hitStop = 0.25;
    for (const e of enemies) { e.hp = 0; inkDrops.emit(e.x, 0.8, e.z, 12, 3, 2, 0.6); }
    scene.remove(boss.mesh);
    boss = null;
    $('bossBar').classList.add('hidden');
    setTimeout(() => stageCleared(), 900);
  }
}

function telegraph(x, z, radius, delay, onFire) {
  const mesh = makeRing(); mesh.position.set(x, 0.07, z); mesh.scale.setScalar(0.01);
  scene.add(mesh);
  telegraphs.push({ mesh, x, z, radius, t: 0, delay, onFire });
}

function updateTelegraphs(dt) {
  for (const t of telegraphs) {
    t.t += dt;
    const k = Math.min(1, t.t / t.delay);
    t.mesh.scale.setScalar(t.radius * k);
    t.mesh.material.opacity = 0.4 + 0.5 * Math.sin(t.t * 25) ** 2;
    if (t.t >= t.delay) { t.onFire(t); t.dead = true; scene.remove(t.mesh); }
  }
  telegraphs = telegraphs.filter((t) => !t.dead);
}

function slamAt(x, z, radius, dmg) {
  telegraph(x, z, radius, 0.85, () => {
    audio.slam(); shake = Math.max(shake, 0.6);
    inkDrops.emit(x, 0.3, z, 60, radius * 2.2, 2, 0.8);
    if (Math.hypot(player.x - x, player.z - z) < radius + 0.3) hurtPlayer(dmg, x, z);
    if (boss && boss.stage === 12) pipeline.erase(x, z, radius, 1);
  });
}

function updateBoss(dt) {
  if (!boss) return;
  const b = boss;
  b.t += dt; b.flash -= dt;
  const dx = player.x - b.x, dz = player.z - b.z, dist = Math.hypot(dx, dz) || 0.001;
  const phase2 = b.hp < b.maxHp * 0.5;
  // ink feet: the boss scrubs color away where it walks, except lantern light
  pipeline.erase(b.x, b.z, b.r * 1.3, b.stage === 12 && phase2 ? 1.2 * dt * 4 : 0.9 * dt * 4);
  b.armored = pipeline.paintedAt(b.x, b.z) < 0.5;
  b.armorMesh.visible = b.armored;
  b.armorMesh.material.opacity = 0.25 + Math.sin(b.t * 6) * 0.07;
  if (b.state === 'intro') {
    b.stateT -= dt;
    b.mesh.position.y = -Math.max(0, b.stateT) * 1.5;
    if (b.stateT <= 0) { b.state = 'move'; b.mesh.position.y = 0; }
    return;
  }
  let speed = b.stage === 8 ? 3.2 : 2.6;
  if (phase2) speed *= 1.25;
  let mx = 0, mz = 0;
  b.slamCd -= dt; b.chargeCd -= dt; b.summonCd -= dt; b.volleyCd -= dt; b.teleCd -= dt; b.ringCd -= dt;

  if (b.state === 'charge-windup') {
    b.stateT -= dt;
    if (b.stateT <= 0) { b.state = 'charge'; b.stateT = 0.8; }
  } else if (b.state === 'charge') {
    b.stateT -= dt;
    const hit = moveCircle(b, b.cx * 15 * dt, b.cz * 15 * dt, b.r);
    if (Math.hypot(player.x - b.x, player.z - b.z) < b.r + 0.5) hurtPlayer(22, b.x, b.z);
    if (b.stateT <= 0 || hit) { b.state = 'move'; if (hit) { shake = 0.5; audio.slam(); inkDrops.emit(b.x, 0.5, b.z, 30, 5, 3, 0.6); } }
  } else {
    if (b.stage === 4 || b.stage === 12) {
      if (dist < 4.5 && b.slamCd <= 0) { b.slamCd = phase2 ? 2.2 : 3.2; slamAt(b.x, b.z, 4.8, 24); }
      else if (b.chargeCd <= 0 && dist > 5) { b.chargeCd = phase2 ? 4.5 : 6.5; b.state = 'charge-windup'; b.stateT = 0.8; b.cx = dx / dist; b.cz = dz / dist; telegraphLine(b.x, b.z, b.cx, b.cz); }
      else { mx = dx / dist; mz = dz / dist; }
      if (b.summonCd <= 0) { b.summonCd = phase2 ? 7 : 10; for (let k = 0; k < (b.stage === 12 ? 3 : 3); k++) { const a = Math.random() * Math.PI * 2; spawnEnemy(b.stage === 12 && phase2 ? 'shade' : 'wisp', b.x + Math.cos(a) * 3, b.z + Math.sin(a) * 3); } }
    }
    if (b.stage === 8) {
      const want = 9;
      if (dist < want - 2) { mx = -dx / dist; mz = -dz / dist; } else if (dist > want + 2) { mx = dx / dist; mz = dz / dist; } else { mx = -dz / dist; mz = dx / dist; }
      if (b.volleyCd <= 0) {
        b.volleyCd = phase2 ? 1.3 : 1.9;
        const n = phase2 ? 7 : 5, base = Math.atan2(dx, dz);
        for (let k = 0; k < n; k++) { const a = base + (k - (n - 1) / 2) * 0.22; fireOrb(b.x, b.z, Math.sin(a), Math.cos(a), 9, 9); }
      }
      if (b.teleCd <= 0) {
        b.teleCd = phase2 ? 5 : 7;
        const p = pickSpawnCell(6, 14, true) || { x: b.x, z: b.z };
        inkDrops.emit(b.x, 1, b.z, 40, 5, 3, 0.7);
        b.x = p.x; b.z = p.z;
        inkDrops.emit(b.x, 1, b.z, 40, 5, 3, 0.7);
      }
      if (b.summonCd <= 0) { b.summonCd = 11; for (let k = 0; k < 2; k++) spawnEnemy('fox', b.x + (Math.random() - 0.5) * 4, b.z + (Math.random() - 0.5) * 4); }
    }
    if (b.stage === 12 && b.ringCd <= 0) {
      b.ringCd = phase2 ? 3 : 4.5;
      const n = phase2 ? 16 : 12, off = Math.random();
      for (let k = 0; k < n; k++) { const a = (k + off) / n * Math.PI * 2; fireOrb(b.x, b.z, Math.cos(a), Math.sin(a), 6.5, 10); }
    }
  }
  moveCircle(b, mx * speed * dt, mz * speed * dt, b.r);
  if (dist < b.r + 0.5 && b.state !== 'charge') hurtPlayer(14, b.x, b.z);
  b.mesh.position.x = b.x; b.mesh.position.z = b.z;
  b.mesh.rotation.y = Math.atan2(dx, dz);
  if (b.stage === 12) b.mesh.userData.orbs.children.forEach((o, i) => { const a = b.t * 1.5 + i / 6 * Math.PI * 2; o.position.set(Math.cos(a) * 2.6, 2.5 + Math.sin(b.t * 2 + i) * 0.5, Math.sin(a) * 2.6); });
  if (b.stage === 8) b.mesh.userData.tails.rotation.y = Math.sin(b.t * 2) * 0.4;
  const bf = $('bossFill');
  bf.style.width = `${Math.max(0, b.hp / b.maxHp) * 100}%`;
  bf.style.opacity = b.armored ? 0.45 : 1;
}

function telegraphLine(x, z, dx, dz) {
  for (let k = 1; k <= 5; k++) {
    const px = x + dx * k * 2.2, pz = z + dz * k * 2.2;
    const mesh = makeRing(); mesh.position.set(px, 0.07, pz); mesh.scale.setScalar(0.9);
    scene.add(mesh);
    telegraphs.push({ mesh, x: px, z: pz, radius: 0.9, t: 0, delay: 0.8, onFire: () => {} });
  }
}

// ---------- player ----------
function lightRadius() {
  const st = run ? run.stats : { maxLight: 100 };
  const frac = clamp(player.light / st.maxLight, 0, 1);
  return 2.6 + 5.2 * Math.sqrt(frac) * Math.sqrt(st.maxLight / 100);
}

function updatePlayer(dt) {
  const st = run.stats;
  let ix = 0, iz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  const il = Math.hypot(ix, iz);
  if (il > 0) { ix /= il; iz /= il; player.dirX = ix; player.dirZ = iz; }
  player.invuln -= dt; player.dashCd -= dt; player.fireCd -= dt;

  if ((keys.has('Space') || dashRequest) && player.dashCd <= 0 && player.light > 6) {
    let dx = ix, dz = iz;
    if (!il) { const ax = mouse.world.x - player.x, az = mouse.world.z - player.z, al = Math.hypot(ax, az) || 1; dx = ax / al; dz = az / al; }
    player.dashT = 0.2; player.dashX = dx; player.dashZ = dz; player.dashCd = st.dashCooldown;
    player.light -= 5;
    audio.dash();
  }
  dashRequest = false;
  const speed = 6.2;
  if (player.dashT > 0) {
    player.dashT -= dt;
    moveCircle(player, player.dashX * 30 * dt, player.dashZ * 30 * dt, 0.4);
    embers.emit(player.x, 0.8, player.z, 3, 1, 1, 0.4);
    pipeline.paint(player.x, player.z, 1.1, 0.45);
    if (st.phoenix) {
      player.trailAcc += 30 * dt;
      if (player.trailAcc > 0.9) { player.trailAcc = 0; const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 12), new THREE.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.8, depthWrite: false })); mesh.rotation.x = -Math.PI / 2; mesh.position.set(player.x, 0.05, player.z); scene.add(mesh); fires.push({ mesh, x: player.x, z: player.z, t: 2.5 }); pipeline.paint(player.x, player.z, 1.2, 1); }
    }
  } else {
    player.vx = damp(player.vx, 0, 8, dt); player.vz = damp(player.vz, 0, 8, dt);
    moveCircle(player, (ix * speed + player.vx) * dt, (iz * speed + player.vz) * dt, 0.4);
  }
  if (mouse.down && player.fireCd <= 0 && player.light > 3) throwSeeds();

  // light economy: the night drains, painted ground restores
  const painted = pipeline.paintedAt(player.x, player.z);
  const drain = 1.6 + run.stage * 0.08;
  if (painted > 0.5) player.light += st.regen * dt; else player.light -= drain * dt;
  if (painted > 0.5 && run.lanternsLit > 0) tip('paint', 'Ground you have painted with flame restores your light');
  if (enemies.length > 2 && stageTime > 15) tip('dash', 'Space dashes through dokkaebi · right-click works too');
  player.light = Math.min(st.maxLight, player.light);
  // your lantern leaves a faint wash of color where you walk
  pipeline.paint(player.x, player.z, lightRadius() * 0.45, 0.42);
  if (player.light <= 0) gameOver(false);

  // visuals
  const m = player.mesh;
  m.position.set(player.x, 0, player.z);
  const aimA = Math.atan2(mouse.world.x - player.x, mouse.world.z - player.z);
  m.rotation.y = aimA;
  const bob = il ? Math.sin(stageTime * 14) * 0.05 : 0;
  m.userData.body.position.y = bob;
  m.userData.lant.position.y = 1.55 + Math.sin(stageTime * 7) * 0.06;
  m.visible = !(player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0);
  const lr = lightRadius();
  lanternLight.position.set(player.x + Math.sin(aimA) * 0.6, 2.2, player.z + Math.cos(aimA) * 0.6);
  lanternLight.distance = lr * 2.1;
  lanternLight.intensity = 4 + Math.sin(stageTime * 17) * 0.5 + Math.sin(stageTime * 5.3) * 0.5;
}

function updateLanterns(dt) {
  if (run.stage === 1 && stageTime > 9) tip('lantern', 'Follow the red arrow · stand beside a stone lantern to kindle it');
  for (const l of lanterns) {
    if (l.lit) {
      l.mesh.userData.flame.scale.set(1 + Math.sin(stageTime * 9 + l.x) * 0.08, 1.3 + Math.sin(stageTime * 11 + l.z) * 0.12, 1);
      if (Math.random() < 0.15) embers.emit(l.x, 1.9, l.z, 1, 0.3, 1.5, 0.6);
      continue;
    }
    const d = Math.hypot(player.x - l.x, player.z - l.z);
    const near = d < 2.4;
    l.progress = clamp(l.progress + (near ? dt / 1.1 : -dt / 2), 0, 1);
    l.ring.material.opacity = near || l.progress > 0 ? 0.9 : 0.25 + Math.sin(stageTime * 3) * 0.15;
    l.ring.scale.setScalar(2.4 - l.progress * 1.2);
    l.ring.material.color.set(near ? 0xffb347 : 0xff3a22);
    if (near && Math.random() < 0.5) embers.emit(l.x, 1.7, l.z, 1, 0.4, 0.5, 0.3);
    if (l.progress >= 1) lightLantern(l);
  }
}

function lightLantern(l) {
  l.lit = true;
  l.ring.visible = false;
  l.mesh.userData.flame.material = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  pipeline.paint(l.x, l.z, level.boss ? 7.5 : 7, 1, true);
  burstFx.push({ x: l.x, z: l.z, r: 9, t: 0, life: 1.2 });
  embers.emit(l.x, 1.8, l.z, 70, 6, 5, 1.1);
  audio.bell();
  gainLight(30);
  run.score += 100 * run.stage;
  run.lanternsLit++;
  shake = Math.max(shake, 0.2);
  // the dokkaebi notice the light
  const waveN = level.boss ? 0 : 2 + Math.floor(run.stage / 2);
  for (let k = 0; k < waveN; k++) { const p = pickSpawnCell(9, 20, false); if (p) spawnEnemy(enemyTypeForStage(run.stage), p.x, p.z); }
  const left = lanterns.filter((x) => !x.lit).length;
  if (!left && gate) {
    gate.open = true;
    const g = level.gate;
    level.grid[level.idx(g.i, g.j)] = OPEN;
    flowCell = -1;
    audio.gate();
    flashBanner('The gate opens', 'Reach it before your light fails', 2000);
  }
  updateHudStatic();
}

function updateGate(dt) {
  if (!gate) return;
  if (gate.open) {
    gate.t = Math.min(1, gate.t + dt * 0.7);
    gate.mesh.userData.doors.position.y = 1.45 - gate.t * 3.2;
    if (Math.random() < 0.3) embers.emit(gate.x, 2.5, gate.z, 1, 0.8, 1.5, 0.8);
    pipeline.paint(gate.x, gate.z, 3, 1);
    if (Math.hypot(player.x - gate.x, player.z - gate.z) < 2.0) stageCleared();
  }
}

function updatePointer() {
  let target = null;
  if (!level.boss) {
    let best = Infinity;
    for (const l of lanterns) if (!l.lit) { const d = Math.hypot(l.x - player.x, l.z - player.z); if (d < best) { best = d; target = l; } }
    if (!target && gate) target = gate;
  }
  pointer.visible = !!target && state === 'play';
  if (!target) return;
  const a = Math.atan2(target.x - player.x, target.z - player.z);
  const dist = Math.hypot(target.x - player.x, target.z - player.z);
  pointer.visible = dist > 4;
  pointer.position.set(player.x + Math.sin(a) * 1.7, 0.08, player.z + Math.cos(a) * 1.7);
  pointer.rotation.y = a;
  pointer.children[0].material.opacity = 0.55 + Math.sin(stageTime * 5) * 0.3;
}

// ---------- stage flow ----------
function stageCleared() {
  if (state !== 'play') return;
  state = 'clear';
  run.paintedSum += pipeline.paintedRatio();
  const paintBonus = Math.round(pipeline.paintedRatio() * 1000 * run.stage);
  run.score += paintBonus + 250 * run.stage;
  for (const e of enemies) { inkDrops.emit(e.x, 0.8, e.z, 12, 3, 2, 0.6); scene.remove(e.mesh); }
  enemies = [];
  for (const o of orbs) scene.remove(o.mesh);
  orbs = [];
  audio.bell();
  const d = level.district;
  flashBanner(run.stage === FINAL_STAGE ? 'Dawn returns' : `Dawn over the ${d.name}`, `${Math.round(pipeline.paintedRatio() * 100)}% painted · +${paintBonus}`, 2600);
  setTimeout(() => {
    if (run.stage >= FINAL_STAGE) { gameOver(true); return; }
    showTalismans();
  }, 2800);
}

function showTalismans() {
  state = 'talisman';
  currentOffer = offerTalismans(run.levels, run.rng, 3);
  if (!currentOffer.length) { nextStage(); return; }
  $('talismanTitle').textContent = `Night ${run.stage} survived`;
  const box = $('talismanCards');
  box.innerHTML = '';
  currentOffer.forEach((t, n) => {
    const b = document.createElement('button');
    b.className = 'card';
    const lvl = run.levels[t.id] || 0;
    b.innerHTML = `<div class="glyph">${t.glyph}</div><div class="name">${t.name}</div><div class="desc">${t.desc}</div><div class="lvl">${'●'.repeat(lvl)}${'○'.repeat(t.max - lvl)}</div><div class="key">press ${n + 1}</div>`;
    b.addEventListener('click', () => chooseTalisman(t));
    box.appendChild(b);
  });
  $('screen-talisman').classList.remove('hidden');
  $('hud').classList.add('hidden');
}

function chooseTalisman(t) {
  if (state !== 'talisman') return;
  run.levels[t.id] = (run.levels[t.id] || 0) + 1;
  run.stats = applyTalismans(run.levels);
  audio.choose();
  $('screen-talisman').classList.add('hidden');
  nextStage();
}

function nextStage() {
  run.stage++;
  state = 'play';
  $('hud').classList.remove('hidden');
  player.light = Math.max(player.light, run.stats.maxLight * 0.75);
  startStage(run.stage);
}

function gameOver(victory) {
  if (state === 'end') return;
  state = 'end';
  mouse.down = false;
  $('hud').classList.add('hidden');
  $('bossBar').classList.add('hidden');
  const best = loadBest(run.daily);
  const isBest = run.score > (best.score || 0);
  if (isBest) saveBest({ score: run.score, stage: run.stage, victory }, run.daily);
  $('endTitle').innerHTML = (victory ? 'Dawn returns to the world' : 'The lantern went out') + (run.daily ? `<div class="daily-tag">DAILY NIGHT · ${run.daily}</div>` : '');
  const avgPaint = run.paintedSum / Math.max(1, run.stage - (victory ? 0 : 1));
  $('endStats').innerHTML = [
    ['Night reached', `${run.stage} / ${FINAL_STAGE}`],
    ['Score', `${run.score.toLocaleString()}${isBest ? ' ★ new best' : ''}`],
    ['Dokkaebi banished', run.kills],
    ['Stone lanterns lit', run.lanternsLit],
    ['Average painted', `${Math.round((avgPaint || 0) * 100)}%`],
    ['Talismans', Object.entries(run.levels).map(([id, l]) => TALISMANS.find((t) => t.id === id).glyph + (l > 1 ? l : '')).join(' ') || '—'],
    ['Time', formatTime(run.time)],
  ].map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  if (victory) { dawn = 0; }
  setTimeout(() => $('screen-end').classList.remove('hidden'), victory ? 600 : 1200);
}

function formatTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

const bestKey = (day) => (day ? `inklight.daily.${day}` : 'inklight.best');
function loadBest(day) { try { return JSON.parse(localStorage.getItem(bestKey(day)) || '{}'); } catch { return {}; } }
function saveBest(v, day) { try { localStorage.setItem(bestKey(day), JSON.stringify(v)); } catch { /* storage unavailable */ } }

function togglePause() {
  if (state === 'play') { state = 'pause'; $('screen-pause').classList.remove('hidden'); }
  else if (state === 'pause') { state = 'play'; $('screen-pause').classList.add('hidden'); }
}

// ---------- HUD ----------
let bannerTimer = 0;
function flashBanner(title, sub, ms) {
  const b = $('banner');
  b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
}

function updateHudStatic() {
  if (!run || !level) return;
  const d = level.district;
  $('stageLabel').textContent = `Night ${run.stage} / ${FINAL_STAGE}`;
  $('districtLabel').textContent = `${d.name} ${d.ko}`;
  const lit = lanterns.filter((l) => l.lit).length;
  $('lanternCount').textContent = `${lit}/${lanterns.length}`;
  const row = $('talismanRow');
  row.innerHTML = Object.entries(run.levels).map(([id, l]) => `<div class="tal-chip" title="${TALISMANS.find((t) => t.id === id).name}">${TALISMANS.find((t) => t.id === id).glyph}${l > 1 ? `<small>${l}</small>` : ''}</div>`).join('');
  let obj;
  if (level.boss) obj = 'Light the four stone lanterns, then fight the boss inside their glow';
  else if (lit < lanterns.length) obj = `Light the stone lanterns (${lit}/${lanterns.length}) · stand beside one to kindle it`;
  else obj = 'The gate is open · reach it';
  $('objective').textContent = obj;
}

let hudAcc = 0, heartT = 0;
function updateHud(dt) {
  hudAcc += dt;
  const frac = clamp(player.light / run.stats.maxLight, 0, 1);
  $('lightFill').style.width = `${frac * 100}%`;
  const low = frac < 0.25;
  $('lightFill').parentElement.classList.toggle('low', low);
  if (low) { heartT -= dt; if (heartT <= 0) { heartT = 0.35 + frac * 2.5; audio.tone(55, 0.18, 0.5, 'sine', 40); } }
  if (hudAcc < 0.2) return;
  hudAcc = 0;
  $('score').textContent = run.score.toLocaleString();
  $('painted').textContent = `${Math.round(pipeline.paintedRatio() * 100)}%`;
}

// ---------- main loop ----------
let last = performance.now();
const camTarget = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (hitStop > 0) { hitStop -= dt; dt *= 0.15; }
  const u = pipeline.material.uniforms;
  u.uTime.value = now / 1000;

  if (state === 'title') {
    titleT += dt;
    const r = 26;
    camera.position.set(Math.sin(titleT * 0.08) * r, 18, Math.cos(titleT * 0.08) * r);
    camera.lookAt(0, 0, 0);
    player.mesh.position.set(player.x, 0, player.z);
    lanternLight.position.set(player.x + 0.6, 2.2, player.z);
    u.uPlayer.value.set(player.x, player.z, 6 + Math.sin(titleT * 2) * 0.4);
    pointer.visible = false;
  } else if (state === 'play') {
    run.time += dt; stageTime += dt;
    updateMouseWorld();
    updateFlow();
    updatePlayer(dt);
    if (state === 'play') {
      directorUpdate(dt);
      updateEnemies(dt);
      updateBoss(dt);
      updateTelegraphs(dt);
      updateProjectiles(dt);
      updateFireflies(dt);
      updateLanterns(dt);
      updateGate(dt);
      updatePointer();
      updateHud(dt);
      const danger = clamp(enemies.filter((e) => Math.hypot(e.x - player.x, e.z - player.z) < 10).length / 8 + (boss ? 0.5 : 0), 0, 1);
      audio.update(danger, level.district === undefined ? 50 : 50 + Math.min(2, Math.floor((run.stage - 1) / 4)) * 2);
    }
  } else if (state === 'clear') {
    stageTime += dt;
    dawn = Math.min(1, dawn + dt * 0.6);
    updateProjectiles(dt);
    audio.update(0);
  } else if (state === 'end' || state === 'talisman') {
    audio.update(0);
  }

  if (state !== 'title') {
    const lookAhead = 0.12;
    camTarget.set(player.x + (mouse.world.x - player.x) * lookAhead, 0, player.z + (mouse.world.z - player.z) * lookAhead);
    const cx = camTarget.x, cz = camTarget.z + CAM_Z;
    camera.position.x = damp(camera.position.x, cx, 6, dt);
    camera.position.y = damp(camera.position.y, CAM_Y, 6, dt);
    camera.position.z = damp(camera.position.z, cz, 6, dt);
    shake = Math.max(0, shake - dt * 1.8);
    const sx = (Math.random() - 0.5) * shake * 0.8, sz = (Math.random() - 0.5) * shake * 0.8;
    camera.position.x += sx; camera.position.z += sz;
    camera.lookAt(camera.position.x - sx * 0.5, 0, camera.position.z - CAM_Z);
    u.uPlayer.value.set(player.x, player.z, state === 'end' ? Math.max(0.01, u.uPlayer.value.z - dt * 6) : lightRadius());
  }

  // burst uniforms
  const bs = pipeline.bursts;
  for (let i = 0; i < 8; i++) {
    const b = burstFx[burstFx.length - 1 - i];
    if (b) { const k = 1 - b.t / b.life; bs[i].set(b.x, b.z, b.r * (0.6 + 0.4 * (1 - k)), k); } else bs[i].set(0, 0, 0, 0);
  }
  hurt = Math.max(0, hurt - dt * 2.5);
  u.uHurt.value = hurt;
  u.uDawn.value = dawn;

  embers.update(dt, -1.5);
  inkDrops.update(dt, -9);
  sparks.update(dt, -0.5);
  pipeline.render(scene, camera);
  adaptQuality(dt);
}

// keep 1080p above ~50fps on weaker GPUs by stepping the render scale down
let fpsAcc = 0, fpsFrames = 0, qualityLocked = false;
function adaptQuality(dt) {
  if (qualityLocked || state !== 'play') return;
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc < 3) return;
  const fps = fpsFrames / fpsAcc;
  fpsAcc = 0; fpsFrames = 0;
  if (fps < 48 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); resize(); }
  else if (fps > 58) qualityLocked = true;
}

// ---------- boot ----------
function startRun(daily = false) {
  audio.start();
  newRun(daily === true);
  player.light = run.stats.maxLight;
  state = 'play';
  $('screen-title').classList.add('hidden');
  $('screen-end').classList.add('hidden');
  $('hud').classList.remove('hidden');
  startStage(1);
}
$('btnStart').addEventListener('click', () => startRun(false));
$('btnDaily').addEventListener('click', () => startRun(true));
$('btnRetry').addEventListener('click', () => startRun(!!(run && run.daily)));
$('btnTitle').addEventListener('click', () => { location.reload(); });
$('btnShare').addEventListener('click', async () => {
  const txt = shareText();
  try { await navigator.clipboard.writeText(txt); $('btnShare').textContent = 'Copied'; } catch { $('btnShare').textContent = 'Copy failed'; }
  setTimeout(() => { $('btnShare').textContent = 'Copy result'; }, 1600);
});
function shareText() {
  const nights = '墨'.repeat(Math.min(run.stage, FINAL_STAGE));
  return `INKLIGHT 먹빛 등불${run.daily ? ` · Daily ${run.daily}` : ''}\nNight ${run.stage}/${FINAL_STAGE} · ${run.score.toLocaleString()} pts · ${run.kills} dokkaebi\n${nights}`;
}
$('btnResume').addEventListener('click', togglePause);

function boot() {
  const best = loadBest();
  if (best.score) $('bestLine').textContent = `Best: ${best.score.toLocaleString()} · night ${best.stage}${best.victory ? ' · dawn reached' : ''}`;
  run = null;
  level = generateLevel(1, 20261223);
  levelGroup = buildLevelMeshes(level);
  scene.add(levelGroup);
  const size = level.N * CELL;
  pipeline.resetPaint({ x: -size / 2, z: -size / 2 }, size, (x, z) => { const c = worldToCell(level, x, z); return !isBlocked(level, c.i, c.j); });
  const p = cellToWorld(level, level.start.i, level.start.j);
  player.x = 0; player.z = 0;
  // paint a few blooms so the title shows the idea: ink night, color where light was
  const rng = makeRng(7);
  for (let k = 0; k < 6; k++) { const [i, j] = level.reachable[(rng() * level.reachable.length) | 0]; const w = cellToWorld(level, i, j); pipeline.paint(w.x, w.z, 3 + rng() * 3, 1); }
  for (const L of level.lanterns.slice(0, 3)) { const w = cellToWorld(level, L.i, L.j); const mesh = makeStoneLantern(level.district); mesh.position.set(w.x, 0, w.z); scene.add(mesh); lanterns.push({ mesh, ring: new THREE.Object3D(), x: w.x, z: w.z, lit: true }); mesh.userData.flame.material = new THREE.MeshBasicMaterial({ color: 0xffb347 }); pipeline.paint(w.x, w.z, 6, 1, true); }
  const c = worldToCell(level, 0, 0);
  if (isBlocked(level, c.i, c.j)) { player.x = p.x; player.z = p.z; }
  pipeline.paint(player.x, player.z, 5, 1);
  $('loading').classList.add('done');
  requestAnimationFrame(frame);
}
boot();

// debug hooks for automated checks (harmless in production)
window.__inklight = {
  get state() { return state; },
  get run() { return run; },
  get player() { return player; },
  get enemies() { return enemies; },
  get boss() { return boss; },
  get lanterns() { return lanterns; },
  get gate() { return gate; },
  clear() { stageCleared(); },
  die() { gameOver(false); },
  start: startRun,
  jump(stage) { if (!run) startRun(); run.stage = stage; player.light = run.stats.maxLight; startStage(stage); },
  lightAll() { for (const l of lanterns) if (!l.lit) lightLantern(l); },
  pick(n = 0) { if (currentOffer[n]) chooseTalisman(currentOffer[n]); },
  god(on = true) { this._god = on; if (on) run.stats.ward = 1; },
  painted: () => pipeline.paintedRatio(),
};
