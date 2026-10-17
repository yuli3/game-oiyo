import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type PlayerState,
  type Obstacle,
  LANE_WIDTH,
  getLaneX,
  PLAYER_Z,
} from '../../lib/games/voxel-runner';

interface SceneProps {
  player: PlayerState;
  obstacles: Obstacle[];
  speed: number;
  status: 'idle' | 'playing' | 'gameover';
}

function CameraRig({ playerY }: { playerY: number }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const targetY = playerY * 0.35 + 3.8;
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 12, delta);
    camera.position.x = 0;
    camera.position.z = 6;
    camera.lookAt(0, 1.6, -20);
  });

  return null;
}

function VoxelPlayer({ player }: { player: PlayerState }) {
  const groupRef = useRef<THREE.Group>(null);
  const runCycle = useRef(0);

  useFrame((_, delta) => {
    runCycle.current += delta * 18;
    if (groupRef.current) {
      groupRef.current.position.x = player.currentX;
      groupRef.current.position.y = player.y;
      groupRef.current.position.z = PLAYER_Z;

      if (player.isDucking) {
        groupRef.current.scale.set(1.2, 0.45, 1.2);
      } else {
        groupRef.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Voxel Torso */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.7, 0.8, 0.5]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.4} />
      </mesh>
      {/* Voxel Head */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Visor / Eyes */}
      <mesh position={[0, 1.6, -0.3]}>
        <boxGeometry args={[0.45, 0.15, 0.1]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Left / Right Legs */}
      <mesh position={[-0.22, 0.3, 0]}>
        <boxGeometry args={[0.24, 0.6, 0.3]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
      </mesh>
      <mesh position={[0.22, 0.3, 0]}>
        <boxGeometry args={[0.24, 0.6, 0.3]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Highway({ speed }: { speed: number }) {
  const roadOffset = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    roadOffset.current = (roadOffset.current + delta * speed) % 4;
    if (meshRef.current) {
      meshRef.current.position.z = roadOffset.current - 40;
    }
  });

  return (
    <group>
      {/* Highway Ground Strip */}
      <mesh position={[0, -0.1, -40]} receiveShadow>
        <boxGeometry args={[LANE_WIDTH * 3.4, 0.2, 120]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* Lane Separator Stripes */}
      {[-LANE_WIDTH / 2, LANE_WIDTH / 2].map((x, idx) => (
        <mesh key={idx} ref={idx === 0 ? meshRef : undefined} position={[x, 0.01, -40]}>
          <planeGeometry args={[0.1, 120]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}

      {/* Cyber Guardrails */}
      <mesh position={[-LANE_WIDTH * 1.8, 0.4, -40]}>
        <boxGeometry args={[0.2, 0.6, 120]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[LANE_WIDTH * 1.8, 0.4, -40]}>
        <boxGeometry args={[0.2, 0.6, 120]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function ObstacleEntity({ obs }: { obs: Obstacle }) {
  const crystalRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 3;
      crystalRef.current.rotation.x += delta * 1.5;
    }
  });

  if (obs.collected) return null;

  const posX = getLaneX(obs.lane);

  if (obs.type === 'cube_collectible') {
    return (
      <mesh ref={crystalRef} position={[posX, 1.1, obs.z]}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.9}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
    );
  }

  if (obs.type === 'barrier_low') {
    return (
      <group position={[posX, 0.35, obs.z]}>
        <mesh>
          <boxGeometry args={[LANE_WIDTH * 0.85, 0.6, 0.4]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#b91c1c"
            emissiveIntensity={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>
    );
  }

  // barrier_high (jump-under laser hurdle)
  return (
    <group position={[posX, 1.6, obs.z]}>
      {/* High overhead beam */}
      <mesh>
        <boxGeometry args={[LANE_WIDTH * 0.9, 0.5, 0.4]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>
      {/* Left/Right support pillars */}
      <mesh position={[-LANE_WIDTH * 0.4, -0.6, 0]}>
        <boxGeometry args={[0.15, 1.2, 0.2]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[LANE_WIDTH * 0.4, -0.6, 0]}>
        <boxGeometry args={[0.15, 1.2, 0.2]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

export default function VoxelRunnerScene({
  player,
  obstacles,
  speed,
}: SceneProps) {
  return (
    <div className="relative w-full h-full min-h-100 rounded-2xl overflow-hidden bg-background select-none touch-none">
      <Canvas
        camera={{ position: [0, 4, 6], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#050814']} />
        <fog attach="fog" args={['#050814', 30, 80]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <pointLight position={[0, 5, 0]} intensity={1.5} color="#38bdf8" distance={20} />

        <CameraRig playerY={player.y} />
        <Highway speed={speed} />
        <VoxelPlayer player={player} />

        {obstacles.map((obs) => (
          <ObstacleEntity key={obs.id} obs={obs} />
        ))}
      </Canvas>
    </div>
  );
}
