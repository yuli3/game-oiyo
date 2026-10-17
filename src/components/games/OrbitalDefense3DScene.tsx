"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type {
  OrbitalDefenseState,
  Turret,
  Enemy,
  Projectile,
} from '../../lib/games/orbital-defense';
import { PLANET_RADIUS } from '../../lib/games/orbital-defense';

interface Props {
  state: OrbitalDefenseState;
  selectedSlot: { orbitIndex: number; slotIndex: number } | null;
  selectedTurretId: string | null;
  onSelectSlot: (orbitIndex: number, slotIndex: number) => void;
  onSelectTurret: (turretId: string) => void;
}

// Glowing Core Planet
function CentralPlanet({ health, maxHealth }: { health: number; maxHealth: number }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.15;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.08;
    }
  });

  const healthRatio = Math.max(0, health / maxHealth);
  const planetColor = healthRatio > 0.5 ? '#0284c7' : healthRatio > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <group>
      {/* Central Living Planet */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[PLANET_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={planetColor}
          roughness={0.4}
          metalness={0.2}
          emissive={planetColor}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Atmospheric Cloud Glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[PLANET_RADIUS + 0.15, 32, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Concentric Orbit Lines & Slots
function OrbitRings({
  state,
  selectedSlot,
  selectedTurretId,
  onSelectSlot,
  onSelectTurret,
}: Props) {
  return (
    <group>
      {/* 3 Orbit Path Rings */}
      {[3.0, 5.0, 7.0].map((radius, idx) => {
        const ringGeo = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
        return (
          <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]}>
            <primitive object={ringGeo} />
            <meshBasicMaterial
              color="#334155"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Orbit Slots */}
      {state.slots.map((slot) => {
        const x = slot.radius * Math.cos(slot.angle);
        const z = slot.radius * Math.sin(slot.angle);
        const isSlotSelected =
          selectedSlot?.orbitIndex === slot.orbitIndex &&
          selectedSlot?.slotIndex === slot.slotIndex;
        const turret = slot.turretId
          ? state.turrets.find((t) => t.id === slot.turretId)
          : null;

        if (turret) {
          return (
            <TurretModel
              key={turret.id}
              turret={turret}
              isSelected={turret.id === selectedTurretId}
              onClick={() => onSelectTurret(turret.id)}
            />
          );
        }

        return (
          <group key={`${slot.orbitIndex}-${slot.slotIndex}`} position={[x, 0, z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectSlot(slot.orbitIndex, slot.slotIndex);
              }}
            >
              <cylinderGeometry args={[0.3, 0.35, 0.1, 16]} />
              <meshStandardMaterial
                color={isSlotSelected ? '#38bdf8' : '#1e293b'}
                emissive={isSlotSelected ? '#38bdf8' : '#0f172a'}
                emissiveIntensity={isSlotSelected ? 0.8 : 0.1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// 3D Turret Model
function TurretModel({
  turret,
  isSelected,
  onClick,
}: {
  turret: Turret;
  isSelected: boolean;
  onClick: () => void;
}) {
  const x = turret.radius * Math.cos(turret.angle);
  const z = turret.radius * Math.sin(turret.angle);

  const color =
    turret.type === 'laser'
      ? '#38bdf8'
      : turret.type === 'plasma'
      ? '#a855f7'
      : '#f59e0b';

  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Base Platform */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.16, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main Turret Body */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.7 : 0.25}
          metalness={0.5}
        />
      </mesh>

      {/* Gun Barrel */}
      <mesh position={[0, 0.35, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>

      {/* Selection Halo */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.58, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Level Badge */}
      {turret.level > 1 && (
        <Html distanceFactor={12} position={[0, 0.7, 0]} center>
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">
            Lv.{turret.level}
          </span>
        </Html>
      )}
    </group>
  );
}

// Enemy Ship Model
function EnemyShip({ enemy }: { enemy: Enemy }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Look toward origin (center planet)
      meshRef.current.lookAt(0, 0, 0);
    }
  });

  const shipColor =
    enemy.type === 'dreadnought'
      ? '#dc2626'
      : enemy.type === 'cruiser'
      ? '#f97316'
      : '#e11d48';

  const hpRatio = Math.max(0.001, enemy.hp / enemy.maxHp);

  return (
    <group ref={meshRef} position={[enemy.x, enemy.y, enemy.z]}>
      {enemy.type === 'dreadnought' ? (
        <mesh>
          <octahedronGeometry args={[enemy.radius]} />
          <meshStandardMaterial color={shipColor} metalness={0.8} roughness={0.2} />
        </mesh>
      ) : enemy.type === 'cruiser' ? (
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[enemy.radius, enemy.radius * 2.2, 5]} />
          <meshStandardMaterial color={shipColor} metalness={0.5} roughness={0.3} />
        </mesh>
      ) : (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <tetrahedronGeometry args={[enemy.radius]} />
          <meshStandardMaterial color={shipColor} metalness={0.3} roughness={0.4} />
        </mesh>
      )}

      {/* 3D Health Bar */}
      <group position={[0, enemy.radius + 0.35, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.08, 0.04]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-0.4 + (0.8 * hpRatio) / 2, 0, 0.01]} scale={[hpRatio, 1, 1]}>
          <boxGeometry args={[0.8, 0.08, 0.04]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>
    </group>
  );
}

// Projectile Laser / Bolt
function ProjectileMesh({ p }: { p: Projectile }) {
  return (
    <mesh position={[p.x, p.y, p.z]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshBasicMaterial color={p.color} />
    </mesh>
  );
}

// Background Starfield
function Starfield() {
  const count = 500;
  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 25 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return [pos];
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#94a3b8" transparent opacity={0.6} />
    </points>
  );
}

export function OrbitalDefense3DScene(props: Props) {
  return (
    <div className="relative h-155 w-full overflow-hidden rounded-2xl border border-border bg-slate-950 shadow-inner">
      <Canvas
        camera={{ position: [0, 11, 13], fov: 45 }}
        className="h-full w-full"
      >
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <pointLight position={[0, 0, 0]} intensity={2.0} color="#38bdf8" />

        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2 - 0.05}
          dampingFactor={0.05}
        />

        <Starfield />
        <CentralPlanet
          health={props.state.planetHealth}
          maxHealth={props.state.maxPlanetHealth}
        />
        <OrbitRings {...props} />

        {/* Enemies */}
        {props.state.enemies.map((enemy) => (
          <EnemyShip key={enemy.id} enemy={enemy} />
        ))}

        {/* Projectiles */}
        {props.state.projectiles.map((p) => (
          <ProjectileMesh key={p.id} p={p} />
        ))}
      </Canvas>
    </div>
  );
}
