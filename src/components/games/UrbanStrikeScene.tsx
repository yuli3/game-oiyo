import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Line,
  LineBasicMaterial,
  LinearFilter,
  MathUtils,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
  type PointLight,
} from "three";
import {
  MATCH_SECONDS,
  SCORE_LIMIT,
  WEAPONS,
  damageForHit,
  directionFromAim,
  finishReload,
  formatMatchTime,
  recoilAt,
  reloadDuration,
  resolveHitscan,
  scoreForElimination,
  shotIntervalMs,
  spreadFor,
  type WeaponId,
} from "../../lib/games/urban-strike";

export interface UrbanStrikeSceneCopy {
  blue: string;
  red: string;
  score: string;
  ammo: string;
  reserve: string;
  health: string;
  armor: string;
  objective: string;
  capture: string;
  contested: string;
  hold: string;
  reload: string;
  respawn: string;
  headshot: string;
  eliminated: string;
  assist: string;
  pointer: string;
  paused: string;
  m4: string;
  ak: string;
  mp5: string;
  fire: string;
  ads: string;
  jump: string;
  crouch: string;
  weapon: string;
}

export interface MatchResult {
  score: number;
  kills: number;
  deaths: number;
  accuracy: number;
  blueScore: number;
  redScore: number;
}

interface Props {
  copy: UrbanStrikeSceneCopy;
  onFinish: (result: MatchResult) => void;
}

interface HudState {
  health: number;
  armor: number;
  ammo: number;
  reserve: number;
  weapon: WeaponId;
  score: number;
  kills: number;
  deaths: number;
  shots: number;
  hits: number;
  blueScore: number;
  redScore: number;
  time: number;
  objective: "hold" | "capture" | "contested";
  reloadProgress: number;
  respawn: number;
  hitMarker: "" | "body" | "head";
  damageFlash: number;
  crosshair: number;
  radar: Array<{ x: number; y: number; alive: boolean }>;
  killfeed: KillFeedEntry[];
}

interface KillFeedEntry {
  id: number;
  killer: string;
  victim: string;
  blue: boolean;
  headshot?: boolean;
}

interface Controls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  fire: boolean;
  fireTap: boolean;
  ads: boolean;
  reload: boolean;
  switchTo: WeaponId | null;
  lookX: number;
  lookY: number;
}

const initialControls = (): Controls => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
  jump: false,
  fire: false,
  fireTap: false,
  ads: false,
  reload: false,
  switchTo: null,
  lookX: 0,
  lookY: 0,
});

const initialHud = (): HudState => ({
  health: 100,
  armor: 50,
  ammo: WEAPONS.m4.magazine,
  reserve: WEAPONS.m4.startingReserve,
  weapon: "m4",
  score: 0,
  kills: 0,
  deaths: 0,
  shots: 0,
  hits: 0,
  blueScore: 0,
  redScore: 0,
  time: MATCH_SECONDS,
  objective: "hold",
  reloadProgress: 0,
  respawn: 0,
  hitMarker: "",
  damageFlash: 0,
  crosshair: 8,
  radar: [],
  killfeed: [],
});

export default function UrbanStrikeScene({ copy, onFinish }: Props) {
  const controls = useRef<Controls>(initialControls());
  const [hud, setHud] = useState<HudState>(initialHud);
  const [coarse, setCoarse] = useState(false);
  const [locked, setLocked] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const leftPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const update = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", update);
    return () => document.removeEventListener("pointerlockchange", update);
  }, []);

  const requestLock = useCallback(() => {
    if (coarse || fallbackActive) return;
    const canvas = rootRef.current?.querySelector("canvas");
    if (!canvas?.requestPointerLock) {
      setFallbackActive(true);
      return;
    }
    try {
      const request = canvas.requestPointerLock();
      if (request && "catch" in request) {
        void request.catch(() => setFallbackActive(true));
      }
      window.setTimeout(() => {
        if (!document.pointerLockElement) setFallbackActive(true);
      }, 300);
    } catch {
      setFallbackActive(true);
    }
  }, [coarse, fallbackActive]);

  const press = useCallback((key: keyof Pick<Controls, "fire" | "ads" | "jump" | "crouch" | "reload">, value: boolean) => {
    controls.current[key] = value;
  }, []);

  const startMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    leftPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, []);

  const moveStick = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = leftPointer.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = Math.max(-42, Math.min(42, event.clientX - start.x));
    const dy = Math.max(-42, Math.min(42, event.clientY - start.y));
    controls.current.left = dx < -9;
    controls.current.right = dx > 9;
    controls.current.forward = dy < -9;
    controls.current.backward = dy > 9;
    controls.current.sprint = dy < -30;
  }, []);

  const endMove = useCallback(() => {
    leftPointer.current = null;
    controls.current.left = false;
    controls.current.right = false;
    controls.current.forward = false;
    controls.current.backward = false;
    controls.current.sprint = false;
  }, []);

  const startLook = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, []);

  const moveLook = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = lookPointer.current;
    if (!previous || previous.id !== event.pointerId) return;
    controls.current.lookX += event.clientX - previous.x;
    controls.current.lookY += event.clientY - previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;
  }, []);

  const cycleWeapon = useCallback(() => {
    controls.current.switchTo = hud.weapon === "m4" ? "ak" : hud.weapon === "ak" ? "mp5" : "m4";
  }, [hud.weapon]);

  const weaponLabel = copy[hud.weapon];
  const accuracy = hud.shots ? Math.round((hud.hits / hud.shots) * 100) : 0;
  const objectiveLabel = hud.objective === "capture" ? copy.capture : hud.objective === "contested" ? copy.contested : copy.hold;
  const dead = hud.respawn > 0;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#080b0e] text-white [touch-action:none]"
      onClick={requestLock}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Canvas
        shadows={coarse ? false : "percentage"}
        dpr={coarse ? 1 : [1, 1.5]}
        camera={{ fov: 72, near: 0.06, far: 180, position: [0, 1.72, 16] }}
        gl={{ antialias: !coarse, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0b1015");
        }}
      >
        <CombatScene
          controls={controls}
          active={coarse || locked || fallbackActive}
          coarse={coarse}
          copy={copy}
          setHud={setHud}
          onFinish={onFinish}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_48%,rgba(0,0,0,.52)_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 bg-red-700 transition-opacity duration-100"
        style={{ opacity: hud.damageFlash * 0.24 }}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-3 sm:p-5">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
          <span className="size-2 rounded-full bg-lime-400 shadow-[0_0_9px_#a3e635]" />
          <span className="font-mono text-[10px] font-black tracking-[.18em] text-slate-300">{copy.objective}</span>
          <strong className={`font-mono text-[10px] ${hud.objective === "contested" ? "text-amber-300" : "text-white"}`}>{objectiveLabel}</strong>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/55 px-4 py-2 text-center backdrop-blur-sm">
          <div className="flex items-center gap-5 font-mono text-xl font-black">
            <span className="text-sky-300">{hud.blueScore}</span>
            <span className="text-sm text-white">{formatMatchTime(hud.time)}</span>
            <span className="text-red-300">{hud.redScore}</span>
          </div>
          <div className="flex justify-between text-[8px] font-black tracking-[.22em] text-slate-400">
            <span>{copy.blue}</span><span>{copy.red}</span>
          </div>
        </div>

        <div className="w-32 space-y-1 text-right sm:w-52">
          {hud.killfeed.map((entry) => (
            <div key={entry.id} className="truncate rounded bg-black/45 px-2 py-1 font-mono text-[9px] backdrop-blur-sm">
              <span className={entry.blue ? "text-sky-300" : "text-red-300"}>{entry.killer}</span>
              <span className="mx-1 text-slate-500">{entry.headshot ? "◆" : "›"}</span>
              <span className="text-white">{entry.victim}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="pointer-events-none absolute left-4 top-20 hidden size-28 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm sm:block">
        <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300" />
        <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-white/5" />
        <div className="absolute left-1/2 top-1/2 h-full w-px -translate-y-1/2 bg-white/5" />
        {hud.radar.map((dot, index) => (
          <span
            key={index}
            className="absolute size-1.5 rounded-full bg-red-400 shadow-[0_0_5px_#f87171]"
            style={{ left: `${50 + dot.x * 42}%`, top: `${50 + dot.y * 42}%`, opacity: dot.alive ? 1 : 0.2 }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Crosshair spread={hud.crosshair} hit={hud.hitMarker} />
      </div>

      {hud.reloadProgress > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-[60%] w-36 -translate-x-1/2 text-center">
          <p className="mb-1 font-mono text-[9px] font-black tracking-[.2em] text-white">{copy.reload}</p>
          <div className="h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-lime-400" style={{ width: `${hud.reloadProgress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-6">
        <div className="min-w-36 rounded-xl border border-white/10 bg-black/48 p-3 backdrop-blur-sm">
          <Bar label={copy.health} value={hud.health} color="bg-lime-400" />
          <Bar label={copy.armor} value={hud.armor * 2} display={hud.armor} color="bg-sky-400" />
          <div className="mt-2 flex gap-4 font-mono text-[9px] text-slate-400">
            <span>K {hud.kills}</span><span>D {hud.deaths}</span><span>ACC {accuracy}%</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/48 px-4 py-3 text-right backdrop-blur-sm">
          <p className="font-mono text-[9px] font-black tracking-[.16em] text-lime-300">{weaponLabel}</p>
          <p className="font-mono text-3xl font-black leading-none text-white">
            {hud.ammo}<span className="text-base text-slate-500"> / {hud.reserve}</span>
          </p>
          <p className="mt-1 font-mono text-[9px] text-slate-400">{copy.score} {hud.score.toLocaleString()}</p>
        </div>
      </div>

      {!coarse && !locked && !fallbackActive && !dead && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); requestLock(); }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/58 text-center backdrop-blur-[2px]"
        >
          <span className="rounded-lg border border-lime-300/30 bg-black/50 px-5 py-3 font-mono text-xs font-black uppercase tracking-[.18em] text-lime-300">
            {copy.paused}
          </span>
          <span className="text-xs text-slate-300">{copy.pointer}</span>
        </button>
      )}

      {dead && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-red-950/35">
          <p className="font-mono text-xl font-black uppercase tracking-[.24em] text-white">
            {copy.respawn} {Math.ceil(hud.respawn)}
          </p>
        </div>
      )}

      {coarse && (
        <>
          <div
            aria-label="movement control"
            className="absolute bottom-24 left-4 z-30 size-28 rounded-full border border-white/15 bg-black/30"
            onPointerDown={startMove}
            onPointerMove={moveStick}
            onPointerUp={endMove}
            onPointerCancel={endMove}
          >
            <span className="pointer-events-none absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/10" />
          </div>
          <div
            aria-label="look control"
            className="absolute inset-y-20 right-0 z-10 w-[62%]"
            onPointerDown={startLook}
            onPointerMove={moveLook}
            onPointerUp={() => { lookPointer.current = null; }}
            onPointerCancel={() => { lookPointer.current = null; }}
          />
          <div className="absolute bottom-24 right-4 z-30 grid grid-cols-3 gap-2">
            <TouchButton label={copy.reload} onDown={() => press("reload", true)} onUp={() => press("reload", false)}>R</TouchButton>
            <TouchButton label={copy.jump} onDown={() => press("jump", true)} onUp={() => press("jump", false)}>{copy.jump}</TouchButton>
            <TouchButton label={copy.crouch} onDown={() => press("crouch", true)} onUp={() => press("crouch", false)}>{copy.crouch}</TouchButton>
            <TouchButton label={copy.weapon} onDown={cycleWeapon} onUp={() => undefined}>1›</TouchButton>
            <TouchButton label={copy.ads} onDown={() => press("ads", true)} onUp={() => press("ads", false)} active={controls.current.ads}>{copy.ads}</TouchButton>
            <TouchButton label={copy.fire} onDown={() => press("fire", true)} onUp={() => press("fire", false)} accent>{copy.fire}</TouchButton>
          </div>
        </>
      )}
    </div>
  );
}

function Crosshair({ spread, hit }: { spread: number; hit: HudState["hitMarker"] }) {
  const color = hit ? (hit === "head" ? "#fde047" : "#ffffff") : "rgba(255,255,255,.9)";
  const arm = 7;
  return (
    <div className="relative size-1" style={{ color }}>
      <span className="absolute h-px bg-current" style={{ width: arm, right: spread }} />
      <span className="absolute h-px bg-current" style={{ width: arm, left: spread }} />
      <span className="absolute w-px bg-current" style={{ height: arm, bottom: spread }} />
      <span className="absolute w-px bg-current" style={{ height: arm, top: spread }} />
      {hit && (
        <>
          <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
          <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
        </>
      )}
    </div>
  );
}

function Bar({ label, value, display, color }: { label: string; value: number; display?: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between font-mono text-[9px] font-bold text-slate-300">
        <span>{label}</span><span>{display ?? Math.round(value)}</span>
      </div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function TouchButton({
  label,
  children,
  onDown,
  onUp,
  accent = false,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  onDown: () => void;
  onUp: () => void;
  accent?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); onDown(); }}
      onPointerUp={(event) => { event.stopPropagation(); onUp(); }}
      onPointerCancel={onUp}
      className={`size-12 rounded-full border text-[10px] font-black ${accent ? "border-red-300/50 bg-red-500/55" : active ? "border-lime-300/60 bg-lime-400/30" : "border-white/20 bg-black/45"} text-white backdrop-blur-sm`}
    >
      {children}
    </button>
  );
}

interface BotState {
  id: string;
  name: string;
  position: Vector3;
  health: number;
  deadUntil: number;
  nextShot: number;
  strafe: number;
  phase: number;
}

interface TracerState {
  line: Line;
  expires: number;
}

interface CombatSceneProps {
  controls: { current: Controls };
  active: boolean;
  coarse: boolean;
  copy: UrbanStrikeSceneCopy;
  setHud: Dispatch<SetStateAction<HudState>>;
  onFinish: (result: MatchResult) => void;
}

const ENEMY_NAMES = ["VIPER", "NOMAD", "KILO", "RAZOR", "GHOST", "MERCURY"];
const ALLY_NAMES = ["ECHO", "ATLAS", "ROOK", "MIRA", "BISHOP"];
const ENEMY_SPAWNS = [
  [-18, -23], [2, -29], [21, -19], [-24, -2], [25, 7], [10, -16],
] as const;
const PLAYER_SPAWNS = [[0, 18], [-8, 20], [9, 18]] as const;

function CombatScene({ controls, active, coarse, copy, setHud, onFinish }: CombatSceneProps) {
  const { camera, gl } = useThree();
  const bots = useRef<BotState[]>(createBots());
  const botGroups = useRef<Array<Group | null>>([]);
  const player = useRef(new Vector3(0, 1.72, 18));
  const yaw = useRef(0);
  const pitch = useRef(0);
  const verticalVelocity = useRef(0);
  const jumpHeight = useRef(0);
  const wasJumping = useRef(false);
  const weapon = useRef<WeaponId>("m4");
  const [weaponView, setWeaponView] = useState<WeaponId>("m4");
  const ammo = useRef<Record<WeaponId, { magazine: number; reserve: number }>>({
    m4: { magazine: WEAPONS.m4.magazine, reserve: WEAPONS.m4.startingReserve },
    ak: { magazine: WEAPONS.ak.magazine, reserve: WEAPONS.ak.startingReserve },
    mp5: { magazine: WEAPONS.mp5.magazine, reserve: WEAPONS.mp5.startingReserve },
  });
  const health = useRef(100);
  const armor = useRef(50);
  const score = useRef(0);
  const kills = useRef(0);
  const deaths = useRef(0);
  const shots = useRef(0);
  const hits = useRef(0);
  const streak = useRef(0);
  const blueScore = useRef(0);
  const redScore = useRef(0);
  const elapsed = useRef(0);
  const finished = useRef(false);
  const lastShot = useRef(-1_000);
  const shotIndex = useRef(0);
  const recoilPitch = useRef(0);
  const recoilYaw = useRef(0);
  const reload = useRef<{ started: number; duration: number } | null>(null);
  const respawnUntil = useRef(0);
  const hitUntil = useRef(0);
  const headshotUntil = useRef(0);
  const damageUntil = useRef(0);
  const muzzleUntil = useRef(0);
  const objectiveTick = useRef(0);
  const nextSimulation = useRef(3.4);
  const nextFootstep = useRef(0);
  const lastHud = useRef(0);
  const lastFrameNow = useRef(performance.now());
  const killfeed = useRef<KillFeedEntry[]>([]);
  const feedId = useRef(0);
  const weaponGroup = useRef<Group>(null);
  const muzzleFlash = useRef<Mesh>(null);
  const muzzleLight = useRef<PointLight>(null);
  const audio = useRef<CombatAudio | null>(null);
  const tracerPool = useMemo<TracerState[]>(() => createTracerPool(), []);
  const tempPosition = useMemo(() => new Vector3(), []);
  const tempQuaternion = useMemo(() => new Quaternion(), []);
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    (camera as PerspectiveCamera).rotation.order = "YXZ";
    gl.domElement.setAttribute("aria-label", copy.pointer);
  }, [camera, copy.pointer, gl.domElement]);

  useEffect(() => {
    audio.current = new CombatAudio();
    return () => {
      audio.current?.close();
      audio.current = null;
      for (const tracer of tracerPool) {
        tracer.line.geometry.dispose();
        (tracer.line.material as LineBasicMaterial).dispose();
      }
    };
  }, [tracerPool]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent, down: boolean) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "KeyC", "ControlLeft", "KeyF", "KeyR", "Digit1", "Digit2", "Digit3"].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === "KeyW") controls.current.forward = down;
      if (event.code === "KeyS") controls.current.backward = down;
      if (event.code === "KeyA") controls.current.left = down;
      if (event.code === "KeyD") controls.current.right = down;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") controls.current.sprint = down;
      if (event.code === "Space") controls.current.jump = down;
      if (event.code === "KeyC" || event.code === "ControlLeft") controls.current.crouch = down;
      if (down && event.code === "KeyR") controls.current.reload = true;
      if (down && event.code === "KeyF") controls.current.fireTap = true;
      if (down && event.code === "Digit1") controls.current.switchTo = "m4";
      if (down && event.code === "Digit2") controls.current.switchTo = "ak";
      if (down && event.code === "Digit3") controls.current.switchTo = "mp5";
    };
    const keyDown = (event: KeyboardEvent) => handleKey(event, true);
    const keyUp = (event: KeyboardEvent) => handleKey(event, false);
    const mouseMove = (event: MouseEvent) => {
      if (!document.pointerLockElement && !(active && !coarse && event.buttons > 0)) return;
      controls.current.lookX += event.movementX;
      controls.current.lookY += event.movementY;
    };
    const mouseDown = (event: MouseEvent) => {
      if (!document.pointerLockElement && !active) return;
      if (event.button === 0) controls.current.fire = true;
      if (event.button === 2) controls.current.ads = true;
      audio.current?.resume();
    };
    const mouseUp = (event: MouseEvent) => {
      if (event.button === 0) controls.current.fire = false;
      if (event.button === 2) controls.current.ads = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mousedown", mouseDown);
    document.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mousedown", mouseDown);
      document.removeEventListener("mouseup", mouseUp);
    };
  }, [active, coarse, controls]);

  const addFeed = useCallback((killer: string, victim: string, isBlue: boolean, headshot = false) => {
    killfeed.current = [
      { id: ++feedId.current, killer, victim, blue: isBlue, headshot },
      ...killfeed.current,
    ].slice(0, 4);
  }, []);

  const startReload = useCallback((now: number) => {
    const spec = WEAPONS[weapon.current];
    const current = ammo.current[weapon.current];
    if (reload.current || current.magazine >= spec.magazine || current.reserve <= 0 || respawnUntil.current > now) return;
    reload.current = { started: now, duration: reloadDuration(spec, current.magazine) };
    shotIndex.current = 0;
    audio.current?.reload(player.current);
  }, []);

  const switchWeapon = useCallback((next: WeaponId) => {
    if (next === weapon.current) return;
    weapon.current = next;
    setWeaponView(next);
    reload.current = null;
    shotIndex.current = 0;
    recoilPitch.current = 0;
    recoilYaw.current = 0;
    audio.current?.switchWeapon();
  }, []);

  const spawnTracer = useCallback((start: Vector3, end: Vector3, now: number) => {
    const tracer = tracerPool.reduce((oldest, candidate) => candidate.expires < oldest.expires ? candidate : oldest);
    tracer.line.geometry.setFromPoints([start, end]);
    tracer.line.geometry.computeBoundingSphere();
    tracer.expires = now + 0.065;
    tracer.line.visible = true;
  }, [tracerPool]);

  const fireShot = useCallback((now: number, moving: boolean, sprinting: boolean) => {
    const id = weapon.current;
    const spec = WEAPONS[id];
    const currentAmmo = ammo.current[id];
    if (respawnUntil.current > now || reload.current || sprinting || now - lastShot.current < shotIntervalMs(spec)) return;
    if (currentAmmo.magazine <= 0) {
      startReload(now);
      return;
    }

    currentAmmo.magazine -= 1;
    lastShot.current = now;
    shots.current += 1;
    const pattern = recoilAt(spec, shotIndex.current++);
    recoilPitch.current += pattern[0] * 0.009;
    recoilYaw.current += pattern[1] * 0.008;
    const spread = spreadFor(spec, {
      ads: controls.current.ads,
      moving,
      sprinting,
      crouched: controls.current.crouch,
    });
    const direction = directionFromAim(
      yaw.current + recoilYaw.current,
      pitch.current + recoilPitch.current,
      spread,
      (shots.current * 2_654_435_761) ^ Math.floor(now * 1000),
    );
    const origin = { x: player.current.x, y: player.current.y, z: player.current.z };
    const targets = bots.current.map((bot) => ({
      id: bot.id,
      alive: bot.deadUntil <= now,
      body: { x: bot.position.x, y: 1.03, z: bot.position.z },
      bodyRadius: 0.43,
      head: { x: bot.position.x, y: 1.69, z: bot.position.z },
      headRadius: 0.21,
    }));
    const hit = resolveHitscan(origin, direction, targets, 105);
    const end = new Vector3(
      origin.x + direction.x * (hit?.distance ?? 90),
      origin.y + direction.y * (hit?.distance ?? 90),
      origin.z + direction.z * (hit?.distance ?? 90),
    );
    const muzzle = weaponGroup.current
      ? weaponGroup.current.localToWorld(new Vector3(0.01, -0.005, -0.98))
      : player.current.clone();
    spawnTracer(muzzle, end, now);
    muzzleUntil.current = now + (prefersReducedMotion ? 0.025 : 0.055);
    audio.current?.gunshot(id, player.current);

    if (!hit) return;
    hits.current += 1;
    hitUntil.current = now + 0.13;
    if (hit.zone === "head") headshotUntil.current = now + 0.18;
    const bot = bots.current.find((entry) => entry.id === hit.id);
    if (!bot) return;
    bot.health -= damageForHit(spec, hit.zone, hit.distance);
    audio.current?.impact(end);
    if (bot.health > 0) return;

    bot.health = 0;
    bot.deadUntil = now + 2.7;
    kills.current += 1;
    streak.current += 1;
    blueScore.current += 1;
    score.current += scoreForElimination(hit.zone, streak.current);
    addFeed("YOU", bot.name, true, hit.zone === "head");
    if (botGroups.current[Number(bot.id)]) botGroups.current[Number(bot.id)]!.visible = false;
  }, [addFeed, controls, prefersReducedMotion, spawnTracer, startReload]);

  useFrame((_state, frameDelta) => {
    if (finished.current) return;
    const delta = Math.min(frameDelta, 0.05);
    const now = performance.now() / 1000;
    const desktopPaused = !coarse && !active;
    if (desktopPaused) {
      lastFrameNow.current = performance.now();
      return;
    }
    audio.current?.resume();

    elapsed.current += delta;
    const remaining = Math.max(0, MATCH_SECONDS - elapsed.current);

    const input = controls.current;
    yaw.current -= input.lookX * (coarse ? 0.0042 : 0.00175);
    pitch.current -= input.lookY * (coarse ? 0.0036 : 0.00155);
    input.lookX = 0;
    input.lookY = 0;
    pitch.current = MathUtils.clamp(pitch.current, -1.22, 1.22);

    if (input.switchTo) {
      switchWeapon(input.switchTo);
      input.switchTo = null;
    }
    if (input.reload) {
      startReload(now);
      input.reload = false;
    }

    if (reload.current && now * 1000 >= reload.current.started * 1000 + reload.current.duration) {
      const id = weapon.current;
      ammo.current[id] = finishReload(WEAPONS[id], ammo.current[id].magazine, ammo.current[id].reserve);
      reload.current = null;
    }

    if (respawnUntil.current > now) {
      controls.current.fire = false;
      controls.current.fireTap = false;
      if (now >= respawnUntil.current - delta) {
        const spawn = PLAYER_SPAWNS[deaths.current % PLAYER_SPAWNS.length];
        player.current.set(spawn[0], 1.72, spawn[1]);
        health.current = 100;
        armor.current = 50;
        streak.current = 0;
      }
    } else {
      const xInput = Number(input.right) - Number(input.left);
      const zInput = Number(input.forward) - Number(input.backward);
      const moving = xInput !== 0 || zInput !== 0;
      const sprinting = Boolean(input.sprint && input.forward && !input.ads && !input.crouch && !input.fire);
      const speed = WEAPONS[weapon.current].moveSpeed * (sprinting ? 1.52 : input.crouch ? 0.55 : input.ads ? 0.72 : 1);
      if (moving) {
        const length = Math.hypot(xInput, zInput) || 1;
        const forwardX = -Math.sin(yaw.current);
        const forwardZ = -Math.cos(yaw.current);
        const rightX = Math.cos(yaw.current);
        const rightZ = -Math.sin(yaw.current);
        const dx = ((forwardX * zInput + rightX * xInput) / length) * speed * delta;
        const dz = ((forwardZ * zInput + rightZ * xInput) / length) * speed * delta;
        moveWithCollision(player.current, dx, dz);
        if (now >= nextFootstep.current) {
          audio.current?.footstep(player.current, sprinting);
          nextFootstep.current = now + (sprinting ? 0.28 : 0.42);
        }
      }

      if (input.jump && !wasJumping.current && jumpHeight.current <= 0.001 && !input.crouch) {
        verticalVelocity.current = 5.15;
      }
      wasJumping.current = input.jump;
      verticalVelocity.current -= 13.6 * delta;
      jumpHeight.current = Math.max(0, jumpHeight.current + verticalVelocity.current * delta);
      if (jumpHeight.current <= 0) verticalVelocity.current = 0;

      const stanceHeight = input.crouch ? 1.18 : 1.72;
      player.current.y = MathUtils.lerp(player.current.y, stanceHeight + jumpHeight.current, Math.min(1, delta * 15));

      if (input.fire || input.fireTap) fireShot(now, moving, sprinting);
      input.fireTap = false;
    }

    const firing = input.fire && !reload.current;
    const recovery = firing ? 2.4 : 10.5;
    recoilPitch.current = MathUtils.lerp(recoilPitch.current, 0, Math.min(1, delta * recovery));
    recoilYaw.current = MathUtils.lerp(recoilYaw.current, 0, Math.min(1, delta * recovery));
    if (!firing && now - lastShot.current > 0.28) shotIndex.current = 0;

    const bob = !prefersReducedMotion && (input.forward || input.backward || input.left || input.right)
      ? Math.sin(elapsed.current * (input.sprint ? 15 : 10)) * (input.sprint ? 0.025 : 0.012)
      : 0;
    camera.position.set(player.current.x, player.current.y + bob, player.current.z);
    camera.rotation.set(pitch.current + recoilPitch.current, yaw.current + recoilYaw.current, 0, "YXZ");
    const cameraObject = camera as PerspectiveCamera;
    const targetFov = input.ads ? WEAPONS[weapon.current].adsFov : input.sprint ? 77 : 72;
    cameraObject.fov = MathUtils.lerp(cameraObject.fov, targetFov, Math.min(1, delta * 12));
    cameraObject.updateProjectionMatrix();
    audio.current?.setListener(player.current, yaw.current, pitch.current);

    if (weaponGroup.current) {
      const reloadProgress = reload.current
        ? MathUtils.clamp(((now * 1000) - reload.current.started * 1000) / reload.current.duration, 0, 1)
        : 0;
      const adsAmount = input.ads ? 1 : 0;
      const sprintAmount = input.sprint && input.forward ? 1 : 0;
      const reloadDrop = reloadProgress ? Math.sin(reloadProgress * Math.PI) : 0;
      tempPosition.set(
        MathUtils.lerp(0.22, 0.002, adsAmount),
        MathUtils.lerp(-0.17, -0.11, adsAmount) - sprintAmount * 0.09 - reloadDrop * 0.12,
        MathUtils.lerp(-0.58, -0.48, adsAmount) + recoilPitch.current * 1.5,
      );
      tempPosition.applyQuaternion(camera.quaternion).add(camera.position);
      weaponGroup.current.position.copy(tempPosition);
      tempQuaternion.copy(camera.quaternion);
      weaponGroup.current.quaternion.copy(tempQuaternion);
      weaponGroup.current.rotateZ(
        reloadProgress
          ? Math.sin(reloadProgress * Math.PI) * -0.72
          : sprintAmount * -0.28 + recoilYaw.current * 1.8,
      );
      weaponGroup.current.rotateX(reloadDrop * 0.18);
    }

    if (muzzleFlash.current) muzzleFlash.current.visible = now < muzzleUntil.current;
    if (muzzleLight.current) muzzleLight.current.intensity = now < muzzleUntil.current ? 5.5 : 0;
    for (const tracer of tracerPool) {
      if (tracer.expires <= now) tracer.line.visible = false;
      else (tracer.line.material as LineBasicMaterial).opacity = Math.max(0, (tracer.expires - now) / 0.065);
    }

    let enemiesAtObjective = 0;
    for (let index = 0; index < bots.current.length; index += 1) {
      const bot = bots.current[index];
      const group = botGroups.current[index];
      if (bot.deadUntil > now) {
        if (group) group.visible = false;
        continue;
      }
      if (bot.health <= 0) {
        const spawn = ENEMY_SPAWNS[(index + Math.floor(elapsed.current)) % ENEMY_SPAWNS.length];
        bot.position.set(spawn[0], 0, spawn[1]);
        bot.health = 100;
        if (group) group.visible = true;
      }

      const distanceToPlayer = bot.position.distanceTo(tempPosition.set(player.current.x, 0, player.current.z));
      const dx = player.current.x - bot.position.x;
      const dz = player.current.z - bot.position.z;
      const targetAngle = Math.atan2(dx, dz);
      const desiredRange = 10 + index * 1.5;
      const move = distanceToPlayer > desiredRange ? 1 : distanceToPlayer < 5 ? -0.6 : 0;
      const botSpeed = 1.45 + (index % 3) * 0.15;
      const botDx = (Math.sin(targetAngle) * move + Math.cos(targetAngle) * bot.strafe * 0.36) * botSpeed * delta;
      const botDz = (Math.cos(targetAngle) * move - Math.sin(targetAngle) * bot.strafe * 0.36) * botSpeed * delta;
      moveWithCollision(bot.position, botDx, botDz, 0.36);
      if (group) {
        group.position.set(bot.position.x, Math.sin(elapsed.current * 7 + bot.phase) * 0.02, bot.position.z);
        group.rotation.y = targetAngle;
      }
      if (bot.position.length() < 5.2) enemiesAtObjective += 1;

      if (distanceToPlayer < 43 && now >= bot.nextShot && respawnUntil.current <= now) {
        bot.nextShot = now + 0.52 + ((index * 0.17 + elapsed.current * 0.13) % 0.5);
        audio.current?.enemyShot(bot.position);
        const accuracyChance = Math.max(0.12, 0.40 - distanceToPlayer * 0.0075 - (input.sprint ? 0.1 : 0));
        const roll = (Math.sin(now * 17.73 + index * 8.12) + 1) / 2;
        if (roll < accuracyChance) {
          let damage = 5 + (index % 3);
          const absorbed = Math.min(armor.current, Math.ceil(damage * 0.58));
          armor.current -= absorbed;
          damage -= absorbed;
          health.current -= damage;
          damageUntil.current = now + 0.22;
          if (health.current <= 0) {
            deaths.current += 1;
            redScore.current += 1;
            streak.current = 0;
            health.current = 0;
            respawnUntil.current = now + 2.2;
            addFeed(bot.name, "YOU", false);
          }
        }
      }
    }

    const atObjective = Math.hypot(player.current.x, player.current.z) < 5.2;
    let objective: HudState["objective"] = "hold";
    if (atObjective && enemiesAtObjective > 0) {
      objective = "contested";
    } else if (atObjective) {
      objective = "capture";
      objectiveTick.current += delta;
      if (objectiveTick.current >= 4) {
        objectiveTick.current = 0;
        blueScore.current += 1;
        score.current += 75;
      }
    } else {
      objectiveTick.current = Math.max(0, objectiveTick.current - delta * 0.5);
    }

    if (elapsed.current >= nextSimulation.current) {
      const blueEvent = Math.sin(elapsed.current * 2.17) > -0.12;
      const ally = ALLY_NAMES[Math.floor(elapsed.current * 1.7) % ALLY_NAMES.length];
      const enemy = ENEMY_NAMES[Math.floor(elapsed.current * 2.3) % ENEMY_NAMES.length];
      if (blueEvent) {
        blueScore.current += 1;
        addFeed(ally, enemy, true, Math.sin(elapsed.current * 3.1) > 0.65);
      } else {
        redScore.current += 1;
        addFeed(enemy, ally, false);
      }
      nextSimulation.current += 3.2 + ((Math.sin(elapsed.current) + 1) * 0.9);
    }

    const shouldFinish = remaining <= 0 || blueScore.current >= SCORE_LIMIT || redScore.current >= SCORE_LIMIT;
    if (shouldFinish) {
      finished.current = true;
      document.exitPointerLock?.();
      onFinish({
        score: score.current,
        kills: kills.current,
        deaths: deaths.current,
        accuracy: shots.current ? Math.round((hits.current / shots.current) * 100) : 0,
        blueScore: blueScore.current,
        redScore: redScore.current,
      });
      return;
    }

    if (now - lastHud.current >= 0.075) {
      lastHud.current = now;
      const id = weapon.current;
      const currentAmmo = ammo.current[id];
      const reloading = reload.current
        ? MathUtils.clamp(((now * 1000) - reload.current.started * 1000) / reload.current.duration, 0, 1)
        : 0;
      const currentSpread = spreadFor(WEAPONS[id], {
        ads: input.ads,
        moving: input.forward || input.backward || input.left || input.right,
        sprinting: input.sprint,
        crouched: input.crouch,
      });
      const cos = Math.cos(-yaw.current);
      const sin = Math.sin(-yaw.current);
      const radar = bots.current.map((bot) => {
        const dx = (bot.position.x - player.current.x) / 36;
        const dz = (bot.position.z - player.current.z) / 36;
        return {
          x: Math.max(-1, Math.min(1, dx * cos - dz * sin)),
          y: Math.max(-1, Math.min(1, dx * sin + dz * cos)),
          alive: bot.deadUntil <= now,
        };
      });
      setHud({
        health: health.current,
        armor: armor.current,
        ammo: currentAmmo.magazine,
        reserve: currentAmmo.reserve,
        weapon: id,
        score: score.current,
        kills: kills.current,
        deaths: deaths.current,
        shots: shots.current,
        hits: hits.current,
        blueScore: blueScore.current,
        redScore: redScore.current,
        time: remaining,
        objective,
        reloadProgress: reloading,
        respawn: Math.max(0, respawnUntil.current - now),
        hitMarker: now < hitUntil.current ? (now < headshotUntil.current ? "head" : "body") : "",
        damageFlash: now < damageUntil.current ? (damageUntil.current - now) / 0.22 : 0,
        crosshair: MathUtils.clamp(5 + currentSpread * 520, 6, 22),
        radar,
        killfeed: killfeed.current,
      });
    }
  });

  return (
    <>
      <fog attach="fog" args={["#222a30", 42, 128]} />
      <ambientLight intensity={0.52} color="#b8c4cc" />
      <hemisphereLight args={["#9db1c0", "#3c352b", 0.84]} />
      <directionalLight
        castShadow={!coarse}
        position={[-24, 35, 18]}
        intensity={3.2}
        color="#f8d8ad"
        shadow-mapSize-width={coarse ? 512 : 1024}
        shadow-mapSize-height={coarse ? 512 : 1024}
        shadow-camera-near={1}
        shadow-camera-far={95}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
      />
      <UrbanWorld coarse={coarse} />
      {bots.current.map((bot, index) => (
        <BotSoldier
          key={bot.id}
          ref={(group) => { botGroups.current[index] = group; }}
          name={bot.name}
          position={bot.position}
          phase={bot.phase}
          coarse={coarse}
        />
      ))}
      <WeaponModel ref={weaponGroup} id={weaponView} coarse={coarse}>
        <mesh ref={muzzleFlash} position={[0, 0, -1.02]} visible={false}>
          <coneGeometry args={[0.055, 0.34, 8]} />
          <meshBasicMaterial color="#fff2a8" transparent opacity={0.9} />
        </mesh>
        <pointLight ref={muzzleLight} position={[0, 0, -0.95]} color="#ffb347" intensity={0} distance={4.5} decay={2} />
      </WeaponModel>
      {tracerPool.map((tracer, index) => <primitive key={index} object={tracer.line} />)}
    </>
  );
}

function createBots(): BotState[] {
  return ENEMY_SPAWNS.map(([x, z], index) => ({
    id: String(index),
    name: ENEMY_NAMES[index],
    position: new Vector3(x, 0, z),
    health: 100,
    deadUntil: 0,
    nextShot: 1.8 + index * 0.35,
    strafe: index % 2 ? 1 : -1,
    phase: index * 1.37,
  }));
}

function createTracerPool(): TracerState[] {
  return Array.from({ length: 12 }, () => {
    const geometry = new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]);
    const material = new LineBasicMaterial({ color: "#ffe1a6", transparent: true, opacity: 0, depthWrite: false });
    const line = new Line(geometry, material);
    line.visible = false;
    line.frustumCulled = false;
    return { line, expires: 0 };
  });
}

const BLOCKERS = [
  [-35, -35, -13, -18], [-8, -35, 7, -22], [14, -35, 35, -14],
  [-35, -11, -22, 7], [21, -8, 35, 11],
  [-35, 16, -17, 35], [-10, 23, 8, 35], [16, 17, 35, 35],
  [-8, -8, -3, -1], [4, 5, 9, 10],
] as const;

function moveWithCollision(position: Vector3, dx: number, dz: number, radius = 0.34) {
  const nextX = Math.max(-43, Math.min(43, position.x + dx));
  if (!collides(nextX, position.z, radius)) position.x = nextX;
  const nextZ = Math.max(-43, Math.min(43, position.z + dz));
  if (!collides(position.x, nextZ, radius)) position.z = nextZ;
}

function collides(x: number, z: number, radius: number) {
  return BLOCKERS.some(([minX, minZ, maxX, maxZ]) => (
    x + radius > minX && x - radius < maxX && z + radius > minZ && z - radius < maxZ
  ));
}

interface BuildingData {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
}

const BUILDINGS: BuildingData[] = [
  { x: -24, z: -27, w: 22, d: 17, h: 18, color: "#4b514f" },
  { x: -0.5, z: -28.5, w: 15, d: 13, h: 27, color: "#55534c" },
  { x: 24.5, z: -24.5, w: 21, d: 21, h: 22, color: "#454a4c" },
  { x: -28.5, z: -2, w: 13, d: 18, h: 14, color: "#5c5046" },
  { x: 28, z: 1.5, w: 14, d: 19, h: 20, color: "#41484b" },
  { x: -26, z: 25.5, w: 18, d: 19, h: 25, color: "#4e514b" },
  { x: -1, z: 29, w: 18, d: 12, h: 16, color: "#5a554d" },
  { x: 25.5, z: 26, w: 19, d: 18, h: 30, color: "#44494b" },
];

function UrbanWorld({ coarse }: { coarse: boolean }) {
  const textures = useProceduralTextures();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[110, 110]} />
        <meshStandardMaterial map={textures.asphalt} roughnessMap={textures.roughness} color="#4a4f51" roughness={0.94} metalness={0.03} />
      </mesh>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 5, 64]} />
        <meshStandardMaterial color="#d3b84c" emissive="#8f731c" emissiveIntensity={0.22} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.55, 64]} />
        <meshStandardMaterial color="#333b3b" roughness={0.92} />
      </mesh>
      <pointLight position={[0, 5, 0]} color="#a8d7a0" intensity={1.9} distance={17} decay={2} />
      <pointLight position={[-17, 3.2, 5]} color="#60a5fa" intensity={2.4} distance={22} decay={2} />
      <pointLight position={[17, 3.2, -5]} color="#ef4444" intensity={2.1} distance={22} decay={2} />

      {BUILDINGS.map((building, index) => (
        <Building key={index} data={building} textures={textures} coarse={coarse} />
      ))}

      {[
        [-10, -4, 0], [-5, -4, 0], [7, 12, Math.PI / 2], [11, 12, Math.PI / 2],
        [-16, 12, 0], [17, -11, 0],
      ].map(([x, z, rotation], index) => (
        <Barrier key={index} position={[x, 0, z]} rotation={rotation} />
      ))}

      <Vehicle position={[-13, 0, 7]} rotation={-0.13} color="#263b38" />
      <Vehicle position={[13, 0, -5]} rotation={Math.PI + 0.08} color="#463c32" />
      <Vehicle position={[4, 0, 16]} rotation={Math.PI / 2} color="#343a43" />

      {[
        [-13, -14], [12, -14], [-15, 14], [14, 14], [-19, 2], [19, 1],
      ].map(([x, z], index) => <StreetLight key={index} position={[x, 0, z]} />)}

      <CrateStack position={[-5.5, 0, -4.5]} />
      <CrateStack position={[6.5, 0, 7.5]} />
      <mesh position={[0, 0.018, -14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 28]} />
        <meshStandardMaterial color="#b8ae78" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.021, 14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 28]} />
        <meshStandardMaterial color="#b8ae78" roughness={0.9} />
      </mesh>
    </group>
  );
}

function useProceduralTextures() {
  const textures = useMemo(() => {
    const make = (base: string, fleck: string, count: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext("2d")!;
      context.fillStyle = base;
      context.fillRect(0, 0, 256, 256);
      for (let index = 0; index < count; index += 1) {
        const x = (index * 73 + 17) % 256;
        const y = (index * 151 + 31) % 256;
        const size = 0.4 + ((index * 29) % 15) / 10;
        context.globalAlpha = 0.1 + ((index * 19) % 45) / 100;
        context.fillStyle = fleck;
        context.fillRect(x, y, size, size);
      }
      context.globalAlpha = 1;
      const texture = new CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(10, 10);
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      return texture;
    };
    return {
      asphalt: make("#3b3f40", "#111517", 850),
      concrete: make("#74736d", "#2d3030", 520),
      roughness: make("#dedede", "#777777", 720),
      metal: make("#32383a", "#b4a77d", 280),
    };
  }, []);
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures]);
  return textures;
}

function Building({ data, textures, coarse }: { data: BuildingData; textures: ReturnType<typeof useProceduralTextures>; coarse: boolean }) {
  const windowRows = coarse ? 2 : Math.min(5, Math.floor(data.h / 4));
  const windowColumns = coarse ? 2 : Math.min(5, Math.floor(data.w / 4));
  return (
    <group position={[data.x, 0, data.z]}>
      <mesh position={[0, data.h / 2, 0]} castShadow={!coarse} receiveShadow>
        <boxGeometry args={[data.w, data.h, data.d]} />
        <meshStandardMaterial map={textures.concrete} roughnessMap={textures.roughness} color={data.color} roughness={0.86} />
      </mesh>
      <mesh position={[0, data.h + 0.55, 0]} castShadow={!coarse}>
        <boxGeometry args={[data.w * 0.92, 1.1, data.d * 0.9]} />
        <meshStandardMaterial color="#363b3c" roughness={0.76} />
      </mesh>
      {Array.from({ length: windowRows * windowColumns }, (_, index) => {
        const column = index % windowColumns;
        const row = Math.floor(index / windowColumns);
        const x = -data.w * 0.34 + (column / Math.max(1, windowColumns - 1)) * data.w * 0.68;
        const y = 2.8 + row * 3.5;
        const lit = (index + Math.round(data.x)) % 4 === 0;
        return (
          <mesh key={index} position={[x, y, data.d / 2 + 0.012]}>
            <planeGeometry args={[1.15, 1.65]} />
            <meshStandardMaterial
              color={lit ? "#deb36b" : "#18232a"}
              emissive={lit ? "#c58235" : "#000000"}
              emissiveIntensity={lit ? 1.1 : 0}
              roughness={0.3}
              metalness={0.18}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 2.1, data.d / 2 + 0.04]}>
        <boxGeometry args={[2.5, 4.2, 0.12]} />
        <meshStandardMaterial color="#20282b" metalness={0.65} roughness={0.42} />
      </mesh>
    </group>
  );
}

function Barrier({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.96, 0.62]} />
        <meshStandardMaterial color="#8f8a79" roughness={0.92} />
      </mesh>
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={x} position={[x, 0.55, -0.32]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.24, 1.0, 0.04]} />
          <meshStandardMaterial color="#d5a826" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Vehicle({ position, rotation, color }: { position: [number, number, number]; rotation: number; color: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.58, 4.1]} />
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.05, -0.2]} castShadow>
        <boxGeometry args={[1.62, 0.68, 2.15]} />
        <meshStandardMaterial color="#16242b" metalness={0.55} roughness={0.22} />
      </mesh>
      {[-0.96, 0.96].flatMap((x) => [-1.25, 1.25].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.22, 14]} />
          <meshStandardMaterial color="#111315" roughness={0.95} />
        </mesh>
      )))}
    </group>
  );
}

function StreetLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 5.6, 8]} />
        <meshStandardMaterial color="#303536" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0.26, 5.55, 0]}>
        <boxGeometry args={[0.62, 0.16, 0.25]} />
        <meshStandardMaterial color="#e7c978" emissive="#e7a736" emissiveIntensity={2.6} />
      </mesh>
      <pointLight position={[0.25, 5.35, 0]} color="#ffd08a" intensity={1.25} distance={12} decay={2} />
    </group>
  );
}

function CrateStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[0, 0.55, 0], [1.15, 0.55, 0.1], [0.55, 1.65, 0]].map((p, index) => (
        <mesh key={index} position={p as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 1.05, 1.05]} />
          <meshStandardMaterial color="#5d5139" roughness={0.88} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}

const BotSoldier = forwardRef<Group, { name: string; position: Vector3; phase: number; coarse: boolean }>(
  function BotSoldier({ position, phase, coarse }, ref) {
    return (
      <group ref={ref} position={[position.x, 0, position.z]}>
        <mesh position={[0, 1.07, 0]} castShadow={!coarse}>
          <capsuleGeometry args={[0.34, 0.72, 6, 10]} />
          <meshStandardMaterial color="#763333" roughness={0.79} metalness={0.08} />
        </mesh>
        <mesh position={[0, 1.73, 0]} castShadow={!coarse}>
          <sphereGeometry args={[0.21, coarse ? 8 : 14, coarse ? 6 : 10]} />
          <meshStandardMaterial color="#b98b6d" roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.82, -0.02]} castShadow={!coarse}>
          <sphereGeometry args={[0.225, coarse ? 8 : 14, coarse ? 5 : 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#3f2421" roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.38, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.13, 0.13, 0.95]} />
          <meshStandardMaterial color="#20282a" metalness={0.82} roughness={0.31} />
        </mesh>
        <mesh position={[0, 2.15, 0]}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <pointLight position={[0, 2.15, 0]} color="#ef4444" intensity={0.35 + Math.sin(phase) * 0.05} distance={2} />
      </group>
    );
  },
);

interface WeaponModelProps {
  id: WeaponId;
  coarse: boolean;
  children?: React.ReactNode;
}

const WeaponModel = forwardRef<Group, WeaponModelProps>(function WeaponModel({ id, coarse, children }, ref) {
  const finish = id === "ak" ? "#745334" : id === "mp5" ? "#42494a" : "#59645f";
  const finishBundle = useMemo(() => {
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = 128;
    colorCanvas.height = 128;
    const colorContext = colorCanvas.getContext("2d")!;
    colorContext.fillStyle = finish;
    colorContext.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 58; index += 1) {
      const x = (index * 37 + 11) % 128;
      const y = (index * 71 + 7) % 128;
      colorContext.strokeStyle = index % 4 === 0 ? "rgba(218,225,213,.28)" : "rgba(12,16,15,.24)";
      colorContext.lineWidth = index % 5 === 0 ? 1.1 : 0.55;
      colorContext.beginPath();
      colorContext.moveTo(x, y);
      colorContext.lineTo(x + 4 + (index % 11), y + (index % 3) - 1);
      colorContext.stroke();
    }
    const map = new CanvasTexture(colorCanvas);
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(1.7, 1.7);
    map.colorSpace = SRGBColorSpace;

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = 128;
    roughCanvas.height = 128;
    const roughContext = roughCanvas.getContext("2d")!;
    roughContext.fillStyle = id === "ak" ? "#858585" : "#6f6f6f";
    roughContext.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 96; index += 1) {
      roughContext.fillStyle = index % 3 ? "#969696" : "#505050";
      roughContext.fillRect((index * 53) % 128, (index * 29) % 128, 1 + (index % 4), 1);
    }
    const roughnessMap = new CanvasTexture(roughCanvas);
    roughnessMap.wrapS = roughnessMap.wrapT = RepeatWrapping;
    roughnessMap.repeat.set(1.7, 1.7);

    const material = new MeshStandardMaterial({
      color: "#ffffff",
      map,
      roughnessMap,
      metalness: 0.82,
      roughness: id === "ak" ? 0.36 : 0.29,
      envMapIntensity: 1.1,
    });
    return { map, material, roughnessMap };
  }, [finish, id]);
  useEffect(() => () => {
    finishBundle.material.dispose();
    finishBundle.map.dispose();
    finishBundle.roughnessMap.dispose();
  }, [finishBundle]);
  const metal = finishBundle.material;
  const barrelLength = id === "mp5" ? 0.36 : id === "ak" ? 0.63 : 0.56;
  return (
    <group ref={ref} renderOrder={10} scale={0.72}>
      <pointLight position={[0.35, 0.55, 0.25]} color="#dce8df" intensity={1.8} distance={2.2} decay={2} />
      <mesh position={[0, 0, -0.25]} material={metal} castShadow={!coarse}>
        <boxGeometry args={[0.17, 0.19, id === "mp5" ? 0.5 : 0.64]} />
      </mesh>
      <mesh position={[0, 0.01, -0.58]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.037, 0.045, barrelLength, 12]} />
      </mesh>
      <mesh position={[0, 0.008, -0.92]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.056, 0.038, id === "mp5" ? 0.16 : 0.22, 12]} />
        <meshStandardMaterial color="#171c1d" metalness={0.91} roughness={0.24} />
      </mesh>
      <mesh position={[0, -0.16, -0.19]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.105, id === "ak" ? 0.34 : 0.29, id === "ak" ? 0.16 : 0.13]} />
        <meshStandardMaterial color={id === "ak" ? "#6b4527" : "#202526"} metalness={0.35} roughness={0.57} />
      </mesh>
      <mesh position={[0, -0.13, 0.02]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.105, 0.3, 0.13]} />
        <meshStandardMaterial color="#1c2021" metalness={0.48} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.015, 0.19]} material={metal}>
        <boxGeometry args={[0.11, 0.12, id === "mp5" ? 0.36 : 0.48]} />
      </mesh>
      <mesh position={[0, 0.13, -0.25]}>
        <boxGeometry args={[0.125, 0.045, 0.52]} />
        <meshStandardMaterial color="#171c1d" metalness={0.88} roughness={0.28} />
      </mesh>
      {id === "m4" && (
        <group position={[0, 0.2, -0.26]}>
          <mesh>
            <boxGeometry args={[0.12, 0.1, 0.23]} />
            <meshStandardMaterial color="#1d2525" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.16, 14]} />
            <meshStandardMaterial color="#162023" metalness={0.65} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.06, -0.001]}>
            <cylinderGeometry args={[0.037, 0.037, 0.165, 14]} />
            <meshBasicMaterial color="#5d9292" transparent opacity={0.58} />
          </mesh>
        </group>
      )}
      {id === "ak" && (
        <mesh position={[0, 0.15, -0.2]}>
          <boxGeometry args={[0.035, 0.14, 0.38]} />
          <meshStandardMaterial color="#171b1c" metalness={0.9} roughness={0.25} />
        </mesh>
      )}
      {id === "mp5" && (
        <>
          <mesh position={[0, -0.14, -0.52]}>
            <boxGeometry args={[0.1, 0.26, 0.11]} />
            <meshStandardMaterial color="#1b2021" roughness={0.6} metalness={0.45} />
          </mesh>
          <mesh position={[0, 0.17, -0.18]}>
            <boxGeometry args={[0.07, 0.12, 0.34]} />
            <meshStandardMaterial color="#161b1d" metalness={0.84} roughness={0.24} />
          </mesh>
        </>
      )}
      <mesh position={[0.06, -0.15, 0.06]} rotation={[0.22, 0, -0.18]}>
        <capsuleGeometry args={[0.043, 0.19, 4, 8]} />
        <meshStandardMaterial color="#30352f" roughness={0.88} />
      </mesh>
      <mesh position={[-0.06, -0.13, -0.39]} rotation={[0.5, 0, 0.18]}>
        <capsuleGeometry args={[0.043, 0.19, 4, 8]} />
        <meshStandardMaterial color="#343a32" roughness={0.88} />
      </mesh>
      <mesh position={[0.09, -0.3, 0.13]} rotation={[0.12, 0, -0.16]}>
        <capsuleGeometry args={[0.052, 0.28, 4, 8]} />
        <meshStandardMaterial color="#59604c" roughness={0.94} />
      </mesh>
      <mesh position={[-0.11, -0.3, -0.29]} rotation={[0.35, 0, 0.2]}>
        <capsuleGeometry args={[0.052, 0.3, 4, 8]} />
        <meshStandardMaterial color="#59604c" roughness={0.94} />
      </mesh>
      {children}
    </group>
  );
});

class CombatAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  constructor() {
    if (typeof window === "undefined" || !window.AudioContext) return;
    try {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = 0.33;
      this.master.connect(this.context.destination);
      this.noise = this.createNoiseBuffer();
    } catch {
      this.context = null;
    }
  }

  resume() {
    if (this.context?.state === "suspended") void this.context.resume();
  }

  private createNoiseBuffer() {
    if (!this.context) return null;
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * 0.18), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (((index * 16807) % 2147483647) / 1073741824 - 1) * Math.exp(-index / (data.length * 0.19));
    }
    return buffer;
  }

  private destination(position?: Vector3) {
    if (!this.context || !this.master) return null;
    if (!position) return this.master;
    const panner = this.context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 2;
    panner.maxDistance = 90;
    panner.rolloffFactor = 1.45;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    panner.connect(this.master);
    return panner;
  }

  private burst(gainValue: number, duration: number, frequency: number, position?: Vector3) {
    if (!this.context || !this.master || !this.noise) return;
    const now = this.context.currentTime;
    const destination = this.destination(position);
    if (!destination) return;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.72;
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    source.connect(filter).connect(gain).connect(destination);
    source.start(now);
    source.stop(now + duration);
  }

  gunshot(id: WeaponId, position: Vector3) {
    this.burst(id === "ak" ? 0.92 : id === "mp5" ? 0.58 : 0.74, id === "ak" ? 0.15 : 0.105, id === "mp5" ? 1320 : id === "ak" ? 760 : 980);
    this.burst(0.18, 0.08, 260, position);
  }

  enemyShot(position: Vector3) {
    this.burst(0.52, 0.13, 820, position);
  }

  impact(position: Vector3) {
    this.burst(0.17, 0.06, 2100, position);
  }

  footstep(position: Vector3, sprinting: boolean) {
    this.burst(sprinting ? 0.18 : 0.1, 0.055, 180, position);
  }

  reload(position: Vector3) {
    this.burst(0.13, 0.045, 2600, position);
    if (!this.context) return;
    window.setTimeout(() => this.burst(0.1, 0.04, 1800, position), 430);
  }

  switchWeapon() {
    this.burst(0.09, 0.045, 1450);
  }

  setListener(position: Vector3, yaw: number, pitch: number) {
    if (!this.context) return;
    const listener = this.context.listener;
    const forward = directionFromAim(yaw, pitch, 0, 1);
    if ("positionX" in listener) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    }
  }

  close() {
    if (this.context && this.context.state !== "closed") void this.context.close();
  }
}
