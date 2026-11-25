import * as THREE from 'three';

// Low-poly models built from primitives. Colors are chosen to read well both as
// ink (by value) and when the night is painted back (by hue).

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const basic = (color) => new THREE.MeshBasicMaterial({ color });

export function makePlayer() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.35, 10), lam(0xf4efe4));
  robe.position.y = 0.68;
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 10), lam(0x2f5fb3));
  sash.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), lam(0xe8c9a6));
  head.position.y = 1.55;
  // gat: the wide-brimmed horsehair hat
  const hatMat = lam(0x15120f, { transparent: true, opacity: 0.92 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 20), hatMat); brim.position.y = 1.72;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.36, 14), hatMat); crown.position.y = 1.9;
  const body = new THREE.Group(); body.add(robe, sash, head, brim, crown);
  g.add(body);
  // lantern on a short pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5), lam(0x4a3426));
  pole.position.set(0.45, 1.25, 0.1); pole.rotation.z = -0.5;
  const lant = new THREE.Group();
  const silkTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 10), lam(0xd8322a)); silkTop.position.y = 0.17;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.28, 10), basic(0xffb347));
  const silkBot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 10), lam(0x2f5fb3)); silkBot.position.y = -0.17;
  lant.add(silkTop, core, silkBot);
  lant.position.set(0.78, 1.55, 0.12);
  g.add(pole, lant);
  g.userData = { body, lant, core };
  return g;
}

function eyes(group, y, z, spread, size = 0.07) {
  const m = basic(0xff2a1a);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 5), m);
    e.position.set(s * spread, y, z);
    group.add(e);
  }
}

export function makeWisp() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), lam(0x2b3b8f, { emissive: 0x0a0f2a }));
  body.scale.set(1, 1.15, 1); body.position.y = 0.9;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 8), lam(0x2b3b8f));
  tail.rotation.x = Math.PI; tail.position.y = 0.35;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), basic(0x6fd0ff));
  flame.position.y = 1.45;
  g.add(body, tail, flame);
  eyes(g, 0.98, 0.36, 0.14);
  g.userData.bob = body;
  return g;
}

export function makeBrute(skin = 0xb8322a, scale = 1) {
  const g = new THREE.Group();
  const skinM = lam(skin);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.3, 9), skinM); torso.position.y = 1.05;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), skinM); belly.position.y = 0.85; belly.scale.set(1, 0.9, 0.9);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), skinM); head.position.y = 2.0;
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 7), lam(0xf2d27a)); horn.position.y = 2.55;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), lam(0x1d1a17)); hair.position.y = 2.05;
  const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 0.5, 9), lam(0xe0b33a)); pants.position.y = 0.3;
  // stripes on the tiger-skin pants are suggested by dark rings
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 4, 14), lam(0x1d1a17)); stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.32;
  const club = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1.5, 7), lam(0x6b4a32)); shaft.position.y = 0.6;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 6), lam(0x6b4a32)); knob.position.y = 1.35;
  club.add(shaft, knob);
  club.position.set(0.8, 1.1, 0.1); club.rotation.z = -0.4;
  g.add(torso, belly, head, horn, hair, pants, stripe, club);
  eyes(g, 2.05, 0.42, 0.18, 0.09);
  g.scale.setScalar(scale);
  g.userData.club = club;
  return g;
}

export function makeShade() {
  const g = new THREE.Group();
  const m = lam(0x0f0d0b, { transparent: true, opacity: 0.88 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 9, 1, true), m); body.position.y = 0.9;
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), m); hood.position.y = 1.75;
  const arms = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 5, 12, Math.PI), m); arms.position.y = 1.2; arms.rotation.x = 0.3;
  g.add(body, hood, arms);
  eyes(g, 1.76, 0.3, 0.12, 0.06);
  g.userData.body = body;
  return g;
}

export function makeFox(scale = 1, tails = 3) {
  const g = new THREE.Group();
  const fur = lam(0xf2efe6);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 8), fur); body.rotation.x = Math.PI / 2; body.position.y = 0.7;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), fur); head.rotation.x = Math.PI / 2; head.position.set(0, 0.95, 0.75);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), fur); ear.position.set(s * 0.15, 1.25, 0.6); g.add(ear);
  }
  const tailGroup = new THREE.Group();
  for (let t = 0; t < tails; t++) {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 7), lam(0xf2efe6, { emissive: 0x331a00 }));
    const a = (t - (tails - 1) / 2) * 0.35;
    tail.position.set(Math.sin(a) * 0.4, 1.1, -0.75); tail.rotation.set(-0.9, 0, -a * 1.4);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), basic(0xff6a1f)); tip.position.y = 0.55; tail.add(tip);
    tailGroup.add(tail);
  }
  g.add(body, head, tailGroup);
  eyes(g, 1.05, 0.95, 0.11, 0.055);
  g.scale.setScalar(scale);
  g.userData.tails = tailGroup;
  return g;
}

export function makeNightKing() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 12), lam(0x1a1626)); robe.position.y = 2.1;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 6, 16), lam(0xa2301f)); collar.rotation.x = Math.PI / 2; collar.position.y = 3.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), lam(0x2b3b8f)); head.position.y = 4.4;
  const crown = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), lam(0xf2d27a));
    const a = (i - 2) * 0.38; h.position.set(Math.sin(a) * 0.55, 5.1 - Math.abs(i - 2) * 0.12, Math.cos(a) * 0.1); h.rotation.z = -a * 0.6;
    crown.add(h);
  }
  const mask = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.2), lam(0xefe6d2)); mask.position.set(0, 4.35, 0.68);
  g.add(robe, collar, head, crown, mask);
  eyes(g, 4.45, 0.8, 0.25, 0.12);
  // floating ink orbs around the king
  const orbs = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lam(0x0f0d0b));
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), basic(0xff2a1a)); o.add(f); f.position.z = 0.25;
    orbs.add(o);
  }
  g.add(orbs);
  g.userData.orbs = orbs;
  return g;
}

export function makeSeed() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), basic(0xffa133));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.35 }));
  m.add(halo);
  return m;
}

export function makeInkOrb() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lam(0x0f0d0b));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), basic(0xff2a1a));
  m.add(core);
  return m;
}

export function makeMote() {
  return new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), basic(0xffc85a));
}

export function makeFirefly() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), basic(0xd6ff6a));
  return m;
}

export function makeRing() {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xff3a22, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function makePointer() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5); s.lineTo(0.28, -0.2); s.lineTo(0, -0.05); s.lineTo(-0.28, -0.2); s.lineTo(0, 0.5);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group(); g.add(m);
  return g;
}

// pooled points for embers and ink splashes
export class Particles {
  constructor(scene, max, color, size, additive) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -100;
  }
  emit(x, y, z, n, speed, up = 2, life = 0.8) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * s; this.vel[i * 3 + 1] = up * (0.5 + Math.random()); this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.life[i] = life * (0.6 + Math.random() * 0.6);
    }
  }
  update(dt, gravity = -4) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -100; continue; }
      this.vel[i * 3 + 1] += gravity * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] = Math.max(0.05, this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3] *= 0.97; this.vel[i * 3 + 2] *= 0.97;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
  clear() { this.life.fill(0); for (let i = 0; i < this.max; i++) this.pos[i * 3 + 1] = -100; this.geo.attributes.position.needsUpdate = true; }
}
