import * as THREE from 'three';

// Wrestler body: procedural pose from match state, a verlet ragdoll for throws,
// and toon meshes that follow the joints.

export const JOINTS = ['head', 'neck', 'pelvis', 'kneeF', 'footF', 'kneeB', 'footB', 'elbowN', 'handN', 'elbowF', 'handF'];
const J = Object.fromEntries(JOINTS.map((n, i) => [n, i]));
export const BONES = [
  ['head', 'neck'], ['neck', 'pelvis'],
  ['pelvis', 'kneeF'], ['kneeF', 'footF'], ['pelvis', 'kneeB'], ['kneeB', 'footB'],
  ['neck', 'elbowN'], ['elbowN', 'handN'], ['neck', 'elbowF'], ['elbowF', 'handF'],
];
// extra ragdoll braces so the torso does not fold like paper
const BRACES = [['head', 'pelvis'], ['kneeF', 'kneeB'], ['neck', 'kneeF'], ['neck', 'kneeB'], ['handN', 'handF']];
export const LOSE_JOINTS = ['head', 'neck', 'pelvis', 'kneeF', 'kneeB', 'elbowN', 'handN', 'elbowF', 'handF'];
// depth (z) of each joint relative to the body's own plane
const JZ = { head: 0.05, neck: 0, pelvis: 0, kneeF: 0.13, footF: 0.15, kneeB: -0.13, footB: -0.15, elbowN: 0.32, handN: 0.26, elbowF: -0.32, handF: -0.26 };

const THIGH = 0.5, SHIN = 0.5, UPPER = 0.33, FORE = 0.33, TORSO = 0.62;

function ik2(ax, ay, bx, by, l1, l2, bendSign) {
  // two-bone IK in 2D: returns the middle joint between a and b
  const dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 0.001);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx);
  const ang = base + a * bendSign;
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}

// standing grapple pose. p: { x, f, lean, crouch, bend, footShift, gripX, gripY, armsDown }
export function standPose(p, out) {
  const f = p.f;
  const crouch = p.crouch;
  const pelvisY = 0.98 - 0.32 * crouch;
  const lean = p.lean;
  const px = p.x;
  const theta = (p.bend ?? 0.75) + 0.28 * lean; // torso bend from vertical toward the rival
  const nx = px + f * Math.sin(theta) * TORSO, ny = pelvisY + Math.cos(theta) * TORSO;
  const hx = nx + f * Math.sin(theta + 0.35) * 0.26, hy = ny + Math.cos(theta + 0.35) * 0.26;
  // feet stay planted; leaning shifts the hips over the front or back foot
  const spread = 0.34;
  const ffx = p.footFX ?? (px + f * (spread - 0.18 * lean + (p.footShift || 0)));
  const ffy = p.footFY ?? 0.06;
  const fbx = px - f * (spread + 0.18 * lean);
  const [kfx, kfy] = ik2(px, pelvisY, ffx, ffy, THIGH, SHIN, f > 0 ? 1 : -1);
  const [kbx, kby] = ik2(px, pelvisY, fbx, 0.06, THIGH, SHIN, f > 0 ? 1 : -1);
  let hnx, hny, hfx, hfy;
  if (p.armsDown) { hnx = px + f * 0.15; hny = pelvisY + 0.1; hfx = hnx; hfy = hny; }
  else { hnx = p.gripX; hny = p.gripY; hfx = p.gripX; hfy = p.gripY; }
  const [enx, eny] = ik2(nx, ny - 0.05, hnx, hny, UPPER, FORE, f > 0 ? -1 : 1);
  const [efx, efy] = ik2(nx, ny - 0.05, hfx, hfy, UPPER, FORE, f > 0 ? -1 : 1);
  const v = [[hx, hy], [nx, ny], [px, pelvisY], [kfx, kfy], [ffx, ffy], [kbx, kby], [fbx, 0.06], [enx, eny], [hnx, hny], [efx, efy], [hfx, hfy]];
  for (let i = 0; i < v.length; i++) { out[i * 2] = v[i][0]; out[i * 2 + 1] = v[i][1]; }
  return out;
}

export function transformPose(src, out, pivotX, pivotY, angle, tx, ty) {
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let i = 0; i < JOINTS.length; i++) {
    const x = src[i * 2] - pivotX, y = src[i * 2 + 1] - pivotY;
    out[i * 2] = pivotX + x * c - y * s + tx;
    out[i * 2 + 1] = pivotY + x * s + y * c + ty;
  }
  return out;
}

export class Ragdoll {
  constructor(pose, vx, vy, spin, cx, cy) {
    const n = JOINTS.length;
    this.p = new Float32Array(pose);
    this.o = new Float32Array(pose);
    const dt = 1 / 60;
    for (let i = 0; i < n; i++) {
      const rx = this.p[i * 2] - cx, ry = this.p[i * 2 + 1] - cy;
      // linear + angular velocity seeded as previous positions
      this.o[i * 2] = this.p[i * 2] - (vx - ry * spin) * dt;
      this.o[i * 2 + 1] = this.p[i * 2 + 1] - (vy + rx * spin) * dt;
    }
    this.sticks = BONES.concat(BRACES).map(([a, b]) => {
      const ia = J[a], ib = J[b];
      return [ia, ib, Math.hypot(this.p[ia * 2] - this.p[ib * 2], this.p[ia * 2 + 1] - this.p[ib * 2 + 1])];
    });
    this.touched = null;
    this.settle = 0;
  }
  step(dt, ringHalf) {
    const n = JOINTS.length, g = -24, p = this.p, o = this.o;
    for (let i = 0; i < n; i++) {
      const x = p[i * 2], y = p[i * 2 + 1];
      let vx = (x - o[i * 2]) * 0.995, vy = (y - o[i * 2 + 1]) * 0.995;
      o[i * 2] = x; o[i * 2 + 1] = y;
      p[i * 2] = x + vx; p[i * 2 + 1] = y + vy + g * dt * dt;
    }
    for (let it = 0; it < 8; it++) {
      for (const [a, b, len] of this.sticks) {
        const dx = p[b * 2] - p[a * 2], dy = p[b * 2 + 1] - p[a * 2 + 1];
        const d = Math.hypot(dx, dy) || 0.0001, k = (d - len) / d * 0.5;
        p[a * 2] += dx * k; p[a * 2 + 1] += dy * k;
        p[b * 2] -= dx * k; p[b * 2 + 1] -= dy * k;
      }
      for (let i = 0; i < n; i++) {
        const r = i === 0 ? 0.17 : 0.1;
        if (p[i * 2 + 1] < r) {
          p[i * 2 + 1] = r;
          // ground friction
          const vx = p[i * 2] - o[i * 2];
          o[i * 2] = p[i * 2] - vx * 0.6;
          if (!this.touched && LOSE_JOINTS.includes(JOINTS[i])) this.touched = JOINTS[i];
        }
      }
    }
    let ke = 0;
    for (let i = 0; i < n; i++) ke += Math.abs(p[i * 2] - o[i * 2]) + Math.abs(p[i * 2 + 1] - o[i * 2 + 1]);
    this.settle = ke < 0.02 ? this.settle + dt : 0;
  }
}

// ---------- meshes ----------
function toonGradient() {
  const data = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const GRAD = toonGradient();
export const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: GRAD });
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1f1a14, side: THREE.BackSide });

function limbMesh(radius, mat) {
  const g = new THREE.CylinderGeometry(radius, radius, 1, 12, 1);
  g.translate(0, 0.5, 0);
  const m = new THREE.Mesh(g, mat);
  const o = new THREE.Mesh(g, outlineMat); o.scale.set(1.18, 1, 1.18); m.add(o);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), mat);
  const capO = new THREE.Mesh(cap.geometry, outlineMat); capO.scale.setScalar(1.18); cap.add(capO);
  return { m, cap };
}

export class BodyView {
  constructor(scene, opts) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.z = opts.z;
    const skin = toon(opts.skin ?? 0xe2a273);
    const belt = toon(opts.belt);
    const shorts = toon(0xf6f1e4);
    this.limbs = [];
    const radius = { 'head-neck': 0.1, 'neck-pelvis': 0.25, 'pelvis-kneeF': 0.14, 'kneeF-footF': 0.11, 'pelvis-kneeB': 0.14, 'kneeB-footB': 0.11, 'neck-elbowN': 0.1, 'elbowN-handN': 0.09, 'neck-elbowF': 0.1, 'elbowF-handF': 0.09 };
    for (const [a, b] of BONES) {
      const key = `${a}-${b}`;
      const mat = key.startsWith('pelvis') ? shorts : skin;
      const { m, cap } = limbMesh(radius[key] * (opts.bulk ?? 1), mat);
      this.group.add(m, cap);
      this.limbs.push({ a: J[a], b: J[b], m, cap, za: JZ[a], zb: JZ[b] });
    }
    // belly: wrestlers are big
    this.belly = new THREE.Mesh(new THREE.SphereGeometry(0.3 * (opts.bulk ?? 1), 16, 12), skin);
    const bo = new THREE.Mesh(this.belly.geometry, outlineMat); bo.scale.setScalar(1.08); this.belly.add(bo);
    this.group.add(this.belly);
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), skin);
    const ho = new THREE.Mesh(this.head.geometry, outlineMat); ho.scale.setScalar(1.1); this.head.add(ho);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.195, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), toon(0x1f1a14));
    hair.rotation.x = -0.5; this.head.add(hair);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(0x1f1a14)); knot.position.set(0, 0.17, -0.08); this.head.add(knot);
    this.group.add(this.head);
    // satba: the cloth belt around the waist and one thigh
    this.beltWaist = new THREE.Mesh(new THREE.TorusGeometry(0.27 * (opts.bulk ?? 1), 0.07, 8, 20), belt);
    this.beltThigh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 8, 16), belt);
    this.group.add(this.beltWaist, this.beltThigh);
    this.tmp = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }
  update(pose, facing) {
    const z = this.z;
    for (const L of this.limbs) {
      const ax = pose[L.a * 2], ay = pose[L.a * 2 + 1], bx = pose[L.b * 2], by = pose[L.b * 2 + 1];
      const azz = z + L.za * facing, bzz = z + L.zb * facing;
      const dir = this.tmp.set(bx - ax, by - ay, bzz - azz);
      const len = dir.length();
      L.m.position.set(ax, ay, azz);
      L.m.scale.y = len;
      L.m.quaternion.setFromUnitVectors(this.up, dir.normalize());
      L.cap.position.set(bx, by, bzz);
    }
    const px = pose[J.pelvis * 2], py = pose[J.pelvis * 2 + 1], nx = pose[J.neck * 2], ny = pose[J.neck * 2 + 1];
    this.belly.position.set(px + (nx - px) * 0.35, py + (ny - py) * 0.35, z);
    this.head.position.set(pose[0], pose[1], z + JZ.head * facing);
    this.head.rotation.z = Math.atan2(pose[0] - nx, pose[1] - ny) * -1;
    this.head.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.beltWaist.position.set(px, py + 0.05, z);
    this.beltWaist.rotation.set(Math.PI / 2, 0, Math.atan2(nx - px, ny - py) * -1);
    const kx = pose[J.kneeF * 2], ky = pose[J.kneeF * 2 + 1];
    this.beltThigh.position.set(px + (kx - px) * 0.35, py + (ky - py) * 0.35, z + 0.08 * facing);
    this.beltThigh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.tmp.set(kx - px, ky - py, 0).normalize());
  }
}
