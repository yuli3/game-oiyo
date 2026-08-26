import { Canvas, useFrame } from "@react-three/fiber";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import type { MarkerPosition } from "../../lib/games/spatial-memory";

/**
 * The WebGL presentation layer. This module — and only this module — pulls in
 * three.js, and it is loaded lazily from `SpatialMemory.tsx`, so no other page
 * in the arcade pays for it. Nothing here decides rules: it renders the state it
 * is handed and reports selections back.
 *
 * The clickable targets are real DOM `<button>` elements anchored to the 3D
 * positions, not raycast meshes, so keyboard and screen-reader users get the
 * same single control everyone else uses.
 */

export interface SceneProps {
  markers: MarkerPosition[];
  /** Index currently lit during playback, or null. */
  lit: number | null;
  /** Indices already entered this round, shown as confirmed. */
  entered: number[];
  interactive: boolean;
  reducedMotion: boolean;
  /** Yaw in radians. Snap steps when reduced motion is on. */
  yaw: number;
  label: (index: number) => string;
  onSelect: (index: number) => void;
}

function Rig({ yaw, reducedMotion, children }: { yaw: number; reducedMotion: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    const target = group.current;
    if (!target) return;
    if (reducedMotion) {
      // Snap: no easing, so there is no drifting motion to track.
      target.rotation.y = yaw;
      return;
    }
    // Frame-rate independent easing toward the requested yaw.
    const t = 1 - Math.pow(0.001, Math.min(delta, 0.1));
    target.rotation.y += (yaw - target.rotation.y) * t;
  });
  return <group ref={group}>{children}</group>;
}

function Marker({
  position,
  lit,
  entered,
  interactive,
  reducedMotion,
  label,
  onSelect,
}: {
  position: MarkerPosition;
  lit: boolean;
  entered: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  label: string;
  onSelect: () => void;
}) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    const target = mesh.current;
    if (!target) return;
    const base = lit ? 1.55 : entered ? 1.2 : 1;
    if (reducedMotion) {
      target.scale.setScalar(base);
      return;
    }
    const pulse = lit ? 1 + Math.sin(state.clock.elapsedTime * 8) * 0.08 : 1;
    target.scale.setScalar(base * pulse);
  });

  const color = lit ? "#a3e635" : entered ? "#65a30d" : "#334155";

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={lit ? 1.4 : entered ? 0.5 : 0.12}
          roughness={0.35}
        />
      </mesh>
      <Html center distanceFactor={9} zIndexRange={[10, 0]}>
        <button
          type="button"
          disabled={!interactive}
          aria-label={label}
          onClick={onSelect}
          className="h-11 w-11 rounded-full border-2 border-transparent bg-transparent focus-visible:border-lime-300 focus-visible:outline-none disabled:cursor-default"
        />
      </Html>
    </group>
  );
}

export default function SpatialMemoryScene(props: SceneProps) {
  const { markers, lit, entered, interactive, reducedMotion, yaw, label, onSelect } = props;
  const frameloop = usePlayFrameloop(true);
  return (
    <Canvas
      frameloop={frameloop}
      camera={{ position: [0, 0, 12], fov: 55 }}
      // Capped for phones: an uncapped pixel ratio is the usual cause of a
      // handset heating up on a 3D page.
      dpr={[1, 1.6]}
      gl={{ antialias: false, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#070b16"]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[6, 8, 10]} intensity={90} />
      <Rig yaw={yaw} reducedMotion={reducedMotion}>
        {markers.map((position, index) => (
          <Marker
            key={index}
            position={position}
            lit={lit === index}
            entered={entered.includes(index)}
            interactive={interactive}
            reducedMotion={reducedMotion}
            label={label(index)}
            onSelect={() => onSelect(index)}
          />
        ))}
      </Rig>
    </Canvas>
  );
}
