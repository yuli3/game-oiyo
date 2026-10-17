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
    scene.background = new THREE.Color(0x050714);
    scene.fog = new THREE.FogExp2(0x050714, 0.04);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 11, 8.5);
    camera.lookAt(0, 0, 0.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(4, 15, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Neon accent lights
    const cyanLight = new THREE.PointLight(0x38bdf8, 2, 12);
    cyanLight.position.set(0, 3, -3);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2, 12);
    purpleLight.position.set(0, 2, 3);
    scene.add(purpleLight);

    // 3. Playfield Table
    const tableGeo = new THREE.BoxGeometry(TABLE_WIDTH, 0.4, TABLE_LENGTH);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.6,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // Grid grid lines on playfield
    const gridHelper = new THREE.GridHelper(TABLE_LENGTH, 14, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Rails / Boundaries
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2,
    });
    // Left rail
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, TABLE_LENGTH), railMat);
    leftRail.position.set(-TABLE_WIDTH / 2 - 0.15, 0.4, 0);
    scene.add(leftRail);
    // Right rail
    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, TABLE_LENGTH), railMat);
    rightRail.position.set(TABLE_WIDTH / 2 + 0.15, 0.4, 0);
    scene.add(rightRail);
    // Top rail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH + 0.6, 0.8, 0.3), railMat);
    topRail.position.set(0, 0.4, -TABLE_LENGTH / 2 - 0.15);
    scene.add(topRail);

    // 4. Ball
    const ballGeo = new THREE.SphereGeometry(stateRef.current.ball.radius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.05,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.y = stateRef.current.ball.radius;
    scene.add(ballMesh);

    // 5. Flippers
    const createFlipperMesh = (side: "left" | "right") => {
      const group = new THREE.Group();
      const flipperGeo = new THREE.BoxGeometry(1.4, 0.3, 0.25);
      const flipperMat = new THREE.MeshStandardMaterial({
        color: side === "left" ? 0xf43f5e : 0x06b6d4,
        roughness: 0.3,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(flipperGeo, flipperMat);
      // Offset mesh so pivot is at one end
      mesh.position.x = side === "left" ? 0.7 : -0.7;
      mesh.castShadow = true;
      group.add(mesh);
      return group;
    };

    const leftFlipperGroup = createFlipperMesh("left");
    leftFlipperGroup.position.set(
      stateRef.current.leftFlipper.pivotX,
      0.15,
      stateRef.current.leftFlipper.pivotZ
    );
    scene.add(leftFlipperGroup);

    const rightFlipperGroup = createFlipperMesh("right");
    rightFlipperGroup.position.set(
      stateRef.current.rightFlipper.pivotX,
      0.15,
      stateRef.current.rightFlipper.pivotZ
    );
    scene.add(rightFlipperGroup);

    // 6. Bumpers
    const bumperMeshes = stateRef.current.bumpers.map((b) => {
      const group = new THREE.Group();
      group.position.set(b.x, 0, b.z);

      // Base
      const baseGeo = new THREE.CylinderGeometry(b.radius * 0.85, b.radius, 0.25, 24);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.125;
      group.add(base);

      // Glowing Cap
      const capGeo = new THREE.CylinderGeometry(b.radius, b.radius * 0.9, 0.15, 24);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.32;
      group.add(cap);

      scene.add(group);
      return { id: b.id, capMat, baseMat };
    });

    // 7. Background Star particles
    const starCount = 120;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 40;
      starPos[i * 3 + 1] = Math.random() * 20 + 5;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.08 });
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
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const cur = stateRef.current;

      // Update ball position
      ballMesh.position.x = cur.ball.x;
      ballMesh.position.z = cur.ball.z;
      ballMesh.visible = cur.ball.active;

      // Update flippers
      leftFlipperGroup.rotation.y = -cur.leftFlipper.currentAngle;
      rightFlipperGroup.rotation.y = -(cur.rightFlipper.currentAngle - Math.PI);

      // Update bumpers glow
      cur.bumpers.forEach((b, idx) => {
        const bm = bumperMeshes[idx];
        if (bm) {
          if (b.hitTimer > 0) {
            bm.capMat.emissiveIntensity = 1.8;
            bm.capMat.color.setHex(0xfef08a);
          } else {
            bm.capMat.emissiveIntensity = 0.4;
            bm.capMat.color.setHex(0x38bdf8);
          }
        }
      });

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
