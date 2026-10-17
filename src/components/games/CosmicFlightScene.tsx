import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type FlightCourse,
  type ShipState,
  updateShipPhysics,
  checkRingPass,
  checkAsteroidCollision,
} from '../../lib/games/cosmic-flight';

interface Props {
  course: FlightCourse;
  status: 'playing' | 'cleared' | 'crashed';
  onPassRing: (ringIndex: number, combo: number) => void;
  onCrash: () => void;
  onFinish: (score: number) => void;
  audioEnabled: boolean;
}

function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);

  const starGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = -Math.random() * 800;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points ref={pointsRef}>
      <primitive object={starGeo} attach="geometry" />
      <pointsMaterial size={1.2} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
}

function SpaceshipModel({ ship }: { ship: ShipState }) {
  const shipGroup = useRef<THREE.Group>(null);

  useFrame(() => {
    if (shipGroup.current) {
      shipGroup.current.position.set(ship.x, ship.y, ship.z);
      shipGroup.current.rotation.x = ship.pitch;
      shipGroup.current.rotation.z = ship.roll;
    }
  });

  return (
    <group ref={shipGroup}>
      {/* Fuselage body */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.7, 2.8, 5]} />
        <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.3, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 1.2, 5]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Delta Wings */}
      <mesh position={[0, -0.1, 0.5]}>
        <boxGeometry args={[3.2, 0.08, 1.4]} />
        <meshStandardMaterial color="#0369a1" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Engine Thruster Glow */}
      <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.35, ship.isBoosting ? 1.6 : 0.8, 16]} />
        <meshBasicMaterial color={ship.isBoosting ? '#38bdf8' : '#f59e0b'} />
      </mesh>
      <pointLight
        position={[0, 0, 1.6]}
        color={ship.isBoosting ? '#38bdf8' : '#f59e0b'}
        intensity={ship.isBoosting ? 3 : 1.5}
        distance={4}
      />
    </group>
  );
}

function CameraRig({ ship }: { ship: ShipState }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const targetCamX = ship.x * 0.45;
    const targetCamY = ship.y * 0.45 + 2.2;
    const targetCamZ = ship.z + 6.5;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 12, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 12, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 18, delta);

    camera.lookAt(ship.x, ship.y, ship.z - 18);
  });

  return null;
}

export default function CosmicFlightScene({
  course,
  status,
  onPassRing,
  onCrash,
  onFinish,
  audioEnabled: _audioEnabled,
}: Props) {
  const [ship, setShip] = useState<ShipState>({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: -48,
    pitch: 0,
    roll: 0,
    boost: 100,
    isBoosting: false,
  });

  const [rings] = useState(course.rings);
  const comboRef = useRef(0);
  const activeKeys = useRef<Set<string>>(new Set());
  const touchInput = useRef({ x: 0, y: 0, boost: false });
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // Keyboard controls
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      activeKeys.current.add(e.code);
    };
    const handleUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.code);
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  // Main simulation tick
  useEffect(() => {
    if (status !== 'playing') return;

    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      let ix = touchInput.current.x;
      let iy = touchInput.current.y;
      let isBoost = touchInput.current.boost;

      if (activeKeys.current.has('ArrowLeft') || activeKeys.current.has('KeyA')) ix -= 1;
      if (activeKeys.current.has('ArrowRight') || activeKeys.current.has('KeyD')) ix += 1;
      if (activeKeys.current.has('ArrowUp') || activeKeys.current.has('KeyW')) iy += 1;
      if (activeKeys.current.has('ArrowDown') || activeKeys.current.has('KeyS')) iy -= 1;
      if (activeKeys.current.has('Space') || activeKeys.current.has('ShiftLeft')) isBoost = true;

      ix = Math.max(-1, Math.min(1, ix));
      iy = Math.max(-1, Math.min(1, iy));

      setShip((prev) => {
        const next = updateShipPhysics(prev, { x: ix, y: iy, boost: isBoost }, dt);

        // Check ring collisions
        for (let i = 0; i < rings.length; i++) {
          const r = rings[i];
          if (!r.passed && checkRingPass(next, r)) {
            r.passed = true;
            comboRef.current++;
            onPassRing(i, comboRef.current);
          }
        }

        // Check asteroid collision
        for (let i = 0; i < course.asteroids.length; i++) {
          const ast = course.asteroids[i];
          if (checkAsteroidCollision(next, ast)) {
            onCrash();
            break;
          }
        }

        // Check course finish
        const lastRing = rings[rings.length - 1];
        if (next.z <= lastRing.z - 20) {
          const score = 10000 + comboRef.current * 1200;
          onFinish(score);
        }

        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [status, rings, course, onPassRing, onCrash, onFinish]);

  // Pointer / Touch drag controls
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = (e.clientX - pointerStart.current.x) / 90;
    const dy = -(e.clientY - pointerStart.current.y) / 90;
    touchInput.current.x = Math.max(-1, Math.min(1, dx));
    touchInput.current.y = Math.max(-1, Math.min(1, dy));
  };

  const handlePointerUp = () => {
    pointerStart.current = null;
    touchInput.current.x = 0;
    touchInput.current.y = 0;
    touchInput.current.boost = false;
  };

  return (
    <div
      className="relative w-full h-135 select-none touch-none rounded-2xl overflow-hidden bg-card border border-border"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas shadows camera={{ fov: 60, position: [0, 3, 7] }} gl={{ antialias: true }}>
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#e0f2fe" />

        <Starfield />
        <SpaceshipModel ship={ship} />
        <CameraRig ship={ship} />

        {/* Ring Torus Meshes */}
        {rings.map((ring) => (
          <group key={`ring-${ring.id}`} position={[ring.x, ring.y, ring.z]}>
            <mesh>
              <torusGeometry args={[ring.radius, 0.28, 16, 40]} />
              <meshStandardMaterial
                color={ring.passed ? '#10b981' : '#f59e0b'}
                emissive={ring.passed ? '#059669' : '#d97706'}
                emissiveIntensity={0.8}
                roughness={0.2}
                metalness={0.7}
              />
            </mesh>
          </group>
        ))}

        {/* Asteroid Meshes */}
        {course.asteroids.map((ast) => (
          <mesh
            key={`ast-${ast.id}`}
            position={[ast.x, ast.y, ast.z]}
            rotation={[ast.id, ast.id * 2, 0]}
          >
            <dodecahedronGeometry args={[ast.radius, 0]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} metalness={0.2} />
          </mesh>
        ))}
      </Canvas>

      {/* Boost Button for Mobile */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            touchInput.current.boost = true;
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            touchInput.current.boost = false;
          }}
          className="rounded-2xl border border-primary/40 bg-primary/20 px-5 py-3 text-sm font-bold text-primary backdrop-blur active:bg-primary active:text-primary-foreground"
        >
          BOOST 🚀
        </button>
      </div>

      {/* On-screen control helper hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-secondary/80 backdrop-blur border border-border text-xs text-secondary-foreground pointer-events-none text-center">
        WASD / 방향키 / 화면 드래그로 조종 · 스페이스바로 부스트 가속!
      </div>
    </div>
  );
}
