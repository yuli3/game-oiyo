import {lazy,useCallback,useEffect,useMemo,useState} from "react";
import confetti from "canvas-confetti";
import {GameContainer} from "../ui/game/GamePrimitives";
import {Lazy3DStage} from "../ui/game/Lazy3DStage";
import {usePrefersReducedMotion} from "../../lib/games/reduced-motion";
import {getBestForConditions,recordAchievementEvent,recordBestForConditions} from "../../lib/games/records";
import {MEMORY_PALACE_EXIT, MEMORY_PALACE_HEIGHT, MEMORY_PALACE_OBSERVE_TURNS, MEMORY_PALACE_WIDTH, createMemoryPalace, isPalaceWall, moveMemoryPalace, observeMemoryPalace, revealMemoryPalace, type MemoryPalaceState, type PalaceDirection} from "../../lib/games/memory-palace-thieves";

const Scene=lazy(()=>import("./MemoryPalaceThievesScene"));
const COPY={
 ko:{title:"기억 궁전 도둑들",sub:"경비의 동선을 기억한 뒤, 불 꺼진 미술관에서 유물을 훔쳐 탈출하세요",start:"오늘의 미술관 입장",observe:"경비 동선 관찰",infiltrate:"소등 — 침투 시작",turn:"턴",memory:"기억 섬광",artifact:"유물 확보",escape:"무경보 탈출 성공",caught:"경비에게 발각됐습니다",retry:"다시 잠입",hint:"방향키·WASD 또는 버튼으로 한 칸 이동합니다. 이동할 때마다 경비도 한 칸 움직입니다.",wait:"기다리기",best:"최고 점수",sound:"소리"},
 en:{title:"Memory Palace Thieves",sub:"Memorize the patrol, then steal the artifact after the gallery goes dark",start:"Enter today's museum",observe:"Observe patrol",infiltrate:"Blackout — infiltrate",turn:"Turn",memory:"Memory flash",artifact:"Artifact secured",escape:"Clean escape",caught:"The guard spotted you",retry:"Try again",hint:"Move one tile with arrows, WASD, or the controls. The guard advances after every move.",wait:"Wait",best:"Best score",sound:"Sound"},
 ja:{title:"記憶宮殿の盗賊",sub:"警備ルートを覚え、消灯後の美術館で秘宝を盗んで脱出",start:"今日の美術館へ",observe:"巡回を観察",infiltrate:"消灯 — 潜入開始",turn:"ターン",memory:"記憶の閃光",artifact:"秘宝を確保",escape:"無警報で脱出成功",caught:"警備員に発見されました",retry:"再潜入",hint:"矢印・WASD・ボタンで1マス移動。動くたび警備員も1マス進みます。",wait:"待つ",best:"最高スコア",sound:"サウンド"},
 zh:{title:"记忆宫殿盗贼",sub:"记住巡逻路线，在熄灯后的美术馆盗取藏品并逃脱",start:"进入今日美术馆",observe:"观察巡逻",infiltrate:"熄灯 — 开始潜入",turn:"回合",memory:"记忆闪光",artifact:"已取得藏品",escape:"无警报逃脱成功",caught:"你被警卫发现了",retry:"重新潜入",hint:"用方向键、WASD或按钮移动一格。每次移动后警卫也前进一步。",wait:"等待",best:"最高分",sound:"声音"},
 fr:{title:"Voleurs du palais mental",sub:"Mémorisez la ronde puis volez l'œuvre dans le musée plongé dans le noir",start:"Entrer dans le musée du jour",observe:"Observer la ronde",infiltrate:"Extinction — infiltration",turn:"Tour",memory:"Éclair de mémoire",artifact:"Œuvre récupérée",escape:"Évasion sans alarme",caught:"Le garde vous a repéré",retry:"Réessayer",hint:"Avancez d'une case avec les flèches, ZQSD ou les boutons. Le garde avance après chaque action.",wait:"Attendre",best:"Meilleur score",sound:"Son"},
 es:{title:"Ladrones del palacio mental",sub:"Memoriza la patrulla y roba la pieza cuando el museo quede a oscuras",start:"Entrar al museo de hoy",observe:"Observar patrulla",infiltrate:"Apagón — infiltración",turn:"Turno",memory:"Destello de memoria",artifact:"Pieza asegurada",escape:"Escape sin alarma",caught:"El guardia te ha visto",retry:"Reintentar",hint:"Muévete una casilla con flechas, WASD o los botones. El guardia avanza tras cada acción.",wait:"Esperar",best:"Mejor puntuación",sound:"Sonido"}
} as const;

function PalaceFallback({state,visible}:{state:MemoryPalaceState;visible:boolean}){
 const cells=Array.from({length:MEMORY_PALACE_WIDTH*MEMORY_PALACE_HEIGHT},(_,i)=>({x:i%MEMORY_PALACE_WIDTH,y:Math.floor(i/MEMORY_PALACE_WIDTH)}));
 return <div className="grid h-full place-items-center bg-[#080b08] p-4"><div className="grid w-full max-w-md gap-1" style={{gridTemplateColumns:`repeat(${MEMORY_PALACE_WIDTH},minmax(0,1fr))`}}>{cells.map(p=>{const wall=isPalaceWall(p);const player=p.x===state.player.x&&p.y===state.player.y;const guard=p.x===state.guard.x&&p.y===state.guard.y;const artifact=p.x===state.artifact.x&&p.y===state.artifact.y&&!state.carrying;const exit=p.x===MEMORY_PALACE_EXIT.x&&p.y===MEMORY_PALACE_EXIT.y;return <div key={`${p.x}-${p.y}`} className={`grid aspect-square place-items-center rounded-sm text-sm ${wall&&visible?"bg-[#596248]":"bg-[#171c16]"}`}>{player?"◆":visible&&guard?"●":visible&&artifact?"◇":visible&&exit?"○":""}</div>;})}</div></div>;
}

export default function MemoryPalaceThieves({locale="ko"}:{locale?:string}){
 const t=COPY[locale as keyof typeof COPY]??COPY.en; const reduced=usePrefersReducedMotion();
 const seed=useMemo(()=>{const d=new Date();return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();},[]);
 const [state,setState]=useState(()=>createMemoryPalace(seed)); const [started,setStarted]=useState(false); const [flash,setFlash]=useState(false); const [muted,setMuted]=useState(false); const [best,setBest]=useState(0);
 const tone=useCallback((frequency:number)=>{if(muted||typeof window==="undefined")return;const C=window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(.035,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.12);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.13);o.addEventListener("ended",()=>void c.close(),{once:true});},[muted]);
 const act=useCallback((d:PalaceDirection)=>setState(s=>moveMemoryPalace(s,d)),[]);
 useEffect(()=>{if(!started||state.phase!=="observing")return;const id=window.setTimeout(()=>setState(observeMemoryPalace),650);return()=>clearTimeout(id);},[started,state]);
 useEffect(()=>{const conditions={seed:String(seed),difficulty:"daily",assist:"none" as const};setBest(getBestForConditions("memory-palace-thieves",conditions)?.value??0);recordAchievementEvent("memory-palace-thieves","opened");},[seed]);
 useEffect(()=>{if(state.phase==="escaped"){const score=Math.max(100,2000-state.turn*20-(2-state.reveals)*100);const next=recordBestForConditions("memory-palace-thieves",score,"score",{seed:String(seed),difficulty:"daily",assist:state.reveals===2?"none":"hint"},`${state.turn} turns`);setBest(next.value);recordAchievementEvent("memory-palace-thieves","cleared");tone(880);void confetti({particleCount:90,spread:70,origin:{y:.65},disableForReducedMotion:true,colors:["#64733e","#d6b65c","#f4eedb"]});}else if(state.phase==="caught")tone(130);},[seed,state.phase,state.reveals,state.turn,tone]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const m:Record<string,PalaceDirection>={ArrowUp:"up",w:"up",ArrowDown:"down",s:"down",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",Space:"wait"};if(m[e.key]){e.preventDefault();act(m[e.key]!);}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[act]);
 const begin=()=>{setStarted(true);recordAchievementEvent("memory-palace-thieves","played");tone(440);};
 const reset=()=>{setState(createMemoryPalace(seed));setStarted(true);setFlash(false);recordAchievementEvent("memory-palace-thieves","played");tone(440);};
 const reveal=()=>{setState(s=>revealMemoryPalace(s));setFlash(true);window.setTimeout(()=>setFlash(false),900);};
 const active=started; const observing=state.phase==="observing"; const ended=state.phase==="escaped"||state.phase==="caught";
 return <GameContainer title={t.title} subtitle={t.sub}>
  <div className="space-y-4">
   <div className="grid grid-cols-4 gap-2 text-center text-sm"><div className="rounded-xl bg-muted p-2"><b>{t.turn}</b><br/>{state.turn}</div><div className="rounded-xl bg-muted p-2"><b>{t.memory}</b><br/>{state.reveals}</div><div className="rounded-xl bg-muted p-2"><b>{t.artifact}</b><br/>{state.carrying?"✓":"—"}</div><div className="rounded-xl bg-muted p-2"><b>{t.best}</b><br/>{best||"—"}</div></div>
   <Lazy3DStage active={active} className="h-[min(62vh,520px)] rounded-2xl border bg-[#11180f]" placeholder={<div className="grid h-full place-items-center p-8 text-center"><button className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground" onClick={begin}>{t.start}</button></div>} fallback={<PalaceFallback state={state} visible={observing||flash}/>}><Scene state={state} mapVisible={observing||flash} reducedMotion={Boolean(reduced)}/></Lazy3DStage>
   {active&&<div aria-live="polite" className="rounded-xl border p-3 text-center font-semibold">{observing?`${t.observe} ${state.observationTurn+1}/${MEMORY_PALACE_OBSERVE_TURNS}`:state.phase==="infiltrating"?(state.carrying?t.artifact:t.infiltrate):state.phase==="escaped"?t.escape:t.caught}</div>}
   {active&&!observing&&!ended&&<><div className="mx-auto grid w-48 grid-cols-3 gap-2"><span/><button onClick={()=>act("up")} aria-label="up" className="rounded-lg border p-3">↑</button><span/><button onClick={()=>act("left")} aria-label="left" className="rounded-lg border p-3">←</button><button onClick={()=>act("wait")} className="rounded-lg border p-2 text-xs">{t.wait}</button><button onClick={()=>act("right")} aria-label="right" className="rounded-lg border p-3">→</button><span/><button onClick={()=>act("down")} aria-label="down" className="rounded-lg border p-3">↓</button><span/></div><button onClick={reveal} disabled={state.reveals===0} className="w-full rounded-xl border px-4 py-3 font-semibold disabled:opacity-40">{t.memory} · {state.reveals}</button></>}
   {ended&&<button onClick={reset} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">{t.retry}</button>}
   <button onClick={()=>setMuted(v=>!v)} className="w-full rounded-xl border px-4 py-2 text-sm">{t.sound}: {muted?"OFF":"ON"}</button>
   <p className="text-sm text-muted-foreground">{t.hint}</p>
  </div>
 </GameContainer>;
}
