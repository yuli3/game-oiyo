import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Color, MathUtils } from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Points } from "three";
import {
  clampShipX,
  divePoint,
  enemyScore,
  formationSlots,
  inTractorBeam,
  shouldDive,
  waveBonus,
  type EnemyKind,
  type EnemyMode,
} from "../../lib/games/neon-formation";

export interface NeonFormationCopy {
  score: string; high: string; wave: string; lives: string; chain: string; captured: string; rescue: string;
  clear: string; pointer: string; pause: string; fire: string; left: string; right: string;
}
export interface NeonFormationResult { score: number; wave: number; accuracy: number; rescues: number }
interface Props { copy: NeonFormationCopy; highScore: number; onFinish: (result: NeonFormationResult) => void }
interface EnemyState {
  id: number; kind: EnemyKind; mode: EnemyMode; x: number; y: number; z: number; hp: number;
  slotX: number; slotY: number; diveAt: number; side: number; targetX: number; tractorAt: number;
}
interface Bolt { id: number; x: number; y: number; vx: number; vy: number; enemy: boolean }
interface Burst { id: number; x: number; y: number; color: string; born: number }

const isCoarse = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

class ArcadeAudio {
  context?: AudioContext;
  master?: GainNode;
  start() {
    if (this.context) { void this.context.resume(); return; }
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.2;
    this.master.connect(this.context.destination);
    this.tone(55, 0.26, "sawtooth", 0.08, 0);
    this.tone(82, 0.18, "square", 0.05, 0.12);
  }
  tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(now); oscillator.stop(now + duration + 0.02);
  }
  setMuted(muted: boolean) { if (this.master) this.master.gain.value = muted ? 0 : 0.2; }
  laser(dual = false) { this.tone(920, 0.09, "square", 0.09); if (dual) this.tone(720, 0.11, "sawtooth", 0.05, 0.015); }
  hit() { this.tone(145, 0.16, "sawtooth", 0.12); }
  explode() { this.tone(78, 0.42, "sawtooth", 0.18); this.tone(39, 0.5, "square", 0.08, 0.03); }
  capture() { [0, 1, 2, 3].forEach((i) => this.tone(180 + i * 55, 0.22, "sine", 0.05, i * 0.09)); }
  clear() { [0, 1, 2, 3].forEach((i) => this.tone(330 * (1 + i * 0.25), 0.3, "triangle", 0.07, i * 0.11)); }
}

function Ship({ x, captured, dual }: { x: number; captured: boolean; dual: boolean }) {
  return <group position={[x, -6.1, 0]} rotation={[0, 0, captured ? 0.08 : 0]}>
    <mesh><coneGeometry args={[0.55, 1.7, 5]} /><meshStandardMaterial color="#d9faff" metalness={0.85} roughness={0.18} emissive="#00d9ff" emissiveIntensity={0.45} /></mesh>
    <mesh position={[-0.58, -0.15, 0]} rotation={[0, 0, -0.32]}><boxGeometry args={[0.9, 0.18, 0.5]} /><meshStandardMaterial color="#fb7185" metalness={0.7} emissive="#ff1744" emissiveIntensity={1.7} /></mesh>
    <mesh position={[0.58, -0.15, 0]} rotation={[0, 0, 0.32]}><boxGeometry args={[0.9, 0.18, 0.5]} /><meshStandardMaterial color="#fb7185" metalness={0.7} emissive="#ff1744" emissiveIntensity={1.7} /></mesh>
    <mesh position={[0, -0.72, 0]}><cylinderGeometry args={[0.15, 0.29, 0.5, 12]} /><meshBasicMaterial color="#67e8f9" toneMapped={false} /></mesh>
    {dual && <group position={[1.15, -0.18, 0]} scale={0.62}><mesh><coneGeometry args={[0.55, 1.7, 5]} /><meshStandardMaterial color="#fff" metalness={0.85} emissive="#a855f7" emissiveIntensity={1.2} /></mesh></group>}
  </group>;
}

function EnemyShip({ enemy, time }: { enemy: EnemyState; time: number }) {
  const color = enemy.kind === "warden" ? "#c084fc" : enemy.kind === "stinger" ? "#fb7185" : "#22d3ee";
  const scale = enemy.kind === "warden" ? 1.25 : enemy.kind === "stinger" ? 0.92 : 0.78;
  const tractor = enemy.mode === "tractor";
  return <group position={[enemy.x, enemy.y, enemy.z]} scale={scale} rotation={[0, 0, Math.sin(time * 4 + enemy.id) * 0.09]}>
    <mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.62, 1.3, enemy.kind === "warden" ? 6 : 4]} /><meshStandardMaterial color="#111827" metalness={0.9} roughness={0.2} emissive={color} emissiveIntensity={1.5} /></mesh>
    <mesh position={[-0.62, 0.05, 0]} rotation={[0, 0, 0.42]}><boxGeometry args={[0.92, 0.16, 0.42]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <mesh position={[0.62, 0.05, 0]} rotation={[0, 0, -0.42]}><boxGeometry args={[0.92, 0.16, 0.42]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <mesh position={[0, 0.1, 0.35]}><sphereGeometry args={[0.22, 12, 8]} /><meshBasicMaterial color="#fff" toneMapped={false} /></mesh>
    {tractor && <mesh position={[0, -3.5, 0]}><coneGeometry args={[2.6, 7, 24, 1, true]} /><meshBasicMaterial color="#a855f7" transparent opacity={0.15 + Math.sin(time * 12) * 0.05} side={2} depthWrite={false} blending={AdditiveBlending} /></mesh>}
  </group>;
}

function Nebula() {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(900 * 3);
    let seed = 48271;
    for (let i = 0; i < 900; i += 1) {
      seed = seed * 16807 % 2147483647; array[i * 3] = ((seed / 2147483647) - 0.5) * 34;
      seed = seed * 16807 % 2147483647; array[i * 3 + 1] = ((seed / 2147483647) - 0.5) * 28;
      seed = seed * 16807 % 2147483647; array[i * 3 + 2] = -2 - (seed / 2147483647) * 18;
    }
    return array;
  }, []);
  useFrame((_, delta) => { if (points.current) points.current.rotation.z += delta * 0.004; });
  return <>
    <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial size={0.055} color="#dffbff" transparent opacity={0.82} sizeAttenuation /></points>
    <mesh position={[-7, 2, -12]} scale={[8, 5, 1]}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#5b21b6" transparent opacity={0.11} depthWrite={false} blending={AdditiveBlending} /></mesh>
    <mesh position={[7, -1, -14]} scale={[9, 5, 1]}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#0891b2" transparent opacity={0.12} depthWrite={false} blending={AdditiveBlending} /></mesh>
  </>;
}

function CameraRig({ clearing }: { clearing: boolean }) {
  const { camera } = useThree();
  useFrame((state, delta) => {
    const targetZ = clearing ? 20 : 18;
    camera.position.z = MathUtils.damp(camera.position.z, targetZ, 3.5, delta);
    camera.position.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.13;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function FrameLoop({ tick }: { tick: (delta: number) => void }) {
  useFrame((_, delta) => tick(delta));
  return null;
}

function Battle({ copy, highScore, onFinish }: Props) {
  const audio = useRef(new ArcadeAudio());
  const nextId = useRef(1);
  const started = useRef(false);
  const keys = useRef(new Set<string>());
  const shipX = useRef(0);
  const lastShot = useRef(0);
  const elapsed = useRef(0);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [chain, setChain] = useState(0);
  const [rescues, setRescues] = useState(0);
  const [dual, setDual] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [shots, setShots] = useState(0);
  const [hits, setHits] = useState(0);
  const [enemies, setEnemies] = useState<EnemyState[]>([]);
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const spawnWave = useCallback((level: number) => {
    started.current = true;
    elapsed.current = 0;
    setEnemies(formationSlots(level).map((slot, id) => ({
      id: nextId.current++, kind: slot.kind, mode: "forming", x: slot.x * 0.2, y: 11 + slot.row, z: 0,
      hp: slot.kind === "warden" ? 3 : slot.kind === "stinger" ? 2 : 1, slotX: slot.x, slotY: slot.y,
      diveAt: -1, side: id % 2 ? 1 : -1, targetX: 0, tractorAt: -1,
    })));
  }, []);
  useEffect(() => { spawnWave(1); audio.current.start(); }, [spawnWave]);
  useEffect(() => { audio.current.setMuted(muted); }, [muted]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => { keys.current.add(event.key.toLowerCase()); if (event.key.toLowerCase() === "p") setPaused((value) => !value); };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const fire = useCallback(() => {
    const now = performance.now();
    if (paused || now - lastShot.current < 145) return;
    audio.current.start(); audio.current.laser(dual); lastShot.current = now; setShots((value) => value + (dual ? 2 : 1));
    const offsets = dual ? [-0.34, 1.12] : [0];
    setBolts((current) => [...current, ...offsets.map((offset) => ({ id: nextId.current++, x: shipX.current + offset, y: -5.3, vx: 0, vy: 17, enemy: false }))]);
  }, [dual, paused]);

  const tick = (rawDelta: number) => {
    if (paused || clearing) return;
    const delta = Math.min(0.04, rawDelta); elapsed.current += delta;
    const left = keys.current.has("a") || keys.current.has("arrowleft");
    const right = keys.current.has("d") || keys.current.has("arrowright");
    shipX.current = clampShipX(shipX.current + ((right ? 1 : 0) - (left ? 1 : 0)) * delta * 8.5);
    if (keys.current.has(" ") || keys.current.has("f")) fire();
    setBolts((current) => current.map((bolt) => ({ ...bolt, x: bolt.x + bolt.vx * delta, y: bolt.y + bolt.vy * delta })).filter((bolt) => bolt.y > -9 && bolt.y < 10));
    setBursts((current) => current.filter((burst) => elapsed.current - burst.born < 0.65));

    setEnemies((current) => {
      let changed = false;
      const next = current.map((enemy, index) => {
        let update = enemy;
        if (enemy.mode === "forming") {
          const x = MathUtils.damp(enemy.x, enemy.slotX, 5, delta);
          const y = MathUtils.damp(enemy.y, enemy.slotY, 5, delta);
          update = { ...enemy, x, y, mode: Math.abs(y - enemy.slotY) < 0.05 ? "formation" : "forming" }; changed = true;
        } else if (enemy.mode === "formation" && shouldDive(wave, elapsed.current, index)) {
          update = enemy.kind === "warden" && (index + wave) % 3 === 0
            ? { ...enemy, mode: "tractor", tractorAt: elapsed.current }
            : { ...enemy, mode: "diving", diveAt: elapsed.current, targetX: shipX.current };
          changed = true;
        } else if (enemy.mode === "diving") {
          const progress = (elapsed.current - enemy.diveAt) / 3.2;
          if (progress >= 1) update = { ...enemy, mode: "returning", y: 10 };
          else update = { ...enemy, ...divePoint(progress, enemy.slotX, enemy.targetX, enemy.side) };
          changed = true;
        } else if (enemy.mode === "returning") {
          const x = MathUtils.damp(enemy.x, enemy.slotX, 4, delta); const y = MathUtils.damp(enemy.y, enemy.slotY, 4, delta);
          update = { ...enemy, x, y, mode: Math.abs(y - enemy.slotY) < 0.08 ? "formation" : "returning" }; changed = true;
        } else if (enemy.mode === "tractor") {
          const age = elapsed.current - enemy.tractorAt;
          update = { ...enemy, y: MathUtils.damp(enemy.y, 1.5, 3, delta) }; changed = true;
          if (age > 1.2 && age < 3.8 && inTractorBeam(shipX.current, enemy.x, Math.min(1, (age - 1.2) / 1.3)) && !captured) {
            setCaptured(true); setDual(false); audio.current.capture();
          }
          if (age > 4.2) update = { ...update, mode: "returning", y: 9 };
        }
        return update;
      });
      return changed ? next : current;
    });

    setBolts((currentBolts) => {
      const survivors: Bolt[] = [];
      const killed = new Set<number>();
      const damaged = new Map<number, number>();
      for (const bolt of currentBolts) {
        if (!bolt.enemy) {
          const target = enemies.find((enemy) => !killed.has(enemy.id) && Math.abs(enemy.x - bolt.x) < 0.58 && Math.abs(enemy.y - bolt.y) < 0.65);
          if (target) { damaged.set(target.id, (damaged.get(target.id) ?? 0) + 1); setHits((v) => v + 1); continue; }
        } else if (Math.abs(shipX.current - bolt.x) < 0.55 && Math.abs(-6.1 - bolt.y) < 0.7) {
          setLives((value) => {
            const next = value - 1; audio.current.hit();
            if (next <= 0) onFinish({ score, wave, accuracy: shots ? Math.round(hits / shots * 100) : 0, rescues });
            return Math.max(0, next);
          }); continue;
        }
        survivors.push(bolt);
      }
      if (damaged.size) setEnemies((currentEnemies) => currentEnemies.flatMap((enemy) => {
        const damage = damaged.get(enemy.id) ?? 0;
        if (!damage) return [enemy];
        if (enemy.hp - damage > 0) return [{ ...enemy, hp: enemy.hp - damage }];
        killed.add(enemy.id); audio.current.explode();
        setBursts((value) => [...value, { id: nextId.current++, x: enemy.x, y: enemy.y, color: enemy.kind === "warden" ? "#c084fc" : "#22d3ee", born: elapsed.current }]);
        setScore((value) => value + enemyScore(enemy.kind, enemy.mode === "diving", chain));
        setChain((value) => Math.min(12, value + 1));
        if (enemy.kind === "warden" && captured) { setCaptured(false); setDual(true); setRescues((value) => value + 1); audio.current.clear(); }
        return [];
      }));
      return survivors;
    });
    if (Math.random() < delta * (0.55 + wave * 0.08) && enemies.length) {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      if (enemy && enemy.y > -5) setBolts((current) => [...current, { id: nextId.current++, x: enemy.x, y: enemy.y - 0.5, vx: 0, vy: -8.5, enemy: true }]);
    }
  };

  useEffect(() => {
    if (!started.current || enemies.length || clearing || lives <= 0) return;
    setClearing(true); audio.current.clear();
    const nextWave = wave + 1;
    const timer = window.setTimeout(() => {
      setScore((value) => value + waveBonus(wave, dual));
      setWave(nextWave); setChain(0); setClearing(false); spawnWave(nextWave);
    }, 1_650);
    return () => window.clearTimeout(timer);
  }, [clearing, dual, enemies.length, lives, spawnWave, wave]);

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    shipX.current = clampShipX(((event.clientX - rect.left) / rect.width - 0.5) * 16);
  };
  return <div className="relative h-full select-none overflow-hidden bg-[#02030a]" onPointerMove={(event) => { if (event.buttons) drag(event); }} onPointerDown={(event) => { audio.current.start(); drag(event); fire(); }}>
    <Canvas dpr={isCoarse() ? 1 : [1, 1.5]} camera={{ position: [0, 0, 18], fov: 46 }} gl={{ antialias: !isCoarse(), alpha: false }} onCreated={({ gl }) => { gl.setClearColor(new Color("#02030a")); }}>
      <ambientLight intensity={0.34} /><pointLight position={[-6, 5, 5]} color="#22d3ee" intensity={28} distance={18} /><pointLight position={[6, 2, 4]} color="#e879f9" intensity={24} distance={18} />
      <Nebula /><CameraRig clearing={clearing} /><FrameLoop tick={tick} />
      <Ship x={shipX.current} captured={captured} dual={dual} />
      {enemies.map((enemy) => <EnemyShip key={enemy.id} enemy={enemy} time={elapsed.current} />)}
      {bolts.map((bolt) => <mesh key={bolt.id} position={[bolt.x, bolt.y, 0.2]}><capsuleGeometry args={[0.055, 0.45, 4, 8]} /><meshBasicMaterial color={bolt.enemy ? "#fb7185" : "#67e8f9"} toneMapped={false} /></mesh>)}
      {bursts.flatMap((burst) => Array.from({ length: 9 }, (_, index) => {
        const age = Math.min(1, (elapsed.current - burst.born) / 0.65);
        const angle = index / 9 * Math.PI * 2;
        return <mesh key={`${burst.id}-${index}`} position={[burst.x + Math.cos(angle) * age * 1.2, burst.y + Math.sin(angle) * age * 1.2, 0]} scale={1 - age}><octahedronGeometry args={[0.16]} /><meshBasicMaterial color={burst.color} toneMapped={false} /></mesh>;
      }))}
    </Canvas>
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 font-mono text-[10px] font-black tracking-widest text-white sm:p-5 sm:text-xs">
      <div className="flex items-start gap-2">
        <button type="button" onClick={(event) => { event.stopPropagation(); setMuted((value) => !value); }} onPointerDown={(event) => event.stopPropagation()} aria-pressed={muted} aria-label="Sound" className="pointer-events-auto min-h-11 min-w-11 rounded border border-white/20 bg-black/55 text-white"><span aria-hidden="true">{muted ? "🔇" : "🔊"}</span></button>
        <div className="rounded border border-cyan-300/25 bg-black/55 px-3 py-2"><span className="text-cyan-300">{copy.score}</span> {score.toString().padStart(7, "0")}<br/><span className="text-slate-500">{copy.high}</span> {Math.max(score, highScore).toString().padStart(7, "0")}</div>
      </div>
      <div className="rounded border border-white/10 bg-black/55 px-3 py-2 text-center">{copy.wave} {wave}<br/><span className="text-rose-300">{copy.lives} {"◆".repeat(lives)}</span></div>
      <div className="rounded border border-fuchsia-300/25 bg-black/55 px-3 py-2 text-right"><span className="text-fuchsia-300">{copy.chain}</span> ×{Math.max(1, chain)}<br/>{shots ? Math.round(hits / shots * 100) : 0}%</div>
    </div>
    {captured && <div className="pointer-events-none absolute inset-x-0 top-24 text-center font-mono text-sm font-black tracking-[.35em] text-fuchsia-300 [text-shadow:0_0_18px_#d946ef]">{copy.captured}</div>}
    {clearing && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-cyan-950/10"><div className="font-mono text-2xl font-black tracking-[.3em] text-cyan-100 [text-shadow:0_0_28px_#22d3ee] sm:text-4xl">{copy.clear}</div></div>}
    {paused && <div className="absolute inset-0 grid place-items-center bg-black/70 font-mono text-3xl font-black tracking-[.3em] text-white">{copy.pause}</div>}
    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 sm:hidden">
      <button aria-label={copy.left} onPointerDown={(event) => { event.stopPropagation(); keys.current.add("a"); }} onPointerUp={() => keys.current.delete("a")} className="min-h-12 min-w-16 rounded-xl border border-white/20 bg-black/65 font-mono font-black text-white">◀</button>
      <button aria-label={copy.fire} onPointerDown={(event) => { event.stopPropagation(); fire(); }} className="min-h-12 min-w-24 rounded-xl bg-cyan-400 font-mono font-black text-slate-950">{copy.fire}</button>
      <button aria-label={copy.right} onPointerDown={(event) => { event.stopPropagation(); keys.current.add("d"); }} onPointerUp={() => keys.current.delete("d")} className="min-h-12 min-w-16 rounded-xl border border-white/20 bg-black/65 font-mono font-black text-white">▶</button>
    </div>
  </div>;
}

export default function NeonFormationScene(props: Props) {
  return <Battle {...props} />;
}
