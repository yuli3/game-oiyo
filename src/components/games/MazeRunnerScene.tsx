"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MazeRunnerState, Gem } from '../../lib/games/maze-runner';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';

interface Props {
  state: MazeRunnerState;
}

function VoxelWall({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.75, z]}>
      <boxGeometry args={[1, 1.5, 1]} />
      <meshStandardMaterial
        color="#334155"
        emissive="#0f172a"
        emissiveIntensity={0.4}
        roughness={0.7}
        metalness={0.2}
      />
    </mesh>
  );
}

function GemMesh({ gem }: { gem: Gem }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 2.5;
    meshRef.current.position.y = 0.5 + Math.sin(Date.now() * 0.004 + gem.id) * 0.12;
  });

  if (gem.collected) return null;

  return (
    <mesh ref={meshRef} position={[gem.x, 0.5, gem.z]}>
      <octahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#38bdf8"
        emissiveIntensity={0.9}
        roughness={0.1}
        metalness={0.9}
      />
    </mesh>
  );
}

function ExitPortal({ x, z }: { x: number; z: number }) {
  const portalRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!portalRef.current) return;
    portalRef.current.rotation.z += delta * 1.5;
  });

  return (
    <group position={[x, 0.6, z]}>
      <mesh ref={portalRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.08, 16, 32]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={1.2}
        />
      </mesh>
      <pointLight color="#22c55e" intensity={1.5} distance={3.5} />
    </group>
  );
}

function PlayerAvatar({ x, z, angle }: { x: number; z: number; angle: number }) {
  const avatarRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!avatarRef.current) return;
    avatarRef.current.position.set(x, 0.45, z);
    avatarRef.current.rotation.y = angle;
  });

  return (
    <group ref={avatarRef} position={[x, 0.45, z]}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.35]} />
        <meshStandardMaterial color="#f97316" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.4} />
      </mesh>
      {/* Torch Light */}
      <pointLight position={[0.25, 0.4, 0.25]} color="#fde047" intensity={2.2} distance={6.0} />
    </group>
  );
}

function FollowCamera({ targetX, targetZ }: { targetX: number; targetZ: number }) {
  useFrame(({ camera }) => {
    const desiredX = targetX;
    const desiredY = 6.8;
    const desiredZ = targetZ + 5.5;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredX, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredY, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredZ, 0.1);

    camera.lookAt(targetX, 0.5, targetZ);
  });

  return null;
}

function MazeSceneContent({ state }: Props) {
  const walls = [];
  for (let z = 0; z < state.gridSize; z++) {
    for (let x = 0; x < state.gridSize; x++) {
      if (state.grid[z][x] === 1) {
        walls.push(<VoxelWall key={`${x}-${z}`} x={x} z={z} />);
      }
    }
  }

  return (
    <group>
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 20, 10]} intensity={0.4} />

      {/* Floor */}
      <mesh position={[state.gridSize / 2, -0.01, state.gridSize / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[state.gridSize + 4, state.gridSize + 4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Walls */}
      {walls}

      {/* Gems */}
      {state.gems.map((gem) => (
        <GemMesh key={gem.id} gem={gem} />
      ))}

      {/* Exit */}
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
      className="w-full h-full touch-none select-none"
      camera={{ position: [state.playerX, 7, state.playerZ + 6], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 4, 18]} />
      <MazeSceneContent state={state} />
    </Canvas>
  );
}
