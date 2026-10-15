import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  BARE,
  CAMERA_POSES,
  FEED,
  KEY_LIGHT,
  MARK_Z,
  ROOM_Z,
  TRACK,
  cellX,
  type HuntState,
} from "../../lib/games/quiet-hunt";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const EARTH_MAP = "/games/quiet-hunt-earth.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const EARTH: [number, number, number] = [0.4, 0.38, 0.28];
const FLOOR: [number, number, number] = [0.24, 0.26, 0.18];
const PLOT: [number, number, number] = [0.46, 0.4, 0.3];
const PLOT_MARK: [number, number, number] = [0.32, 0.3, 0.24];
const PRINT: [number, number, number] = [0.28, 0.22, 0.16];
const PRINT_MARK: [number, number, number] = [0.22, 0.2, 0.16];
const GRAIN: [number, number, number] = [0.72, 0.58, 0.28];
const GRAIN_MARK: [number, number, number] = [0.42, 0.36, 0.22];
const VANE: [number, number, number] = [0.55, 0.48, 0.32];
const FLAG: [number, number, number] = [0.75, 0.42, 0.22];
const WARM: [number, number, number] = [0.95, 0.62, 0.28];
const COLD: [number, number, number] = [0.55, 0.72, 0.78];
const SHEET: [number, number, number] = [0.82, 0.78, 0.62];

export interface FieldGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Prints({ color }: { color: [number, number, number] }) {
  const spots: readonly (readonly [number, number])[] = [[-0.08, 0.05], [0.02, 0.08], [0.09, -0.02]];
  return (
    <group>
      {spots.map(([x, z], index) => (
        <mesh key={index} position={[x, 0.035, z]} castShadow>
          {/* A short cylinder already stands on +Y, so the print lies flat on the plot. 2026-10-15 */}
          <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
          <meshStandardMaterial color={color} roughness={0.86} />
        </mesh>
      ))}
    </group>
  );
}

function Mound({ color }: { color: [number, number, number] }) {
  return (
    <mesh position={[0, 0.06, 0]} scale={[1, 0.45, 1]} castShadow>
      <sphereGeometry args={[0.1, 12, 10]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function Vane({ x, z, scale }: { x: number; z: number; scale: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      {/* The mast stands on +Y. The flag reaches +x because the wind only walks east, so this mesh is not turned toward the lens. 2026-10-15 */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.02, 0.42, 8]} />
        <meshStandardMaterial color={VANE} roughness={0.62} />
      </mesh>
      <mesh position={[0.08, 0.44, 0]} castShadow>
        <boxGeometry args={[0.14, 0.05, 0.018]} />
        <meshStandardMaterial color={FLAG} roughness={0.5} />
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
  const print = muted ? PRINT_MARK : PRINT;
  const grain = muted ? GRAIN_MARK : GRAIN;
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.64, 0.04, 0.52]} />
        <meshStandardMaterial color={pad} roughness={0.9} />
      </mesh>
      {kind === TRACK ? <Prints color={print} /> : null}
      {kind === FEED ? <Mound color={grain} /> : null}
    </group>
  );
}

function sparkAt(from: number, to: number, t: number): [number, number, number] {
  return [mix(cellX(from), cellX(to), t), mix(0.32, 0.7, t), ROOM_Z];
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  earthMap,
}: {
  state: HuntState;
  shown: HuntState;
  glide: FieldGlide | null;
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
  const settling = changed.length > 0 && turnT < 1;
  const windX = mix(cellX(shown.wind), cellX(state.wind), turnT);
  const spark = state.lastAction === "S" ? COLD : WARM;

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
        <Plot key={`mark-${index}`} kind={kind} x={cellX(index)} z={MARK_Z} scale={0.62} muted />
      ))}
      <Vane x={cellX(state.goalWind)} z={MARK_Z} scale={0.62} />
      {state.cells.map((kind, index) => {
        const previous = shown.cells[index] ?? BARE;
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
      <Vane x={windX} z={ROOM_Z} scale={1} />
      {settling ? (
        <mesh position={sparkAt(shown.wind, state.wind, turnT)}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color={spark} emissive={spark} emissiveIntensity={0.4} roughness={0.32} />
        </mesh>
      ) : null}
      {state.status === "win" ? (
        <mesh position={[cellX(state.wind), 0.28, ROOM_Z]}>
          <boxGeometry args={[0.72, 0.48, 0.7]} />
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

export default function QuietHuntScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: HuntState;
  shown: HuntState;
  glide: FieldGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.11, 0.12, 0.09]} />
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
  state: HuntState;
  shown: HuntState;
  glide: FieldGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const earthMap = useTexture(EARTH_MAP);
  prepare(earthMap);
  return <World {...props} earthMap={earthMap} />;
}
