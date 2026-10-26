import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  PaperPlaneState,
  FlightCourse,
} from '../../lib/games/paper-flight-3d';
import { SpringCamera } from '../../lib/games/spring-camera';

interface PaperFlight3DSceneProps {
  plane: PaperPlaneState;
  course: FlightCourse;
  cameraController: SpringCamera;
}

/**
 * Procedural low-poly origami paper airplane geometry
 */
function PaperAirplaneModel({ plane }: { plane: PaperPlaneState }) {
  const groupRef = useRef<THREE.Group>(null);

  // Folded paper plane vertices
  const planeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // Triangular dart paper airplane: Nose, Left Wingtip, Right Wingtip, Tail Spine, Keel Bottom
    // Coordinates:
    // Nose: (0, 0, -1.8)
    // Left Wing: (-1.4, 0.2, 0.8)
    // Right Wing: (1.4, 0.2, 0.8)
    // Center Spine: (0, 0.35, 0.6)
    // Keel: (0, -0.4, 0.4)
    const vertices = new Float32Array([
      // Left Upper Wing
      0, 0, -1.8,
      -1.4, 0.2, 0.8,
      0, 0.35, 0.6,

      // Right Upper Wing
      0, 0, -1.8,
      0, 0.35, 0.6,
      1.4, 0.2, 0.8,

      // Left Underside Keel
      0, 0, -1.8,
      0, -0.4, 0.4,
      -1.4, 0.2, 0.8,

      // Right Underside Keel
      0, 0, -1.8,
      1.4, 0.2, 0.8,
      0, -0.4, 0.4,

      // Center Ridge
      0, 0.35, 0.6,
      0, -0.4, 0.4,
      0, 0, -1.8,
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(plane.x, plane.y, plane.z);
      groupRef.current.rotation.x = plane.pitch;
      groupRef.current.rotation.y = plane.yaw;
      groupRef.current.rotation.z = plane.roll;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Paper Body */}
      <mesh geometry={planeGeo}>
        <meshStandardMaterial
          color="#fdfbf7"
          roughness={0.4}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Fold Crease Highlights */}
      <mesh position={[0, 0.18, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2.0, 6]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>

      {/* Speed trails at wingtips */}
      {plane.airspeed > 22 && (
        <>
          <mesh position={[-1.4, 0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.0, 1.2, 4]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
          </mesh>
          <mesh position={[1.4, 0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.0, 1.2, 4]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
          </mesh>
        </>
      )}
    </group>
  );
}

/**
 * Rotating Golden Boost Ring
 */
function GoldenRing({ x, y, z, radius, passed }: { x: number; y: number; z: number; radius: number; passed: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current && !passed) {
      meshRef.current.rotation.z += delta * 1.5;
    }
  });

  if (passed) return null;

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <torusGeometry args={[radius, 0.25, 12, 32]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#d97706"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}

/**
 * Swirling Updraft Thermal Column
 */
function ThermalColumn({ x, z, radius, height, active }: { x: number; z: number; radius: number; height: number; active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && active) {
      groupRef.current.rotation.y += delta * 1.2;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={[x, height / 2, z]}>
      {/* Semi-transparent air updraft cylinder */}
      <mesh>
        <cylinderGeometry args={[radius, radius * 0.75, height, 16, 1, true]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>

      {/* Floating spiral swirl rings */}
      <mesh position={[0, -height * 0.25, 0]}>
        <torusGeometry args={[radius * 0.8, 0.12, 8, 24]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, height * 0.25, 0]}>
        <torusGeometry args={[radius * 0.9, 0.12, 8, 24]} />
        <meshBasicMaterial color="#bae6fd" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/**
 * Collectible Origami Crane
 */
function CraneItem({ x, y, z, collected }: { x: number; y: number; z: number; collected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y += delta * 2.0;
      meshRef.current.position.y = y + Math.sin(Date.now() * 0.003 + x) * 0.4;
    }
  });

  if (collected) return null;

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <octahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial
        color="#f59e0b"
        emissive="#b45309"
        emissiveIntensity={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

/**
 * Procedural Endless Ground & Landmarks
 */
function Scenery({ planeZ }: { planeZ: number }) {
  // Center terrain grid around current plane position along Z
  const terrainCenterZ = Math.floor(planeZ / 100) * 100;

  return (
    <group>
      {/* Infinite Ground Plane */}
      <mesh position={[0, -0.05, terrainCenterZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[300, 600, 20, 40]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Ground Grid Lines */}
      <gridHelper
        args={[300, 30, '#38bdf8', '#334155']}
        position={[0, 0.05, terrainCenterZ]}
      />
    </group>
  );
}

export default function PaperFlight3DScene({
  plane,
  course,
  cameraController,
}: PaperFlight3DSceneProps) {
  // Step camera controller on each frame
  useFrame((stateThree, delta) => {
    cameraController.update(delta, {
      position: { x: plane.x, y: plane.y, z: plane.z },
      velocity: { x: plane.vx, y: plane.vy, z: plane.vz },
      yaw: plane.yaw,
      pitch: plane.pitch,
      roll: plane.roll,
      speed: plane.airspeed,
    });

    stateThree.camera.position.set(
      cameraController.position.x,
      cameraController.position.y,
      cameraController.position.z,
    );
    stateThree.camera.lookAt(
      cameraController.lookAt.x,
      cameraController.lookAt.y,
      cameraController.lookAt.z,
    );

    if (stateThree.camera instanceof THREE.PerspectiveCamera) {
      stateThree.camera.fov = cameraController.currentFov;
      stateThree.camera.updateProjectionMatrix();
    }
  });

  // Filter nearby rings, thermals, and cranes (within 400m of plane) for optimal rendering
  const activeRings = useMemo(() => {
    return course.rings.filter(
      (r) => !r.passed && Math.abs(r.z - plane.z) < 320,
    );
  }, [course.rings, plane.z]);

  const activeThermals = useMemo(() => {
    return course.thermals.filter(
      (t) => t.active && Math.abs(t.z - plane.z) < 360,
    );
  }, [course.thermals, plane.z]);

  const activeCranes = useMemo(() => {
    return course.cranes.filter(
      (c) => !c.collected && Math.abs(c.z - plane.z) < 280,
    );
  }, [course.cranes, plane.z]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[20, 50, -20]}
        intensity={1.2}
        castShadow={false}
      />
      <directionalLight position={[-20, 20, 20]} intensity={0.4} />

      {/* Scenery & Ground */}
      <Scenery planeZ={plane.z} />

      {/* Airplane Model */}
      <PaperAirplaneModel plane={plane} />

      {/* Boost Rings */}
      {activeRings.map((ring) => (
        <GoldenRing
          key={ring.id}
          x={ring.x}
          y={ring.y}
          z={ring.z}
          radius={ring.radius}
          passed={ring.passed}
        />
      ))}

      {/* Thermal Updrafts */}
      {activeThermals.map((thermal) => (
        <ThermalColumn
          key={thermal.id}
          x={thermal.x}
          z={thermal.z}
          radius={thermal.radius}
          height={thermal.height}
          active={thermal.active}
        />
      ))}

      {/* Collectible Origami Cranes */}
      {activeCranes.map((crane) => (
        <CraneItem
          key={crane.id}
          x={crane.x}
          y={crane.y}
          z={crane.z}
          collected={crane.collected}
        />
      ))}
    </>
  );
}
