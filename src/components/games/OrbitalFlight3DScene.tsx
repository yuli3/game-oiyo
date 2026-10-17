import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitalFlightState } from '../../lib/games/orbital-flight';

interface OrbitalFlight3DSceneProps {
  state: OrbitalFlightState;
}

export default function OrbitalFlight3DScene({ state }: OrbitalFlight3DSceneProps) {
  const shipRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  useFrame((stateThree, delta) => {
    // Rotate central planet
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.08;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.04;
    }

    // Position ship and smooth camera follow
    if (shipRef.current) {
      shipRef.current.position.set(state.ship.x, state.ship.y, state.ship.z);
      shipRef.current.rotation.x = state.ship.pitch;
      shipRef.current.rotation.y = state.ship.yaw;
      shipRef.current.rotation.z = state.ship.roll;

      // Position camera behind and slightly above the ship
      const forwardX = Math.cos(state.ship.yaw) * Math.cos(state.ship.pitch);
      const forwardY = Math.sin(state.ship.pitch);
      const forwardZ = Math.sin(state.ship.yaw) * Math.cos(state.ship.pitch);

      const camDist = 12;
      const camElev = 4;
      const targetCamX = state.ship.x - forwardX * camDist;
      const targetCamY = state.ship.y - forwardY * camDist + camElev;
      const targetCamZ = state.ship.z - forwardZ * camDist;

      stateThree.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
      stateThree.camera.lookAt(state.ship.x + forwardX * 10, state.ship.y + forwardY * 10, state.ship.z + forwardZ * 10);
    }
  });

  return (
    <>
      <color attach="background" args={["#030712"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 50, 50]} intensity={1.8} color="#ffffff" />
      <pointLight position={[0, 0, 0]} intensity={1.0} color="#38bdf8" distance={150} />

      {/* Central Planet */}
      <mesh ref={planetRef} position={[0, 0, 0]}>
        <sphereGeometry args={[state.planetRadius, 48, 48]} />
        <meshStandardMaterial
          color="#0369a1"
          roughness={0.7}
          metalness={0.1}
          emissive="#082f49"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Atmosphere Glow */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]}>
        <sphereGeometry args={[state.planetRadius + 1.5, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.22}
          wireframe={true}
        />
      </mesh>

      {/* Player Spaceship */}
      <group ref={shipRef}>
        {/* Fuselage */}
        <mesh position={[0, 0, 0]}>
          <coneGeometry args={[0.9, 3.2, 5]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Cockpit Canopy */}
        <mesh position={[0, 0.4, 0.4]}>
          <boxGeometry args={[0.6, 0.4, 1.2]} />
          <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Delta Wings */}
        <mesh position={[0, -0.2, -0.6]} rotation={[0, 0, 0]}>
          <boxGeometry args={[3.2, 0.1, 1.4]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Thruster Engine Glow */}
        <mesh position={[0, 0, -1.8]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Orbital Gates */}
      {state.gates.map((gate) => (
        <group key={gate.id} position={[gate.x, gate.y, gate.z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[gate.radius, 0.35, 16, 32]} />
            <meshStandardMaterial
              color={gate.passed ? "#10b981" : "#06b6d4"}
              emissive={gate.passed ? "#059669" : "#0891b2"}
              emissiveIntensity={gate.passed ? 0.8 : 1.2}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Floating Orbital Debris & Asteroids */}
      {state.debris.map((deb) => (
        <mesh key={deb.id} position={[deb.x, deb.y, deb.z]}>
          <dodecahedronGeometry args={[deb.radius, 1]} />
          <meshStandardMaterial
            color="#64748b"
            roughness={0.9}
            metalness={0.2}
          />
        </mesh>
      ))}
    </>
  );
}
