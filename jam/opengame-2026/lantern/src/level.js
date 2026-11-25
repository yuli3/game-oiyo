import * as THREE from 'three';
import { makeRng } from './rng.js';

export const CELL = 3;
export const OPEN = 0, HOUSE = 1, BORDER = 2, WALL = 3, TREES = 4;

export const DISTRICTS = [
  { name: 'Village', ko: '마을', wall: 0xe9e1cf, beam: 0x6b4a32, roof: 0x3d4652, ground: 0xa9b28a, street: 0xcfc4ab, tree: 0x2f5a35, accent: 0xd9442b, fruit: 0xf08a1c },
  { name: 'Night Market', ko: '저잣거리', wall: 0xeadbc0, beam: 0x7a3b22, roof: 0x34404c, ground: 0xb0ad88, street: 0xc8b996, tree: 0x3a6a3a, accent: 0x2f5fb3, fruit: 0xe0402a },
  { name: 'Palace', ko: '궁궐', wall: 0xf1e8d6, beam: 0xa2301f, roof: 0x2b3a44, ground: 0xa3b090, street: 0xd9d0bd, tree: 0x2e5e45, accent: 0x1f8f6f, fruit: 0xf2b21c },
];

export function districtFor(stage) {
  return DISTRICTS[Math.min(2, Math.floor((stage - 1) / 4))];
}
export const isBossStage = (stage) => stage % 4 === 0;

export function generateLevel(stage, seed) {
  const rng = makeRng(seed * 7919 + stage * 104729);
  const boss = isBossStage(stage);
  const N = boss ? 17 : Math.min(25, 15 + Math.floor(stage / 2) * 2 + (stage > 1 ? 2 : 0));
  const grid = new Uint8Array(N * N).fill(HOUSE);
  const idx = (i, j) => j * N + i;
  for (let i = 0; i < N; i++) { grid[idx(i, 0)] = BORDER; grid[idx(i, N - 1)] = BORDER; grid[idx(0, i)] = BORDER; grid[idx(N - 1, i)] = BORDER; }

  const center = (N - 1) / 2;
  let start;
  if (boss) {
    for (let j = 3; j < N - 3; j++) for (let i = 3; i < N - 3; i++) grid[idx(i, j)] = OPEN;
    // a few ruined pillars of trees inside the arena
    for (const [i, j] of [[5, 5], [N - 6, 5], [5, N - 6], [N - 6, N - 6]]) grid[idx(i, j)] = TREES;
    // short alleys from arena to edge give the boss fight a little flank space
    for (const [i, j] of [[center, 2], [center, N - 3], [2, center], [N - 3, center]]) grid[idx(i, j)] = OPEN;
    start = { i: center, j: N - 4 };
  } else {
    // recursive-backtracker maze on odd nodes
    const stack = [[1 + 2 * Math.floor(rng() * ((N - 1) / 2)), 1 + 2 * Math.floor(rng() * ((N - 1) / 2))]];
    grid[idx(stack[0][0], stack[0][1])] = OPEN;
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (stack.length) {
      const [ci, cj] = stack[stack.length - 1];
      const options = rng.shuffle(dirs.slice()).filter(([di, dj]) => {
        const ni = ci + di, nj = cj + dj;
        return ni > 0 && nj > 0 && ni < N - 1 && nj < N - 1 && grid[idx(ni, nj)] === HOUSE;
      });
      if (!options.length) { stack.pop(); continue; }
      const [di, dj] = options[0];
      grid[idx(ci + di / 2, cj + dj / 2)] = OPEN;
      grid[idx(ci + di, cj + dj)] = OPEN;
      stack.push([ci + di, cj + dj]);
    }
    // braid: open extra connections so the district has loops (kiting room)
    const loopChance = 0.22 + Math.min(0.12, stage * 0.01);
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      if (grid[idx(i, j)] !== HOUSE) continue;
      const h = (i % 2 === 0 && j % 2 === 1), v = (i % 2 === 1 && j % 2 === 0);
      if ((h || v) && rng() < loopChance) grid[idx(i, j)] = OPEN;
    }
    // plazas
    const plazaCount = 2 + Math.floor(N / 12);
    for (let p = 0; p < plazaCount; p++) {
      const pi = 2 + Math.floor(rng() * (N - 5)), pj = 2 + Math.floor(rng() * (N - 5));
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) grid[idx(pi + di, pj + dj)] = OPEN;
    }
    // start plaza near the middle-bottom
    const si = Math.round(center) | 1, sj = (N - 3) | 1;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = si + di, jj = Math.min(N - 2, sj + dj);
      grid[idx(ii, jj)] = OPEN;
    }
    start = { i: si, j: Math.min(N - 2, sj) };
    // dress blocked cells: houses, low walls, tree groves
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      if (grid[idx(i, j)] !== HOUSE) continue;
      const r = rng();
      if (r < 0.14) grid[idx(i, j)] = TREES;
      else if (r < 0.26) grid[idx(i, j)] = WALL;
    }
  }

  const open = [];
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) if (grid[idx(i, j)] === OPEN) open.push([i, j]);

  // flood fill from start to keep only reachable open cells
  const reach = new Int32Array(N * N).fill(-1);
  const q = [[start.i, start.j]]; reach[idx(start.i, start.j)] = 0;
  while (q.length) {
    const [ci, cj] = q.shift();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (grid[idx(ni, nj)] === OPEN && reach[idx(ni, nj)] < 0) { reach[idx(ni, nj)] = reach[idx(ci, cj)] + 1; q.push([ni, nj]); }
    }
  }
  const reachable = open.filter(([i, j]) => reach[idx(i, j)] >= 0);

  // stone lanterns: farthest point sampling from start, spread out
  const lanternCount = boss ? 4 : Math.min(7, 3 + Math.floor((stage + 1) / 2));
  const lanterns = [];
  if (boss) {
    for (const [i, j] of [[4, 4], [N - 5, 4], [4, N - 5], [N - 5, N - 5]]) lanterns.push({ i, j });
  } else {
    const chosen = [[start.i, start.j]];
    for (let n = 0; n < lanternCount; n++) {
      let best = null, bestD = -1;
      for (const c of reachable) {
        let d = Infinity;
        for (const s of chosen) d = Math.min(d, Math.hypot(c[0] - s[0], c[1] - s[1]));
        d += rng() * 1.5;
        if (d > bestD) { bestD = d; best = c; }
      }
      chosen.push(best);
      lanterns.push({ i: best[0], j: best[1] });
    }
  }

  // exit gate: border cell next to a reachable open cell, far from start
  let gate = null, gateD = -1;
  if (!boss) {
    for (let k = 1; k < N - 1; k++) {
      for (const [bi, bj, oi, oj, dir] of [[k, 0, k, 1, 'n'], [k, N - 1, k, N - 2, 's'], [0, k, 1, k, 'w'], [N - 1, k, N - 2, k, 'e']]) {
        const r = reach[idx(oi, oj)];
        if (r < 0) continue;
        const d = r + rng() * 3;
        if (d > gateD) { gateD = d; gate = { i: bi, j: bj, oi, oj, dir }; }
      }
    }
    grid[idx(gate.i, gate.j)] = BORDER; // gate stays closed until all lanterns are lit
  }

  // hanging cheongsachorong lanterns on house faces along streets
  const chorongs = [];
  for (const [i, j] of reachable) {
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (grid[idx(i + di, j + dj)] === HOUSE && rng() < 0.16) chorongs.push({ i, j, di, dj, red: rng() < 0.5 });
    }
  }

  return { stage, boss, N, grid, idx, start, lanterns, gate, chorongs, reachable, seed, district: districtFor(stage) };
}

export function cellToWorld(level, i, j) {
  const c = (level.N - 1) / 2;
  return { x: (i - c) * CELL, z: (j - c) * CELL };
}
export function worldToCell(level, x, z) {
  const c = (level.N - 1) / 2;
  return { i: Math.round(x / CELL + c), j: Math.round(z / CELL + c) };
}
export function isBlocked(level, i, j) {
  if (i < 0 || j < 0 || i >= level.N || j >= level.N) return true;
  return level.grid[level.idx(i, j)] !== OPEN;
}

// ---------- meshes ----------
function hanokRoofGeometry(width, height, length) {
  const s = new THREE.Shape();
  const w = width / 2;
  s.moveTo(-w, 0);
  s.quadraticCurveTo(-w * 0.55, height * 0.12, -w * 0.18, height * 0.88);
  s.lineTo(0, height);
  s.lineTo(w * 0.18, height * 0.88);
  s.quadraticCurveTo(w * 0.55, height * 0.12, w, 0);
  s.quadraticCurveTo(w * 0.85, height * 0.12, w * 0.7, height * 0.08);
  s.lineTo(-w * 0.7, height * 0.08);
  s.quadraticCurveTo(-w * 0.85, height * 0.12, -w, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -length / 2);
  return g;
}

function groundTexture(level, d) {
  const px = 24;
  const cv = document.createElement('canvas');
  cv.width = cv.height = level.N * px;
  const g = cv.getContext('2d');
  const rng = makeRng(level.seed + 11);
  const col = (hex, k) => {
    const c = new THREE.Color(hex).multiplyScalar(k);
    return `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`;
  };
  for (let j = 0; j < level.N; j++) for (let i = 0; i < level.N; i++) {
    const open = level.grid[level.idx(i, j)] === OPEN;
    g.fillStyle = col(open ? d.street : d.ground, 0.97 + rng() * 0.06);
    g.fillRect(i * px, j * px, px, px);
    if (open) {
      // flagstones
      for (let k = 0; k < 4; k++) {
        g.fillStyle = col(d.street, 0.9 + rng() * 0.14);
        const sx = i * px + rng() * px * 0.7, sy = j * px + rng() * px * 0.7;
        g.fillRect(sx, sy, px * (0.2 + rng() * 0.25), px * (0.2 + rng() * 0.25));
      }
    } else {
      for (let k = 0; k < 6; k++) {
        g.fillStyle = col(0x4d6b3a, 0.7 + rng() * 0.4);
        g.fillRect(i * px + rng() * px, j * px + rng() * px, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

let roofTex = null;
function roofTexture() {
  if (roofTex) return roofTex;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  // rows of curved giwa tiles: dark seams every 8px
  for (let x = 0; x < 64; x += 8) { g.fillStyle = '#4a4a4a'; g.fillRect(x, 0, 3, 64); g.fillStyle = '#e8e8e8'; g.fillRect(x + 4, 0, 2, 64); }
  for (let y = 0; y < 64; y += 16) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, 64, 2); }
  roofTex = new THREE.CanvasTexture(cv);
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
  roofTex.repeat.set(0.9, 0.9);
  roofTex.colorSpace = THREE.SRGBColorSpace;
  return roofTex;
}

let strawTex = null;
function strawTexture() {
  if (strawTex) return strawTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  for (let n = 0; n < 220; n++) { g.strokeStyle = `rgba(90,70,30,${0.1 + Math.random() * 0.25})`; const x = Math.random() * 64, y = Math.random() * 64; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y + 6 + Math.random() * 6); g.stroke(); }
  // rope net that ties the thatch down
  g.strokeStyle = 'rgba(70,50,20,0.55)'; g.lineWidth = 1.5;
  for (let x = 0; x < 64; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
  strawTex = new THREE.CanvasTexture(cv);
  strawTex.wrapS = strawTex.wrapT = THREE.RepeatWrapping;
  strawTex.repeat.set(3, 1);
  strawTex.colorSpace = THREE.SRGBColorSpace;
  return strawTex;
}

let awnTex = null;
function awningTexture() {
  if (awnTex) return awnTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  const cols = ['#c8322a', '#f2e6cc', '#2f5fb3', '#f2e6cc'];
  for (let x = 0; x < 32; x += 4) { g.fillStyle = cols[(x / 4) % 4]; g.fillRect(x, 0, 4, 32); }
  awnTex = new THREE.CanvasTexture(cv);
  awnTex.colorSpace = THREE.SRGBColorSpace;
  return awnTex;
}

export function buildLevelMeshes(level) {
  const d = level.district;
  const group = new THREE.Group();
  const rng = makeRng(level.seed + 99);
  const N = level.N;
  const size = N * CELL;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size + 60, size + 60), new THREE.MeshLambertMaterial({ color: 0xe6dccb }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02;
  group.add(ground);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: groundTexture(level, d) }));
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);

  const cells = { house: [], wall: [], trees: [], border: [] };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = level.grid[level.idx(i, j)];
    if (t === HOUSE) cells.house.push([i, j]);
    else if (t === WALL) cells.wall.push([i, j]);
    else if (t === TREES) cells.trees.push([i, j]);
    else if (t === BORDER && !(level.gate && level.gate.i === i && level.gate.j === j)) cells.border.push([i, j]);
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const color = new THREE.Color();
  const yAxis = new THREE.Vector3(0, 1, 0);

  // houses: stone base, plaster body, wooden posts, and a roof whose style
  // depends on the district: thatched choga in the village, tiled giwa with
  // striped awnings in the market, painted dancheong eaves in the palace.
  const nH = cells.house.length;
  const baseM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x9a948a }), nH);
  const bodyM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), nH);
  const postM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: d.beam }), nH * 4);
  const bandM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), nH);
  const roofM = new THREE.InstancedMesh(hanokRoofGeometry(CELL * 1.36, 1.25, CELL * 1.04), new THREE.MeshLambertMaterial({ color: 0xffffff, map: roofTexture() }), nH);
  const ridgeM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xe8e2d6 }), nH);
  const chogaM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff, map: strawTexture() }), nH);
  const awnM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, map: awningTexture() }), nH);
  const jarM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 9, 7), new THREE.MeshLambertMaterial({ color: 0x5a3a26 }), nH * 3);
  let k = 0, kp = 0, kr = 0, kc = 0, ka = 0, kj = 0;
  const style = level.stage <= 4 ? 'village' : level.stage <= 8 ? 'market' : 'palace';
  for (const [i, j] of cells.house) {
    const p = cellToWorld(level, i, j);
    const choga = style === 'village' && rng() < 0.55;
    const hBody = choga ? 1.3 + rng() * 0.3 : style === 'palace' ? 1.9 + rng() * 0.5 : 1.6 + rng() * 0.5;
    const horiz = (!isBlocked(level, i, j - 1) || !isBlocked(level, i, j + 1)) ? true : (isBlocked(level, i - 1, j) && isBlocked(level, i + 1, j));
    const rot = horiz ? 0 : Math.PI / 2;
    q.setFromAxisAngle(yAxis, rot);
    m4.compose(v.set(p.x, 0.2, p.z), q, sc.set(CELL * 0.96, 0.4, CELL * 0.96)); baseM.setMatrixAt(k, m4);
    const bw = choga ? 0.74 : 0.86;
    m4.compose(v.set(p.x, 0.4 + hBody / 2, p.z), q, sc.set(CELL * bw, hBody, CELL * bw)); bodyM.setMatrixAt(k, m4);
    bodyM.setColorAt(k, color.set(choga ? 0xd9c7a2 : d.wall).multiplyScalar(0.92 + rng() * 0.1));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      m4.compose(v.set(p.x + sx * CELL * bw / 2, 0.4 + hBody / 2, p.z + sz * CELL * bw / 2), q, sc.set(0.2, hBody, 0.2)); postM.setMatrixAt(kp++, m4);
    }
    // painted band under the eaves (green dancheong in the palace, wood elsewhere)
    m4.compose(v.set(p.x, 0.4 + hBody - 0.12, p.z), q, sc.set(CELL * (bw + 0.02), 0.24, CELL * (bw + 0.02))); bandM.setMatrixAt(k, m4);
    bandM.setColorAt(k, color.set(style === 'palace' ? 0x1f8f6f : d.beam));
    const ry = 0.4 + hBody;
    if (choga) {
      m4.compose(v.set(p.x, ry - 0.1, p.z), q, sc.set(CELL * 0.62, 1.05 + rng() * 0.2, CELL * 0.62)); chogaM.setMatrixAt(kc, m4);
      chogaM.setColorAt(kc++, color.set(0xd8b46a).multiplyScalar(0.88 + rng() * 0.2));
    } else {
      m4.compose(v.set(p.x, ry, p.z), new THREE.Quaternion().setFromAxisAngle(yAxis, rot + Math.PI / 2), sc.set(1, style === 'palace' ? 1.25 : 1, 1)); roofM.setMatrixAt(kr, m4);
      roofM.setColorAt(kr, color.set(d.roof).multiplyScalar(1.5 + rng() * 0.3));
      const rh = style === 'palace' ? 1.56 : 1.25;
      m4.compose(v.set(p.x, ry + rh, p.z), q, sc.set(horiz ? CELL * 1.05 : 0.26, 0.24, horiz ? 0.26 : CELL * 1.05)); ridgeM.setMatrixAt(kr, m4);
      kr++;
    }
    // market stalls: a striped awning over the street side
    if (style === 'market') {
      for (const [di, dj] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (isBlocked(level, i + di, j + dj) || rng() < 0.35) continue;
        const ax = p.x + di * CELL * 0.62, az = p.z + dj * CELL * 0.62;
        const aq = new THREE.Quaternion().setFromEuler(new THREE.Euler(dj * 0.35, 0, -di * 0.35));
        m4.compose(v.set(ax, 1.5, az), aq, sc.set(di ? 0.9 : CELL * 0.8, 0.06, dj ? 0.9 : CELL * 0.8)); awnM.setMatrixAt(ka, m4);
        awnM.setColorAt(ka++, color.set(rng() < 0.5 ? 0xffffff : 0xffe6b0));
        break;
      }
    }
    // jangdokdae: clusters of onggi jars beside village houses
    if (style !== 'palace' && rng() < 0.35) {
      for (const [di, dj] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (isBlocked(level, i + di, j + dj)) continue;
        for (let n = 0; n < 3; n++) {
          const jx = p.x + di * CELL * 0.62 + (dj ? (n - 1) * 0.6 : 0), jz = p.z + dj * CELL * 0.62 + (di ? (n - 1) * 0.6 : 0);
          m4.compose(v.set(jx, 0.32, jz), q.identity(), sc.set(1, 1.15 - n * 0.12, 1)); jarM.setMatrixAt(kj++, m4);
        }
        break;
      }
    }
    k++;
  }
  roofM.count = kr; ridgeM.count = kr; chogaM.count = kc; awnM.count = ka; jarM.count = kj;
  for (const im of [baseM, bodyM, postM, bandM, roofM, ridgeM, chogaM, awnM, jarM]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); }

  // low stone walls with tile caps
  const wallCells = cells.wall;
  const nW = wallCells.length;
  if (nW) {
    const wallM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xb9b0a0 }), nW);
    const capM = new THREE.InstancedMesh(hanokRoofGeometry(CELL * 0.55, 0.35, CELL * 0.98), new THREE.MeshLambertMaterial({ color: d.roof }), nW * 2);
    let kc = 0;
    wallCells.forEach(([i, j], n) => {
      const p = cellToWorld(level, i, j);
      m4.compose(v.set(p.x, 0.6, p.z), q.identity(), sc.set(CELL * 0.9, 1.2, CELL * 0.9)); wallM.setMatrixAt(n, m4);
      wallM.setColorAt(n, color.set(0xb9b0a0).multiplyScalar(0.85 + rng() * 0.2));
      for (const off of [-0.25, 0.25]) {
        m4.compose(v.set(p.x, 1.2, p.z + off * CELL), new THREE.Quaternion().setFromAxisAngle(yAxis, Math.PI / 2), sc.set(1, 1, 1)); capM.setMatrixAt(kc++, m4);
      }
    });
    wallM.instanceMatrix.needsUpdate = true; capM.instanceMatrix.needsUpdate = true; if (wallM.instanceColor) wallM.instanceColor.needsUpdate = true;
    group.add(wallM, capM);
  }

  // groves: pines and persimmon trees
  const treeSpots = [];
  // the district is ringed by a dark pine forest
  for (const [i, j] of cells.border) {
    const p = cellToWorld(level, i, j);
    // the camera looks north, so the southern edge gets low shrubs that never hide the player
    const south = j >= N - 2;
    for (let t = 0; t < (south ? 2 : 3); t++) treeSpots.push({ x: p.x + (rng() - 0.5) * CELL * 0.9, z: p.z + (rng() - 0.5) * CELL * 0.9, s: south ? 0.45 + rng() * 0.15 : 1.1 + rng() * 0.6, persimmon: false });
  }
  for (const [i, j] of cells.trees) {
    const p = cellToWorld(level, i, j);
    const n = 2 + Math.floor(rng() * 2);
    for (let t = 0; t < n; t++) treeSpots.push({ x: p.x + (rng() - 0.5) * CELL * 0.7, z: p.z + (rng() - 0.5) * CELL * 0.7, s: 0.8 + rng() * 0.5, persimmon: rng() < 0.45 });
  }
  if (treeSpots.length) {
    const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 6), new THREE.MeshLambertMaterial({ color: 0x4a3426 }), treeSpots.length);
    const pineM = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshLambertMaterial({ color: 0xffffff }), treeSpots.length * 3);
    const crownM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), treeSpots.length);
    const fruitM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshLambertMaterial({ color: d.fruit, emissive: d.fruit, emissiveIntensity: 0.25 }), treeSpots.length * 7);
    let kpine = 0, kcrown = 0, kf = 0;
    treeSpots.forEach((t, n) => {
      const h = 1.6 * t.s;
      m4.compose(v.set(t.x, h / 2, t.z), q.identity(), sc.set(1, h, 1)); trunkM.setMatrixAt(n, m4);
      if (!t.persimmon) {
        for (let L = 0; L < 3; L++) {
          const r = (1.2 - L * 0.3) * t.s;
          m4.compose(v.set(t.x, h * 0.8 + L * 0.75 * t.s, t.z), q.setFromAxisAngle(yAxis, rng() * 3), sc.set(r, 1.1 * t.s, r)); pineM.setMatrixAt(kpine, m4);
          pineM.setColorAt(kpine++, color.set(d.tree).multiplyScalar(0.8 + rng() * 0.35));
        }
      } else {
        const r = 1.05 * t.s;
        m4.compose(v.set(t.x, h + r * 0.55, t.z), q.identity(), sc.set(r, r * 0.8, r)); crownM.setMatrixAt(kcrown, m4);
        crownM.setColorAt(kcrown++, color.set(0x6b7a3a).multiplyScalar(0.85 + rng() * 0.3));
        for (let f = 0; f < 7; f++) {
          const a = rng() * Math.PI * 2, e = rng() * 0.9;
          m4.compose(v.set(t.x + Math.cos(a) * r * 0.95 * Math.cos(e), h + r * 0.55 + Math.sin(e) * r * 0.6, t.z + Math.sin(a) * r * 0.95 * Math.cos(e)), q.identity(), sc.set(1, 1, 1));
          fruitM.setMatrixAt(kf++, m4);
        }
      }
    });
    pineM.count = kpine; crownM.count = kcrown; fruitM.count = kf;
    for (const im of [trunkM, pineM, crownM, fruitM]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); }
  }

  // hanging cheongsachorong (blue/red silk lanterns)
  if (level.chorongs.length) {
    const chM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x332211 }), level.chorongs.length);
    level.chorongs.forEach((c, n) => {
      const p = cellToWorld(level, c.i, c.j);
      m4.compose(v.set(p.x + c.di * CELL * 0.45, 1.75, p.z + c.dj * CELL * 0.45), q.identity(), sc.set(1, 1, 1)); chM.setMatrixAt(n, m4);
      chM.setColorAt(n, color.set(c.red ? 0xd8322a : 0x2f62c4));
    });
    chM.instanceMatrix.needsUpdate = true; chM.instanceColor.needsUpdate = true;
    group.add(chM);
  }

  return group;
}

export function makeStoneLantern(theme) {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0xa8a299 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.3, 8), stone); base.position.y = 0.15;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.0, 8), stone); pillar.position.y = 0.8;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.18, 8), stone); plate.position.y = 1.36;
  const box = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.55, 8), stone); box.position.y = 1.72;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.42, 8), stone); roof.position.y = 2.2;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), stone); knob.position.y = 2.46;
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x2a2520 });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), flameMat); flame.position.y = 1.72; flame.scale.set(1, 1.3, 1);
  g.add(base, pillar, plate, box, roof, knob, flame);
  g.userData.flame = flame;
  return g;
}

export function makeGate(theme) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0xa2301f });
  const roofMat = new THREE.MeshLambertMaterial({ color: theme.roof });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.4, 10), wood);
    post.position.set(s * 1.2, 1.7, 0); g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.4), wood); beam.position.y = 3.2; g.add(beam);
  const roof = new THREE.Mesh(hanokRoofGeometry(1.8, 0.8, 3.8), roofMat); roof.rotation.y = Math.PI / 2; roof.position.y = 3.35; g.add(roof);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x3a2518 });
  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.9, 0.15), doorMat); doors.position.y = 1.45; g.add(doors);
  g.userData.doors = doors;
  return g;
}
