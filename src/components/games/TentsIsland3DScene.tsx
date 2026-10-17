"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TentsPuzzle } from '../../lib/games/tents';

export type CellMark = 'empty' | 'tent' | 'grass';

interface Props {
  puzzle: TentsPuzzle;
  marks: CellMark[][];
  onCellClick: (row: number, col: number) => void;
  isComplete: boolean;
}

// 3D Low-poly Pine Tree
function Tree3DMesh({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Foliage Layers (3 Cones) */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <coneGeometry args={[0.38, 0.4, 6]} />
        <meshStandardMaterial color="#15803d" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.3, 0.35, 6]} />
        <meshStandardMaterial color="#16a34a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[0.2, 0.3, 6]} />
        <meshStandardMaterial color="#22c55e" roughness={0.5} />
      </mesh>
    </group>
  );
}

// 3D Low-poly Camping Tent
function Tent3DMesh({ position, isWinning }: { position: [number, number, number]; isWinning?: boolean }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isWinning && meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 6) * 0.08;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Tent Body (Triangular Prism) */}
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.32, 0.44, 4]} />
        <meshStandardMaterial
          color="#ea580c"
          roughness={0.4}
          metalness={0.1}
          emissive="#ea580c"
          emissiveIntensity={isWinning ? 0.4 : 0.1}
        />
      </mesh>
      {/* Tent Entrance flap (Darker triangle) */}
      <mesh position={[0, 0.18, 0.18]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.16, 0.3, 3]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>
      {/* Wooden Pegs */}
      <mesh position={[0.24, 0.04, 0.24]}>
        <cylinderGeometry args={[0.02, 0.02, 0.1]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>
      <mesh position={[-0.24, 0.04, 0.24]}>
        <cylinderGeometry args={[0.02, 0.02, 0.1]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>
    </group>
  );
}

// 3D Grass/Rock Marker (Marked cell where tent cannot be)
function GrassMarker3DMesh({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.2]} />
        <meshStandardMaterial color="#65a30d" roughness={0.7} />
      </mesh>
      <mesh position={[0.05, 0.08, -0.05]}>
        <boxGeometry args={[0.1, 0.08, 0.1]} />
        <meshStandardMaterial color="#84cc16" roughness={0.6} />
      </mesh>
    </group>
  );
}

function IslandSceneContent({
  puzzle,
  marks,
  onCellClick,
  isComplete,
}: Props) {
  const size = puzzle.size;
  const cellSize = 1.1;
  const half = (size * cellSize) / 2;

  // Count tents placed per row and col to check hint match
  const rowCounts = Array(size).fill(0);
  const colCounts = Array(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (marks[r][c] === 'tent') {
        rowCounts[r]++;
        colCounts[c]++;
      }
    }
  }

  // Set of tree coords
  const treeSet = new Set(puzzle.trees.map(([r, c]) => `${r},${c}`));

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 12, 8]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 6, -4]} intensity={0.4} />

      {/* Floating Island Bedrock Base */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[half * 1.45, half * 1.1, 1.0, 8]} />
        <meshStandardMaterial color="#57534e" roughness={0.8} />
      </mesh>

      {/* Lush Green Island Top Surface */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[size * cellSize + 0.6, 0.15, size * cellSize + 0.6]} />
        <meshStandardMaterial color="#166534" roughness={0.7} />
      </mesh>

      {/* Ocean Water Plane */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.15}
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Column Hints (Top side) */}
      {puzzle.colHints.map((hint, c) => {
        const x = c * cellSize - half + cellSize / 2;
        const z = -half - 0.45;
        const isMatched = colCounts[c] === hint;
        const isExceeded = colCounts[c] > hint;

        return (
          <group key={`col-hint-${c}`} position={[x, 0.1, z]}>
            <mesh>
              <boxGeometry args={[0.65, 0.25, 0.65]} />
              <meshStandardMaterial
                color={isExceeded ? '#dc2626' : isMatched ? '#10b981' : '#334155'}
                roughness={0.5}
              />
            </mesh>
          </group>
        );
      })}

      {/* Row Hints (Left side) */}
      {puzzle.rowHints.map((hint, r) => {
        const z = r * cellSize - half + cellSize / 2;
        const x = -half - 0.45;
        const isMatched = rowCounts[r] === hint;
        const isExceeded = rowCounts[r] > hint;

        return (
          <group key={`row-hint-${r}`} position={[x, 0.1, z]}>
            <mesh>
              <boxGeometry args={[0.65, 0.25, 0.65]} />
              <meshStandardMaterial
                color={isExceeded ? '#dc2626' : isMatched ? '#10b981' : '#334155'}
                roughness={0.5}
              />
            </mesh>
          </group>
        );
      })}

      {/* Grid Cells */}
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          const x = c * cellSize - half + cellSize / 2;
          const z = r * cellSize - half + cellSize / 2;
          const isTree = treeSet.has(`${r},${c}`);
          const mark = marks[r][c];

          const isDarker = (r + c) % 2 === 1;

          return (
            <group
              key={`cell-${r}-${c}`}
              position={[x, 0, z]}
              onClick={(e) => {
                e.stopPropagation();
                if (!isTree) onCellClick(r, c);
              }}
            >
              {/* Ground Tile */}
              <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[cellSize * 0.94, 0.08, cellSize * 0.94]} />
                <meshStandardMaterial
                  color={isDarker ? '#15803d' : '#16a34a'}
                  roughness={0.8}
                />
              </mesh>

              {/* Elements on Tile */}
              {isTree && <Tree3DMesh position={[0, 0.04, 0]} />}
              {mark === 'tent' && <Tent3DMesh position={[0, 0.04, 0]} isWinning={isComplete} />}
              {mark === 'grass' && <GrassMarker3DMesh position={[0, 0.04, 0]} />}
            </group>
          );
        })
      )}
    </>
  );
}

export function TentsIsland3DScene(props: Props) {
  return (
    <div className="relative h-150 w-full overflow-hidden rounded-2xl border border-border bg-slate-950 shadow-inner">
      <Canvas
        shadows
        camera={{ position: [0, 8.5, 6.2], fov: 45 }}
        className="h-full w-full"
      >
        <color attach="background" args={['#0c1427']} />
        <IslandSceneContent {...props} />
      </Canvas>
    </div>
  );
}
