import {Canvas, useFrame} from "@react-three/fiber";
import {Html} from "@react-three/drei";
import {useMemo, useRef} from "react";
import type {Group, Mesh} from "three";
import {MEMORY_PALACE_EXIT, MEMORY_PALACE_HEIGHT, MEMORY_PALACE_WIDTH, isPalaceWall, type MemoryPalaceState} from "../../lib/games/memory-palace-thieves";
import {usePlayFrameloop} from "../../lib/games/play-frameloop";

export type MemoryPalaceSceneProps = {state:MemoryPalaceState; mapVisible:boolean; reducedMotion:boolean};

function Museum({state,mapVisible,reducedMotion}:MemoryPalaceSceneProps){
  const player=useRef<Group>(null); const guard=useRef<Group>(null); const beacon=useRef<Mesh>(null);
  const walls=useMemo(()=>Array.from({length:MEMORY_PALACE_HEIGHT},(_,y)=>Array.from({length:MEMORY_PALACE_WIDTH},(_,x)=>({x,y}))).flat().filter(isPalaceWall),[]);
  useFrame(({clock})=>{const pulse=1+(reducedMotion?0:Math.sin(clock.elapsedTime*3)*.08); if(beacon.current) beacon.current.scale.setScalar(pulse);});
  const pos=(p:{x:number;y:number})=>[p.x-4,.35,p.y-3] as const;
  return <>
    <color attach="background" args={[state.phase==="observing"||mapVisible?"#172018":"#050806"]}/>
    <ambientLight intensity={state.phase==="observing"||mapVisible?1.15:.025}/><directionalLight position={[2,8,3]} intensity={state.phase==="observing"||mapVisible?1.8:.08} color="#fff0c2" castShadow/>
    <group rotation={[0,-.08,0]}>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[9,7]}/><meshStandardMaterial color="#b5ad8a" roughness={.82}/></mesh>
      {walls.map(w=><mesh key={`${w.x},${w.y}`} position={[w.x-4,.7,w.y-3]} castShadow receiveShadow><boxGeometry args={[.94,1.4,.94]}/><meshStandardMaterial color="#556044" roughness={.7}/></mesh>)}
      <mesh position={pos(state.artifact)} ref={beacon} castShadow><dodecahedronGeometry args={[.25,0]}/><meshStandardMaterial color="#e8b949" emissive="#8a5d08" emissiveIntensity={1.6}/></mesh>
      <mesh position={pos(MEMORY_PALACE_EXIT)} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.25,.42,24]}/><meshBasicMaterial color="#dbe8a5"/></mesh>
      <group ref={guard} position={pos(state.guard)}><mesh castShadow><capsuleGeometry args={[.22,.45,6,12]}/><meshStandardMaterial color="#852f2f"/></mesh><mesh position={[0,.05,.32]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.45,2.8,24,1,true]}/><meshBasicMaterial color="#f4b55f" transparent opacity={state.phase==="observing"||mapVisible?.23:.09}/></mesh></group>
      <group ref={player} position={pos(state.player)}><mesh castShadow><capsuleGeometry args={[.2,.38,6,12]}/><meshStandardMaterial color="#294c3b" emissive="#193426" emissiveIntensity={.5}/></mesh>{state.carrying&&<pointLight color="#ffd66f" intensity={2} distance={2}/>}</group>
    </group>
    <Html position={[0,3.2,0]} center style={{pointerEvents:"none",color:"#f7f4e8",fontWeight:800,fontSize:12,textShadow:"0 2px 8px #000",whiteSpace:"nowrap"}}>{state.phase==="observing"?"MEMORIZE THE PATROL":"TRUST YOUR MEMORY"}</Html>
  </>;
}

export default function MemoryPalaceThievesScene(props:MemoryPalaceSceneProps){
  const frameloop=usePlayFrameloop(true);
  return <Canvas frameloop={frameloop} camera={{position:[7,8,9],fov:42}} shadows dpr={[1,1.5]}><Museum {...props}/></Canvas>;
}
