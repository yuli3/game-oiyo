import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { Quaternion, SRGBColorSpace, Vector3, type Texture } from "three";
import {
  CAMERA_POSES,
  EMPTY,
  KEY_LIGHT,
  LEGS,
  POND,
  SPORE,
  cellX,
  coneCenter,
  gazeVector,
  windFrom,
  windTo,
  type PondState,
} from "../../lib/games/ink-ecology";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const PAPER_MAP = "/games/ink-ecology-paper.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;
const GUST_HEIGHT = 1.15;

const WATER: [number, number, number] = [0.05, 0.07, 0.09];
const PAPER: [number, number, number] = [0.62, 0.58, 0.5];
const STONE: [number, number, number] = [0.72, 0.69, 0.6];
const SPORE_INK: [number, number, number] = [0.86, 0.84, 0.76];
const LEG_INK: [number, number, number] = [0.14, 0.12, 0.1];
const GHOST: [number, number, number] = [0.55, 0.5, 0.38];
const GUST: [number, number, number] = [0.78, 0.82, 0.86];
const SHEET: [number, number, number] = [0.9, 0.88, 0.8];

export interface PondGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function indexOfId(ids: readonly number[], id: number): number {
  return ids.indexOf(id);
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  paperMap,
}: {
  state: PondState;
  shown: PondState;
  glide: PondGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  paperMap: Texture;
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
  const living = state.ids.filter((id) => id > 0);

  return (
    <group>
      <mesh position={[0, 1.05, -1.45]} receiveShadow>
        <planeGeometry args={[8, 2.8]} />
        <meshStandardMaterial map={paperMap} color={PAPER} roughness={0.92} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The pond lies on XZ, and the camera stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side toward the lens.
        2026-10-15
      */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 3.4]} />
        <meshStandardMaterial color={WATER} roughness={0.55} metalness={0.08} />
      </mesh>
      {Array.from({ length: POND }, (_, index) => (
        <group key={`pad-${index}`} position={[cellX(index), 0, 0]}>
          {/* A short cylinder already stands on +Y, so the stepping stone is not tipped over. 2026-10-15 */}
          <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.32, 0.1, 20]} />
            <meshStandardMaterial map={paperMap} color={STONE} roughness={0.72} />
          </mesh>
          {state.goal[index] !== EMPTY ? (
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.02, 16]} />
              <meshStandardMaterial color={GHOST} emissive={GHOST} emissiveIntensity={0.2 + held * 0.4} transparent opacity={0.45} depthWrite={false} roughness={0.6} />
            </mesh>
          ) : null}
        </group>
      ))}
      {living.map((id) => {
        const from = indexOfId(shown.ids, id);
        const to = indexOfId(state.ids, id);
        const origin = from < 0 ? to : from;
        const x = mix(cellX(origin), cellX(to), turnT);
        const kind = state.cells[to];
        return (
          <group key={`life-${id}`} position={[x, 0, 0]}>
            {kind === SPORE ? <Spore /> : null}
            {kind === LEGS ? <Legs /> : null}
          </group>
        );
      })}
      {state.lastAction === "G" ? <Gust /> : null}
      {state.status === "win" ? (
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[4.2, 0.9, 1.1]} />
          <meshStandardMaterial color={SHEET} emissive={SHEET} emissiveIntensity={0.15} transparent opacity={0.18} depthWrite={false} roughness={0.3} />
        </mesh>
      ) : null}
    </group>
  );
}

function Spore() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color={SPORE_INK} roughness={0.42} />
      </mesh>
      <mesh position={[-0.08, 0.2, 0.04]} castShadow>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={SPORE_INK} roughness={0.48} />
      </mesh>
      <mesh position={[0.08, 0.2, -0.02]} castShadow>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={SPORE_INK} roughness={0.48} />
      </mesh>
    </group>
  );
}

function Legs() {
  return (
    <group>
      {/* Cylinders already stand on +Y, so the bridge is not given a second heading. 2026-10-15 */}
      <mesh position={[-0.08, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.32, 8]} />
        <meshStandardMaterial color={LEG_INK} roughness={0.58} />
      </mesh>
      <mesh position={[0.08, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.32, 8]} />
        <meshStandardMaterial color={LEG_INK} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.22, 0.04, 0.08]} />
        <meshStandardMaterial color={LEG_INK} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Gust() {
  const from = windFrom();
  const to = windTo();
  const dir = gazeVector(from, to);
  const center = coneCenter(from, to, GUST_HEIGHT);
  // ConeGeometry's axis is +Y. Mapping +Y onto the gust keeps the tip toward the east shore.
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dir[0], dir[1], dir[2]));
  return (
    <mesh position={center} quaternion={quaternion}>
      <coneGeometry args={[0.1, GUST_HEIGHT, 12]} />
      <meshStandardMaterial color={GUST} emissive={GUST} emissiveIntensity={0.35} transparent opacity={0.32} depthWrite={false} roughness={0.4} />
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

export default function InkEcologyScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: PondState;
  shown: PondState;
  glide: PondGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.04, 0.05, 0.06]} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Hall state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0]} opacity={0.4} scale={8} blur={2.2} far={2.4} />
    </Canvas>
  );
}

function Hall(props: {
  state: PondState;
  shown: PondState;
  glide: PondGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const paperMap = useTexture(PAPER_MAP);
  prepare(paperMap);
  return <World {...props} paperMap={paperMap} />;
}
