"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PinballGameState } from "../../lib/games/space-pinball";
import { TABLE_WIDTH, TABLE_LENGTH } from "../../lib/games/space-pinball";

interface Props {
  gameState: PinballGameState;
}

export default function SpacePinballScene({ gameState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.035);

    const baseCamPos = new THREE.Vector3(0, 11.2, 8.8);
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0, 0.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 16, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Dynamic accent point lights
    const cyanLight = new THREE.PointLight(0x38bdf8, 2.5, 14);
    cyanLight.position.set(-2, 3, -3);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 14);
    purpleLight.position.set(2, 3, -1);
    scene.add(purpleLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 2.2, 12);
    goldLight.position.set(0, 2.5, 4);
    scene.add(goldLight);

    // 3. Playfield Table & Cyberpunk Circuit Artwork
    const tableGeo = new THREE.BoxGeometry(TABLE_WIDTH, 0.4, TABLE_LENGTH);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.7,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // Grid pattern
    const gridHelper = new THREE.GridHelper(TABLE_LENGTH, 18, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Center holographic ring decal
    const ringGeo = new THREE.RingGeometry(1.6, 1.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, 0.02, 0);
    scene.add(ringMesh);

    // Rails / Boundaries
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.2,
    });
    const neonRailMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3,
    });

    // Left outer rail
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, TABLE_LENGTH), railMat);
    leftRail.position.set(-TABLE_WIDTH / 2 - 0.15, 0.4, 0);
    scene.add(leftRail);

    // Right outer rail
    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, TABLE_LENGTH), railMat);
    rightRail.position.set(TABLE_WIDTH / 2 + 0.15, 0.4, 0);
    scene.add(rightRail);

    // Top arch rail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH + 0.6, 0.8, 0.3), neonRailMat);
    topRail.position.set(0, 0.4, -TABLE_LENGTH / 2 - 0.15);
    scene.add(topRail);

    // Plunger Divider Wall (x = 2.85, z = -3.8 to 5.8)
    const dividerLen = 9.6;
    const dividerWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, dividerLen), neonRailMat);
    dividerWall.position.set(2.85, 0.35, 1.0);
    dividerWall.castShadow = true;
    scene.add(dividerWall);

    // 4. Plunger 3D Mesh & Spring Assembly
    const plungerGroup = new THREE.Group();
    plungerGroup.position.set(3.4, 0.15, 6.2);

    const plungerRodGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 16);
    const plungerRodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const plungerRod = new THREE.Mesh(plungerRodGeo, plungerRodMat);
    plungerRod.rotation.x = Math.PI / 2;
    plungerGroup.add(plungerRod);

    const plungerKnobGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const plungerKnobMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.4, roughness: 0.2 });
    const plungerKnob = new THREE.Mesh(plungerKnobGeo, plungerKnobMat);
    plungerKnob.position.z = 0.8;
    plungerGroup.add(plungerKnob);

    const springGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 24);
    const springMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(springGeo, springMat);
      ring.position.z = -0.3 + i * 0.2;
      plungerGroup.add(ring);
    }
    scene.add(plungerGroup);

    // 5. Ball & High-Tech Trail
    const ballGeo = new THREE.SphereGeometry(stateRef.current.ball.radius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.02,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.y = stateRef.current.ball.radius;
    scene.add(ballMesh);

    // Trail particle spheres (8 segments)
    const trailCount = 8;
    const trailMeshes: THREE.Mesh[] = [];
    const trailGeo = new THREE.SphereGeometry(0.09, 12, 12);
    for (let i = 0; i < trailCount; i++) {
      const alpha = 1 - i / trailCount;
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: alpha * 0.5,
      });
      const tMesh = new THREE.Mesh(trailGeo, trailMat);
      tMesh.visible = false;
      scene.add(tMesh);
      trailMeshes.push(tMesh);
    }
    const trailPositions: THREE.Vector3[] = Array.from({ length: trailCount }, () => new THREE.Vector3());

    // 6. Flippers
    const createFlipperMesh = (side: "left" | "right") => {
      const group = new THREE.Group();
      // Main blade
      const flipperGeo = new THREE.BoxGeometry(1.4, 0.32, 0.26);
      const flipperMat = new THREE.MeshStandardMaterial({
        color: side === "left" ? 0xf43f5e : 0x06b6d4,
        roughness: 0.2,
        metalness: 0.5,
        emissive: side === "left" ? 0xbe123c : 0x0e7490,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(flipperGeo, flipperMat);
      mesh.position.x = side === "left" ? 0.7 : -0.7;
      mesh.castShadow = true;
      group.add(mesh);

      // Flipper Rubber top strip
      const stripGeo = new THREE.BoxGeometry(1.4, 0.08, 0.28);
      const stripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(side === "left" ? 0.7 : -0.7, 0.16, 0);
      group.add(strip);

      return group;
    };

    const leftFlipperGroup = createFlipperMesh("left");
    leftFlipperGroup.position.set(stateRef.current.leftFlipper.pivotX, 0.16, stateRef.current.leftFlipper.pivotZ);
    scene.add(leftFlipperGroup);

    const rightFlipperGroup = createFlipperMesh("right");
    rightFlipperGroup.position.set(stateRef.current.rightFlipper.pivotX, 0.16, stateRef.current.rightFlipper.pivotZ);
    scene.add(rightFlipperGroup);

    // 7. Bumpers (3 Tiers with Shockwave Rings)
    const bumperData = stateRef.current.bumpers.map((b) => {
      const group = new THREE.Group();
      group.position.set(b.x, 0, b.z);

      // Metallic Chrome Base
      const baseGeo = new THREE.CylinderGeometry(b.radius * 0.85, b.radius, 0.25, 28);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.15 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.125;
      group.add(base);

      // Outer Glow Rim
      const rimGeo = new THREE.TorusGeometry(b.radius * 0.92, 0.06, 12, 28);
      const rimColor = b.tier === 3 ? 0xf59e0b : b.tier === 2 ? 0xa855f7 : 0x06b6d4;
      const rimMat = new THREE.MeshStandardMaterial({
        color: rimColor,
        emissive: rimColor,
        emissiveIntensity: 0.7,
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.26;
      group.add(rim);

      // Glowing Center Cap
      const capGeo = new THREE.CylinderGeometry(b.radius * 0.75, b.radius * 0.8, 0.16, 28);
      const capMat = new THREE.MeshStandardMaterial({
        color: rimColor,
        emissive: rimColor,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.34;
      group.add(cap);

      // Shockwave Ring (expands on hit)
      const shockGeo = new THREE.RingGeometry(b.radius * 0.9, b.radius * 1.1, 24);
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const shockMesh = new THREE.Mesh(shockGeo, shockMat);
      shockMesh.rotation.x = -Math.PI / 2;
      shockMesh.position.y = 0.02;
      group.add(shockMesh);

      scene.add(group);
      return { id: b.id, capMat, rimMat, shockMesh, shockScale: 1, baseColor: rimColor };
    });

    // 8. Slingshots 3D Meshes
    const slingshotData = stateRef.current.slingshots.map((sling) => {
      const group = new THREE.Group();

      const postMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
      const createPost = (pt: { x: number; z: number }) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 12), postMat);
        post.position.set(pt.x, 0.225, pt.z);
        return post;
      };
      group.add(createPost(sling.p1));
      group.add(createPost(sling.p2));
      group.add(createPost(sling.p3));

      // Angled Rubber Band
      const bandColor = sling.side === "left" ? 0xf43f5e : 0x06b6d4;
      const bandMat = new THREE.MeshStandardMaterial({
        color: bandColor,
        emissive: bandColor,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      });

      const dx = sling.p3.x - sling.p1.x;
      const dz = sling.p3.z - sling.p1.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const bandMesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 0.08), bandMat);
      bandMesh.position.set((sling.p1.x + sling.p3.x) / 2, 0.2, (sling.p1.z + sling.p3.z) / 2);
      bandMesh.rotation.y = -angle;
      group.add(bandMesh);

      scene.add(group);
      return { id: sling.id, bandMat, baseColor: bandColor };
    });

    // 9. Rollover Lanes 3D Meshes
    const laneData = stateRef.current.rolloverLanes.map((lane) => {
      const group = new THREE.Group();
      group.position.set(lane.x, 0.02, lane.z);

      // Neon Guide Arrow / Chevron
      const chevronGeo = new THREE.ConeGeometry(0.24, 0.45, 3);
      const chevronMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x0284c7,
        emissiveIntensity: 0.2,
      });
      const chevron = new THREE.Mesh(chevronGeo, chevronMat);
      chevron.rotation.x = Math.PI / 2;
      chevron.rotation.y = Math.PI;
      group.add(chevron);

      // Arch guide rails on sides
      const archMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      const archL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.8), archMat);
      archL.position.set(-lane.width / 2, 0.15, 0);
      group.add(archL);
      const archR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.8), archMat);
      archR.position.set(lane.width / 2, 0.15, 0);
      group.add(archR);

      scene.add(group);
      return { id: lane.id, chevronMat };
    });

    // 10. Background Starfield Nebula Particles
    const starCount = 200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 44;
      starPos[i * 3 + 1] = Math.random() * 24 + 4;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.1, transparent: true, opacity: 0.8 });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animId: number;
    let trailIndex = 0;
    let clock = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.016;
      const cur = stateRef.current;

      // 1. Camera Shake
      const shakeAmt = cur.cameraShake;
      camera.position.x = baseCamPos.x + (Math.random() - 0.5) * shakeAmt * 0.45;
      camera.position.y = baseCamPos.y + (Math.random() - 0.5) * shakeAmt * 0.45;
      camera.position.z = baseCamPos.z + (Math.random() - 0.5) * shakeAmt * 0.3;

      // 2. Ball position & trail
      ballMesh.position.x = cur.ball.x;
      ballMesh.position.z = cur.ball.z;
      ballMesh.visible = cur.ball.active;

      if (cur.ball.active) {
        trailPositions[trailIndex % trailCount].copy(ballMesh.position);
        trailIndex++;

        const ballSpeed = Math.sqrt(cur.ball.vx * cur.ball.vx + cur.ball.vz * cur.ball.vz);
        const showTrail = ballSpeed > 8;

        for (let i = 0; i < trailCount; i++) {
          const tm = trailMeshes[i];
          const posIdx = (trailIndex - 1 - i + trailCount) % trailCount;
          tm.position.copy(trailPositions[posIdx]);
          tm.visible = showTrail;
        }
      } else {
        trailMeshes.forEach((tm) => (tm.visible = false));
      }

      // 3. Flippers rotation
      leftFlipperGroup.rotation.y = -cur.leftFlipper.currentAngle;
      rightFlipperGroup.rotation.y = -(cur.rightFlipper.currentAngle - Math.PI);

      // 4. Plunger compression
      if (cur.status === "idle") {
        plungerGroup.position.z = 6.2 + cur.plungerCharge * 0.5;
      } else {
        plungerGroup.position.z = 6.2;
      }

      // 5. Bumpers visual flash & shockwave
      cur.bumpers.forEach((b, idx) => {
        const bm = bumperData[idx];
        if (bm) {
          if (b.hitTimer > 0) {
            bm.capMat.emissiveIntensity = 2.2;
            bm.capMat.color.setHex(0xfef08a);
            bm.rimMat.emissiveIntensity = 2.0;

            // Expand shockwave
            bm.shockMesh.material.opacity = Math.min(0.8, b.hitTimer * 3);
            bm.shockMesh.scale.setScalar(1 + (0.25 - b.hitTimer) * 4);
          } else {
            bm.capMat.emissiveIntensity = 0.4;
            bm.capMat.color.setHex(bm.baseColor);
            bm.rimMat.emissiveIntensity = 0.6;
            bm.shockMesh.material.opacity = 0;
            bm.shockMesh.scale.setScalar(1);
          }
        }
      });

      // 6. Slingshots visual flash
      cur.slingshots.forEach((s, idx) => {
        const sm = slingshotData[idx];
        if (sm) {
          if (s.hitTimer > 0) {
            sm.bandMat.emissiveIntensity = 2.0;
            sm.bandMat.color.setHex(0xfef08a);
          } else {
            sm.bandMat.emissiveIntensity = 0.4;
            sm.bandMat.color.setHex(sm.baseColor);
          }
        }
      });

      // 7. Rollover lanes glowing
      cur.rolloverLanes.forEach((l, idx) => {
        const lm = laneData[idx];
        if (lm) {
          if (l.lit) {
            lm.chevronMat.emissive.setHex(0x10b981);
            lm.chevronMat.emissiveIntensity = 1.6;
            lm.chevronMat.color.setHex(0x34d399);
          } else {
            lm.chevronMat.emissive.setHex(0x0284c7);
            lm.chevronMat.emissiveIntensity = 0.2;
            lm.chevronMat.color.setHex(0x334155);
          }
        }
      });

      // 8. Slowly drift stars
      starPoints.rotation.y = clock * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
