import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";

function playGardenAudio(type: "plant" | "saved" | "start" | "win") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (type === "plant") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "saved") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "start") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.12, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.35);
      });
    }
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {}
}

function TiltGardenSeedButton({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={{ "--card-tilt": transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.15);
        onClick();
      }}
      aria-pressed={isSelected}
      className={`rounded-xl border px-2 py-3 text-sm font-semibold transition will-change-transform transform-(--card-tilt) ${
        isSelected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

import {useCallback,useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from "react";import{celebrate}from"../../lib/games/celebration";import {GameContainer} from "../ui/game/GamePrimitives";import {recordAchievementEvent,recordBest} from "../../lib/games/records";import {GARDEN_FIELD_RADIUS,GARDEN_POOL,GARDEN_ROCKS,GRAVITY_GARDEN_DURATION,GRAVITY_GARDEN_HEIGHT,GRAVITY_GARDEN_STEP,GRAVITY_GARDEN_WIDTH,createGravityGarden,gravityGardenScore,plantGardenSeed,startGravityGarden,stepGravityGarden,type GardenSeedType,type GravityGardenState} from "../../lib/games/gravity-garden";
const TYPES:GardenSeedType[]=["gravity-bloom","moss","wind-reed"];
const SEED_ART:Record<GardenSeedType,string>={"gravity-bloom":"/games/gravity-garden-bloom.webp",moss:"/games/gravity-garden-moss.webp","wind-reed":"/games/gravity-garden-reed.webp"};
const COPY={
ko:{title:"중력 정원",sub:"꽃을 심으면 중력이 피어요",start:"생태 흐름 시작",reset:"정원 다시 짓기",undo:"마지막 씨앗 뽑기",saved:"살린 물방울",time:"남은 시간",score:"생태 점수",hint:"씨앗을 고른 뒤 정원을 누르세요. 최대 6개를 심고 물방울 5개를 오른쪽 웅덩이로 이끌어요.",seeds:{"gravity-bloom":"중력꽃","moss":"이끼","wind-reed":"바람갈대"},done:"생태계가 회복되었어요",try:"배치를 바꿔 더 많은 물을 살려보세요"},
en:{title:"Gravity Garden",sub:"Plant a flower and gravity blooms",start:"Start ecosystem",reset:"Rebuild garden",undo:"Remove last seed",saved:"Drops saved",time:"Time left",score:"Ecology score",hint:"Choose a seed, then tap the garden. Plant up to six and guide all five drops into the pool on the right.",seeds:{"gravity-bloom":"Gravity bloom","moss":"Moss","wind-reed":"Wind reed"},done:"The ecosystem recovered",try:"Change the field and save more water"},
ja:{title:"重力の庭",sub:"花を植えると重力が咲く",start:"生態の流れを開始",reset:"庭を作り直す",undo:"最後の種を抜く",saved:"救った水滴",time:"残り時間",score:"生態スコア",hint:"種を選んで庭をタップ。最大6個を植え、5つの水滴を右の池へ導きます。",seeds:{"gravity-bloom":"重力花","moss":"苔","wind-reed":"風の葦"},done:"生態系が回復しました",try:"配置を変えて水をもっと救おう"},
zh:{title:"重力花园",sub:"种下花朵，重力随之绽放",start:"启动生态流",reset:"重建花园",undo:"拔除最后种子",saved:"救下水滴",time:"剩余时间",score:"生态分",hint:"选择种子后点击花园。最多种六颗，把五滴水引向右侧水池。",seeds:{"gravity-bloom":"重力花","moss":"苔藓","wind-reed":"风芦"},done:"生态系统恢复了",try:"调整布局，救下更多水"},
fr:{title:"Jardin gravitationnel",sub:"Plantez une fleur, la gravité éclot",start:"Lancer l'écosystème",reset:"Rebâtir le jardin",undo:"Retirer la dernière graine",saved:"Gouttes sauvées",time:"Temps restant",score:"Score écologique",hint:"Choisissez une graine puis touchez le jardin. Plantez-en six au plus et guidez les cinq gouttes vers le bassin à droite.",seeds:{"gravity-bloom":"Fleur-gravité","moss":"Mousse","wind-reed":"Roseau du vent"},done:"L'écosystème est rétabli",try:"Modifiez le champ pour sauver plus d'eau"},
es:{title:"Jardín gravitatorio",sub:"Planta una flor y florece la gravedad",start:"Iniciar ecosistema",reset:"Reconstruir jardín",undo:"Quitar última semilla",saved:"Gotas salvadas",time:"Tiempo restante",score:"Puntuación ecológica",hint:"Elige una semilla y toca el jardín. Planta hasta seis y guía las cinco gotas al estanque derecho.",seeds:{"gravity-bloom":"Flor gravitatoria","moss":"Musgo","wind-reed":"Junco de viento"},done:"El ecosistema se ha recuperado",try:"Cambia el campo y salva más agua"}
} as const;

export default function GravityGarden({locale="ko"}:{locale?:string}){const t=COPY[locale as keyof typeof COPY]??COPY.en;const canvas=useRef<HTMLCanvasElement>(null);const stateRef=useRef<GravityGardenState>(createGravityGarden());const recordedRun=useRef(false);const [state,setState]=useState(stateRef.current);const [selected,setSelected]=useState<GardenSeedType>("gravity-bloom");const ended=!state.running&&state.time>0;
const [seedImages,setSeedImages]=useState<Partial<Record<GardenSeedType,HTMLImageElement>>>({});
useEffect(()=>{
  let mounted=true;
  const images=TYPES.map(type=>{
    const image=new Image();
    image.onload=()=>{if(mounted)setSeedImages(current=>({...current,[type]:image}));};
    image.src=SEED_ART[type];
    return image;
  });
  return()=>{mounted=false;images.forEach(image=>{image.onload=null;});};
},[]);
const publish=useCallback((s:GravityGardenState)=>{stateRef.current=s;setState(s);},[]);
useEffect(()=>{recordAchievementEvent("gravity-garden","opened");},[]);
useEffect(()=>{if(!state.running)return;let frame=0,last=performance.now(),acc=0,active=true;const loop=(now:number)=>{if(!active)return;acc+=Math.min(.1,(now-last)/1000);last=now;let s=stateRef.current;while(acc>=GRAVITY_GARDEN_STEP&&s.running){s=stepGravityGarden(s);acc-=GRAVITY_GARDEN_STEP;}publish(s);if(s.running)frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);return()=>{active=false;cancelAnimationFrame(frame);};},[state.running,publish]);
useEffect(()=>{if(!ended||recordedRun.current)return;recordedRun.current=true;const saved=state.drops.filter(d=>d.saved).length;const score=gravityGardenScore(state);recordBest("gravity-garden",score,"score",`${saved}/5 drops`);recordAchievementEvent("gravity-garden",saved>=3?"cleared":"played");if(saved===5){
  playGardenAudio("win");
  MobileHapticsPro.success();
  celebrate(canvas.current,{preset:"leaves",colors:["#6c7a45","#b7d48b","#6db7c8"],origin:{x:.5,y:.65}});
} else if(saved>=3){
  playGardenAudio("saved");
  MobileHapticsPro.impact();
}
},[ended,state]);
useEffect(()=>{const c=canvas.current;if(!c)return;const x=c.getContext("2d");if(!x)return;x.clearRect(0,0,720,420);const grad=x.createLinearGradient(0,0,0,420);grad.addColorStop(0,"#eef0d7");grad.addColorStop(1,"#aebd82");x.fillStyle=grad;x.fillRect(0,0,720,420);x.strokeStyle="rgba(68,82,45,.16)";for(let i=0;i<720;i+=40){x.beginPath();x.moveTo(i,0);x.lineTo(i,420);x.stroke();}for(let i=0;i<420;i+=40){x.beginPath();x.moveTo(0,i);x.lineTo(720,i);x.stroke();}x.beginPath();x.arc(GARDEN_POOL.x,GARDEN_POOL.y,GARDEN_POOL.radius,0,Math.PI*2);x.fillStyle="#4a93a4";x.fill();x.strokeStyle="#d9f4e6";x.lineWidth=6;x.stroke();for(const r of GARDEN_ROCKS){x.beginPath();x.arc(r.x,r.y,r.radius,0,Math.PI*2);x.fillStyle="#6b705d";x.fill();x.strokeStyle="#ece7c9";x.lineWidth=3;x.stroke();}for(const s of state.seeds){const color=s.type==="gravity-bloom"?"#d19a42":s.type==="moss"?"#536b36":"#e8e0b6";const sprite=seedImages[s.type];if(sprite){x.drawImage(sprite,s.x-26,s.y-26,52,52);}else{x.beginPath();x.arc(s.x,s.y,18,0,Math.PI*2);x.fillStyle=color;x.fill();x.strokeStyle="#314127";x.lineWidth=3;x.stroke();}x.beginPath();x.arc(s.x,s.y,GARDEN_FIELD_RADIUS,0,Math.PI*2);x.strokeStyle=color+"55";x.lineWidth=2;x.stroke();}for(const d of state.drops){if(d.lost)continue;x.beginPath();x.arc(d.x,d.y,d.saved?11:8,0,Math.PI*2);x.fillStyle=d.saved?"#d9f9e6":"#eefcff";x.fill();x.strokeStyle="#35788e";x.lineWidth=2;x.stroke();}},[state,seedImages]);
const place=(e:ReactPointerEvent<HTMLCanvasElement>)=>{
  if(state.running)return;
  playGardenAudio("plant");
  MobileHapticsPro.light();
  const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*720,y=(e.clientY-rect.top)/rect.height*420;
  publish(plantGardenSeed(stateRef.current,selected,x,y));
};
const start=()=>{
  playGardenAudio("start");
  MobileHapticsPro.medium();
  const s=startGravityGarden(stateRef.current);
  if(s!==stateRef.current){
    recordedRun.current=false;
    publish(s);
    recordAchievementEvent("gravity-garden","played");
  }
};const reset=()=>{recordedRun.current=false;publish(createGravityGarden());};const saved=state.drops.filter(d=>d.saved).length;
return <GameContainer title={t.title} subtitle={t.sub}><div className="space-y-4">{!state.running&&!ended&&<img src="/games/gravity-garden-keyart.webp" alt="" width={1730} height={909} decoding="async" className="aspect-[1.9/1] w-full rounded-2xl object-cover"/>}<div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-xl bg-muted p-2"><b>{t.saved}</b><br/>{saved}/5</div><div className="rounded-xl bg-muted p-2"><b>{t.time}</b><br/>{Math.max(0,GRAVITY_GARDEN_DURATION-state.time).toFixed(1)}s</div><div className="rounded-xl bg-muted p-2"><b>{t.score}</b><br/>{gravityGardenScore(state)}</div></div><canvas ref={canvas} width={GRAVITY_GARDEN_WIDTH} height={GRAVITY_GARDEN_HEIGHT} onPointerDown={place} className="w-full touch-none rounded-2xl border shadow-inner" aria-label={t.title}/>{!state.running&&!ended&&<><div className="grid grid-cols-3 gap-2">{TYPES.map(type=><TiltGardenSeedButton key={type} isSelected={selected===type} onClick={()=>{MobileHapticsPro.selection();setSelected(type);}} label={t.seeds[type]} />)}</div><button onClick={()=>publish({...stateRef.current,seeds:stateRef.current.seeds.slice(0,-1)})} disabled={state.seeds.length===0} className="w-full rounded-xl border px-4 py-2 disabled:opacity-40">{t.undo}</button><button onClick={start} disabled={state.seeds.length===0} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-40">{t.start}</button></>}{ended&&<><div aria-live="polite" className="rounded-xl bg-muted p-4 text-center font-bold">{saved===5?t.done:t.try}</div><button onClick={reset} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">{t.reset}</button></>}<p className="text-sm text-muted-foreground">{t.hint}</p></div></GameContainer>}
