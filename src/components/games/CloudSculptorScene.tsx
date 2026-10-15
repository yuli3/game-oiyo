import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  KEY_LIGHT,
  STONE,
  aimPoint,
  cellX,
  cellY,
  destination,
  type CloudState,
  type Dir,
} from "../../lib/games/cloud-sculptor";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const VAPOR_MAP = "/games/cloud-sculptor-vapor.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;
const SKY_CELLS = [0, 1, 2, 3, 5, 6, 7, 8] as const;

const SKY: [number, number, number] = [0.1, 0.14, 0.18];
const LEDGE: [number, number, number] = [0.16, 0.15, 0.13];
const ROCK: [number, number, number] = [0.28, 0.26, 0.24];
const MARK: [number, number, number] = [0.78, 0.64, 0.32];
const CARD: [number, number, number] = [0.93, 0.9, 0.82];
const CLOUD: [number, number, number] = [0.9, 0.91, 0.93];

export interface CloudGlide {
  id: number;
}

function prepare(map: Texture) {
  map.colorSpace = SRGBColorSpace;
}

function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function puffMotion(shown: readonly number[], next: readonly number[], dir: Dir | null) {
  return shown.map((cell) => {
    if (!dir) return { from: cell, x: cellX(cell), y: cellY(cell), fade: false };
    const aim = aimPoint(cell, dir);
    const landed = destination(cell, dir);
    return { from: cell, x: aim[0], y: aim[1], fade: landed === null || !next.includes(landed) };
  });
}

function World({
  state,
  shown,
  glide,
  reduce,
  onSettled,
  vaporMap,
}: {
  state: CloudState;
  shown: CloudState;
  glide: CloudGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  vaporMap: Texture;
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

  const motion = puffMotion(shown.cells, state.cells, state.lastAction);
  const held = state.status === "win" ? 1 : 0;

  return (
    <group>
      <mesh position={[0, 0, -0.35]} receiveShadow>
        <planeGeometry args={[4.4, 4.4]} />
        <meshStandardMaterial color={SKY} roughness={0.96} />
      </mesh>
      <mesh position={[0, -1.55, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 2.4]} />
        <meshStandardMaterial color={LEDGE} roughness={0.92} />
      </mesh>
      {SKY_CELLS.map((index) => (
        <mesh key={`cell-${index}`} position={[cellX(index), cellY(index), -0.02]} receiveShadow>
          <boxGeometry args={[0.62, 0.62, 0.04]} />
          <meshStandardMaterial color={SKY} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[cellX(STONE), cellY(STONE), 0.22]} castShadow>
        <boxGeometry args={[0.36, 0.56, 0.36]} />
        <meshStandardMaterial color={ROCK} roughness={0.72} />
      </mesh>
      {state.target.map((index) => (
        <group key={`mark-${index}`} position={[cellX(index), cellY(index), 0.02]}>
          {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.08]}>
              <boxGeometry args={[0.045, 0.045, 0.16]} />
              <meshStandardMaterial color={MARK} emissive={MARK} emissiveIntensity={0.25 + held * 0.55} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {motion.map((puff) => {
        const x0 = cellX(puff.from);
        const y0 = cellY(puff.from);
        const x = mix(x0, puff.x, turnT);
        const y = mix(y0, puff.y, turnT);
        const fading = puff.fade && turnT > 0;
        return (
          <mesh key={`puff-${puff.from}`} position={[x, y, 0.2]} castShadow>
            <sphereGeometry args={[0.2, 18, 14]} />
            <meshStandardMaterial
              map={vaporMap}
              color={CLOUD}
              roughness={0.78}
              transparent={fading}
              opacity={fading ? 1 - turnT : 1}
              depthWrite={!fading}
            />
          </mesh>
        );
      })}
      {state.status === "win" ? (
        <mesh position={[0, 0, 0.46]}>
          <boxGeometry args={[2.55, 2.55, 0.02]} />
          <meshStandardMaterial color={CARD} emissive={CARD} emissiveIntensity={0.35} transparent opacity={0.22} depthWrite={false} roughness={0.25} />
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

export default function CloudSculptorScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: CloudState;
  shown: CloudState;
  glide: CloudGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.04, 0.06, 0.09]} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]} intensity={1.55} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Vapor state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -1.56, 0.2]} opacity={0.4} scale={7} blur={2.2} far={2.4} />
    </Canvas>
  );
}

function Vapor(props: {
  state: CloudState;
  shown: CloudState;
  glide: CloudGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const vaporMap = useTexture(VAPOR_MAP);
  prepare(vaporMap);
  return <World {...props} vaporMap={vaporMap} />;
}
