import * as THREE from "three";

/* ────────────────────────────────────────────────────────────────────────────
 * Shared cel-shading, so the terrain, the grass, and the creatures standing on
 * them are lit by the same model. Split out of the scene once the spirits
 * needed it too: two copies of a lighting ramp drift apart, and the moment they
 * do, a creature stops looking like it belongs in the world it is standing in.
 *
 * These are GLSL source fragments rather than materials — each call site builds
 * its own ShaderMaterial around them, because the varyings they need differ.
 * ────────────────────────────────────────────────────────────────────────── */

export const KEY_LIGHT = new THREE.Vector3(0.55, 0.72, 0.42).normalize();

/**
 * `toonRamp` quantises N·L into flat bands — the single decision that makes
 * this read as cel-shaded rather than as plastic. Two bands plus a narrow
 * half-lit sliver mimics hand-painted anime shadow better than a smooth
 * gradient or a hard binary cut.
 */
export const TOON_CHUNK = /* glsl */ `
  uniform vec3 uKeyDir;

  float toonRamp(float ndl) {
    if (ndl > 0.62) return 1.0;
    if (ndl > 0.34) return 0.78;
    if (ndl > 0.10) return 0.58;
    return 0.44;
  }

  vec3 toonLight(vec3 baseColor, vec3 normal, vec3 viewDir) {
    float ndl = dot(normalize(normal), normalize(uKeyDir));
    float band = toonRamp(ndl);

    // Rim: the anime edge-glow. Strongest perpendicular to the eye, and only on
    // surfaces already facing away from the key, so it reads as bounced sky
    // rather than as a second sun.
    float rim = 1.0 - max(dot(normalize(normal), normalize(viewDir)), 0.0);
    rim = pow(rim, 2.6) * smoothstep(0.55, -0.15, ndl);

    vec3 lit = baseColor * band;
    lit += vec3(0.42, 0.60, 0.72) * rim * 0.55;
    return lit;
  }
`;

/** Wind shared by grass and canopies so the whole valley moves as one system. */
export const WIND_CHUNK = /* glsl */ `
  uniform float uTime;
  uniform float uWind;

  // Two waves at different scales: a broad gust rolling across the valley and a
  // faster local flutter. Summed, they never visibly loop.
  float windAt(vec2 worldPos, float phase) {
    float gust = sin(worldPos.x * 0.055 + worldPos.y * 0.041 + uTime * 0.85 + phase);
    float flutter = sin(worldPos.x * 0.31 - worldPos.y * 0.26 + uTime * 2.35 + phase * 1.7);
    return (gust * 0.72 + flutter * 0.28) * uWind;
  }
`;

/** Vertex stage every solid, non-instanced toon surface uses. */
const SOLID_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalMatrix * normal;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * A flat-coloured toon surface. Each part of a creature gets its own instance
 * so the colour can differ without a texture.
 */
export function makeToonMaterial(color: THREE.ColorRepresentation): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uKeyDir: { value: KEY_LIGHT.clone() },
      uBase: { value: new THREE.Color(color) },
    },
    vertexShader: SOLID_VERTEX,
    fragmentShader: /* glsl */ `
      ${TOON_CHUNK}
      uniform vec3 uBase;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        gl_FragColor = vec4(toonLight(uBase, vNormal, vView), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Inverted-hull outline: a back-face copy pushed out along its own normals.
 * The cheapest way to get a real ink line without a post-processing pass, which
 * on a static host is the difference between shipping and not.
 */
export function makeOutlineMaterial(thickness: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uThickness: { value: thickness } },
    vertexShader: /* glsl */ `
      uniform float uThickness;
      void main() {
        vec3 swollen = position + normal * uThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(swollen, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      void main() { gl_FragColor = vec4(0.09, 0.13, 0.11, 1.0); }
    `,
  });
}

/**
 * Unlit flat colour — for eyes and their highlights, which must not pick up
 * scene shading. A shaded highlight stops looking like a catchlight and starts
 * looking like a dent, and the catchlight is what makes the creature alive.
 */
export function makeFlatMaterial(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}
