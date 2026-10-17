import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { type CyberHighwayState, ROAD_WIDTH, TOTAL_LANES, LANE_WIDTH } from '../../lib/games/cyber-highway';

interface CyberHighway3DSceneProps {
  state: CyberHighwayState;
}

export default function CyberHighway3DScene({ state }: CyberHighway3DSceneProps) {
  const playerCarRef = useRef<THREE.Group>(null);
  const roadGridRef = useRef<THREE.Group>(null);
  const roadOffsetRef = useRef<number>(0);
  const prevHpRef = useRef<number>(state.hp);
  const shakeRef = useRef<number>(0);

  // Generate lane dashed markers
  const laneLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 1; i < TOTAL_LANES; i++) {
      const x = -ROAD_WIDTH / 2 + i * LANE_WIDTH;
      lines.push(x);
    }
    return lines;
  }, []);

  useFrame((stateThree, delta) => {
    // Detect collision impact to trigger camera trauma
    if (state.hp < prevHpRef.current) {
      shakeRef.current = 1.0;
    }
    prevHpRef.current = state.hp;

    // Dynamic FOV speed warp
    if (stateThree.camera instanceof THREE.PerspectiveCamera) {
      const targetFov = state.isBoosting ? 72 : 60;
      stateThree.camera.fov = THREE.MathUtils.lerp(stateThree.camera.fov, targetFov, delta * 6);
      stateThree.camera.updateProjectionMatrix();
    }

    // Camera trauma shake
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta * 3.5);
      const trauma = shakeRef.current * shakeRef.current;
      stateThree.camera.position.x = (Math.random() - 0.5) * trauma * 0.6;
      stateThree.camera.position.y = 4.2 + (Math.random() - 0.5) * trauma * 0.4;
    } else {
      stateThree.camera.position.x = THREE.MathUtils.lerp(stateThree.camera.position.x, 0, delta * 8);
      stateThree.camera.position.y = 4.2;
    }

    // Scroll road texture based on current speed
    roadOffsetRef.current = (roadOffsetRef.current + state.speed * delta) % 10;
    if (roadGridRef.current) {
      roadGridRef.current.position.z = -roadOffsetRef.current;
    }

    // Smooth player vehicle tilt based on target vs current position
    if (playerCarRef.current) {
      const tilt = (state.targetLane * LANE_WIDTH - state.playerX) * -0.15;
      playerCarRef.current.rotation.z = THREE.MathUtils.lerp(playerCarRef.current.rotation.z, tilt, delta * 12);
      playerCarRef.current.rotation.y = THREE.MathUtils.lerp(playerCarRef.current.rotation.y, tilt * 0.5, delta * 12);
      playerCarRef.current.position.x = state.playerX;
    }
  });

  return (
    <>
      <color attach="background" args={["#09090f"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 20, 10]} intensity={1.2} />

      {/* Deep Cyber Highway Starfield */}
      <Stars radius={160} depth={50} count={1400} factor={4} saturation={1} fade speed={1.5} />

      {/* High-speed Neon Cyber Dust Particles rushing along the highway */}
      <Sparkles
        count={state.isBoosting ? 90 : 35}
        scale={[ROAD_WIDTH + 8, 8, 90]}
        position={[0, 3, 50]}
        size={state.isBoosting ? 4 : 2}
        speed={state.speed * 0.08}
        color={state.isBoosting ? "#38bdf8" : "#f43f5e"}
      />

      {/* Cyberpunk Synthwave Sun on the Horizon */}
      <mesh position={[0, 12, 180]}>
        <circleGeometry args={[22, 32]} />
        <meshBasicMaterial color="#f43f5e" />
      </mesh>

      {/* Horizon Grid Mountains */}
      <mesh position={[0, 2, 170]}>
        <planeGeometry args={[140, 20]} />
        <meshBasicMaterial color="#1e1136" />
      </mesh>

      {/* Road Base Surface */}
      <mesh position={[0, -0.05, 70]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH + 1.2, 220]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Road Side Neon Borders */}
      <mesh position={[-ROAD_WIDTH / 2 - 0.3, 0.1, 70]}>
        <boxGeometry args={[0.2, 0.2, 220]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 0.3, 0.1, 70]}>
        <boxGeometry args={[0.2, 0.2, 220]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* Scrolling Lane Dashed Lines */}
      <group ref={roadGridRef}>
        {laneLines.map((x) => (
          <group key={x}>
            {Array.from({ length: 24 }).map((_, idx) => (
              <mesh key={idx} position={[x, 0.02, idx * 10 - 20]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, 4.5]} />
                <meshBasicMaterial color="#e2e8f0" opacity={0.6} transparent />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Player Sports Car */}
      <group ref={playerCarRef} position={[state.playerX, 0.35, 0]}>
        {/* Main Wedge Body */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[1.5, 0.45, 3.2]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Cabin Glass */}
        <mesh position={[0, 0.45, -0.2]}>
          <boxGeometry args={[1.1, 0.35, 1.6]} />
          <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Front Headlights */}
        <mesh position={[-0.55, 0.12, 1.62]}>
          <boxGeometry args={[0.25, 0.12, 0.05]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[0.55, 0.12, 1.62]}>
          <boxGeometry args={[0.25, 0.12, 0.05]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        {/* Rear Neon Lightbar */}
        <mesh position={[0, 0.22, -1.62]}>
          <boxGeometry args={[1.3, 0.1, 0.05]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
        {/* Nitro Thruster Flame (if boosting) */}
        {state.isBoosting && (
          <group position={[0, 0.12, -2.1]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.3, 1.1, 16]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <Sparkles count={35} scale={[0.8, 0.8, 2.5]} position={[0, 0, -1.2]} size={4} speed={6} color="#38bdf8" />
          </group>
        )}
      </group>

      {/* Traffic Vehicles */}
      {state.traffic.map((v) => (
        <group key={v.id} position={[v.x, 0.4, v.z]}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[v.width, v.type === 'truck' ? 1.4 : 0.6, v.length]} />
            <meshStandardMaterial color={v.color} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Taillights facing player (since player is behind oncoming or moving traffic) */}
          <mesh position={[-v.width * 0.35, 0.1, -v.length * 0.51]}>
            <boxGeometry args={[0.2, 0.12, 0.04]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh position={[v.width * 0.35, 0.1, -v.length * 0.51]}>
            <boxGeometry args={[0.2, 0.12, 0.04]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}

      {/* Collectibles */}
      {state.collectibles.map((c) => (
        <group key={c.id} position={[c.x, 0.8, c.z]}>
          {c.type === 'nitro' && (
            <mesh rotation={[0, Date.now() * 0.003, 0]}>
              <octahedronGeometry args={[0.55]} />
              <meshBasicMaterial color="#38bdf8" wireframe />
            </mesh>
          )}
          {c.type === 'credit' && (
            <mesh rotation={[Math.PI / 2, 0, Date.now() * 0.004]}>
              <cylinderGeometry args={[0.45, 0.45, 0.12, 16]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          )}
          {c.type === 'repair' && (
            <mesh rotation={[0, Date.now() * 0.003, 0]}>
              <dodecahedronGeometry args={[0.5]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}
