import { Sparkles } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Armchair,
  ArrowDown,
  ArrowUp,
  Eraser,
  Flower2,
  Footprints,
  Heart,
  RotateCcw,
  Save,
  TreePine,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  MALLOW_ISLE_SAVE_KEY,
  TERRAIN_SIZE,
  cozyScore,
  createDefaultMallowSave,
  eraseDecoration,
  explainPlaceDecoration,
  movePlayer,
  parseMallowSave,
  placeDecoration,
  sampleTerrainHeight,
  sculptTerrain,
  terrainWorldPosition,
  type Decoration,
  type MallowIsleSave,
  type PlayerPose,
} from "../../lib/games/mallow-isle";

type ToolId = "roam" | "raise" | "lower" | "tree" | "flowers" | "bench" | "erase";

export interface MallowSceneCopy {
  islandName: string;
  cozy: string;
  day: string;
  breeze: string;
  saved: string;
  soundOn: string;
  soundOff: string;
  reset: string;
  resetConfirm: string;
  walkHint: string;
  sculptHint: string;
  tools: Record<ToolId, string>;
  descriptions: Record<ToolId, string>;
  notices: {
  shaped: string;
  placed: string;
  erased: string;
  crowded: string;
  shoreline: string;
  full: string;
  };
}

interface Props {
  copy: MallowSceneCopy;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

interface Movement {
  x: number;
  z: number;
}

interface CameraControls {
  yaw: number;
  pitch: number;
  distance: number;
}

const TOOL_ORDER: ToolId[] = ["roam", "raise", "lower", "tree", "flowers", "bench", "erase"];
const TOOL_ICONS = {
  roam: Footprints,
  raise: ArrowUp,
  lower: ArrowDown,
  tree: TreePine,
  flowers: Flower2,
  bench: Armchair,
  erase: Eraser,
} satisfies Record<ToolId, typeof Footprints>;

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 640px)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return coarse;
}

function useLofiIslandAudio(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const warmFilter = context.createBiquadFilter();
    master.gain.value = 0.17;
    warmFilter.type = "lowpass";
    warmFilter.frequency.value = 3_400;
    warmFilter.Q.value = 0.35;
    warmFilter.connect(compressor);
    compressor.connect(master);
    master.connect(context.destination);

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let smooth = 0;
    for (let index = 0; index < noiseData.length; index += 1) {
      smooth = smooth * 0.93 + (Math.random() * 2 - 1) * 0.07;
      noiseData[index] = smooth;
    }
    const breeze = context.createBufferSource();
    const breezeFilter = context.createBiquadFilter();
    const breezeGain = context.createGain();
    breeze.buffer = noiseBuffer;
    breeze.loop = true;
    breezeFilter.type = "bandpass";
    breezeFilter.frequency.value = 760;
    breezeFilter.Q.value = 0.55;
    breezeGain.gain.value = 0.035;
    breeze.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(warmFilter);
    breeze.start();

    const progressions = [
      [146.83, 174.61, 220],
      [130.81, 164.81, 196],
      [110, 146.83, 174.61],
      [123.47, 155.56, 196],
    ];
    let chordIndex = 0;
    const playChord = () => {
      const now = context.currentTime + 0.03;
      const chord = progressions[chordIndex % progressions.length];
      chordIndex += 1;
      chord.forEach((frequency, noteIndex) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = noteIndex === 1 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = (noteIndex - 1) * 3;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.055 / (noteIndex + 1), now + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.6);
        oscillator.connect(gain);
        gain.connect(warmFilter);
        oscillator.start(now);
        oscillator.stop(now + 4.8);
      });
      const click = context.createOscillator();
      const clickGain = context.createGain();
      click.type = "sine";
      click.frequency.value = 72;
      clickGain.gain.setValueAtTime(0.045, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      click.connect(clickGain);
      clickGain.connect(warmFilter);
      click.start(now);
      click.stop(now + 0.2);
    };
    playChord();
    const chordTimer = window.setInterval(playChord, 4_800);

    const chirp = () => {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1_180, now);
      oscillator.frequency.exponentialRampToValueAtTime(1_780, now + 0.16);
      oscillator.frequency.exponentialRampToValueAtTime(1_260, now + 0.36);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      panner.pan.value = Math.random() * 1.6 - 0.8;
      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(warmFilter);
      oscillator.start(now);
      oscillator.stop(now + 0.45);
    };
    const birdTimer = window.setInterval(chirp, 9_600);
    void context.resume().catch(() => undefined);

    return () => {
      window.clearInterval(chordTimer);
      window.clearInterval(birdTimer);
      breeze.stop();
      void context.close();
    };
  }, [enabled]);
}

export default function MallowIsleScene({ copy, audioEnabled, onToggleAudio }: Props) {
  const [save, setSave] = useState<MallowIsleSave>(() => {
    if (typeof window === "undefined") return createDefaultMallowSave();
    return parseMallowSave(window.localStorage.getItem(MALLOW_ISLE_SAVE_KEY));
  });
  const [tool, setTool] = useState<ToolId>("roam");
  const [notice, setNotice] = useState<string | null>(null);
  const [clockMinutes, setClockMinutes] = useState(9 * 60 + 20);
  const [lastSaved, setLastSaved] = useState(false);
  const coarse = useCoarsePointer();
  const movement = useRef<Movement>({ x: 0, z: 0 });
  const cameraControls = useRef<CameraControls>({ yaw: -0.62, pitch: 0.22, distance: 8.6 });
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const idRef = useRef(0);
  const lastShapeRef = useRef(0);
  useLofiIslandAudio(audioEnabled);

  useEffect(() => {
    const timer = window.setInterval(() => setClockMinutes((value) => (value + 2) % 1_440), 1_600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(MALLOW_ISLE_SAVE_KEY, JSON.stringify(save));
      setLastSaved(true);
      window.setTimeout(() => setLastSaved(false), 1_200);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [save]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2_100);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const update = (event: KeyboardEvent, pressed: boolean) => {
      if (event.code === "KeyW" || event.code === "ArrowUp") movement.current.z = pressed ? 1 : 0;
      if (event.code === "KeyS" || event.code === "ArrowDown") movement.current.z = pressed ? -1 : 0;
      if (event.code === "KeyA" || event.code === "ArrowLeft") movement.current.x = pressed ? -1 : 0;
      if (event.code === "KeyD" || event.code === "ArrowRight") movement.current.x = pressed ? 1 : 0;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    };
    const down = (event: KeyboardEvent) => update(event, true);
    const up = (event: KeyboardEvent) => update(event, false);
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const actAt = useCallback((x: number, z: number) => {
    if (tool === "roam") return;
    if (tool === "raise" || tool === "lower") {
      const now = performance.now();
      if (now - lastShapeRef.current < 80) return;
      lastShapeRef.current = now;
      setSave((current) => {
        const heights = sculptTerrain(current.heights, x, z, tool);
        if (heights === current.heights) {
          setNotice(copy.notices.shoreline);
          return current;
        }
        const next = { ...current, heights, sculpted: current.sculpted + 1 };
        setNotice(copy.notices.shaped);
        return { ...next, cozy: cozyScore(next) };
      });
      return;
    }
    setSave((current) => {
      if (tool === "erase") {
        const decorations = eraseDecoration(current.decorations, x, z);
        if (decorations === current.decorations) return current;
        const next = { ...current, decorations };
        setNotice(copy.notices.erased);
        return { ...next, cozy: cozyScore(next) };
      }
      const decorations = placeDecoration(
        current.decorations,
        tool,
        x,
        z,
        `mallow-${tool}-${Date.now()}-${idRef.current++}`,
      );
      if (decorations === current.decorations) {
        const reason = explainPlaceDecoration(current.decorations, tool, x, z);
        setNotice(reason === "full" ? copy.notices.full : reason === "shore" ? copy.notices.shoreline : copy.notices.crowded);
        return current;
      }
      const next = { ...current, decorations };
      setNotice(copy.notices.placed);
      return { ...next, cozy: cozyScore(next) };
    });
  }, [copy.notices, tool]);

  const reset = useCallback(() => {
    if (!window.confirm(copy.resetConfirm)) return;
    setSave(createDefaultMallowSave());
    setTool("roam");
  }, [copy.resetConfirm]);

  const beginCameraDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== "roam" || (event.target as HTMLElement).tagName !== "CANVAS") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, [tool]);
  const moveCamera = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    cameraControls.current.yaw -= (event.clientX - drag.x) * 0.006;
    cameraControls.current.pitch = THREE.MathUtils.clamp(
      cameraControls.current.pitch + (event.clientY - drag.y) * 0.003,
      0.08,
      0.42,
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
  }, []);
  const endCameraDrag = useCallback(() => {
    dragRef.current = null;
  }, []);
  const zoomCamera = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    cameraControls.current.distance = THREE.MathUtils.clamp(
      cameraControls.current.distance + event.deltaY * 0.01,
      5.8,
      12.5,
    );
  }, []);

  const setMovement = useCallback((axis: "x" | "z", value: number) => {
    movement.current[axis] = value;
  }, []);

  const hour = Math.floor(clockMinutes / 60).toString().padStart(2, "0");
  const minute = (clockMinutes % 60).toString().padStart(2, "0");
  const description = copy.descriptions[tool];

  return (
    <div
      className="relative h-full min-h-[680px] w-full select-none overflow-hidden bg-[#a8d8d3] text-[#3f554b] [touch-action:none]"
      onPointerDown={beginCameraDrag}
      onPointerMove={moveCamera}
      onPointerUp={endCameraDrag}
      onPointerCancel={endCameraDrag}
      onWheel={zoomCamera}
    >
      <Canvas
        shadows={coarse ? false : "soft"}
        dpr={coarse ? 1 : [1, 1.5]}
        camera={{ fov: 48, near: 0.08, far: 180, position: [5, 5, 9] }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <MallowWorld
          save={save}
          tool={tool}
          movement={movement}
          cameraControls={cameraControls}
          actAt={actAt}
          coarse={coarse}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 border-[12px] border-[#fff9ef]/10" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-5">
        <div className="max-w-[58%] border border-white/55 bg-[#fff9ef]/88 px-3 py-2 shadow-[0_8px_30px_rgba(64,93,78,.12)] backdrop-blur-md sm:px-4">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#719071] sm:text-xs">
            {copy.islandName}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Heart className="size-4 fill-[#ef9fa5] text-[#d97882]" aria-hidden="true" />
            <span className="text-sm font-black text-[#405b50]">{copy.cozy} {save.cozy}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full max-w-40 overflow-hidden bg-[#dbe8cf]">
            <div className="h-full bg-[#ef9fa5] transition-[width] duration-500" style={{ width: `${save.cozy}%` }} />
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="hidden border border-white/55 bg-[#fff9ef]/88 px-3 py-2 text-right text-[10px] font-bold shadow-[0_8px_30px_rgba(64,93,78,.1)] backdrop-blur-md sm:block">
            <p>{copy.day} 1 · {hour}:{minute}</p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[#719071]">
              <Wind className="size-3" aria-hidden="true" /> {copy.breeze} 2.4 m/s
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAudio}
            className="grid size-11 place-items-center border border-white/60 bg-[#fff9ef]/90 text-[#547063] shadow-[0_8px_24px_rgba(64,93,78,.12)] transition hover:bg-white"
            aria-label={audioEnabled ? copy.soundOff : copy.soundOn}
            title={audioEnabled ? copy.soundOff : copy.soundOn}
          >
            {audioEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="grid size-11 place-items-center border border-white/60 bg-[#fff9ef]/90 text-[#547063] shadow-[0_8px_24px_rgba(64,93,78,.12)] transition hover:bg-white"
            aria-label={copy.reset}
            title={copy.reset}
          >
            <RotateCcw className="size-5" />
          </button>
        </div>
      </header>

      <div className="pointer-events-none absolute left-3 top-[112px] z-20 hidden max-w-56 border border-white/50 bg-[#fff9ef]/82 p-3 text-[11px] leading-relaxed shadow-[0_8px_25px_rgba(64,93,78,.1)] backdrop-blur-md sm:block">
        <p className="font-bold">{tool === "roam" ? copy.walkHint : copy.sculptHint}</p>
        <p className="mt-1 text-[#719071]">{description}</p>
      </div>

      {notice && (
        <div className="pointer-events-none absolute left-1/2 top-[108px] z-30 -translate-x-1/2 border border-white/65 bg-[#fff9ef]/94 px-4 py-2 text-xs font-black text-[#50705d] shadow-[0_10px_28px_rgba(64,93,78,.14)]">
          {notice}
        </div>
      )}

      {coarse && (
        <div className="pointer-events-auto absolute bottom-[104px] left-3 z-30 grid grid-cols-3 gap-1">
          <span />
          <MoveButton label="↑" onChange={(value) => setMovement("z", value)} />
          <span />
          <MoveButton label="←" onChange={(value) => setMovement("x", -value)} />
          <MoveButton label="↓" onChange={(value) => setMovement("z", -value)} />
          <MoveButton label="→" onChange={(value) => setMovement("x", value)} />
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-30 flex items-end justify-center sm:inset-x-5 sm:bottom-5">
        <div className="flex max-w-full items-stretch gap-1 overflow-x-auto border border-white/60 bg-[#fff9ef]/92 p-1.5 shadow-[0_14px_40px_rgba(64,93,78,.16)] backdrop-blur-lg sm:gap-2 sm:p-2">
          {TOOL_ORDER.map((id) => {
            const Icon = TOOL_ICONS[id];
            const active = tool === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => setTool(id)}
                className={`flex min-h-14 min-w-[58px] flex-col items-center justify-center gap-1 border px-2 text-[9px] font-black uppercase tracking-wide transition sm:min-w-[70px] sm:text-[10px] ${
                  active
                    ? "border-[#6d9278] bg-[#dcebd4] text-[#3f6250]"
                    : "border-transparent bg-transparent text-[#6e8176] hover:border-[#cbdcc5] hover:bg-white/70"
                }`}
                aria-pressed={active}
                title={copy.descriptions[id]}
              >
                <Icon className="size-5" strokeWidth={2.2} aria-hidden="true" />
                <span>{copy.tools[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`pointer-events-none absolute bottom-[92px] right-3 z-20 flex items-center gap-1 text-[10px] font-bold text-white transition-opacity ${lastSaved ? "opacity-100" : "opacity-0"}`}>
        <Save className="size-3" aria-hidden="true" /> {copy.saved}
      </div>
    </div>
  );
}

function MoveButton({ label, onChange }: { label: string; onChange: (value: number) => void }) {
  return (
    <button
      type="button"
      className="grid size-12 place-items-center border border-white/60 bg-[#fff9ef]/90 text-lg font-black text-[#547063] shadow-[0_6px_18px_rgba(64,93,78,.12)]"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(1);
      }}
      onPointerUp={() => onChange(0)}
      onPointerCancel={() => onChange(0)}
      onPointerLeave={() => onChange(0)}
      aria-label={label}
    >
      {label}
    </button>
  );
}

interface WorldProps {
  save: MallowIsleSave;
  tool: ToolId;
  movement: RefObject<Movement>;
  cameraControls: RefObject<CameraControls>;
  actAt: (x: number, z: number) => void;
  coarse: boolean;
}

function MallowWorld({ save, tool, movement, cameraControls, actAt, coarse }: WorldProps) {
  const { camera, scene } = useThree();
  const player = useRef<THREE.Group>(null);
  const pose = useRef<PlayerPose>({ x: 0, z: 5.1, heading: Math.PI });
  const cursor = useRef<THREE.Mesh>(null);
  const pointerDown = useRef(false);
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const [hovered, setHovered] = useState<[number, number] | null>(null);

  useEffect(() => {
    scene.background = new THREE.Color("#b8dfd8");
    scene.fog = new THREE.Fog("#b8dfd8", 26, 72);
  }, [scene]);

  useEffect(() => {
    if (!cursor.current || !hovered) return;
    cursor.current.position.set(
      hovered[0],
      sampleTerrainHeight(save.heights, hovered[0], hovered[1]) + 0.035,
      hovered[1],
    );
  }, [hovered, save.heights]);

  useFrame((state, delta) => {
    const controls = cameraControls.current;
    const input = movement.current;
    if (!controls || !input) return;
    pose.current = movePlayer(pose.current, input.x, input.z, controls.yaw, delta);
    const height = sampleTerrainHeight(save.heights, pose.current.x, pose.current.z);
    if (player.current) {
      player.current.position.set(pose.current.x, height + 0.08, pose.current.z);
      player.current.rotation.y = THREE.MathUtils.damp(player.current.rotation.y, pose.current.heading, 12, delta);
      const walking = Math.hypot(input.x, input.z) > 0.01;
      player.current.position.y += walking ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.06 : 0;
    }
    cameraPosition.set(
      pose.current.x + Math.sin(controls.yaw) * controls.distance,
      height + 2.8 + controls.pitch * 7,
      pose.current.z + Math.cos(controls.yaw) * controls.distance,
    );
    camera.position.lerp(cameraPosition, 1 - Math.exp(-delta * 4.8));
    cameraTarget.set(pose.current.x, height + 1.05, pose.current.z);
    camera.lookAt(cameraTarget);
  });

  const updateCursor = (event: ThreeEvent<PointerEvent>) => {
    setHovered([event.point.x, event.point.z]);
    if (pointerDown.current && (tool === "raise" || tool === "lower")) actAt(event.point.x, event.point.z);
  };

  return (
    <>
      <hemisphereLight args={["#fff3dc", "#6d9380", 2.2]} />
      <directionalLight
        castShadow={!coarse}
        position={[-13, 19, 9]}
        intensity={3.1}
        color="#ffe7bd"
        shadow-mapSize-width={coarse ? 512 : 1536}
        shadow-mapSize-height={coarse ? 512 : 1536}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0004}
        shadow-radius={5}
      />
      <ambientLight intensity={0.42} color="#d8f2e7" />

      <mesh rotation-x={-Math.PI / 2} position-y={0.08}>
        <circleGeometry args={[84, coarse ? 48 : 96]} />
        <meshStandardMaterial color="#8fcac7" roughness={0.32} metalness={0.02} transparent opacity={0.92} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.1}>
        <ringGeometry args={[14.2, 48, coarse ? 64 : 128]} />
        <meshBasicMaterial color="#d6edf0" transparent opacity={0.23} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <TerrainMesh
        heights={save.heights}
        active={tool !== "roam"}
        onPointerMove={updateCursor}
        onPointerLeave={() => {
          pointerDown.current = false;
          setHovered(null);
        }}
        onPointerDown={(event) => {
          if (tool === "roam") return;
          event.stopPropagation();
          pointerDown.current = true;
          actAt(event.point.x, event.point.z);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          pointerDown.current = false;
        }}
      />

      {hovered && tool !== "roam" && (
        <mesh ref={cursor} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[tool === "raise" || tool === "lower" ? 1.55 : 0.48, tool === "raise" || tool === "lower" ? 1.78 : 0.65, 40]} />
          <meshBasicMaterial color={tool === "erase" ? "#d87878" : "#fff5ca"} transparent opacity={0.86} depthTest={false} />
        </mesh>
      )}

      <Cottage heights={save.heights} />
      <StonePath heights={save.heights} />
      {save.decorations.map((decoration) => (
        <DecorationModel key={decoration.id} decoration={decoration} heights={save.heights} />
      ))}

      <group ref={player}>
        <ChibiAnimal kind="rabbit" body="#fff1e4" accent="#e7959a" scale={0.9} />
      </group>
      <WanderingVillager kind="fox" position={[-3.8, 1.5]} heights={save.heights} phase={0.3} />
      <WanderingVillager kind="bear" position={[4.7, 2.8]} heights={save.heights} phase={2.2} />
      <WanderingVillager kind="cat" position={[2.8, -5.6]} heights={save.heights} phase={4.5} />

      <Cloud position={[-12, 15, -20]} scale={2.6} speed={0.1} />
      <Cloud position={[9, 12, -24]} scale={2.1} speed={0.075} />
      <Cloud position={[-23, 11, 2]} scale={1.65} speed={0.12} />
      {!coarse && <Cloud position={[20, 16, 5]} scale={2.8} speed={0.065} />}
      <Sparkles count={coarse ? 18 : 42} scale={[24, 8, 24]} position={[0, 5.5, 0]} size={1.6} speed={0.15} color="#fff3c4" opacity={0.38} />
    </>
  );
}

interface TerrainProps {
  heights: number[];
  active: boolean;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave: () => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
}

function TerrainMesh({
  heights,
  active,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
}: TerrainProps) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3);
    const colors = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3);
    const indices: number[] = [];
    const grassLow = new THREE.Color("#9fca8d");
    const grassHigh = new THREE.Color("#c1d99c");
    const sand = new THREE.Color("#ead3aa");
    const shore = new THREE.Color("#c7c99c");
    const color = new THREE.Color();
    for (let z = 0; z < TERRAIN_SIZE; z += 1) {
      for (let x = 0; x < TERRAIN_SIZE; x += 1) {
        const index = z * TERRAIN_SIZE + x;
        const [worldX, worldZ] = terrainWorldPosition(x, z);
        const height = heights[index] ?? 0;
        positions[index * 3] = worldX;
        positions[index * 3 + 1] = height;
        positions[index * 3 + 2] = worldZ;
        if (height < 0.25) color.copy(sand);
        else if (height < 0.55) color.copy(shore).lerp(grassLow, (height - 0.25) / 0.3);
        else color.copy(grassLow).lerp(grassHigh, THREE.MathUtils.clamp((height - 0.55) / 2.8, 0, 1));
        const tint = Math.sin(index * 1.73) * 0.018;
        color.offsetHSL(0, 0, tint);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }
    for (let z = 0; z < TERRAIN_SIZE - 1; z += 1) {
      for (let x = 0; x < TERRAIN_SIZE - 1; x += 1) {
        const a = z * TERRAIN_SIZE + x;
        const b = a + 1;
        const c = a + TERRAIN_SIZE;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    next.setIndex(indices);
    next.computeVertexNormals();
    next.computeBoundingSphere();
    return next;
  }, [heights]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      onPointerMove={active ? onPointerMove : undefined}
      onPointerLeave={active ? onPointerLeave : undefined}
      onPointerDown={active ? onPointerDown : undefined}
      onPointerUp={active ? onPointerUp : undefined}
    >
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0} />
    </mesh>
  );
}

function Cottage({ heights }: { heights: number[] }) {
  const x = 2.8;
  const z = -1.2;
  const y = sampleTerrainHeight(heights, x, z);
  return (
    <group position={[x, y, z]} rotation-y={-0.35}>
      <mesh castShadow receiveShadow position-y={0.92}>
        <boxGeometry args={[3.2, 1.85, 2.45]} />
        <meshStandardMaterial color="#f6d9bb" roughness={0.94} />
      </mesh>
      <mesh castShadow position-y={2.05} rotation-y={Math.PI / 4} scale={[1.25, 0.72, 1.05]}>
        <coneGeometry args={[2.25, 1.55, 4]} />
        <meshStandardMaterial color="#e89fa3" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[-0.7, 0.7, 1.25]}>
        <boxGeometry args={[0.72, 1.35, 0.12]} />
        <meshStandardMaterial color="#8b6958" roughness={0.9} />
      </mesh>
      {[-0.65, 0.65].map((windowX) => (
        <mesh key={windowX} position={[windowX, 1.15, 1.32]}>
          <boxGeometry args={[0.52, 0.52, 0.08]} />
          <meshStandardMaterial color="#ffe6a1" emissive="#ffd47b" emissiveIntensity={0.22} />
        </mesh>
      ))}
      <mesh castShadow position={[1.05, 2.35, -0.45]}>
        <boxGeometry args={[0.42, 1.4, 0.42]} />
        <meshStandardMaterial color="#c17f75" roughness={0.9} />
      </mesh>
    </group>
  );
}

function StonePath({ heights }: { heights: number[] }) {
  return (
    <group>
      {Array.from({ length: 8 }, (_, index) => {
        const x = 0.15 + Math.sin(index * 0.8) * 0.28;
        const z = 4.5 - index * 0.72;
        return (
          <mesh
            key={index}
            castShadow
            receiveShadow
            position={[x, sampleTerrainHeight(heights, x, z) + 0.055, z]}
            rotation={[-Math.PI / 2, 0, index * 0.37]}
          >
            <cylinderGeometry args={[0.36 + (index % 2) * 0.06, 0.4, 0.08, 7]} />
            <meshStandardMaterial color={index % 2 ? "#d6c3ab" : "#e1cdb3"} roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

function DecorationModel({ decoration, heights }: { decoration: Decoration; heights: number[] }) {
  const y = sampleTerrainHeight(heights, decoration.x, decoration.z);
  if (decoration.type === "tree") {
    return <WindTree position={[decoration.x, y, decoration.z]} rotation={decoration.rotation} variant={decoration.variant} />;
  }
  if (decoration.type === "flowers") {
    return <WindFlowers position={[decoration.x, y, decoration.z]} rotation={decoration.rotation} variant={decoration.variant} />;
  }
  return <PastelBench position={[decoration.x, y, decoration.z]} rotation={decoration.rotation} />;
}

function WindTree({ position, rotation, variant }: { position: [number, number, number]; rotation: number; variant: number }) {
  const crown = useRef<THREE.Group>(null);
  const palette = ["#9ac895", "#8fbea2", "#a9cc86"];
  useFrame((state) => {
    if (!crown.current) return;
    const wind = Math.sin(state.clock.elapsedTime * 1.35 + position[0] * 0.4) * 0.045;
    crown.current.rotation.z = wind;
    crown.current.rotation.x = wind * 0.45;
  });
  return (
    <group position={position} rotation-y={rotation}>
      <mesh castShadow position-y={1.15}>
        <cylinderGeometry args={[0.18, 0.32, 2.3, 7]} />
        <meshStandardMaterial color="#a67861" roughness={1} />
      </mesh>
      <group ref={crown} position-y={2.35}>
        <mesh castShadow scale={[1.08, 0.95, 1.02]}>
          <dodecahedronGeometry args={[1.18, 1]} />
          <meshStandardMaterial color={palette[variant % palette.length]} roughness={0.98} />
        </mesh>
        <mesh castShadow position={[-0.62, -0.1, 0.14]} scale={0.68}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#acd09c" roughness={0.98} />
        </mesh>
        <mesh castShadow position={[0.55, 0.08, -0.18]} scale={0.72}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#b5d49e" roughness={0.98} />
        </mesh>
      </group>
    </group>
  );
}

function WindFlowers({ position, rotation, variant }: { position: [number, number, number]; rotation: number; variant: number }) {
  const group = useRef<THREE.Group>(null);
  const colors = ["#f2a8ae", "#f6d59f", "#c8b6e2"];
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 2.1 + position[0]) * 0.08;
  });
  return (
    <group ref={group} position={position} rotation-y={rotation}>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = index * 2.17;
        const radius = 0.12 + (index % 3) * 0.15;
        const stemHeight = 0.32 + (index % 2) * 0.12;
        return (
          <group key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <mesh position-y={stemHeight / 2}>
              <cylinderGeometry args={[0.018, 0.025, stemHeight, 5]} />
              <meshStandardMaterial color="#6c9b6e" roughness={1} />
            </mesh>
            <mesh castShadow position-y={stemHeight}>
              <sphereGeometry args={[0.105, 8, 6]} />
              <meshStandardMaterial color={colors[(variant + index) % colors.length]} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function PastelBench({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh castShadow position-y={0.48}>
        <boxGeometry args={[1.5, 0.18, 0.52]} />
        <meshStandardMaterial color="#dca995" roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0, 0.92, -0.22]} rotation-x={-0.12}>
        <boxGeometry args={[1.5, 0.62, 0.16]} />
        <meshStandardMaterial color="#efc1a8" roughness={0.92} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, 0.22, 0.12]}>
            <boxGeometry args={[0.12, 0.5, 0.12]} />
            <meshStandardMaterial color="#806b61" roughness={1} />
          </mesh>
          <mesh castShadow position={[x, 0.46, -0.23]}>
            <boxGeometry args={[0.12, 0.92, 0.12]} />
            <meshStandardMaterial color="#806b61" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

type AnimalKind = "rabbit" | "fox" | "bear" | "cat";

function ChibiAnimal({
  kind,
  body,
  accent,
  scale = 1,
}: {
  kind: AnimalKind;
  body: string;
  accent: string;
  scale?: number;
}) {
  const isRabbit = kind === "rabbit";
  const isBear = kind === "bear";
  return (
    <group scale={scale}>
      <mesh castShadow position-y={0.58} scale={[0.72, 0.9, 0.66]}>
        <sphereGeometry args={[0.62, 16, 12]} />
        <meshStandardMaterial color={body} roughness={0.88} />
      </mesh>
      <mesh castShadow position-y={1.35} scale={[0.88, 0.82, 0.78]}>
        <sphereGeometry args={[0.66, 18, 14]} />
        <meshStandardMaterial color={body} roughness={0.88} />
      </mesh>
      {isRabbit ? (
        <>
          {[-0.28, 0.28].map((x) => (
            <group key={x} position={[x, 2.06, 0]} rotation-z={x * 0.22}>
              <mesh castShadow scale={[0.23, 0.72, 0.22]}>
                <sphereGeometry args={[0.62, 12, 10]} />
                <meshStandardMaterial color={body} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.05, 0.13]} scale={[0.11, 0.52, 0.05]}>
                <sphereGeometry args={[0.62, 10, 8]} />
                <meshStandardMaterial color={accent} roughness={0.9} />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        [-0.43, 0.43].map((x) => (
          <mesh
            key={x}
            castShadow
            position={[x, isBear ? 1.78 : 1.8, 0]}
            rotation-z={x * (isBear ? 0.1 : 0.85)}
          >
            {isBear ? <sphereGeometry args={[0.23, 12, 10]} /> : <coneGeometry args={[0.28, 0.52, 4]} />}
            <meshStandardMaterial color={isBear ? body : accent} roughness={0.9} />
          </mesh>
        ))
      )}
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, 1.42, 0.56]} scale={[1, 1.18, 0.45]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial color="#40524b" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.22, 0.62]} scale={[1.25, 0.8, 0.7]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-0.28, 0.08, 0.05]} scale={[0.7, 0.38, 0.9]}>
        <sphereGeometry args={[0.34, 12, 8]} />
        <meshStandardMaterial color={body} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.28, 0.08, 0.05]} scale={[0.7, 0.38, 0.9]}>
        <sphereGeometry args={[0.34, 12, 8]} />
        <meshStandardMaterial color={body} roughness={0.9} />
      </mesh>
      {(kind === "fox" || kind === "cat") && (
        <mesh castShadow position={[0.56, 0.62, -0.32]} rotation-z={-0.9} scale={[0.4, 0.88, 0.4]}>
          <sphereGeometry args={[0.45, 12, 8]} />
          <meshStandardMaterial color={kind === "fox" ? accent : body} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function WanderingVillager({
  kind,
  position,
  heights,
  phase,
}: {
  kind: Exclude<AnimalKind, "rabbit">;
  position: [number, number];
  heights: number[];
  phase: number;
}) {
  const group = useRef<THREE.Group>(null);
  const palette = {
    fox: { body: "#e9a174", accent: "#fff0d7" },
    bear: { body: "#b8987f", accent: "#e8c9ad" },
    cat: { body: "#b8a8cb", accent: "#f0c1ca" },
  }[kind];
  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime * 0.25 + phase;
    const x = position[0] + Math.sin(time) * 0.75;
    const z = position[1] + Math.cos(time * 0.8) * 0.55;
    group.current.position.set(x, sampleTerrainHeight(heights, x, z) + Math.abs(Math.sin(time * 8)) * 0.025, z);
    group.current.rotation.y = Math.atan2(Math.cos(time) * 0.75, -Math.sin(time * 0.8) * 0.44);
  });
  return (
    <group ref={group}>
      <ChibiAnimal kind={kind} body={palette.body} accent={palette.accent} scale={0.74} />
    </group>
  );
}

function Cloud({
  position,
  scale,
  speed,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * speed) * 5;
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.13 + position[0]) * 0.35;
  });
  return (
    <group ref={group} position={position} scale={scale}>
      {[
        [0, 0, 0, 1.2],
        [-0.9, -0.1, 0.1, 0.82],
        [0.92, -0.08, 0, 0.9],
        [-0.25, 0.5, 0.05, 0.88],
        [0.45, 0.38, -0.12, 0.72],
        [0.1, -0.18, 0.5, 0.95],
      ].map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} scale={[size * 1.15, size * 0.78, size]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color={index % 2 ? "#fff8eb" : "#fffdf5"}
            transparent
            opacity={0.72}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
