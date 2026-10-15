import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { DoubleSide, SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  KEY_LIGHT,
  needle,
  needleAngle,
  needleTip,
  type Axis,
  type PilotState,
} from "../../lib/games/blind-pilot";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const PANEL_MAP = "/games/blind-pilot-panel.jpg";
const RUNWAY_MAP = "/games/blind-pilot-runway.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const NIGHT: [number, number, number] = [0.07, 0.08, 0.1];
const PANEL: [number, number, number] = [0.14, 0.15, 0.17];
const BEZEL: [number, number, number] = [0.46, 0.38, 0.22];
const FACE: [number, number, number] = [0.05, 0.055, 0.07];
const NEEDLE: [number, number, number] = [0.93, 0.72, 0.32];
const TICK: [number, number, number] = [0.78, 0.74, 0.66];
const DEAD: [number, number, number] = [0.62, 0.24, 0.18];
const SHUTTER: [number, number, number] = [0.2, 0.21, 0.24];
const YOKE: [number, number, number] = [0.16, 0.17, 0.19];
const HUB: [number, number, number] = [0.55, 0.48, 0.32];
const SCREW: [number, number, number] = [0.28, 0.27, 0.25];
const INDEX: [number, number, number] = [0.9, 0.86, 0.74];
const GLASS: [number, number, number] = [0.72, 0.8, 0.84];
/** Dial-plane fasteners. These angles are not a heading: local +x/+y stay on the panel. */
const SCREW_AT = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4] as const;

const GAUGE_X: Record<Axis, number> = { pitch: -0.78, bank: 0, power: 0.78 };
const AXES: readonly Axis[] = ["pitch", "bank", "power"];
const MARKS = [-1, 0, 1] as const;

export interface PilotGlide {
  id: number;
}

function prepare(maps: Texture[]) {
  for (const map of maps) map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function Gauge({ axis, reading, dead }: { axis: Axis; reading: number; dead: boolean }) {
  // needleAngle is the only yaw of this needle. The +z camera test already locks a positive reading toward world +x. 2026-10-15
  const angle = needleAngle(reading);
  return (
    <group position={[GAUGE_X[axis], 0.08, 0.18]}>
      <mesh castShadow>
        <torusGeometry args={[0.24, 0.03, 10, 28]} />
        <meshStandardMaterial color={BEZEL} metalness={0.58} roughness={0.32} />
      </mesh>
      {/* CylinderGeometry's axis is +Y. A quarter-turn on X lays that axis along Z so the well faces the +z camera. 2026-10-15 */}
      <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.03, 28]} />
        <meshStandardMaterial color={FACE} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.19, 28]} />
        <meshStandardMaterial color={FACE} roughness={0.86} side={DoubleSide} />
      </mesh>
      {SCREW_AT.map((turn) => (
        <mesh key={`${axis}-screw-${turn}`} position={[Math.cos(turn) * 0.31, Math.sin(turn) * 0.31, 0.02]} castShadow>
          <sphereGeometry args={[0.016, 10, 10]} />
          <meshStandardMaterial color={SCREW} metalness={0.62} roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0.02]}>
        <coneGeometry args={[0.02, 0.046, 3]} />
        <meshStandardMaterial color={INDEX} roughness={0.4} />
      </mesh>
      {MARKS.map((mark) => {
        const [x, y] = needleTip(mark);
        if (mark === 0) return null;
        return (
          <mesh key={`${axis}-${mark}`} position={[x * 0.15, y * 0.15, 0.01]} rotation={[0, 0, needleAngle(mark)]}>
            <boxGeometry args={[0.012, 0.032, 0.008]} />
            <meshStandardMaterial color={TICK} roughness={0.46} />
          </mesh>
        );
      })}
      <group rotation={[0, 0, angle]}>
        <mesh position={[0, 0.075, 0.02]} castShadow>
          <boxGeometry args={[0.016, 0.15, 0.01]} />
          <meshStandardMaterial color={NEEDLE} emissive={NEEDLE} emissiveIntensity={0.28} roughness={0.38} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.028]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color={HUB} metalness={0.4} roughness={0.35} />
      </mesh>
      {dead ? (
        <mesh position={[0, 0, 0.04]} rotation={[0, 0, 0.78]}>
          <boxGeometry args={[0.36, 0.016, 0.01]} />
          <meshStandardMaterial color={DEAD} roughness={0.42} />
        </mesh>
      ) : null}
      {/* Standard material only. Transmission on this canvas goes black, so the cover stays a faint disc. 2026-10-15 */}
      <mesh position={[0, 0, 0.055]} renderOrder={2}>
        <circleGeometry args={[0.21, 28]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.18} depthWrite={false} roughness={0.06} metalness={0.04} side={DoubleSide} />
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
  panelMap,
  runwayMap,
}: {
  state: PilotState;
  shown: PilotState;
  glide: PilotGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  panelMap: Texture;
  runwayMap: Texture;
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

  const shutterFrom = shown.status === "play" ? 0 : 1;
  const shutterTo = state.status === "play" ? 0 : 1;
  const shutter = mix(shutterFrom, shutterTo, turnT);

  return (
    <group>
      <mesh position={[-1.48, 0.15, -0.15]}>
        <boxGeometry args={[0.08, 2.15, 1.15]} />
        <meshStandardMaterial color={NIGHT} roughness={0.92} />
      </mesh>
      <mesh position={[1.48, 0.15, -0.15]}>
        <boxGeometry args={[0.08, 2.15, 1.15]} />
        <meshStandardMaterial color={NIGHT} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.98, -0.62]}>
        <planeGeometry args={[2.15, 0.92]} />
        <meshStandardMaterial map={runwayMap} color={[0.55, 0.62, 0.7]} roughness={0.94} side={DoubleSide} />
      </mesh>
      {/* The shutter stays down while the approach is live, so the window cannot be used as a second attitude instrument. 2026-10-15 */}
      <group position={[0, 0.98 + shutter * 1.15, -0.28]}>
        <mesh>
          <boxGeometry args={[2.28, 1.12, 0.04]} />
          <meshStandardMaterial color={SHUTTER} metalness={0.28} roughness={0.48} />
        </mesh>
        {[0, 1, 2, 3, 4].map((index) => (
          <mesh key={`slat-${index}`} position={[0, (index - 2) * 0.2, 0.03]}>
            <boxGeometry args={[2.2, 0.035, 0.02]} />
            <meshStandardMaterial color={BEZEL} metalness={0.35} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.7, 0.08]} castShadow>
        <boxGeometry args={[2.75, 0.07, 0.42]} />
        <meshStandardMaterial color={PANEL} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.12, -0.06]} receiveShadow>
        <boxGeometry args={[2.75, 1.48, 0.14]} />
        <meshStandardMaterial color={PANEL} roughness={0.8} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.12, 0.02]}>
        <planeGeometry args={[2.45, 1.2]} />
        <meshStandardMaterial map={panelMap} color={[0.62, 0.6, 0.56]} roughness={0.88} side={DoubleSide} />
      </mesh>
      {AXES.map((axis) => (
        <Gauge
          key={axis}
          axis={axis}
          dead={state.dead === axis}
          reading={mix(needle(shown, axis), needle(state, axis), turnT)}
        />
      ))}
      <group position={[0, -0.78, 0.32]}>
        <mesh rotation={[0.55, 0, 0]}>
          <torusGeometry args={[0.26, 0.032, 8, 20]} />
          <meshStandardMaterial color={YOKE} metalness={0.22} roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.08, 0.04]}>
          <boxGeometry args={[0.08, 0.22, 0.06]} />
          <meshStandardMaterial color={YOKE} roughness={0.6} />
        </mesh>
      </group>
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

export default function BlindPilotScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: PilotState;
  shown: PilotState;
  glide: PilotGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.015, 0.018, 0.028]} />
      <ambientLight intensity={0.38} />
      <directionalLight
        position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Textures state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -1.02, 0]} opacity={0.42} scale={8} blur={2.1} far={3.6} />
    </Canvas>
  );
}

function Textures(props: {
  state: PilotState;
  shown: PilotState;
  glide: PilotGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const [panelMap, runwayMap] = useTexture([PANEL_MAP, RUNWAY_MAP]);
  prepare([panelMap, runwayMap]);
  return <World {...props} panelMap={panelMap} runwayMap={runwayMap} />;
}
