import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useEffect, useMemo, useRef, useState} from "react";
import {OrthographicCamera, TextureLoader, SRGBColorSpace, type Texture, type Group, type Mesh} from "three";
import {MEMORY_PALACE_EXIT, MEMORY_PALACE_HEIGHT, MEMORY_PALACE_WIDTH, isPalaceWall, palaceLineOfSight, type MemoryPalaceState} from "../../lib/games/memory-palace-thieves";
import {usePlayFrameloop} from "../../lib/games/play-frameloop";

export type MemoryPalaceSceneProps = {state:MemoryPalaceState; mapVisible:boolean; reducedMotion:boolean};

function FitMuseumCamera(){
 const {camera,size}=useThree();
 useEffect(()=>{if(camera instanceof OrthographicCamera){camera.zoom=Math.min(size.width/12,size.height/11);camera.updateProjectionMatrix();}},[camera,size.width,size.height]);
 return null;
}

function MuseumActor({kind}:{kind:"thief"|"guard"}){
 const [texture,setTexture]=useState<Texture|null>(null);
 useEffect(()=>{let active=true;const loaded=new TextureLoader().load(`/games/memory-palace-${kind}.webp`,image=>{image.colorSpace=SRGBColorSpace;if(active)setTexture(image);else image.dispose();},undefined,()=>{});return()=>{active=false;loaded.dispose();};},[kind]);
 return texture?<sprite scale={[1.6,1.6,1]} position={[0,.22,0]} renderOrder={2}><spriteMaterial map={texture} transparent alphaTest={.05} depthWrite={false}/></sprite>:<mesh><capsuleGeometry args={[.2,.4,6,12]}/><meshStandardMaterial color={kind==="thief"?"#76bd94":"#852f2f"} emissive={kind==="thief"?"#76bd94":"#000"}/></mesh>;
}

function Museum({state,mapVisible,reducedMotion}:MemoryPalaceSceneProps){
  const player=useRef<Group>(null); const guard=useRef<Group>(null); const beacon=useRef<Mesh>(null);
  const walls=useMemo(()=>Array.from({length:MEMORY_PALACE_HEIGHT},(_,y)=>Array.from({length:MEMORY_PALACE_WIDTH},(_,x)=>({x,y}))).flat().filter(isPalaceWall),[]);
  const tiles=useMemo(()=>Array.from({length:63},(_,i)=>({x:i%9,y:Math.floor(i/9)})).filter(p=>!isPalaceWall(p)),[]);
  useFrame(({clock})=>{const pulse=1+(reducedMotion?0:Math.sin(clock.elapsedTime*3)*.08); if(beacon.current) beacon.current.scale.setScalar(pulse);});
  const pos=(p:{x:number;y:number})=>[p.x-4,.35,p.y-3] as const;
  return <>
    <color attach="background" args={[state.phase==="observing"||mapVisible?"#172018":"#050806"]}/>
    <ambientLight intensity={state.phase==="observing"||mapVisible?1.15:.025}/><directionalLight position={[2,8,3]} intensity={state.phase==="observing"||mapVisible?1.8:.08} color="#fff0c2" castShadow/>
    <group rotation={[0,-.08,0]}>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[9,7]}/><meshStandardMaterial color="#b5ad8a" roughness={.82}/></mesh>
      {mapVisible&&tiles.map(p=><mesh key={`tile-${p.x}-${p.y}`} position={[p.x-4,.012,p.y-3]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.96,.96]}/><meshStandardMaterial color={palaceLineOfSight(state.guard,p)?"#b56459":(p.x+p.y)%2?"#c4bfa5":"#dcd4b6"}/></mesh>)}
      {mapVisible&&walls.map(w=><mesh key={`${w.x},${w.y}`} position={[w.x-4,.2,w.y-3]} castShadow receiveShadow><boxGeometry args={[.94,.4,.94]}/><meshStandardMaterial color="#556044" roughness={.7}/></mesh>)}
      {mapVisible&&!state.carrying&&<mesh position={pos(state.artifact)} ref={beacon} castShadow><dodecahedronGeometry args={[.25,0]}/><meshStandardMaterial color="#e8b949" emissive="#8a5d08" emissiveIntensity={1.6}/></mesh>}
      <mesh position={pos(MEMORY_PALACE_EXIT)} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.25,.42,24]}/><meshBasicMaterial color="#dbe8a5"/></mesh>
      {mapVisible&&<group ref={guard} position={pos(state.guard)}><MuseumActor kind="guard"/></group>}
      <group ref={player} position={pos(state.player)}><MuseumActor kind="thief"/>{state.carrying&&<pointLight color="#ffd66f" intensity={2} distance={2}/>}</group>
    </group>

  </>;
}

export default function MemoryPalaceThievesScene(props:MemoryPalaceSceneProps){
  const frameloop=usePlayFrameloop(true);
  return <Canvas orthographic frameloop={frameloop} camera={{position:[7,10,9],zoom:30}} shadows dpr={[1,1.5]}><FitMuseumCamera/><Museum {...props}/></Canvas>;
}
