import React,{useCallback,useEffect,useRef,useState} from 'react';
import {GameContainer} from '../ui/game/GamePrimitives';
import {createHitori,hintHitori,parseHitori,serializeHitori,toggleHitori,undoHitori,type HitoriState} from '../../lib/games/hitori';
import {validateHitori} from '../../lib/games/logic-puzzles';

const SAVE='oiyo:hitori:v1';
const COPY={
 ko:{title:'히토리',sub:'고요한 논리 정원',desc:'중복 숫자를 가리고, 흰 칸의 연결을 지키세요.',newGame:'새 퍼즐',undo:'되돌리기',hint:'힌트',sound:'소리',pause:'일시정지',resume:'계속하기',moves:'수',shaded:'검은 칸',win:'정원이 완성되었습니다',next:'다음 퍼즐',restored:'이어서 플레이할 준비가 됐어요',duplicate:'중복',adjacent:'검은 칸 인접',connected:'흰 칸 연결'},
 en:{title:'Hitori',sub:'A quiet logic garden',desc:'Shade duplicates while keeping every white cell connected.',newGame:'New puzzle',undo:'Undo',hint:'Hint',sound:'Sound',pause:'Pause',resume:'Resume',moves:'Moves',shaded:'Shaded',win:'The garden is complete',next:'Next puzzle',restored:'Your puzzle is ready to continue',duplicate:'Unique lines',adjacent:'Black spacing',connected:'White network'},
 ja:{title:'ひとりにしてくれ',sub:'静かな論理の庭',desc:'重複を黒くして、白マスをつなげましょう。',newGame:'新しい問題',undo:'戻す',hint:'ヒント',sound:'サウンド',pause:'一時停止',resume:'続ける',moves:'手数',shaded:'黒マス',win:'庭が完成しました',next:'次の問題',restored:'続きから遊べます',duplicate:'重複なし',adjacent:'黒の間隔',connected:'白の接続'},
 zh:{title:'数壹',sub:'静谧逻辑花园',desc:'涂掉重复数字，并保持所有白格相连。',newGame:'新谜题',undo:'撤销',hint:'提示',sound:'声音',pause:'暂停',resume:'继续',moves:'步数',shaded:'黑格',win:'花园完成了',next:'下一题',restored:'可以继续上次谜题',duplicate:'行列唯一',adjacent:'黑格间距',connected:'白格连通'},
 fr:{title:'Hitori',sub:'Un jardin de logique',desc:'Noircissez les doublons en gardant les cases blanches reliées.',newGame:'Nouvelle grille',undo:'Annuler',hint:'Indice',sound:'Son',pause:'Pause',resume:'Reprendre',moves:'Coups',shaded:'Noires',win:'Le jardin est terminé',next:'Grille suivante',restored:'Votre partie est prête',duplicate:'Lignes uniques',adjacent:'Espacement noir',connected:'Réseau blanc'},
 es:{title:'Hitori',sub:'Un jardín lógico',desc:'Sombrea duplicados y mantén conectadas todas las casillas blancas.',newGame:'Nuevo puzle',undo:'Deshacer',hint:'Pista',sound:'Sonido',pause:'Pausa',resume:'Continuar',moves:'Movimientos',shaded:'Negras',win:'El jardín está completo',next:'Siguiente puzle',restored:'Tu partida está lista',duplicate:'Líneas únicas',adjacent:'Separación negra',connected:'Red blanca'}
};
export default function Hitori({locale='ko'}:{locale?:string}){
 const t=COPY[locale as keyof typeof COPY]??COPY.en; const [state,setState]=useState<HitoriState>(()=>createHitori()); const [paused,setPaused]=useState(false);const [sound,setSound]=useState(true);const [restored,setRestored]=useState(false);const [active,setActive]=useState(0);const refs=useRef<Array<HTMLButtonElement|null>>([]);
 useEffect(()=>{const saved=parseHitori(localStorage.getItem(SAVE));if(saved){setState(saved);setRestored(true);setPaused(true);}},[]);
 useEffect(()=>{localStorage.setItem(SAVE,serializeHitori(state));},[state]);
 const tone=useCallback((win=false)=>{if(!sound)return;const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),o=a.createOscillator(),g=a.createGain();o.frequency.value=win?720:330;g.gain.setValueAtTime(.035,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.12);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.12);},[sound]);
 const act=(fn:(s:HitoriState)=>HitoriState)=>{if(paused)return;setState(s=>{const n=fn(s);if(n!==s)tone(n.won);return n;});};
 const fresh=()=>{setState(createHitori(state.seed+1));setPaused(false);setRestored(false);};
 const v=validateHitori(state.values,state.dark); const shaded=state.dark.flat().filter(Boolean).length;
 const move=(e:React.KeyboardEvent,index:number)=>{const r=Math.floor(index/5),c=index%5;let n=index;if(e.key==='ArrowUp')n=Math.max(0,r-1)*5+c;else if(e.key==='ArrowDown')n=Math.min(4,r+1)*5+c;else if(e.key==='ArrowLeft')n=r*5+Math.max(0,c-1);else if(e.key==='ArrowRight')n=r*5+Math.min(4,c+1);else return;e.preventDefault();setActive(n);refs.current[n]?.focus();};
 return <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.newGame} onReset={fresh}>
  <div className="mx-auto max-w-md space-y-5"><p className="text-center text-sm text-muted-foreground">{t.desc}</p>
   <div className="grid grid-cols-3 gap-2" aria-label="game stats"><Stat label={t.moves} value={state.moves}/><Stat label={t.shaded} value={shaded}/><Stat label="Seed" value={state.seed+1}/></div>
   {restored&&<p className="rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary" role="status">{t.restored}</p>}
   <div className="relative rounded-3xl border bg-muted/30 p-3 shadow-inner"><div className="grid grid-cols-5 gap-1" role="grid" aria-label={t.title}>{state.values.flatMap((row,r)=>row.map((value,c)=>{const i=r*5+c;return <button key={i} ref={n=>{refs.current[i]=n;}} role="gridcell" aria-pressed={state.dark[r][c]} aria-label={`${r+1}, ${c+1}: ${value}`} tabIndex={active===i?0:-1} disabled={paused||state.won} onFocus={()=>setActive(i)} onKeyDown={e=>move(e,i)} onClick={()=>act(s=>toggleHitori(s,i))} className={`aspect-square min-h-12 rounded-xl border text-lg font-black transition focus-visible:ring-2 focus-visible:ring-primary ${state.dark[r][c]?'bg-slate-900 text-white':'bg-card hover:bg-primary/10'}`}>{value}</button>}))}</div>
    {paused&&<button onClick={()=>setPaused(false)} className="absolute inset-3 rounded-2xl bg-background/95 text-lg font-black backdrop-blur">{t.resume}</button>}</div>
   <div className="grid grid-cols-3 gap-2 text-center text-[11px]"><Rule ok={v.duplicateFree} text={t.duplicate}/><Rule ok={v.noAdjacentBlack} text={t.adjacent}/><Rule ok={v.whiteConnected} text={t.connected}/></div>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Control text={t.undo} onClick={()=>act(undoHitori)} disabled={!state.history.length||state.won}/><Control text={t.hint} onClick={()=>act(hintHitori)} disabled={state.won}/><Control text={`${t.sound} ${sound?'ON':'OFF'}`} onClick={()=>setSound(x=>!x)}/><Control text={paused?t.resume:t.pause} onClick={()=>setPaused(x=>!x)}/></div>
   {state.won&&<div className="rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center" role="status" aria-live="polite"><div className="text-3xl">🌿</div><h3 className="mt-2 text-xl font-black">{t.win}</h3><p className="mt-1 text-sm">{state.moves} {t.moves} · {state.hints} {t.hint}</p><button onClick={fresh} className="mt-4 min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground">{t.next}</button></div>}
  </div></GameContainer>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="rounded-2xl border bg-card p-2 text-center"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase text-muted-foreground">{label}</div></div>}
function Rule({ok,text}:{ok:boolean;text:string}){return <div className={`rounded-xl p-2 font-bold ${ok?'bg-emerald-500/10 text-emerald-700':'bg-amber-500/10 text-amber-700'}`}>{ok?'✓':'•'} {text}</div>}
function Control({text,onClick,disabled=false}:{text:string;onClick:()=>void;disabled?:boolean}){return <button type="button" onClick={onClick} disabled={disabled} className="min-h-11 rounded-xl border bg-card px-2 text-xs font-bold disabled:opacity-40">{text}</button>}

declare global{interface Window{webkitAudioContext?:typeof AudioContext}}
