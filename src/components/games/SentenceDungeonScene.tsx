import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  EMPTY,
  FIRE,
  ICE,
  KEY_LIGHT,
  MARK_Z,
  ROOM_Z,
  WATER,
  cellX,
  type RoomState,
} from "../../lib/games/sentence-dungeon";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const STONE_MAP = "/games/sentence-dungeon-stone.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const STONE: [number, number, number] = [0.45, 0.4, 0.36];
const FLOOR: [number, number, number] = [0.34, 0.3, 0.27];
const SOCKET: [number, number, number] = [0.28, 0.25, 0.22];
const ICE_BLOCK: [number, number, number] = [0.62, 0.78, 0.86];
const ICE_MARK: [number, number, number] = [0.38, 0.48, 0.54];
const BRAZIER: [number, number, number] = [0.32, 0.22, 0.16];
const FLAME: [number, number, number] = [0.86, 0.42, 0.14];
const FLAME_MARK: [number, number, number] = [0.48, 0.26, 0.12];
const BASIN: [number, number, number] = [0.16, 0.34, 0.52];
const BASIN_MARK: [number, number, number] = [0.12, 0.22, 0.32];
const SPARK: [number, number, number] = [0.9, 0.72, 0.38];
const SHEET: [number, number, number] = [0.74, 0.82, 0.9];

export interface RoomGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Socket({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.06, z]} receiveShadow>
      {/* A short cylinder already stands on +Y, so the socket is not tipped over. 2026-10-15 */}
      <cylinderGeometry args={[0.3, 0.32, 0.1, 16]} />
      <meshStandardMaterial color={SOCKET} roughness={0.9} />
    </mesh>
  );
}

function Element({
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
  if (kind === EMPTY) return null;
  const ice = muted ? ICE_MARK : ICE_BLOCK;
  const flame = muted ? FLAME_MARK : FLAME;
  const water = muted ? BASIN_MARK : BASIN;
  return (
    <group position={[x, 0, z]} scale={scale}>
      {kind === ICE ? (
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[0.28, 0.42, 0.28]} />
          <meshStandardMaterial color={ice} roughness={0.26} />
        </mesh>
      ) : null}
      {kind === FIRE ? (
        <group>
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.18, 0.18, 12]} />
            <meshStandardMaterial color={BRAZIER} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color={flame} emissive={flame} emissiveIntensity={muted ? 0.12 : 0.65} roughness={0.42} />
          </mesh>
        </group>
      ) : null}
      {kind === WATER ? (
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.12, 16]} />
          <meshStandardMaterial color={water} roughness={0.24} />
        </mesh>
      ) : null}
    </group>
  );
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  stoneMap,
}: {
  state: RoomState;
  shown: RoomState;
  glide: RoomGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  stoneMap: Texture;
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

  const changed = state.cells.findIndex((kind, index) => kind !== shown.cells[index]);
  const settling = changed >= 0 && turnT < 1;

  return (
    <group>
      <mesh position={[0, 1.05, MARK_Z - 0.85]} receiveShadow>
        <planeGeometry args={[8, 2.4]} />
        <meshStandardMaterial map={stoneMap} color={STONE} roughness={0.94} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The floor lies on XZ, and the camera stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side toward the lens.
        2026-10-15
      */}
      <mesh position={[0, 0, 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5.2]} />
        <meshStandardMaterial map={stoneMap} color={FLOOR} roughness={0.92} />
      </mesh>
      {state.goal.map((kind, index) => (
        <Element key={`mark-${index}`} kind={kind} x={cellX(index)} z={MARK_Z} scale={0.62} muted />
      ))}
      {state.cells.map((_, index) => (
        <Socket key={`socket-${index}`} x={cellX(index)} z={ROOM_Z} />
      ))}
      {state.cells.map((kind, index) => {
        const previous = shown.cells[index] ?? EMPTY;
        const scale = settling && index === changed ? mix(0.2, 1, turnT) : 1;
        return (
          <group key={`cell-${index}`}>
            {settling && index === changed ? (
              <Element kind={previous} x={cellX(index)} z={ROOM_Z} scale={mix(1, 0.2, turnT)} muted={false} />
            ) : null}
            <Element kind={kind} x={cellX(index)} z={ROOM_Z} scale={scale} muted={false} />
          </group>
        );
      })}
      {settling && changed > 0 ? (
        <mesh position={[mix(cellX(changed - 1), cellX(changed), turnT), 0.62, ROOM_Z]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshStandardMaterial color={SPARK} emissive={SPARK} emissiveIntensity={0.4} roughness={0.35} />
        </mesh>
      ) : null}
      {state.status === "win" ? (
        <mesh position={[0, 0.48, ROOM_Z]}>
          <boxGeometry args={[4.6, 0.7, 1.1]} />
          <meshStandardMaterial color={SHEET} emissive={SHEET} emissiveIntensity={0.12} transparent opacity={0.18} depthWrite={false} roughness={0.35} />
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

export default function SentenceDungeonScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: RoomState;
  shown: RoomState;
  glide: RoomGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.14, 0.12, 0.12]} />
      <ambientLight intensity={0.36} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Corridor state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0.15]} opacity={0.42} scale={8} blur={2.2} far={2.6} />
    </Canvas>
  );
}

function Corridor(props: {
  state: RoomState;
  shown: RoomState;
  glide: RoomGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const stoneMap = useTexture(STONE_MAP);
  prepare(stoneMap);
  return <World {...props} stoneMap={stoneMap} />;
}
