import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { Quaternion, SRGBColorSpace, Vector3, type Texture } from "three";
import {
  CAMERA_POSES,
  HALL,
  KEY_LIGHT,
  cellX,
  coneCenter,
  focusAt,
  gazeVector,
  lensAt,
  visitorAt,
  type NightState,
} from "../../lib/games/museum-night";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const MARBLE_MAP = "/games/museum-night-marble.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;
const CONE_HEIGHT = 0.7;

const WALL: [number, number, number] = [0.08, 0.1, 0.12];
const FLOOR: [number, number, number] = [0.14, 0.13, 0.12];
const STONE: [number, number, number] = [0.55, 0.54, 0.5];
const BRONZE: [number, number, number] = [0.62, 0.46, 0.24];
const PROP: [number, number, number] = [0.42, 0.46, 0.5];
const MARK: [number, number, number] = [0.78, 0.64, 0.32];
const VISITOR: [number, number, number] = [0.86, 0.62, 0.28];
const LENS: [number, number, number] = [0.72, 0.16, 0.14];
const CASE: [number, number, number] = [0.9, 0.88, 0.8];

export interface NightGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  marbleMap,
}: {
  state: NightState;
  shown: NightState;
  glide: NightGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  marbleMap: Texture;
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

  const held = state.status === "win" ? 1 : 0;
  const visitorBeat = state.visitors[state.phase] ?? [];
  const tokens = state.seats.filter((token, index, all) => all.indexOf(token) === index);

  return (
    <group>
      <mesh position={[0, 1.15, -1.45]} receiveShadow>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color={WALL} roughness={0.94} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The hall floor lies on XZ, and the camera stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side toward the lens.
        2026-10-15
      */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 4.2]} />
        <meshStandardMaterial color={FLOOR} roughness={0.9} />
      </mesh>
      {Array.from({ length: HALL }, (_, index) => (
        <mesh key={`plinth-${index}`} position={[cellX(index), 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.36, 0.62]} />
          <meshStandardMaterial map={marbleMap} color={STONE} roughness={0.62} />
        </mesh>
      ))}
      <group position={[cellX(state.goal), 0.4, 0]}>
        {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.06, z]}>
            <boxGeometry args={[0.045, 0.12, 0.045]} />
            <meshStandardMaterial color={MARK} emissive={MARK} emissiveIntensity={0.25 + held * 0.55} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {state.camera.map((index) => (
        <Gaze key={`lens-${index}`} from={lensAt(index)} to={focusAt(index)} color={LENS} />
      ))}
      {visitorBeat.map((index) => (
        <Gaze key={`visitor-${state.phase}-${index}`} from={visitorAt(index)} to={focusAt(index)} color={VISITOR} />
      ))}
      {tokens.map((token) => {
        const from = shown.seats.indexOf(token);
        const to = state.seats.indexOf(token);
        const x = mix(cellX(from), cellX(to), turnT);
        const player = token === 0;
        return (
          <group key={`token-${token}`} position={[x, 0, 0]}>
            {/* Cylinders already stand on +Y, so the figure is not given a second heading. 2026-10-15 */}
            <mesh position={[0, player ? 0.72 : 0.58, 0]} castShadow>
              <cylinderGeometry args={[player ? 0.12 : 0.1, player ? 0.14 : 0.12, player ? 0.52 : 0.36, 16]} />
              <meshStandardMaterial color={player ? BRONZE : PROP} roughness={0.55} />
            </mesh>
            {player ? (
              <mesh position={[0, 1.08, 0]} castShadow>
                <sphereGeometry args={[0.1, 16, 12]} />
                <meshStandardMaterial color={BRONZE} roughness={0.45} />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {state.status === "win" ? (
        <mesh position={[cellX(state.goal), 0.78, 0]}>
          <boxGeometry args={[0.7, 1.2, 0.7]} />
          <meshStandardMaterial color={CASE} emissive={CASE} emissiveIntensity={0.2} transparent opacity={0.22} depthWrite={false} roughness={0.25} />
        </mesh>
      ) : null}
    </group>
  );
}

function Gaze({
  from,
  to,
  color,
}: {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  color: [number, number, number];
}) {
  const dir = gazeVector(from, to);
  const center = coneCenter(from, to, CONE_HEIGHT);
  // ConeGeometry's axis is +Y. Mapping +Y onto the gaze keeps the tip toward the plinth; a +Z aim would lay the cone sideways.
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dir[0], dir[1], dir[2]));
  return (
    <mesh position={center} quaternion={quaternion}>
      <coneGeometry args={[0.16, CONE_HEIGHT, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} transparent opacity={0.34} depthWrite={false} roughness={0.35} />
    </mesh>
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

export default function MuseumNightScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: NightState;
  shown: NightState;
  glide: NightGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.04, 0.05, 0.07]} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.55} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Hall state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0]} opacity={0.42} scale={8} blur={2.2} far={2.6} />
    </Canvas>
  );
}

function Hall(props: {
  state: NightState;
  shown: NightState;
  glide: NightGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const marbleMap = useTexture(MARBLE_MAP);
  prepare(marbleMap);
  return <World {...props} marbleMap={marbleMap} />;
}
