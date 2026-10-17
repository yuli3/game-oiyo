"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MiniGolfState } from "../../lib/games/mini-golf";
import { COURSES } from "../../lib/games/mini-golf";

interface Props {
  gameState: MiniGolfState;
  onAimDelta?: (deltaAngle: number) => void;
}

export default function MiniGolfScene({ gameState, onAimDelta }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const onAimDeltaRef = useRef(onAimDelta);
  onAimDeltaRef.current = onAimDelta;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a192f);
    scene.fog = new THREE.FogExp2(0x0a192f, 0.035);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / (container.clientHeight || 1),
      0.1,
      100
    );
    camera.position.set(0, 12, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sunLight.position.set(8, 16, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // 3. Dynamic Course Group
    const courseGroup = new THREE.Group();
    scene.add(courseGroup);

    let currentRenderedHole = -1;

    const buildCourse = (holeIndex: number) => {
      // Clear previous course objects
      while (courseGroup.children.length > 0) {
        courseGroup.remove(courseGroup.children[0]);
      }

      const hole = COURSES[holeIndex] ?? COURSES[0];
      const { minX, maxX, minZ, maxZ } = hole.bounds;
      const width = maxX - minX;
      const length = maxZ - minZ;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Green Fairway base
      const fairwayGeo = new THREE.BoxGeometry(width, 0.4, length);
      const fairwayMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.8,
        metalness: 0.05,
      });
      const fairway = new THREE.Mesh(fairwayGeo, fairwayMat);
      fairway.position.set(centerX, -0.2, centerZ);
      fairway.receiveShadow = true;
      courseGroup.add(fairway);

      // Wooden Boundaries
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x92400e,
        roughness: 0.7,
        metalness: 0.1,
      });
      const wallThickness = 0.3;
      const wallHeight = 0.5;

      // Left Wall
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, length), wallMat);
      leftWall.position.set(minX - wallThickness / 2, wallHeight / 2 - 0.2, centerZ);
      courseGroup.add(leftWall);

      // Right Wall
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, length), wallMat);
      rightWall.position.set(maxX + wallThickness / 2, wallHeight / 2 - 0.2, centerZ);
      courseGroup.add(rightWall);

      // Top Wall
      const topWall = new THREE.Mesh(new THREE.BoxGeometry(width + wallThickness * 2, wallHeight, wallThickness), wallMat);
      topWall.position.set(centerX, wallHeight / 2 - 0.2, minZ - wallThickness / 2);
      courseGroup.add(topWall);

      // Bottom Wall
      const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(width + wallThickness * 2, wallHeight, wallThickness), wallMat);
      bottomWall.position.set(centerX, wallHeight / 2 - 0.2, maxZ + wallThickness / 2);
      courseGroup.add(bottomWall);

      // Special Tiles (Sand, Water, Walls)
      hole.tiles.forEach((tile) => {
        if (tile.type === "sand") {
          const sandGeo = new THREE.BoxGeometry(1.8, 0.42, 1.8);
          const sandMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.95 });
          const sand = new THREE.Mesh(sandGeo, sandMat);
          sand.position.set(tile.x, -0.19, tile.z);
          sand.receiveShadow = true;
          courseGroup.add(sand);
        } else if (tile.type === "water") {
          const waterGeo = new THREE.BoxGeometry(2.0, 0.38, 2.0);
          const waterMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
          });
          const water = new THREE.Mesh(waterGeo, waterMat);
          water.position.set(tile.x, -0.21, tile.z);
          courseGroup.add(water);
        } else if (tile.type === "wall") {
          const obstGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
          const obstMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
          const obst = new THREE.Mesh(obstGeo, obstMat);
          obst.position.set(tile.x, 0.1, tile.z);
          obst.castShadow = true;
          obst.receiveShadow = true;
          courseGroup.add(obst);
        }
      });

      // Hole Cup
      const holeCupGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);
      const holeCupMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
      const holeCup = new THREE.Mesh(holeCupGeo, holeCupMat);
      holeCup.position.set(hole.holePos.x, 0.01, hole.holePos.z);
      courseGroup.add(holeCup);

      // Flag Pole
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 12);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(hole.holePos.x, 1.1, hole.holePos.z);
      courseGroup.add(pole);

      // Flag Cloth
      const flagGeo = new THREE.BufferGeometry();
      const flagVerts = new Float32Array([
        0, 0, 0,
        0.65, -0.2, 0,
        0, -0.4, 0,
      ]);
      flagGeo.setAttribute("position", new THREE.BufferAttribute(flagVerts, 3));
      const flagMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(hole.holePos.x, 2.1, hole.holePos.z);
      courseGroup.add(flag);
    };

    buildCourse(stateRef.current.currentHoleIndex);
    currentRenderedHole = stateRef.current.currentHoleIndex;

    // 4. Golf Ball
    const ballGeo = new THREE.SphereGeometry(stateRef.current.ball.radius, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // 5. Aim Trajectory Line
    const trajectoryPoints = [new THREE.Vector3(), new THREE.Vector3()];
    const trajectoryGeo = new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
    const trajectoryMat = new THREE.LineDashedMaterial({
      color: 0xfacc15,
      dashSize: 0.2,
      gapSize: 0.1,
    });
    const trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
    trajectoryLine.computeLineDistances();
    scene.add(trajectoryLine);

    // Resize handler with ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    // Pointer drag controls for smooth mouse & touch aiming
    let isDragging = false;
    let lastPointerX = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current.status !== "aiming") return;
      isDragging = true;
      lastPointerX = e.clientX;
      try {
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || stateRef.current.status !== "aiming") return;
      const dx = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      if (onAimDeltaRef.current && Math.abs(dx) > 0.3) {
        onAimDeltaRef.current(dx * 0.006);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const cur = stateRef.current;

      // Rebuild course if hole index changed
      if (cur.currentHoleIndex !== currentRenderedHole) {
        buildCourse(cur.currentHoleIndex);
        currentRenderedHole = cur.currentHoleIndex;
      }

      // Update ball position and spin
      ballMesh.position.set(cur.ball.x, cur.ball.y, cur.ball.z);
      if (cur.status === "rolling") {
        ballMesh.rotation.z -= cur.ball.vx * 0.4;
        ballMesh.rotation.x += cur.ball.vz * 0.4;
      }

      // Update aim trajectory
      if (cur.status === "aiming") {
        trajectoryLine.visible = true;
        const lineLen = cur.aimPower * 4.0;
        const startX = cur.ball.x;
        const startZ = cur.ball.z;
        const endX = startX + Math.cos(cur.aimAngle) * lineLen;
        const endZ = startZ + Math.sin(cur.aimAngle) * lineLen;

        const positions = trajectoryLine.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, startX, 0.08, startZ);
        positions.setXYZ(1, endX, 0.08, endZ);
        positions.needsUpdate = true;
        trajectoryLine.computeLineDistances();
      } else {
        trajectoryLine.visible = false;
      }

      // Smooth camera follow
      const targetCamZ = cur.ball.z + 7.5;
      camera.position.z += (targetCamZ - camera.position.z) * 0.05;
      camera.position.x += (cur.ball.x * 0.4 - camera.position.x) * 0.05;
      camera.lookAt(cur.ball.x * 0.2, 0, cur.ball.z - 1.5);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full touch-none cursor-grab active:cursor-grabbing" />;
}
