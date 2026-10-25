import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  type TrackDefinition,
  type CarPhysicsState,
  sampleGhostFrame,
  type GhostFrame,
} from "../../lib/games/cyber-track";

interface CyberTrack3DSceneProps {
  track: TrackDefinition;
  car: CarPhysicsState;
  ghostFrames: GhostFrame[];
}

export default function CyberTrack3DScene({ track, car, ghostFrames }: CyberTrack3DSceneProps) {
  const playerCarGroup = useRef<THREE.Group>(null);
  const ghostCarGroup = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);

  // Track Road Ribbon Mesh Geometry
  const roadGeometry = useMemo(() => {
    const pts = track.waypoints.map((p) => new THREE.Vector3(p.x, p.y + 0.05, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, true);
    // Road width 12 units
    return new THREE.TubeGeometry(curve, 100, 5, 8, true);
  }, [track.waypoints]);

  // Ambient Low-Poly Scenery trees / barriers
  const sceneryProps = useMemo(() => {
    const items: Array<{ x: number; z: number; scale: number; color: string }> = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const dist = 70 + (i % 5) * 15;
      items.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        scale: 2 + (i % 3) * 1.5,
        color: i % 2 === 0 ? "#10b981" : "#059669",
      });
    }
    return items;
  }, []);

  useFrame((stateThree, delta) => {
    // 1. Position player car
    if (playerCarGroup.current) {
      playerCarGroup.current.position.set(car.x, car.y + 0.4, car.z);
      // Yaw rotation (angle)
      playerCarGroup.current.rotation.y = car.angle;
      // Slight roll/tilt when steering or drifting
      const targetRoll = -car.steerAngle * 0.15;
      playerCarGroup.current.rotation.z = THREE.MathUtils.lerp(
        playerCarGroup.current.rotation.z,
        targetRoll,
        delta * 10
      );

      // Rotate wheels forward based on speed
      const wheelRoll = (car.speed / 3.6) * delta * 12;
      for (const w of wheelsRef.current) {
        if (w) w.rotation.x += wheelRoll;
      }
    }

    // 2. Position Ghost Car
    if (ghostCarGroup.current && ghostFrames.length > 0 && car.status === "racing") {
      const sample = sampleGhostFrame(ghostFrames, car.lapTimeMs);
      if (sample) {
        ghostCarGroup.current.visible = true;
        ghostCarGroup.current.position.set(sample.x, sample.y + 0.4, sample.z);
        ghostCarGroup.current.rotation.y = sample.angle;
      } else {
        ghostCarGroup.current.visible = false;
      }
    } else if (ghostCarGroup.current) {
      ghostCarGroup.current.visible = false;
    }

    // 3. Smooth Third-person Chase Camera
    const camera = stateThree.camera;
    const chaseDist = 8.5;
    const chaseHeight = 4.0;

    const camTargetX = car.x - Math.sin(car.angle) * chaseDist;
    const camTargetZ = car.z - Math.cos(car.angle) * chaseDist;
    const camTargetY = car.y + chaseHeight;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, camTargetX, delta * 7);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, camTargetY, delta * 7);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, camTargetZ, delta * 7);

    // Look slightly ahead of the car
    const lookAheadDist = 4.0;
    const lookTarget = new THREE.Vector3(
      car.x + Math.sin(car.angle) * lookAheadDist,
      car.y + 1.2,
      car.z + Math.cos(car.angle) * lookAheadDist
    );
    camera.lookAt(lookTarget);

    // Dynamic FOV speed warp
    if (camera instanceof THREE.PerspectiveCamera) {
      const speedRatio = Math.min(1.0, Math.abs(car.speed) / 160);
      const targetFov = 60 + speedRatio * 18;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 6);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[50, 80, 40]} intensity={1.5} castShadow />
      <hemisphereLight args={["#87ceeb", "#334155", 0.6]} />

      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Grid Floor Overlay */}
      <gridHelper args={[600, 120, "#334155", "#1e293b"]} position={[0, 0, 0]} />

      {/* Road Mesh */}
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      {/* Checkpoint Gates */}
      {track.checkpoints.map((cp, idx) => {
        const isCurrent = idx === car.currentCheckpointIdx;
        const color = cp.isFinish ? "#fbbf24" : isCurrent ? "#38bdf8" : "#475569";
        return (
          <group key={cp.id} position={[cp.x, 0, cp.z]}>
            {/* Gate Post Left */}
            <mesh position={[-6, 3, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 6, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isCurrent ? 0.6 : 0.1} />
            </mesh>
            {/* Gate Post Right */}
            <mesh position={[6, 3, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 6, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isCurrent ? 0.6 : 0.1} />
            </mesh>
            {/* Arch Top */}
            <mesh position={[0, 6, 0]}>
              <boxGeometry args={[12.8, 0.6, 0.6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isCurrent ? 0.8 : 0.2} />
            </mesh>
          </group>
        );
      })}

      {/* Low-Poly Trees / Decor */}
      {sceneryProps.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, tree.scale, 0]}>
            <coneGeometry args={[tree.scale * 0.8, tree.scale * 2, 5]} />
            <meshStandardMaterial color={tree.color} flatShading />
          </mesh>
          <mesh position={[0, tree.scale * 0.4, 0]}>
            <cylinderGeometry args={[0.3, 0.4, tree.scale * 0.8, 5]} />
            <meshStandardMaterial color="#78350f" flatShading />
          </mesh>
        </group>
      ))}

      {/* Player Low-Poly Racecar */}
      <group ref={playerCarGroup}>
        {/* Main Body Chassis */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[1.8, 0.5, 3.8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.4} flatShading />
        </mesh>
        {/* Cockpit / Roof */}
        <mesh position={[0, 0.75, -0.2]}>
          <boxGeometry args={[1.3, 0.45, 1.8]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} flatShading />
        </mesh>
        {/* Rear Spoiler Wing */}
        <mesh position={[0, 0.95, -1.7]}>
          <boxGeometry args={[1.9, 0.1, 0.5]} />
          <meshStandardMaterial color="#1d4ed8" flatShading />
        </mesh>
        {/* Spoiler Mounts */}
        <mesh position={[-0.6, 0.7, -1.7]}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.6, 0.7, -1.7]}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Headlights */}
        <mesh position={[-0.6, 0.35, 1.91]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.6, 0.35, 1.91]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
        {/* Taillights */}
        <mesh position={[-0.6, 0.35, -1.91]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
        </mesh>
        <mesh position={[0.6, 0.35, -1.91]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
        </mesh>

        {/* 4 Wheels */}
        {[
          { x: -0.95, z: 1.1 },
          { x: 0.95, z: 1.1 },
          { x: -0.95, z: -1.1 },
          { x: 0.95, z: -1.1 },
        ].map((pos, wIdx) => (
          <group
            key={wIdx}
            position={[pos.x, 0.2, pos.z]}
            ref={(el) => {
              if (el) wheelsRef.current[wIdx] = el;
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.4, 0.4, 0.35, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} flatShading />
            </mesh>
          </group>
        ))}
      </group>

      {/* Ghost Low-Poly Car (Translucent Cyan Wireframe) */}
      <group ref={ghostCarGroup} visible={false}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.8, 0.5, 3.8]} />
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.35} wireframe />
        </mesh>
        <mesh position={[0, 0.75, -0.2]}>
          <boxGeometry args={[1.3, 0.45, 1.8]} />
          <meshStandardMaterial color="#22d3ee" transparent opacity={0.4} wireframe />
        </mesh>
      </group>
    </>
  );
}
