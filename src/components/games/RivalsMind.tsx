import {useEffect,useMemo,useRef,useState} from "react";
import{useCelebration}from"../../lib/games/celebration";
import {GameContainer} from "../ui/game/GamePrimitives";
import {recordAchievementEvent,recordBestForConditions} from "../../lib/games/records";
import {RIVALS_MIND_RULESET,createRivalsMind,playRivalsMindRound,readRivalHabit,type DuelAction,type DuelRead} from "../../lib/games/rivals-mind";
import {RIVALS_MIND_POSES} from "../../lib/games/sprites";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";

function playDuelAudio(type: "strike" | "guard" | "evade" | "hit" | "win" | "lose") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (type === "strike") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "guard") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "evade") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "hit") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "win") {
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
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
    } else if (type === "lose") {
      [220, 180, 140].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(freq, now + idx * 0.1);
        g.gain.setValueAtTime(0.1, now + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
        o.connect(g).connect(ctx.destination);
        o.start(now + idx * 0.1);
        o.stop(now + idx * 0.1 + 0.25);
      });
    }
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {}
}

function TiltDuelActionButton({
  label,
  onClick,
}: {
  label: string;
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
      className="min-h-14 rounded-xl border border-border bg-card p-3 font-extrabold text-foreground shadow-sm transition will-change-transform transform-(--card-tilt) hover:bg-accent active:scale-[.98]"
    >
      {label}
    </button>
  );
}


const ACTIONS:readonly DuelAction[]=["strike","guard","evade-left","evade-right"];
const COPY={
 ko:{title:"라이벌의 마음",sub:"보스를 외우는 게 아니라, 보스가 나를 외워요",start:"첫 탐색전",again:"새 라이벌",round:"라운드",you:"나",rival:"라이벌",mind:"라이벌의 판독",actions:{strike:"베기",guard:"받아치기", "evade-left":"왼쪽 회피","evade-right":"오른쪽 회피"},reads:{opening:"아직 관찰 전",aggressive:"공격을 서두름",defensive:"반격을 기다림","left-biased":"왼쪽 회피 반복","right-biased":"오른쪽 회피 반복",balanced:"패턴을 숨김"},won:"습관을 역이용해 승리했어요",lost:"라이벌이 습관을 읽었습니다",draw:"서로를 끝까지 속였습니다",explain:"경기 후 공개되는 판독은 기기 안의 이번 5라운드 행동만 사용합니다."},
 en:{title:"The Rival's Mind",sub:"You do not memorize the boss. The boss memorizes you.",start:"Begin scouting round",again:"New rival",round:"Round",you:"You",rival:"Rival",mind:"Rival read",actions:{strike:"Strike",guard:"Parry","evade-left":"Evade left","evade-right":"Evade right"},reads:{opening:"No read yet",aggressive:"Rushing attacks",defensive:"Waiting to counter","left-biased":"Repeating left evade","right-biased":"Repeating right evade",balanced:"Pattern concealed"},won:"You weaponized your own habit",lost:"The rival read your habit",draw:"Neither fighter gave the pattern away",explain:"The disclosed read uses only your actions from this five-round match on this device."},
 ja:{title:"ライバルの心",sub:"ボスを覚えるのではなく、ボスがあなたを覚える",start:"探り合い開始",again:"新しいライバル",round:"ラウンド",you:"自分",rival:"ライバル",mind:"ライバルの分析",actions:{strike:"斬る",guard:"受け流す","evade-left":"左回避","evade-right":"右回避"},reads:{opening:"観察前",aggressive:"攻撃を急ぐ",defensive:"反撃待ち","left-biased":"左回避を反復","right-biased":"右回避を反復",balanced:"癖を隠している"},won:"自分の癖を逆手に勝利",lost:"癖を読まれました",draw:"最後まで互いを欺きました",explain:"分析には、この端末の今回5ラウンドの行動だけを使います。"},
 zh:{title:"对手的心",sub:"你不是在记住Boss，而是Boss在记住你",start:"开始试探",again:"新的对手",round:"回合",you:"你",rival:"对手",mind:"对手判断",actions:{strike:"斩击",guard:"招架","evade-left":"左闪避","evade-right":"右闪避"},reads:{opening:"尚未观察",aggressive:"急于攻击",defensive:"等待反击","left-biased":"反复左闪","right-biased":"反复右闪",balanced:"隐藏模式"},won:"你利用自己的习惯取胜",lost:"对手读懂了你的习惯",draw:"双方都未暴露最终模式",explain:"公开的判断只使用本设备上本场五回合的动作。"},
 fr:{title:"Dans la tête du rival",sub:"Vous n'apprenez pas le boss : le boss vous apprend",start:"Commencer l'observation",again:"Nouveau rival",round:"Manche",you:"Vous",rival:"Rival",mind:"Lecture du rival",actions:{strike:"Frapper",guard:"Parer","evade-left":"Esquive gauche","evade-right":"Esquive droite"},reads:{opening:"Aucune lecture",aggressive:"Attaques précipitées",defensive:"Attend la riposte","left-biased":"Esquive gauche répétée","right-biased":"Esquive droite répétée",balanced:"Motif dissimulé"},won:"Vous avez retourné votre habitude",lost:"Le rival a lu votre habitude",draw:"Aucun n'a livré son motif",explain:"La lecture affichée utilise uniquement vos actions des cinq manches de cette partie sur cet appareil."},
 es:{title:"La mente del rival",sub:"No memorizas al jefe: el jefe te memoriza",start:"Iniciar tanteo",again:"Nuevo rival",round:"Ronda",you:"Tú",rival:"Rival",mind:"Lectura del rival",actions:{strike:"Atacar",guard:"Parar","evade-left":"Esquivar izquierda","evade-right":"Esquivar derecha"},reads:{opening:"Sin lectura",aggressive:"Ataques precipitados",defensive:"Espera el contraataque","left-biased":"Repite evasión izquierda","right-biased":"Repite evasión derecha",balanced:"Patrón oculto"},won:"Convertiste tu hábito en un arma",lost:"El rival leyó tu hábito",draw:"Nadie reveló el patrón",explain:"La lectura usa solo tus acciones de las cinco rondas de esta partida en este dispositivo."}
} as const;

export default function RivalsMind({locale="ko"}:{locale?:string}){const{ref:stageRef,celebrate:celebrateStage}=useCelebration();
 const t=COPY[locale as keyof typeof COPY]??COPY.en; const seed=useMemo(()=>Date.now()%1_000_003,[]);const [state,setState]=useState(()=>createRivalsMind(seed));const [started,setStarted]=useState(false);const [impact,setImpact]=useState<"player"|"rival"|null>(null);
 const read=readRivalHabit(state.history); const last=state.history.at(-1);
 const impactTimer=useRef<number|undefined>(undefined);
 useEffect(()=>()=>window.clearTimeout(impactTimer.current),[]);
 const play=(action:DuelAction)=>{
   if(!started||state.phase!=="playing"||impactTimer.current!==undefined)return;
   if(action==="strike") playDuelAudio("strike");
   else if(action==="guard") playDuelAudio("guard");
   else playDuelAudio("evade");
   MobileHapticsPro.light();
   const next=playRivalsMindRound(state,action),round=next.history.at(-1);
   setState(next);
   if(round?.playerDamage){
     playDuelAudio("hit");
     MobileHapticsPro.heavy();
     setImpact("player");
   } else if(round?.rivalDamage){
     playDuelAudio("hit");
     MobileHapticsPro.heavy();
     setImpact("rival");
   } else {
     setImpact(null);
   }
   impactTimer.current=window.setTimeout(()=>{setImpact(null);impactTimer.current=undefined;},220);
 };
 useEffect(()=>{recordAchievementEvent("rivals-mind","opened");},[]);
 useEffect(()=>{if(state.phase==="playing")return;const score=state.phase==="won"?state.playerHealth*100+state.rivalHealth*-10:0;recordBestForConditions("rivals-mind",score,"score",{seed:String(state.seed),difficulty:RIVALS_MIND_RULESET,assist:"none"},`${state.round} rounds`);recordAchievementEvent("rivals-mind",state.phase==="won"?"cleared":"played");
  if(state.phase==="won"){
    playDuelAudio("win");
    MobileHapticsPro.success();
    celebrateStage({preset:"sparks",colors:["#657344","#d0ad55","#802f2f"],origin:{x:.5,y:.6}});
  } else if(state.phase==="lost"){
    playDuelAudio("lose");
    MobileHapticsPro.warning();
  }
 },[state.phase,state.playerHealth,state.rivalHealth,state.round,state.seed]);
 const reset=()=>{window.clearTimeout(impactTimer.current);impactTimer.current=undefined;setImpact(null);setState(createRivalsMind((state.seed+state.round+1)%1_000_003));setStarted(true);recordAchievementEvent("rivals-mind","played");};
 const result=state.phase==="won"?t.won:state.phase==="lost"?t.lost:t.draw;
 return <GameContainer title={t.title} subtitle={t.sub}><div className="space-y-4">{!started&&<img src="/games/rivals-mind-keyart.webp" alt="" width={1730} height={909} decoding="async" className="aspect-[1.9/1] w-full rounded-2xl object-cover"/>}
  <div ref={stageRef} className="relative overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,#eee8d5,#c9c2a3)] p-5">
   <div className="mb-5 flex justify-between text-xs font-bold uppercase tracking-widest"><span>{t.you} · {"♥".repeat(state.playerHealth)}</span><span>{t.round} {state.round}/5</span><span>{"♥".repeat(state.rivalHealth)} · {t.rival}</span></div>
   <div className="relative grid h-44 grid-cols-2 sm:h-64 items-end border-b-4 border-[#68704d]">
    <img src={last?RIVALS_MIND_POSES.player[last.player]:"/games/rivals-mind-player.webp"} alt="" width={512} height={512} draggable={false} className={`w-full origin-bottom object-contain drop-shadow-xl transition-transform motion-reduce:transition-none ${impact==="player"?"-translate-x-3 rotate-6":""}`}/>
    <img src={last?RIVALS_MIND_POSES.rival[last.rival]:"/games/rivals-mind-rival.webp"} alt="" width={512} height={512} draggable={false} className={`w-full origin-bottom object-contain drop-shadow-xl transition-transform motion-reduce:transition-none ${impact==="rival"?"translate-x-3 -rotate-6":""}`}/>
   </div>
  </div>
  {!started?<button onClick={()=>{setStarted(true);recordAchievementEvent("rivals-mind","played");}} className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">{t.start}</button>:state.phase==="playing"?<div className="grid grid-cols-2 gap-2">{ACTIONS.map(a=><TiltDuelActionButton key={a} onClick={()=>play(a)} label={t.actions[a]} />)}</div>:<><div aria-live="polite" className="rounded-xl bg-muted p-4 text-center font-bold">{result}</div><button onClick={reset} className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">{t.again}</button></>}
  <div className="rounded-xl border p-4"><div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.mind}</div><div className="mt-1 text-lg font-bold">{t.reads[read.read as DuelRead]}</div></div>
  {state.history.length>0&&<ol className="space-y-1 text-sm">{state.history.slice().reverse().map(r=><li key={r.round} className="rounded-lg bg-muted px-3 py-2">#{r.round} {t.actions[r.player]} ↔ {t.actions[r.rival]} · {t.reads[r.read]}</li>)}</ol>}
  <p className="text-sm text-muted-foreground">{t.explain}</p>
 </div></GameContainer>;
}

