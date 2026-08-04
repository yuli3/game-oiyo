import { Html, Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Anchor,
  ChevronLeft,
  ChevronRight,
  Minus,
  Navigation,
  Plus,
  Volume2,
  VolumeX,
  X,
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
  GOODS,
  PORTS,
  VOYAGE_SECONDS,
  canDock,
  cargoUsed,
  createTradeState,
  formatVoyageTime,
  marketQuote,
  nearestPort,
  resolveIslandCollision,
  signedAngleDifference,
  stepVessel,
  tradeCargo,
  visitPort,
  voyageScore,
  type GoodId,
  type PortId,
  type SailingEnvironment,
  type TradeState,
  type VesselState,
} from "../../lib/games/windward-horizons";
import { clearWindwardSave, storeWindwardSave, type WindwardSaveV1 } from "../../lib/games/windward-save";

export interface WindwardSceneCopy {
  voyage: string;
  time: string;
  gold: string;
  cargo: string;
  speed: string;
  knots: string;
  sails: string;
  wind: string;
  dock: string;
  slowToDock: string;
  near: string;
  endVoyage: string;
  soundOn: string;
  soundOff: string;
  resumed: string;
  cameraHint: string;
  market: string;
  buy: string;
  sell: string;
  hold: string;
  close: string;
  profit: string;
  discovery: string;
  dayPhases: Record<DayPhase, string>;
  ports: Record<PortId, string>;
  goods: Record<GoodId, string>;
  tradeReasons: Record<Exclude<TradeReason, "ok">, string>;
}

export interface VoyageResult {
  score: number;
  gold: number;
  tradeProfit: number;
  ports: number;
  discoveries: number;
}

interface Props {
  copy: WindwardSceneCopy;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onFinish: (result: VoyageResult) => void;
  restore: WindwardSaveV1 | null;
}

interface Controls {
  throttle: number;
  rudder: number;
  cameraYaw: number;
  cameraPitch: number;
  cameraDistance: number;
}

type DayPhase = "dawn" | "day" | "dusk" | "night";
type TradeReason = ReturnType<typeof tradeCargo>["reason"];

interface HudState {
  timeLeft: number;
  day: number;
  dayPhase: DayPhase;
  windHeading: number;
  windSpeed: number;
  heading: number;
  speed: number;
  sail: number;
  x: number;
  z: number;
  nearestPort: PortId;
  nearestDistance: number;
  dockable: boolean;
}

const GOOD_IDS: GoodId[] = ["spices", "silk", "tea", "timber"];
const DISCOVERY_MARKS = [
  { id: "astral-arch", x: -36, z: -146, color: "#d6b778" },
  { id: "whale-road", x: 154, z: 38, color: "#8ed3c7" },
  { id: "moon-bell", x: -154, z: -28, color: "#b9c7e8" },
] as const;

const initialControls = (): Controls => ({
  throttle: 0,
  rudder: 0,
  cameraYaw: 0,
  cameraPitch: 0.22,
  cameraDistance: 15,
});

const initialHud: HudState = {
  timeLeft: VOYAGE_SECONDS,
  day: 0.18,
  dayPhase: "dawn",
  windHeading: Math.PI * 1.08,
  windSpeed: 10,
  heading: Math.PI / 2,
  speed: 0,
  sail: 0.18,
  x: 0,
  z: 51,
  nearestPort: "azurehaven",
  nearestDistance: 31,
  dockable: true,
};

export default function WindwardHorizonsScene({
  copy,
  audioEnabled,
  onToggleAudio,
  onFinish,
  restore,
}: Props) {
  const controls = useRef<Controls>(initialControls());
  const [hud, setHud] = useState(initialHud);
  const [trade, setTrade] = useState<TradeState>(() => restore?.trade ?? createTradeState());
  const tradeRef = useRef(trade);
  const [docked, setDocked] = useState<PortId | null>(null);
  const [coarse, setCoarse] = useState(false);
  const [discoveries, setDiscoveries] = useState(() => restore?.foundMarks.length ?? 0);
  const discoveriesRef = useRef(discoveries);
  const [notice, setNotice] = useState<string | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    tradeRef.current = trade;
  }, [trade]);
  useEffect(() => {
    discoveriesRef.current = discoveries;
  }, [discoveries]);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setCoarse(query.matches);
      if (query.matches) {
        controls.current.cameraDistance = 21;
        controls.current.cameraPitch = 0.3;
      }
    };
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2_400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // Mount-only: shows once for a resumed voyage, via the same toast the rest
  // of the HUD already uses. Deliberately not tied to any sibling state
  // change, so it can't be raced away the way a derived "clear on resume"
  // effect can (see the Connect Four restored-banner fix for that failure).
  useEffect(() => {
    if (restore) setNotice(copy.resumed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearWindwardSave();
    const state = tradeRef.current;
    onFinish({
      score: voyageScore(state, discoveriesRef.current),
      gold: state.gold,
      tradeProfit: state.tradeProfit,
      ports: state.visited.length,
      discoveries: discoveriesRef.current,
    });
  }, [onFinish]);

  useEffect(() => {
    const key = (event: KeyboardEvent, pressed: boolean) => {
      if (event.code === "KeyW" || event.code === "ArrowUp") controls.current.throttle = pressed ? 1 : 0;
      if (event.code === "KeyS" || event.code === "ArrowDown") controls.current.throttle = pressed ? -1 : 0;
      if (event.code === "KeyA" || event.code === "ArrowLeft") controls.current.rudder = pressed ? -1 : 0;
      if (event.code === "KeyD" || event.code === "ArrowRight") controls.current.rudder = pressed ? 1 : 0;
      if (pressed && event.code === "KeyF" && hud.dockable && !docked) setDocked(hud.nearestPort);
      if (pressed && event.code === "Escape" && docked) setDocked(null);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    };
    const down = (event: KeyboardEvent) => key(event, true);
    const up = (event: KeyboardEvent) => key(event, false);
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [docked, hud.dockable, hud.nearestPort]);

  useEffect(() => {
    if (!docked) return;
    setTrade((current) => visitPort(current, docked));
  }, [docked]);

  const onDiscover = useCallback(() => {
    setDiscoveries((value) => Math.min(3, value + 1));
    setNotice(copy.discovery);
  }, [copy.discovery]);

  const onSnapshot = useCallback((vessel: VesselState, elapsedSeconds: number, foundMarks: string[]) => {
    storeWindwardSave({
      vessel,
      trade: tradeRef.current,
      foundMarks,
      elapsedSeconds,
      savedAtEpochMs: Date.now(),
    });
  }, []);

  const port = docked ? PORTS.find((candidate) => candidate.id === docked) ?? null : null;
  const prices = useMemo(() => port ? marketQuote(port, Math.floor(hud.day * 12)) : null, [hud.day, port]);

  const transact = useCallback((action: "buy" | "sell", good: GoodId) => {
    if (!prices) return;
    setTrade((current) => {
      const result = tradeCargo(current, action, good, prices[good], 1);
      if (!result.ok) setNotice(copy.tradeReasons[result.reason as Exclude<TradeReason, "ok">]);
      return result.state;
    });
  }, [copy.tradeReasons, prices]);

  const beginCameraDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,[data-panel]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, []);
  const moveCamera = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    controls.current.cameraYaw -= (event.clientX - drag.x) * 0.006;
    controls.current.cameraPitch = THREE.MathUtils.clamp(
      controls.current.cameraPitch + (event.clientY - drag.y) * 0.003,
      -0.02,
      0.62,
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
  }, []);
  const endCameraDrag = useCallback(() => {
    dragRef.current = null;
  }, []);
  const zoomCamera = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    controls.current.cameraDistance = THREE.MathUtils.clamp(
      controls.current.cameraDistance + event.deltaY * 0.012,
      9,
      23,
    );
  }, []);

  const windRelativeDegrees = THREE.MathUtils.radToDeg(signedAngleDifference(hud.windHeading, hud.heading));
  const used = cargoUsed(trade.cargo);

  return (
    <div
      className="relative h-full w-full select-none overflow-hidden bg-[#07191d] text-white [touch-action:none]"
      onPointerDown={beginCameraDrag}
      onPointerMove={moveCamera}
      onPointerUp={endCameraDrag}
      onPointerCancel={endCameraDrag}
      onWheel={zoomCamera}
    >
      <Canvas
        shadows={coarse ? false : "percentage"}
        dpr={coarse ? 1 : [1, 1.55]}
        camera={{ fov: 53, near: 0.08, far: 900, position: [0, 9, 20] }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <OceanWorld
          controls={controls}
          paused={Boolean(docked)}
          onHud={setHud}
          onDiscover={onDiscover}
          onFinish={finish}
          onSnapshot={onSnapshot}
          restore={restore}
          portNames={copy.ports}
          coarse={coarse}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_52%,rgba(4,15,18,.48)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#031014]/65 to-transparent" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-5">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#061519]/68 px-3 py-2 backdrop-blur-md">
          <div className="relative grid size-10 place-items-center rounded-full border border-[#d8c18f]/35">
            <Navigation
              className="size-5 text-[#e4c77f] transition-transform"
              style={{ transform: `rotate(${windRelativeDegrees}deg)` }}
              aria-hidden="true"
            />
            <span className="absolute -top-1 bg-[#061519] px-1 text-[7px] font-black text-white/70">N</span>
          </div>
          <div>
            <p className="font-mono text-[8px] font-bold tracking-[.18em] text-[#9fb5b1]">{copy.wind}</p>
            <p className="font-mono text-xs font-black text-white">{Math.round(hud.windSpeed * 1.94)} {copy.knots}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#061519]/72 px-4 py-2 text-center backdrop-blur-md">
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-[9px] font-bold tracking-[.16em] text-[#d6b778]">{copy.dayPhases[hud.dayPhase]}</span>
            <strong className="font-mono text-lg text-white">{formatVoyageTime(hud.timeLeft)}</strong>
          </div>
          <div className="mt-1 h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[#d6b778]" style={{ width: `${Math.max(0, hud.timeLeft / VOYAGE_SECONDS) * 100}%` }} />
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2" data-panel>
          <button
            type="button"
            onClick={onToggleAudio}
            className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#061519]/72 text-[#e4c77f] backdrop-blur-md"
            aria-label={audioEnabled ? copy.soundOn : copy.soundOff}
            title={audioEnabled ? copy.soundOn : copy.soundOff}
          >
            {audioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            type="button"
            onClick={finish}
            className="hidden min-h-11 rounded-xl border border-white/10 bg-[#061519]/72 px-3 font-mono text-[9px] font-black tracking-wider text-white/80 backdrop-blur-md sm:block"
          >
            {copy.endVoyage}
          </button>
        </div>
      </header>

      <aside className="pointer-events-none absolute left-3 top-20 z-20 hidden w-40 rounded-xl border border-white/10 bg-[#061519]/66 p-3 backdrop-blur-md sm:block">
        <p className="font-mono text-[8px] font-bold tracking-[.18em] text-[#d6b778]">{copy.voyage}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
          {[
            [copy.speed, `${hud.speed.toFixed(1)} ${copy.knots}`],
            [copy.sails, `${Math.round(hud.sail * 100)}%`],
            [copy.gold, trade.gold.toLocaleString()],
            [copy.cargo, `${used}/${trade.capacity}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[8px] font-bold uppercase tracking-wide text-[#799591]">{label}</dt>
              <dd className="mt-0.5 font-mono text-[11px] font-black text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <MiniMap hud={hud} visited={trade.visited} />

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-8">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2" data-panel>
          <div className="rounded-xl border border-white/10 bg-[#061519]/72 px-3 py-2 text-center backdrop-blur-md">
            <p className="font-mono text-[8px] font-bold tracking-[.16em] text-[#8fa9a5]">{copy.near}</p>
            <p className="mt-0.5 text-xs font-black text-white">
              {copy.ports[hud.nearestPort]} · {Math.round(hud.nearestDistance)}m
            </p>
          </div>
          {hud.nearestDistance < 45 && (
            <button
              type="button"
              disabled={!hud.dockable || Boolean(docked)}
              onClick={() => setDocked(hud.nearestPort)}
              className="min-h-12 rounded-xl bg-[#e3bd72] px-5 font-mono text-[10px] font-black tracking-[.14em] text-[#102325] disabled:cursor-not-allowed disabled:bg-[#5d6966] disabled:text-white/60"
            >
              <Anchor className="mr-2 inline size-4" />
              {hud.dockable ? copy.dock : copy.slowToDock}
            </button>
          )}
        </div>
      </div>

      <MobileHelm controls={controls} copy={copy} onDock={() => hud.dockable && setDocked(hud.nearestPort)} />

      {notice && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-24 z-40 -translate-x-1/2 rounded-xl border border-[#d6b778]/40 bg-[#102326]/92 px-5 py-3 text-center font-mono text-[10px] font-black tracking-[.14em] text-[#f5deb0] shadow-xl">
          {notice}
        </div>
      )}

      {port && prices && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[#031014]/58 p-3 backdrop-blur-sm">
          <section data-panel className="max-h-[92%] w-full max-w-xl overflow-auto rounded-2xl border border-[#d6b778]/30 bg-[#0b2023]/96 p-4 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] font-bold tracking-[.2em] text-[#d6b778]">{copy.market}</p>
                <h2 className="mt-1 font-serif text-2xl font-black text-[#f7ead0]">{copy.ports[port.id]}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDocked(null)}
                className="grid size-11 place-items-center rounded-xl border border-white/10 text-white/75"
                aria-label={copy.close}
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-center">
              <Metric label={copy.gold} value={trade.gold.toLocaleString()} />
              <Metric label={copy.hold} value={`${used}/${trade.capacity}`} />
              <Metric label={copy.profit} value={`${trade.tradeProfit >= 0 ? "+" : ""}${trade.tradeProfit.toLocaleString()}`} />
            </div>

            <div className="mt-4 space-y-2">
              {GOOD_IDS.map((good) => (
                <div key={good} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3 sm:grid-cols-[1fr_90px_auto]">
                  <div>
                    <p className="text-sm font-black text-white">{copy.goods[good]}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-[#8fa9a5]">
                      {copy.hold} {trade.cargo[good]} · {GOODS[good].volume}u
                    </p>
                  </div>
                  <strong className="font-mono text-sm text-[#f0d49a]">{prices[good]} ◈</strong>
                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => transact("buy", good)}
                      className="min-h-11 flex-1 rounded-lg bg-[#d6b778] px-3 font-mono text-[9px] font-black text-[#102325]"
                    >
                      {copy.buy}
                    </button>
                    <button
                      type="button"
                      onClick={() => transact("sell", good)}
                      className="min-h-11 flex-1 rounded-lg border border-[#d6b778]/40 px-3 font-mono text-[9px] font-black text-[#f0d49a]"
                    >
                      {copy.sell}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDocked(null)}
              className="mt-5 min-h-12 w-full rounded-xl bg-[#e3bd72] font-mono text-[10px] font-black tracking-[.15em] text-[#102325]"
            >
              {copy.close}
            </button>
          </section>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 font-mono text-[8px] font-bold tracking-widest text-white/40 sm:block">
        {copy.cameraHint}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-wider text-[#799591]">{label}</p>
      <p className="mt-1 font-mono text-xs font-black text-white">{value}</p>
    </div>
  );
}

function MiniMap({ hud, visited }: { hud: HudState; visited: PortId[] }) {
  return (
    <div data-panel className="pointer-events-none absolute right-3 top-20 z-20 hidden size-36 rounded-full border border-[#d6b778]/25 bg-[#061519]/70 shadow-xl backdrop-blur-md md:block">
      <div className="absolute inset-3 rounded-full border border-white/10">
        {PORTS.map((port) => (
          <span
            key={port.id}
            className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${visited.includes(port.id) ? "bg-[#e3bd72]" : "bg-white/35"}`}
            style={{ left: `${50 + port.x / 3.6}%`, top: `${50 - port.z / 3.6}%` }}
          />
        ))}
        <Navigation
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 text-[#9ff0e3]"
          style={{
            left: `${THREE.MathUtils.clamp(50 + hud.x / 3.6, 4, 96)}%`,
            top: `${THREE.MathUtils.clamp(50 - hud.z / 3.6, 4, 96)}%`,
            transform: `translate(-50%,-50%) rotate(${THREE.MathUtils.radToDeg(hud.heading)}deg)`,
          }}
        />
      </div>
      <span className="absolute left-1/2 top-1 -translate-x-1/2 font-mono text-[7px] font-black text-white/50">N</span>
    </div>
  );
}

function MobileHelm({
  controls,
  copy,
  onDock,
}: {
  controls: RefObject<Controls>;
  copy: WindwardSceneCopy;
  onDock: () => void;
}) {
  const hold = (key: "rudder" | "throttle", value: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      controls.current[key] = value;
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      controls.current[key] = 0;
    },
    onPointerCancel: () => {
      controls.current[key] = 0;
    },
  });

  const button = "grid size-12 place-items-center rounded-full border border-white/15 bg-[#061519]/78 text-white shadow-xl backdrop-blur-md active:bg-[#d6b778] active:text-[#102325]";
  return (
    <div data-panel className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-end justify-between px-3 sm:hidden">
      <div className="pointer-events-auto flex gap-2">
        <button type="button" className={button} aria-label="Steer left" {...hold("rudder", -1)}>
          <ChevronLeft className="size-6" />
        </button>
        <button type="button" className={button} aria-label="Steer right" {...hold("rudder", 1)}>
          <ChevronRight className="size-6" />
        </button>
      </div>
      <button
        type="button"
        onClick={onDock}
        className="pointer-events-auto grid size-12 place-items-center rounded-full bg-[#e3bd72] text-[#102325] shadow-xl"
        aria-label={copy.dock}
      >
        <Anchor className="size-5" />
      </button>
      <div className="pointer-events-auto flex gap-2">
        <button type="button" className={button} aria-label={`${copy.sails} -`} {...hold("throttle", -1)}>
          <Minus className="size-5" />
        </button>
        <button type="button" className={button} aria-label={`${copy.sails} +`} {...hold("throttle", 1)}>
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

interface OceanWorldProps {
  controls: RefObject<Controls>;
  paused: boolean;
  onHud: (state: HudState) => void;
  onDiscover: () => void;
  onFinish: () => void;
  onSnapshot: (vessel: VesselState, elapsedSeconds: number, foundMarks: string[]) => void;
  restore: WindwardSaveV1 | null;
  portNames: Record<PortId, string>;
  coarse: boolean;
}

function OceanWorld({ controls, paused, onHud, onDiscover, onFinish, onSnapshot, restore, portNames, coarse }: OceanWorldProps) {
  const vessel = useRef<VesselState>(
    restore?.vessel ?? {
      x: 0,
      z: 51,
      heading: Math.PI / 2,
      speed: 0,
      sail: 0.18,
      rudder: 0,
      heel: 0,
    },
  );
  const environment = useRef<SailingEnvironment>({ windHeading: Math.PI * 1.08, windSpeed: 10 });
  // Wind is a deterministic function of `elapsed`, not a separate random seed
  // (see the useFrame block below) — restoring this one number is enough to
  // put the environment exactly where it was when the save was written.
  const elapsed = useRef(restore?.elapsedSeconds ?? 0);
  const lastHud = useRef(0);
  const lastSnapshot = useRef(0);
  const discovered = useRef(new Set<string>(restore?.foundMarks ?? []));
  const finished = useRef(false);

  useFrame((state, delta) => {
    const renderTime = state.clock.elapsedTime;
    if (!paused) {
      elapsed.current += Math.min(delta, 0.1);
      environment.current.windHeading = Math.PI * 1.08 + Math.sin(elapsed.current * 0.013) * 0.52;
      environment.current.windSpeed = 10.2 + Math.sin(elapsed.current * 0.031) * 1.8 + Math.cos(elapsed.current * 0.009) * 0.9;
      let next = stepVessel(vessel.current, controls.current, environment.current, delta);
      for (const port of PORTS) next = resolveIslandCollision(next, port);
      vessel.current = next;

      for (const mark of DISCOVERY_MARKS) {
        if (discovered.current.has(mark.id)) continue;
        if (Math.hypot(next.x - mark.x, next.z - mark.z) < 28) {
          discovered.current.add(mark.id);
          onDiscover();
        }
      }
    } else {
      vessel.current.speed *= Math.pow(0.08, Math.min(delta, 0.1));
    }

    const timeLeft = Math.max(0, VOYAGE_SECONDS - elapsed.current);
    if (timeLeft <= 0 && !finished.current) {
      finished.current = true;
      onFinish();
    }

    if (!finished.current && renderTime - lastSnapshot.current > 3) {
      lastSnapshot.current = renderTime;
      onSnapshot(vessel.current, elapsed.current, [...discovered.current]);
    }

    if (renderTime - lastHud.current > 0.09) {
      lastHud.current = renderTime;
      const closest = nearestPort(vessel.current);
      const day = (0.18 + elapsed.current / 250) % 1;
      onHud({
        timeLeft,
        day,
        dayPhase: phaseForDay(day),
        windHeading: environment.current.windHeading,
        windSpeed: environment.current.windSpeed,
        heading: vessel.current.heading,
        speed: vessel.current.speed * 1.94,
        sail: vessel.current.sail,
        x: vessel.current.x,
        z: vessel.current.z,
        nearestPort: closest.port.id,
        nearestDistance: closest.distance,
        dockable: canDock(vessel.current, closest.port),
      });
    }
  });

  return (
    <>
      <color attach="background" args={["#081b20"]} />
      <fogExp2 attach="fog" args={["#8ba6a3", 0.006]} />
      <SkyDome />
      <WorldLighting />
      <OceanSurface vessel={vessel} environment={environment} coarse={coarse} />
      <FogBanks />
      {PORTS.map((port) => <PortIsland key={port.id} port={port} name={portNames[port.id]} />)}
      {DISCOVERY_MARKS.map((mark) => <SeaMark key={mark.id} {...mark} />)}
      <WakeFoam vessel={vessel} />
      <ShipEntity vessel={vessel} environment={environment} />
      <CameraRig vessel={vessel} controls={controls} />
    </>
  );
}

function phaseForDay(day: number): DayPhase {
  if (day >= 0.18 && day < 0.29) return "dawn";
  if (day >= 0.29 && day < 0.68) return "day";
  if (day >= 0.68 && day < 0.79) return "dusk";
  return "night";
}

const WATER_VERTEX = `
  uniform float uTime;
  uniform vec2 uCenter;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vCrest;
  #include <fog_pars_vertex>

  float heightAt(vec2 p) {
    float h = 0.0;
    h += sin(dot(p, normalize(vec2(1.0, 0.35))) * 0.105 + uTime * 0.92) * 0.72;
    h += sin(dot(p, normalize(vec2(-0.28, 1.0))) * 0.165 + uTime * 1.31) * 0.34;
    h += sin(dot(p, normalize(vec2(0.72, -0.62))) * 0.245 + uTime * 1.72) * 0.18;
    h += sin(dot(p, normalize(vec2(-0.92, -0.22))) * 0.39 + uTime * 2.16) * 0.085;
    return h;
  }

  void main() {
    vec3 transformed = position;
    vec2 worldXZ = vec2(position.x + uCenter.x, -position.y + uCenter.y);
    float h = heightAt(worldXZ);
    float eps = 0.22;
    float hx = heightAt(worldXZ + vec2(eps, 0.0));
    float hz = heightAt(worldXZ + vec2(0.0, eps));
    transformed.z += h;
    vec3 objectNormal = normalize(vec3(-(hx - h) / eps, (hz - h) / eps, 1.0));
    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vCrest = h + abs(hx - h) * 1.8 + abs(hz - h) * 1.8;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const WATER_FRAGMENT = `
  uniform float uTime;
  uniform float uDay;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vCrest;
  #include <common>
  #include <fog_pars_fragment>

  void main() {
    float sunHeight = sin((uDay - 0.25) * 6.2831853);
    float daylight = smoothstep(-0.12, 0.34, sunHeight);
    float dusk = pow(1.0 - abs(sunHeight), 7.0);
    vec3 nightDeep = vec3(0.004, 0.025, 0.045);
    vec3 dayDeep = vec3(0.012, 0.16, 0.20);
    vec3 nightShallow = vec3(0.015, 0.08, 0.12);
    vec3 dayShallow = vec3(0.08, 0.38, 0.42);
    vec3 deep = mix(nightDeep, dayDeep, daylight);
    vec3 shallow = mix(nightShallow, dayShallow, daylight);
    deep += dusk * vec3(0.12, 0.045, 0.018);
    shallow += dusk * vec3(0.24, 0.09, 0.025);

    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
    float glint = pow(max(dot(reflect(normalize(vec3(-0.35, -0.82, -0.28)), normal), viewDir), 0.0), 120.0);
    float detail = sin(vWorldPosition.x * 0.34 + uTime * 1.4) * sin(vWorldPosition.z * 0.29 - uTime) * 0.035;
    vec3 color = mix(deep, shallow, 0.36 + fresnel * 0.48 + detail);
    color += glint * mix(vec3(0.34, 0.46, 0.48), vec3(1.0, 0.79, 0.43), dusk);

    float crest = smoothstep(0.78, 1.28, vCrest);
    float broken = smoothstep(0.2, 0.9, sin(vWorldPosition.x * 1.7 + vWorldPosition.z * 1.25 + uTime * 3.2));
    float foam = crest * mix(0.28, 0.8, broken);
    color = mix(color, vec3(0.76, 0.91, 0.88), foam);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function OceanSurface({
  vessel,
  environment,
  coarse,
}: {
  vessel: RefObject<VesselState>;
  environment: RefObject<SailingEnvironment>;
  coarse: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDay: { value: 0.18 },
        uCenter: { value: new THREE.Vector2() },
        uWind: { value: environment.current.windHeading },
      },
    ]),
    fog: true,
  }), [environment]);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.position.set(vessel.current.x, 0, vessel.current.z);
    material.uniforms.uCenter.value.set(vessel.current.x, vessel.current.z);
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uDay.value = (0.18 + state.clock.elapsedTime / 250) % 1;
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} receiveShadow frustumCulled={false}>
      <planeGeometry args={[580, 580, coarse ? 92 : 144, coarse ? 92 : 144]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

const SKY_VERTEX = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT = `
  uniform float uDay;
  varying vec3 vDirection;
  void main() {
    float sunAngle = (uDay - 0.25) * 6.2831853;
    vec3 sunDir = normalize(vec3(cos(sunAngle) * 0.65, sin(sunAngle), 0.38));
    float sunHeight = sunDir.y;
    float daylight = smoothstep(-0.16, 0.28, sunHeight);
    float horizon = pow(1.0 - abs(vDirection.y), 4.0);
    float dusk = pow(1.0 - abs(sunHeight), 8.0);
    vec3 zenith = mix(vec3(0.005, 0.012, 0.045), vec3(0.15, 0.48, 0.67), daylight);
    vec3 horizonColor = mix(vec3(0.025, 0.06, 0.105), vec3(0.63, 0.79, 0.78), daylight);
    horizonColor += dusk * vec3(0.58, 0.16, 0.035);
    vec3 color = mix(zenith, horizonColor, horizon);
    float sun = pow(max(dot(vDirection, sunDir), 0.0), 950.0);
    float sunGlow = pow(max(dot(vDirection, sunDir), 0.0), 18.0);
    float moon = pow(max(dot(vDirection, -sunDir), 0.0), 720.0) * (1.0 - daylight);
    color += sun * vec3(1.0, 0.9, 0.62) * 4.0 + sunGlow * vec3(1.0, 0.44, 0.12) * dusk * 0.45;
    color += moon * vec3(0.7, 0.8, 1.0) * 1.8;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function SkyDome() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { uDay: { value: 0.18 } },
    side: THREE.BackSide,
    depthWrite: false,
  }), []);
  useFrame((state) => {
    material.uniforms.uDay.value = (0.18 + state.clock.elapsedTime / 250) % 1;
  });
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={600} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function WorldLighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  useFrame((state) => {
    const day = (0.18 + state.clock.elapsedTime / 250) % 1;
    const angle = (day - 0.25) * Math.PI * 2;
    const height = Math.sin(angle);
    const daylight = THREE.MathUtils.smoothstep(height, -0.15, 0.35);
    const dusk = Math.pow(1 - Math.abs(height), 7);
    if (sun.current) {
      sun.current.position.set(Math.cos(angle) * 110, height * 125, 45);
      sun.current.intensity = 0.15 + daylight * 2.1;
      sun.current.color.setRGB(1, 0.72 + daylight * 0.22, 0.55 + daylight * 0.35);
    }
    if (ambient.current) {
      ambient.current.intensity = 0.22 + daylight * 0.82;
      ambient.current.color.setRGB(0.34 + daylight * 0.42, 0.47 + daylight * 0.4, 0.58 + daylight * 0.35);
      ambient.current.groundColor.setRGB(0.03 + dusk * 0.12, 0.08, 0.08);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setRGB(
        0.055 + daylight * 0.43 + dusk * 0.12,
        0.1 + daylight * 0.48 + dusk * 0.04,
        0.14 + daylight * 0.46,
      );
    }
  });
  return (
    <>
      <hemisphereLight ref={ambient} args={["#8bb4ca", "#10201e", 0.8]} />
      <directionalLight ref={sun} castShadow position={[70, 100, 35]} intensity={2} shadow-mapSize={[1024, 1024]} shadow-camera-far={260} shadow-camera-left={-130} shadow-camera-right={130} shadow-camera-top={130} shadow-camera-bottom={-130} />
    </>
  );
}

const FOG_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FOG_FRAGMENT = `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float radial = smoothstep(1.0, 0.08, length(p * vec2(1.0, 2.2)));
    float cloud = noise(vUv * 5.0 + vec2(uTime * 0.018, 0.0)) * 0.55 + noise(vUv * 11.0 - uTime * 0.011) * 0.3;
    float alpha = radial * smoothstep(0.25, 0.8, cloud) * 0.34;
    gl_FragColor = vec4(vec3(0.72, 0.82, 0.81), alpha);
  }
`;

function FogBanks() {
  const banks = useMemo(() => [
    [-95, 20, -118, 105, 32],
    [86, 14, -152, 92, 27],
    [168, 18, 62, 112, 34],
    [-170, 16, 84, 120, 34],
    [30, 12, 174, 92, 26],
    [-12, 18, -206, 130, 38],
  ] as const, []);
  return <>{banks.map((bank, index) => <FogBillboard key={index} values={bank} />)}</>;
}

function FogBillboard({ values }: { values: readonly [number, number, number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FOG_VERTEX,
    fragmentShader: FOG_FRAGMENT,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);
  useFrame((state) => {
    if (mesh.current) mesh.current.quaternion.copy(camera.quaternion);
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh ref={mesh} position={[values[0], values[1], values[2]]} scale={[values[3], values[4], 1]} renderOrder={4}>
      <planeGeometry />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function PortIsland({ port, name }: { port: (typeof PORTS)[number]; name: string }) {
  const palette: Record<PortId, [string, string]> = {
    azurehaven: ["#4d6870", "#c9a86c"],
    sunspire: ["#9a6847", "#e2bb68"],
    jadegate: ["#4e7162", "#9cb88a"],
    ironcape: ["#59636a", "#aa7356"],
    amberreach: ["#7b6950", "#d5a867"],
  };
  const [rock, roof] = palette[port.id];
  const houses = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const angle = (index / 7) * Math.PI * 2 + port.radius;
    const radius = port.radius * (0.26 + ((index * 37) % 5) * 0.07);
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: 0.85 + (index % 3) * 0.18,
    };
  }), [port.radius]);

  return (
    <group position={[port.x, 0, port.z]}>
      <mesh receiveShadow position={[0, -0.55, 0]}>
        <cylinderGeometry args={[port.radius + 5, port.radius + 8, 1.5, 36]} />
        <meshStandardMaterial color="#bfa97b" roughness={0.95} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[port.radius * 0.7, port.radius, 4.2, 28, 3]} />
        <meshStandardMaterial color={rock} roughness={0.88} />
      </mesh>
      <mesh receiveShadow position={[0, 3.1, 0]}>
        <cylinderGeometry args={[port.radius * 0.62, port.radius * 0.72, 0.55, 28]} />
        <meshStandardMaterial color="#657653" roughness={1} />
      </mesh>
      {houses.map((house, index) => (
        <group key={index} position={[house.x, 4, house.z]} scale={house.scale}>
          <mesh castShadow>
            <boxGeometry args={[2.2, 2.2, 2]} />
            <meshStandardMaterial color={index % 2 ? "#d7c8a2" : "#bda984"} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.8, 1.25, 4]} />
            <meshStandardMaterial color={roof} roughness={0.82} />
          </mesh>
        </group>
      ))}
      <group position={[port.radius + 7, 1.1, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[15, 0.55, 3.2]} />
          <meshStandardMaterial color="#795f3f" roughness={0.92} />
        </mesh>
        {[...Array(6)].map((_, index) => (
          <mesh key={index} position={[-6 + index * 2.5, -1, index % 2 ? 1.15 : -1.15]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 3, 8]} />
            <meshStandardMaterial color="#4b3826" />
          </mesh>
        ))}
      </group>
      <group position={[-port.radius * 0.35, 7.2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.85, 1.1, 7.5, 12]} />
          <meshStandardMaterial color="#e7dfc3" roughness={0.8} />
        </mesh>
        <mesh position={[0, 4.2, 0]}>
          <cylinderGeometry args={[1.35, 1.35, 0.9, 12]} />
          <meshStandardMaterial color={roof} metalness={0.15} roughness={0.55} />
        </mesh>
        <pointLight position={[0, 4.35, 0]} color="#ffd78c" intensity={22} distance={32} />
      </group>
      <Html position={[0, 10.5, 0]} center distanceFactor={34} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full border border-white/20 bg-[#07191d]/80 px-3 py-1 font-mono text-[9px] font-black tracking-[.12em] text-white shadow-lg backdrop-blur-sm">
          {name}
        </div>
      </Html>
      <ShoreFoam radius={port.radius + 6.5} />
    </group>
  );
}

function ShoreFoam({ radius }: { radius: number }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (material.current) material.current.opacity = 0.24 + Math.sin(state.clock.elapsedTime * 1.4 + radius) * 0.08;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
      <ringGeometry args={[radius - 1.1, radius + 1.8, 64]} />
      <meshBasicMaterial ref={material} color="#dff7ef" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

function SeaMark({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0.2, z]}>
      <mesh castShadow position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.7, 1.15, 4.2, 10]} />
        <meshStandardMaterial color="#35474a" roughness={0.75} metalness={0.25} />
      </mesh>
      <mesh position={[0, 4.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.1, 0.22, 10, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
      </mesh>
      <pointLight position={[0, 4.8, 0]} color={color} intensity={15} distance={35} />
    </group>
  );
}

function waveHeightAt(x: number, z: number, time: number): number {
  const wave = (dx: number, dz: number, frequency: number, speed: number, amplitude: number) => {
    const length = Math.hypot(dx, dz);
    return Math.sin((x * dx / length + z * dz / length) * frequency + time * speed) * amplitude;
  };
  return wave(1, 0.35, 0.105, 0.92, 0.72) +
    wave(-0.28, 1, 0.165, 1.31, 0.34) +
    wave(0.72, -0.62, 0.245, 1.72, 0.18) +
    wave(-0.92, -0.22, 0.39, 2.16, 0.085);
}

function ShipEntity({
  vessel,
  environment,
}: {
  vessel: RefObject<VesselState>;
  environment: RefObject<SailingEnvironment>;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const current = vessel.current;
    const time = state.clock.elapsedTime;
    const forwardX = Math.sin(current.heading);
    const forwardZ = Math.cos(current.heading);
    const sideX = Math.cos(current.heading);
    const sideZ = -Math.sin(current.heading);
    const height = waveHeightAt(current.x, current.z, time);
    const front = waveHeightAt(current.x + forwardX * 3.5, current.z + forwardZ * 3.5, time);
    const back = waveHeightAt(current.x - forwardX * 3.5, current.z - forwardZ * 3.5, time);
    const left = waveHeightAt(current.x - sideX * 1.4, current.z - sideZ * 1.4, time);
    const right = waveHeightAt(current.x + sideX * 1.4, current.z + sideZ * 1.4, time);
    const pitch = Math.atan2(back - front, 7);
    const roll = Math.atan2(left - right, 2.8) + current.heel;
    group.current.position.set(current.x, height + 0.82, current.z);
    group.current.rotation.set(pitch, current.heading, roll, "YXZ");
  });
  return (
    <group ref={group}>
      <TallShip vessel={vessel} environment={environment} />
    </group>
  );
}

function TallShip({
  vessel,
  environment,
}: {
  vessel: RefObject<VesselState>;
  environment: RefObject<SailingEnvironment>;
}) {
  const rig = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!rig.current) return;
    const relative = signedAngleDifference(environment.current.windHeading, vessel.current.heading);
    rig.current.rotation.y = THREE.MathUtils.clamp(relative * 0.26, -0.62, 0.62);
  });

  return (
    <group scale={0.9}>
      <mesh castShadow receiveShadow position={[0, 0.1, 0]} scale={[1.7, 1.05, 5.1]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshStandardMaterial color="#3b2115" roughness={0.64} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.72, 0]} scale={[1.48, 0.18, 4.6]}>
        <boxGeometry />
        <meshStandardMaterial color="#98714a" roughness={0.78} />
      </mesh>
      <mesh castShadow position={[0, 1.28, -3.35]}>
        <boxGeometry args={[2.65, 1.25, 2.1]} />
        <meshStandardMaterial color="#5a321f" roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 2.0, -3.4]}>
        <boxGeometry args={[2.25, 0.28, 1.7]} />
        <meshStandardMaterial color="#b18a56" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.7, 5.1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1.2, 3.5, 4]} />
        <meshStandardMaterial color="#3b2115" roughness={0.7} />
      </mesh>

      {[-1, 1].flatMap((side) => [-2.8, -1.35, 0.1, 1.55, 3].map((z) => (
        <group key={`${side}:${z}`} position={[side * 1.68, 0.55, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.19, 0.23, 0.75, 10]} />
            <meshStandardMaterial color="#25282a" metalness={0.65} roughness={0.38} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <torusGeometry args={[0.32, 0.08, 8, 16]} />
            <meshStandardMaterial color="#9f7b48" metalness={0.4} roughness={0.45} />
          </mesh>
        </group>
      )))}

      {[-1, 1].map((side) => (
        <group key={side}>
          <Line points={[[side * 1.68, 1.35, -4.2], [side * 1.68, 1.35, 4.3]]} color="#c6a76d" lineWidth={1.2} />
          {[-3.5, -2, -0.5, 1, 2.5, 4].map((z) => (
            <mesh key={z} castShadow position={[side * 1.68, 1.45, z]}>
              <cylinderGeometry args={[0.055, 0.07, 1.2, 6]} />
              <meshStandardMaterial color="#7a5733" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      <group ref={rig}>
        <Mast position={[0, 1, 1.45]} height={9.4} />
        <Mast position={[0, 1, -1.45]} height={8.2} />
        <Sail position={[0, 6.5, 1.52]} size={[5.0, 3.2]} vessel={vessel} tone="#efe0b2" />
        <Sail position={[0, 3.95, 1.52]} size={[4.3, 2.0]} vessel={vessel} tone="#e2cc99" />
        <Sail position={[0, 5.6, -1.38]} size={[4.2, 2.75]} vessel={vessel} tone="#ead7a6" />
        <Sail position={[0, 3.35, -1.38]} size={[3.5, 1.7]} vessel={vessel} tone="#d9c18c" />
      </group>

      <Line points={[[0, 10.1, 1.45], [0, 1.6, 5.6]]} color="#776044" lineWidth={0.8} />
      <Line points={[[0, 10.1, 1.45], [0, 2, -4.3]]} color="#776044" lineWidth={0.8} />
      <Line points={[[-1.7, 1.4, -3.8], [0, 9.2, -1.45], [1.7, 1.4, -3.8]]} color="#776044" lineWidth={0.8} />
      <Line points={[[-1.7, 1.4, 3.8], [0, 10.1, 1.45], [1.7, 1.4, 3.8]]} color="#776044" lineWidth={0.8} />

      {[-1.25, 1.25].map((x) => (
        <group key={x} position={[x, 2, -4.2]}>
          <mesh>
            <boxGeometry args={[0.35, 0.5, 0.35]} />
            <meshStandardMaterial color="#d4a853" emissive="#ffb34c" emissiveIntensity={1.2} />
          </mesh>
          <pointLight color="#ffb45e" intensity={3.5} distance={10} />
        </group>
      ))}
      <mesh position={[0, 1.4, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.08, 8, 24]} />
        <meshStandardMaterial color="#b58b4d" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, -5.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.08, 8, 24]} />
        <meshBasicMaterial color="#e9f8f2" transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function Mast({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.13, 0.22, height, 10]} />
        <meshStandardMaterial color="#6f4b2c" roughness={0.72} />
      </mesh>
      {[height * 0.38, height * 0.68].map((y, index) => (
        <mesh key={y} castShadow position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.1, index ? 5.4 : 4.6, 8]} />
          <meshStandardMaterial color="#594027" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.3, 0]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshStandardMaterial color="#c59a52" metalness={0.45} roughness={0.35} />
      </mesh>
    </group>
  );
}

const SAIL_VERTEX = `
  uniform float uTime;
  uniform float uFill;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float furled = mix(0.18, 1.0, uFill);
    p.x *= furled;
    p.y = mix(position.y * 0.14 + position.y * 0.82, position.y, uFill);
    float edge = sin(uv.x * 3.14159);
    p.z += edge * (0.16 + uFill * 0.38) + sin(uTime * 2.2 + uv.x * 7.0 + uv.y * 2.5) * 0.045 * uFill;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const SAIL_FRAGMENT = `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float seam = smoothstep(0.47, 0.5, abs(fract(vUv.x * 6.0) - 0.5));
    float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, 1.0-vUv.x) *
      smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0-vUv.y);
    vec3 color = uColor * (0.82 + vUv.y * 0.18) - seam * 0.055;
    gl_FragColor = vec4(color, edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Sail({
  position,
  size,
  vessel,
  tone,
}: {
  position: [number, number, number];
  size: [number, number];
  vessel: RefObject<VesselState>;
  tone: string;
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SAIL_VERTEX,
    fragmentShader: SAIL_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uFill: { value: vessel.current.sail },
      uColor: { value: new THREE.Color(tone) },
    },
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.02,
  }), [tone, vessel]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uFill.value = vessel.current.sail;
  });
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh castShadow position={position}>
      <planeGeometry args={[size[0], size[1], 18, 12]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

const WAKE_VERTEX = `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WAKE_FRAGMENT = `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(0.82, 0.96, 0.93, vAlpha);
  }
`;

function WakeFoam({ vessel }: { vessel: RefObject<VesselState> }) {
  const geometry = useMemo(() => {
    const points = 70;
    const positions = new Float32Array(points * 2 * 3);
    const alpha = new Float32Array(points * 2);
    const indices: number[] = [];
    for (let index = 0; index < points - 1; index += 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    result.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    result.setIndex(indices);
    return result;
  }, []);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WAKE_VERTEX,
    fragmentShader: WAKE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);
  const samples = useRef<Array<{ x: number; z: number }>>([]);
  const accumulator = useRef(0);

  useFrame((state, delta) => {
    accumulator.current += delta;
    if (accumulator.current > 0.08) {
      accumulator.current = 0;
      samples.current.unshift({ x: vessel.current.x, z: vessel.current.z });
      samples.current.length = Math.min(samples.current.length, 70);
    }
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const alpha = geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const count = 70;
    for (let index = 0; index < count; index += 1) {
      const sample = samples.current[index] ?? samples.current[samples.current.length - 1] ?? { x: vessel.current.x, z: vessel.current.z };
      const next = samples.current[Math.min(index + 1, samples.current.length - 1)] ?? sample;
      const dx = sample.x - next.x;
      const dz = sample.z - next.z;
      const length = Math.hypot(dx, dz) || 1;
      const sideX = -dz / length;
      const sideZ = dx / length;
      const width = 0.85 + index * 0.045;
      const y = waveHeightAt(sample.x, sample.z, state.clock.elapsedTime) + 0.09;
      positions.setXYZ(index * 2, sample.x + sideX * width, y, sample.z + sideZ * width);
      positions.setXYZ(index * 2 + 1, sample.x - sideX * width, y, sample.z - sideZ * width);
      const fade = Math.max(0, 1 - index / Math.max(1, samples.current.length));
      const strength = Math.min(0.62, vessel.current.speed * 0.12) * fade;
      alpha.setX(index * 2, strength);
      alpha.setX(index * 2 + 1, strength);
    }
    positions.needsUpdate = true;
    alpha.needsUpdate = true;
    geometry.computeBoundingSphere();
  });
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}

function CameraRig({
  vessel,
  controls,
}: {
  vessel: RefObject<VesselState>;
  controls: RefObject<Controls>;
}) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    const current = vessel.current;
    const orbit = current.heading + controls.current.cameraYaw;
    const distance = controls.current.cameraDistance;
    const water = waveHeightAt(current.x, current.z, state.clock.elapsedTime);
    desired.set(
      current.x - Math.sin(orbit) * distance,
      water + 5.2 + controls.current.cameraPitch * 11 + distance * 0.14,
      current.z - Math.cos(orbit) * distance,
    );
    camera.position.lerp(desired, 1 - Math.pow(0.002, Math.min(delta, 0.1)));
    target.set(current.x, water + 2.7, current.z);
    camera.lookAt(target);
  });
  return null;
}
