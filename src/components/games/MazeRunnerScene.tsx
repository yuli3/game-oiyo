"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MazeRunnerState, Gem } from '../../lib/games/maze-runner';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';

interface Props {
  state: MazeRunnerState;
}

function VoxelWall({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Main Wall Pillar */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1.5, 1]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      {/* Top Trim Bevel Cap */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <boxGeometry args={[1.04, 0.08, 1.04]} />
        <meshStandardMaterial
          color="#334155"
          emissive="#0284c7"
          emissiveIntensity={0.25}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function GemMesh({ gem }: { gem: Gem }) {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 2.5;
    meshRef.current.position.y = 0.5 + Math.sin(Date.now() * 0.004 + gem.id) * 0.12;

    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 3;
    }
  });

  if (gem.collected) return null;

  return (
    <group ref={meshRef} position={[gem.x, 0.5, gem.z]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      {/* Orbital Aura Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.36, 0.02, 8, 16]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#7dd3fc"
          emissiveIntensity={1.5}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

function ExitPortal({ x, z }: { x: number; z: number }) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (outerRingRef.current) outerRingRef.current.rotation.z += delta * 1.5;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * 2.2;
  });

  return (
    <group position={[x, 0.6, z]}>
      {/* Outer Rotating Energy Ring */}
      <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.06, 16, 32]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* Inner Counter-Rotating Ring */}
      <mesh ref={innerRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.04, 16, 24]} />
        <meshStandardMaterial
          color="#86efac"
          emissive="#86efac"
          emissiveIntensity={1.8}
        />
      </mesh>

      {/* Vertical Celestial Beacon Beam */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 3.6, 16]} />
        <meshStandardMaterial
          color="#4ade80"
          emissive="#22c55e"
          emissiveIntensity={0.8}
          transparent
          opacity={0.35}
        />
      </mesh>

      <pointLight color="#22c55e" intensity={2.5} distance={5.0} />
    </group>
  );
}

function PlayerAvatar({ x, z, angle }: { x: number; z: number; angle: number }) {
  const avatarRef = useRef<THREE.Group>(null);
  const torchLightRef = useRef<THREE.PointLight>(null);
  const prevPos = useRef({ x, z });
  const bobbingCycle = useRef(0);

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    // Detect movement for walking bob
    const distMoved = Math.hypot(x - prevPos.current.x, z - prevPos.current.z);
    prevPos.current = { x, z };
    if (distMoved > 0.001) {
      bobbingCycle.current += delta * 14;
    }

    const bobY = Math.sin(bobbingCycle.current) * 0.04;
    avatarRef.current.position.set(x, 0.45 + bobY, z);
    avatarRef.current.rotation.y = angle;

    // Realistic flickering flame
    if (torchLightRef.current) {
      torchLightRef.current.intensity =
        2.2 + Math.sin(Date.now() * 0.015) * 0.35 + (Math.random() - 0.5) * 0.2;
    }
  });

  return (
    <group ref={avatarRef} position={[x, 0.45, z]}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.35]} />
        <meshStandardMaterial color="#ea580c" roughness={0.35} metalness={0.4} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.4} />
      </mesh>

      {/* Torch Stick */}
      <mesh position={[0.26, 0.2, -0.15]} rotation={[0.2, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.45, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>

      {/* Torch Flame Mesh */}
      <mesh position={[0.3, 0.42, -0.18]}>
        <dodecahedronGeometry args={[0.07]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#ef4444"
          emissiveIntensity={2.0}
        />
      </mesh>

      {/* Dynamic Flickering Torch Light */}
      <pointLight
        ref={torchLightRef}
        position={[0.3, 0.45, -0.18]}
        color="#fbbf24"
        intensity={2.2}
        distance={7.0}
        castShadow
        shadow-bias={-0.001}
      />
    </group>
  );
}

function FollowCamera({ targetX, targetZ }: { targetX: number; targetZ: number }) {
  useFrame(({ camera }) => {
    const desiredX = targetX;
    const desiredY = 6.8;
    const desiredZ = targetZ + 5.2;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredX, 0.12);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredY, 0.12);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredZ, 0.12);

    camera.lookAt(targetX, 0.5, targetZ);
  });

  return null;
}

function MazeFloor({ gridSize }: { gridSize: number }) {
  // Tile grid lines on dungeon floor
  const floorLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= gridSize; i++) {
      lines.push(
        <mesh key={`h-${i}`} position={[gridSize / 2, 0.005, i]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[gridSize + 2, 0.02]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>,
        <mesh key={`v-${i}`} position={[i, 0.005, gridSize / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, gridSize + 2]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      );
    }
    return lines;
  }, [gridSize]);

  return (
    <group>
      <mesh
        position={[gridSize / 2, -0.01, gridSize / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[gridSize + 4, gridSize + 4]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.3} />
      </mesh>
      {floorLines}
    </group>
  );
}

function MazeSceneContent({ state }: Props) {
  const walls = useMemo(() => {
    const list = [];
    for (let z = 0; z < state.gridSize; z++) {
      for (let x = 0; x < state.gridSize; x++) {
        if (state.grid[z][x] === 1) {
          list.push(<VoxelWall key={`${x}-${z}`} x={x} z={z} />);
        }
      }
    }
    return list;
  }, [state.grid, state.gridSize]);

  return (
    <group>
      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#38bdf8', '#020617', 0.35]} />
      <directionalLight
        position={[10, 25, 10]}
        intensity={0.45}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Floor with dungeon tile grid */}
      <MazeFloor gridSize={state.gridSize} />

      {/* Walls */}
      {walls}

      {/* Gems */}
      {state.gems.map((gem) => (
        <GemMesh key={gem.id} gem={gem} />
      ))}

      {/* Exit Portal */}
      <ExitPortal x={state.exitX} z={state.exitZ} />

      {/* Player */}
      <PlayerAvatar x={state.playerX} z={state.playerZ} angle={state.playerAngle} />

      {/* Dynamic Camera */}
      <FollowCamera targetX={state.playerX} targetZ={state.playerZ} />
    </group>
  );
}

export default function MazeRunnerScene({ state }: Props) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Canvas
      shadows
      className="w-full h-full touch-none select-none"
      camera={{ position: [state.playerX, 7, state.playerZ + 6], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      frameloop={reducedMotion ? 'demand' : 'always'}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 4, 18]} />
      <MazeSceneContent state={state} />
    </Canvas>
  );
}
