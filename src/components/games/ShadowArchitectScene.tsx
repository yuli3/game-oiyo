import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { SHADOW_WALL_HEIGHT, SHADOW_WALL_WIDTH, targetShadow, worldVoxels, type ShadowArchitectState } from "../../lib/games/shadow-architect";
import { SHADOW_ARCHITECT_MAPS } from "../../lib/games/sprites";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";

const BLOCK_COLORS = ["#d6a84f", "#708b55", "#b65f4c", "#4f8290", "#d8cfaa"];

function prepareMaps(ceramic: Texture, parchment: Texture, felt: Texture) {
  for (const map of [ceramic, parchment, felt]) map.colorSpace = SRGBColorSpace;
  felt.wrapS = RepeatWrapping;
  felt.wrapT = RepeatWrapping;
  felt.repeat.set(4, 3);
}

function Studio({ state }: { state: ShadowArchitectState }) {
  const [ceramic, parchment, felt] = useTexture([
    SHADOW_ARCHITECT_MAPS.ceramic,
    SHADOW_ARCHITECT_MAPS.parchment,
    SHADOW_ARCHITECT_MAPS.felt,
  ]);
  useLayoutEffect(() => { prepareMaps(ceramic, parchment, felt); }, [ceramic, parchment, felt]);
  const voxels = useMemo(() => worldVoxels(state.poses), [state.poses]);
  const target = useMemo(() => new Set(targetShadow(state.puzzle)), [state.puzzle]);
  return (
    <group position={[-3, 0, -1.2]}>
      {Array.from({ length: SHADOW_WALL_WIDTH * SHADOW_WALL_HEIGHT }, (_, i) => {
        const x = i % SHADOW_WALL_WIDTH;
        const y = Math.floor(i / SHADOW_WALL_WIDTH);
        const on = target.has(`${x},${y}`);
        return (
          <mesh key={i} position={[x, y + 0.5, -0.12]}>
            <boxGeometry args={[0.92, 0.92, 0.12]} />
            <meshStandardMaterial map={parchment} color={on ? "#f4ead4" : "#3c3830"} emissive={on ? "#766f55" : "#000000"} emissiveIntensity={on ? 0.35 : 0} roughness={0.92} />
          </mesh>
        );
      })}
      {voxels.map((voxel, index) => (
        <mesh key={index} position={[voxel.x, voxel.y + 0.5, voxel.z + 0.65]} castShadow receiveShadow scale={voxel.block === state.selected ? 1.04 : 1}>
          <boxGeometry args={[0.88, 0.88, 0.88]} />
          <meshStandardMaterial map={ceramic} color={BLOCK_COLORS[voxel.block]} roughness={0.78} metalness={0.02} emissive={voxel.block === state.selected ? BLOCK_COLORS[voxel.block] : "#000000"} emissiveIntensity={voxel.block === state.selected ? 0.18 : 0} />
        </mesh>
      ))}
      <mesh position={[3, -0.05, 2.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11, 9]} />
        <meshStandardMaterial map={felt} color="#ffffff" roughness={1} />
      </mesh>
    </group>
  );
}

export default function ShadowArchitectScene({ state }: { state: ShadowArchitectState }) {
  const frameloop = usePlayFrameloop(true);
  return (
    <Canvas frameloop={frameloop} camera={{ position: [8, 7, 11], fov: 38 }} shadows dpr={[1, 1.5]}>
      <color attach="background" args={["#11160f"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 8, 10]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <Suspense fallback={null}>
        <Studio state={state} />
      </Suspense>
      <OrbitControls makeDefault enablePan={false} minDistance={8} maxDistance={18} maxPolarAngle={Math.PI / 2.05} />
      <Html position={[0, 6.5, 0]} center style={{ pointerEvents: "none", color: "#f4eddc", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap", textShadow: "0 2px 8px #000" }}>ROTATE THE STRUCTURE · READ THE WALL</Html>
    </Canvas>
  );
}
