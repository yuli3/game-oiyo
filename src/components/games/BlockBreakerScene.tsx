"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BlockBreakerState, Block, Ball, PowerupItem, LaserBeam } from '../../lib/games/block-breaker';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';

interface Props {
  state: BlockBreakerState;
}

function VoxelBlockMesh({ block }: { block: Block }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = block.color;
  const isCracked = block.durability < block.maxDurability;

  return (
    <mesh ref={meshRef} position={[block.x, block.y, 0]}>
      <boxGeometry args={[block.width * 0.95, block.height * 0.9, 0.6]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.7}
        emissive={color}
        emissiveIntensity={isCracked ? 0.1 : 0.35}
      />
    </mesh>
  );
}

function PaddleMesh({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.x = x;
    meshRef.current.position.y = y;
  });

  return (
    <mesh ref={meshRef} position={[x, y, 0]}>
      <boxGeometry args={[width, height, 0.7]} />
      <meshStandardMaterial
        color="#06b6d4"
        emissive="#06b6d4"
        emissiveIntensity={0.6}
        roughness={0.15}
        metalness={0.85}
      />
    </mesh>
  );
}

function BallMesh({ ball }: { ball: Ball }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(ball.x, ball.y, 0);
  });

  return (
    <group>
      <mesh ref={meshRef} position={[ball.x, ball.y, 0]}>
        <sphereGeometry args={[ball.radius, 16, 16]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#facc15"
          emissiveIntensity={1.0}
          roughness={0.1}
          metalness={0.9}
        />
        <pointLight color="#facc15" intensity={1.5} distance={2.5} />
      </mesh>
    </group>
  );
}

function PowerupMesh({ item }: { item: PowerupItem }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.set(item.x, item.y, 0);
    meshRef.current.rotation.x += delta * 2.5;
    meshRef.current.rotation.y += delta * 3.0;
  });

  const color =
    item.type === 'multiball'
      ? '#ec4899'
      : item.type === 'expand'
        ? '#3b82f6'
        : item.type === 'laser'
          ? '#ef4444'
          : '#10b981';

  return (
    <mesh ref={meshRef} position={[item.x, item.y, 0]}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function LaserMesh({ laser }: { laser: LaserBeam }) {
  return (
    <mesh position={[laser.x, laser.y, 0]}>
      <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />
      <meshStandardMaterial
        color="#ef4444"
        emissive="#ef4444"
        emissiveIntensity={1.5}
      />
    </mesh>
  );
}

function ArenaWalls({ width, height }: { width: number; height: number }) {
  const halfW = width / 2;
  const wallThickness = 0.35;
  const wallDepth = 0.9;

  return (
    <group>
      {/* Left Wall */}
      <mesh position={[-halfW - wallThickness / 2, height / 2, 0]}>
        <boxGeometry args={[wallThickness, height, wallDepth]} />
        <meshStandardMaterial color="#475569" emissive="#1e293b" emissiveIntensity={0.3} metalness={0.8} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[halfW + wallThickness / 2, height / 2, 0]}>
        <boxGeometry args={[wallThickness, height, wallDepth]} />
        <meshStandardMaterial color="#475569" emissive="#1e293b" emissiveIntensity={0.3} metalness={0.8} />
      </mesh>

      {/* Top Wall */}
      <mesh position={[0, height + wallThickness / 2, 0]}>
        <boxGeometry args={[width + wallThickness * 2, wallThickness, wallDepth]} />
        <meshStandardMaterial color="#475569" emissive="#1e293b" emissiveIntensity={0.3} metalness={0.8} />
      </mesh>

      {/* Backboard Grid */}
      <mesh position={[0, height / 2, -0.45]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#0b1120" roughness={0.9} metalness={0.1} />
      </mesh>
    </group>
  );
}

function SceneContent({ state }: Props) {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 8, 12]} intensity={1.4} />
      <pointLight position={[-4, 10, 4]} intensity={0.8} color="#06b6d4" />
      <pointLight position={[4, 10, 4]} intensity={0.8} color="#ec4899" />

      <ArenaWalls width={state.playWidth} height={state.playHeight} />

      {/* Blocks */}
      {state.blocks.map((b) => (
        <VoxelBlockMesh key={b.id} block={b} />
      ))}

      {/* Paddle */}
      <PaddleMesh
        x={state.paddleX}
        y={state.paddleY}
        width={state.paddleWidth}
        height={state.paddleHeight}
      />

      {/* Balls */}
      {state.balls.map((ball) => (
        <BallMesh key={ball.id} ball={ball} />
      ))}

      {/* Powerups */}
      {state.powerups.map((p) => (
        <PowerupMesh key={p.id} item={p} />
      ))}

      {/* Lasers */}
      {state.lasers.map((l) => (
        <LaserMesh key={l.id} laser={l} />
      ))}
    </group>
  );
}

export default function BlockBreakerScene({ state }: Props) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Canvas
      className="w-full h-full touch-none select-none"
      camera={{ position: [0, 4.5, 13.5], fov: 52 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
    >
      <color attach="background" args={["#030712"]} />
      <SceneContent state={state} />
    </Canvas>
  );
}
