import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  DUE,
  KEY_LIGHT,
  LATE,
  MARK_Z,
  QUIET,
  ROOM_Z,
  cellX,
  type LineState,
} from "../../lib/games/subway-conductor";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const CONCRETE_MAP = "/games/subway-conductor-concrete.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const CONCRETE: [number, number, number] = [0.42, 0.44, 0.46];
const FLOOR: [number, number, number] = [0.22, 0.24, 0.28];
const PLATFORM: [number, number, number] = [0.48, 0.5, 0.52];
const PLATFORM_MARK: [number, number, number] = [0.32, 0.34, 0.36];
const TRAIN: [number, number, number] = [0.2, 0.45, 0.62];
const TRAIN_MARK: [number, number, number] = [0.16, 0.28, 0.36];
const TRAIN_LATE: [number, number, number] = [0.55, 0.32, 0.18];
const LAMP: [number, number, number] = [0.92, 0.62, 0.28];
const LAMP_MARK: [number, number, number] = [0.48, 0.36, 0.22];
const LAMP_DIM: [number, number, number] = [0.35, 0.42, 0.5];
const CLOTH: [number, number, number] = [0.28, 0.32, 0.4];
const CLOTH_MARK: [number, number, number] = [0.28, 0.3, 0.32];
const SKIN: [number, number, number] = [0.7, 0.52, 0.4];
const RAIL: [number, number, number] = [0.55, 0.58, 0.62];
const WARM: [number, number, number] = [0.95, 0.62, 0.28];
const COLD: [number, number, number] = [0.45, 0.7, 0.9];
const SHEET: [number, number, number] = [0.75, 0.82, 0.9];

export interface LineGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Rider({ x, cloth }: { x: number; cloth: [number, number, number] }) {
  return (
    <group position={[x, 0, 0.12]}>
      {/* A cylinder already stands on +Y, so the rider is not tipped onto the platform. 2026-10-15 */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.2, 10]} />
        <meshStandardMaterial color={cloth} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>
    </group>
  );
}

function Stop({
  kind,
  x,
  z,
  scale,
  muted,
}: {
  kind: number;
  x: number;
  z: number;
  scale: number;
  muted: boolean;
}) {
  const platform = muted ? PLATFORM_MARK : PLATFORM;
  const train = kind === LATE ? (muted ? TRAIN_MARK : TRAIN_LATE) : (muted ? TRAIN_MARK : TRAIN);
  const lamp = kind === LATE ? (muted ? LAMP_MARK : LAMP) : LAMP_DIM;
  const cloth = muted ? CLOTH_MARK : CLOTH;
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.52, 0.08, 0.46]} />
        <meshStandardMaterial color={platform} roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 0.28, -0.12]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.36, 8]} />
        <meshStandardMaterial color={RAIL} roughness={0.45} />
      </mesh>
      <mesh position={[0.16, 0.48, -0.12]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={kind === LATE && !muted ? 0.7 : 0.12} roughness={0.4} />
      </mesh>
      {kind === QUIET ? null : (
        <mesh position={[0, 0.2, -0.02]} castShadow>
          <boxGeometry args={[0.36, 0.16, 0.18]} />
          <meshStandardMaterial color={train} roughness={0.48} />
        </mesh>
      )}
      {kind === DUE ? <Rider x={-0.16} cloth={cloth} /> : null}
      {kind === LATE ? (
        <group>
          <Rider x={-0.18} cloth={cloth} />
          <Rider x={0.18} cloth={cloth} />
        </group>
      ) : null}
    </group>
  );
}

function sparkAt(west: number, east: number, t: number): [number, number, number] {
  if (west === east) return [cellX(west), mix(0.35, 0.85, t), ROOM_Z];
  return [mix(cellX(west), cellX(east), t), 0.55, ROOM_Z];
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  concreteMap,
}: {
  state: LineState;
  shown: LineState;
  glide: LineGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  concreteMap: Texture;
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

  const changed = state.cells.flatMap((kind, index) => (kind === shown.cells[index] ? [] : [index]));
  const west = changed[0] ?? -1;
  const east = changed[changed.length - 1] ?? -1;
  const settling = west >= 0 && turnT < 1;
  const spark = state.lastAction === "S" ? COLD : WARM;

  return (
    <group>
      <mesh position={[0, 1.05, MARK_Z - 0.85]} receiveShadow>
        <planeGeometry args={[8, 2.4]} />
        <meshStandardMaterial map={concreteMap} color={CONCRETE} roughness={0.94} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The ground lies on XZ, and the lens stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side upward.
        2026-10-15
      */}
      <mesh position={[0, 0, 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5.2]} />
        <meshStandardMaterial map={concreteMap} color={FLOOR} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.03, ROOM_Z + 0.28]} receiveShadow>
        <boxGeometry args={[4.8, 0.04, 0.08]} />
        <meshStandardMaterial color={RAIL} roughness={0.4} />
      </mesh>
      {state.goal.map((kind, index) => (
        <Stop key={`mark-${index}`} kind={kind} x={cellX(index)} z={MARK_Z} scale={0.62} muted />
      ))}
      {state.cells.map((kind, index) => {
        const previous = shown.cells[index] ?? QUIET;
        const moving = settling && changed.includes(index);
        return (
          <group key={`cell-${index}`}>
            {moving ? (
              <Stop kind={previous} x={cellX(index)} z={ROOM_Z} scale={mix(1, 0.2, turnT)} muted={false} />
            ) : null}
            <Stop kind={kind} x={cellX(index)} z={ROOM_Z} scale={moving ? mix(0.2, 1, turnT) : 1} muted={false} />
          </group>
        );
      })}
      {settling ? (
        <mesh position={sparkAt(west, east, turnT)}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color={spark} emissive={spark} emissiveIntensity={0.45} roughness={0.32} />
        </mesh>
      ) : null}
      {state.status === "win" ? (
        <mesh position={[0, 0.42, ROOM_Z]}>
          <boxGeometry args={[4.6, 0.7, 1.15]} />
          <meshStandardMaterial color={SHEET} emissive={SHEET} emissiveIntensity={0.1} transparent opacity={0.18} depthWrite={false} roughness={0.4} />
        </mesh>
      ) : null}
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

export default function SubwayConductorScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: LineState;
  shown: LineState;
  glide: LineGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.1, 0.12, 0.16]} />
      <ambientLight intensity={0.34} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.45} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Line state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0.15]} opacity={0.45} scale={8} blur={2.2} far={2.6} />
    </Canvas>
  );
}

function Line(props: {
  state: LineState;
  shown: LineState;
  glide: LineGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const concreteMap = useTexture(CONCRETE_MAP);
  prepare(concreteMap);
  return <World {...props} concreteMap={concreteMap} />;
}
