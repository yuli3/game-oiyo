import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { StallId, Weather } from "@/lib/games/run-a-business";
import { STALLS } from "@/lib/games/run-a-business";

const STALL_COLOR: Record<StallId, string> = {
  ramen: "#c45c3e",
  lemonade: "#e6b422",
  pcbang: "#3d5a80",
  salon: "#d4a0b8",
  retail: "#6b705c",
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

function Crates({ stall, stock, onBuy }: { stall: StallId; stock?: Record<string, number>; onBuy?: (key: string) => void }) {
  const keys = STALLS[stall].keys.slice(0, 3);
  return (
    <group>
      {keys.map((key, i) => (
        <mesh
          key={key}
          position={[-2.2 + i * 0.7, 0.28, 1.6]}
          castShadow
          scale={[1, 0.72 + Math.min(1, (stock?.[key] ?? 0) / 18) * 0.55, 1]}
          onClick={(e) => {
            e.stopPropagation();
            onBuy?.(key);
            ping(880 - i * 80);
          }}
        >
          <boxGeometry args={[0.55, 0.4, 0.55]} />
          <meshToonMaterial color={i === 0 ? "#c08457" : i === 1 ? "#8d6b4a" : "#6f4e37"} />
        </mesh>
      ))}
    </group>
  );
}

function ping(freq: number) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    osc.frequency.value = freq;
    osc.type = "triangle";
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    pan.pan.value = freq > 800 ? -0.3 : 0.3;
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* autoplay lock */
  }
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
      {[-1.45, -0.5, 0.5, 1.45].map((x, index) => (
        <mesh key={x} position={[x, 1.38, 1.2]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.72, 0.48, 0.08]} />
          <meshToonMaterial color={index % 2 ? "#f5ead3" : color} gradientMap={toon()} />
        </mesh>
      ))}
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
      {stall === "salon" && (
        <mesh position={[0.4, 0.95, 0.9]} rotation={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.7, 10]} />
          <meshToonMaterial color="#f4e1d2" />
        </mesh>
      )}
      {stall === "retail" && (
        <mesh position={[0, 1.1, 0.15]}>
          <boxGeometry args={[2.6, 1.1, 0.9]} />
          <meshToonMaterial color="#8a8178" />
        </mesh>
      )}
    </group>
  );
}

function Shopkeeper({ stall }: { stall: StallId }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.06;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.3) * 0.018;
  });
  return (
    <group ref={group} position={[0.75, 0, -0.05]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.66, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.55, 6, 10]} />
        <meshToonMaterial color={STALL_COLOR[stall]} gradientMap={toon()} />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <sphereGeometry args={[0.23, 16, 16]} />
        <meshToonMaterial color="#f0c7a0" gradientMap={toon()} />
      </mesh>
      <mesh position={[0, 1.28, -0.02]} castShadow>
        <sphereGeometry args={[0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshToonMaterial color="#3a281d" gradientMap={toon()} />
      </mesh>
      <mesh position={[-0.24, 0.72, 0.14]} rotation={[0.1, 0, -0.55]} castShadow>
        <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
        <meshToonMaterial color="#f0c7a0" gradientMap={toon()} />
      </mesh>
      <mesh position={[0.24, 0.72, 0.14]} rotation={[0.1, 0, 0.55]} castShadow>
        <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
        <meshToonMaterial color="#f0c7a0" gradientMap={toon()} />
      </mesh>
    </group>
  );
}

function Fireflies({ count = 36 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const points = useMemo(() => Array.from({ length: count }, (_, index) => ({
    x: (Math.random() - 0.5) * 8,
    y: 0.5 + Math.random() * 3.6,
    z: -3 + Math.random() * 8,
    phase: index * 0.73,
  })), [count]);
  useFrame((state) => {
    if (!ref.current) return;
    points.forEach((point, index) => {
      const t = state.clock.elapsedTime + point.phase;
      dummy.position.set(point.x + Math.sin(t * 0.35) * 0.18, point.y + Math.sin(t) * 0.12, point.z);
      dummy.scale.setScalar(0.7 + Math.sin(t * 1.7) * 0.25);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(index, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} raycast={() => null}>
      <sphereGeometry args={[0.025, 6, 6]} />
      <meshBasicMaterial color="#ffe6a1" transparent opacity={0.75} />
    </instancedMesh>
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
    mesh.current.position.set(x, leave ? 0 : Math.abs(Math.sin(state.clock.elapsedTime * 11)) * 0.07, z);
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
  onBuy,
  onProgress,
  active,
  stock,
}: {
  stall: StallId;
  weather: Weather;
  sold: number;
  demand: number;
  onBuy?: (key: string) => void;
  onProgress: (served: number, night: number) => void;
  active: boolean;
  stock?: Record<string, number>;
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
      <spotLight
        position={[-3, 7, 4]}
        angle={0.38}
        penumbra={0.7}
        intensity={1.4}
        color="#ffe7b8"
        castShadow
      />
      <mesh position={[-1.2, 3.2, 0.4]} rotation={[0.4, 0.3, 0]}>
        <planeGeometry args={[1.6, 5]} />
        <meshBasicMaterial color="#ffe7b8" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <Ground />
      <Trees />
      <Stall stall={stall} />
      <Shopkeeper stall={stall} />
      <Crates stall={stall} stock={stock} onBuy={onBuy} />
      <Lanterns night={night} />
      <Fireflies count={weather === "rain" ? 16 : 36} />
      <Steam on={stall === "ramen"} />
      {weather === "rain" && <Rain count={700} />}
      {Array.from({ length: active ? Math.max(demand, 1) : 3 }, (_, i) => (
        <Customer
          key={i}
          index={i}
          sold={active ? sold : 0}
          served={served}
          onServe={(n) => {
            setServed((cur) => Math.max(cur, n + 1));
            ping(520);
          }}
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
  prep,
  onBuy,
  onDone,
  skipLabel,
  active = true,
}: {
  stall: StallId;
  weather: Weather;
  sold: number;
  demand: number;
  prep?: { buy: Record<string, number> };
  onBuy?: (key: string) => void;
  onDone?: () => void;
  skipLabel: string;
  active?: boolean;
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
    if (!active || !onDone) return;
    const ms = 7000 + Math.min(demand, 16) * 700;
    const id = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDone();
    }, ms);
    return () => window.clearTimeout(id);
  }, [active, demand, onDone]);

  return (
    <section className="relative h-[430px] overflow-hidden rounded-2xl bg-[#182016] shadow-[0_28px_90px_rgba(24,20,10,.34)] sm:h-[620px]">
      <Canvas
        shadows={coarse ? false : "basic"}
        dpr={coarse ? 1 : [1, 1.5]}
        gl={{ antialias: !coarse, alpha: false }}
      >
        <OrthographicCamera makeDefault position={[9, 8.5, 10]} zoom={coarse ? 49 : 58} near={0.1} far={80} />
        <World
          stall={stall}
          weather={weather}
          sold={sold}
          demand={demand}
          onBuy={onBuy}
          active={active}
          stock={prep?.buy}
          onProgress={(n) => setServed(n)}
        />
        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
          minPolarAngle={Math.PI * 0.24}
          maxPolarAngle={Math.PI * 0.4}
          minZoom={38}
          maxZoom={72}
          target={[0, 0.78, -0.15]}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between bg-gradient-to-b from-black/55 to-transparent p-3 sm:p-4">
        <p className="rounded-lg border border-white/15 bg-black/55 px-3 py-2 font-mono text-xs font-black text-white shadow-lg backdrop-blur-md">{active ? `${served}/${sold}` : "LIVE"}</p>
        {active && <button
          type="button"
          className="pointer-events-auto rounded-full bg-stone-900 px-3 py-1 text-xs font-black text-white"
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            onDone?.();
          }}
        >
          {skipLabel}
        </button>}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
    </section>
  );
}
