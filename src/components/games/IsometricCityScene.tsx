import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CirclePause,
  CirclePlay,
  CloudFog,
  CloudRain,
  FastForward,
  Home,
  Landmark,
  Moon,
  Power,
  RotateCcw,
  Route,
  Save,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  Trees,
  Users,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { HorizontalTiltShiftShader } from "three/addons/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/addons/shaders/VerticalTiltShiftShader.js";
import {
  BUILD_COST,
  CITY_SAVE_KEY,
  GRID_SIZE,
  type BuildTool,
  type CityCell,
  type CityState,
  type GridPoint,
  type SimulationSpeed,
  citySummary,
  createMobilityRoutes,
  createStarterCity,
  formatClock,
  getCell,
  isBuilding,
  jumpToTime,
  parseCitySave,
  placeCell,
  placementReason,
  serializeCity,
  simulateCity,
  upgradeCell,
  upgradeCost,
} from "../../lib/games/isometric-city";

const CELL_SIZE = 2;
const WORLD_SIZE = GRID_SIZE * CELL_SIZE;
const BUILD_TOOLS: BuildTool[] = ["road", "residential", "commercial", "park", "civic", "power", "bulldoze"];

export interface IsometricCitySceneCopy {
  cityName: string;
  funds: string;
  population: string;
  jobs: string;
  power: string;
  happiness: string;
  day: string;
  clear: string;
  rain: string;
  fog: string;
  saved: string;
  reset: string;
  resetConfirm: string;
  tools: Record<BuildTool, string>;
  descriptions: Record<BuildTool, string>;
  place: string;
  rotate: string;
  needsRoad: string;
  occupied: string;
  empty: string;
  insufficient: string;
  built: string;
  demolished: string;
  selected: string;
  level: string;
  upgrade: string;
  maxLevel: string;
  noSelection: string;
  connected: string;
  congestion: string;
  balance: string;
  citizens: string;
  capacity: string;
  pause: string;
  play: string;
  fast: string;
  night: string;
  dayTime: string;
  tiltShift: string;
  sound: string;
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext } }

interface Props {
  copy: IsometricCitySceneCopy;
}

const TOOL_ICONS = {
  road: Route,
  residential: Home,
  commercial: Building2,
  park: Trees,
  civic: Landmark,
  power: Power,
  bulldoze: Trash2,
} as const;

const formatMoney = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(value));

const formatSigned = (value: number) => `${value >= 0 ? "+" : "−"}${formatMoney(Math.abs(value))}`;

function reasonMessage(reason: ReturnType<typeof placementReason>, copy: IsometricCitySceneCopy) {
  if (reason === "needs-road") return copy.needsRoad;
  if (reason === "occupied") return copy.occupied;
  if (reason === "empty") return copy.empty;
  if (reason === "funds") return copy.insufficient;
  if (reason === "max-level") return copy.maxLevel;
  if (reason === "bounds") return copy.empty;
  return "";
}

export default function IsometricCityScene({ copy }: Props) {
  const [city, setCity] = useState<CityState>(() => createStarterCity());
  const [hydrated, setHydrated] = useState(false);
  const [tool, setTool] = useState<BuildTool>("residential");
  const [hovered, setHovered] = useState<GridPoint | null>(null);
  const [selected, setSelected] = useState<GridPoint | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [coarse, setCoarse] = useState(false);
  const [tiltShift, setTiltShift] = useState(true);
  const [sound, setSound] = useState(true);
  const lastHover = useRef<string>("");

  useEffect(() => {
    const saved = parseCitySave(window.localStorage.getItem(CITY_SAVE_KEY));
    if (saved) setCity({ ...saved, speed: 0 });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(CITY_SAVE_KEY, serializeCity(city));
      } catch {
        // Storage can be unavailable in hardened/private browser contexts.
      }
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [city, hydrated]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCity((current) => simulateCity(current, 0.25));
    }, 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 640px)");
    const update = () => {
      setCoarse(query.matches);
      if (query.matches) setTiltShift(false);
    };
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2_200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const summary = useMemo(() => citySummary(city), [city]);
  const tone = useCallback((frequency: number) => {
    if (!sound) return; const AudioCtor = window.AudioContext || window.webkitAudioContext; if (!AudioCtor) return;
    const audio = new AudioCtor(), oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.14);
  }, [sound]);
  const clock = formatClock(city);
  const selectedCell = selected ? getCell(city, selected.x, selected.z) : undefined;
  const weatherLabel = city.weather === "rain" ? copy.rain : city.weather === "fog" ? copy.fog : copy.clear;
  const WeatherIcon = city.weather === "rain" ? CloudRain : city.weather === "fog" ? CloudFog : Sun;
  const night = clock.hour < 6 || clock.hour >= 19;

  const updateHover = useCallback((point: GridPoint | null) => {
    const key = point ? `${point.x}:${point.z}` : "";
    if (key === lastHover.current) return;
    lastHover.current = key;
    setHovered(point);
  }, []);

  const handleCell = useCallback((x: number, z: number) => {
    setSelected({ x, z });
    const result = placeCell(city, tool, x, z);
    if (!result.ok) {
      setNotice(reasonMessage(result.reason, copy));
      return;
    }
    setCity(result.state);
    tone(tool === "bulldoze" ? 160 : 420);
    setNotice(tool === "bulldoze" ? copy.demolished : copy.built);
  }, [city, copy, tool, tone]);

  const handleUpgrade = useCallback(() => {
    if (!selected) return;
    const result = upgradeCell(city, selected.x, selected.z);
    if (!result.ok) {
      setNotice(result.reason === "funds" ? copy.insufficient : copy.maxLevel);
      return;
    }
    setCity(result.state);
    tone(620);
    setNotice(copy.built);
  }, [city, copy, selected, tone]);

  const changeSpeed = (speed: SimulationSpeed) => setCity((current) => ({ ...current, speed }));
  const toggleTime = () => setCity((current) => jumpToTime(current, night ? 9 * 60 : 21 * 60));
  const reset = () => {
    if (!window.confirm(copy.resetConfirm)) return;
    const fresh = createStarterCity();
    setCity(fresh);
    setSelected(null);
    setHovered(null);
    setNotice(copy.built);
  };

  return (
    <section className="relative h-[720px] min-h-[680px] touch-none overflow-hidden rounded-[1.7rem] border border-[#cdd9c5] bg-[#dbe8d3] shadow-[0_24px_80px_rgba(53,69,44,.18)] sm:h-[780px]">
      <Canvas
        shadows={coarse ? false : "basic"}
        dpr={coarse ? 1 : [1, 1.65]}
        gl={{ antialias: !coarse, powerPreference: "high-performance", alpha: false }}
        onPointerMissed={() => setSelected(null)}
      >
        <OrthographicCamera makeDefault position={[28, 28, 28]} zoom={coarse ? 20 : 26} near={0.1} far={180} />
        <CityWorld
          city={city}
          tool={tool}
          hovered={hovered}
          selected={selected}
          coarse={coarse}
          onHover={updateHover}
          onCell={handleCell}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.075}
          enablePan={false}
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.41}
          minAzimuthAngle={-Math.PI}
          maxAzimuthAngle={Math.PI}
          minZoom={coarse ? 14 : 18}
          maxZoom={coarse ? 34 : 46}
          target={[0, 0, 0]}
        />
        {tiltShift && !coarse && <TiltShiftComposer />}
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="pointer-events-auto rounded-2xl border border-white/65 bg-white/88 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#526b48] text-white"><Sparkles size={14} /></span>
              <div>
                <p className="text-[9px] font-black tracking-[.18em] text-[#83907d]">{copy.cityName}</p>
                <p className="text-xs font-black text-[#344033]">{copy.day} {clock.day} · {clock.text}</p>
              </div>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/65 bg-white/88 p-1.5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <WeatherIcon size={15} className="mx-1 text-[#65785c]" />
            <span className="hidden text-[10px] font-black text-[#687563] sm:inline">{weatherLabel}</span>
            <ControlButton active={city.speed === 0} label={copy.pause} onClick={() => changeSpeed(0)}><CirclePause size={15} /></ControlButton>
            <ControlButton active={city.speed === 1} label={copy.play} onClick={() => changeSpeed(1)}><CirclePlay size={15} /></ControlButton>
            <ControlButton active={city.speed === 4} label={copy.fast} onClick={() => changeSpeed(4)}><FastForward size={15} /></ControlButton>
            <ControlButton label={night ? copy.dayTime : copy.night} onClick={toggleTime}>{night ? <Sun size={15} /> : <Moon size={15} />}</ControlButton>
            <ControlButton active={sound} label={copy.sound} onClick={() => setSound((value) => !value)}><span aria-hidden="true">♪</span></ControlButton>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:max-w-3xl sm:grid-cols-5 sm:gap-2">
          <Stat icon={Banknote} label={copy.funds} value={`$${formatMoney(city.funds)}`} />
          <Stat icon={Users} label={copy.population} value={formatMoney(summary.population)} />
          <Stat icon={BriefcaseBusiness} label={copy.jobs} value={`${formatMoney(summary.filledJobs)}/${formatMoney(summary.jobs)}`} />
          <Stat icon={Zap} label={copy.power} value={`${Math.round(summary.powerRatio * 100)}%`} hideMobile />
          <Stat icon={Smile} label={copy.happiness} value={`${summary.happiness}%`} hideMobile />
        </div>
      </div>

      <aside className="pointer-events-auto absolute right-3 top-[148px] z-10 hidden w-56 rounded-2xl border border-white/65 bg-white/88 p-4 shadow-xl shadow-black/5 backdrop-blur-xl sm:block">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#859080]">{copy.selected}</p>
          <Save size={14} className="text-[#7d8b76]" aria-label={copy.saved} />
        </div>
        {selectedCell && isBuilding(selectedCell.kind) ? (
          <>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2e9] text-[#50644a]">
                {(() => {
                  const Icon = TOOL_ICONS[selectedCell.kind];
                  return <Icon size={20} />;
                })()}
              </span>
              <div>
                <p className="text-sm font-black text-[#344033]">{copy.tools[selectedCell.kind]}</p>
                <p className="text-[11px] font-bold text-[#83907d]">{copy.level} {selectedCell.level}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#6f7a6b]">{copy.descriptions[selectedCell.kind]}</p>
            <button
              type="button"
              disabled={selectedCell.level >= 3 || city.funds < upgradeCost(selectedCell)}
              onClick={handleUpgrade}
              className="mt-3 flex min-h-10 w-full items-center justify-between rounded-xl bg-[#40563b] px-3 text-xs font-black text-white disabled:bg-[#c8cec4]"
            >
              <span>{selectedCell.level >= 3 ? copy.maxLevel : copy.upgrade}</span>
              {selectedCell.level < 3 && <span>${formatMoney(upgradeCost(selectedCell))}</span>}
            </button>
          </>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[#7b8777]">{copy.noSelection}</p>
        )}
        <div className="mt-4 space-y-2 border-t border-[#e5e9e1] pt-3">
          <MiniMetric label={copy.connected} value={`${summary.connectedRoadCells}/${summary.roadCells}`} />
          <MiniMetric label={copy.congestion} value={`${Math.round(summary.congestion * 100)}%`} />
          <MiniMetric label={copy.balance} value={`$${formatSigned(summary.hourlyBalance)}`} positive={summary.hourlyBalance >= 0} />
          <MiniMetric label={copy.capacity} value={`${formatMoney(summary.population)}/${formatMoney(summary.populationCapacity)}`} />
        </div>
      </aside>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-4">
        {notice && (
          <div role="status" className="mx-auto mb-2 w-fit rounded-full bg-[#26372a]/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur">
            {notice}
          </div>
        )}
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-end gap-1 overflow-x-auto rounded-2xl border border-white/65 bg-white/92 p-1.5 shadow-2xl shadow-black/10 backdrop-blur-xl [scrollbar-width:none]">
          {BUILD_TOOLS.map((item) => {
            const Icon = TOOL_ICONS[item];
            const selectedTool = tool === item;
            const cost = item === "bulldoze" ? null : BUILD_COST[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTool(item)}
                aria-pressed={selectedTool}
                title={copy.descriptions[item]}
                className={`flex min-h-14 min-w-[64px] flex-1 flex-col items-center justify-center rounded-xl px-2 transition ${
                  selectedTool ? "bg-[#3f5639] text-white shadow-md" : "text-[#566451] hover:bg-[#eef2ea]"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="mt-1 whitespace-nowrap text-[10px] font-black">{copy.tools[item]}</span>
                {cost !== null && <span className={`text-[9px] font-bold ${selectedTool ? "text-white/70" : "text-[#9aa394]"}`}>${cost}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] font-bold text-white drop-shadow">
          <span>{copy.rotate}</span>
          <div className="flex gap-1">
            {!coarse && (
              <button
                type="button"
                onClick={() => setTiltShift((value) => !value)}
                className={`min-h-8 rounded-full px-3 ${tiltShift ? "bg-[#3f5639]" : "bg-black/45"}`}
              >
                {copy.tiltShift}
              </button>
            )}
            <button type="button" onClick={reset} className="flex min-h-8 items-center gap-1 rounded-full bg-black/45 px-3">
              <RotateCcw size={12} /> {copy.reset}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlButton({ children, label, active = false, onClick }: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-xl transition ${active ? "bg-[#40563b] text-white" : "text-[#62705e] hover:bg-[#eef2ea]"}`}
    >
      {children}
    </button>
  );
}

function Stat({ icon: Icon, label, value, hideMobile = false }: {
  icon: typeof Banknote;
  label: string;
  value: string;
  hideMobile?: boolean;
}) {
  return (
    <div className={`${hideMobile ? "hidden sm:flex" : "flex"} min-w-0 items-center gap-2 rounded-xl border border-white/65 bg-white/86 px-2.5 py-2 shadow-md shadow-black/5 backdrop-blur-xl`}>
      <Icon size={15} className="shrink-0 text-[#64785a]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[8px] font-black uppercase tracking-[.12em] text-[#899484]">{label}</p>
        <p className="truncate text-xs font-black tabular-nums text-[#374334]">{value}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="font-bold text-[#7c8877]">{label}</span>
      <span className={`font-black tabular-nums ${positive === false ? "text-red-700" : "text-[#455442]"}`}>{value}</span>
    </div>
  );
}

function CityWorld({ city, tool, hovered, selected, coarse, onHover, onCell }: {
  city: CityState;
  tool: BuildTool;
  hovered: GridPoint | null;
  selected: GridPoint | null;
  coarse: boolean;
  onHover: (point: GridPoint | null) => void;
  onCell: (x: number, z: number) => void;
}) {
  const summary = useMemo(() => citySummary(city), [city]);
  const clock = formatClock(city);
  const nightStrength = Math.max(0, Math.min(1, (Math.abs(clock.hour - 12) - 5) / 5));
  const buildings = city.cells.filter((cell) => isBuilding(cell.kind));
  const roads = city.cells.filter((cell) => cell.kind === "road");

  return (
    <>
      <Atmosphere city={city} />
      <hemisphereLight args={["#dfeaf2", "#556149", 1.35 - nightStrength * 0.7]} />
      <directionalLight
        castShadow={!coarse}
        color={nightStrength > 0.6 ? "#a9bde8" : "#ffe0a4"}
        intensity={2.2 - nightStrength * 1.25}
        position={[18, 28, 12]}
        shadow-mapSize-width={coarse ? 512 : 1_536}
        shadow-mapSize-height={coarse ? 512 : 1_536}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      <ambientLight intensity={0.2 + nightStrength * 0.16} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.72, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={city.weather === "rain" ? "#8fa9a2" : "#9ebfc2"} roughness={0.74} metalness={0.06} />
      </mesh>
      <mesh position={[0, -0.33, 0]} receiveShadow castShadow>
        <boxGeometry args={[WORLD_SIZE + 0.8, 0.72, WORLD_SIZE + 0.8]} />
        <meshStandardMaterial color="#96ad7d" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.035, 0]} receiveShadow>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#a9c58d" roughness={1} />
      </mesh>

      {roads.map((cell) => <RoadTile key={`r-${cell.x}-${cell.z}`} cell={cell} city={city} night={nightStrength} />)}
      {buildings.map((cell) => <CityBuilding key={`b-${cell.x}-${cell.z}`} cell={cell} night={nightStrength} />)}
      <StreetLights roads={roads} night={nightStrength} coarse={coarse} />
      <TrafficSystem city={city} coarse={coarse} />
      <PedestrianSystem city={city} coarse={coarse} />
      <Weather city={city} coarse={coarse} />
      <GridInteraction city={city} tool={tool} hovered={hovered} selected={selected} onHover={onHover} onCell={onCell} />

      <mesh position={[0, -0.02, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[WORLD_SIZE + 0.1, WORLD_SIZE + 0.1]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.025} wireframe />
      </mesh>

      <OrbitHintPulse congestion={summary.congestion} />
    </>
  );
}

function gridWorld(x: number, z: number) {
  return {
    x: (x - (GRID_SIZE - 1) / 2) * CELL_SIZE,
    z: (z - (GRID_SIZE - 1) / 2) * CELL_SIZE,
  };
}

function pointCell(point: THREE.Vector3): GridPoint | null {
  const x = Math.floor((point.x + WORLD_SIZE / 2) / CELL_SIZE);
  const z = Math.floor((point.z + WORLD_SIZE / 2) / CELL_SIZE);
  return x >= 0 && z >= 0 && x < GRID_SIZE && z < GRID_SIZE ? { x, z } : null;
}

function GridInteraction({ city, tool, hovered, selected, onHover, onCell }: {
  city: CityState;
  tool: BuildTool;
  hovered: GridPoint | null;
  selected: GridPoint | null;
  onHover: (point: GridPoint | null) => void;
  onCell: (x: number, z: number) => void;
}) {
  const valid = hovered ? placementReason(city, tool, hovered.x, hovered.z) === "ok" : false;
  return (
    <>
      <mesh
        position={[0, 0.06, 0]}
        rotation-x={-Math.PI / 2}
        onPointerMove={(event) => {
          event.stopPropagation();
          onHover(pointCell(event.point));
        }}
        onPointerOut={() => onHover(null)}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 5) return;
          const point = pointCell(event.point);
          if (point) onCell(point.x, point.z);
        }}
      >
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered && <CellMarker point={hovered} color={valid ? "#e8ffbf" : "#ff806c"} height={tool === "road" || tool === "bulldoze" ? 0.08 : 0.72} />}
      {selected && <CellOutline point={selected} />}
    </>
  );
}

function CellMarker({ point, color, height }: { point: GridPoint; color: string; height: number }) {
  const world = gridWorld(point.x, point.z);
  return (
    <mesh position={[world.x, height / 2 + 0.11, world.z]} raycast={() => null}>
      <boxGeometry args={[1.84, height, 1.84]} />
      <meshBasicMaterial color={color} transparent opacity={0.43} depthWrite={false} />
    </mesh>
  );
}

function CellOutline({ point }: { point: GridPoint }) {
  const world = gridWorld(point.x, point.z);
  return (
    <mesh position={[world.x, 0.1, world.z]} rotation-x={-Math.PI / 2} raycast={() => null}>
      <ringGeometry args={[1.16, 1.27, 4]} />
      <meshBasicMaterial color="#f8e783" transparent opacity={0.96} depthWrite={false} />
    </mesh>
  );
}

function RoadTile({ cell, city, night }: { cell: CityCell; city: CityState; night: number }) {
  const world = gridWorld(cell.x, cell.z);
  const horizontal = getCell(city, cell.x - 1, cell.z)?.kind === "road" || getCell(city, cell.x + 1, cell.z)?.kind === "road";
  const vertical = getCell(city, cell.x, cell.z - 1)?.kind === "road" || getCell(city, cell.x, cell.z + 1)?.kind === "road";
  const intersection = horizontal && vertical;
  return (
    <group position={[world.x, 0.085, world.z]} raycast={() => null}>
      <mesh receiveShadow>
        <boxGeometry args={[1.92, 0.12, 1.92]} />
        <meshStandardMaterial color={night > 0.55 ? "#34404a" : "#566261"} roughness={0.9} />
      </mesh>
      {!intersection && (
        [-0.55, 0, 0.55].map((offset) => (
          <mesh key={offset} position={horizontal ? [offset, 0.068, 0] : [0, 0.068, offset]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={horizontal ? [0.28, 0.035] : [0.035, 0.28]} />
            <meshBasicMaterial color="#f3d98b" />
          </mesh>
        ))
      )}
      {intersection && [-0.66, -0.48, 0.48, 0.66].map((offset) => (
        <mesh key={offset} position={[offset, 0.068, 0.68]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.08, 0.34]} />
          <meshBasicMaterial color="#e8e3cb" />
        </mesh>
      ))}
    </group>
  );
}

function CityBuilding({ cell, night }: { cell: CityCell; night: number }) {
  const group = useRef<THREE.Group>(null);
  const world = gridWorld(cell.x, cell.z);
  useFrame((_, delta) => {
    if (!group.current) return;
    const next = Math.min(1, group.current.scale.y + delta * 2.8);
    group.current.scale.y = next;
  });
  return (
    <group ref={group} position={[world.x, 0.15, world.z]} scale={[1, 0.02, 1]} raycast={() => null}>
      {cell.kind === "residential" && <Residential cell={cell} night={night} />}
      {cell.kind === "commercial" && <Commercial cell={cell} night={night} />}
      {cell.kind === "park" && <Park cell={cell} night={night} />}
      {cell.kind === "civic" && <Civic cell={cell} night={night} />}
      {cell.kind === "power" && <PowerPlant cell={cell} night={night} />}
    </group>
  );
}

function Residential({ cell, night }: { cell: CityCell; night: number }) {
  const height = 0.95 + cell.level * 0.72 + ((cell.x * 7 + cell.z * 3) % 4) * 0.16;
  const color = ["#dcae75", "#cc8f6e", "#e4c38c", "#b98366"][(cell.x + cell.z) % 4];
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[1.34, height, 1.34]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, height + 0.12, 0]}>
        <boxGeometry args={[0.58, 0.22, 0.58]} />
        <meshStandardMaterial color="#6f7b68" roughness={0.9} />
      </mesh>
      <WindowBands height={height} rows={cell.level + 2} night={night} warm />
      <mesh position={[0, 0.36, 0.686]}>
        <boxGeometry args={[0.32, 0.62, 0.035]} />
        <meshStandardMaterial color="#4f5f53" roughness={0.65} />
      </mesh>
    </group>
  );
}

function Commercial({ cell, night }: { cell: CityCell; night: number }) {
  const height = 1.55 + cell.level * 1.15 + ((cell.x * 3 + cell.z) % 3) * 0.22;
  const color = ["#73918b", "#8099a1", "#6f8785"][(cell.x + cell.z) % 3];
  return (
    <group rotation-y={((cell.x + cell.z) % 2) * Math.PI / 2}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[1.22, height, 1.48]} />
        <meshStandardMaterial color={color} roughness={0.34} metalness={0.18} />
      </mesh>
      <mesh castShadow position={[0.42, height + 0.18, 0]}>
        <boxGeometry args={[0.25, 0.36, 0.72]} />
        <meshStandardMaterial color="#485e5d" roughness={0.55} />
      </mesh>
      <WindowBands height={height} rows={cell.level + 4} night={night} />
      <mesh position={[-0.64, height * 0.58, 0]}>
        <boxGeometry args={[0.035, 0.14, 0.92]} />
        <meshStandardMaterial color="#e97784" emissive="#e97784" emissiveIntensity={night * 2.8} />
      </mesh>
    </group>
  );
}

function WindowBands({ height, rows, night, warm = false }: { height: number; rows: number; night: number; warm?: boolean }) {
  const color = warm ? "#ffe8a8" : "#aee8e3";
  return (
    <group>
      {Array.from({ length: rows }, (_, index) => {
        const y = 0.38 + (index / Math.max(rows - 1, 1)) * Math.max(0.1, height - 0.72);
        return (
          <group key={index}>
            <mesh position={[0, y, 0.686]}>
              <boxGeometry args={[0.88, 0.1, 0.025]} />
              <meshStandardMaterial color={night > 0.45 ? color : "#b5c4b5"} emissive={color} emissiveIntensity={night * (index % 3 === 0 ? 2.5 : 1.3)} />
            </mesh>
            <mesh position={[0.686, y, 0]} rotation-y={Math.PI / 2}>
              <boxGeometry args={[0.88, 0.1, 0.025]} />
              <meshStandardMaterial color={night > 0.45 ? color : "#b5c4b5"} emissive={color} emissiveIntensity={night * (index % 2 === 0 ? 2.2 : 0.8)} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function LowPolyTree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.55, 6]} />
        <meshStandardMaterial color="#6f573c" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 0.76, 0]}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#557b45" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Park({ cell, night }: { cell: CityCell; night: number }) {
  return (
    <group>
      <mesh receiveShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[1.68, 0.09, 1.68]} />
        <meshStandardMaterial color="#7fa967" roughness={1} />
      </mesh>
      <mesh position={[0, 0.084, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.31, 0.46, 16]} />
        <meshStandardMaterial color="#d9c89f" roughness={1} />
      </mesh>
      <LowPolyTree x={-0.52} z={-0.4} scale={0.82 + cell.level * 0.06} />
      <LowPolyTree x={0.5} z={0.42} scale={0.72} />
      <LowPolyTree x={0.52} z={-0.52} scale={0.58} />
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.12, 12]} />
        <meshStandardMaterial color="#7eb3b5" emissive="#74d1c7" emissiveIntensity={night * 0.9} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Civic({ cell, night }: { cell: CityCell; night: number }) {
  const height = 0.76 + cell.level * 0.22;
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[1.58, height, 1.44]} />
        <meshStandardMaterial color="#e4d5b6" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, height + 0.22, 0]} scale={[1, 0.38, 1]}>
        <sphereGeometry args={[0.58, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#789887" roughness={0.62} metalness={0.08} />
      </mesh>
      {[-0.48, -0.16, 0.16, 0.48].map((x) => (
        <mesh key={x} castShadow position={[x, 0.42, 0.77]}>
          <cylinderGeometry args={[0.055, 0.065, 0.72, 8]} />
          <meshStandardMaterial color="#f3ead6" />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.785]}>
        <boxGeometry args={[0.48, 0.22, 0.03]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffd98a" emissiveIntensity={night * 2.2} />
      </mesh>
    </group>
  );
}

function PowerPlant({ cell, night }: { cell: CityCell; night: number }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.55, 0.6, 1.48]} />
        <meshStandardMaterial color="#7d8d72" roughness={0.82} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <group key={x} position={[x, 0, -0.2]}>
          <mesh castShadow position={[0, 0.9 + cell.level * 0.08, 0]}>
            <cylinderGeometry args={[0.13, 0.19, 1.25 + cell.level * 0.16, 10]} />
            <meshStandardMaterial color="#d6d2bd" roughness={0.72} />
          </mesh>
          <mesh position={[0, 1.5 + cell.level * 0.16, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.09, 10]} />
            <meshStandardMaterial color="#f18b72" emissive="#ff5d4a" emissiveIntensity={night * 2.6} />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.72, 0.42]} rotation-x={-0.38}>
        <boxGeometry args={[1.12, 0.06, 0.62]} />
        <meshStandardMaterial color="#385a63" metalness={0.48} roughness={0.24} />
      </mesh>
    </group>
  );
}

function StreetLights({ roads, night, coarse }: { roads: CityCell[]; night: number; coarse: boolean }) {
  const lamps = roads.filter((cell) => (cell.x * 3 + cell.z * 5) % 13 === 0).slice(0, coarse ? 18 : 34);
  return (
    <group raycast={() => null}>
      {lamps.map((cell, index) => {
        const world = gridWorld(cell.x, cell.z);
        return (
          <group key={`${cell.x}-${cell.z}`} position={[world.x + 0.72, 0, world.z + 0.72]}>
            <mesh castShadow position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.025, 0.035, 0.92, 6]} />
              <meshStandardMaterial color="#34413b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.94, 0]}>
              <sphereGeometry args={[0.075, 7, 5]} />
              <meshStandardMaterial color="#ffe4a6" emissive="#ffc86b" emissiveIntensity={night * 4.2} />
            </mesh>
            {!coarse && night > 0.55 && index % 6 === 0 && (
              <pointLight color="#ffcc7a" intensity={night * 2.2} distance={5} decay={2} position={[0, 0.9, 0]} />
            )}
          </group>
        );
      })}
    </group>
  );
}

function TrafficSystem({ city, coarse }: { city: CityState; coarse: boolean }) {
  const routes = useMemo(() => createMobilityRoutes(city, coarse ? 44 : 96, 2_026), [city.revision, coarse]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = ["#ec715f", "#f4c85e", "#e8eee8", "#5f8fb0", "#425b4c", "#d98d55"];

  useLayoutEffect(() => {
    if (!mesh.current) return;
    routes.forEach((_, index) => mesh.current!.setColorAt(index, new THREE.Color(colors[index % colors.length])));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [routes]);

  useFrame(({ clock }, delta) => {
    if (!mesh.current || routes.length === 0) return;
    const speed = city.speed === 0 ? 0 : Math.max(0.5, city.speed * 0.72);
    routes.forEach((route, index) => {
      const length = route.length - 1;
      const phase = (clock.elapsedTime * speed * (0.72 + (index % 5) * 0.055) + index * 1.83) % length;
      const segment = Math.floor(phase);
      const t = phase - segment;
      const from = gridWorld(route[segment].x, route[segment].z);
      const to = gridWorld(route[(segment + 1) % route.length].x, route[(segment + 1) % route.length].z);
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const magnitude = Math.max(0.001, Math.hypot(dx, dz));
      const lane = index % 2 === 0 ? -0.23 : 0.23;
      dummy.position.set(
        THREE.MathUtils.lerp(from.x, to.x, t) - (dz / magnitude) * lane,
        0.3,
        THREE.MathUtils.lerp(from.z, to.z, t) + (dx / magnitude) * lane,
      );
      dummy.rotation.set(0, Math.atan2(-dz, dx), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    void delta;
  });

  if (routes.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, routes.length]} castShadow={!coarse} raycast={() => null}>
      <boxGeometry args={[0.64, 0.22, 0.32]} />
      <meshStandardMaterial vertexColors roughness={0.48} metalness={0.18} />
    </instancedMesh>
  );
}

function PedestrianSystem({ city, coarse }: { city: CityState; coarse: boolean }) {
  const routes = useMemo(() => createMobilityRoutes(city, coarse ? 72 : 168, 7_771), [city.revision, coarse]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = ["#d85e66", "#f0c16c", "#54778e", "#765c8c", "#e9e0c8", "#445c46"];

  useLayoutEffect(() => {
    if (!mesh.current) return;
    routes.forEach((_, index) => mesh.current!.setColorAt(index, new THREE.Color(colors[index % colors.length])));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [routes]);

  useFrame(({ clock }) => {
    if (!mesh.current || routes.length === 0) return;
    const speed = city.speed === 0 ? 0 : Math.max(0.25, city.speed * 0.28);
    routes.forEach((route, index) => {
      const length = route.length - 1;
      const phase = (clock.elapsedTime * speed * (0.78 + (index % 7) * 0.028) + index * 2.41) % length;
      const segment = Math.floor(phase);
      const t = phase - segment;
      const from = gridWorld(route[segment].x, route[segment].z);
      const to = gridWorld(route[(segment + 1) % route.length].x, route[(segment + 1) % route.length].z);
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const magnitude = Math.max(0.001, Math.hypot(dx, dz));
      const edge = index % 2 === 0 ? -0.72 : 0.72;
      dummy.position.set(
        THREE.MathUtils.lerp(from.x, to.x, t) - (dz / magnitude) * edge,
        0.27 + Math.sin(clock.elapsedTime * 7 + index) * 0.018,
        THREE.MathUtils.lerp(from.z, to.z, t) + (dx / magnitude) * edge,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  });

  if (routes.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, routes.length]} castShadow={false} raycast={() => null}>
      <capsuleGeometry args={[0.075, 0.16, 2, 5]} />
      <meshStandardMaterial vertexColors roughness={0.88} />
    </instancedMesh>
  );
}

function Weather({ city, coarse }: { city: CityState; coarse: boolean }) {
  return (
    <>
      {city.weather === "rain" && <Rain count={coarse ? 600 : 1_500} />}
      {city.weather !== "clear" && <CloudLayer dense={city.weather === "rain"} />}
    </>
  );
}

function Rain({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    let value = 19_911;
    const random = () => {
      value = (value * 1_664_525 + 1_013_904_223) >>> 0;
      return value / 4_294_967_296;
    };
    for (let i = 0; i < count; i += 1) {
      array[i * 3] = (random() - 0.5) * 48;
      array[i * 3 + 1] = random() * 18 + 2;
      array[i * 3 + 2] = (random() - 0.5) * 48;
    }
    return array;
  }, [count]);

  useFrame((_, delta) => {
    if (!points.current) return;
    const attribute = points.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i += 1) {
      const offset = i * 3 + 1;
      attribute.array[offset] = (attribute.array[offset] as number) - delta * 13;
      if ((attribute.array[offset] as number) < 0.4) attribute.array[offset] = 18;
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={points} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d8edf0" size={0.055} transparent opacity={0.64} depthWrite={false} />
    </points>
  );
}

function CloudLayer({ dense }: { dense: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.x += delta * 0.38;
    if (group.current.position.x > 17) group.current.position.x = -17;
  });
  return (
    <group ref={group} position={[-8, 11, -4]} raycast={() => null}>
      {Array.from({ length: dense ? 12 : 7 }, (_, index) => (
        <mesh key={index} position={[(index % 4) * 7 - 10, (index % 3) * 0.7, Math.floor(index / 4) * 8 - 7]} scale={[2.6, 0.65, 1.4]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={dense ? "#87999b" : "#d6dfd8"} transparent opacity={dense ? 0.54 : 0.36} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Atmosphere({ city }: { city: CityState }) {
  const { scene } = useThree();
  const day = useMemo(() => new THREE.Color("#cde4e7"), []);
  const sunset = useMemo(() => new THREE.Color("#e8b38d"), []);
  const night = useMemo(() => new THREE.Color("#26334a"), []);
  const rain = useMemo(() => new THREE.Color("#758b91"), []);
  const fog = useMemo(() => new THREE.Color("#c7d0c7"), []);
  const target = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const angle = (city.minuteOfDay / 1_440) * Math.PI * 2;
    const daylight = Math.max(0, Math.sin(angle - Math.PI / 2));
    const dusk = Math.max(0, 1 - Math.abs(city.minuteOfDay - 18 * 60) / 150);
    target.copy(night).lerp(day, daylight);
    if (dusk > 0) target.lerp(sunset, dusk * 0.72);
    if (city.weather === "rain") target.lerp(rain, 0.58);
    if (city.weather === "fog") target.lerp(fog, 0.62);
    if (!(scene.background instanceof THREE.Color)) scene.background = target.clone();
    else scene.background.lerp(target, 0.045);
    const density = city.weather === "fog" ? 0.035 : city.weather === "rain" ? 0.018 : 0.009;
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(target.getHex(), density);
    scene.fog.color.lerp(target, 0.05);
    scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, density, 0.05);
  });
  return null;
}

function TiltShiftComposer() {
  const { gl, scene, camera, size } = useThree();
  const passes = useMemo(() => {
    const composer = new EffectComposer(gl);
    const horizontal = new ShaderPass(HorizontalTiltShiftShader);
    const vertical = new ShaderPass(VerticalTiltShiftShader);
    horizontal.uniforms.r.value = 0.52;
    vertical.uniforms.r.value = 0.52;
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(horizontal);
    composer.addPass(vertical);
    composer.addPass(new OutputPass());
    return { composer, horizontal, vertical };
  }, [camera, gl, scene]);

  useEffect(() => {
    passes.composer.setSize(size.width, size.height);
    passes.horizontal.uniforms.h.value = 1.7 / Math.max(size.width, 1);
    passes.vertical.uniforms.v.value = 1.7 / Math.max(size.height, 1);
  }, [passes, size.height, size.width]);

  useEffect(() => () => passes.composer.dispose(), [passes]);
  useFrame((_, delta) => passes.composer.render(delta), 1);
  return null;
}

function OrbitHintPulse({ congestion }: { congestion: number }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    ring.current.rotation.z = clock.elapsedTime * 0.08;
  });
  return (
    <mesh ref={ring} position={[0, 0.11, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
      <ringGeometry args={[18.35, 18.45, 64]} />
      <meshBasicMaterial color={congestion > 1 ? "#efb16d" : "#dce9c9"} transparent opacity={0.58} />
    </mesh>
  );
}
