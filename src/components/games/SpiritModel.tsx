import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { BodyPlan } from "../../lib/games/spirit-vale-forms";
import { makeFlatMaterial, makeOutlineMaterial, makeToonMaterial } from "./spirit-vale-toon";

/* ────────────────────────────────────────────────────────────────────────────
 * A spirit, assembled from primitives at runtime.
 *
 * There are no model files on this host, so anatomy has to come from geometry
 * placement. The rules that make that read as a creature rather than as stacked
 * shapes, in order of how much they matter:
 *
 *   1. Eyes. Large, forward-facing, unlit, with an offset catchlight. Nothing
 *      else comes close for making a shape feel alive.
 *   2. A silhouette you can name — the body plan varies proportions per branch
 *      so an ox and a rabbit are different animals, not different palettes.
 *   3. An ink outline on every solid part, so forms separate at any distance.
 *
 * The creature faces +Z. `lift` rotates the spine continuously from horizontal
 * (a prowling tiger) to upright (a standing rooster), and every attachment
 * point is derived from that same angle so nothing detaches at the extremes.
 * ────────────────────────────────────────────────────────────────────────── */

export interface SpiritModelProps {
  plan: BodyPlan;
  /** World position of the creature's feet. */
  position: [number, number, number];
  facing?: number;
  reducedMotion?: boolean;
  /** Drives the idle breath — set false to freeze during a menu. */
  animate?: boolean;
}

/** A solid part: ink outline plus a flat-shaded fill. */
function Part({
  geometry,
  color,
  outline,
  position,
  rotation,
  scale,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  outline: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}) {
  const fill = useMemo(() => makeToonMaterial(color), [color]);
  const ink = useMemo(() => makeOutlineMaterial(outline), [outline]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} material={ink} />
      <mesh geometry={geometry} material={fill} />
    </group>
  );
}

/** Unlit part, for eyes — shading a catchlight turns it into a dent. */
function FlatPart({
  geometry,
  color,
  position,
  scale,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  position: [number, number, number];
  scale?: number;
}) {
  const mat = useMemo(() => makeFlatMaterial(color), [color]);
  return <mesh geometry={geometry} material={mat} position={position} scale={scale} />;
}

export default function SpiritModel({
  plan,
  position,
  facing = 0,
  reducedMotion = false,
  animate = true,
}: SpiritModelProps) {
  const root = useRef<THREE.Group>(null);
  const breath = useRef(0);

  // Shared primitives — built once and reused by every part, so a creature is
  // a few dozen draws over a handful of buffers rather than a buffer per limb.
  const geo = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(1, 16, 12),
      capsule: new THREE.CapsuleGeometry(1, 1, 4, 12),
      cone: new THREE.ConeGeometry(1, 1, 8),
      cylinder: new THREE.CylinderGeometry(1, 0.82, 1, 8),
      box: new THREE.BoxGeometry(1, 1, 1),
    }),
    [],
  );

  const s = plan.scale;
  const outline = 0.035 / Math.max(s, 0.35);

  // The spine angle everything else hangs off: 0 = horizontal, PI/2 = upright.
  const spine = plan.torso.lift * Math.PI * 0.5;
  const fwd = new THREE.Vector3(0, Math.sin(spine), Math.cos(spine));

  const halfLen = (plan.torso.length * s) / 2;
  const girth = plan.torso.girth * s;
  const legLen = plan.limbs.length * s;
  const headSize = plan.head.size * s;

  // Feet sit at y=0, so the body floats at leg height (or on its belly when
  // the creature is a serpent and has no legs at all).
  const bodyY = plan.limbs.kind === "serpentine" ? girth * 0.55 : legLen + girth * 0.5;

  const headPos = new THREE.Vector3()
    .copy(fwd)
    .multiplyScalar(halfLen + headSize * plan.head.forward * 0.6)
    .add(new THREE.Vector3(0, bodyY, 0));

  const tailPos = new THREE.Vector3()
    .copy(fwd)
    .multiplyScalar(-halfLen)
    .add(new THREE.Vector3(0, bodyY, 0));

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    if (reducedMotion || !animate) {
      g.scale.setScalar(1);
      return;
    }
    breath.current += delta * 1.9;
    // A shallow, slightly anisotropic breath: creatures widen more than they
    // rise, which is what separates breathing from pulsing.
    const b = Math.sin(breath.current);
    g.scale.set(1 + b * 0.018, 1 + b * 0.012, 1 + b * 0.018);
  });

  const p = plan.palette;

  return (
    <group ref={root} position={position} rotation={[0, facing, 0]}>
      {/* Torso — a capsule laid along the spine. */}
      <Part
        geometry={geo.capsule}
        color={p.body}
        outline={outline}
        position={[0, bodyY, 0]}
        rotation={[Math.PI / 2 - spine, 0, 0]}
        scale={[girth * 0.5, halfLen, girth * 0.5]}
      />
      {/* Belly — a lighter underside, offset down and forward. Cheap, and it
          stops the body reading as one solid lump. */}
      <Part
        geometry={geo.sphere}
        color={p.belly}
        outline={outline * 0.6}
        position={[0, bodyY - girth * 0.16, fwd.z * halfLen * 0.15]}
        scale={[girth * 0.42, girth * 0.34, halfLen * 0.72]}
      />

      {/* Head */}
      <Part
        geometry={geo.sphere}
        color={p.body}
        outline={outline}
        position={headPos.toArray()}
        scale={[headSize * 0.55, headSize * 0.52, headSize * 0.55]}
      />
      {/* Snout — omitted entirely for flat-faced plans rather than scaled to
          zero, which would leave a z-fighting sliver on the face. */}
      {plan.head.snout > 0.05 && (
        <Part
          geometry={geo.sphere}
          color={p.belly}
          outline={outline * 0.7}
          position={[
            headPos.x,
            headPos.y - headSize * 0.12,
            headPos.z + headSize * 0.42,
          ]}
          scale={[headSize * 0.26, headSize * 0.22, headSize * plan.head.snout * 0.6]}
        />
      )}

      {/* Eyes — the feature that does the most work. Unlit, forward-facing,
          each with an offset catchlight. */}
      {[-1, 1].map((side) => {
        const ex = side * headSize * plan.eye.spread * 0.42;
        const ey = headPos.y + headSize * plan.eye.height;
        const ez = headPos.z + headSize * 0.42;
        const r = headSize * plan.eye.size;
        return (
          <group key={side}>
            <FlatPart geometry={geo.sphere} color={p.eye} position={[ex, ey, ez]} scale={r} />
            <FlatPart
              geometry={geo.sphere}
              color="#ffffff"
              position={[ex + r * 0.34, ey + r * 0.32, ez + r * 0.5]}
              scale={r * plan.eye.highlight}
            />
          </group>
        );
      })}

      {/* Ears, horns, antlers */}
      {plan.ears.kind !== "none" &&
        [-1, 1].map((side) => {
          const size = headSize * plan.ears.size;
          const base: [number, number, number] = [
            side * headSize * 0.34,
            headPos.y + headSize * 0.42,
            headPos.z - headSize * 0.08,
          ];
          if (plan.ears.kind === "round") {
            return (
              <Part
                key={side}
                geometry={geo.sphere}
                color={p.body}
                outline={outline}
                position={base}
                scale={[size * 0.5, size * 0.5, size * 0.22]}
              />
            );
          }
          // Pointed ears, horns and antlers are all cones; they differ in tilt
          // and length, which is enough to tell them apart in silhouette.
          const tilt = plan.ears.kind === "pointed" ? 0.18 : plan.ears.kind === "horns" ? 0.8 : 0.45;
          return (
            <group key={side}>
              <Part
                geometry={geo.cone}
                color={plan.ears.kind === "pointed" ? p.body : p.accent}
                outline={outline}
                position={base}
                rotation={[0, 0, -side * tilt]}
                scale={[size * 0.26, size, size * 0.26]}
              />
              {plan.ears.kind === "antlers" && (
                <Part
                  geometry={geo.cone}
                  color={p.accent}
                  outline={outline}
                  position={[base[0] + side * size * 0.3, base[1] + size * 0.42, base[2]]}
                  rotation={[0, 0, -side * 1.1]}
                  scale={[size * 0.16, size * 0.55, size * 0.16]}
                />
              )}
            </group>
          );
        })}

      {/* Limbs */}
      {plan.limbs.kind !== "serpentine" &&
        legPositions(plan, halfLen, girth).map(([lx, lz], i) => (
          <Part
            key={i}
            geometry={geo.cylinder}
            color={p.body}
            outline={outline}
            position={[lx, legLen * 0.5, lz]}
            scale={[plan.limbs.thickness * s, legLen, plan.limbs.thickness * s]}
          />
        ))}

      {/* Tail */}
      {plan.tail.kind !== "none" && (
        <Tail plan={plan} geo={geo} at={tailPos} fwd={fwd} outline={outline} scale={s} />
      )}

      {/* Elemental signature along the spine */}
      {Array.from({ length: plan.accent.count }).map((_, i) => {
        const t = (i + 0.5) / plan.accent.count;
        // Distribute from the shoulders back, so accents never cover the face.
        const along = halfLen - t * halfLen * 1.7;
        const size = girth * 0.3 * plan.accent.scale * (1 - t * 0.35);
        const pos: [number, number, number] = [
          0,
          bodyY + girth * 0.45 * Math.cos(spine) + fwd.y * along,
          fwd.z * along,
        ];
        return (
          <Accent key={i} kind={plan.accent.kind} geo={geo} color={p.accent} outline={outline} position={pos} size={size} />
        );
      })}
    </group>
  );
}

/** Foot positions in the XZ plane, by limb plan. */
function legPositions(plan: BodyPlan, halfLen: number, girth: number): [number, number][] {
  const spread = girth * 0.34;
  if (plan.limbs.kind === "quadruped") {
    const front = halfLen * 0.55;
    return [
      [-spread, front],
      [spread, front],
      [-spread, -front],
      [spread, -front],
    ];
  }
  // Bipeds and birds stand on two legs tucked under the body's centre.
  return [
    [-spread * 0.8, 0],
    [spread * 0.8, 0],
  ];
}

function Tail({
  plan,
  geo,
  at,
  fwd,
  outline,
  scale,
}: {
  plan: BodyPlan;
  geo: Record<string, THREE.BufferGeometry>;
  at: THREE.Vector3;
  fwd: THREE.Vector3;
  outline: number;
  scale: number;
}) {
  const len = plan.tail.length * scale;
  const thick = plan.torso.girth * scale * 0.16;
  const color = plan.palette.body;

  if (plan.tail.kind === "fan") {
    // A spread of flat blades — the rooster's silhouette lives entirely here.
    return (
      <>
        {[-2, -1, 0, 1, 2].map((i) => (
          <Part
            key={i}
            geometry={geo.box}
            color={i % 2 === 0 ? plan.palette.accent : color}
            outline={outline}
            position={[i * thick * 0.9, at.y + len * 0.4, at.z - len * 0.3]}
            rotation={[0.5, 0, i * 0.14]}
            scale={[thick * 0.5, len, thick * 0.3]}
          />
        ))}
      </>
    );
  }

  if (plan.tail.kind === "bushy") {
    return (
      <Part
        geometry={geo.sphere}
        color={color}
        outline={outline}
        position={[0, at.y + len * 0.2, at.z - len * 0.4]}
        scale={[thick * 1.5, thick * 1.5, len * 0.5]}
      />
    );
  }

  // Thin and serpent tails are the same shape at different lengths, tapering
  // away from the body along the spine.
  const segments = plan.tail.kind === "serpent" ? 4 : 2;
  return (
    <>
      {Array.from({ length: segments }).map((_, i) => {
        const t = (i + 1) / segments;
        const dist = len * t;
        return (
          <Part
            key={i}
            geometry={geo.sphere}
            color={color}
            outline={outline}
            position={[0, at.y + fwd.y * -dist * 0.3, at.z - dist]}
            scale={[thick * (1 - t * 0.6), thick * (1 - t * 0.6), len / segments]}
          />
        );
      })}
    </>
  );
}

function Accent({
  kind,
  geo,
  color,
  outline,
  position,
  size,
}: {
  kind: BodyPlan["accent"]["kind"];
  geo: Record<string, THREE.BufferGeometry>;
  color: string;
  outline: number;
  position: [number, number, number];
  size: number;
}) {
  switch (kind) {
    case "flame":
      // Tall, narrow, leaning back — reads as fire even without animation.
      return (
        <Part
          geometry={geo.cone}
          color={color}
          outline={outline}
          position={position}
          rotation={[-0.35, 0, 0]}
          scale={[size * 0.55, size * 2.1, size * 0.55]}
        />
      );
    case "fin":
      return (
        <Part
          geometry={geo.cone}
          color={color}
          outline={outline}
          position={position}
          rotation={[0, 0, 0]}
          scale={[size * 0.18, size * 1.5, size * 0.9]}
        />
      );
    case "leaf":
      return (
        <Part
          geometry={geo.sphere}
          color={color}
          outline={outline}
          position={position}
          rotation={[0.4, 0, 0]}
          scale={[size * 0.75, size * 0.18, size * 1.15]}
        />
      );
    case "plate":
      return (
        <Part
          geometry={geo.box}
          color={color}
          outline={outline}
          position={position}
          rotation={[0.25, 0, 0]}
          scale={[size * 1.5, size * 0.28, size * 0.7]}
        />
      );
    case "stone":
      return (
        <Part
          geometry={geo.box}
          color={color}
          outline={outline}
          position={position}
          rotation={[0.3, 0.6, 0.2]}
          scale={[size * 0.85, size * 0.85, size * 0.85]}
        />
      );
  }
}
