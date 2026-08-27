import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Cloud, Environment, Sky } from "@react-three/drei";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Volume2, VolumeX } from "lucide-react";
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePlayFrameloop } from "../../lib/games/play-frameloop";
import { FLIGHT_SECONDS, START_STATE, airDensity, flightScore, nextSkywardTutorialStep, stepFlight, type FlightState, type SkywardTutorialStep } from "../../lib/games/skyward-atlas";

export interface SkywardSceneCopy {
  altitude: string; speed: string; verticalSpeed: string; heading: string; throttle: string;
  fuel: string; gate: string; cockpit: string; chase: string; soundOn: string; soundOff: string;
  stall: string; terrain: string; time: string; end: string; cameraHint: string;
  tutorialThrottle: string; tutorialControl: string; tutorialGate: string;
}
export interface FlightResult { score: number; gates: number; distance: number; }
interface Props {
  copy: SkywardSceneCopy; audioEnabled: boolean; onToggleAudio: () => void;
  onFinish: (result: FlightResult) => void; audioRef: MutableRefObject<AudioContext | null>;
}
interface Controls { pitch: number; roll: number; yaw: number; throttle: number; lookX: number; lookY: number; }
interface Hud { state: FlightState; time: number; gates: number; distance: number; terrain: number; }

const terrainHeight = (x: number, z: number) => {
  const broad = Math.sin(x * .0032) * 115 + Math.cos(z * .0027) * 90;
  const ridges = Math.abs(Math.sin((x + z) * .006)) * 120 + Math.abs(Math.cos((x - z) * .0043)) * 78;
  const valley = Math.exp(-((x / 420) ** 2)) * 165;
  return Math.max(8, 120 + broad + ridges - valley);
};
const initialHud = (): Hud => ({ state: { ...START_STATE }, time: FLIGHT_SECONDS, gates: 0, distance: 0, terrain: terrainHeight(0, 1400) });

export default function SkywardAtlasScene({ copy, audioEnabled, onToggleAudio, onFinish, audioRef }: Props) {
  const controls = useRef<Controls>({ pitch: 0, roll: 0, yaw: 0, throttle: 0, lookX: 0, lookY: 0 });
  const [view, setView] = useState<"chase"|"cockpit">("chase");
  const [hud, setHud] = useState(initialHud);
  const [tutorialStep, setTutorialStep] = useState<SkywardTutorialStep>(0);
  const [coarse, setCoarse] = useState(false);
  const done = useRef(false);
  const resultRef = useRef({ gates: 0, distance: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    setTutorialStep(current => nextSkywardTutorialStep(current, hud.state, hud.gates));
  }, [hud]);
  useEffect(() => {
    const query = matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches); update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    const setKey = (event: KeyboardEvent, down: boolean) => {
      const v = down ? 1 : 0;
      if (event.code === "KeyW") controls.current.pitch = v;
      if (event.code === "KeyS") controls.current.pitch = -v;
      if (event.code === "KeyA") controls.current.roll = -v;
      if (event.code === "KeyD") controls.current.roll = v;
      if (event.code === "KeyQ") controls.current.yaw = -v;
      if (event.code === "KeyE") controls.current.yaw = v;
      if (event.code === "ArrowUp") controls.current.throttle = v;
      if (event.code === "ArrowDown") controls.current.throttle = -v;
      if (down && event.code === "KeyC") setView(current => current === "chase" ? "cockpit" : "chase");
      if (["ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
    };
    const down = (e: KeyboardEvent) => setKey(e, true), up = (e: KeyboardEvent) => setKey(e, false);
    addEventListener("keydown", down, { passive: false }); addEventListener("keyup", up);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, []);
  useEffect(() => {
    if (!audioEnabled) { audioRef.current?.suspend(); return; }
    const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = audioRef.current ?? new Context(); audioRef.current = context; void context.resume();
    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = noiseBuffer.getChannelData(0); for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    const noise = context.createBufferSource(); noise.buffer = noiseBuffer; noise.loop = true;
    const filter = context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 720;
    const windGain = context.createGain(); windGain.gain.value = .035;
    const engine = context.createOscillator(); engine.type = "sawtooth"; engine.frequency.value = 72;
    const engineGain = context.createGain(); engineGain.gain.value = .025;
    noise.connect(filter).connect(windGain).connect(context.destination); engine.connect(engineGain).connect(context.destination);
    noise.start(); engine.start();
    return () => { noise.stop(); engine.stop(); };
  }, [audioEnabled, audioRef]);
  const finish = useCallback(() => {
    if (done.current) return; done.current = true;
    const value = resultRef.current; onFinish({ ...value, score: flightScore(value.distance, value.gates, 0) });
  }, [onFinish]);
  const frameloop = usePlayFrameloop(true);
  return <div className="relative h-[78vh] min-h-[620px] w-full touch-none overflow-hidden bg-[#b8d8de]"
    onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; drag.current={id:e.pointerId,x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => { const d=drag.current;if(!d||d.id!==e.pointerId)return;controls.current.lookX=THREE.MathUtils.clamp(controls.current.lookX-(e.clientX-d.x)*.004,-.8,.8);controls.current.lookY=THREE.MathUtils.clamp(controls.current.lookY+(e.clientY-d.y)*.003,-.35,.4);d.x=e.clientX;d.y=e.clientY; }}
    onPointerUp={() => { drag.current=null; }}>
    <Canvas frameloop={frameloop} dpr={coarse ? 1 : [1, 1.45]} shadows={!coarse} camera={{ fov: 62, near: .2, far: 8500 }}>
      <color attach="background" args={["#a9ced5"]}/><fogExp2 attach="fog" args={["#b9d2d1", .00032]}/>
      <Sky distance={7000} sunPosition={[350, 480, -500]} inclination={.51} azimuth={.18}/>
      <ambientLight intensity={.72}/><AtmosphereRig shadows={!coarse}/>
      <Terrain coarse={coarse}/><CloudLayer coarse={coarse}/><Runway/><Gates/>
      <FlightController controls={controls} view={view} setHud={setHud} finish={finish} resultRef={resultRef}/>
      <Environment preset="sunset" environmentIntensity={.18}/>
    </Canvas>
    <HudPanel copy={copy} hud={hud} view={view} setView={setView} audioEnabled={audioEnabled} toggleAudio={onToggleAudio} finish={finish}/>
    {hud.state.stalled && <div className="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 animate-pulse rounded-xl bg-red-600 px-5 py-3 font-black tracking-widest text-white shadow-2xl">{copy.stall}</div>}
    {tutorialStep < 3 && <div className="pointer-events-none absolute bottom-24 left-1/2 w-[min(90%,28rem)] -translate-x-1/2 rounded-2xl border border-white/30 bg-slate-950/75 p-4 text-center text-sm font-bold text-white shadow-2xl backdrop-blur" role="status" aria-live="polite"><span className="mr-2 text-amber-300">{tutorialStep + 1}/3</span>{tutorialStep === 0 ? copy.tutorialThrottle : tutorialStep === 1 ? copy.tutorialControl : copy.tutorialGate}</div>}
    {coarse && <TouchControls controls={controls}/>}
  </div>;
}

function FlightController({ controls, view, setHud, finish, resultRef }: {
  controls: MutableRefObject<Controls>; view: "chase"|"cockpit"; setHud: (h: Hud) => void; finish: () => void;
  resultRef: MutableRefObject<{ gates: number; distance: number }>;
}) {
  const group = useRef<THREE.Group>(null); const state = useRef({ ...START_STATE }); const elapsed = useRef(0);
  const hudClock = useRef(0); const gates = useRef(new Set<number>()); const distance = useRef(0);
  const { camera } = useThree();
  useFrame((_, rawDt) => {
    const dt=Math.min(rawDt,.05), s=state.current, c=controls.current;
    const atmosphere={windX:Math.sin(elapsed.current*.08)*5.5,windZ:3.2,density:airDensity(s.y)};
    const next=stepFlight(s,c,atmosphere,dt); elapsed.current+=dt; distance.current+=next.speed*dt;
    const ground=terrainHeight(next.x,next.z);
    if(next.y < ground+5){ next.y=ground+5; next.verticalSpeed=Math.max(0,next.verticalSpeed); next.speed=Math.max(35,next.speed*.97); }
    state.current=next; resultRef.current.distance=distance.current;
    [0,1,2,3,4].forEach(i=>{const gx=Math.sin(i*1.73)*700,gz=780-i*600,gy=terrainHeight(gx,gz)+170;if(Math.hypot(next.x-gx,next.y-gy,next.z-gz)<65)gates.current.add(i);});
    resultRef.current.gates=gates.current.size;
    if(group.current){group.current.position.set(next.x,next.y,next.z);group.current.rotation.order="YXZ";group.current.rotation.set(-next.pitch,next.yaw,next.roll*.82);}
    const forward=new THREE.Vector3(Math.sin(next.yaw)*Math.cos(next.pitch),Math.sin(next.pitch),Math.cos(next.yaw)*Math.cos(next.pitch));
    const side=new THREE.Vector3(Math.cos(next.yaw),0,-Math.sin(next.yaw));
    const target=new THREE.Vector3(next.x,next.y,next.z);
    const desired=view==="cockpit"
      ? target.clone().add(forward.clone().multiplyScalar(3.2)).add(new THREE.Vector3(0,1.45,0))
      : target.clone().add(forward.clone().multiplyScalar(-16)).add(new THREE.Vector3(0,5.2,0)).add(side.multiplyScalar(c.lookX*8));
    camera.position.lerp(desired,1-Math.exp(-dt*(view==="cockpit"?12:4.5)));
    camera.lookAt(target.clone().add(forward.multiplyScalar(view==="cockpit"?75:28)).add(new THREE.Vector3(0,c.lookY*18,0)));
    hudClock.current+=dt;if(hudClock.current>.08){hudClock.current=0;setHud({state:{...next},time:Math.max(0,FLIGHT_SECONDS-elapsed.current),gates:gates.current.size,distance:distance.current,terrain:ground});}
    if(elapsed.current>=FLIGHT_SECONDS)finish();
  });
  return <group ref={group}><Aircraft visible={view==="chase"}/>{view==="cockpit"&&<Cockpit/>}</group>;
}

function Aircraft({ visible }: { visible: boolean }) {
  const propL=useRef<THREE.Mesh>(null),propR=useRef<THREE.Mesh>(null);
  useFrame((_,dt)=>{if(propL.current)propL.current.rotation.z+=dt*32;if(propR.current)propR.current.rotation.z+=dt*32;});
  return <group visible={visible} scale={1.1}>
    <mesh castShadow rotation={[Math.PI/2,0,0]}><capsuleGeometry args={[.72,6,8,16]}/><meshStandardMaterial color="#e8ede8" metalness={.55} roughness={.28}/></mesh>
    <mesh castShadow position={[0,.18,.9]}><boxGeometry args={[12,.18,2.1]}/><meshStandardMaterial color="#d7e0dc" metalness={.45}/></mesh>
    <mesh castShadow position={[0,.55,-2.7]}><boxGeometry args={[4.4,.12,1.1]}/><meshStandardMaterial color="#d7e0dc"/></mesh>
    <mesh position={[0,1,-3]}><boxGeometry args={[.15,2.6,1]}/><meshStandardMaterial color="#4f695d"/></mesh>
    {[-3.1,3.1].map((x,i)=><group key={x} position={[x,0,.6]}><mesh castShadow rotation={[Math.PI/2,0,0]}><capsuleGeometry args={[.48,1.2,6,12]}/><meshStandardMaterial color="#4b5d57" metalness={.65}/></mesh><mesh ref={i?propR:propL} position={[0,0,1.2]}><boxGeometry args={[3.1,.08,.12]}/><meshStandardMaterial color="#252c2b"/></mesh></group>)}
    <mesh position={[0,.65,2]}><sphereGeometry args={[.72,12,8]}/><meshStandardMaterial color="#334b51" transparent opacity={.82} metalness={.5}/></mesh>
    <pointLight position={[0,-.2,3.7]} color="#ffffff" intensity={8} distance={55}/>
    <pointLight position={[-6,.2,.6]} color="#ef3340" intensity={5} distance={24}/><pointLight position={[6,.2,.6]} color="#45d483" intensity={5} distance={24}/>
  </group>;
}
function Cockpit(){return <group><mesh position={[0,-.45,1.2]}><boxGeometry args={[2.8,.8,2.8]}/><meshStandardMaterial color="#202826"/></mesh><mesh position={[0,.8,.2]} rotation={[.15,0,0]}><torusGeometry args={[1.4,.08,8,28,Math.PI]}/><meshStandardMaterial color="#25302e" metalness={.6}/></mesh></group>;}

function Terrain({ coarse }: { coarse: boolean }) {
  const geometry=useMemo(()=>{const size=4200,segments=coarse?48:90,g=new THREE.PlaneGeometry(size,size,segments,segments),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,terrainHeight(p.getX(i),-p.getY(i)));g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;},[coarse]);
  return <group><mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#71836b" roughness={.95} vertexColors={false}/></mesh>
    <mesh position={[0,72,20]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[315,64]}/><meshPhysicalMaterial color="#668f98" roughness={.18} metalness={.2} transparent opacity={.82}/></mesh>
    {Array.from({length:coarse?40:80},(_,i)=>{const x=((i*7919)%3200)-1600,z=((i*3571)%3200)-1600,y=terrainHeight(x,z);return <mesh key={i} position={[x,y+9,z]} castShadow={!coarse}><coneGeometry args={[5+(i%5),18+(i%11),6]}/><meshStandardMaterial color={i%3?"#345846":"#48654d"}/></mesh>;})}
  </group>;
}
function AtmosphereRig({shadows}:{shadows:boolean}) {
  const sun=useRef<THREE.DirectionalLight>(null);
  const {scene}=useThree();
  useFrame(({clock})=>{
    const phase=(clock.elapsedTime/150)*Math.PI*2+.35;
    const height=Math.sin(phase);
    if(sun.current){
      sun.current.position.set(Math.cos(phase)*520,Math.max(-80,height*520),Math.sin(phase)*420);
      sun.current.intensity=THREE.MathUtils.lerp(.12,2.8,THREE.MathUtils.clamp(height*.7+.42,0,1));
      sun.current.color.set(height<.05?"#e79b72":"#fff1c8");
    }
    const day=new THREE.Color("#a9ced5"), dusk=new THREE.Color("#9a746f"), night=new THREE.Color("#16253a");
    const skyColor=height>.05?dusk.clone().lerp(day,Math.min(1,height*2.4)):night.clone().lerp(dusk,Math.max(0,height+.2)*5);
    scene.background=skyColor;
    if(scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(skyColor);
  });
  return <directionalLight ref={sun} castShadow={shadows} position={[300,450,-220]} intensity={2.7} color="#fff1c8" shadow-mapSize={[1024,1024]}/>;
}
function CloudLayer({ coarse }: { coarse: boolean }) {
  return <group>{Array.from({length:coarse?4:8},(_,i)=>{const x=((i*503)%3600)-1800,z=((i*887)%3600)-1800,y=480+(i%6)*95;return <Cloud key={i} position={[x,y,z]} opacity={.28} speed={.12} scale={55+(i%4)*12} segments={coarse?8:16} color={i%5===0?"#d9c8b5":"#f5f2e8"}/>;})}</group>;
}
function Runway(){return <group position={[0,terrainHeight(0,1200)+2,1200]}><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[42,620]}/><meshStandardMaterial color="#48504e" roughness={.95}/></mesh>{Array.from({length:14},(_,i)=><group key={i} position={[0,.5,-280+i*43]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2,18]}/><meshBasicMaterial color="#eee9d5"/></mesh><pointLight position={[-19,1,0]} color="#f6d978" intensity={5} distance={20}/><pointLight position={[19,1,0]} color="#f6d978" intensity={5} distance={20}/></group>)}</group>;}
function Gates(){return <>{[0,1,2,3,4].map(i=>{const x=Math.sin(i*1.73)*700,z=780-i*600,y=terrainHeight(x,z)+170;return <group key={i} position={[x,y,z]}><mesh><torusGeometry args={[55,3.5,8,36]}/><meshStandardMaterial color="#f2c66d" emissive="#db8b28" emissiveIntensity={2}/></mesh><pointLight color="#eeb34d" intensity={20} distance={160}/></group>;})}</>;}

function HudPanel({copy,hud,view,setView,audioEnabled,toggleAudio,finish}: {copy:SkywardSceneCopy;hud:Hud;view:"chase"|"cockpit";setView:(v:"chase"|"cockpit")=>void;audioEnabled:boolean;toggleAudio:()=>void;finish:()=>void}) {
  const heading=((hud.state.yaw*180/Math.PI+360)%360).toFixed(0), mins=Math.floor(hud.time/60),secs=Math.floor(hud.time%60).toString().padStart(2,"0");
  return <><div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-3 text-white [text-shadow:0_2px_4px_#000] sm:p-5">
    <div className="grid grid-cols-2 gap-x-6 rounded-2xl bg-slate-950/35 p-3 font-mono text-xs backdrop-blur-sm sm:grid-cols-3 sm:text-sm">
      <span>{copy.speed}<b className="block text-xl">{Math.round(hud.state.speed*1.94)}</b></span><span>{copy.altitude}<b className="block text-xl">{Math.round(hud.state.y*3.28)}</b></span><span>{copy.verticalSpeed}<b className="block text-xl">{Math.round(hud.state.verticalSpeed*197)}</b></span>
      <span>{copy.heading}<b className="block">{heading}°</b></span><span>{copy.throttle}<b className="block">{Math.round(hud.state.throttle*100)}%</b></span><span>{copy.fuel}<b className="block">{hud.state.fuel.toFixed(0)}%</b></span>
    </div><div className="rounded-2xl bg-slate-950/35 p-3 text-right font-mono text-xs backdrop-blur-sm"><b className="block text-xl">{hud.gates}/5</b>{copy.gate}<span className="mt-2 block">{mins}:{secs}</span></div>
  </div>
  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
    <button onClick={()=>setView(view==="chase"?"cockpit":"chase")} className="flex min-h-11 items-center gap-2 rounded-full bg-slate-950/70 px-4 text-xs font-bold text-white backdrop-blur"><Camera size={16}/>{view==="chase"?copy.cockpit:copy.chase}</button>
    <button onClick={toggleAudio} aria-label={audioEnabled?copy.soundOn:copy.soundOff} className="grid size-11 place-items-center rounded-full bg-slate-950/70 text-white">{audioEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>
    <button onClick={finish} className="min-h-11 rounded-full bg-amber-100/90 px-4 text-xs font-black text-slate-900">{copy.end}</button>
  </div></>;
}
function TouchControls({controls}:{controls:MutableRefObject<Controls>}){
  const bind=(key:keyof Controls,value:number)=>({onPointerDown:(e:React.PointerEvent)=>{e.currentTarget.setPointerCapture(e.pointerId);controls.current[key]=value;},onPointerUp:()=>{controls.current[key]=0;},onPointerCancel:()=>{controls.current[key]=0;}});
  const cls="grid size-12 place-items-center rounded-xl bg-slate-950/55 text-white backdrop-blur active:bg-amber-500";
  return <div className="absolute inset-x-3 bottom-20 flex items-end justify-between"><div className="grid grid-cols-3 gap-1"><span/><button className={cls}{...bind("pitch",1)}><ChevronUp/></button><span/><button className={cls}{...bind("roll",-1)}><ChevronLeft/></button><button className={cls}{...bind("pitch",-1)}><ChevronDown/></button><button className={cls}{...bind("roll",1)}><ChevronRight/></button></div><div className="flex gap-1"><button className={cls}{...bind("yaw",-1)}>L</button><button className={cls}{...bind("yaw",1)}>R</button><button className={cls}{...bind("throttle",-1)}>−</button><button className={cls}{...bind("throttle",1)}>+</button></div></div>;
}
