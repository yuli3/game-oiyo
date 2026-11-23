import * as THREE from 'three';

// Ink-wash post process.
// The scene is rendered normally into a target with depth. A full screen pass
// rebuilds each pixel's world position from depth, samples the "paint map"
// (where the night has been lit back into color) and mixes between a sumi-e
// ink rendering and the full-color painting. Strong saturated warm colors
// (fire, dokkaebi eyes) are kept as spot color even in the ink.

export const PAINT_RES = 160;

const vert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tPaint;
uniform mat4 uInvViewProj;
uniform vec2 uRes;
uniform vec2 uPaintOrigin;   // world xz of paint map corner
uniform float uPaintSize;    // world size covered by paint map
uniform vec3 uPlayer;        // xz + light radius
uniform vec4 uBursts[8];     // xz, radius, intensity
uniform float uTime;
uniform float uCamNear;
uniform float uCamFar;
uniform float uHurt;
uniform float uDawn;         // 0..1 after clearing a night: everything blooms
uniform vec3 uPaper;
uniform vec3 uInk;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

float linDepth(float d) {
  float z = d * 2.0 - 1.0;
  return (2.0 * uCamNear * uCamFar) / (uCamFar + uCamNear - z * (uCamFar - uCamNear));
}

vec3 worldPos(vec2 uv, float d) {
  vec4 ndc = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 w = uInvViewProj * ndc;
  return w.xyz / w.w;
}

void main() {
  vec2 px = 1.0 / uRes;
  // brush wobble: offset the sampling slightly with low-frequency noise
  vec2 wob = (vec2(fbm(vUv * 9.0 + uTime * 0.05), fbm(vUv * 9.0 + 7.3)) - 0.5) * px * 2.2;
  vec2 uv = vUv + wob;
  vec3 col = texture2D(tColor, uv).rgb;
  float d = texture2D(tDepth, uv).r;
  vec3 wp = worldPos(vUv, d);
  float ld = linDepth(d);

  // edges from depth discontinuities (sobel-ish, scale aware)
  float dl = linDepth(texture2D(tDepth, uv - vec2(px.x, 0.0)).r);
  float dr = linDepth(texture2D(tDepth, uv + vec2(px.x, 0.0)).r);
  float du = linDepth(texture2D(tDepth, uv + vec2(0.0, px.y)).r);
  float dd = linDepth(texture2D(tDepth, uv - vec2(0.0, px.y)).r);
  float edge = (abs(dl - ld) + abs(dr - ld) + abs(du - ld) + abs(dd - ld)) / max(ld, 0.001);
  // color edges as well so flat-shaded forms get brush outlines
  vec3 cl = texture2D(tColor, uv - vec2(px.x, 0.0)).rgb, cu = texture2D(tColor, uv + vec2(0.0, px.y)).rgb;
  float cedge = length(col - cl) + length(col - cu);
  float stroke = smoothstep(0.025, 0.08, edge) + smoothstep(0.18, 0.45, cedge) * 0.7;
  stroke *= 0.65 + 0.6 * fbm(vUv * vec2(60.0, 60.0) + wp.xz * 0.3); // broken brush line
  stroke = clamp(stroke, 0.0, 1.0);

  // paint map (world space memory of light)
  vec2 puv = (wp.xz - uPaintOrigin) / uPaintSize;
  float painted = 0.0;
  if (puv.x > 0.0 && puv.y > 0.0 && puv.x < 1.0 && puv.y < 1.0) painted = texture2D(tPaint, puv).r;
  // live lantern light
  float pd = length(wp.xz - uPlayer.xy);
  float live = 1.0 - smoothstep(uPlayer.z * 0.55, uPlayer.z, pd);
  for (int i = 0; i < 8; i++) {
    vec4 b = uBursts[i];
    if (b.w <= 0.0) continue;
    float bd = length(wp.xz - b.xy);
    live = max(live, (1.0 - smoothstep(b.z * 0.4, b.z, bd)) * b.w);
  }
  // ragged edge between ink and color, like pigment soaking into hanji
  float rag = (fbm(wp.xz * 0.9) - 0.5) * 0.45;
  float mask = clamp(max(painted * 0.92, live) + rag * (1.0 - live), 0.0, 1.0);
  mask = smoothstep(0.25, 0.75, mask);
  mask = max(mask, uDawn);
  bool sky = d >= 0.9999;
  if (sky) mask = 0.0;

  // ink rendering
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float tone = smoothstep(0.015, 0.32, lum);
  float tq = tone * 3.0 + (fbm(wp.xz * 0.35) - 0.5) * 0.5;
  tone = (floor(tq) + smoothstep(0.3, 0.7, fract(tq))) / 3.0;  // soft-edged washes in 3 layers
  tone = pow(tone, 1.35) * 0.92;                            // night: deeper washes
  float fog = smoothstep(18.0, 70.0, ld);
  tone = mix(tone, 1.0, fog * 0.7);
  float paperGrain = fbm(vUv * uRes / 3.0) * 0.08 + fbm(vUv * 6.0) * 0.06;
  vec3 paper = uPaper - paperGrain;
  vec3 ink = mix(uInk, paper, tone);
  ink = mix(ink, uInk, stroke * 0.85);

  // spot color: fire and eyes survive in the ink
  float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b));
  float sat = (mx - mn) / max(mx, 0.0001);
  float spot = smoothstep(0.55, 0.8, sat) * smoothstep(0.55, 0.85, mx) * step(col.b, col.r);
  ink = mix(ink, col * 1.15, spot);

  // color painting: warm, slightly saturated, still outlined with ink
  vec3 painting = col;
  float pl = dot(painting, vec3(0.333));
  float psat = (max(painting.r, max(painting.g, painting.b)) - min(painting.r, min(painting.g, painting.b))) / max(max(painting.r, max(painting.g, painting.b)), 0.001);
  painting = mix(vec3(pl), painting, 1.0 + 0.35 * psat) * 1.04;
  painting = mix(painting, painting * paper / max(uPaper, vec3(0.001)), 0.35);
  painting = mix(painting, uInk * 0.9, stroke * 0.6);

  painting *= 1.22;
  vec3 outc = mix(ink, painting, mask);
  // warm glow of the lantern itself
  float core = 1.0 - smoothstep(0.0, uPlayer.z, pd);
  outc += vec3(1.0, 0.72, 0.38) * 0.09 * core * core;
  if (sky) outc = paper * 0.96;

  // vignette + hurt flash
  vec2 c = vUv - 0.5;
  float vig = smoothstep(0.85, 0.25, length(c * vec2(1.1, 1.0)));
  outc *= mix(0.72, 1.0, vig);
  outc = mix(outc, vec3(0.72, 0.12, 0.08), uHurt * (1.0 - vig) * 0.8);
  gl_FragColor = vec4(outc, 1.0);
  #include <colorspace_fragment>
}
`;

export class InkPipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.target.depthTexture = new THREE.DepthTexture(4, 4);
    this.target.depthTexture.type = THREE.UnsignedIntType;
    this.paintData = new Uint8Array(PAINT_RES * PAINT_RES * 4);
    this.paintTex = new THREE.DataTexture(this.paintData, PAINT_RES, PAINT_RES, THREE.RGBAFormat);
    this.paintTex.magFilter = THREE.LinearFilter;
    this.paintTex.minFilter = THREE.LinearFilter;
    this.paintTex.needsUpdate = true;
    this.bursts = Array.from({ length: 8 }, () => new THREE.Vector4());
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        tPaint: { value: this.paintTex },
        uInvViewProj: { value: new THREE.Matrix4() },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPaintOrigin: { value: new THREE.Vector2() },
        uPaintSize: { value: 1 },
        uPlayer: { value: new THREE.Vector3() },
        uBursts: { value: this.bursts },
        uTime: { value: 0 },
        uCamNear: { value: 0.1 },
        uCamFar: { value: 100 },
        uHurt: { value: 0 },
        uDawn: { value: 0 },
        uPaper: { value: new THREE.Color(0xefe6d2) },
        uInk: { value: new THREE.Color(0x17130f) },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.postScene = new THREE.Scene();
    this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.paintCells = 0;
    this.paintedCount = 0;
    this.walkable = null;
  }

  setSize(w, h) {
    this.target.setSize(w, h);
    this.material.uniforms.uRes.value.set(w, h);
  }

  resetPaint(origin, size, walkableFn) {
    this.paintData.fill(0);
    this.material.uniforms.uPaintOrigin.value.set(origin.x, origin.z);
    this.material.uniforms.uPaintSize.value = size;
    this.origin = origin; this.size = size;
    // remember which paint texels sit on walkable ground for the "painted %" stat
    this.walkable = new Uint8Array(PAINT_RES * PAINT_RES);
    let n = 0;
    for (let y = 0; y < PAINT_RES; y++) for (let x = 0; x < PAINT_RES; x++) {
      const wx = origin.x + (x + 0.5) / PAINT_RES * size, wz = origin.z + (y + 0.5) / PAINT_RES * size;
      if (walkableFn(wx, wz)) { this.walkable[y * PAINT_RES + x] = 1; n++; }
    }
    this.paintCells = n; this.paintedCount = 0;
    this.paintTex.needsUpdate = true;
  }

  // stamp a soft disc of paint into the world memory
  paint(x, z, radius, strength = 1, permanent = false) {
    if (!this.walkable) return;
    const res = PAINT_RES, s = this.size;
    const cx = (x - this.origin.x) / s * res, cz = (z - this.origin.z) / s * res;
    const r = radius / s * res;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(res - 1, Math.ceil(cx + r));
    const z0 = Math.max(0, Math.floor(cz - r)), z1 = Math.min(res - 1, Math.ceil(cz + r));
    let dirty = false;
    for (let y = z0; y <= z1; y++) for (let xx = x0; xx <= x1; xx++) {
      const dd = Math.hypot(xx - cx, y - cz) / r;
      if (dd >= 1) continue;
      const val = Math.min(255, Math.round(255 * strength * Math.min(1, (1 - dd) * 1.6)));
      const o = (y * res + xx) * 4;
      if (val > this.paintData[o]) {
        if (this.paintData[o] < 128 && val >= 128 && this.walkable[y * res + xx]) this.paintedCount++;
        this.paintData[o] = val; dirty = true;
      }
      if (permanent && val >= 128 && this.paintData[o + 1] < 255) { this.paintData[o + 1] = 255; dirty = true; }
    }
    if (dirty) this.paintTex.needsUpdate = true;
  }

  // the Night King's ink feet: remove color that is not protected by a stone lantern
  erase(x, z, radius, amount) {
    if (!this.walkable) return;
    const res = PAINT_RES, s = this.size;
    const cx = (x - this.origin.x) / s * res, cz = (z - this.origin.z) / s * res;
    const r = radius / s * res;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(res - 1, Math.ceil(cx + r));
    const z0 = Math.max(0, Math.floor(cz - r)), z1 = Math.min(res - 1, Math.ceil(cz + r));
    let dirty = false;
    for (let y = z0; y <= z1; y++) for (let xx = x0; xx <= x1; xx++) {
      const dd = Math.hypot(xx - cx, y - cz) / r;
      if (dd >= 1) continue;
      const o = (y * res + xx) * 4;
      if (this.paintData[o + 1] === 255 || this.paintData[o] === 0) continue;
      const before = this.paintData[o];
      const after = Math.max(0, before - Math.round(255 * amount * (1 - dd)));
      if (before >= 128 && after < 128 && this.walkable[y * res + xx]) this.paintedCount--;
      this.paintData[o] = after; dirty = true;
    }
    if (dirty) this.paintTex.needsUpdate = true;
  }

  paintedAt(x, z) {
    if (!this.walkable) return 0;
    const res = PAINT_RES;
    const px = Math.floor((x - this.origin.x) / this.size * res), pz = Math.floor((z - this.origin.z) / this.size * res);
    if (px < 0 || pz < 0 || px >= res || pz >= res) return 0;
    return this.paintData[(pz * res + px) * 4] / 255;
  }

  paintedRatio() { return this.paintCells ? this.paintedCount / this.paintCells : 0; }

  render(scene, camera) {
    const r = this.renderer;
    const u = this.material.uniforms;
    camera.updateMatrixWorld();
    u.uInvViewProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    u.uCamNear.value = camera.near; u.uCamFar.value = camera.far;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}
