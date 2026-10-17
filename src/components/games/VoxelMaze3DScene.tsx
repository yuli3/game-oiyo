import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VoxelMazeState } from '../../lib/games/voxel-maze';

interface VoxelMaze3DSceneProps {
  state: VoxelMazeState;
}

export default function VoxelMaze3DScene({ state }: VoxelMaze3DSceneProps) {
  const playerRef = useRef<THREE.Group>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  const itemsGroupRef = useRef<THREE.Group>(null);

  useFrame((stateThree, delta) => {
    // Camera smoothly follows player in third-person isometric angle
    const targetCamX = state.player.x + 0;
    const targetCamY = 16;
    const targetCamZ = state.player.z + 12;

    stateThree.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
    stateThree.camera.lookAt(state.player.x, 0.5, state.player.z);

    // Rotate player
    if (playerRef.current) {
      playerRef.current.position.set(state.player.x, 0.5, state.player.z);
      playerRef.current.rotation.y = THREE.MathUtils.lerp(
        playerRef.current.rotation.y,
        state.player.facing,
        delta * 15
      );
    }

    // Portal animation
    if (portalRef.current) {
      portalRef.current.rotation.y += delta * 2;
    }

    // Floating item rotation
    if (itemsGroupRef.current) {
      itemsGroupRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 20]} intensity={1.4} color="#f8fafc" />
      <pointLight position={[state.player.x, 3, state.player.z]} intensity={1.5} color="#38bdf8" distance={15} />

      {/* Floor Grid */}
      <mesh position={[state.gridSize / 2 - 0.5, -0.1, state.gridSize / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[state.gridSize + 2, state.gridSize + 2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Voxel Grid Blocks */}
      {state.grid.map((row, z) =>
        row.map((cell, x) => {
          if (cell === 1) {
            // Voxel Wall
            return (
              <mesh key={`wall-${x}-${z}`} position={[x, 1, z]}>
                <boxGeometry args={[0.96, 2, 0.96]} />
                <meshStandardMaterial
                  color="#334155"
                  roughness={0.4}
                  metalness={0.2}
                />
              </mesh>
            );
          }
          if (cell === 2) {
            // Locked Gate
            return (
              <mesh key={`gate-${x}-${z}`} position={[x, 1, z]}>
                <boxGeometry args={[0.96, 2, 0.96]} />
                <meshStandardMaterial
                  color="#f59e0b"
                  emissive="#d97706"
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.85}
                />
              </mesh>
            );
          }
          if (cell === 3) {
            // Key Item
            return (
              <group key={`key-${x}-${z}`} position={[x, 0.8, z]}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <octahedronGeometry args={[0.4]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#f59e0b"
                    emissiveIntensity={1.2}
                  />
                </mesh>
              </group>
            );
          }
          if (cell === 4) {
            // Gem Item
            return (
              <group key={`gem-${x}-${z}`} position={[x, 0.6, z]}>
                <mesh>
                  <dodecahedronGeometry args={[0.3]} />
                  <meshStandardMaterial
                    color="#06b6d4"
                    emissive="#0891b2"
                    emissiveIntensity={1.0}
                  />
                </mesh>
              </group>
            );
          }
          if (cell === 5) {
            // Exit Portal
            return (
              <group key={`exit-${x}-${z}`} position={[x, 0.2, z]}>
                <mesh ref={portalRef}>
                  <cylinderGeometry args={[0.6, 0.6, 0.2, 16]} />
                  <meshStandardMaterial
                    color="#10b981"
                    emissive="#059669"
                    emissiveIntensity={1.5}
                  />
                </mesh>
              </group>
            );
          }
          return null;
        })
      )}

      {/* Patrolling Sentinel Drones */}
      {state.sentinels.map((drone) => (
        <group key={drone.id} position={[drone.gx, 1.2, drone.gz]}>
          <mesh>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={1.2}
            />
          </mesh>
          <pointLight color="#ef4444" intensity={1.5} distance={4} />
        </group>
      ))}

      {/* Player Voxel Character */}
      <group ref={playerRef}>
        {/* Head */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.55, 0.55, 0.35]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>
        {/* Backpack Energy Pack */}
        <mesh position={[0, 0.5, -0.22]}>
          <boxGeometry args={[0.35, 0.35, 0.15]} />
          <meshStandardMaterial color="#06b6d4" emissive="#0284c7" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </>
  );
}
