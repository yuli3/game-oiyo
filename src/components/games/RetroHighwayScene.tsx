import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type HighwayState,
  getLaneX,
  LANE_WIDTH,
} from '../../lib/games/retro-highway';

interface SceneProps {
  state: HighwayState;
}

function CameraRig({ state }: { state: HighwayState }) {
  const { camera } = useThree();
  const shake = useRef(0);

  useFrame((_, delta) => {
    const { player } = state;
    const targetX = player.x * 0.45;

    // Camera shake intensity depends on speed and boost
    const baseShake = player.isBoosting ? 0.08 : (player.speed > 70 ? 0.03 : 0);
    shake.current = (Math.random() - 0.5) * baseShake;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX + shake.current, 10, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 3.8 + shake.current * 0.5, 8, delta);
    camera.position.z = -5.5;

    camera.lookAt(targetX * 0.5, 1.2, 35);
  });

  return null;
}

function PlayerCarMesh({ state }: { state: HighwayState }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame((threeState, delta) => {
    if (groupRef.current) {
      groupRef.current.position.x = state.player.x;
      groupRef.current.position.y = 0.4;
      groupRef.current.position.z = 0;

      // Slight tilt when turning
      const targetTilt = (state.player.targetLane * LANE_WIDTH - state.player.x) * -0.06;
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetTilt, 12, delta);
    }

    if (flameRef.current) {
      if (state.player.isBoosting) {
        flameRef.current.visible = true;
        flameRef.current.scale.set(
          1 + Math.sin(threeState.clock.elapsedTime * 40) * 0.2,
          1 + Math.cos(threeState.clock.elapsedTime * 35) * 0.2,
          1.5 + Math.random() * 0.5
        );
      } else {
        flameRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Car Body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.7, 0.45, 3.4]} />
        <meshStandardMaterial color="#06b6d4" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Cabin / Windshield */}
      <mesh position={[0, 0.72, -0.2]}>
        <boxGeometry args={[1.3, 0.4, 1.6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Front Headlights */}
      <mesh position={[-0.6, 0.35, 1.72]}>
        <boxGeometry args={[0.3, 0.15, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.6, 0.35, 1.72]}>
        <boxGeometry args={[0.3, 0.15, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={2} />
      </mesh>

      {/* Rear Taillights */}
      <mesh position={[-0.6, 0.35, -1.72]}>
        <boxGeometry args={[0.35, 0.12, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0.6, 0.35, -1.72]}>
        <boxGeometry args={[0.35, 0.12, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2.5} />
      </mesh>

      {/* Nitro Flame */}
      <mesh ref={flameRef} position={[0, 0.28, -2.1]} visible={false}>
        <coneGeometry args={[0.25, 1.2, 8]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

function TrafficMesh({ car }: { car: HighwayState['traffic'][number] }) {
  const x = getLaneX(car.lane);

  return (
    <group position={[x, 0.4, car.z]}>
      {/* Traffic Car Body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 3.2]} />
        <meshStandardMaterial color={car.color} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 0.75, -0.1]}>
        <boxGeometry args={[1.2, 0.45, 1.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Red Taillights (facing player) */}
      <mesh position={[-0.55, 0.35, -1.62]}>
        <boxGeometry args={[0.3, 0.12, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.55, 0.35, -1.62]}>
        <boxGeometry args={[0.3, 0.12, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function PowerCellMesh({ cell }: { cell: HighwayState['powerCells'][number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const x = getLaneX(cell.lane);

  useFrame((threeState) => {
    if (meshRef.current && !cell.collected) {
      meshRef.current.rotation.y = threeState.clock.elapsedTime * 4;
      meshRef.current.position.y = 0.8 + Math.sin(threeState.clock.elapsedTime * 5) * 0.15;
    }
  });

  if (cell.collected) return null;

  return (
    <mesh ref={meshRef} position={[x, 0.8, cell.z]}>
      <dodecahedronGeometry args={[0.45]} />
      <meshStandardMaterial
        color="#a855f7"
        emissive="#c084fc"
        emissiveIntensity={1.2}
        roughness={0.1}
        metalness={0.9}
      />
    </mesh>
  );
}

function HighwayRoad({ speed }: { speed: number }) {
  const linesRef = useRef<THREE.Group>(null);
  const offset = useRef(0);

  useFrame((_, delta) => {
    offset.current = (offset.current + speed * delta * 0.28) % 10;
    if (linesRef.current) {
      linesRef.current.position.z = -offset.current;
    }
  });

  return (
    <group>
      {/* Road asphalt */}
      <mesh position={[0, -0.05, 50]} receiveShadow>
        <planeGeometry args={[LANE_WIDTH * 3.6, 160]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Road Guardrails */}
      <mesh position={[-LANE_WIDTH * 1.85, 0.4, 50]}>
        <boxGeometry args={[0.3, 0.8, 160]} />
        <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[LANE_WIDTH * 1.85, 0.4, 50]}>
        <boxGeometry args={[0.3, 0.8, 160]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.6} />
      </mesh>

      {/* Moving Lane Dashes */}
      <group ref={linesRef}>
        {Array.from({ length: 16 }).map((_, i) => (
          <group key={i} position={[0, 0.01, i * 10 - 20]}>
            <mesh position={[-LANE_WIDTH / 2, 0, 0]}>
              <planeGeometry args={[0.15, 4]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <mesh position={[LANE_WIDTH / 2, 0, 0]}>
              <planeGeometry args={[0.15, 4]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export default function RetroHighwayScene({ state }: SceneProps) {
  return (
    <div className="relative w-full h-130 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl">
      <Canvas
        camera={{ position: [0, 3.8, -5.5], fov: 65 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#050510"]} />
        <fog attach="fog" args={["#050510", 30, 140]} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 30, 20]} intensity={1.2} />

        {/* Synthwave Horizon Glow */}
        <mesh position={[0, 15, 120]}>
          <circleGeometry args={[22, 32]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>

        <CameraRig state={state} />
        <PlayerCarMesh state={state} />
        <HighwayRoad speed={state.player.speed} />

        {state.traffic.map((car) => (
          <TrafficMesh key={car.id} car={car} />
        ))}

        {state.powerCells.map((cell) => (
          <PowerCellMesh key={cell.id} cell={cell} />
        ))}
      </Canvas>
    </div>
  );
}
