import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { RepeatWrapping, SRGBColorSpace, type Group, type Texture } from "three";
import {
  KEY_LIGHT,
  cellCenter,
  doorOpen,
  doorWorldOffset,
  facingDir,
  heroYaw,
  poseOnArc,
  sliceEuler,
  type Axis,
  type DungeonState,
  type Turn,
} from "../../lib/games/reverse-dungeon";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const STONE = "/games/reverse-dungeon-stone.jpg";
const TRAVELER = "/games/reverse-dungeon-traveler.jpg";
const STEP = 1 / 60;
const SPIN_SECONDS = 0.28;

export interface DungeonSpin {
  id: number;
  axis: Axis;
  layer: 0 | 1;
  turn: Turn;
}

function prepare(stone: Texture, traveler: Texture) {
  stone.colorSpace = SRGBColorSpace;
  traveler.colorSpace = SRGBColorSpace;
  stone.wrapS = RepeatWrapping;
  stone.wrapT = RepeatWrapping;
  stone.repeat.set(2, 2);
}

function slab(dir: number): { position: [number, number, number]; args: [number, number, number] } {
  const [ox, oy, oz] = doorWorldOffset(dir);
  return {
    position: [Math.sign(ox) * 0.36, Math.sign(oy) * 0.36, Math.sign(oz) * 0.36],
    args: [Math.abs(ox) > 0 ? 0.06 : 0.7, Math.abs(oy) > 0 ? 0.06 : 0.7, Math.abs(oz) > 0 ? 0.06 : 0.7],
  };
}

function cellOf(index: number): [number, number, number] {
  return [index % 2, Math.floor(index / 2) % 2, Math.floor(index / 4)];
}

function Room({
  index,
  board,
  spin,
  turnT,
  live,
  selected,
  stone,
}: {
  index: number;
  board: DungeonState;
  spin: DungeonSpin | null;
  turnT: number;
  live: boolean;
  selected: { axis: Axis; layer: 0 | 1 };
  stone: Texture;
}) {
  const [x, y, z] = cellOf(index);
  const position = live && spin ? poseOnArc(x, y, z, spin.axis, spin.turn, turnT) : cellCenter(x, y, z);
  // Doors ride the slice. Pit and exit badges stay world-up: a quarter turn around x or z
  // would leave them on a side, then the settled room draws them upright (2026-10-15).
  const rotation = live && spin ? sliceEuler(spin.axis, spin.turn, turnT) : ([0, 0, 0] as [number, number, number]);
  const tag = board.tags[index];
  const tint: [number, number, number] = tag === "trap" ? [0.62, 0.34, 0.28] : tag === "exit" ? [0.55, 0.7, 0.5] : [0.78, 0.74, 0.66];
  const picked = [x, y, z][["x", "y", "z"].indexOf(selected.axis)] === selected.layer;
  const mask = board.rooms[index] ?? 0;
  return (
    <group position={position}>
      <group rotation={rotation}>
        {([0, 1, 2, 3, 4, 5] as const).map((dir) => {
          if (doorOpen(mask, dir)) return null;
          const face = slab(dir);
          return (
            <mesh key={dir} position={face.position} castShadow receiveShadow>
              <boxGeometry args={face.args} />
              <meshStandardMaterial map={stone} color={tint} roughness={0.9} metalness={0.02} emissive={picked ? [0.28, 0.2, 0.08] : [0, 0, 0]} emissiveIntensity={picked ? 0.45 : 0} />
            </mesh>
          );
        })}
      </group>
      {tag === "exit" ? (
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.34, 0.08, 0.34]} />
          <meshStandardMaterial color={[0.45, 0.62, 0.38]} emissive={[0.2, 0.28, 0.12]} emissiveIntensity={0.6} roughness={0.7} />
        </mesh>
      ) : null}
      {tag === "trap" ? (
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.28, 0.08, 0.28]} />
          <meshStandardMaterial color={[0.35, 0.12, 0.08]} emissive={[0.28, 0.08, 0.04]} emissiveIntensity={0.5} roughness={0.8} />
        </mesh>
      ) : null}
    </group>
  );
}

function Hero({
  state,
  face,
  reduce,
  fallen,
}: {
  state: DungeonState;
  face: DungeonState;
  reduce: boolean;
  fallen: boolean;
}) {
  const group = useRef<Group>(null);
  const shown = useRef(cellCenter(state.hero[0], state.hero[1], state.hero[2]));
  const from = useRef(shown.current);
  const acc = useRef(0);
  const travel = useRef(1);
  const seen = useRef("");
  const key = `${state.hero[0]}:${state.hero[1]}:${state.hero[2]}`;
  const yaw = heroYaw(facingDir(face));

  useLayoutEffect(() => {
    const goal = cellCenter(state.hero[0], state.hero[1], state.hero[2]);
    const node = group.current;
    if (!node) return;
    if (seen.current !== key) {
      if (seen.current !== "") {
        from.current = [shown.current[0], shown.current[1], shown.current[2]];
        travel.current = reduce ? 1 : 0;
        acc.current = 0;
      }
      seen.current = key;
      if (reduce || travel.current >= 1) shown.current = goal;
    }
    if (travel.current >= 1) {
      node.position.set(goal[0], goal[1] + (fallen ? 0.02 : 0.18), goal[2]);
      node.rotation.y = yaw;
    }
  }, [fallen, key, reduce, state.hero, yaw]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const goal = cellCenter(state.hero[0], state.hero[1], state.hero[2]);
    if (travel.current < 1) {
      acc.current += Math.min(0.05, delta);
      while (acc.current >= STEP && travel.current < 1) {
        travel.current = Math.min(1, travel.current + STEP / 0.18);
        acc.current -= STEP;
      }
      const u = travel.current;
      shown.current = [
        from.current[0] + (goal[0] - from.current[0]) * u,
        from.current[1] + (goal[1] - from.current[1]) * u,
        from.current[2] + (goal[2] - from.current[2]) * u,
      ];
    }
    const place = travel.current >= 1 ? goal : shown.current;
    node.position.set(place[0], place[1] + (fallen && travel.current >= 1 ? 0.02 : 0.18), place[2]);
    node.rotation.y = yaw;
  });

  return (
    <group ref={group}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.18, 0.36, 8]} />
        <meshStandardMaterial color={[0.28, 0.2, 0.14]} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color={[0.4, 0.3, 0.22]} roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.12, 0.08]}>
        <boxGeometry args={[0.06, 0.08, 0.06]} />
        <meshStandardMaterial color={[0.72, 0.48, 0.18]} emissive={[0.55, 0.32, 0.08]} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function World({
  state,
  board,
  spin,
  selected,
  reduce,
  onSettled,
}: {
  state: DungeonState;
  board: DungeonState;
  spin: DungeonSpin | null;
  selected: { axis: Axis; layer: 0 | 1 };
  reduce: boolean;
  onSettled?: (id: number) => void;
}) {
  const [stone, traveler] = useTexture([STONE, TRAVELER]);
  const [progress, setProgress] = useState(1);
  const progressRef = useRef(1);
  const acc = useRef(0);
  const seen = useRef(0);
  const settledId = useRef(0);
  useLayoutEffect(() => { prepare(stone, traveler); }, [stone, traveler]);
  useFrame((_, delta) => {
    if (!spin || reduce) return;
    if (spin.id !== seen.current) {
      seen.current = spin.id;
      acc.current = 0;
      progressRef.current = 0;
      setProgress(0);
      return;
    }
    acc.current += Math.min(0.05, delta);
    let next = progressRef.current;
    let moved = false;
    while (acc.current >= STEP && next < 1) {
      next = Math.min(1, next + STEP / SPIN_SECONDS);
      acc.current -= STEP;
      moved = true;
    }
    if (moved) {
      progressRef.current = next;
      setProgress(next);
    }
  });
  // Stale progress is still 1 on the first render of a new spin. Treat that frame as t = 0
  // so the rooms do not flash at the destination before the clock starts.
  const spinning = spin !== null && board !== state;
  const started = spinning && seen.current === spin.id;
  const turnT = spinning ? (reduce ? 1 : started ? progress : 0) : 1;
  useLayoutEffect(() => {
    if (!spin || !spinning || settledId.current === spin.id) return;
    if (reduce || (seen.current === spin.id && progress >= 1)) {
      settledId.current = spin.id;
      onSettled?.(spin.id);
    }
  }, [onSettled, progress, reduce, spin, spinning]);
  return (
    <group>
      {Array.from({ length: 8 }, (_, index) => {
        const [x, y, z] = cellOf(index);
        const onLayer = spin !== null && [x, y, z][["x", "y", "z"].indexOf(spin.axis)] === spin.layer;
        return (
          <Room key={index} index={index} board={board} spin={spin} turnT={turnT} live={spinning && onLayer} selected={selected} stone={stone} />
        );
      })}
      <Hero state={state} face={spinning ? board : state} reduce={reduce} fallen={state.loseReason === "trap" && !spinning} />
      <mesh position={[-2.15, 0.15, 0.35]} rotation={[0, 0.55, 0]}>
        <planeGeometry args={[0.92, 1.12]} />
        <meshStandardMaterial map={traveler} roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={stone} color={[0.55, 0.52, 0.46]} roughness={1} />
      </mesh>
    </group>
  );
}

function FixedCamera({ view }: { view: number }) {
  const camera = useThree((item) => item.camera);
  useLayoutEffect(() => {
    const places: readonly (readonly [number, number, number])[] = [
      [4.5, 3.4, 4.7],
      [-4.6, 3.5, 4.4],
      [4.4, 3.6, -4.6],
      [-0.4, 5.4, 5.2],
    ];
    const place = places[view % places.length] ?? places[0];
    camera.position.set(place[0], place[1], place[2]);
    camera.lookAt(0, 0.1, 0);
  }, [camera, view]);
  return null;
}

export default function ReverseDungeonScene({
  state,
  board,
  spin,
  selected,
  reduce,
  paused,
  view,
  onSettled,
}: {
  state: DungeonState;
  board: DungeonState;
  spin: DungeonSpin | null;
  selected: { axis: Axis; layer: 0 | 1 };
  reduce: boolean;
  paused: boolean;
  view: number;
  onSettled?: (id: number) => void;
}) {
  const frameloop = usePlayFrameloop(!paused);
  return (
    <Canvas frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [4.5, 3.4, 4.7], fov: 38 }}>
      <color attach="background" args={[0.07, 0.08, 0.06]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[KEY_LIGHT[0] * 8, KEY_LIGHT[1] * 8, KEY_LIGHT[2] * 8]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <FixedCamera view={view} />
      <Suspense fallback={null}>
        <World state={state} board={board} spin={spin} selected={selected} reduce={reduce} onSettled={onSettled} />
      </Suspense>
      <ContactShadows position={[0, -1.19, 0]} opacity={0.5} scale={8} blur={2.4} far={3} />
    </Canvas>
  );
}
