import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { StallId, Weather } from "@/lib/games/run-a-business";

const STALL_COLOR: Record<StallId, string> = {
  ramen: "#c45c3e",
  lemonade: "#e6b422",
  pcbang: "#3d5a80",
};

function toon() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const tones = ["#1a120c", "#5c4030", "#c4a484", "#fff3d6"];
  tones.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i, 0, 1, 1);
  });
  const map = new THREE.CanvasTexture(canvas);
  map.minFilter = THREE.NearestFilter;
  map.magFilter = THREE.NearestFilter;
  return map;
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshToonMaterial color="#8fbc6b" gradientMap={toon()} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2.2]} receiveShadow>
        <planeGeometry args={[6.4, 16]} />
        <meshToonMaterial color="#c9b79a" gradientMap={toon()} />
      </mesh>
    </group>
  );
}

function Trees() {
  const spots = [
    [-6.2, -4], [-7, 1.4], [-5.4, 5], [6.4, -3.2], [7.1, 2.6], [5.6, 6.2],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.2, 1, 6]} />
            <meshToonMaterial color="#6b3f24" gradientMap={toon()} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <icosahedronGeometry args={[0.85, 0]} />
            <meshToonMaterial color={i % 2 ? "#3f7a3a" : "#2f6b34"} gradientMap={toon()} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Stall({ stall }: { stall: StallId }) {
  const color = STALL_COLOR[stall];
  return (
    <group position={[0, 0, -1.4]}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.4, 2.2]} />
        <meshToonMaterial color="#f3e6c8" gradientMap={toon()} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <boxGeometry args={[3.8, 0.22, 2.6]} />
        <meshToonMaterial color={color} gradientMap={toon()} />
      </mesh>
      <mesh position={[0, 0.55, 1.18]} castShadow>
        <boxGeometry args={[2.6, 0.18, 0.7]} />
        <meshToonMaterial color="#5a3a22" gradientMap={toon()} />
      </mesh>
      {stall === "ramen" && (
        <mesh position={[0.2, 0.78, 1.1]}>
          <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
          <meshStandardMaterial color="#f2d0a4" emissive="#ff7a3c" emissiveIntensity={0.25} />
        </mesh>
      )}
      {stall === "lemonade" && (
        <mesh position={[-0.3, 0.95, 1.05]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshStandardMaterial color="#ffe066" emissive="#ffd000" emissiveIntensity={0.2} />
        </mesh>
      )}
      {stall === "pcbang" && (
        <mesh position={[0, 1.05, 0.2]}>
          <boxGeometry args={[2.2, 0.7, 1.1]} />
          <meshStandardMaterial color="#1b2430" emissive="#3d8bfd" emissiveIntensity={0.15} />
        </mesh>
      )}
    </group>
  );
}

function Lanterns({ night }: { night: number }) {
  const posts = [[-2.4, 2.8], [2.4, 2.8], [-2.6, -4.2], [2.6, -4.2]] as const;
  return (
    <group>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 1.8, 8]} />
            <meshToonMaterial color="#3d2b1f" />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.2 + night * 1.4} />
          </mesh>
          {night > 0.35 && <pointLight position={[0, 1.85, 0]} intensity={night * 3.2} distance={6} color="#ffc978" />}
        </group>
      ))}
    </group>
  );
}

function Rain({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(
    () => Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 18,
      y: Math.random() * 8,
      z: (Math.random() - 0.5) * 18,
      s: 2.4 + Math.random() * 2.2,
    })),
    [count],
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    drops.forEach((drop, i) => {
      drop.y -= drop.s * dt;
      if (drop.y < 0) drop.y = 7.5;
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.scale.set(0.03, 0.35, 0.03);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#b9d4e8" transparent opacity={0.55} />
    </instancedMesh>
  );
}

function Steam({ on }: { on: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const puffs = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({ t: i / 18, x: 0.15 + Math.random() * 0.2 })),
    [],
  );
  useFrame((state) => {
    if (!ref.current || !on) return;
    puffs.forEach((puff, i) => {
      const u = (puff.t + state.clock.elapsedTime * 0.18) % 1;
      dummy.position.set(puff.x, 0.9 + u * 1.6, 1.05);
      dummy.scale.setScalar(0.08 + u * 0.18);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  if (!on) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 18]} raycast={() => null}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#fff7ea" transparent opacity={0.28} />
    </instancedMesh>
  );
}

function Customer({
  index,
  sold,
  served,
  onServe,
}: {
  index: number;
  sold: number;
  served: number;
  onServe: (index: number) => void;
}) {
  const mesh = useRef<THREE.Group>(null);
  const hue = useMemo(() => new THREE.Color().setHSL((index * 0.17) % 1, 0.45, 0.52), [index]);
  const buying = index < sold;
  useFrame((state) => {
    if (!mesh.current) return;
    const span = 16;
    const t = Math.min(1, (state.clock.elapsedTime - index * 0.55) / span);
    if (t <= 0) {
      mesh.current.visible = false;
      return;
    }
    mesh.current.visible = true;
    const walkIn = Math.min(1, t / 0.28);
    const wait = t > 0.28 && t < 0.48;
    const leave = t >= 0.48;
    let z = 8.4 - walkIn * 6.6;
    let x = ((index % 3) - 1) * 0.55;
    if (wait) z = 1.8;
    if (leave) {
      const u = (t - 0.48) / 0.52;
      z = 1.8 + u * 8;
      x += buying ? -1.4 * u : 1.6 * u;
    }
    mesh.current.position.set(x, 0, z);
    mesh.current.rotation.y = leave ? (buying ? 0.6 : -0.6) : Math.PI;
    if (wait && buying && served <= index) onServe(index);
  });
  return (
    <group ref={mesh} visible={false}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.42, 4, 8]} />
        <meshToonMaterial color={hue} gradientMap={toon()} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshToonMaterial color="#f3d2b3" gradientMap={toon()} />
      </mesh>
    </group>
  );
}

function World({
  stall,
  weather,
  sold,
  demand,
  onProgress,
}: {
  stall: StallId;
  weather: Weather;
  sold: number;
  demand: number;
  onProgress: (served: number, night: number) => void;
}) {
  const [served, setServed] = useState(0);
  const night = weather === "cold" ? 0.25 : weather === "rain" ? 0.45 : weather === "hot" ? 0.05 : 0.15;
  useFrame((state) => {
    const nightAmt = Math.min(1, Math.max(night, state.clock.elapsedTime / 22));
    onProgress(served, nightAmt);
  });
  const sky = weather === "rain" ? "#6d7f90" : weather === "hot" ? "#f3c27a" : weather === "cold" ? "#9bb4d0" : "#87b7e0";
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 16, 38]} />
      <hemisphereLight args={["#fff4d6", "#3d4a32", 0.7]} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.15 - night * 0.55}
        color={weather === "hot" ? "#ffd7a1" : "#fff6e4"}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Ground />
      <Trees />
      <Stall stall={stall} />
      <Lanterns night={night} />
      <Steam on={stall === "ramen"} />
      {weather === "rain" && <Rain count={700} />}
      {Array.from({ length: Math.max(demand, 1) }, (_, i) => (
        <Customer
          key={i}
          index={i}
          sold={sold}
          served={served}
          onServe={(n) => setServed((cur) => Math.max(cur, n + 1))}
        />
      ))}
    </>
  );
}

export default function RunABusinessScene({
  stall,
  weather,
  sold,
  demand,
  onDone,
  skipLabel,
}: {
  stall: StallId;
  weather: Weather;
  sold: number;
  demand: number;
  onDone: () => void;
  skipLabel: string;
}) {
  const [coarse, setCoarse] = useState(false);
  const [served, setServed] = useState(0);
  const finished = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 640px)");
    const sync = () => setCoarse(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const ms = 7000 + Math.min(demand, 16) * 700;
    const id = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDone();
    }, ms);
    return () => window.clearTimeout(id);
  }, [demand, onDone]);

  return (
    <section className="relative h-[560px] overflow-hidden rounded-[1.6rem] border border-[#d7c4a3] bg-[#cfe3b8] shadow-[0_20px_60px_rgba(70,50,20,.16)] sm:h-[640px]">
      <Canvas
        shadows={coarse ? false : "basic"}
        dpr={coarse ? 1 : [1, 1.5]}
        gl={{ antialias: !coarse, alpha: false }}
      >
        <OrthographicCamera makeDefault position={[11, 12, 11]} zoom={coarse ? 28 : 36} near={0.1} far={80} />
        <World
          stall={stall}
          weather={weather}
          sold={sold}
          demand={demand}
          onProgress={(n) => setServed(n)}
        />
        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
          minPolarAngle={Math.PI * 0.24}
          maxPolarAngle={Math.PI * 0.4}
          minZoom={22}
          maxZoom={52}
          target={[0, 0.4, 0]}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
        <p className="rounded-full bg-white/85 px-3 py-1 text-xs font-black text-stone-800 shadow">{served}/{sold} sold</p>
        <button
          type="button"
          className="pointer-events-auto rounded-full bg-stone-900 px-3 py-1 text-xs font-black text-white"
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            onDone();
          }}
        >
          {skipLabel}
        </button>
      </div>
    </section>
  );
}
