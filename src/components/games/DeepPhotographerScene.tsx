import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { DoubleSide, SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  KEY_LIGHT,
  inBeam,
  stationX,
  type ShotState,
} from "../../lib/games/deep-photographer";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const SAND_MAP = "/games/deep-photographer-sand.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;
const STATIONS = [0, 1, 2, 3] as const;

const WATER: [number, number, number] = [0.02, 0.05, 0.07];
const STONE: [number, number, number] = [0.12, 0.13, 0.14];
const BEAM: [number, number, number] = [0.92, 0.62, 0.28];
const FISH: [number, number, number] = [0.78, 0.84, 0.8];
const TAIL: [number, number, number] = [0.55, 0.7, 0.68];
const HUNTER: [number, number, number] = [0.16, 0.1, 0.12];
const JAW: [number, number, number] = [0.34, 0.16, 0.14];
const MARK: [number, number, number] = [0.72, 0.58, 0.28];
const FRAME: [number, number, number] = [0.9, 0.88, 0.8];

export interface ShotGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Fish({ x }: { x: number }) {
  return (
    <group position={[x, 0.28, 0.18]}>
      <mesh castShadow>
        <sphereGeometry args={[0.13, 18, 14]} />
        <meshStandardMaterial color={FISH} roughness={0.42} />
      </mesh>
      <mesh position={[0.02, 0.04, 0.1]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color={FRAME} roughness={0.3} />
      </mesh>
      {/* Cone axis is +Y. A negative quarter-turn on Z lays the tail toward +x, the dark end. 2026-10-15 */}
      <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.16, 4]} />
        <meshStandardMaterial color={TAIL} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Hunter({ x, lit }: { x: number; lit: boolean }) {
  return (
    <group position={[x, 0.24, 0.22]}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color={HUNTER} emissive={lit ? JAW : HUNTER} emissiveIntensity={lit ? 0.35 : 0.04} roughness={0.72} />
      </mesh>
      <mesh position={[-0.12, -0.02, 0.08]}>
        <boxGeometry args={[0.16, 0.06, 0.1]} />
        <meshStandardMaterial color={JAW} roughness={0.48} />
      </mesh>
    </group>
  );
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  sandMap,
}: {
  state: ShotState;
  shown: ShotState;
  glide: ShotGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  sandMap: Texture;
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

  const lampNow = mix(shown.lamp, state.lamp, turnT);
  const fishX = mix(stationX(shown.subject), stationX(state.subject), turnT);
  const hunterX = mix(stationX(shown.predator), stationX(state.predator), turnT);
  const held = state.status === "win" ? 1 : 0;

  return (
    <group>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.2, 2.4]} />
        <meshStandardMaterial map={sandMap} color={[0.45, 0.5, 0.52]} roughness={0.94} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.7, -0.85]}>
        <planeGeometry args={[6.2, 2.2]} />
        <meshStandardMaterial color={WATER} roughness={0.96} side={DoubleSide} />
      </mesh>
      {STATIONS.map((index) => {
        const lit = Math.min(1, Math.max(0, lampNow - index));
        return (
          <group key={`station-${index}`} position={[stationX(index), 0.02, 0.05]}>
            <mesh receiveShadow>
              <boxGeometry args={[0.5, 0.025, 0.7]} />
              <meshStandardMaterial color={BEAM} emissive={BEAM} emissiveIntensity={0.15 + lit * 0.85} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.16, -0.28]}>
              <boxGeometry args={[0.06, 0.32, 0.06]} />
              <meshStandardMaterial color={STONE} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
      <group position={[stationX(state.seat), 0.06, 0.05]}>
        {[[-0.2, -0.24], [0.2, -0.24], [-0.2, 0.24], [0.2, 0.24]].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.08, z]}>
            <boxGeometry args={[0.035, 0.16, 0.035]} />
            <meshStandardMaterial color={MARK} emissive={MARK} emissiveIntensity={0.2 + held * 0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <Fish x={fishX} />
      <Hunter x={hunterX} lit={inBeam(state.predator, state.lamp)} />
      {state.status === "win" ? (
        <mesh position={[stationX(state.subject), 0.42, 0.42]}>
          <boxGeometry args={[0.72, 0.46, 0.02]} />
          <meshStandardMaterial color={FRAME} emissive={FRAME} emissiveIntensity={0.45} transparent opacity={0.28} depthWrite={false} roughness={0.2} />
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
    camera.lookAt(0, 0.15, 0);
  }, [camera, view]);
  return null;
}

export default function DeepPhotographerScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: ShotState;
  shown: ShotState;
  glide: ShotGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.01, 0.02, 0.03]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Sand state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.45} scale={8} blur={2.2} far={3.2} />
    </Canvas>
  );
}

function Sand(props: {
  state: ShotState;
  shown: ShotState;
  glide: ShotGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const sandMap = useTexture(SAND_MAP);
  prepare(sandMap);
  return <World {...props} sandMap={sandMap} />;
}
