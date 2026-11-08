import { useRef, useMemo } from 'react';
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

function CameraRig({
  playerY,
  playerX,
  status,
}: {
  playerY: number;
  playerX: number;
  status: 'idle' | 'playing' | 'gameover';
}) {
  const { camera } = useThree();
  const shakeTrauma = useRef(0);

  useFrame((_, delta) => {
    if (status === 'gameover') {
      shakeTrauma.current = Math.min(shakeTrauma.current + delta * 2, 0.6);
    } else {
      shakeTrauma.current = THREE.MathUtils.damp(shakeTrauma.current, 0, 8, delta);
    }

    const shakeOffset = (Math.random() - 0.5) * shakeTrauma.current;
    const targetY = playerY * 0.35 + 3.8 + shakeOffset;
    const targetX = playerX * 0.25 + shakeOffset;

    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 12, delta);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 10, delta);
    camera.position.z = 6;

    // Subtle banking when steering left/right
    const targetRoll = -playerX * 0.02;
    camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, targetRoll, 8, delta);

    camera.lookAt(playerX * 0.2, 1.6, -20);
  });

  return null;
}

function VoxelPlayer({
  player,
  status,
}: {
  player: PlayerState;
  status: 'idle' | 'playing' | 'gameover';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const boosterLRef = useRef<THREE.Mesh>(null);
  const boosterRRef = useRef<THREE.Mesh>(null);
  const runCycle = useRef(0);

  useFrame((_, delta) => {
    if (status === 'playing') {
      runCycle.current += delta * 20;
    }

    if (groupRef.current) {
      groupRef.current.position.x = player.currentX;
      groupRef.current.position.y = player.y;
      groupRef.current.position.z = PLAYER_Z;

      if (player.isDucking) {
        groupRef.current.scale.set(1.2, 0.45, 1.2);
        groupRef.current.rotation.x = 0.15;
      } else if (player.isJumping) {
        groupRef.current.scale.set(0.9, 1.15, 0.9);
        groupRef.current.rotation.x = -0.15;
      } else {
        groupRef.current.scale.set(1, 1, 1);
        groupRef.current.rotation.x = 0;
      }

      // Roll bank on lateral dodge
      const lateralVel = player.currentX - getLaneX(player.lane);
      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        -lateralVel * 0.35,
        15,
        delta
      );
    }

    // Running limbs pendulum swing
    if (status === 'playing' && !player.isJumping && !player.isDucking) {
      const swing = Math.sin(runCycle.current) * 0.6;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }

    // Jet booster exhaust pulse
    const flameScale = 1 + (Math.sin(runCycle.current * 2) * 0.25 + (player.isJumping ? 0.6 : 0));
    if (boosterLRef.current) boosterLRef.current.scale.set(1, flameScale, 1);
    if (boosterRRef.current) boosterRRef.current.scale.set(1, flameScale, 1);
  });

  return (
    <group ref={groupRef}>
      {/* Voxel Torso */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.8, 0.5]} />
        <meshStandardMaterial color="#2563eb" roughness={0.25} metalness={0.5} />
      </mesh>

      {/* Cyber Chest Core Light */}
      <mesh position={[0, 1.05, -0.26]}>
        <boxGeometry args={[0.25, 0.25, 0.05]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* Voxel Head */}
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Visor / Neon HUD Eyes */}
      <mesh position={[0, 1.6, -0.3]}>
        <boxGeometry args={[0.45, 0.16, 0.1]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Left / Right Arms */}
      <mesh ref={leftArmRef} position={[-0.45, 0.9, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.24]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.45, 0.9, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.24]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
      </mesh>

      {/* Left / Right Legs */}
      <mesh ref={leftLegRef} position={[-0.22, 0.3, 0]} castShadow>
        <boxGeometry args={[0.24, 0.6, 0.3]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.22, 0.3, 0]} castShadow>
        <boxGeometry args={[0.24, 0.6, 0.3]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Dual Cyber Jetpacks (Mounted on Back) */}
      <group position={[0, 0.9, 0.32]}>
        {/* Left Jetpack Thruster */}
        <mesh position={[-0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.55, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={boosterLRef} position={[-0.2, -0.35, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.08, 0.3, 8]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.8}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Right Jetpack Thruster */}
        <mesh position={[0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.55, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={boosterRRef} position={[0.2, -0.35, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.08, 0.3, 8]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>
    </group>
  );
}

function Highway({ speed }: { speed: number }) {
  const roadOffset = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    roadOffset.current = (roadOffset.current + delta * speed) % 6;
    if (meshRef.current) {
      meshRef.current.position.z = roadOffset.current - 40;
    }
  });

  return (
    <group>
      {/* Highway Ground Strip */}
      <mesh position={[0, -0.1, -40]} receiveShadow>
        <boxGeometry args={[LANE_WIDTH * 3.4, 0.2, 140]} />
        <meshStandardMaterial color="#0a0f1d" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Neon Cyber Road Grid Lines */}
      {[-LANE_WIDTH * 1.5, -LANE_WIDTH * 0.5, LANE_WIDTH * 0.5, LANE_WIDTH * 1.5].map(
        (x, idx) => (
          <mesh key={`grid-${idx}`} position={[x, 0.015, -40]}>
            <planeGeometry args={[0.08, 140]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0284c7"
              emissiveIntensity={0.6}
            />
          </mesh>
        )
      )}

      {/* Moving Center Lane Stripes */}
      <mesh ref={meshRef} position={[0, 0.02, -40]}>
        <planeGeometry args={[0.15, 140]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Cyber Guardrails with Glow Pulse */}
      <mesh position={[-LANE_WIDTH * 1.75, 0.45, -40]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.7, 140]} />
        <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[LANE_WIDTH * 1.75, 0.45, -40]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.7, 140]} />
        <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function CyberCityVista() {
  // Procedural voxel skyscraper silhouettes in the deep fog
  const buildings = useMemo(() => {
    const list: Array<{ x: number; z: number; w: number; h: number; d: number; color: string }> = [];
    const colors = ['#1e1b4b', '#0f172a', '#172554', '#1e293b'];
    for (let i = 0; i < 28; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (LANE_WIDTH * 2.8 + Math.random() * 24);
      const z = -25 - Math.random() * 80;
      const w = 4 + Math.random() * 6;
      const h = 14 + Math.random() * 32;
      const d = 4 + Math.random() * 8;
      const color = colors[i % colors.length];
      list.push({ x, z, w, h, d, color });
    }
    return list;
  }, []);

  return (
    <group>
      {buildings.map((b, idx) => (
        <mesh key={idx} position={[b.x, b.h / 2 - 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.8} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function ObstacleEntity({ obs }: { obs: Obstacle }) {
  const crystalRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 2.8;
      crystalRef.current.position.y = 1.1 + Math.sin(Date.now() * 0.005 + obs.lane * 1.5) * 0.12;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 3.5;
      ringRef.current.rotation.z += delta * 2;
    }
  });

  if (obs.collected) return null;

  const posX = getLaneX(obs.lane);

  if (obs.type === 'cube_collectible') {
    return (
      <group ref={crystalRef} position={[posX, 1.1, obs.z]}>
        {/* Core Gem Octahedron */}
        <mesh castShadow>
          <octahedronGeometry args={[0.42]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.3}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
        {/* Orbital Resonance Ring */}
        <mesh ref={ringRef}>
          <torusGeometry args={[0.55, 0.03, 12, 24]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#7dd3fc"
            emissiveIntensity={1.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    );
  }

  if (obs.type === 'barrier_low') {
    return (
      <group position={[posX, 0.35, obs.z]}>
        {/* Hazard Barrier Box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[LANE_WIDTH * 0.88, 0.65, 0.45]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={0.65}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
        {/* Warning Neon Top Strip */}
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[LANE_WIDTH * 0.85, 0.08, 0.48]} />
          <meshStandardMaterial
            color="#fee2e2"
            emissive="#f87171"
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>
    );
  }

  // barrier_high (jump-under laser hurdle)
  return (
    <group position={[posX, 1.6, obs.z]}>
      {/* High overhead neon hurdle */}
      <mesh castShadow>
        <boxGeometry args={[LANE_WIDTH * 0.92, 0.52, 0.4]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>
      {/* High-voltage warning core */}
      <mesh position={[0, 0, -0.21]}>
        <boxGeometry args={[LANE_WIDTH * 0.7, 0.15, 0.05]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#facc15"
          emissiveIntensity={1.5}
        />
      </mesh>
      {/* Left/Right support pillars */}
      <mesh position={[-LANE_WIDTH * 0.42, -0.6, 0]} castShadow>
        <boxGeometry args={[0.16, 1.25, 0.22]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[LANE_WIDTH * 0.42, -0.6, 0]} castShadow>
        <boxGeometry args={[0.16, 1.25, 0.22]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function VoxelRunnerScene({
  player,
  obstacles,
  speed,
  status,
}: SceneProps) {
  return (
    <div className="relative w-full h-full min-h-100 rounded-2xl overflow-hidden bg-background select-none touch-none shadow-2xl">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4, 6], fov: 60 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 25, 75]} />

        {/* Dynamic Studio Lighting with Shadows */}
        <ambientLight intensity={0.4} />
        <hemisphereLight args={['#38bdf8', '#020617', 0.65]} />
        <directionalLight
          position={[12, 24, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[0, 4.5, PLAYER_Z]} intensity={2.0} color="#38bdf8" distance={16} />

        <CameraRig playerY={player.y} playerX={player.currentX} status={status} />
        <CyberCityVista />
        <Highway speed={speed} />
        <VoxelPlayer player={player} status={status} />

        {obstacles.map((obs) => (
          <ObstacleEntity key={obs.id} obs={obs} />
        ))}
      </Canvas>
    </div>
  );
}
