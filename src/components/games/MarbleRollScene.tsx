import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type MarbleState,
  COURSE_TILES,
} from '../../lib/games/marble-roll';

interface SceneProps {
  marble: MarbleState;
}

function CameraRig({ marble }: { marble: MarbleState }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    // Chase camera behind marble looking down track (+Z direction)
    const targetCamX = marble.x * 0.7;
    const targetCamY = Math.max(marble.y + 4.2, 4);
    const targetCamZ = marble.z - 8.5;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 6, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 8, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 10, delta);

    const lookTarget = new THREE.Vector3(marble.x * 0.4, marble.y + 1, marble.z + 12);
    camera.lookAt(lookTarget);
  });

  return null;
}

function MarbleMesh({ marble }: { marble: MarbleState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rotX = useRef(0);
  const rotZ = useRef(0);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(marble.x, marble.y, marble.z);

      // Rolling rotation based on velocity
      rotX.current += marble.vz * delta * 2.2;
      rotZ.current -= marble.vx * delta * 2.2;
      meshRef.current.rotation.x = rotX.current;
      meshRef.current.rotation.z = rotZ.current;
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial
        color="#38bdf8"
        roughness={0.12}
        metalness={0.88}
        emissive="#0284c7"
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

function StarItem({ position, collected }: { position: [number, number, number]; collected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2.5;
      meshRef.current.position.y = position[1] + 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  if (collected) return null;

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 1.2, position[2]]}>
      <octahedronGeometry args={[0.45]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function Track() {
  return (
    <group>
      {COURSE_TILES.map((tile) => {
        const [x, y, z] = tile.position;
        const [w, h, d] = tile.size;

        let color = '#334155'; // normal
        let emissive = '#0f172a';
        let emissiveIntensity = 0;

        if (tile.type === 'boost') {
          color = '#10b981';
          emissive = '#059669';
          emissiveIntensity = 0.6;
        } else if (tile.type === 'jump') {
          color = '#f59e0b';
          emissive = '#d97706';
          emissiveIntensity = 0.7;
        } else if (tile.type === 'checkpoint') {
          color = '#8b5cf6';
          emissive = '#6d28d9';
          emissiveIntensity = 0.5;
        } else if (tile.type === 'finish') {
          color = '#e11d48';
          emissive = '#be123c';
          emissiveIntensity = 0.8;
        }

        return (
          <group key={tile.id} position={[x, y, z]}>
            <mesh receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial
                color={color}
                roughness={0.4}
                metalness={0.3}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
              />
            </mesh>

            {/* Checkpoint light pillar */}
            {tile.type === 'checkpoint' && (
              <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 8, 16]} />
                <meshBasicMaterial color="#c084fc" transparent opacity={0.4} />
              </mesh>
            )}

            {/* Finish Arch */}
            {tile.type === 'finish' && (
              <group position={[0, 2.5, 0]}>
                <mesh position={[-w / 2 + 0.4, 0, 0]}>
                  <boxGeometry args={[0.6, 5, 0.6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.8} />
                </mesh>
                <mesh position={[w / 2 - 0.4, 0, 0]}>
                  <boxGeometry args={[0.6, 5, 0.6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.8} />
                </mesh>
                <mesh position={[0, 2.4, 0]}>
                  <boxGeometry args={[w, 0.8, 0.6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.8} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function MarbleRollScene({ marble }: SceneProps) {
  return (
    <div className="relative w-full h-130 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl">
      <Canvas
        camera={{ position: [0, 5, -8], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#090d16"]} />
        <fog attach="fog" args={["#090d16", 40, 160]} />

        <ambientLight intensity={0.7} />
        <directionalLight
          position={[20, 40, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[marble.x, marble.y + 2, marble.z]} intensity={0.8} color="#38bdf8" />

        <CameraRig marble={marble} />
        <MarbleMesh marble={marble} />
        <Track />

        {COURSE_TILES.map((t) =>
          t.hasStar ? (
            <StarItem
              key={`star-${t.id}`}
              position={t.position}
              collected={marble.stars[t.id] ?? false}
            />
          ) : null
        )}
      </Canvas>
    </div>
  );
}
