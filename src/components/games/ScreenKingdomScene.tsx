import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  HOUSE,
  KEEP,
  KEY_LIGHT,
  MARK_Z,
  ROOM_Z,
  YARD,
  cellX,
  type KingdomState,
} from "../../lib/games/screen-kingdom";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const STONE_MAP = "/games/screen-kingdom-stone.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const EARTH: [number, number, number] = [0.45, 0.36, 0.28];
const FLOOR: [number, number, number] = [0.28, 0.22, 0.16];
const PLOT: [number, number, number] = [0.55, 0.46, 0.34];
const PLOT_MARK: [number, number, number] = [0.36, 0.3, 0.24];
const WALL: [number, number, number] = [0.72, 0.5, 0.34];
const WALL_MARK: [number, number, number] = [0.48, 0.34, 0.26];
const ROOF: [number, number, number] = [0.55, 0.28, 0.22];
const ROOF_MARK: [number, number, number] = [0.38, 0.22, 0.18];
const POLE: [number, number, number] = [0.42, 0.34, 0.26];
const BANNER: [number, number, number] = [0.78, 0.62, 0.28];
const WARM: [number, number, number] = [0.95, 0.62, 0.28];
const COLD: [number, number, number] = [0.72, 0.78, 0.86];
const SHEET: [number, number, number] = [0.9, 0.82, 0.66];

export interface FieldGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Stories({ height, wall, roof }: { height: number; wall: [number, number, number]; roof: [number, number, number] }) {
  if (height === YARD) return null;
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.42, 0.28, 0.36]} />
        <meshStandardMaterial color={wall} roughness={0.74} />
      </mesh>
      {height === KEEP ? (
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.28, 0.2, 0.24]} />
          <meshStandardMaterial color={roof} roughness={0.62} />
        </mesh>
      ) : null}
      {height === HOUSE ? (
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[0.46, 0.06, 0.4]} />
          <meshStandardMaterial color={roof} roughness={0.68} />
        </mesh>
      ) : null}
    </group>
  );
}

function Banner({ x, z, scale }: { x: number; z: number; scale: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      {/* The pole stands on +Y. The cloth reaches +x because the mark only walks east on the screen, so this mesh is not turned toward the lens. 2026-10-15 */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.52, 8]} />
        <meshStandardMaterial color={POLE} roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.52, 0]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.02]} />
        <meshStandardMaterial color={BANNER} roughness={0.48} />
      </mesh>
    </group>
  );
}

function Plot({
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
  const pad = muted ? PLOT_MARK : PLOT;
  const wall = muted ? WALL_MARK : WALL;
  const roof = muted ? ROOF_MARK : ROOF;
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.64, 0.04, 0.52]} />
        <meshStandardMaterial color={pad} roughness={0.9} />
      </mesh>
      <Stories height={kind} wall={wall} roof={roof} />
    </group>
  );
}

function sparkAt(from: number, to: number, t: number): [number, number, number] {
  return [mix(cellX(from), cellX(to), t), mix(0.36, 0.72, t), ROOM_Z];
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  stoneMap,
}: {
  state: KingdomState;
  shown: KingdomState;
  glide: FieldGlide | null;
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

  const changed = state.cells.flatMap((kind, index) => (kind === shown.cells[index] ? [] : [index]));
  const settling = changed.length > 0 && turnT < 1;
  const markX = mix(cellX(shown.mark), cellX(state.mark), turnT);
  const sparkFrom = state.lastAction === "R" ? state.mark + 1 : shown.mark;
  const sparkTo = state.lastAction === "R" ? state.mark : state.mark;
  const spark = state.lastAction === "W" ? COLD : WARM;

  return (
    <group>
      <mesh position={[0, 1.05, MARK_Z - 0.85]} receiveShadow>
        <planeGeometry args={[8, 2.4]} />
        <meshStandardMaterial map={stoneMap} color={EARTH} roughness={0.94} />
      </mesh>
      {/*
        PlaneGeometry faces +Z. The ground lies on XZ, and the lens stays
        in the +Z hemisphere, so this quarter-turn keeps the lit side upward.
        2026-10-15
      */}
      <mesh position={[0, 0, 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5.2]} />
        <meshStandardMaterial map={stoneMap} color={FLOOR} roughness={0.92} />
      </mesh>
      {state.goal.map((kind, index) => (
        <Plot key={`mark-${index}`} kind={kind} x={cellX(index)} z={MARK_Z} scale={0.62} muted />
      ))}
      <Banner x={cellX(state.goalMark)} z={MARK_Z} scale={0.62} />
      {state.cells.map((kind, index) => {
        const previous = shown.cells[index] ?? YARD;
        const moving = settling && changed.includes(index);
        return (
          <group key={`cell-${index}`}>
            {moving ? (
              <Plot kind={previous} x={cellX(index)} z={ROOM_Z} scale={mix(1, 0.2, turnT)} muted={false} />
            ) : null}
            <Plot kind={kind} x={cellX(index)} z={ROOM_Z} scale={moving ? mix(0.2, 1, turnT) : 1} muted={false} />
          </group>
        );
      })}
      <Banner x={markX} z={ROOM_Z} scale={1} />
      {(settling || (shown.mark !== state.mark && turnT < 1)) && state.lastAction ? (
        <mesh position={sparkAt(sparkFrom, sparkTo, turnT)}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color={spark} emissive={spark} emissiveIntensity={0.4} roughness={0.32} />
        </mesh>
      ) : null}
      {state.status === "win" ? (
        <mesh position={[cellX(state.mark), 0.36, ROOM_Z]}>
          <boxGeometry args={[0.72, 0.64, 0.7]} />
          <meshStandardMaterial color={SHEET} emissive={SHEET} emissiveIntensity={0.08} transparent opacity={0.18} depthWrite={false} roughness={0.4} />
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

export default function ScreenKingdomScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: KingdomState;
  shown: KingdomState;
  glide: FieldGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.13, 0.09, 0.07]} />
      <ambientLight intensity={0.34} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.45} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Field state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -0.02, 0.15]} opacity={0.42} scale={8} blur={2.2} far={2.6} />
    </Canvas>
  );
}

function Field(props: {
  state: KingdomState;
  shown: KingdomState;
  glide: FieldGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const stoneMap = useTexture(STONE_MAP);
  prepare(stoneMap);
  return <World {...props} stoneMap={stoneMap} />;
}
