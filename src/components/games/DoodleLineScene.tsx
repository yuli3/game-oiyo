import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  ABSENT,
  CAMERA_POSES,
  INK,
  KEY_LIGHT,
  ROWS,
  STONE,
  cellX,
  cellZ,
  colOf,
  rowOf,
  type LineState,
} from "../../lib/games/doodle-line";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const PAPER_MAP = "/games/doodle-line-paper.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const PAPER: [number, number, number] = [0.78, 0.73, 0.62];
const WALL: [number, number, number] = [0.62, 0.58, 0.5];
const INK_DROP: [number, number, number] = [0.1, 0.12, 0.22];
const STONE_INK: [number, number, number] = [0.42, 0.4, 0.36];
const ENEMY: [number, number, number] = [0.62, 0.2, 0.16];
const BASE: [number, number, number] = [0.28, 0.33, 0.26];
const LANE: [number, number, number] = [0.55, 0.28, 0.22];
const NIB: [number, number, number] = [0.08, 0.08, 0.1];
const SHEET: [number, number, number] = [0.74, 0.82, 0.9];

export interface LineGlide {
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
  paperMap,
}: {
  state: LineState;
  shown: LineState;
  glide: LineGlide | null;
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

  const penX = mix(cellX(colOf(shown.tip)), cellX(colOf(state.tip)), turnT);
  const penZ = mix(cellZ(rowOf(shown.tip)), cellZ(rowOf(state.tip)), turnT);
  const moving = shown.tip !== state.tip;

  return (
    <group>
      <mesh position={[0, 1.15, -1.85]} receiveShadow>
        <planeGeometry args={[8, 2.6]} />
        <meshStandardMaterial map={paperMap} color={WALL} roughness={0.94} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The page lies on XZ, and the camera stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side toward the lens.
        2026-10-15
      */}
      <mesh position={[0, 0, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5.4]} />
        <meshStandardMaterial map={paperMap} color={PAPER} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.05, cellZ(ROWS) - 0.16]} receiveShadow>
        <boxGeometry args={[3.6, 0.1, 0.28]} />
        <meshStandardMaterial color={BASE} roughness={0.78} />
      </mesh>
      {state.threats.map((col) => (
        <mesh key={`lane-${col}`} position={[cellX(col), 0.02, 0.35]}>
          <boxGeometry args={[0.36, 0.015, 3.5]} />
          <meshStandardMaterial color={LANE} transparent opacity={0.22} depthWrite={false} roughness={0.7} />
        </mesh>
      ))}
      {state.cells.map((cell, index) => (
        cell === STONE ? (
          <mesh key={`stone-${index}`} position={[cellX(colOf(index)), 0.18, cellZ(rowOf(index))]} castShadow receiveShadow>
            {/* A short cylinder already stands on +Y, so the pebble is not tipped over. 2026-10-15 */}
            <cylinderGeometry args={[0.16, 0.18, 0.28, 12]} />
            <meshStandardMaterial color={STONE_INK} roughness={0.84} />
          </mesh>
        ) : null
      ))}
      {state.stroke.slice(0, -1).map((from, index) => {
        const to = state.stroke[index + 1];
        const last = index === state.stroke.length - 2;
        const ax = cellX(colOf(from));
        const az = cellZ(rowOf(from));
        const bx = last && moving ? penX : cellX(colOf(to));
        const bz = last && moving ? penZ : cellZ(rowOf(to));
        const eastWest = rowOf(from) === rowOf(to);
        const position: [number, number, number] = eastWest
          ? [(ax + bx) / 2, 0.07, az]
          : [ax, 0.07, (az + bz) / 2];
        const size: [number, number, number] = eastWest
          ? [Math.abs(bx - ax) + 0.14, 0.045, 0.12]
          : [0.12, 0.045, Math.abs(bz - az) + 0.14];
        return (
          <mesh key={`rib-${from}-${to}`} position={position} castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={INK_DROP} roughness={0.55} />
          </mesh>
        );
      })}
      {state.stroke.map((index) => {
        if (moving && index === state.tip) return null;
        if (state.cells[index] !== INK) return null;
        return (
          <mesh key={`drop-${index}`} position={[cellX(colOf(index)), 0.08, cellZ(rowOf(index))]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.04, 14]} />
            <meshStandardMaterial color={INK_DROP} roughness={0.48} />
          </mesh>
        );
      })}
      <group position={[penX, 0, penZ]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.07, 14, 12]} />
          <meshStandardMaterial color={INK_DROP} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.28, 10]} />
          <meshStandardMaterial color={NIB} roughness={0.46} />
        </mesh>
      </group>
      {state.caught.map((row, col) => {
        const from = shown.caught[col] ?? ABSENT;
        const to = row;
        if (from === ABSENT && to === ABSENT) return null;
        const z = mix(cellZ(from), cellZ(to), turnT);
        return (
          <group key={`enemy-${col}`} position={[cellX(col), 0, z]}>
            <mesh position={[0, 0.2, 0]} castShadow>
              <sphereGeometry args={[0.13, 16, 12]} />
              <meshStandardMaterial color={ENEMY} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 0.1, 10]} />
              <meshStandardMaterial color={ENEMY} roughness={0.58} />
            </mesh>
          </group>
        );
      })}
      {state.status === "win" ? (
        <mesh position={[0, 0.42, 0.15]}>
          <boxGeometry args={[3.7, 0.72, 2.6]} />
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

export default function DoodleLineScene({
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
      <color attach="background" args={[0.93, 0.9, 0.82]} />
      <ambientLight intensity={0.38} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.45} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Sheet state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0.2]} opacity={0.38} scale={8} blur={2.2} far={2.6} />
    </Canvas>
  );
}

function Sheet(props: {
  state: LineState;
  shown: LineState;
  glide: LineGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const paperMap = useTexture(PAPER_MAP);
  prepare(paperMap);
  return <World {...props} paperMap={paperMap} />;
}
