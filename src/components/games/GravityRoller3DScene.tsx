"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type {
  GravityRollerState,
  Gem,
} from '../../lib/games/gravity-roller';
import { LEVELS } from '../../lib/games/gravity-roller';

interface Props {
  state: GravityRollerState;
}

// Rotating Gem Collectible
function GemItem({ gem }: { gem: Gem }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2.5;
    }
  });

  if (gem.collected) return null;

  return (
    <mesh ref={meshRef} position={[gem.x, 0.45, gem.z]}>
      <octahedronGeometry args={[0.25]} />
      <meshStandardMaterial
        color="#10b981"
        emissive="#059669"
        emissiveIntensity={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

// Destination Goal Portal
function GoalPortal({ x, z }: { x: number; z: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.5;
    }
  });

  return (
    <group position={[x, 0.05, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.65, 32]} />
        <meshBasicMaterial color="#60a5fa" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Tilted Board with Labyrinth
function TiltedBoard({ state }: Props) {
  const level = LEVELS[state.currentLevelIndex % LEVELS.length];
  const boardGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (boardGroupRef.current) {
      // Smoothly tilt board according to physics state
      boardGroupRef.current.rotation.x = state.tilt.pitch;
      boardGroupRef.current.rotation.z = state.tilt.roll;
    }
  });

  return (
    <group ref={boardGroupRef}>
      {/* Board Base Surface */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[12.4, 0.4, 12.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Grid Floor Overlay */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.0, 12.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Labyrinth Walls */}
      {level.walls.map((wall, idx) => (
        <mesh key={idx} position={[wall.x, 0.4, wall.z]}>
          <boxGeometry args={[wall.width, 0.8, wall.depth]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.2}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ))}

      {/* Hole Traps */}
      {level.holes.map((hole, idx) => (
        <mesh key={idx} position={[hole.x, 0.02, hole.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[hole.radius, 24]} />
          <meshBasicMaterial color="#020617" />
        </mesh>
      ))}

      {/* Gems */}
      {state.gems.map((gem) => (
        <GemItem key={gem.id} gem={gem} />
      ))}

      {/* Goal */}
      <GoalPortal x={level.goal.x} z={level.goal.z} />

      {/* Rolling Metallic Ball */}
      <mesh position={[state.ball.x, state.ball.y, state.ball.z]}>
        <sphereGeometry args={[state.ball.radius, 32, 32]} />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.95}
          roughness={0.1}
          emissive="#38bdf8"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

export function GravityRoller3DScene(props: Props) {
  return (
    <div className="relative h-155 w-full overflow-hidden rounded-2xl border border-border bg-slate-950 shadow-inner">
      <Canvas
        camera={{ position: [0, 14, 9], fov: 45 }}
        className="h-full w-full"
      >
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} />
        <pointLight position={[0, 8, 0]} intensity={1.2} color="#38bdf8" />

        <OrbitControls
          enableRotate={false}
          enablePan={false}
          enableZoom={false}
        />

        <TiltedBoard {...props} />
      </Canvas>
    </div>
  );
}
