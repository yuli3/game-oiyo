import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DungeonCrawlerState } from '../../lib/games/dungeon-crawler';

interface DungeonCrawler3DSceneProps {
  state: DungeonCrawlerState;
}

export default function DungeonCrawler3DScene({ state }: DungeonCrawler3DSceneProps) {
  const playerRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (playerRef.current) {
      // Smooth interpolation to grid position
      playerRef.current.position.x = THREE.MathUtils.lerp(playerRef.current.position.x, state.playerX, delta * 12);
      playerRef.current.position.z = THREE.MathUtils.lerp(playerRef.current.position.z, state.playerZ, delta * 12);

      // Facing angle
      // 0: North (-z) -> Math.PI, 1: East (+x) -> Math.PI/2, 2: South (+z) -> 0, 3: West (-x) -> -Math.PI/2
      const targetRotY =
        state.playerFacing === 0
          ? Math.PI
          : state.playerFacing === 1
          ? Math.PI / 2
          : state.playerFacing === 2
          ? 0
          : -Math.PI / 2;
      playerRef.current.rotation.y = THREE.MathUtils.lerp(playerRef.current.rotation.y, targetRotY, delta * 14);
    }
  });

  return (
    <>
      <color attach="background" args={["#09090b"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />

      {/* Point light centered on player */}
      <pointLight position={[state.playerX, 2.5, state.playerZ]} intensity={2.0} color="#f59e0b" distance={8} />

      {/* Dungeon Floor and Walls */}
      {state.map.map((row, z) =>
        row.map((tile, x) => (
          <group key={`${x}-${z}`}>
            {/* Floor tile for every cell */}
            <mesh position={[x, -0.05, z]}>
              <boxGeometry args={[0.98, 0.1, 0.98]} />
              <meshStandardMaterial color={tile === 1 ? '#18181b' : '#27272a'} roughness={0.8} />
            </mesh>

            {/* Wall Block */}
            {tile === 1 && (
              <mesh position={[x, 0.9, z]}>
                <boxGeometry args={[0.98, 1.8, 0.98]} />
                <meshStandardMaterial color="#3f3f46" roughness={0.9} />
              </mesh>
            )}

            {/* Chest */}
            {tile === 3 && (
              <group position={[x, 0.25, z]}>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.6, 0.45, 0.5]} />
                  <meshStandardMaterial color="#78350f" roughness={0.6} />
                </mesh>
                <mesh position={[0, 0, 0.26]}>
                  <boxGeometry args={[0.12, 0.12, 0.05]} />
                  <meshBasicMaterial color="#eab308" />
                </mesh>
              </group>
            )}

            {/* Exit Ladder / Portal */}
            {tile === 4 && (
              <group position={[x, 0.1, z]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.45, 16]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                <pointLight position={[0, 0.5, 0]} intensity={1.5} color="#38bdf8" distance={4} />
              </group>
            )}

            {/* Potion Vial */}
            {tile === 5 && (
              <group position={[x, 0.3, z]}>
                <mesh>
                  <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </group>
            )}
          </group>
        ))
      )}

      {/* Alive Enemies */}
      {state.enemies.map(
        (enemy) =>
          !enemy.isDead && (
            <group key={enemy.id} position={[enemy.x, 0.4, enemy.z]}>
              {enemy.type === 'slime' && (
                <mesh position={[0, 0.1, 0]}>
                  <sphereGeometry args={[0.35, 16, 16]} />
                  <meshStandardMaterial color="#10b981" roughness={0.3} />
                </mesh>
              )}
              {enemy.type === 'goblin' && (
                <mesh position={[0, 0.2, 0]}>
                  <boxGeometry args={[0.5, 0.7, 0.5]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.5} />
                </mesh>
              )}
              {enemy.type === 'skeleton' && (
                <mesh position={[0, 0.25, 0]}>
                  <boxGeometry args={[0.45, 0.85, 0.45]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
                </mesh>
              )}
            </group>
          )
      )}

      {/* Player Hero Voxel Model */}
      <group ref={playerRef} position={[state.playerX, 0.45, state.playerZ]}>
        {/* Body Armor */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.5, 0.65, 0.35]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Head / Helmet */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.32, 0.32, 0.32]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Sword on Right Hand */}
        <mesh position={[0.35, 0.2, 0.15]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.08, 0.6, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Shield on Left Hand */}
        <mesh position={[-0.32, 0.15, 0.05]}>
          <boxGeometry args={[0.08, 0.45, 0.4]} />
          <meshStandardMaterial color="#0369a1" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </>
  );
}
