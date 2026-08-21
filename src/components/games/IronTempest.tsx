import { useCallback, useEffect, useRef, useState } from "react";
import { Bomb, Crosshair, Gamepad2, Headphones, Shield } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { reviewTempestMission } from "../../lib/games/iron-tempest";
import { ENEMY_HEALTH, WEAPONS, applyTempestDamage, blastDamage, missionScore, structureStage, weaponDrop, type TempestEnemy, type TempestWeapon } from "../../lib/games/iron-tempest";

const GAME_KEY = "iron-tempest";
type Phase = "briefing" | "playing" | "result";
const EN = {
  eyebrow: "OPERATION IRON TEMPEST / LOCAL SINGLE-PLAYER",
  title: "IRON TEMPEST",
  subtitle: "Run, jump and reduce the Ashen Front to flying pixels. Seize heavy weapons, punch through destructible bunkers and dismantle the colossal War Train.",
  start: "DEPLOY", again: "RUN IT AGAIN", best: "BEST", score: "SCORE", kills: "KILLS", time: "TIME",
  controls: "A/D or arrows move · W/Space jump · S crouch · J/F fire · K/G grenade · E enter/exit vehicle",
  mobile: "Touch controls appear during combat.", local: "Everything runs locally", localBody: "Original characters and procedural Web Audio. No account, payment, online opponent or downloaded soundtrack.",
  features: [
    ["ARSENAL DROPS", "Rescue HMG and rocket crates from enemy squads before their timers expire."],
    ["BREAK THE FRONT", "Rockets and grenades fracture towers, bunkers, bridges and terrain into physical debris."],
    ["COLOSSAL BOSS", "The armored War Train fills the horizon with cannons, missiles, weak points and violent screen shake."],
  ],
  hud: { hp: "VITAL", ammo: "AMMO", grenade: "BOMBS", boss: "WAR TRAIN", go: "GO!", hmg: "HEAVY MACHINE GUN!", rocket: "ROCKET LAUNCHER!", vehicle: "ASSAULT BUGGY", clear: "MISSION COMPLETE", over: "SOLDIER DOWN" },
};
type Copy = typeof EN;
const COPY: Record<Locale, Copy> = {
  en: EN,
  ko: { ...EN, eyebrow: "아이언 템페스트 작전 / 로컬 싱글플레이", subtitle: "달리고 뛰며 애셴 전선을 픽셀 파편으로 날려버리세요. 중화기를 탈취하고 파괴 가능한 벙커를 돌파해 거대 전쟁열차를 해체하세요.", start: "작전 투입", again: "다시 출격", best: "최고", score: "점수", kills: "처치", time: "시간", controls: "A/D·방향키 이동 · W/Space 점프 · S 숙이기 · J/F 사격 · K/G 수류탄 · E 차량 탑승", mobile: "전투 중 터치 조작이 나타납니다.", local: "모든 연산은 기기에서", localBody: "독창적 캐릭터와 절차형 Web Audio를 사용합니다. 계정·결제·온라인 상대·다운로드 음원이 없습니다.", features: [["무기 보급", "적 부대가 남긴 HMG와 로켓 상자를 시간이 끝나기 전에 확보하세요."], ["전선을 파괴", "로켓과 수류탄으로 감시탑·벙커·교량·지형을 물리 파편으로 부숩니다."], ["초대형 보스", "거대 전쟁열차의 포대, 미사일, 약점을 공략하면 화면 전체가 요동칩니다."]], hud: { hp: "생명", ammo: "탄약", grenade: "폭탄", boss: "전쟁열차", go: "전진!", hmg: "헤비 머신건!", rocket: "로켓 런처!", vehicle: "돌격 버기", clear: "작전 완료", over: "전투 불능" } },
  ja: { ...EN, eyebrow: "アイアン・テンペスト作戦 / ローカル一人用", subtitle: "走り、跳び、灰の戦線をピクセル片に変えろ。重火器を奪い、破壊可能な陣地を突破して巨大戦闘列車を解体せよ。", start: "出撃", again: "再出撃", best: "ベスト", kills: "撃破", time: "時間", controls: "A/D・矢印 移動 · W/Space ジャンプ · S 伏せ · J/F 射撃 · K/G 手榴弾 · E 車両", mobile: "戦闘中はタッチ操作が表示されます。", local: "すべて端末内で実行", localBody: "独自キャラクターと合成音。アカウント、課金、オンライン対戦はありません。" },
  zh: { ...EN, eyebrow: "钢铁风暴行动 / 本地单人", subtitle: "奔跑、跳跃，把灰烬前线炸成像素碎片。夺取重武器，突破可破坏工事，拆毁巨型战争列车。", start: "投入战斗", again: "再次出击", best: "最佳", kills: "击杀", time: "时间", controls: "A/D或方向键移动 · W/Space跳跃 · S下蹲 · J/F射击 · K/G手雷 · E载具", mobile: "战斗中显示触控按钮。", local: "完全在设备上运行", localBody: "原创角色与合成音频，无账号、付费、在线对手或下载音乐。" },
  fr: { ...EN, eyebrow: "OPÉRATION IRON TEMPEST / SOLO LOCAL", subtitle: "Courez, sautez et réduisez le Front cendré en pixels. Saisissez les armes lourdes, traversez les fortifications destructibles et démantelez le Train de guerre.", start: "DÉPLOYER", again: "REPARTIR", best: "RECORD", kills: "ÉLIM.", time: "TEMPS", controls: "Q/D ou flèches bouger · Z/Espace sauter · S baisser · J/F tirer · K/G grenade · E véhicule", mobile: "Les commandes tactiles apparaissent en combat.", local: "Tout reste sur l'appareil", localBody: "Personnages originaux et audio synthétisé. Aucun compte, paiement, rival en ligne ou musique téléchargée." },
  es: { ...EN, eyebrow: "OPERACIÓN IRON TEMPEST / INDIVIDUAL LOCAL", subtitle: "Corre, salta y convierte el Frente de Ceniza en píxeles. Toma armas pesadas, rompe fortificaciones destructibles y desmantela el Tren de Guerra.", start: "DESPLEGAR", again: "REPETIR", best: "RÉCORD", kills: "BAJAS", time: "TIEMPO", controls: "A/D o flechas mover · W/Espacio saltar · S agachar · J/F disparar · K/G granada · E vehículo", mobile: "Los controles táctiles aparecen durante el combate.", local: "Todo funciona en el dispositivo", localBody: "Personajes originales y audio sintetizado. Sin cuenta, pagos, rival online ni música descargada." },
};

export default function IronTempest({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? EN;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [best, setBest] = useState(0);
  const [result, setResult] = useState({ score: 0, kills: 0, seconds: 0 });
  useEffect(() => setBest(getBest(GAME_KEY)?.value ?? 0), []);
  const finish = useCallback((r: typeof result) => { setResult(r); setBest(recordBest(GAME_KEY, r.score, "score", JSON.stringify(r)).value); setPhase("result"); }, []);
  if (phase === "playing") return <TempestGame copy={t.hud} onFinish={finish} />;
  return <section className="not-prose relative left-1/2 my-7 w-[min(100vw-1rem,1200px)] -translate-x-1/2 overflow-hidden rounded-2xl border-4 border-[#17110b] bg-[#17110b] text-[#fff6d8] shadow-2xl">
    <div className="relative min-h-[520px] bg-cover bg-center p-5 sm:p-10 lg:p-14" style={{ backgroundImage: "linear-gradient(90deg,rgba(6,8,8,.96),rgba(6,8,8,.72) 48%,rgba(6,8,8,.08)),url('/games/iron-tempest-social.png')" }}>
      <div className="max-w-xl"><p className="font-mono text-[10px] font-black tracking-[.28em] text-[#ffbe3f]">{t.eyebrow}</p><h2 className="mt-4 font-mono text-5xl font-black leading-[.82] tracking-[-.08em] text-white [text-shadow:4px_4px_0_#7a1f0b] sm:text-7xl">{t.title}</h2><p className="mt-6 max-w-lg text-sm font-semibold leading-7 text-[#eadfc8] sm:text-base">{t.subtitle}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3"><button onClick={() => setPhase("playing")} className="min-h-12 border-b-4 border-[#8b290f] bg-[#ffb11b] px-9 py-3 font-mono text-sm font-black text-[#1d1204] active:translate-y-1 active:border-b-0">{phase === "result" ? t.again : t.start}</button><span className="bg-black/75 px-4 py-3 font-mono text-xs">{t.best} <b className="text-[#ffcf4f]">{best.toLocaleString()}</b></span></div>
        {phase === "result" && <><dl role="status" aria-live="polite" className="mt-5 grid grid-cols-3 border-2 border-white/15 bg-black/75 p-3 text-center font-mono">{[[t.score, result.score], [t.kills, result.kills], [t.time, `${result.seconds}s`]].map(([a,b])=><div key={a}><dt className="text-[9px] text-[#c7bca8]">{a}</dt><dd className="text-xl font-black">{b}</dd></div>)}</dl><p className="mt-2 text-center font-mono text-xs font-black text-[#ffcf4f]">→ {reviewTempestMission(result) === "kills" ? t.kills : reviewTempestMission(result) === "speed" ? t.time : t.score}</p></>}
      </div>
    </div>
    <div className="grid gap-px bg-[#3c3327] md:grid-cols-3">{t.features.map(([a,b],i)=>{const Icon=[Crosshair,Bomb,Shield][i];return <div key={a} className="flex gap-3 bg-[#211b14] p-5"><Icon className="size-5 shrink-0 text-[#ffad1a]"/><div><h3 className="font-mono text-xs font-black">{a}</h3><p className="mt-1 text-xs leading-5 text-[#bdb09b]">{b}</p></div></div>})}</div>
    <div className="grid gap-4 bg-[#f4e7c7] p-5 text-xs text-[#2d281f] sm:grid-cols-2"><p className="flex gap-2"><Gamepad2 className="size-5 shrink-0"/><span><b>{t.controls}</b><br/>{t.mobile}</span></p><p className="flex gap-2"><Headphones className="size-5 shrink-0"/><span><b>{t.local}</b><br/>{t.localBody}</span></p></div>
  </section>;
}

type HudCopy = Copy["hud"];
type Enemy = { id:number; x:number; y:number; vx:number; hp:number; max:number; kind:TempestEnemy; dead:number; fire:number };
type Shot = { x:number; y:number; vx:number; vy:number; enemy:boolean; rocket:boolean; life:number };
type Particle = { x:number;y:number;vx:number;vy:number;life:number;color:string;size:number };
type Structure = { x:number;y:number;w:number;h:number;hp:number;max:number };
type Pickup = { x:number;y:number;kind:TempestWeapon;life:number };
const W=960,H=540,GROUND=430;

function TempestGame({copy,onFinish}:{copy:HudCopy;onFinish:(r:{score:number;kills:number;seconds:number})=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null), keys=useRef(new Set<string>()), touch=useRef(new Set<string>());
  const finishRef=useRef(onFinish); finishRef.current=onFinish;
  const [muted,setMuted]=useState(false);
  const audioRef=useRef<ReturnType<typeof createAudio>|null>(null);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{keys.current.add(e.code);if(["ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault()},up=(e:KeyboardEvent)=>keys.current.delete(e.code);addEventListener("keydown",down);addEventListener("keyup",up);return()=>{removeEventListener("keydown",down);removeEventListener("keyup",up)}},[]);
  useEffect(()=>{const el=canvas.current;if(!el)return;const ctx=el.getContext("2d");if(!ctx)return;ctx.imageSmoothingEnabled=false;let raf=0,last=performance.now(),ended=false;
    const player={x:100,y:GROUND-46,vx:0,vy:0,hp:100,weapon:"rifle" as TempestWeapon,ammo:Infinity,grenades:8,shot:0,kills:0,score:0,vehicle:false,inv:0,duck:false};
    let camera=0,shake=0,time=0,id=1,bossSpawn=false,bossHp=ENEMY_HEALTH.boss,message=copy.go,messageT=2;
    const enemies:Enemy[]=[],shots:Shot[]=[],particles:Particle[]=[],pickups:Pickup[]=[];
    const structures:Structure[]=[{x:650,y:GROUND-130,w:100,h:130,hp:180,max:180},{x:1220,y:GROUND-90,w:150,h:90,hp:240,max:240},{x:1810,y:GROUND-160,w:120,h:160,hp:220,max:220}];
    const audio=createAudio();audioRef.current=audio;
    const burst=(x:number,y:number,color="#ff9d16",n=18)=>{for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*280,vy:-Math.random()*260,life:.35+Math.random()*.55,color,size:2+Math.random()*7});audio.boom();shake=Math.max(shake,10)};
    const spawn=(x:number,kind:TempestEnemy)=>enemies.push({id:id++,x,y:GROUND-(kind==="boss"?150:42),vx:0,hp:ENEMY_HEALTH[kind],max:ENEMY_HEALTH[kind],kind,dead:0,fire:Math.random()});
    const shoot=()=>{if(player.ammo<=0){player.weapon="rifle";player.ammo=Infinity}const w=WEAPONS[player.weapon];if(player.shot>0)return;player.shot=w.cooldown;if(Number.isFinite(player.ammo))player.ammo--;shots.push({x:player.x+34,y:player.y+(player.duck?31:18),vx:w.speed,vy:(Math.random()-.5)*(player.weapon==="heavy"?18:8),enemy:false,rocket:player.weapon==="rocket",life:2});audio.shot(player.weapon);shake=Math.max(shake,player.weapon==="rocket"?8:2)};
    const grenade=()=>{if(player.grenades<=0)return;player.grenades--;shots.push({x:player.x+20,y:player.y,vx:310,vy:-330,enemy:false,rocket:true,life:1.15});audio.shot("rocket")};
    const frame=(now:number)=>{const dt=Math.min(.033,(now-last)/1000);last=now;time+=dt;player.shot=Math.max(0,player.shot-dt);player.inv=Math.max(0,player.inv-dt);messageT=Math.max(0,messageT-dt);
      const held=(...c:string[])=>c.some(k=>keys.current.has(k)||touch.current.has(k));const move=Number(held("KeyD","ArrowRight","right"))-Number(held("KeyA","ArrowLeft","left"));
      player.duck=held("KeyS","ArrowDown")&&player.y>=GROUND-47;player.vx+=(move*(player.duck?120:240)-player.vx)*Math.min(1,dt*10);if(held("KeyW","ArrowUp","Space","jump")&&player.y>=GROUND-47){player.vy=-430;audio.jump()}player.vy+=980*dt;player.x=Math.max(25,Math.min(3100,player.x+player.vx*dt));player.y=Math.min(GROUND-46,player.y+player.vy*dt);if(player.y>=GROUND-46)player.vy=0;
      if(held("KeyJ","KeyF","fire"))shoot();if(held("KeyK","KeyG","bomb")){keys.current.delete("KeyK");keys.current.delete("KeyG");touch.current.delete("bomb");grenade()}if(held("KeyE","vehicle")&&player.x>1430&&player.x<1690){player.vehicle=true;player.hp=Math.min(160,player.hp+40);message=copy.vehicle;messageT=1.5;keys.current.delete("KeyE");touch.current.delete("vehicle")}
      camera+=(Math.max(0,player.x-250)-camera)*Math.min(1,dt*5);
      const targetSpawn=Math.floor(player.x/170)+3;while(enemies.length+player.kills<targetSpawn&&player.x<2100)spawn(player.x+600+Math.random()*240,Math.random()<.22?"rocketeer":Math.random()<.18?"shield":"rifleman");
      if(player.x>2150&&!bossSpawn){bossSpawn=true;spawn(2700,"boss");message=copy.boss;messageT=2;audio.alarm()}
      for(const e of enemies){if(e.dead>0){e.dead+=dt;e.y-=e.dead*90*dt;e.x+=e.vx*dt;continue}const dx=player.x-e.x;e.vx=Math.abs(dx)>260?Math.sign(dx)*-42:0;e.x+=e.vx*dt;e.fire-=dt;if(Math.abs(dx)<650&&e.fire<=0){e.fire=e.kind==="boss"?.28:e.kind==="rocketeer"?1.6:1.05;shots.push({x:e.x,y:e.y+20,vx:Math.sign(dx)*-(e.kind==="boss"?360:260),vy:(Math.random()-.5)*35,enemy:true,rocket:e.kind==="rocketeer"||e.kind==="boss",life:3})}}
      for(const s of shots){s.life-=dt;s.vy+=(s.rocket?430:0)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.y>GROUND&&s.rocket){s.life=0;burst(s.x,GROUND);for(const e of enemies){if(e.dead<=0){const d=Math.hypot(e.x-s.x,e.y-s.y),dam=blastDamage(90,d,115);if(dam)e.hp-=dam}}for(const st of structures){const d=Math.abs(st.x+st.w/2-s.x);if(d<170)st.hp-=blastDamage(120,d,170)}}if(s.enemy&&s.life>0&&Math.abs(s.x-player.x)<24&&Math.abs(s.y-player.y)<48&&player.inv<=0){s.life=0;player.hp-=s.rocket?20:8;player.inv=.3;shake=12;audio.hurt()}if(!s.enemy&&s.life>0){for(const e of enemies){if(e.dead<=0&&Math.abs(s.x-e.x)<(e.kind==="boss"?110:24)&&Math.abs(s.y-(e.y+20))<(e.kind==="boss"?100:36)){s.life=0;const armored=e.kind==="shield";const hit=applyTempestDamage(e.hp,WEAPONS[player.weapon].damage,armored);e.hp=hit.health;if(e.kind==="boss")bossHp=e.hp;for(let p=0;p<5;p++)particles.push({x:s.x,y:s.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:.3,color:"#ffe37c",size:3});if(hit.killed){e.dead=.01;e.vx=s.vx*.22;player.kills++;const drop=weaponDrop(player.kills);if(drop)pickups.push({x:e.x,y:GROUND-28,kind:drop,life:12});player.score+=e.kind==="boss"?8000:125;burst(e.x,e.y+18,e.kind==="boss"?"#ff5b14":"#d6c3a0",e.kind==="boss"?60:14)}}}}
      }
      for(const st of structures){if(st.hp<=0&&st.max>0){st.max=-st.max;player.score+=600;burst(st.x+st.w/2,st.y+st.h/2,"#bb8a53",34)}}
      for(const p of pickups){p.life-=dt;if(Math.abs(p.x-player.x)<45){player.weapon=p.kind;player.ammo=WEAPONS[p.kind].ammo;p.life=0;message=p.kind==="heavy"?copy.hmg:copy.rocket;messageT=2;audio.pickup()}}
      for(const p of particles){p.life-=dt;p.vy+=650*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}
      for(let i=shots.length-1;i>=0;i--)if(shots[i].life<=0)shots.splice(i,1);for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);for(let i=pickups.length-1;i>=0;i--)if(pickups[i].life<=0)pickups.splice(i,1);
      if((player.hp<=0||bossSpawn&&bossHp<=0)&&!ended){ended=true;message=player.hp<=0?copy.over:copy.clear;const score=missionScore(player.kills,structures.filter(s=>s.max<0).length,ENEMY_HEALTH.boss-bossHp,time);setTimeout(()=>finishRef.current({score,kills:player.kills,seconds:Math.round(time)}),1300)}
      draw(ctx,{player,camera,shake,enemies,shots,particles,pickups,structures,bossHp,time,message:messageT>0||ended?message:"",copy});shake=Math.max(0,shake-dt*28);if(!ended||messageT>0)raf=requestAnimationFrame(frame);else audio.stop()};
    audio.start();raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);audio.stop()}
  },[copy]);
  const press=(k:string,v:boolean)=>{v?touch.current.add(k):touch.current.delete(k)};
  return <div className="not-prose relative left-1/2 my-4 w-[min(100vw,1440px)] -translate-x-1/2 overflow-hidden bg-black"><canvas ref={canvas} width={W} height={H} className="block aspect-video max-h-[86vh] w-full [image-rendering:pixelated]" aria-label="Iron Tempest game canvas"/>
    <button type="button" onClick={()=>setMuted(v=>{const next=!v;audioRef.current?.setMuted(next);return next})} aria-pressed={muted} aria-label="Sound" className="absolute right-3 top-3 min-h-11 min-w-11 rounded border border-white/30 bg-black/70 text-sm text-white"><span aria-hidden="true">{muted?"🔇":"🔊"}</span></button>
    <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1 md:hidden"><i/><Touch k="jump" label="▲" press={press}/><i/><Touch k="left" label="◀" press={press}/><Touch k="right" label="▶" press={press}/><Touch k="vehicle" label="E" press={press}/></div>
    <div className="absolute bottom-3 right-3 grid grid-cols-2 gap-2 md:hidden"><Touch k="bomb" label="BOMB" press={press}/><Touch k="fire" label="FIRE" hot press={press}/></div>
  </div>
}
function Touch({k,label,press,hot=false}:{k:string;label:string;press:(k:string,v:boolean)=>void;hot?:boolean}){return <button className={`min-h-12 min-w-12 border-2 font-mono text-[9px] font-black ${hot?"border-yellow-200 bg-orange-500/80":"border-white/40 bg-black/60"} text-white`} onPointerDown={e=>{e.preventDefault();press(k,true)}} onPointerUp={()=>press(k,false)} onPointerCancel={()=>press(k,false)}>{label}</button>}

function draw(c:CanvasRenderingContext2D,s:any){const q=Math.round((Math.random()-.5)*s.shake);c.save();c.translate(q,Math.round((Math.random()-.5)*s.shake));const cam=Math.floor(s.camera);c.fillStyle="#f2a34d";c.fillRect(0,0,W,H);c.fillStyle="#c65f38";for(let i=0;i<9;i++){const x=((i*190-cam*.14)%1200)-150;c.beginPath();c.moveTo(x,310);c.lineTo(x+130,80+(i%3)*50);c.lineTo(x+300,310);c.fill()}c.fillStyle="#593427";for(let i=0;i<18;i++){const x=((i*110-cam*.38)%1150)-100;c.fillRect(x,275+(i%3)*18,85,160)}c.fillStyle="#5b4127";c.fillRect(0,GROUND,W,H-GROUND);c.fillStyle="#8f6636";for(let i=0;i<45;i++)c.fillRect(((i*97-cam)%1100)-70,GROUND+(i%4)*23,35,5);
  for(const st of s.structures){const x=st.x-cam;if(x<-200||x>W+100)continue;const stage=structureStage(st.hp,Math.abs(st.max));if(st.max<0){c.fillStyle="#49382b";c.fillRect(x,GROUND-12,st.w,12);continue}c.fillStyle=["#847052","#705b42","#574737"][stage];c.fillRect(x,st.y,st.w,st.h);c.strokeStyle="#30261d";c.lineWidth=5;c.strokeRect(x,st.y,st.w,st.h);for(let i=0;i<stage*4;i++){c.beginPath();c.moveTo(x+15+i*17,st.y+8);c.lineTo(x+30+i*13,st.y+st.h*.7);c.stroke()}}
  for(const p of s.pickups){const x=p.x-cam;c.fillStyle=p.kind==="heavy"?"#ffd340":"#e74420";c.fillRect(x-18,p.y-18,36,28);c.fillStyle="#15120d";c.font="bold 11px monospace";c.fillText(p.kind==="heavy"?"HMG":"R",x-12,p.y)}
  for(const e of s.enemies){const x=e.x-cam;if(e.kind==="boss"){c.fillStyle="#2c3332";c.fillRect(x-110,e.y,220,150);c.fillStyle="#56605b";c.fillRect(x-78,e.y-40,155,70);c.fillStyle="#171b1b";c.fillRect(x-150,e.y-20,150,25);for(let i=0;i<7;i++){c.fillStyle="#171717";c.beginPath();c.arc(x-85+i*29,e.y+145,18,0,7);c.fill()}continue}c.save();c.translate(x,e.y);if(e.dead)c.rotate(Math.min(1.5,e.dead*5));c.fillStyle=e.kind==="shield"?"#35443b":"#49543b";c.fillRect(-13,8,27,28);c.fillStyle="#d0a16b";c.fillRect(-9,-5,19,17);c.fillStyle="#2e3528";c.fillRect(-13,-10,27,8);c.fillStyle="#161819";c.fillRect(e.dead?0:8,17,28,7);if(e.dead){c.fillStyle="#f3dfb0";c.font="18px monospace";c.fillText("✦",-10,-18)}c.restore()}
  const px=s.player.x-cam;c.save();c.translate(px,s.player.y+(s.player.duck?17:0));c.fillStyle=s.player.vehicle?"#596239":"#b44723";if(s.player.vehicle){c.fillRect(-30,8,76,32);c.fillStyle="#1a1a16";c.beginPath();c.arc(-12,41,13,0,7);c.arc(31,41,13,0,7);c.fill()}else{c.fillRect(-11,10,24,s.player.duck?17:25);c.fillStyle="#d49a62";c.fillRect(-8,-7,18,18);c.fillStyle="#b51e16";c.fillRect(-13,-10,30,6);c.fillStyle="#343626";c.fillRect(-12,s.player.duck?26:34,9,s.player.duck?5:14);c.fillRect(7,s.player.duck?26:34,9,s.player.duck?5:14)}c.fillStyle="#171919";c.fillRect(8,15,s.player.weapon==="rocket"?39:31,8);c.restore();
  for(const b of s.shots){c.fillStyle=b.enemy?"#ff5540":"#fff09b";c.fillRect(b.x-cam,b.y,b.rocket?14:8,b.rocket?7:3)}for(const p of s.particles){c.globalAlpha=Math.max(0,p.life*2);c.fillStyle=p.color;c.fillRect(p.x-cam,p.y,p.size,p.size)}c.globalAlpha=1;
  c.fillStyle="rgba(8,8,6,.78)";c.fillRect(12,12,245,76);c.fillStyle="#fff4d0";c.font="bold 13px monospace";c.fillText(`${s.copy.hp} ${Math.ceil(s.player.hp)}  ${s.copy.grenade} ${s.player.grenades}`,24,35);c.fillStyle="#f6bf31";c.font="bold 22px monospace";c.fillText(`${s.player.weapon.toUpperCase()} ${Number.isFinite(s.player.ammo)?s.player.ammo:"∞"}`,24,65);c.fillStyle="#fff";c.textAlign="right";c.font="bold 18px monospace";c.fillText(`${s.player.score.toLocaleString()}  ×${s.player.kills}`,W-20,35);c.textAlign="left";
  if(s.bossHp<ENEMY_HEALTH.boss){c.fillStyle="#1d1713";c.fillRect(250,20,460,26);c.fillStyle="#d4351e";c.fillRect(255,25,450*Math.max(0,s.bossHp)/ENEMY_HEALTH.boss,16);c.fillStyle="#fff1c3";c.textAlign="center";c.font="bold 12px monospace";c.fillText(s.copy.boss,480,38);c.textAlign="left"}if(s.message){c.fillStyle="rgba(0,0,0,.75)";c.fillRect(235,220,490,70);c.fillStyle="#ffd23d";c.textAlign="center";c.font="bold 30px monospace";c.fillText(s.message,480,265);c.textAlign="left"}c.restore()}

function createAudio(){let ctx:AudioContext|null=null,beat=0,timer=0,muted=false;const tone=(f:number,d=.05,type:OscillatorType="square",gain=.07)=>{if(!ctx||muted)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,ctx.currentTime);g.gain.setValueAtTime(gain,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+d);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+d)};return{start(){ctx=new AudioContext();timer=window.setInterval(()=>{tone([55,55,82,65][beat++%4],.12,"sawtooth",.025)},180)},shot(w:TempestWeapon){tone(w==="rocket"?70:w==="heavy"?130:180,w==="rocket"?.18:.035,w==="rocket"?"sawtooth":"square",.08)},boom(){tone(45,.28,"sawtooth",.14)},jump(){tone(260,.06,"square",.03)},hurt(){tone(90,.12,"sawtooth",.08)},pickup(){tone(660,.08);setTimeout(()=>tone(990,.12),70)},alarm(){tone(110,.4,"sawtooth",.08)},setMuted(v:boolean){muted=v},stop(){clearInterval(timer);if(ctx&&ctx.state!=="closed")void ctx.close();ctx=null}}}
