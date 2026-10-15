import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { DoubleSide, Matrix4, Quaternion, SRGBColorSpace, Vector3, type Group, type Texture } from "three";
import {
  CAMERA_POSES,
  CORE,
  KEY_LIGHT,
  SHELL,
  antipode,
  cellPosition,
  frameAlong,
  poseOnArc,
  seams,
  type AxisBit,
  type PlanetState,
} from "../../lib/games/glass-planet";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const FLOOR = "/games/glass-planet-floor.jpg";
const OUTER = "/games/glass-planet-outer.jpg";
const INNER = "/games/glass-planet-inner.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.22;

export interface PlanetGlide {
  id: number;
  from: number;
  to: number;
  bit: AxisBit;
}

const COAT_OUTER: [number, number, number] = [0.55, 0.74, 0.7];
const COAT_INNER: [number, number, number] = [0.72, 0.46, 0.26];
const BRASS: [number, number, number] = [0.8, 0.66, 0.38];
const GLASS: [number, number, number] = [0.72, 0.86, 0.92];
const CRACK: [number, number, number] = [0.55, 0.28, 0.24];
const VOID: [number, number, number] = [0.32, 0.14, 0.16];
const EXIT: [number, number, number] = [0.78, 0.62, 0.28];
const QUIET: [number, number, number] = [0.58, 0.74, 0.78];

function prepare(floor: Texture, outer: Texture, inner: Texture) {
  for (const map of [floor, outer, inner]) map.colorSpace = SRGBColorSpace;
}

function basisQuaternion(from: number, to: number, t: number): Quaternion {
  const frame = frameAlong(from, to, t);
  // Local +y is the outward radius. Local +z is the back, so the nose (local −z) follows `facing`.
  const matrix = new Matrix4().makeBasis(
    new Vector3(frame.right[0], frame.right[1], frame.right[2]),
    new Vector3(frame.up[0], frame.up[1], frame.up[2]),
    new Vector3(-frame.facing[0], -frame.facing[1], -frame.facing[2]),
  );
  return new Quaternion().setFromRotationMatrix(matrix);
}

function Walker({
  from,
  to,
  t,
  radius,
  scale,
  coat,
  fallen,
}: {
  from: number;
  to: number;
  t: number;
  radius: number;
  scale: number;
  coat: [number, number, number];
  fallen: boolean;
}) {
  const position = poseOnArc(from, to, t, radius);
  const quaternion = basisQuaternion(from, to, t);
  return (
    <group position={position} quaternion={quaternion}>
      <group rotation={fallen ? [1.05, 0, 0] : [0, 0, 0]}>
        <mesh castShadow position={[0, 0.03 * scale, 0]}>
          <capsuleGeometry args={[0.055 * scale, 0.1 * scale, 4, 8]} />
          <meshStandardMaterial color={coat} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 0.04 * scale, -0.08 * scale]}>
          <sphereGeometry args={[0.03 * scale, 10, 10]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Seam({
  a,
  b,
  open,
}: {
  a: readonly [number, number, number];
  b: readonly [number, number, number];
  open: boolean;
}) {
  const direction = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = direction.length();
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[open ? 0.012 : 0.028, open ? 0.012 : 0.028, length * 0.72, 6]} />
      <meshStandardMaterial
        color={open ? QUIET : [0.88, 0.91, 0.93]}
        transparent
        opacity={open ? 0.4 : 0.92}
        roughness={open ? 0.25 : 0.55}
      />
    </mesh>
  );
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  floor,
  outer,
  inner,
}: {
  state: PlanetState;
  shown: PlanetState;
  glide: PlanetGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  floor: Texture;
  outer: Texture;
  inner: Texture;
}) {
  const progress = useRef(0);
  const bank = useRef(0);
  const seen = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  const root = useRef<Group>(null);

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

  const faceBit = glide?.bit ?? state.lastBit ?? 1;
  // At rest, `from` is the cell they left so the nose points along the arrival, not back at it.
  const outerFrom = glide ? glide.from : (shown.outer ^ faceBit) & 7;
  const outerTo = glide ? glide.to : shown.outer;
  const outerT = glide ? turnT : 1;
  const innerFrom = glide ? antipode(glide.from) : (antipode(shown.outer) ^ faceBit) & 7;
  const innerTo = glide ? antipode(glide.to) : antipode(shown.outer);
  const fallen = state.loseReason === "trap" && !glide;
  const shellSeams = seams(shown);

  return (
    <group ref={root}>
      {/*
        Transmission without a local environment map draws the shell black.
        Opacity keeps the inner walker readable (2026-10-15).
      */}
      <mesh>
        <sphereGeometry args={[SHELL, 48, 32]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.18} roughness={0.08} metalness={0.02} side={DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[CORE * 1.35, 32, 24]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.08} roughness={0.2} side={DoubleSide} />
      </mesh>
      {shellSeams.map((seam) => (
        <group key={seam.key}>
          <Seam a={seam.outerA} b={seam.outerB} open={seam.outerOpen} />
          <Seam a={seam.innerA} b={seam.innerB} open={seam.innerOpen} />
        </group>
      ))}
      {shown.outerTags.map((tag, index) => (
        <mesh key={`o${index}`} position={cellPosition(index, SHELL + 0.02)}>
          <sphereGeometry args={[tag === "empty" ? 0.045 : 0.07, 12, 12]} />
          <meshStandardMaterial
            color={tag === "crack" ? CRACK : tag === "exit" ? EXIT : QUIET}
            emissive={tag === "exit" ? EXIT : tag === "crack" ? CRACK : [0, 0, 0]}
            emissiveIntensity={tag === "empty" ? 0 : 0.35}
            roughness={0.4}
          />
        </mesh>
      ))}
      {shown.innerTags.map((tag, index) => (
        <mesh key={`i${index}`} position={cellPosition(index, CORE * 0.92)}>
          <sphereGeometry args={[tag === "empty" ? 0.035 : 0.055, 10, 10]} />
          <meshStandardMaterial
            color={tag === "void" ? VOID : tag === "exit" ? EXIT : QUIET}
            emissive={tag === "void" ? VOID : tag === "exit" ? EXIT : [0, 0, 0]}
            emissiveIntensity={tag === "empty" ? 0 : 0.4}
            roughness={0.45}
          />
        </mesh>
      ))}
      <Walker from={outerFrom} to={outerTo} t={outerT} radius={SHELL + 0.12} scale={1} coat={COAT_OUTER} fallen={fallen} />
      <Walker from={innerFrom} to={innerTo} t={outerT} radius={CORE * 0.78} scale={0.72} coat={COAT_INNER} fallen={fallen} />
      <mesh position={[-2.05, 0.2, 0.55]} rotation={[0, 0.5, 0]}>
        <planeGeometry args={[0.72, 0.9]} />
        <meshStandardMaterial map={outer} roughness={0.9} />
      </mesh>
      <mesh position={[2.05, 0.05, -0.35]} rotation={[0, -0.45, 0]}>
        <planeGeometry args={[0.68, 0.86]} />
        <meshStandardMaterial map={inner} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
        <circleGeometry args={[3.2, 40]} />
        <meshStandardMaterial map={floor} color={[0.55, 0.58, 0.52]} roughness={1} />
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

export default function GlassPlanetScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: PlanetState;
  shown: PlanetState;
  glide: PlanetGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 38 }}>
      <color attach="background" args={[0.05, 0.07, 0.08]} />
      <ambientLight intensity={0.34} />
      <directionalLight
        position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Textures state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -1.04, 0]} opacity={0.5} scale={7} blur={2.2} far={2.4} />
    </Canvas>
  );
}

function Textures(props: {
  state: PlanetState;
  shown: PlanetState;
  glide: PlanetGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const [floor, outer, inner] = useTexture([FLOOR, OUTER, INNER]);
  prepare(floor, outer, inner);
  return <World {...props} floor={floor} outer={outer} inner={inner} />;
}
