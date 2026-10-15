import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { DoubleSide, SRGBColorSpace, type Texture } from "three";
import {
  CAMERA_POSES,
  FLOOR_COUNT,
  KEY_LIGHT,
  floorY,
  type DreamState,
  type Relic,
} from "../../lib/games/dream-elevator";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const TRAVELER = "/games/dream-elevator-traveler.jpg";
const STONE = "/games/dream-elevator-stone.jpg";
const MOTE = "/games/dream-elevator-mote.jpg";
const HOUR = "/games/dream-elevator-hour.jpg";
const SHAFT = "/games/dream-elevator-shaft.jpg";
const FIXED = 1 / 60;
const GLIDE_SECONDS = 0.28;

const INDIGO: [number, number, number] = [0.1, 0.09, 0.16];
const BRASS: [number, number, number] = [0.62, 0.48, 0.28];
const WOOL: [number, number, number] = [0.33, 0.29, 0.38];
const SKIN: [number, number, number] = [0.72, 0.58, 0.48];
const ROCK: [number, number, number] = [0.42, 0.38, 0.34];
const SEED: [number, number, number] = [0.55, 0.84, 0.86];
const CLOCK: [number, number, number] = [0.74, 0.58, 0.3];
const AMBER: [number, number, number] = [0.62, 0.42, 0.22];
const DOOR: [number, number, number] = [0.14, 0.13, 0.18];

export interface DreamGlide {
  id: number;
  fromFloor: number;
  toFloor: number;
}

function prepare(maps: Texture[]) {
  for (const map of maps) map.colorSpace = SRGBColorSpace;
}

function RelicMesh({ relic }: { relic: Relic }) {
  if (relic === "stone") {
    return (
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.16, 0.18]} />
        <meshStandardMaterial color={ROCK} roughness={0.74} />
      </mesh>
    );
  }
  if (relic === "mote") {
    return (
      <mesh castShadow>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={SEED} emissive={SEED} emissiveIntensity={0.4} roughness={0.25} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh castShadow>
        <torusGeometry args={[0.1, 0.026, 8, 18]} />
        <meshStandardMaterial color={CLOCK} metalness={0.48} roughness={0.34} />
      </mesh>
      {/* Stopped time is a fixed hand. A spinning clock would invent a motion the rules do not have. 2026-10-15 */}
      <mesh position={[0.03, 0.045, 0.01]} rotation={[0, 0, 0.7]}>
        <boxGeometry args={[0.018, 0.08, 0.018]} />
        <meshStandardMaterial color={CLOCK} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Landing({ index, law, seal }: { index: number; law: Relic | null; seal: Relic | null }) {
  const y = floorY(index);
  return (
    <group>
      <mesh position={[0.2, y, 0]} receiveShadow>
        <boxGeometry args={[1.55, 0.08, 0.95]} />
        <meshStandardMaterial color={law === "stone" ? AMBER : INDIGO} roughness={0.9} />
      </mesh>
      {seal ? (
        <group position={[-0.95, y + 0.2, 0.15]} scale={0.62}>
          <RelicMesh relic={seal} />
        </group>
      ) : null}
      {law === "mote" ? (
        <group>
          <mesh position={[-0.35, y + 0.42, -0.28]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.06]} />
            <meshStandardMaterial color={SEED} emissive={SEED} emissiveIntensity={0.15} roughness={0.4} />
          </mesh>
          <mesh position={[0.7, y + 0.42, -0.28]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.06]} />
            <meshStandardMaterial color={SEED} emissive={SEED} emissiveIntensity={0.15} roughness={0.4} />
          </mesh>
        </group>
      ) : null}
      {law === "hour" ? (
        <group position={[0.15, y + 0.46, -0.32]} scale={1.35}>
          <RelicMesh relic="hour" />
        </group>
      ) : null}
      {index > 0 && law === null ? (
        <mesh position={[0.2, y + 0.42, -0.36]}>
          <boxGeometry args={[0.7, 0.62, 0.06]} />
          <meshStandardMaterial color={DOOR} roughness={0.86} />
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
  travelerMap,
  stoneMap,
  moteMap,
  hourMap,
  shaftMap,
}: {
  state: DreamState;
  shown: DreamState;
  glide: DreamGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
  travelerMap: Texture;
  stoneMap: Texture;
  moteMap: Texture;
  hourMap: Texture;
  shaftMap: Texture;
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
    // A hitch longer than 0.05s must not skip the ride. The clock itself stays 1/60.
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

  const fromY = floorY(glide ? glide.fromFloor : shown.floor);
  const toY = floorY(glide ? glide.toFloor : shown.floor);
  const cabinY = fromY + (toY - fromY) * turnT;
  const slumped = state.status === "lose" && !glide;

  return (
    <group>
      <mesh position={[-1.2, 0, -0.45]}>
        <boxGeometry args={[0.1, 6.4, 0.1]} />
        <meshStandardMaterial color={BRASS} metalness={0.42} roughness={0.46} />
      </mesh>
      {Array.from({ length: FLOOR_COUNT }, (_, index) => (
        <Landing
          key={`floor-${index}`}
          index={index}
          law={index === 0 ? null : state.laws[index]}
          seal={index === 0 ? null : (state.seals[index] as Relic)}
        />
      ))}
      <group position={[0, cabinY, 0.34]}>
        <mesh position={[0, -0.22, 0]} receiveShadow>
          <boxGeometry args={[0.78, 0.06, 0.7]} />
          <meshStandardMaterial color={BRASS} metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.15, -0.32]}>
          <boxGeometry args={[0.78, 0.7, 0.05]} />
          <meshStandardMaterial color={INDIGO} roughness={0.8} />
        </mesh>
        <mesh position={[-0.38, 0.15, 0]}>
          <boxGeometry args={[0.05, 0.7, 0.7]} />
          <meshStandardMaterial color={BRASS} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0.38, 0.15, 0]}>
          <boxGeometry args={[0.05, 0.7, 0.7]} />
          <meshStandardMaterial color={BRASS} metalness={0.3} roughness={0.5} />
        </mesh>
        <group position={[-0.08, 0.02, 0.05]} rotation={slumped ? [0.45, 0, 0] : [0, 0, 0]}>
          <mesh castShadow position={[0, 0.12, 0]}>
            <capsuleGeometry args={[0.09, 0.16, 4, 8]} />
            <meshStandardMaterial color={WOOL} roughness={0.72} />
          </mesh>
          <mesh castShadow position={[0, 0.32, 0.02]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.62} />
          </mesh>
        </group>
        {state.hand ? (
          <group position={[0.16, 0.08, 0.12]}>
            <RelicMesh relic={state.hand} />
          </group>
        ) : null}
      </group>
      {state.slots.map((relic, index) =>
        relic ? (
          <group key={relic} position={[0.72, floorY(index) + 0.18, 0.12]}>
            <RelicMesh relic={relic} />
          </group>
        ) : null,
      )}
      <mesh position={[-2.25, 0.85, 0.2]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial map={travelerMap} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[2.25, 1.05, 0.2]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshStandardMaterial map={stoneMap} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[2.25, 0.15, 0.2]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshStandardMaterial map={moteMap} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[2.25, -0.75, 0.2]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshStandardMaterial map={hourMap} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY(0) - 0.72, 0]} receiveShadow>
        <circleGeometry args={[4.2, 40]} />
        <meshStandardMaterial map={shaftMap} color={[0.5, 0.5, 0.58]} roughness={1} />
      </mesh>
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

export default function DreamElevatorScene({
  state,
  shown,
  glide,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: DreamState;
  shown: DreamState;
  glide: DreamGlide | null;
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]], fov: 36 }}>
      <color attach="background" args={[0.03, 0.03, 0.06]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <Textures state={state} shown={shown} glide={glide} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, floorY(0) - 0.7, 0]} opacity={0.45} scale={9} blur={2.2} far={4} />
    </Canvas>
  );
}

function Textures(props: {
  state: DreamState;
  shown: DreamState;
  glide: DreamGlide | null;
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const [travelerMap, stoneMap, moteMap, hourMap, shaftMap] = useTexture([TRAVELER, STONE, MOTE, HOUR, SHAFT]);
  prepare([travelerMap, stoneMap, moteMap, hourMap, shaftMap]);
  return <World {...props} travelerMap={travelerMap} stoneMap={stoneMap} moteMap={moteMap} hourMap={hourMap} shaftMap={shaftMap} />;
}
