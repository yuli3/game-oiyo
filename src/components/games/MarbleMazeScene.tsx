import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type MazeConfig,
  type BallPhysics,
  updateBallPhysics,
  calculateScore,
} from '../../lib/games/marble-maze';

interface Props {
  config: MazeConfig;
  status: 'playing' | 'cleared' | 'fallen';
  onCollectGem: (collected: number) => void;
  onClear: (finalTime: number, score: number) => void;
  onFall: () => void;
  audioEnabled: boolean;
}

function MazeBoard({
  config,
  ballPos,
  gems,
  tilt,
}: {
  config: MazeConfig;
  ballPos: { x: number; z: number };
  gems: Set<string>;
  tilt: { x: number; z: number };
}) {
  const boardRef = useRef<THREE.Group>(null);
  const ballMeshRef = useRef<THREE.Mesh>(null);
  const prevBallPos = useRef({ x: ballPos.x, z: ballPos.z });

  const halfW = (config.width - 1) / 2;
  const halfH = (config.height - 1) / 2;

  // Board tilt smoothing
  useFrame((_, delta) => {
    if (boardRef.current) {
      boardRef.current.rotation.z = THREE.MathUtils.damp(
        boardRef.current.rotation.z,
        -tilt.x * 0.22,
        15,
        delta
      );
      boardRef.current.rotation.x = THREE.MathUtils.damp(
        boardRef.current.rotation.x,
        tilt.z * 0.22,
        15,
        delta
      );
    }

    if (ballMeshRef.current) {
      const bx = ballPos.x - halfW;
      const bz = ballPos.z - halfH;
      ballMeshRef.current.position.set(bx, 0.25, bz);

      // Roll animation based on delta movement
      const dx = ballPos.x - prevBallPos.current.x;
      const dz = ballPos.z - prevBallPos.current.z;
      ballMeshRef.current.rotation.z -= dx / 0.25;
      ballMeshRef.current.rotation.x += dz / 0.25;

      prevBallPos.current = { x: ballPos.x, z: ballPos.z };
    }
  });

  // Walls, holes, goal elements
  const { walls, holes, goal } = useMemo(() => {
    const w: [number, number][] = [];
    const h: [number, number][] = [];
    let g: [number, number] = [0, 0];

    for (let z = 0; z < config.height; z++) {
      for (let x = 0; x < config.width; x++) {
        const type = config.grid[z][x];
        const wx = x - halfW;
        const wz = z - halfH;
        if (type === 1) {
          w.push([wx, wz]);
        } else if (type === 2) {
          h.push([wx, wz]);
        } else if (type === 5) {
          g = [wx, wz];
        }
      }
    }
    return { walls: w, holes: h, goal: g };
  }, [config, halfW, halfH]);

  return (
    <group ref={boardRef}>
      {/* Maze Floor Base */}
      <mesh receiveShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[config.width + 0.8, 0.3, config.height + 0.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Outer Border Rim */}
      <mesh position={[0, 0.2, (config.height + 0.6) / 2]}>
        <boxGeometry args={[config.width + 0.8, 0.4, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, -(config.height + 0.6) / 2]}>
        <boxGeometry args={[config.width + 0.8, 0.4, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      <mesh position={[(config.width + 0.6) / 2, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, config.height + 0.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      <mesh position={[-(config.width + 0.6) / 2, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, config.height + 0.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>

      {/* Internal Walls */}
      {walls.map(([wx, wz], idx) => (
        <mesh key={`wall-${idx}`} castShadow receiveShadow position={[wx, 0.25, wz]}>
          <boxGeometry args={[0.96, 0.5, 0.96]} />
          <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.6} />
        </mesh>
      ))}

      {/* Trap Holes */}
      {holes.map(([hx, hz], idx) => (
        <group key={`hole-${idx}`} position={[hx, 0.01, hz]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.38, 24]} />
            <meshBasicMaterial color="#050505" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.36, 0.42, 24]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}

      {/* Gems */}
      {Array.from(gems).map((key) => {
        const [gx, gz] = key.split(',').map(Number);
        return (
          <group key={`gem-${key}`} position={[gx - halfW, 0.35, gz - halfH]}>
            <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
              <octahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#0891b2"
                emissiveIntensity={0.6}
                roughness={0.1}
                metalness={0.8}
              />
            </mesh>
          </group>
        );
      })}

      {/* Goal Ring / Pad */}
      <group position={[goal[0], 0.02, goal[1]]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.42, 32]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
        <pointLight color="#10b981" intensity={1.5} distance={1.8} />
      </group>

      {/* Marble Ball */}
      <mesh ref={ballMeshRef} castShadow position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.1}
          metalness={0.9}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

export default function MarbleMazeScene({
  config,
  status,
  onCollectGem,
  onClear,
  onFall,
  audioEnabled: _audioEnabled,
}: Props) {
  const [tilt, setTilt] = useState({ x: 0, z: 0 });
  const tiltRef = useRef({ x: 0, z: 0 });

  const [ball, setBall] = useState<BallPhysics>({
    x: config.startX,
    z: config.startZ,
    vx: 0,
    vz: 0,
    radius: 0.25,
  });

  const [gems, setGems] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (let z = 0; z < config.height; z++) {
      for (let x = 0; x < config.width; x++) {
        if (config.grid[z][x] === 3) {
          set.add(`${x},${z}`);
        }
      }
    }
    return set;
  });

  const collectedGemsCount = useRef(0);
  const startTime = useRef(Date.now());
  const activeKeys = useRef<Set<string>>(new Set());
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // Keyboard tilt controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.code);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main physics & tilt tick
  useEffect(() => {
    if (status !== 'playing') return;

    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      // Calculate keyboard tilt
      let kx = 0;
      let kz = 0;
      if (activeKeys.current.has('ArrowLeft') || activeKeys.current.has('KeyA')) kx -= 0.8;
      if (activeKeys.current.has('ArrowRight') || activeKeys.current.has('KeyD')) kx += 0.8;
      if (activeKeys.current.has('ArrowUp') || activeKeys.current.has('KeyW')) kz -= 0.8;
      if (activeKeys.current.has('ArrowDown') || activeKeys.current.has('KeyS')) kz += 0.8;

      const finalTiltX = Math.max(-1, Math.min(1, tiltRef.current.x + kx));
      const finalTiltZ = Math.max(-1, Math.min(1, tiltRef.current.z + kz));
      setTilt({ x: finalTiltX, z: finalTiltZ });

      setBall((prev) => {
        const { ball: nextBall, event, gemPos } = updateBallPhysics(
          prev,
          finalTiltX,
          finalTiltZ,
          config,
          dt
        );

        if (event === 'gem' && gemPos) {
          const key = `${gemPos.x},${gemPos.z}`;
          setGems((prevGems) => {
            const nextGems = new Set(prevGems);
            nextGems.delete(key);
            return nextGems;
          });
          collectedGemsCount.current++;
          onCollectGem(collectedGemsCount.current);
        } else if (event === 'hole') {
          onFall();
        } else if (event === 'goal') {
          const elapsed = (Date.now() - startTime.current) / 1000;
          const score = calculateScore(elapsed, collectedGemsCount.current, config.gemTotal);
          onClear(elapsed, score);
        }

        return nextBall;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [status, config, onCollectGem, onFall, onClear]);

  // Touch / Pointer drag handler for mobile & mouse
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = (e.clientX - dragStart.current.x) / 140;
    const dy = (e.clientY - dragStart.current.y) / 140;
    tiltRef.current = {
      x: Math.max(-1, Math.min(1, dx)),
      z: Math.max(-1, Math.min(1, dy)),
    };
  };

  const handlePointerUp = () => {
    dragStart.current = null;
    tiltRef.current = { x: 0, z: 0 };
  };

  return (
    <div
      className="relative w-full h-135 select-none touch-none rounded-2xl overflow-hidden bg-card border border-border"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        shadows
        camera={{ position: [0, 14, 11], fov: 46 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#090d16']} />
        <ambientLight intensity={0.8} />
        <directionalLight
          castShadow
          position={[6, 16, 8]}
          intensity={1.8}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />
        <pointLight position={[-8, 6, -6]} intensity={0.6} color="#38bdf8" />

        <MazeBoard config={config} ballPos={ball} gems={gems} tilt={tilt} />
      </Canvas>

      {/* On-screen control helper hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-secondary/80 backdrop-blur border border-border text-xs text-secondary-foreground pointer-events-none text-center">
        WASD / 방향키 또는 화면 드래그로 3D 미로 판을 기울이세요
      </div>
    </div>
  );
}
