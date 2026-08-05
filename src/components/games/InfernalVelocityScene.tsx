import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, MathUtils, NearestFilter, RepeatWrapping, Vector3, type Group, type Mesh, type MeshBasicMaterial } from "three";
import {
  DEMON_HEALTH,
  INFERNAL_WEAPONS,
  applyDamage,
  accelerateVelocity,
  applyGroundFriction,
  arenaBound,
  canJump,
  coolHeat,
  dashVelocity,
  demonForSpawn,
  eliminationScore,
  shotIntervalMs,
  splashDamage,
  waveBudget,
  type DemonKind,
  type InfernalWeaponId,
} from "../../lib/games/infernal-velocity";

export interface InfernalResult { score: number; kills: number; wave: number; accuracy: number }
export interface InfernalSceneCopy {
  score: string; wave: string; combo: string; heat: string; health: string; ammo: string;
  dash: string; incoming: string; overdrive: string; pointer: string; paused: string;
  fire: string; jump: string; dashButton: string; swap: string;
  scattergun: string; rocket: string; plasma: string;
}
interface Props { copy: InfernalSceneCopy; onFinish: (result: InfernalResult) => void }
interface ControlState {
  forward: boolean; backward: boolean; left: boolean; right: boolean; fire: boolean;
  jump: boolean; dash: boolean; swap: boolean; lookX: number; lookY: number;
}
interface Demon {
  id: number; kind: DemonKind; position: Vector3; health: number; phase: number; nextAttack: number;
}
interface Burst { id: number; position: Vector3; color: string; size: number }
interface Projectile {
  id: number; kind: "rocket" | "plasma"; position: Vector3; velocity: Vector3; life: number;
}
interface Hud {
  health: number; ammo: number; reserve: number; weapon: InfernalWeaponId; heat: number;
  score: number; kills: number; wave: number; combo: number; dash: number; hit: boolean;
}

const initialControls = (): ControlState => ({
  forward: false, backward: false, left: false, right: false, fire: false,
  jump: false, dash: false, swap: false, lookX: 0, lookY: 0,
});
const initialHud = (): Hud => ({
  health: 100, ammo: 8, reserve: 56, weapon: "scattergun", heat: 0,
  score: 0, kills: 0, wave: 1, combo: 0, dash: 1, hit: false,
});

export default function InfernalVelocityScene({ copy, onFinish }: Props) {
  const controls = useRef(initialControls());
  const [hud, setHud] = useState(initialHud);
  const [coarse, setCoarse] = useState(false);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update(); query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    const update = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", update);
    return () => document.removeEventListener("pointerlockchange", update);
  }, []);
  useEffect(() => {
    const keys: Record<string, keyof ControlState> = {
      KeyW: "forward", ArrowUp: "forward", KeyS: "backward", ArrowDown: "backward",
      KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
      Space: "jump", ShiftLeft: "dash", KeyE: "swap", KeyF: "fire",
    };
    const down = (event: KeyboardEvent) => { const key = keys[event.code]; if (key) { event.preventDefault(); (controls.current[key] as boolean) = true; } };
    const up = (event: KeyboardEvent) => { const key = keys[event.code]; if (key) (controls.current[key] as boolean) = false; };
    const move = (event: MouseEvent) => {
      if (!document.pointerLockElement) return;
      controls.current.lookX += event.movementX; controls.current.lookY += event.movementY;
    };
    const mouseDown = (event: MouseEvent) => { if (event.button === 0) controls.current.fire = true; };
    const mouseUp = (event: MouseEvent) => { if (event.button === 0) controls.current.fire = false; };
    addEventListener("keydown", down); addEventListener("keyup", up); addEventListener("mousemove", move);
    addEventListener("mousedown", mouseDown); addEventListener("mouseup", mouseUp);
    return () => {
      removeEventListener("keydown", down); removeEventListener("keyup", up); removeEventListener("mousemove", move);
      removeEventListener("mousedown", mouseDown); removeEventListener("mouseup", mouseUp);
    };
  }, []);

  const lock = () => {
    if (coarse) return;
    const canvas = root.current?.querySelector("canvas");
    void canvas?.requestPointerLock?.();
  };
  const press = (key: keyof ControlState, value: boolean) => { (controls.current[key] as boolean) = value; };

  return (
    <div ref={root} className="relative h-full min-h-[560px] select-none overflow-hidden bg-black text-white" onClick={lock}>
      <Canvas shadows={!coarse} dpr={[1, coarse ? 1 : 1.45]} camera={{ fov: 76, near: 0.06, far: 120, position: [0, 1.7, 12] }} gl={{ antialias: !coarse }}>
        <color attach="background" args={["#050001"]} />
        <fog attach="fog" args={["#160003", 12, 56]} />
        <InfernalWorld controls={controls} setHud={setHud} onFinish={onFinish} coarse={coarse} muted={muted} />
      </Canvas>

      <div className={`pointer-events-none absolute inset-0 transition-opacity ${hud.health < 35 ? "opacity-70" : "opacity-0"} bg-[radial-gradient(circle,transparent_45%,rgba(160,0,0,.65))]`} />
      <div className={`pointer-events-none absolute inset-0 bg-white transition-opacity ${hud.hit ? "opacity-15" : "opacity-0"}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 font-mono text-xs sm:p-6">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted} aria-label="Sound"
            className="pointer-events-auto min-h-11 min-w-11 rounded border border-white/20 bg-black/55 text-sm text-white backdrop-blur-sm">
            <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
          </button>
          <div className="border-l-2 border-red-500 bg-black/55 px-3 py-2 backdrop-blur-sm">
            <div className="text-[10px] tracking-[.25em] text-red-400">{copy.score}</div>
            <div className="text-2xl font-black text-white">{hud.score.toLocaleString()}</div>
            <div className="mt-1 text-amber-300">{copy.combo} ×{(1 + Math.min(4, hud.combo) * .25).toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-black/55 px-4 py-2 text-center backdrop-blur-sm">
          <div className="text-[10px] tracking-[.28em] text-orange-400">{copy.wave}</div>
          <div className="text-3xl font-black">{hud.wave}</div>
        </div>
        <div className="min-w-32 bg-black/55 px-3 py-2 text-right backdrop-blur-sm">
          <div className="text-[10px] text-red-400">{copy.health}</div>
          <div className="text-2xl font-black">{Math.ceil(hud.health)}</div>
          <div className="mt-1 h-1.5 bg-white/10"><div className="h-full bg-red-500" style={{ width: `${hud.health}%` }} /></div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-1/2 w-[min(92%,560px)] -translate-x-1/2 font-mono">
        <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/70">
          <span>{copy[hud.weapon]}</span><span>{copy.heat} {Math.round(hud.heat)}%</span>
        </div>
        <div className="flex items-end justify-between border-x border-t border-white/15 bg-black/60 px-4 py-2 backdrop-blur-sm">
          <span className="text-4xl font-black">{hud.ammo}</span><span className="pb-1 text-sm text-white/50">/ {hud.reserve}</span>
          <span className={`ml-auto rounded px-2 py-1 text-[10px] font-black ${hud.dash >= 1 ? "bg-orange-500 text-black" : "bg-white/10 text-white/50"}`}>{copy.dash}</span>
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2">
        <i className="absolute left-0 top-1/2 h-px w-2 bg-white" /><i className="absolute right-0 top-1/2 h-px w-2 bg-white" />
        <i className="absolute left-1/2 top-0 h-2 w-px bg-white" /><i className="absolute bottom-0 left-1/2 h-2 w-px bg-white" />
      </div>
      {!coarse && !locked && <button className="absolute inset-0 grid place-items-center bg-black/15 font-mono text-sm font-black tracking-widest" onClick={lock}>{copy.pointer}</button>}
      {coarse && (
        <>
          <div className="absolute bottom-20 left-4 grid grid-cols-3 gap-1" onClick={(e) => e.stopPropagation()}>
            <span /><Touch label="▲" onChange={(v) => press("forward", v)} /><span />
            <Touch label="◀" onChange={(v) => press("left", v)} /><Touch label="▼" onChange={(v) => press("backward", v)} /><Touch label="▶" onChange={(v) => press("right", v)} />
          </div>
          <div className="absolute bottom-20 right-4 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
            <Touch label={copy.jump} onChange={(v) => press("jump", v)} />
            <Touch label={copy.dashButton} hot onChange={(v) => press("dash", v)} />
            <Touch label={copy.swap} onChange={(v) => press("swap", v)} />
            <Touch label={copy.fire} hot onChange={(v) => press("fire", v)} />
          </div>
        </>
      )}
    </div>
  );
}

function Touch({ label, onChange, hot = false }: { label: string; onChange: (value: boolean) => void; hot?: boolean }) {
  return <button className={`size-14 rounded-full border text-[10px] font-black backdrop-blur ${hot ? "border-orange-400 bg-orange-500/70 text-black" : "border-white/20 bg-black/55"}`}
    onPointerDown={(e) => { e.preventDefault(); onChange(true); }} onPointerUp={() => onChange(false)} onPointerCancel={() => onChange(false)}>{label}</button>;
}

function InfernalWorld({ controls, setHud, onFinish, coarse, muted }: {
  controls: { current: ControlState }; setHud: React.Dispatch<React.SetStateAction<Hud>>;
  onFinish: (result: InfernalResult) => void; coarse: boolean; muted: boolean;
}) {
  const { camera } = useThree();
  const demons = useRef<Demon[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const [renderDemons, setRenderDemons] = useState<Demon[]>([]);
  const [renderProjectiles, setRenderProjectiles] = useState<Projectile[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const state = useRef({
    velocity: new Vector3(), yaw: 0, pitch: 0, y: 1.7, jumps: 0, grounded: true,
    dash: 1, dashHeld: false, jumpHeld: false, swapHeld: false, lastShot: 0, lastHit: 0,
    weapon: "scattergun" as InfernalWeaponId, ammo: 8, reserve: 56, heat: 0,
    health: 100, score: 0, kills: 0, wave: 1, combo: 0, shots: 0, hits: 0,
    spawnLeft: waveBudget(1), spawnClock: 0, id: 1, ended: false, shake: 0, elapsed: 0,
  });
  const audio = useRef<ReturnType<typeof createInfernalAudio> | null>(null);

  useEffect(() => {
    audio.current = createInfernalAudio();
    audio.current.start();
    return () => audio.current?.stop();
  }, []);
  useEffect(() => { audio.current?.setMuted(muted); }, [muted]);

  const explode = useCallback((position: Vector3, color: string, size = 1) => {
    const id = performance.now() + Math.random();
    setBursts((old) => [...old.slice(-18), { id, position: position.clone(), color, size }]);
    window.setTimeout(() => setBursts((old) => old.filter((burst) => burst.id !== id)), 220);
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, .04);
    const s = state.current;
    if (s.ended) return;
    s.elapsed += delta;
    const c = controls.current;
    s.yaw -= c.lookX * .0022; s.pitch = MathUtils.clamp(s.pitch - c.lookY * .0017, -.9, .8);
    c.lookX = 0; c.lookY = 0;

    const forward = new Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    const right = new Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
    const inputX = Number(c.right) - Number(c.left);
    const inputZ = Number(c.forward) - Number(c.backward);
    const desired = forward.clone().multiplyScalar(inputZ).add(right.clone().multiplyScalar(inputX));
    if (desired.lengthSq()) desired.normalize();
    if (s.grounded) {
      // Holding jump skips the friction frame, preserving speed across landings like classic bunny hopping.
      const friction = applyGroundFriction(s.velocity, c.jump ? 0 : 8.5, delta);
      const accelerated = accelerateVelocity(friction, desired, 11, 9.4, delta);
      s.velocity.x = accelerated.x; s.velocity.z = accelerated.z;
    } else {
      const accelerated = accelerateVelocity(s.velocity, desired, 4.2, 9.4, delta);
      s.velocity.x = accelerated.x; s.velocity.z = accelerated.z;
    }

    if (c.jump && !s.jumpHeld && canJump(s.jumps)) {
      s.velocity.y = 8.2; s.jumps++; s.grounded = false; audio.current?.jump();
    }
    s.jumpHeld = c.jump;
    s.dash = Math.min(1, s.dash + delta / 1.45);
    if (c.dash && !s.dashHeld && s.dash >= 1) {
      const dash = dashVelocity({ x: forward.x, z: forward.z }, { x: right.x, z: right.z }, { x: inputX, z: inputZ });
      s.velocity.x = dash.x; s.velocity.z = dash.z; s.dash = 0; s.shake = .18; audio.current?.dash();
    }
    s.dashHeld = c.dash;
    s.velocity.y -= 22 * delta; s.y += s.velocity.y * delta;
    if (s.y <= 1.7) { s.y = 1.7; s.velocity.y = 0; s.grounded = true; s.jumps = 0; }
    camera.position.x = arenaBound(camera.position.x + s.velocity.x * delta);
    camera.position.z = arenaBound(camera.position.z + s.velocity.z * delta);
    const shake = s.shake > 0 ? s.shake * (Math.random() - .5) : 0;
    s.shake = Math.max(0, s.shake - delta * 1.8);
    camera.position.y = s.y + shake;
    camera.rotation.set(s.pitch + shake * .05, s.yaw, shake * .025, "YXZ");

    if (c.swap && !s.swapHeld) {
      const order: InfernalWeaponId[] = ["scattergun", "rocket", "plasma"];
      s.weapon = order[(order.indexOf(s.weapon) + 1) % order.length];
      s.ammo = Math.min(s.ammo || INFERNAL_WEAPONS[s.weapon].magazine, INFERNAL_WEAPONS[s.weapon].magazine);
      s.reserve = Math.max(s.reserve, INFERNAL_WEAPONS[s.weapon].reserve); audio.current?.swap();
    }
    s.swapHeld = c.swap;
    s.heat = coolHeat(s.heat, delta);
    const weapon = INFERNAL_WEAPONS[s.weapon];
    const now = performance.now();
    if (c.fire && s.ammo > 0 && s.heat < 100 && now - s.lastShot >= shotIntervalMs(weapon)) {
      s.lastShot = now; s.ammo--; s.shots++; s.heat += weapon.heat; s.shake = s.weapon === "rocket" ? .55 : .25;
      audio.current?.shot(s.weapon);
      const direction = new Vector3(0, 0, -1).applyEuler(camera.rotation);
      if (s.weapon === "rocket" || s.weapon === "plasma") {
        projectiles.current.push({
          id: s.id++, kind: s.weapon, position: camera.position.clone().add(direction.clone().multiplyScalar(1.25)),
          velocity: direction.multiplyScalar(s.weapon === "rocket" ? 24 : 38), life: s.weapon === "rocket" ? 2.4 : 1.35,
        });
      } else {
        let target: Demon | undefined;
        let best = Infinity;
        for (const demon of demons.current) {
          const to = demon.position.clone().add(new Vector3(0, demon.kind === "brute" ? 1.25 : .8, 0)).sub(camera.position);
          const angle = direction.angleTo(to);
          const threshold = weapon.spread + (demon.kind === "brute" ? .09 : .055);
          if (angle < threshold && to.length() < best) { target = demon; best = to.length(); }
        }
        if (target) {
          const result = applyDamage(target.health, weapon.damage * weapon.pellets * Math.max(.3, 1 - best / 42));
          target.health = result.health; s.hits++; s.lastHit = now;
          explode(target.position, result.killed ? "#ff2b00" : "#ffb000", result.killed ? 1.8 : .7); audio.current?.impact(result.killed);
          if (result.killed) {
            s.kills++; s.combo++; s.score += eliminationScore(target.kind, s.combo);
            demons.current = demons.current.filter((demon) => demon.id !== target!.id);
          }
        }
      }
      if (s.ammo <= 0 && s.reserve > 0) {
        window.setTimeout(() => {
          const needed = weapon.magazine; const loaded = Math.min(needed, s.reserve);
          s.ammo = loaded; s.reserve -= loaded; audio.current?.reload();
        }, weapon.reloadMs);
      }
    }
    if (now - s.lastHit > 2_500) s.combo = 0;

    for (const projectile of projectiles.current) {
      projectile.position.addScaledVector(projectile.velocity, delta); projectile.life -= delta;
      const direct = demons.current.find((demon) => demon.position.distanceTo(projectile.position) < (projectile.kind === "rocket" ? 1.2 : .75));
      const hitWall = Math.abs(projectile.position.x) >= 28 || Math.abs(projectile.position.z) >= 28 || projectile.position.y <= .1;
      if (direct || hitWall || projectile.life <= 0) {
        const radius = projectile.kind === "rocket" ? 6 : 1.4;
        let registeredHit = false;
        for (const demon of demons.current) {
          const distance = demon.position.distanceTo(projectile.position);
          const damage = projectile.kind === "rocket" ? splashDamage(INFERNAL_WEAPONS.rocket.damage, distance, radius) : distance < radius ? INFERNAL_WEAPONS.plasma.damage : 0;
          if (!damage) continue;
          const result = applyDamage(demon.health, damage); demon.health = result.health; registeredHit = true;
          if (result.killed) { s.kills++; s.combo++; s.score += eliminationScore(demon.kind, s.combo); }
        }
        if (registeredHit) { s.hits++; s.lastHit = now; }
        demons.current = demons.current.filter((demon) => demon.health > 0);
        explode(projectile.position, projectile.kind === "rocket" ? "#ff3b00" : "#41e8ff", projectile.kind === "rocket" ? 2.4 : .8);
        audio.current?.impact(Boolean(direct), MathUtils.clamp((projectile.position.x - camera.position.x) / 18, -1, 1));
        projectile.life = -1;
      }
    }
    projectiles.current = projectiles.current.filter((projectile) => projectile.life > 0);

    s.spawnClock -= delta;
    if (s.spawnLeft > 0 && s.spawnClock <= 0 && demons.current.length < (coarse ? 9 : 15)) {
      const kind = demonForSpawn(s.wave, waveBudget(s.wave) - s.spawnLeft);
      const angle = (s.id * 2.399 + s.wave) % (Math.PI * 2);
      const distance = 20 + (s.id % 8);
      demons.current.push({ id: s.id++, kind, position: new Vector3(camera.position.x + Math.cos(angle) * distance, .1, camera.position.z + Math.sin(angle) * distance), health: DEMON_HEALTH[kind], phase: Math.random() * 6, nextAttack: s.elapsed + 1.2 });
      s.spawnLeft--; s.spawnClock = Math.max(.18, .72 - s.wave * .035);
    }
    if (s.spawnLeft === 0 && demons.current.length === 0) {
      s.wave++; s.spawnLeft = waveBudget(s.wave); s.health = Math.min(100, s.health + 18); s.ammo = weapon.magazine; s.reserve += Math.ceil(weapon.reserve * .3); audio.current?.wave();
    }

    for (const demon of demons.current) {
      const toPlayer = camera.position.clone().sub(demon.position); toPlayer.y = 0;
      const distance = toPlayer.length();
      const speed = demon.kind === "crawler" ? 4.6 : demon.kind === "wraith" ? 3.7 : 2.25;
      if (distance > 1.25) demon.position.add(toPlayer.normalize().multiplyScalar(speed * delta));
      if (distance < (demon.kind === "brute" ? 2.2 : 1.45) && s.elapsed >= demon.nextAttack) {
        s.health -= demon.kind === "brute" ? 19 : 8;
        demon.nextAttack = s.elapsed + (demon.kind === "crawler" ? .72 : 1.05);
        s.shake = .35; audio.current?.impact(false);
      }
    }
    if (s.health <= 0 || s.elapsed >= 210) {
      s.ended = true; audio.current?.death();
      onFinish({ score: s.score, kills: s.kills, wave: s.wave, accuracy: s.shots ? Math.round(s.hits / s.shots * 100) : 0 });
    }
    if (Math.floor(s.elapsed * 15) !== Math.floor((s.elapsed - delta) * 15)) {
      setRenderDemons([...demons.current]);
      setRenderProjectiles(projectiles.current.map((projectile) => ({ ...projectile, position: projectile.position.clone(), velocity: projectile.velocity.clone() })));
      setHud({ health: Math.max(0, s.health), ammo: s.ammo, reserve: s.reserve, weapon: s.weapon, heat: Math.min(100, s.heat), score: s.score, kills: s.kills, wave: s.wave, combo: s.combo, dash: s.dash, hit: now - s.lastHit < 90 });
    }
  });

  return (
    <>
      <ambientLight intensity={.16} color="#501000" />
      <pointLight castShadow={!coarse} shadow-mapSize={[512, 512]} position={[0, 8, 0]} intensity={90} distance={48} color="#ff3900" />
      <Arena />
      {renderDemons.map((demon) => <DemonModel key={demon.id} demon={demon} />)}
      {renderProjectiles.map((projectile) => <ProjectileModel key={projectile.id} projectile={projectile} />)}
      {bursts.map((burst) => <BurstModel key={burst.id} burst={burst} />)}
      <WeaponModel weapon={state.current.weapon} firing={performance.now() - state.current.lastShot < 70} />
    </>
  );
}

function Arena() {
  const pillars = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const angle = i / 22 * Math.PI * 2;
    return [Math.cos(angle) * 30, Math.sin(angle) * 30, 3 + i % 4] as const;
  }), []);
  const floorTexture = useMemo(() => makePixelTexture(["#160506", "#2a0908", "#0c0203", "#47110b"]), []);
  return <>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[36, 32]} /><meshStandardMaterial map={floorTexture} color="#8b5550" roughness={.86} metalness={.22} /></mesh>
    <mesh position={[0, -.06, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[8, 33, 48]} /><meshBasicMaterial color="#ff2600" transparent opacity={.12} blending={AdditiveBlending} /></mesh>
    {pillars.map(([x, z, h], i) => <group key={i} position={[x, h / 2, z]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.2, h, 2.2]} /><meshStandardMaterial map={floorTexture} color="#6f3935" metalness={.5} roughness={.65} /></mesh>
      <pointLight position={[0, h / 2, 0]} intensity={i % 3 === 0 ? 16 : 4} distance={9} color={i % 2 ? "#ff1900" : "#ff8a00"} />
    </group>)}
    {Array.from({ length: 28 }, (_, i) => <mesh key={i} position={[Math.cos(i * 1.7) * (10 + i % 18), .08, Math.sin(i * 1.7) * (10 + i % 18)]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[.15 + i % 4 * .05, 8]} /><meshBasicMaterial color="#ff3b00" transparent opacity={.65} />
    </mesh>)}
  </>;
}

function DemonModel({ demon }: { demon: Demon }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.copy(demon.position);
    ref.current.position.y = .15 + Math.sin(clock.elapsedTime * (demon.kind === "wraith" ? 5 : 2.5) + demon.phase) * .12;
    ref.current.rotation.y = Math.atan2(-demon.position.x, -demon.position.z);
  });
  const brute = demon.kind === "brute"; const wraith = demon.kind === "wraith";
  const color = brute ? "#650b05" : wraith ? "#421060" : "#7b1608";
  return <group ref={ref} scale={brute ? 1.65 : wraith ? .9 : 1}>
    <mesh castShadow position={[0, .85, 0]}><dodecahedronGeometry args={[.65, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.55} roughness={.75} flatShading /></mesh>
    <mesh castShadow position={[0, 1.55, 0]}><icosahedronGeometry args={[.44, 0]} /><meshStandardMaterial color="#250303" roughness={.9} flatShading /></mesh>
    <mesh position={[-.17, 1.63, -.38]}><sphereGeometry args={[.075, 6, 6]} /><meshBasicMaterial color="#ffba00" /></mesh>
    <mesh position={[.17, 1.63, -.38]}><sphereGeometry args={[.075, 6, 6]} /><meshBasicMaterial color="#ffba00" /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * .34, 2.02, 0]} rotation-z={side * -.5}><coneGeometry args={[.13, .75, 5]} /><meshStandardMaterial color="#160202" /></mesh>)}
    {!wraith && [-1, 1].map((side) => <mesh key={side} position={[side * .35, .2, 0]}><boxGeometry args={[.28, .85, .3]} /><meshStandardMaterial color="#360505" /></mesh>)}
    <pointLight position={[0, 1.4, -.45]} intensity={brute ? 6 : 2} distance={4} color="#ff3000" />
  </group>;
}

function ProjectileModel({ projectile }: { projectile: Projectile }) {
  const rocket = projectile.kind === "rocket";
  return <group position={projectile.position}>
    <mesh castShadow rotation-x={Math.PI / 2}>
      {rocket ? <cylinderGeometry args={[.11, .16, .75, 6]} /> : <icosahedronGeometry args={[.18, 0]} />}
      <meshStandardMaterial color={rocket ? "#2a211d" : "#72efff"} emissive={rocket ? "#ff3a00" : "#00b8ff"} emissiveIntensity={rocket ? 1.8 : 4} flatShading />
    </mesh>
    <pointLight intensity={rocket ? 10 : 6} distance={rocket ? 6 : 4} color={rocket ? "#ff3a00" : "#1ee8ff"} />
  </group>;
}

function BurstModel({ burst }: { burst: Burst }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.scale.addScalar(delta * 7);
    (ref.current.material as MeshBasicMaterial).opacity *= .82;
  });
  return <mesh ref={ref} position={burst.position}><icosahedronGeometry args={[burst.size, 1]} /><meshBasicMaterial color={burst.color} transparent opacity={.75} wireframe blending={AdditiveBlending} /></mesh>;
}

function WeaponModel({ weapon, firing }: { weapon: InfernalWeaponId; firing: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.position.y = -1.1 + Math.sin(clock.elapsedTime * 8) * .012; });
  const color = weapon === "rocket" ? "#6b2a16" : weapon === "plasma" ? "#164f60" : "#44302b";
  return <group ref={group} position={[.58, -1.1, -1.45]} rotation={[.02, -.08, 0]}>
    <mesh><boxGeometry args={[.38, .34, 1.65]} /><meshStandardMaterial color={color} metalness={.85} roughness={.26} /></mesh>
    <mesh position={[0, .04, -1.05]}><cylinderGeometry args={[.09, .13, 1.2, 8]} /><meshStandardMaterial color="#171717" metalness={1} /></mesh>
    {firing && <><pointLight position={[0, .05, -1.75]} intensity={35} distance={12} color="#ffb000" /><mesh position={[0, .05, -1.7]}><coneGeometry args={[.28, 1.1, 7]} /><meshBasicMaterial color="#fff2a0" transparent opacity={.9} /></mesh></>}
  </group>;
}

function makePixelTexture(colors: string[]) {
  const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16;
  const context = canvas.getContext("2d");
  if (context) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      context.fillStyle = colors[(x * 3 + y * 5 + ((x ^ y) % 3)) % colors.length];
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter; texture.minFilter = NearestFilter;
  texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping; texture.repeat.set(12, 12);
  return texture;
}

function createInfernalAudio() {
  let ctx: AudioContext | null = null; let timer = 0; let step = 0; let reverb: ConvolverNode | null = null; let muted = false;
  const tone = (frequency: number, duration: number, type: OscillatorType, gainValue: number, slide = 0, pan = 0, wet = .18) => {
    if (!ctx || muted) return; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    const panner = ctx.createStereoPanner(); panner.pan.value = MathUtils.clamp(pan, -1, 1);
    osc.type = type; osc.frequency.setValueAtTime(frequency, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(panner).connect(ctx.destination);
    if (reverb && wet > 0) { const wetGain = ctx.createGain(); wetGain.gain.value = wet; panner.connect(wetGain).connect(reverb); }
    osc.start(); osc.stop(ctx.currentTime + duration);
  };
  return {
    start() {
      ctx = new AudioContext(); void ctx.resume();
      reverb = ctx.createConvolver();
      const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 1.15), ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.8);
      }
      reverb.buffer = impulse; reverb.connect(ctx.destination);
      timer = window.setInterval(() => {
        const bass = [55, 55, 65.4, 49][step++ % 4]; tone(bass, .19, "sawtooth", .025, -15);
        if (step % 2 === 0) tone(bass * 4, .08, "square", .008, -60);
      }, 190);
    },
    setMuted(value: boolean) { muted = value; },
    stop() { clearInterval(timer); void ctx?.close(); ctx = null; },
    shot(id: InfernalWeaponId) { tone(id === "rocket" ? 72 : id === "scattergun" ? 85 : 145, id === "rocket" ? .42 : .12, "sawtooth", .12, -70, 0, id === "rocket" ? .42 : .16); },
    impact(kill: boolean, pan = 0) { tone(kill ? 48 : 90, kill ? .22 : .06, "square", .08, -30, pan, .5); },
    jump() { tone(110, .09, "sine", .03, 140); }, dash() { tone(180, .13, "sawtooth", .05, -130); },
    swap() { tone(320, .06, "square", .025, -80); }, reload() { tone(180, .07, "square", .03, 80); },
    wave() { tone(110, .5, "sawtooth", .05, 330); }, death() { tone(120, .8, "sawtooth", .08, -85); },
  };
}
