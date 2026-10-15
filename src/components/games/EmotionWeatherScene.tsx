import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  DRY,
  FAIR,
  KEY_LIGHT,
  MARK_Z,
  ROOM_Z,
  WET,
  cellX,
  type TownState,
} from "../../lib/games/emotion-weather";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const EARTH_MAP = "/games/emotion-weather-earth.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const EARTH: [number, number, number] = [0.46, 0.38, 0.28];
const FLOOR: [number, number, number] = [0.34, 0.4, 0.28];
const SOIL: [number, number, number] = [0.52, 0.36, 0.22];
const SOIL_MARK: [number, number, number] = [0.36, 0.28, 0.2];
const SUN: [number, number, number] = [0.92, 0.7, 0.28];
const SUN_MARK: [number, number, number] = [0.52, 0.4, 0.22];
const SKIN: [number, number, number] = [0.72, 0.52, 0.38];
const CLOTH: [number, number, number] = [0.28, 0.36, 0.5];
const CLOTH_MARK: [number, number, number] = [0.32, 0.32, 0.36];
const TRUNK: [number, number, number] = [0.36, 0.24, 0.16];
const LEAF: [number, number, number] = [0.28, 0.52, 0.3];
const LEAF_MARK: [number, number, number] = [0.24, 0.34, 0.26];
const RAIN: [number, number, number] = [0.42, 0.62, 0.84];
const RAIN_MARK: [number, number, number] = [0.28, 0.36, 0.46];
const WARM: [number, number, number] = [0.95, 0.58, 0.24];
const COLD: [number, number, number] = [0.52, 0.74, 0.95];
const SHEET: [number, number, number] = [0.78, 0.84, 0.92];

export interface TownGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Weather({
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
  const soil = muted ? SOIL_MARK : SOIL;
  const sun = muted ? SUN_MARK : SUN;
  const cloth = muted ? CLOTH_MARK : CLOTH;
  const leaf = muted ? LEAF_MARK : LEAF;
  const rain = muted ? RAIN_MARK : RAIN;
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.08, 16]} />
        <meshStandardMaterial color={soil} roughness={0.94} />
      </mesh>
      {/* A cylinder already stands on +Y, so the person is not tipped onto the ground. 2026-10-15 */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.28, 12]} />
        <meshStandardMaterial color={cloth} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>
      {kind === DRY ? (
        <mesh position={[0.16, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshStandardMaterial color={sun} emissive={sun} emissiveIntensity={muted ? 0.08 : 0.5} roughness={0.4} />
        </mesh>
      ) : null}
      {kind === FAIR ? (
        <group position={[-0.18, 0, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.28, 8]} />
            <meshStandardMaterial color={TRUNK} roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.44, 0]} castShadow>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color={leaf} roughness={0.7} />
          </mesh>
        </group>
      ) : null}
      {kind === WET ? (
        <group>
          <mesh position={[-0.1, 0.78, 0.04]}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color={rain} roughness={0.18} />
          </mesh>
          <mesh position={[0.05, 0.64, -0.02]}>
            <sphereGeometry args={[0.03, 10, 8]} />
            <meshStandardMaterial color={rain} roughness={0.18} />
          </mesh>
          <mesh position={[0.14, 0.86, 0.02]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color={rain} roughness={0.18} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function sparkAt(west: number, east: number, t: number): [number, number, number] {
  if (west === east) return [cellX(west), mix(0.4, 0.92, t), ROOM_Z];
  return [mix(cellX(west), cellX(east), t), 0.7, ROOM_Z];
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  earthMap,
}: {
  state: TownState;
  shown: TownState;
  glide: TownGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  earthMap: Texture;
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
  const spark = state.lastAction === "R" ? COLD : WARM;

  return (
    <group>
      <mesh position={[0, 1.05, MARK_Z - 0.85]} receiveShadow>
        <planeGeometry args={[8, 2.4]} />
        <meshStandardMaterial map={earthMap} color={EARTH} roughness={0.94} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The ground lies on XZ, and the lens stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side upward.
        2026-10-15
      */}
      <mesh position={[0, 0, 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5.2]} />
        <meshStandardMaterial map={earthMap} color={FLOOR} roughness={0.92} />
      </mesh>
      {state.goal.map((kind, index) => (
        <Weather key={`mark-${index}`} kind={kind} x={cellX(index)} z={MARK_Z} scale={0.62} muted />
      ))}
      {state.cells.map((kind, index) => {
        const previous = shown.cells[index] ?? FAIR;
        const moving = settling && changed.includes(index);
        return (
          <group key={`cell-${index}`}>
            {moving ? (
              <Weather kind={previous} x={cellX(index)} z={ROOM_Z} scale={mix(1, 0.2, turnT)} muted={false} />
            ) : null}
            <Weather kind={kind} x={cellX(index)} z={ROOM_Z} scale={moving ? mix(0.2, 1, turnT) : 1} muted={false} />
          </group>
        );
      })}
      {settling ? (
        <mesh position={sparkAt(west, east, turnT)}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color={spark} emissive={spark} emissiveIntensity={0.45} roughness={0.32} />
        </mesh>
      ) : null}
      {state.status === "win" ? (
        <mesh position={[0, 0.5, ROOM_Z]}>
          <boxGeometry args={[4.6, 0.95, 1.2]} />
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

export default function EmotionWeatherScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: TownState;
  shown: TownState;
  glide: TownGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.16, 0.14, 0.18]} />
      <ambientLight intensity={0.38} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Town state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0.15]} opacity={0.42} scale={8} blur={2.2} far={2.6} />
    </Canvas>
  );
}

function Town(props: {
  state: TownState;
  shown: TownState;
  glide: TownGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const earthMap = useTexture(EARTH_MAP);
  prepare(earthMap);
  return <World {...props} earthMap={earthMap} />;
}
