import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type TowerBlock,
  type MovingBlock,
  type CutPiece,
  BLOCK_HEIGHT,
} from '../../lib/games/stack-tower';

interface FallingPiece extends CutPiece {
  vy: number;
  rotX: number;
  rotZ: number;
}

interface SceneProps {
  blocks: TowerBlock[];
  movingBlock: MovingBlock | null;
  fallingPieces: FallingPiece[];
  status: 'idle' | 'playing' | 'gameover';
}

function CameraRig({ towerHeight }: { towerHeight: number }) {
  const { camera } = useThree();
  const targetY = useRef(5);

  useFrame((_, delta) => {
    targetY.current = Math.max(5, towerHeight * BLOCK_HEIGHT + 4);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY.current + 3, 4, delta);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, 8, 4, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 8, 4, delta);
    camera.lookAt(0, targetY.current - 2, 0);
  });

  return null;
}

function TowerVisuals({
  blocks,
  movingBlock,
  fallingPieces,
}: {
  blocks: TowerBlock[];
  movingBlock: MovingBlock | null;
  fallingPieces: FallingPiece[];
}) {
  return (
    <group>
      {/* Placed blocks */}
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.y + BLOCK_HEIGHT / 2, b.z]}>
          <boxGeometry args={[b.width, BLOCK_HEIGHT, b.depth]} />
          <meshStandardMaterial
            color={b.color}
            roughness={0.25}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Moving active block */}
      {movingBlock && (
        <mesh
          position={[
            movingBlock.axis === 'x' ? movingBlock.position : blocks[blocks.length - 1].x,
            (blocks.length) * BLOCK_HEIGHT + BLOCK_HEIGHT / 2,
            movingBlock.axis === 'z' ? movingBlock.position : blocks[blocks.length - 1].z,
          ]}
        >
          <boxGeometry args={[movingBlock.width, BLOCK_HEIGHT, movingBlock.depth]} />
          <meshStandardMaterial
            color={movingBlock.color}
            roughness={0.2}
            metalness={0.15}
            emissive={movingBlock.color}
            emissiveIntensity={0.2}
          />
        </mesh>
      )}

      {/* Falling debris pieces */}
      {fallingPieces.map((p, i) => (
        <mesh
          key={`fall-${i}`}
          position={[p.x, p.y + BLOCK_HEIGHT / 2, p.z]}
          rotation={[p.rotX, 0, p.rotZ]}
        >
          <boxGeometry args={[p.width, BLOCK_HEIGHT, p.depth]} />
          <meshStandardMaterial
            color={p.color}
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={Math.max(0.2, (p.y + 10) / 10)}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function StackTowerScene({
  blocks,
  movingBlock,
  fallingPieces,
}: SceneProps) {
  return (
    <div className="relative w-full h-130 rounded-2xl overflow-hidden bg-background select-none touch-none">
      <Canvas
        camera={{ position: [8, 8, 8], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#090d16']} />
        <fog attach="fog" args={['#090d16', 15, 35]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <directionalLight position={[-10, 10, -5]} intensity={0.4} color="#6366f1" />

        <CameraRig towerHeight={blocks.length} />
        <TowerVisuals
          blocks={blocks}
          movingBlock={movingBlock}
          fallingPieces={fallingPieces}
        />
      </Canvas>
    </div>
  );
}
