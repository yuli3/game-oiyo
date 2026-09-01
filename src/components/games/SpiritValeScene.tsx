import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";
import * as THREE from "three";
import {
  WORLD,
  generateGrass,
  generateTallGrassZones,
  generateTrees,
  generateZoneGrass,
  terrainHeight,
  type GrassBlade,
  type TreeInstance,
  type TallGrassZone,
} from "../../lib/games/spirit-vale";
import { formFor } from "../../lib/games/spirit-vale-forms";
import { stageOf, type Stage } from "../../lib/games/spirit-vale-evolution";
import { spiritById } from "../../lib/games/spirit-vale";
import SpiritModel, { type SpiritAction } from "./SpiritModel";
import type { SpiritDetail } from "./spirit-vale-geometry";
import { KEY_LIGHT, TOON_CHUNK, WIND_CHUNK } from "./spirit-vale-toon";

/* ────────────────────────────────────────────────────────────────────────────
 * The WebGL layer. This module — and only this module — imports three.js, and
 * it is pulled in lazily from `SpiritVale.tsx`, so no other arcade page pays for
 * it. Nothing here decides rules: it renders the world it is handed and reports
 * the player's position back up.
 *
 * The look is entirely shader work, because there are no art assets to load:
 * a two-band toon ramp with a rim light, inverted-hull outlines, and grass that
 * bends in the vertex shader. That keeps the whole valley to a few draw calls
 * and a few hundred KB of code, which is the only way a scene this dense loads
 * on a static host.
 * ────────────────────────────────────────────────────────────────────────── */

export interface SceneProps {
  seed: number;
  /** World-space player position, owned by the wrapper. */
  playerX: number;
  playerZ: number;
  /** Facing angle in radians. */
  facing: number;
  /** True while the player is actually walking, for the bob. */
  moving: boolean;
  reducedMotion: boolean;
  /** Lowered on small devices to keep the blade count affordable. */
  grassBudget: number;
  /** Set when an encounter is showing, to dim and slow the world behind it. */
  encounterActive: boolean;
  /** The wild spirit standing in front of the player, if any. */
  wildSpiritId?: string | null;
  wildXp?: number;
  /** The spirit the player sent out, if any. */
  partySpiritId?: string | null;
  partyXp?: number;
  /** Current one-shot animation per side, driven by the battle log. */
  wildAction?: SpiritAction;
  partyAction?: SpiritAction;
  /** Bumped each turn so a repeated action replays. */
  actionKey?: number;
}

/* ── Palette ───────────────────────────────────────────────────────────────
 * A dusk-leaning midday: warm key, cool shadow, and a sky that the fog matches
 * so distant geometry dissolves instead of ending on a hard line.
 * ────────────────────────────────────────────────────────────────────────── */
const SKY = "#bfe4f2";
const FOG = new THREE.Color("#cfe8f0");

function useToonUniforms(reducedMotion: boolean) {
  return useMemo(
    () => ({
      uKeyDir: { value: KEY_LIGHT.clone() },
      uTime: { value: 0 },
      // Reduced motion stills the wind entirely rather than merely slowing it —
      // a slow sway is still sway.
      uWind: { value: reducedMotion ? 0 : 1 },
    }),
    [reducedMotion],
  );
}

/* ── Terrain ─────────────────────────────────────────────────────────────── */

function Terrain({ uniforms }: { uniforms: Record<string, THREE.IUniform> }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WORLD.size * 2, WORLD.size * 2, WORLD.segments, WORLD.segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    // Displace from the same `terrainHeight` the player walks on, so the visible
    // ground and the walkable ground can never disagree.
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          varying float vHeight;
          varying float vSlope;
          void main() {
            vNormal = normalMatrix * normal;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = -mv.xyz;
            vHeight = position.y;
            // World-space normal Y: flat ground is 1, a cliff face approaches 0.
            vSlope = 1.0 - normalize(mat3(modelMatrix) * normal).y;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${TOON_CHUNK}
          varying vec3 vNormal;
          varying vec3 vView;
          varying float vHeight;
          varying float vSlope;

          void main() {
            vec3 meadow = vec3(0.42, 0.60, 0.28);
            vec3 highland = vec3(0.55, 0.63, 0.35);
            vec3 rock = vec3(0.47, 0.45, 0.42);

            // Height tints the grass toward dry highland; slope exposes rock,
            // so cliffs stop reading as vertical lawn.
            vec3 base = mix(meadow, highland, smoothstep(0.5, 5.5, vHeight));
            base = mix(base, rock, smoothstep(0.28, 0.62, vSlope));

            gl_FragColor = vec4(toonLight(base, vNormal, vView), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [uniforms],
  );

  return <mesh geometry={geometry} material={material} receiveShadow={false} />;
}

/* ── Grass ─────────────────────────────────────────────────────────────────
 * One InstancedMesh for every blade. The blade itself is a three-segment
 * tapered strip: enough vertices for the tip to curve rather than shear, cheap
 * enough to draw tens of thousands of them.
 *
 * Sway lives in the vertex shader and is weighted by height along the blade
 * (uv.y squared), so the root stays planted in the soil while the tip travels —
 * the detail that separates grass from swinging cardboard.
 * ────────────────────────────────────────────────────────────────────────── */

function bladeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.11, 1, 1, 3);
  geo.translate(0, 0.5, 0);
  return geo;
}

function GrassField({
  blades,
  uniforms,
}: {
  blades: GrassBlade[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const geometry = useMemo(() => {
    const geo = bladeGeometry();
    const count = blades.length;
    const offset = new Float32Array(count * 3);
    const attrs = new Float32Array(count * 3); // scale, phase, tint
    const rotation = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const b = blades[i];
      offset[i * 3] = b.x;
      offset[i * 3 + 1] = b.y;
      offset[i * 3 + 2] = b.z;
      attrs[i * 3] = b.scale;
      attrs[i * 3 + 1] = b.phase;
      attrs[i * 3 + 2] = b.tint;
      rotation[i] = b.rotation;
    }
    const inst = new THREE.InstancedBufferGeometry();
    inst.index = geo.index;
    inst.attributes.position = geo.attributes.position;
    inst.attributes.uv = geo.attributes.uv;
    inst.setAttribute("iOffset", new THREE.InstancedBufferAttribute(offset, 3));
    inst.setAttribute("iAttrs", new THREE.InstancedBufferAttribute(attrs, 3));
    inst.setAttribute("iRotation", new THREE.InstancedBufferAttribute(rotation, 1));
    inst.instanceCount = count;
    // Frustum culling would need a bounding volume covering the whole field;
    // the field IS the whole valley, so we set it once and skip the per-frame
    // recompute rather than letting three.js cull the entire mesh at odd angles.
    inst.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), WORLD.size * 1.6);
    return inst;
  }, [blades]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          ${WIND_CHUNK}
          attribute vec3 iOffset;
          attribute vec3 iAttrs;
          attribute float iRotation;
          varying float vUpper;
          varying float vTint;
          varying vec3 vView;

          void main() {
            float scale = iAttrs.x;
            float phase = iAttrs.y;
            vTint = iAttrs.z;
            vUpper = uv.y;

            // Yaw each blade so the field isn't a grid of parallel cards.
            float c = cos(iRotation);
            float s = sin(iRotation);
            vec3 p = position * vec3(1.0, scale, 1.0);
            vec3 rotated = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

            vec3 world = rotated + iOffset;

            // Bend, don't rotate: displacement rises with the square of height
            // so the base stays rooted and the tip carries the whole arc.
            float bend = windAt(iOffset.xz, phase) * uv.y * uv.y * 0.42 * scale;
            world.x += bend;
            world.z += bend * 0.55;
            // Shorten slightly while bent so the blade doesn't visibly stretch.
            world.y -= abs(bend) * 0.16;

            vec4 mv = modelViewMatrix * vec4(world, 1.0);
            vView = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${TOON_CHUNK}
          varying float vUpper;
          varying float vTint;
          varying vec3 vView;

          void main() {
            // Root-to-tip gradient plus per-blade tint: without both, a field
            // this size flattens into one sheet of colour.
            vec3 root = vec3(0.20, 0.34, 0.14);
            vec3 tip = mix(vec3(0.52, 0.72, 0.30), vec3(0.66, 0.78, 0.36), vTint);
            vec3 base = mix(root, tip, vUpper * vUpper);

            // Blades are billboards with no meaningful normal, so we light them
            // with a fixed upward-ish normal and let the gradient do the work.
            vec3 fakeNormal = vec3(0.0, 1.0, 0.35);
            vec3 lit = toonLight(base, fakeNormal, vView);
            // Ambient occlusion toward the root — the field gains depth the
            // moment the ground between blades reads as darker.
            lit *= mix(0.62, 1.0, vUpper);

            gl_FragColor = vec4(lit, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [uniforms],
  );

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

/* ── Trees ─────────────────────────────────────────────────────────────────
 * Two instanced meshes sharing one transform list: trunks that stand still and
 * canopies that sway. Splitting them is what lets the crown move over a fixed
 * base without skinning.
 * ────────────────────────────────────────────────────────────────────────── */

function Trees({
  trees,
  uniforms,
}: {
  trees: TreeInstance[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);

  const trunkGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.12, 0.3, 2.4, 10);
    geo.translate(0, 1.2, 0);
    return geo;
  }, []);

  // A low-poly icosahedron reads as stylised foliage; a smooth sphere reads as
  // a beach ball once the toon ramp flattens the shading.
  const canopyGeo = useMemo(() => new THREE.IcosahedronGeometry(1.5, 0), []);

  const trunkMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalMatrix * mat3(instanceMatrix) * normal;
            vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            vView = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${TOON_CHUNK}
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            gl_FragColor = vec4(toonLight(vec3(0.34, 0.24, 0.17), vNormal, vView), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [uniforms],
  );

  const canopyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          ${WIND_CHUNK}
          attribute float iPhase;
          varying vec3 vNormal;
          varying vec3 vView;
          varying float vUp;
          void main() {
            vNormal = normalMatrix * mat3(instanceMatrix) * normal;
            vUp = normalize(normal).y;
            vec4 world = instanceMatrix * vec4(position, 1.0);
            // The canopy leans as a whole; the trunk beneath it does not.
            float sway = windAt(world.xz, iPhase) * 0.16;
            world.x += sway;
            world.z += sway * 0.6;
            vec4 mv = modelViewMatrix * world;
            vView = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${TOON_CHUNK}
          varying vec3 vNormal;
          varying vec3 vView;
          varying float vUp;
          void main() {
            // Upward faces catch sky, undersides stay deep — cheap stand-in for
            // the light that would otherwise need a second pass.
            vec3 base = mix(vec3(0.16, 0.31, 0.17), vec3(0.35, 0.55, 0.24), smoothstep(-0.4, 0.9, vUp));
            gl_FragColor = vec4(toonLight(base, vNormal, vView), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [uniforms],
  );

  useEffect(() => {
    const trunk = trunkRef.current;
    const canopy = canopyRef.current;
    if (!trunk || !canopy) return;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const phases = new Float32Array(trees.length);

    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotation);

      pos.set(t.x, t.y, t.z);
      scl.set(t.scale, t.scale, t.scale);
      trunk.setMatrixAt(i, m.compose(pos, q, scl));

      // Seat the crown at the top of its own trunk, which is scaled per tree.
      pos.set(t.x, t.y + 2.35 * t.scale, t.z);
      scl.set(t.scale * 1.05, t.scale * 0.86, t.scale * 1.05);
      canopy.setMatrixAt(i, m.compose(pos, q, scl));

      phases[i] = t.phase;
    }

    trunk.instanceMatrix.needsUpdate = true;
    canopy.instanceMatrix.needsUpdate = true;
    canopy.geometry.setAttribute("iPhase", new THREE.InstancedBufferAttribute(phases, 1));
  }, [trees]);

  return (
    <>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, trees.length]} frustumCulled={false} />
      <instancedMesh ref={canopyRef} args={[canopyGeo, canopyMat, trees.length]} frustumCulled={false} />
    </>
  );
}

/* ── Player ────────────────────────────────────────────────────────────────
 * Built from primitives and wrapped in an inverted-hull outline. The hull is a
 * back-face copy scaled along its normals: the cheapest way to get a real ink
 * line without a post-processing pass, which on a static host is the difference
 * between shipping and not.
 * ────────────────────────────────────────────────────────────────────────── */

function Outlined({
  geometry,
  uniforms,
  color,
  thickness = 0.045,
}: {
  geometry: THREE.BufferGeometry;
  uniforms: Record<string, THREE.IUniform>;
  color: [number, number, number];
  thickness?: number;
}) {
  const fill = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalMatrix * normal;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
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
      }),
    [uniforms],
  );

  const outline = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { uThickness: { value: thickness } },
        vertexShader: /* glsl */ `
          uniform float uThickness;
          void main() {
            // Push each vertex out along its own normal; viewed from outside,
            // the back faces peek past the silhouette as a constant-width line.
            vec3 swollen = position + normal * uThickness;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(swollen, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          void main() { gl_FragColor = vec4(0.09, 0.13, 0.11, 1.0); }
        `,
      }),
    [thickness],
  );

  // A per-instance uniform would leak across every Outlined sharing `uniforms`,
  // so the base colour rides on a cloned material instead.
  const fillMat = useMemo(() => {
    const mat = fill.clone();
    mat.uniforms = { ...fill.uniforms, uBase: { value: new THREE.Vector3(...color) } };
    return mat;
  }, [fill, color]);

  return (
    <group>
      <mesh geometry={geometry} material={outline} />
      <mesh geometry={geometry} material={fillMat} />
    </group>
  );
}

function Player({
  x,
  z,
  facing,
  moving,
  reducedMotion,
  uniforms,
}: {
  x: number;
  z: number;
  facing: number;
  moving: boolean;
  reducedMotion: boolean;
  uniforms: Record<string, THREE.IUniform>;
}) {
  const group = useRef<THREE.Group>(null);
  const bob = useRef(0);

  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.3, 0.46, 4, 12), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.31, 16, 12), []);
  const satchelGeo = useMemo(() => new THREE.CapsuleGeometry(0.12, 0.14, 4, 10), []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.position.set(x, terrainHeight(x, z), z);

    // Turn toward `facing` the short way round rather than unwinding through a
    // full circle when the angle wraps past π.
    const diff = ((facing - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += reducedMotion ? diff : diff * Math.min(1, delta * 14);

    if (reducedMotion) {
      g.position.y += 0.62;
      return;
    }
    bob.current += moving ? delta * 9 : -bob.current * Math.min(1, delta * 8);
    g.position.y += 0.62 + Math.abs(Math.sin(bob.current)) * (moving ? 0.075 : 0);
  });

  return (
    <group ref={group}>
      <group position={[0, 0.28, 0]}>
        <Outlined geometry={bodyGeo} uniforms={uniforms} color={[0.28, 0.42, 0.62]} />
      </group>
      <group position={[0, 0.92, 0]}>
        <Outlined geometry={headGeo} uniforms={uniforms} color={[0.92, 0.79, 0.66]} />
      </group>
      <group position={[-0.3, 0.42, -0.06]}>
        <Outlined geometry={satchelGeo} uniforms={uniforms} color={[0.55, 0.38, 0.2]} thickness={0.03} />
      </group>
    </group>
  );
}

/* ── Thicket markers ───────────────────────────────────────────────────────
 * A faint element-tinted disc under each tall-grass zone. Without it the
 * thickets are only legible once you are standing in them, and "walk somewhere
 * to find spirits" stops being a readable instruction.
 * ────────────────────────────────────────────────────────────────────────── */

const ZONE_TINT: Record<string, [number, number, number]> = {
  wood: [0.38, 0.72, 0.36],
  fire: [0.86, 0.42, 0.28],
  earth: [0.78, 0.63, 0.32],
  metal: [0.74, 0.78, 0.82],
  water: [0.34, 0.58, 0.82],
};

function ZoneMarkers({ zones }: { zones: TallGrassZone[] }) {
  return (
    <>
      {zones.map((zone, i) => {
        const tint = ZONE_TINT[zone.element] ?? [1, 1, 1];
        return (
          <mesh
            key={i}
            position={[zone.x, terrainHeight(zone.x, zone.z) + 0.06, zone.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[zone.radius, 32]} />
            <meshBasicMaterial
              color={new THREE.Color(...tint)}
              transparent
              opacity={0.17}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

/* ── Camera ────────────────────────────────────────────────────────────────
 * The classic three-quarter overhead. Height and distance are tuned so the
 * player sits low in frame and the valley ahead fills the rest — the framing
 * that makes a top-down world feel walkable rather than inspected.
 * ────────────────────────────────────────────────────────────────────────── */

function CameraRig({
  x,
  z,
  facing,
  reducedMotion,
  encounterActive,
}: {
  x: number;
  z: number;
  facing: number;
  reducedMotion: boolean;
  encounterActive: boolean;
}) {
  const { camera } = useThree();
  const current = useRef(new THREE.Vector3(x, 0, z));
  const scratch = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // During a battle the camera watches the space *between* the combatants,
    // not the wanderer — otherwise the wild spirit stands off the top of frame.
    const lead = encounterActive ? 3.4 : 0;
    const fx = x + Math.sin(facing) * lead;
    const fz = z + Math.cos(facing) * lead;

    const target = scratch.current.set(fx, terrainHeight(fx, fz), fz);
    const goal = current.current;
    if (reducedMotion) {
      goal.copy(target);
    } else {
      // Frame-rate independent easing, so the follow feels identical at 60 and
      // 144 Hz instead of tightening with the refresh rate.
      const t = 1 - Math.pow(0.0015, Math.min(delta, 0.1));
      goal.lerp(target, t);
    }

    const zoom = encounterActive ? 0.66 : 1;
    camera.position.set(goal.x, goal.y + 15.5 * zoom, goal.z + 12.5 * zoom);
    camera.lookAt(goal.x, goal.y + 1.1, goal.z);
  });

  return null;
}

/* ── Scene ─────────────────────────────────────────────────────────────── */

function Clock({ uniforms, paused }: { uniforms: Record<string, THREE.IUniform>; paused: boolean }) {
  useFrame((_, delta) => {
    // One clock drives every shader, so grass and canopies stay in phase.
    uniforms.uTime.value += paused ? delta * 0.15 : delta;
  });
  return null;
}

/* ── Combatants ────────────────────────────────────────────────────────────
 * The two spirits are placed in the world rather than drawn in the panel, so a
 * battle happens in the same valley the player was just walking through — the
 * grass keeps moving behind them and the light is the same light.
 * ────────────────────────────────────────────────────────────────────────── */

function Combatants({
  playerX,
  playerZ,
  facing,
  wildSpiritId,
  wildXp,
  partySpiritId,
  partyXp,
  reducedMotion,
  wildAction,
  partyAction,
  actionKey,
}: {
  playerX: number;
  playerZ: number;
  facing: number;
  wildSpiritId?: string | null;
  wildXp?: number;
  partySpiritId?: string | null;
  partyXp?: number;
  reducedMotion: boolean;
  wildAction?: SpiritAction;
  partyAction?: SpiritAction;
  actionKey?: number;
}) {
  const wild = wildSpiritId ? spiritById(wildSpiritId) : null;
  const mine = partySpiritId ? spiritById(partySpiritId) : null;

  // Both stand on the axis the player is facing: the wild spirit a few metres
  // ahead, the player's own just in front of and beside the wanderer.
  const dir = { x: Math.sin(facing), z: Math.cos(facing) };
  const right = { x: Math.cos(facing), z: -Math.sin(facing) };

  const spot = (ahead: number, side: number) => {
    const x = playerX + dir.x * ahead + right.x * side;
    const z = playerZ + dir.z * ahead + right.z * side;
    return { x, z, y: terrainHeight(x, z) };
  };

  const wildAt = spot(6.2, 0.6);
  const mineAt = spot(2.6, -1.4);
  const detail = useMemo<SpiritDetail>(
    () =>
      typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "low" : "high",
    [],
  );

  return (
    <>
      {wild && (
        <SpiritModel
          plan={formFor(wild, stageOf(wildXp ?? 0) as Stage)}
          position={[wildAt.x, wildAt.y, wildAt.z]}
          // Turned to face back down the axis, at the player.
          facing={facing + Math.PI}
          reducedMotion={reducedMotion}
          action={wildAction}
          actionKey={actionKey}
          detail={detail}
        />
      )}
      {mine && (
        <SpiritModel
          plan={formFor(mine, stageOf(partyXp ?? 0) as Stage)}
          position={[mineAt.x, mineAt.y, mineAt.z]}
          facing={facing}
          reducedMotion={reducedMotion}
          action={partyAction}
          actionKey={actionKey}
          detail={detail}
        />
      )}
    </>
  );
}

function Valley({
  seed,
  grassBudget,
  reducedMotion,
  encounterActive,
  wildSpiritId,
  wildXp,
  partySpiritId,
  partyXp,
  wildAction,
  partyAction,
  actionKey,
  ...player
}: SceneProps) {
  const uniforms = useToonUniforms(reducedMotion);

  const world = useMemo(() => {
    const zones = generateTallGrassZones(seed);
    const trees = generateTrees(seed, zones);
    const field = generateGrass(seed, zones, grassBudget);
    // Thickets get their own dense pass so they read as cover, not as the same
    // field with the height turned up.
    const thicket = generateZoneGrass(seed, zones, Math.round(grassBudget * 0.06));
    return { zones, trees, blades: [...field, ...thicket] };
  }, [seed, grassBudget]);

  return (
    <>
      <color attach="background" args={[SKY]} />
      {/* Fog matched to the sky so the far rim dissolves rather than ending. */}
      <fog attach="fog" args={[FOG.getHex(), 42, 118]} />

      <Clock uniforms={uniforms} paused={encounterActive} />
      <CameraRig
        x={player.playerX}
        z={player.playerZ}
        facing={player.facing}
        reducedMotion={reducedMotion}
        encounterActive={encounterActive}
      />

      <Terrain uniforms={uniforms} />
      <ZoneMarkers zones={world.zones} />
      <GrassField blades={world.blades} uniforms={uniforms} />
      <Trees trees={world.trees} uniforms={uniforms} />
      <Player
        x={player.playerX}
        z={player.playerZ}
        facing={player.facing}
        moving={player.moving && !encounterActive}
        reducedMotion={reducedMotion}
        uniforms={uniforms}
      />
      {encounterActive && (
        <Combatants
          playerX={player.playerX}
          playerZ={player.playerZ}
          facing={player.facing}
          wildSpiritId={wildSpiritId}
          wildXp={wildXp}
          partySpiritId={partySpiritId}
          partyXp={partyXp}
          reducedMotion={reducedMotion}
          wildAction={wildAction}
          partyAction={partyAction}
          actionKey={actionKey}
        />
      )}
    </>
  );
}

export default function SpiritValeScene(props: SceneProps) {
  const frameloop = usePlayFrameloop(true);
  return (
    <Canvas
      frameloop={frameloop}
      // Capped DPR: at 3× the blade count becomes fill-rate bound on phones for
      // detail nobody can resolve.
      dpr={[1, 1.75]}
      camera={{ fov: 34, near: 0.5, far: 220, position: [0, 16, 13] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Valley {...props} />
    </Canvas>
  );
}
