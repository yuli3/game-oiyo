import * as THREE from 'three';
import { makeRng, clamp, damp, lerp } from './rng.js';
import { TECH, WINDUP, counterOf, makeWrestler, step, startTech, aiThink, vulnerability } from './sim.js';
import { JOINTS, standPose, transformPose, Ragdoll, BodyView, toon } from './body.js';
import { Sound } from './sound.js';

const $ = (id) => document.getElementById(id);
const rng = makeRng((Date.now() & 0xffffffff) >>> 0);

// ---------- renderer / scene ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3e8);
scene.fog = new THREE.Fog(0x9fd3e8, 22, 60);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
scene.add(new THREE.HemisphereLight(0xfff4dd, 0x6a8a4a, 1.6));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
sun.position.set(-5, 12, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
scene.add(sun);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 50 : 34;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const sound = new Sound();

// ---------- arena ----------
function canvasTex(w, h, draw, repeat = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}
const sandTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#f0cd7c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${150 + Math.random() * 80},${110 + Math.random() * 60},${50 + Math.random() * 40},${Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, 3);
const grassTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#86b562'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${60 + Math.random() * 50},${120 + Math.random() * 60},${40 + Math.random() * 30},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); }
}, 12);

const grass = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshLambertMaterial({ map: grassTex }));
grass.rotation.x = -Math.PI / 2; grass.position.y = -0.12; grass.receiveShadow = true;
scene.add(grass);
const RING = 4.2;
const ring = new THREE.Mesh(new THREE.CylinderGeometry(RING, RING + 0.25, 0.14, 64), new THREE.MeshLambertMaterial({ map: sandTex }));
ring.position.y = -0.07; ring.receiveShadow = true;
scene.add(ring);
// gamani straw-bag rim
const bagGeo = new THREE.CapsuleGeometry(0.16, 0.35, 4, 8);
const bags = new THREE.InstancedMesh(bagGeo, toon(0xb8904a), 72);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2;
    e.set(Math.PI / 2, 0, -a);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(Math.cos(a) * (RING + 0.28), 0.06, Math.sin(a) * (RING + 0.28)), q, new THREE.Vector3(1, 1, 1));
    bags.setMatrixAt(i, m);
  }
}
bags.castShadow = true;
scene.add(bags);

// crowd on tiers behind and beside the ring
const OBANG = [0xd6322a, 0x2a5bd6, 0xf2c335, 0xf6f1e4, 0x2e8b57, 0xe88fb0, 0x6b4aa0];
const crowd = [];
const crowdBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 8), toon(0xffffff), 220);
const crowdHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8), toon(0xffffff), 220);
// gat: a wide brim plus a tall crown, merged into one instanced mesh
const hatGeo = (() => {
  const brim = new THREE.CylinderGeometry(0.27, 0.27, 0.02, 14);
  const crown = new THREE.CylinderGeometry(0.1, 0.12, 0.16, 10); crown.translate(0, 0.09, 0);
  const g = new THREE.BufferGeometry();
  const pos = [...brim.toNonIndexed().attributes.position.array, ...crown.toNonIndexed().attributes.position.array];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
})();
const crowdHat = new THREE.InstancedMesh(hatGeo, toon(0x1f1a14), 220);
{
  let n = 0;
  for (let row = 0; row < 4; row++) {
    const r = 6.2 + row * 0.9;
    const count = 40 + row * 6;
    for (let k = 0; k < count && n < 220; k++) {
      const a = Math.PI * 0.08 + (k / count) * Math.PI * 0.84 + (row % 2) * 0.02;
      const x = Math.cos(a) * r * 1.35, z = -Math.sin(a) * r;
      crowd.push({ x, z, y: 0.35 + row * 0.42, phase: rng() * 6, hat: rng() < 0.35, color: OBANG[(rng() * OBANG.length) | 0] });
      n++;
    }
  }
  crowd.forEach((c, i) => {
    crowdBody.setColorAt(i, new THREE.Color(c.color));
    crowdHead.setColorAt(i, new THREE.Color(0xe2a273).multiplyScalar(0.85 + rng() * 0.25));
  });
  crowdBody.count = crowdHead.count = crowdHat.count = crowd.length;
  scene.add(crowdBody, crowdHead, crowdHat);
  // tiers
  for (let row = 0; row < 4; row++) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(6.2 + row * 0.9 + 0.4, 6.2 + row * 0.9 + 0.4, 0.2, 48, 1, false, Math.PI * 0.55, Math.PI * 0.9), toon(0xc79a62));
    tier.scale.set(1.35, 1, 1);
    tier.position.y = row * 0.42; tier.receiveShadow = true;
    scene.add(tier);
  }
}
let cheer = 0;
function updateCrowd(t) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  crowd.forEach((c, i) => {
    const jump = Math.max(0, Math.sin(t * (6 + cheer * 6) + c.phase)) * (0.04 + cheer * 0.35);
    m.compose(v.set(c.x, c.y + 0.3 + jump, c.z), q, s); crowdBody.setMatrixAt(i, m);
    m.compose(v.set(c.x, c.y + 0.82 + jump, c.z), q, s); crowdHead.setMatrixAt(i, m);
    m.compose(v.set(c.x, c.hat ? c.y + 0.94 + jump : -50, c.z), q, s); crowdHat.setMatrixAt(i, m);
  });
  crowdBody.instanceMatrix.needsUpdate = crowdHead.instanceMatrix.needsUpdate = crowdHat.instanceMatrix.needsUpdate = true;
}

// flags, mountains, the prize bull
for (const sx of [-6.5, 6.5]) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 8), toon(0x7a5a3a)); pole.position.set(sx, 3, -3); scene.add(pole);
  OBANG.slice(0, 5).forEach((c, i) => {
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshToonMaterial({ color: c, side: THREE.DoubleSide }));
    flag.position.set(sx + 0.47, 5.6 - i * 0.55, -3); flag.userData.wave = i; scene.add(flag);
  });
}
const flags = scene.children.filter((o) => o.userData.wave !== undefined);
for (let i = 0; i < 9; i++) {
  const h = 6 + rng() * 8;
  const mtn = new THREE.Mesh(new THREE.ConeGeometry(6 + rng() * 6, h, 7), toon(i % 2 ? 0x5f8f6a : 0x7aa36f));
  mtn.position.set(-40 + i * 10 + rng() * 4, h / 2 - 0.5, -30 - rng() * 10); scene.add(mtn);
}
function makeBull() {
  const g = new THREE.Group();
  const hide = toon(0x9a5a2a);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.7), hide); body.position.y = 1.0; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), hide); head.position.set(0.95, 1.25, 0); g.add(head);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), toon(0xf6f1e4)); horn.position.set(1.0, 1.58, s * 0.22); horn.rotation.x = s * 0.6; g.add(horn);
  }
  for (const [lx, lz] of [[-0.55, -0.25], [-0.55, 0.25], [0.55, -0.25], [0.55, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.65, 6), hide); leg.position.set(lx, 0.33, lz); g.add(leg);
  }
  const garland = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 6, 14), toon(0xd6322a)); garland.position.set(0.72, 1.05, 0); garland.rotation.y = Math.PI / 2; g.add(garland);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const bull = makeBull(); bull.position.set(5.6, 0, -1.5); bull.rotation.y = -2.4; scene.add(bull);

// sand puffs
const puffGeo = new THREE.BufferGeometry();
const PUFF = 260;
const puffPos = new Float32Array(PUFF * 3), puffVel = new Float32Array(PUFF * 3), puffLife = new Float32Array(PUFF);
puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
const puffs = new THREE.Points(puffGeo, new THREE.PointsMaterial({ color: 0xe9c070, size: 0.13, transparent: true, opacity: 0.9, depthWrite: false }));
puffs.frustumCulled = false; scene.add(puffs);
let puffCursor = 0;
for (let i = 0; i < PUFF; i++) puffPos[i * 3 + 1] = -10;
function sandBurst(x, y, z, n, speed) {
  for (let k = 0; k < n; k++) {
    const i = puffCursor; puffCursor = (puffCursor + 1) % PUFF;
    const a = rng() * Math.PI * 2;
    puffPos[i * 3] = x; puffPos[i * 3 + 1] = y; puffPos[i * 3 + 2] = z + (rng() - 0.5) * 0.4;
    puffVel[i * 3] = Math.cos(a) * speed * rng(); puffVel[i * 3 + 1] = speed * (0.6 + rng()); puffVel[i * 3 + 2] = Math.sin(a) * speed * rng() * 0.6;
    puffLife[i] = 0.6 + rng() * 0.5;
  }
}
function updatePuffs(dt) {
  for (let i = 0; i < PUFF; i++) {
    if (puffLife[i] <= 0) continue;
    puffLife[i] -= dt;
    puffVel[i * 3 + 1] -= 9 * dt;
    for (let k = 0; k < 3; k++) puffPos[i * 3 + k] += puffVel[i * 3 + k] * dt;
    if (puffPos[i * 3 + 1] < 0.02) { puffPos[i * 3 + 1] = 0.02; puffVel[i * 3] *= 0.6; puffVel[i * 3 + 2] *= 0.6; }
    if (puffLife[i] <= 0) puffPos[i * 3 + 1] = -10;
  }
  puffGeo.attributes.position.needsUpdate = true;
}

// ---------- roster ----------
const RIVALS = [
  { name: 'Dol-soe', speed: 0.75, ko: '돌쇠', title: 'Village Rookie', trait: 'Eager and wobbly. Pushes hard, falls for a pull.', skill: 0.25, counter: 0.1, aggro: 1.2, str: 0.9, pref: { lift: 1, trip: 1, twist: 1 }, skin: 0xe8b084, belt: 0x2a5bd6, bulk: 0.95 },
  { name: 'Gap-su', speed: 0.95, ko: '갑수', title: 'Rice Farmer', trait: 'Arms like a plough. Loves the belt lift.', skill: 0.45, counter: 0.25, aggro: 0.9, str: 1.15, pref: { lift: 1.5, trip: 0.7, twist: 0.8 }, skin: 0xc98a5a, belt: 0x2a5bd6, bulk: 1.1 },
  { name: 'Mak-dong', speed: 1.1, ko: '막동', title: 'Harbor Fisher', trait: 'Quick feet. Hunts for trips when you lean back.', skill: 0.6, counter: 0.4, aggro: 1.0, str: 1.0, pref: { lift: 0.7, trip: 1.6, twist: 1 }, skin: 0xb9784a, belt: 0x2a5bd6, bulk: 1.0 },
  { name: 'Bear Kim', speed: 1.05, ko: '곰돌 김', title: 'Mountain Woodcutter', trait: 'Huge and patient. Waits, then twists you into the sand.', skill: 0.72, counter: 0.55, aggro: 0.7, str: 1.35, pref: { lift: 1, trip: 0.8, twist: 1.5 }, skin: 0xd39a6a, belt: 0x2a5bd6, bulk: 1.3 },
  { name: 'Baekdu', speed: 1.25, ko: '백두', title: 'Reigning Champion', trait: 'Reads every wind-up. Earn the golden bull.', skill: 0.92, counter: 0.72, aggro: 1.0, str: 1.25, pref: { lift: 1.2, trip: 1.2, twist: 1.2 }, skin: 0xe0a070, belt: 0x2a5bd6, bulk: 1.2 },
];

// ---------- game state ----------
let mode = 'title'; // title | vs | bout | end
let twoPlayer = false;
let tourIndex = 0;
let bout = null;
const views = [null, null];
const poses = [new Float32Array(JOINTS.length * 2), new Float32Array(JOINTS.length * 2)];
let timeScale = 1;
let slowT = 0;

function setupViews(rival) {
  for (const v of views) if (v) scene.remove(v.group);
  views[0] = new BodyView(scene, { z: 0.14, belt: 0xd6322a, skin: 0xe2a273, bulk: 1.1 });
  views[1] = new BodyView(scene, { z: -0.14, belt: rival ? rival.belt : 0x2a5bd6, skin: rival ? rival.skin : 0xd39a6a, bulk: rival ? rival.bulk : 1.1 });
  for (const v of views) v.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
}

function newBout(rival) {
  bout = {
    rival,
    wins: [0, 0],
    round: 0,
    phase: 'intro',
    phaseT: 0,
    match: null,
    timer: 40,
    throwInfo: null,
    ragdoll: null,
    winner: null,
    ai: rival ? { skill: rival.skill, counter: rival.counter, aggro: rival.aggro, pref: rival.pref, react: 0.2 } : null,
  };
  setupViews(rival);
  $('p1Name').textContent = twoPlayer ? 'Player 1' : 'You';
  $('p2Name').textContent = twoPlayer ? 'Player 2' : `${rival.name} ${rival.ko}`;
  $('keysHint').innerHTML = twoPlayer
    ? 'P1 <b>A D</b> pull·push · <b>W S E</b> lift·trip·twist &nbsp;|&nbsp; P2 <b>← →</b> push·pull · <b>↑ ↓ /</b> lift·trip·twist'
    : '<b>A D</b> pull·push · <b>W</b> lift · <b>S</b> trip · <b>E</b> twist · beat their wind-up to <b>reverse</b>';
  newRound();
}

function newRound() {
  bout.round++;
  bout.phase = 'intro';
  bout.phaseT = 0;
  bout.timer = 40;
  bout.throwInfo = null;
  bout.ragdoll = null;
  const r = bout.rival;
  bout.match = { x: 0, vx: 0, suddenDeath: false, w: [makeWrestler(0, { name: 'P1', str: 1 }), makeWrestler(1, { name: 'P2', str: r ? r.str : 1, speed: r ? r.speed : 1 })] };
  $('roundLabel').textContent = `Round ${bout.round}`;
  updateWins();
  sound.gong();
}

function updateWins() {
  $('p1Wins').textContent = '●'.repeat(bout.wins[0]) + '○'.repeat(2 - bout.wins[0]);
  $('p2Wins').textContent = '○'.repeat(2 - bout.wins[1]) + '●'.repeat(bout.wins[1]);
}

let calloutT = 0;
function callout(big, small, ms = 1600) {
  const el = $('callout');
  el.innerHTML = `${big}${small ? `<small>${small}</small>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(calloutT);
  calloutT = setTimeout(() => el.classList.remove('show'), ms);
}
function flash() { const f = $('flash'); f.style.opacity = 0.7; setTimeout(() => { f.style.opacity = 0; }, 60); }

// ---------- input ----------
const keys = new Set();
const pressed = new Set();
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash'].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  if (e.code === 'KeyM') sound.toggleMute();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function humanInput(w, scheme) {
  if (scheme === 0) {
    const push = keys.has('KeyD') || (!twoPlayer && keys.has('ArrowRight'));
    const pull = keys.has('KeyA') || (!twoPlayer && keys.has('ArrowLeft'));
    w.drive = (push ? 1 : 0) - (pull ? 1 : 0);
    if (pressed.has('KeyW') || (!twoPlayer && (pressed.has('ArrowUp') || pressed.has('KeyJ')))) tryTech(w, 'lift');
    if (pressed.has('KeyS') || (!twoPlayer && (pressed.has('ArrowDown') || pressed.has('KeyK')))) tryTech(w, 'trip');
    if (pressed.has('KeyE') || (!twoPlayer && (pressed.has('KeyL') || pressed.has('Space')))) tryTech(w, 'twist');
  } else {
    const push = keys.has('ArrowLeft'), pull = keys.has('ArrowRight');
    w.drive = (push ? 1 : 0) - (pull ? 1 : 0);
    if (pressed.has('ArrowUp')) tryTech(w, 'lift');
    if (pressed.has('ArrowDown')) tryTech(w, 'trip');
    if (pressed.has('Slash') || pressed.has('ShiftRight') || pressed.has('Numpad0')) tryTech(w, 'twist');
  }
}
function tryTech(w, type) {
  if (startTech(w, type)) sound.grunt(w.side);
}

// ---------- pose building ----------
function crouchFor(w) {
  let c = 0.3 + Math.max(0, -w.lean) * 0.1;
  if (w.tech) { const p = Math.min(1, w.tech.t / WINDUP); c += (w.tech.type === 'lift' ? 0.35 : w.tech.type === 'trip' ? 0.1 : 0.15) * p; }
  if (w.stagger > 0) c += 0.15;
  return c;
}
const PAIR_GAP = 0.38;
function pelvisOf(m, side, crouch) { return { x: m.x + (side === 0 ? -PAIR_GAP : PAIR_GAP), y: 0.98 - 0.32 * crouch }; }

function poseStanding(out, m, w, o, extra = {}) {
  const c = extra.crouch ?? crouchFor(w);
  const pv = pelvisOf(m, w.side, c);
  const oc = crouchFor(o);
  const opv = pelvisOf(m, o.side, oc);
  const techLean = w.tech && w.tech.type === 'twist' ? -0.35 * Math.min(1, w.tech.t / WINDUP) : 0;
  return standPose({
    x: pv.x, f: w.f, lean: (extra.lean ?? w.lean) + techLean, crouch: c, bend: extra.bend,
    footShift: w.tech && w.tech.type === 'trip' ? 0.12 * Math.min(1, w.tech.t / WINDUP) : 0,
    footFX: extra.footFX, footFY: extra.footFY,
    gripX: opv.x + w.f * 0.14, gripY: opv.y + 0.08, armsDown: extra.armsDown,
  }, out);
}

const tmpPose = new Float32Array(JOINTS.length * 2);
function poseThrow(info, p) {
  const m = bout.match;
  const A = info.attacker, D = info.defender, ia = A.side, id = D.side;
  const ease = p * p * (3 - 2 * p);
  if (info.type === 'lift') {
    poseStanding(poses[ia], m, A, D, { crouch: lerp(0.65, 0.0, ease), bend: lerp(0.75, 0.15, ease), lean: 0 });
    poseStanding(tmpPose, m, D, A, { crouch: 0.2, armsDown: false });
    const up = 0.65 * Math.sin(Math.min(1, p * 1.5) * Math.PI / 2);
    const piv = pelvisOf(m, id, 0.2);
    transformPose(tmpPose, poses[id], piv.x, piv.y, -A.f * 1.5 * Math.max(0, p - 0.35) / 0.65, 0, up);
  } else if (info.type === 'trip') {
    const dp = pelvisOf(m, id, 0.3);
    poseStanding(poses[ia], m, A, D, { lean: lerp(0.3, 0.9, ease), footFX: lerp(m.x + A.f * 0.0, dp.x + A.f * 0.25, Math.min(1, p * 2)), footFY: 0.06 + 0.15 * Math.sin(Math.min(1, p * 2) * Math.PI) });
    poseStanding(tmpPose, m, D, A, { crouch: 0.3, lean: -0.6 });
    const fb = { x: tmpPose[6 * 2], y: tmpPose[6 * 2 + 1] };
    transformPose(tmpPose, poses[id], fb.x, fb.y, -A.f * 1.2 * ease, 0, 0);
  } else if (info.type === 'twist') {
    poseStanding(poses[ia], m, A, D, { lean: lerp(0, -0.7, ease), crouch: 0.45 });
    poseStanding(tmpPose, m, D, A, { crouch: 0.3 });
    const ap = pelvisOf(m, ia, 0.45);
    transformPose(tmpPose, poses[id], ap.x, ap.y + 0.4, A.f * 2.2 * ease, 0, 0.2 * Math.sin(p * Math.PI));
  }
}

function releaseRagdoll(info) {
  const D = info.defender, id = D.side, A = info.attacker;
  const pose = poses[id];
  const cx = pose[2 * 2], cy = pose[2 * 2 + 1];
  let vx, vy, spin;
  if (info.type === 'lift') { vx = A.f * 2.6; vy = -1.0; spin = -A.f * 4.5; }
  else if (info.type === 'trip') { vx = A.f * 2.4; vy = 0; spin = -A.f * 3.5; }
  else if (info.type === 'twist') { vx = -A.f * 1.4; vy = 1.2; spin = A.f * 7; }
  else { vx = info.dir * 1.6; vy = 0; spin = -info.dir * 2.5; }
  bout.ragdoll = new Ragdoll(pose, vx, vy, spin, cx, cy);
  bout.ragdollSide = id;
}

// ---------- bout flow ----------
function onEvent(ev) {
  if (!ev) return;
  if (ev.kind === 'blocked') {
    sound.slap();
    callout('BLOCKED', `${TECH[ev.type].ko} · ${TECH[ev.type].en}`, 900);
    return;
  }
  if (ev.kind === 'throw') {
    bout.phase = 'throw';
    bout.phaseT = 0;
    bout.throwInfo = ev;
    sound.heave();
    cheer = Math.max(cheer, 0.6);
    if (ev.reversal) { flash(); callout('REVERSAL!', `되치기 · ${TECH[ev.type].ko}`, 1400); timeScale = 0.35; slowT = 0.7; }
    return;
  }
  if (ev.kind === 'fall') {
    const loser = ev.loser, winner = bout.match.w[1 - loser.side];
    bout.throwInfo = { kind: 'fall', attacker: winner, defender: loser, type: 'fall', dir: ev.dir };
    releaseRagdoll(bout.throwInfo);
    bout.phase = 'fall';
    bout.phaseT = 0;
  }
}

function scorePoint(winnerSide) {
  bout.wins[winnerSide]++;
  updateWins();
  const info = bout.throwInfo;
  const name = info.type === 'fall' ? (info.dir * info.defender.f > 0 ? '밀어치기' : '끌어치기') : TECH[info.type].ko;
  const en = info.type === 'fall' ? (info.dir * info.defender.f > 0 ? 'Pushed over' : 'Pulled down') : TECH[info.type].en;
  const who = twoPlayer ? `P${winnerSide + 1}` : winnerSide === 0 ? 'YOU' : bout.rival.name.toUpperCase();
  callout(`${who} WIN${twoPlayer || winnerSide !== 0 ? 'S' : ''}!`, `${name} · ${en}${info.reversal ? ' · REVERSAL' : ''}`, 2200);
  cheer = 1;
  sound.cheer();
  bout.phase = 'point';
  bout.phaseT = 0;
}

function finishBout() {
  const won = bout.wins[0] > bout.wins[1];
  if (twoPlayer) {
    showEnd(`Player ${won ? 1 : 2} wins the bout`, `${bout.wins[0]} – ${bout.wins[1]}. Bow, shake hands, go again.`);
    return;
  }
  if (!won) {
    showEnd(`${bout.rival.name} keeps the sand`, `You fell in bout ${tourIndex + 1}. Your rival leaned on your habits. Try reading their lean before you strike.`);
    return;
  }
  tourIndex++;
  saveBest(tourIndex);
  if (tourIndex >= RIVALS.length) {
    showEnd('천하장사! Champion of the sand', 'The golden bull is yours. The whole village carries you around the ring.');
    cheer = 1.5;
    sound.cheer();
    return;
  }
  showVs();
}

function showEnd(title, text) {
  mode = 'end';
  $('hud').classList.add('hidden');
  $('endTitle').textContent = title;
  $('endText').textContent = text;
  $('screen-end').classList.remove('hidden');
}

function showVs() {
  mode = 'vs';
  const r = RIVALS[tourIndex];
  $('hud').classList.add('hidden');
  $('vsStep').textContent = `Bout ${tourIndex + 1} of ${RIVALS.length}`;
  $('vsName').textContent = `${r.name} ${r.ko}`;
  $('vsTitle').textContent = r.title;
  $('vsTrait').textContent = r.trait;
  $('screen-vs').classList.remove('hidden');
  setupViews(r);
  bout = null;
}

function loadBest() { try { return Number(localStorage.getItem('sandpit.best') || 0); } catch { return 0; } }
function saveBest(n) { try { if (n > loadBest()) localStorage.setItem('sandpit.best', String(n)); } catch { /* storage unavailable */ } }

// ---------- main update ----------
const FIXED = 1 / 120;
let acc = 0;
function updateBout(dt) {
  const b = bout, m = b.match;
  const [A, B] = m.w;
  b.phaseT += dt;
  if (b.phase === 'intro') {
    const p = Math.min(1, b.phaseT / 1.4);
    const walk = (1 - p) * 2.4;
    poseStanding(poses[0], m, A, B, { armsDown: p < 0.8, crouch: 0.15 + 0.15 * p });
    poseStanding(poses[1], m, B, A, { armsDown: p < 0.8, crouch: 0.15 + 0.15 * p });
    for (let i = 0; i < JOINTS.length; i++) { poses[0][i * 2] -= walk; poses[1][i * 2] += walk; }
    if (b.phaseT > 1.4 && b.phaseT - dt <= 1.4) callout('샅바 잡고…', 'Grip the belt', 900);
    if (b.phaseT > 2.3) { b.phase = 'fight'; b.phaseT = 0; callout('시작!', 'FIGHT', 800); sound.drum(); }
    return;
  }
  if (b.phase === 'fight') {
    b.timer -= dt;
    if (b.timer <= 0 && !m.suddenDeath) { m.suddenDeath = true; callout('SUDDEN DEATH', 'stamina drains', 1200); }
    humanInput(A, 0);
    if (twoPlayer) humanInput(B, 1); else aiThink(b.ai, B, A, dt, rng);
    acc += dt;
    let ev = null;
    while (acc >= FIXED && !ev) { ev = step(m, FIXED, rng); acc -= FIXED; }
    if (Math.abs(m.x) > RING - 1.1) { m.x = 0; m.vx = 0; for (const w of m.w) { w.lean *= 0.3; w.tech = null; } callout('OUT', 'back to the middle', 900); sound.whistle(); }
    poseStanding(poses[0], m, A, B);
    poseStanding(poses[1], m, B, A);
    onEvent(ev);
    return;
  }
  if (b.phase === 'throw') {
    const dur = 0.5;
    const p = Math.min(1, b.phaseT / dur);
    poseThrow(b.throwInfo, p);
    if (p >= 1) {
      releaseRagdoll(b.throwInfo);
      b.phase = 'fall';
      b.phaseT = 0;
    }
    return;
  }
  if (b.phase === 'fall') {
    const info = b.throwInfo;
    // the winner holds the follow-through pose
    const ia = info.attacker.side;
    if (info.type !== 'fall') poseThrow(info, 1); else poseStanding(poses[ia], m, info.attacker, info.defender, { armsDown: true, crouch: 0.2 });
    b.ragdoll.step(dt, RING);
    poses[b.ragdollSide].set(b.ragdoll.p);
    if (b.ragdoll.touched) {
      const px = b.ragdoll.p[2 * 2];
      sandBurst(px, 0.1, b.ragdollSide ? -0.14 : 0.14, 60, 3.5);
      sound.thud();
      shake = 0.5;
      timeScale = 0.25; slowT = 1.0;
      scorePoint(ia);
    }
    if (b.phaseT > 3) { // landed on its feet somehow: call it a fall anyway
      scorePoint(ia);
    }
    return;
  }
  if (b.phase === 'point') {
    const info = b.throwInfo;
    const ia = info.attacker.side;
    if (info.type !== 'fall') poseThrow(info, 1);
    b.ragdoll.step(dt, RING);
    poses[b.ragdollSide].set(b.ragdoll.p);
    if (b.phaseT > 2.6) {
      if (b.wins[0] >= 2 || b.wins[1] >= 2) { mode = 'bout-end'; setTimeout(finishBout, 300); }
      else newRound();
    }
    return;
  }
}

// ---------- camera ----------
let shake = 0;
const camPos = new THREE.Vector3(0, 2.4, 9);
const camLook = new THREE.Vector3(0, 1, 0);
function updateCamera(dt, t) {
  let tx = 0, ty = 1.1, dist = 7.2;
  if (bout && bout.match) {
    tx = bout.match.x;
    if ((bout.phase === 'fall' || bout.phase === 'point' || bout.phase === 'throw') && bout.ragdoll) { tx = (bout.ragdoll.p[4] + bout.match.x) / 2; dist = 5.6; ty = 0.9; }
    else if (bout.phase === 'throw') dist = 5.8;
  } else if (mode === 'title' || mode === 'vs' || mode === 'end') {
    tx = Math.sin(t * 0.15) * 1.5; dist = 8.5; ty = 1.4;
  }
  camLook.x = damp(camLook.x, tx, 5, dt); camLook.y = damp(camLook.y, ty, 5, dt);
  camPos.x = damp(camPos.x, tx * 0.85, 4, dt); camPos.y = damp(camPos.y, ty + 1.3, 4, dt); camPos.z = damp(camPos.z, dist, 4, dt);
  shake = Math.max(0, shake - dt * 1.5);
  camera.position.set(camPos.x + (rng() - 0.5) * shake * 0.2, camPos.y + (rng() - 0.5) * shake * 0.2, camPos.z);
  camera.lookAt(camLook);
}

// ---------- HUD ----------
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none';
document.body.appendChild(overlay);
const tags = [0, 1].map(() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;transform:translate(-50%,-100%);text-align:center;font-weight:900;white-space:nowrap'; overlay.appendChild(d); return d; });
const v3 = new THREE.Vector3();
function updateHud() {
  if (!bout || !bout.match || mode !== 'bout') { tags.forEach((t) => { t.innerHTML = ''; }); return; }
  const m = bout.match;
  $('p1Stam').style.width = `${m.w[0].stamina}%`;
  $('p2Stam').style.width = `${m.w[1].stamina}%`;
  $('timer').textContent = m.suddenDeath ? '!!' : Math.max(0, Math.ceil(bout.timer));
  m.w.forEach((w, i) => {
    const pose = poses[i];
    v3.set(pose[0], pose[1] + 0.55, i ? -0.14 : 0.14).project(camera);
    const x = (v3.x * 0.5 + 0.5) * window.innerWidth, y = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    const tag = tags[i];
    tag.style.left = `${x}px`; tag.style.top = `${y}px`;
    if (bout.phase !== 'fight') { tag.innerHTML = ''; return; }
    // balance gauge: where this wrestler's weight is
    const lean = Math.max(-1, Math.min(1, w.lean));
    const pos = 50 + lean * w.f * 46;
    const danger = Math.abs(w.lean) > 0.8;
    let html = `<div style="width:90px;height:10px;border:2px solid #1f1a14;border-radius:6px;background:linear-gradient(90deg,#d6322a 0 12%,#fff6e0 12% 88%,#d6322a 88%);position:relative;margin:0 auto"><div style="position:absolute;top:-4px;left:${pos}%;width:6px;height:14px;margin-left:-3px;background:#1f1a14;border-radius:3px"></div></div>`;
    if (w.tech) html = `<div style="font-size:22px;color:#d6322a;-webkit-text-stroke:1px #1f1a14">${TECH[w.tech.type].ko}!</div>` + html;
    const o = m.w[1 - i];
    const human = i === 1 ? true : twoPlayer; // show the opening above the rival of a human
    if (!w.tech && (i === 1 || twoPlayer)) {
      // which move would work on this wrestler right now
      let best = null, bv = 0.6;
      for (const t of Object.keys(TECH)) { const v = vulnerability(w, t); if (v > bv) { bv = v; best = t; } }
      if (best && (!twoPlayer || i === 1)) html = `<div style="font-size:15px;background:#fff6e0;border:2px solid #1f1a14;border-radius:8px;padding:1px 6px;margin-bottom:3px">open to <b style="color:#d6322a">${{ lift: 'W', trip: 'S', twist: 'E' }[best]} ${TECH[best].ko}</b></div>` + html;
    }
    if (o.tech && i === 0 && !twoPlayer) {
      const c = counterOf(o.tech.type);
      html = `<div style="font-size:16px;background:#1f1a14;color:#f2cf7a;border-radius:8px;padding:2px 8px;margin-bottom:3px">reverse with <b>${{ lift: 'W', trip: 'S', twist: 'E' }[c]}</b></div>` + html;
    }
    if (danger) html = `<div style="font-size:14px;color:#d6322a">off balance</div>` + html;
    void human;
    tag.innerHTML = html;
  });
}

// ---------- loop ----------
let last = performance.now();
let elapsed = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  if (slowT > 0) { slowT -= dt; if (slowT <= 0) timeScale = 1; }
  const gdt = dt * timeScale;
  if (mode === 'bout' && bout) updateBout(gdt);
  else if (mode === 'title' || mode === 'vs' || mode === 'end' || mode === 'bout-end') idlePose(gdt);
  pressed.clear();
  if (views[0]) { views[0].update(poses[0], 1); views[1].update(poses[1], -1); }
  cheer = Math.max(0, cheer - dt * 0.35);
  updateCrowd(elapsed);
  flags.forEach((f) => { f.rotation.y = Math.sin(elapsed * 3 + f.userData.wave) * 0.4; });
  updatePuffs(gdt);
  updateCamera(dt, elapsed);
  updateHud();
  sound.update(cheer);
  renderer.render(scene, camera);
}

// wrestlers circling on the title screen
const idleMatch = { x: 0, vx: 0, w: [makeWrestler(0), makeWrestler(1)] };
function idlePose(dt) {
  if (mode === 'bout-end' && bout) { updateBout(dt); return; }
  const w = idleMatch.w;
  w[0].lean = Math.sin(elapsed * 1.3) * 0.5; w[1].lean = -w[0].lean * 0.8;
  idleMatch.x = Math.sin(elapsed * 0.7) * 0.4;
  poseStanding(poses[0], idleMatch, w[0], w[1]);
  poseStanding(poses[1], idleMatch, w[1], w[0]);
}

// ---------- menus ----------
function startTournament() {
  sound.start();
  twoPlayer = false;
  tourIndex = 0;
  $('screen-title').classList.add('hidden');
  $('screen-end').classList.add('hidden');
  showVs();
}
function startTwoPlayer() {
  sound.start();
  twoPlayer = true;
  $('screen-title').classList.add('hidden');
  $('screen-end').classList.add('hidden');
  mode = 'bout';
  $('hud').classList.remove('hidden');
  newBout(null);
}
$('btnTour').addEventListener('click', startTournament);
$('btn2p').addEventListener('click', startTwoPlayer);
$('btnFight').addEventListener('click', () => {
  $('screen-vs').classList.add('hidden');
  $('hud').classList.remove('hidden');
  mode = 'bout';
  newBout(RIVALS[tourIndex]);
});
$('btnAgain').addEventListener('click', () => {
  $('screen-end').classList.add('hidden');
  if (twoPlayer) startTwoPlayer();
  else if (tourIndex >= RIVALS.length) startTournament();
  else showVs();
});
$('btnMenu').addEventListener('click', () => { location.reload(); });

setupViews(RIVALS[4]);
{
  const best = loadBest();
  if (best) $('bestLine').textContent = best >= RIVALS.length ? 'You have already won the golden bull.' : `Best run: beat ${best} of ${RIVALS.length} wrestlers`;
}
requestAnimationFrame(frame);

window.__sandpit = { get bout() { return bout; }, get mode() { return mode; }, startTournament, fight: () => $('btnFight').click(), RIVALS, setTour(i) { tourIndex = i; } };
