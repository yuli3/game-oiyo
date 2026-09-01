import * as THREE from "three";

/**
 * Organic kit for Spirit Vale creatures. No BoxGeometry or ConeGeometry —
 * those read as tutorial primitives once the toon ramp flattens them.
 * Body plans still drive placement; only the buffers change.
 */
export type SpiritDetail = "high" | "low";

function lathe(xy: readonly (readonly [number, number])[], segments: number) {
  return new THREE.LatheGeometry(
    xy.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

export function makeSpiritGeometries(detail: SpiritDetail = "high") {
  const segs = detail === "high" ? 20 : 10;
  const latheSegs = detail === "high" ? 14 : 8;
  const sphereW = segs;
  const sphereH = Math.max(8, Math.round(segs * 0.7));
  return {
    sphere: new THREE.SphereGeometry(1, sphereW, sphereH),
    capsule: new THREE.CapsuleGeometry(1, 1, 6, segs),
    // Thick at the hip (+Y), thin at the ankle (−Y).
    taper: new THREE.CylinderGeometry(1, 0.32, 1, segs),
    disc: new THREE.CylinderGeometry(1, 1, 0.22, segs),
    pebble: new THREE.IcosahedronGeometry(1, 0),
    horn: lathe(
      [
        [0.02, 0],
        [0.18, 0.12],
        [0.12, 0.45],
        [0.04, 0.92],
        [0.001, 1],
      ],
      latheSegs,
    ),
    ear: lathe(
      [
        [0.02, 0],
        [0.22, 0.15],
        [0.14, 0.55],
        [0.001, 1],
      ],
      latheSegs,
    ),
    snout: lathe(
      [
        [0.02, 0],
        [0.28, 0.18],
        [0.22, 0.55],
        [0.08, 0.95],
        [0.001, 1.05],
      ],
      latheSegs,
    ),
    flame: lathe(
      [
        [0.02, 0],
        [0.35, 0.2],
        [0.22, 0.55],
        [0.08, 0.85],
        [0.001, 1.15],
      ],
      latheSegs,
    ),
    blade: lathe(
      [
        [0.01, 0],
        [0.08, 0.1],
        [0.06, 0.6],
        [0.001, 1],
      ],
      latheSegs,
    ),
    paw: new THREE.SphereGeometry(1, Math.max(8, Math.round(segs / 2)), Math.max(6, Math.round(segs / 2))),
  };
}

export type SpiritGeometryKit = ReturnType<typeof makeSpiritGeometries>;

export function geometryKitUsesBoxesOrCones(kit: SpiritGeometryKit): boolean {
  return Object.values(kit).some((geo) => geo.type === "BoxGeometry" || geo.type === "ConeGeometry");
}
