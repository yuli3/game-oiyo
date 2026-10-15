import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { Quaternion, SRGBColorSpace, Vector3, type Texture } from "three";
import {
  CAMERA_POSES,
  KEY_LIGHT,
  pegIndex,
  pegPosition,
  toolOffset,
  type Dir,
  type SkyState,
  type Tether,
} from "../../lib/games/constellation-shepherd";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const SHEPHERD = "/games/constellation-shepherd-shepherd.jpg";
const LIGHT = "/games/constellation-shepherd-light.jpg";
const HEAVY = "/games/constellation-shepherd-heavy.jpg";
const FLOOR = "/games/constellation-shepherd-floor.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.22;

const CLOAK: [number, number, number] = [0.28, 0.32, 0.58];
const LANTERN: [number, number, number] = [0.9, 0.66, 0.32];
const LIGHT_STAR: [number, number, number] = [0.78, 0.86, 0.96];
const HEAVY_STAR: [number, number, number] = [0.86, 0.55, 0.2];
const BRASS: [number, number, number] = [0.68, 0.54, 0.3];
const GOLD: [number, number, number] = [0.93, 0.78, 0.42];
const ROPE: [number, number, number] = [0.74, 0.82, 0.9];
const BOARD: [number, number, number] = [0.07, 0.08, 0.12];

export interface SkyGlide {
  id: number;
  dir: Dir;
  shepherdFrom: number;
  shepherdTo: number;
  starIndex: number | null;
  starFrom: number;
  starTo: number;
}

function prepare(maps: Texture[]) {
  for (const map of maps) map.colorSpace = SRGBColorSpace;
}

function lift(point: readonly [number, number, number], z: number): [number, number, number] {
  return [point[0], point[1], point[2] + z];
}

function lerpPeg(from: number, to: number, t: number): [number, number, number] {
  const start = pegPosition(from);
  const end = pegPosition(to);
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t, 0];
}

function tetherEnds(tether: Tether): [number, number] {
  if (tether.axis === "h") return [pegIndex(tether.fixed, tether.lo), pegIndex(tether.fixed, tether.hi)];
  return [pegIndex(tether.lo, tether.fixed), pegIndex(tether.hi, tether.fixed)];
}

function Rope({
  a,
  b,
  radius,
  color,
  intensity,
}: {
  a: readonly [number, number, number];
  b: readonly [number, number, number];
  radius: number;
  color: [number, number, number];
  intensity: number;
}) {
  const direction = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = direction.length();
  if (length < 1e-4) return null;
  // Cylinder axis is +Y. lookAt would aim +z, so the rope uses the unit-vector quaternion.
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.42} />
    </mesh>
  );
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  shepherdMap,
  lightMap,
  heavyMap,
  floorMap,
}: {
  state: SkyState;
  shown: SkyState;
  glide: SkyGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  shepherdMap: Texture;
  lightMap: Texture;
  heavyMap: Texture;
  floorMap: Texture;
}) {
  const progress = useRef(0);
  const bank = useRef(0);
  const seen = useRef<number | null>(null);
  const [tick, setTick] = useState(0);

  useFrame((_, delta) => {
    if (!glide || reduce) return;
    if (seen.current !== glide.id) {
      seen.current = glide.id;
      progress.current = 0;
      bank.current = 0;
    }
    if (progress.current >= 1) return;
    // A hitch longer than 0.05s must not skip the step. The clock itself stays 1/60.
    bank.current += Math.min(delta, 0.05);
    while (bank.current >= FIXED && progress.current < 1) {
      bank.current -= FIXED;
      progress.current = Math.min(1, progress.current + FIXED / GLIDE_SECONDS);
    }
    setTick((value) => value + 1);
  });

  const turnT = !glide || reduce ? 1 : seen.current === glide.id ? progress.current : 0;
  useLayoutEffect(() => {
    if (!glide) return;
    if (reduce || (seen.current === glide.id && progress.current >= 1)) onSettled?.(glide.id);
  }, [glide, onSettled, reduce, tick, turnT]);

  const shepherdAt = glide ? lerpPeg(glide.shepherdFrom, glide.shepherdTo, turnT) : pegPosition(shown.shepherd);
  const crook = toolOffset(glide?.dir ?? shown.lastDir);
  const fallen = state.status === "lose" && !glide;
  const reveal = shown.status === "win" && !glide;

  return (
    <group>
      <mesh position={[0, 0, -0.12]} receiveShadow>
        <planeGeometry args={[4.4, 4.4]} />
        <meshStandardMaterial color={BOARD} roughness={0.94} />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={`peg-${index}`} position={lift(pegPosition(index), 0.02)} castShadow>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={BRASS} roughness={0.45} metalness={0.35} />
        </mesh>
      ))}
      {shown.stars.map((star) => {
        const radius = star.mass === 1 ? 0.16 : 0.28;
        const seated = star.at === star.goal;
        return (
          <mesh key={`goal-${star.goal}`} position={lift(pegPosition(star.goal), 0.03)}>
            <torusGeometry args={[radius, star.mass === 1 ? 0.012 : 0.02, 8, 18]} />
            <meshStandardMaterial
              color={star.mass === 1 ? LIGHT_STAR : HEAVY_STAR}
              emissive={star.mass === 1 ? LIGHT_STAR : HEAVY_STAR}
              emissiveIntensity={seated ? 0.55 : 0.12}
              roughness={0.4}
            />
          </mesh>
        );
      })}
      {shown.stars.map((star, index) => {
        const moving = glide?.starIndex === index;
        const at = moving ? lerpPeg(glide.starFrom, glide.starTo, turnT) : pegPosition(star.at);
        const radius = star.mass === 1 ? 0.12 : 0.22;
        const color = star.mass === 1 ? LIGHT_STAR : HEAVY_STAR;
        return (
          <mesh key={`star-${index}`} position={lift(at, 0.08)} castShadow>
            <sphereGeometry args={[radius, 18, 14]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.32} />
          </mesh>
        );
      })}
      {shown.stars.map((star, index) => {
        if (reveal || !star.tether || glide?.starIndex === index) return null;
        const [from, to] = tetherEnds(star.tether);
        return (
          <Rope
            key={`tether-${index}`}
            a={lift(pegPosition(from), 0.06)}
            b={lift(pegPosition(to), 0.06)}
            radius={0.012}
            color={ROPE}
            intensity={0.2}
          />
        );
      })}
      {glide?.starIndex !== null && glide ? (
        <Rope
          a={lift(shepherdAt, 0.1)}
          b={lift(lerpPeg(glide.starFrom, glide.starTo, turnT), 0.1)}
          radius={0.018}
          color={GOLD}
          intensity={0.45}
        />
      ) : null}
      {reveal
        ? shown.figure.slice(1).map((peg, index) => (
          <Rope
            key={`figure-${peg}`}
            a={lift(pegPosition(shown.figure[index]), 0.1)}
            b={lift(pegPosition(peg), 0.1)}
            radius={0.02}
            color={GOLD}
            intensity={0.7}
          />
        ))
        : null}
      <group position={lift(shepherdAt, 0)}>
        <group rotation={fallen ? [0.7, 0, 0] : [0, 0, 0]}>
          <mesh castShadow position={[0, 0, 0.06]}>
            <capsuleGeometry args={[0.08, 0.16, 4, 8]} />
            <meshStandardMaterial color={CLOAK} roughness={0.62} />
          </mesh>
          <mesh castShadow position={[crook[0], crook[1] + 0.05, crook[2] + 0.08]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color={LANTERN} emissive={LANTERN} emissiveIntensity={0.45} roughness={0.35} />
          </mesh>
        </group>
      </group>
      <mesh position={[-2.15, 0.35, 0.35]}>
        <planeGeometry args={[0.78, 0.98]} />
        <meshStandardMaterial map={shepherdMap} roughness={0.9} />
      </mesh>
      <mesh position={[2.15, 0.72, 0.2]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshStandardMaterial map={lightMap} roughness={0.9} />
      </mesh>
      <mesh position={[2.15, -0.55, 0.15]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshStandardMaterial map={heavyMap} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.35, 0]} receiveShadow>
        <circleGeometry args={[3.3, 40]} />
        <meshStandardMaterial map={floorMap} color={[0.5, 0.52, 0.56]} roughness={1} />
      </mesh>
    </group>
  );
}

function FixedCamera({ view }: { view: number }) {
  const camera = useThree((item) => item.camera);
  useLayoutEffect(() => {
    const place = CAMERA_POSES[view % CAMERA_POSES.length] ?? CAMERA_POSES[0];
    camera.position.set(place[0], place[1], place[2]);
    camera.lookAt(0, 0, 0);
  }, [camera, view]);
  return null;
}

export default function ConstellationShepherdScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: SkyState;
  shown: SkyState;
  glide: SkyGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 38 }}>
      <color attach="background" args={[0.03, 0.04, 0.08]} />
      <ambientLight intensity={0.38} />
      <directionalLight
        position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]}
        intensity={2.35}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Textures state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -2.34, 0]} opacity={0.45} scale={8} blur={2.2} far={3} />
    </Canvas>
  );
}

function Textures(props: {
  state: SkyState;
  shown: SkyState;
  glide: SkyGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const [shepherdMap, lightMap, heavyMap, floorMap] = useTexture([SHEPHERD, LIGHT, HEAVY, FLOOR]);
  prepare([shepherdMap, lightMap, heavyMap, floorMap]);
  return <World {...props} shepherdMap={shepherdMap} lightMap={lightMap} heavyMap={heavyMap} floorMap={floorMap} />;
}
