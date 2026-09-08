import { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  TIME_LOOP_MAX_LOOPS,
  TIME_LOOP_ROOM,
  TIME_LOOP_STEP_SECONDS,
  TIME_LOOP_TICKS,
  advanceTimeLoop,
  createTimeLoopMission,
  isTimeLoopPlateHeld,
  timeLoopFingerprint,
  timeLoopGhosts,
  type TimeLoopInput,
  type TimeLoopMission,
} from "../../lib/games/time-loop-rescue";

type Status = "idle" | "playing" | "paused";
type Direction = "up" | "down" | "left" | "right";

const COPY = {
  ko: { title:"타임루프 구조대", subtitle:"과거의 나와 협동해 격리 구역의 대원을 구하세요", start:"구조 시작", record:"현재 루프 기록", reset:"처음부터", pause:"일시정지", resume:"계속하기", mute:"소리 끄기", unmute:"소리 켜기", loop:"루프", time:"남은 시간", echoes:"잔상", mission:"임무", idle:"대기", search:"구조 중", carry:"탈출 중", won:"구조 성공", failed:"시간 종료", hint:"방향키·WASD 또는 아래 패드로 이동 · 잔상이 스위치를 밟으면 문이 열립니다", first:"먼저 왼쪽 위 스위치에 서서 현재 루프를 기록하세요.", echo:"보라색 잔상이 스위치에 도착할 때 중앙 문을 통과하세요.", extract:"구조 대원과 접촉했습니다. 오른쪽 아래 출구로 이동하세요.", success:"과거의 나와 협동해 구조했습니다.", retry:"동선을 줄여 다시 시도하세요.", area:"타임루프 구조대 플레이 영역" },
  en: { title:"Time Loop Rescue", subtitle:"Cooperate with your past self to rescue a trapped teammate", start:"Start rescue", record:"Record this loop", reset:"Start over", pause:"Pause", resume:"Resume", mute:"Mute", unmute:"Sound on", loop:"Loop", time:"Time left", echoes:"Echoes", mission:"Mission", idle:"Ready", search:"Rescuing", carry:"Extracting", won:"Rescue complete", failed:"Time expired", hint:"Move with arrow keys, WASD, or the pad · the door opens while an echo holds the switch", first:"Stand on the upper-left switch, then record this loop.", echo:"Cross the center door when the violet echo reaches the switch.", extract:"Teammate secured. Reach the lower-right exit.", success:"You coordinated with your past self and completed the rescue.", retry:"Tighten the route and try again.", area:"Time Loop Rescue play area" },
  ja: { title:"タイムループ・レスキュー", subtitle:"過去の自分と協力して隔離区画の仲間を救出しよう", start:"救出開始", record:"このループを記録", reset:"最初から", pause:"一時停止", resume:"再開", mute:"消音", unmute:"音を出す", loop:"ループ", time:"残り時間", echoes:"残像", mission:"任務", idle:"待機", search:"救出中", carry:"脱出中", won:"救出成功", failed:"時間切れ", hint:"矢印・WASD・パッドで移動 · 残像がスイッチを踏むと扉が開きます", first:"左上のスイッチに立ち、このループを記録してください。", echo:"紫の残像がスイッチに着いた時に中央の扉を通過してください。", extract:"仲間を確保しました。右下の出口へ向かってください。", success:"過去の自分と協力して救出しました。", retry:"経路を短くして再挑戦してください。", area:"タイムループ・レスキューのプレイエリア" },
  zh: { title:"时光回环救援队", subtitle:"与过去的自己协作，救出隔离区的队友", start:"开始救援", record:"记录本轮", reset:"重新开始", pause:"暂停", resume:"继续", mute:"静音", unmute:"开启声音", loop:"轮回", time:"剩余时间", echoes:"残影", mission:"任务", idle:"待命", search:"救援中", carry:"撤离中", won:"救援成功", failed:"时间结束", hint:"使用方向键、WASD或触控板移动 · 残影踩住开关时门会打开", first:"先站到左上方的开关上，然后记录本轮。", echo:"紫色残影到达开关时，穿过中央隔离门。", extract:"已接到队友，请前往右下方出口。", success:"你与过去的自己协作完成了救援。", retry:"缩短路线，再试一次。", area:"时光回环救援队游戏区域" },
  fr: { title:"Sauvetage temporel", subtitle:"Coopérez avec votre double passé pour sauver un équipier", start:"Lancer le sauvetage", record:"Enregistrer cette boucle", reset:"Recommencer", pause:"Pause", resume:"Reprendre", mute:"Couper le son", unmute:"Activer le son", loop:"Boucle", time:"Temps restant", echoes:"Échos", mission:"Mission", idle:"Prêt", search:"Sauvetage", carry:"Extraction", won:"Sauvetage réussi", failed:"Temps écoulé", hint:"Flèches, WASD ou pavé tactile · la porte s'ouvre quand un écho maintient l'interrupteur", first:"Placez-vous sur l'interrupteur en haut à gauche, puis enregistrez la boucle.", echo:"Franchissez la porte centrale quand l'écho violet atteint l'interrupteur.", extract:"Équipier sécurisé. Rejoignez la sortie en bas à droite.", success:"Vous avez coopéré avec votre double passé pour réussir le sauvetage.", retry:"Raccourcissez votre trajet et réessayez.", area:"Zone de jeu Sauvetage temporel" },
  es: { title:"Rescate temporal", subtitle:"Coopera con tu yo del pasado para rescatar a un compañero", start:"Iniciar rescate", record:"Grabar este bucle", reset:"Empezar de nuevo", pause:"Pausa", resume:"Continuar", mute:"Silenciar", unmute:"Activar sonido", loop:"Bucle", time:"Tiempo restante", echoes:"Ecos", mission:"Misión", idle:"Listo", search:"Rescatando", carry:"Evacuando", won:"Rescate completo", failed:"Tiempo agotado", hint:"Muévete con flechas, WASD o el panel · la puerta se abre cuando un eco pisa el interruptor", first:"Ponte sobre el interruptor superior izquierdo y graba este bucle.", echo:"Cruza la puerta central cuando el eco violeta llegue al interruptor.", extract:"Compañero asegurado. Llega a la salida inferior derecha.", success:"Cooperaste con tu yo del pasado y completaste el rescate.", retry:"Acorta la ruta e inténtalo de nuevo.", area:"Área de juego de Rescate temporal" },
} as const;

const SCALE = 1_000;
const px = (value: number) => value / SCALE;

export default function TimeLoopRescue({ locale = "ko" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const missionRef = useRef<TimeLoopMission>(createTimeLoopMission());
  const inputRef = useRef<Record<Direction, boolean>>({ up:false, down:false, left:false, right:false });
  const statusRef = useRef<Status>("idle");
  const mutedRef = useRef(false);
  const lastDoorRef = useRef(false);
  const frameRef = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [mission, setMission] = useState<TimeLoopMission>(missionRef.current);
  const [muted, setMuted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const tone = useCallback((kind: "record" | "door" | "rescue" | "win") => {
    if (mutedRef.current || typeof window === "undefined") return;
    const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "door" ? "square" : "sine";
    const frequency = kind === "record" ? 330 : kind === "door" ? 180 : kind === "rescue" ? 620 : 880;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (kind === "win") oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + .24);
    gain.gain.setValueAtTime(.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .26);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .27);
    oscillator.addEventListener("ended", () => void context.close(), { once:true });
  }, []);

  const publish = useCallback((next: TimeLoopMission) => {
    missionRef.current = next;
    setMission(next);
  }, []);

  const reset = useCallback(() => {
    const next = createTimeLoopMission();
    publish(next); statusRef.current = "idle"; setStatus("idle"); lastDoorRef.current = false;
  }, [publish]);

  const start = useCallback(() => {
    statusRef.current = "playing"; setStatus("playing"); canvasRef.current?.focus();
  }, []);

  const commit = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const previous = missionRef.current;
    const next = advanceTimeLoop(previous, { type:"commit-loop" });
    if (next !== previous) { publish(next); tone("record"); }
  }, [publish, tone]);

  useEffect(() => {
    let active = true;
    let previous = performance.now();
    let accumulator = 0;
    const run = (now: number) => {
      if (!active) return;
      const elapsed = Math.min(.1, Math.max(0, now - previous) / 1_000);
      previous = now;
      if (statusRef.current === "playing") {
        accumulator += elapsed;
        while (accumulator >= TIME_LOOP_STEP_SECONDS) {
          const held = inputRef.current;
          const input: TimeLoopInput = {
            x: held.right ? 1 : held.left ? -1 : 0,
            y: held.down ? 1 : held.up ? -1 : 0,
          };
          const before = missionRef.current;
          const next = advanceTimeLoop(before, { type:"tick", input });
          missionRef.current = next;
          const doorOpen = isTimeLoopPlateHeld(next);
          if (doorOpen && !lastDoorRef.current) tone("door");
          if (next.carrying && !before.carrying) tone("rescue");
          if (next.phase === "rescued" && before.phase !== "rescued") tone("win");
          lastDoorRef.current = doorOpen;
          setMission(next);
          accumulator -= TIME_LOOP_STEP_SECONDS;
        }
      }
      frameRef.current = requestAnimationFrame(run);
    };
    frameRef.current = requestAnimationFrame(run);
    const visibility = () => {
      if (document.hidden && statusRef.current === "playing") { statusRef.current = "paused"; setStatus("paused"); }
      previous = performance.now(); accumulator = 0;
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; cancelAnimationFrame(frameRef.current); document.removeEventListener("visibilitychange", visibility); };
  }, [tone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ghosts = timeLoopGhosts(mission);
    const doorOpen = isTimeLoopPlateHeld(mission);
    context.clearRect(0, 0, 960, 540);
    context.fillStyle = "#071521"; context.fillRect(0, 0, 960, 540);
    context.strokeStyle = "#173149"; context.lineWidth = 1;
    for (let x=0;x<=960;x+=60){ context.beginPath(); context.moveTo(x,0); context.lineTo(x,540); context.stroke(); }
    for (let y=0;y<=540;y+=60){ context.beginPath(); context.moveTo(0,y); context.lineTo(960,y); context.stroke(); }
    const door=TIME_LOOP_ROOM.door;
    context.fillStyle="#203a51"; context.fillRect(px(door.x),0,px(door.width),px(door.y)); context.fillRect(px(door.x),px(door.y+door.height),px(door.width),540-px(door.y+door.height));
    context.fillStyle=doorOpen?"#147a6b":"#b33b52"; context.fillRect(px(door.x),px(door.y),px(door.width),px(door.height));
    const plate=TIME_LOOP_ROOM.plate; context.beginPath(); context.arc(px(plate.x),px(plate.y),px(plate.radius),0,Math.PI*2); context.fillStyle=doorOpen?"#ffd166":"#6f5c21"; context.fill(); context.strokeStyle="#ffe39a";context.lineWidth=4;context.stroke();
    const exit=TIME_LOOP_ROOM.exit; context.fillStyle="#0d493f";context.fillRect(px(exit.x),px(exit.y),76,62);context.strokeStyle="#55ead4";context.lineWidth=3;context.strokeRect(px(exit.x),px(exit.y),76,62);
    const rescue=TIME_LOOP_ROOM.rescue;
    const actor=(point:{x:number;y:number},fill:string,label:string,alpha=1)=>{context.save();context.globalAlpha=alpha;context.beginPath();context.arc(px(point.x),px(point.y),17,0,Math.PI*2);context.fillStyle=fill;context.fill();context.fillStyle="#061019";context.font="900 15px system-ui";context.textAlign="center";context.textBaseline="middle";context.fillText(label,px(point.x),px(point.y)+1);context.restore();};
    if (!mission.carrying) actor(rescue,"#ffd166","!");
    ghosts.forEach((ghost,index)=>actor(ghost,"#b3a3ff",String(index+1),reducedMotion?.82:.68));
    actor(mission.player,"#55ead4",mission.carrying?"2":"◆");
  }, [mission, reducedMotion]);

  useEffect(() => {
    const map: Record<string, Direction> = { ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right" };
    const down=(event:KeyboardEvent)=>{const direction=map[event.key];if(direction){event.preventDefault();inputRef.current[direction]=true;}if(event.key==="r"||event.key==="R")commit();if(event.key==="p"||event.key==="P"){statusRef.current=statusRef.current==="playing"?"paused":"playing";setStatus(statusRef.current);}};
    const up=(event:KeyboardEvent)=>{const direction=map[event.key];if(direction)inputRef.current[direction]=false;};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  }, [commit]);

  const setDirection = (direction: Direction, pressed: boolean) => { inputRef.current[direction] = pressed; };
  const remaining = Math.max(0, (TIME_LOOP_TICKS - mission.tick) * TIME_LOOP_STEP_SECONDS);
  const label = mission.phase === "rescued" ? t.won : mission.phase === "failed" ? t.failed : mission.carrying ? t.carry : status === "idle" ? t.idle : t.search;
  const message = mission.phase === "rescued" ? t.success : mission.phase === "failed" ? t.retry : mission.carrying ? t.extract : mission.recordings.length ? t.echo : t.first;

  return <GameContainer title={t.title} subtitle={t.subtitle}>
    <div className="space-y-4 selection:bg-teal-300 selection:text-teal-950">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t.mission}>
        {[[t.loop,`${mission.loop} / ${TIME_LOOP_MAX_LOOPS}`],[t.time,`${remaining.toFixed(1)}s`],[t.echoes,String(mission.recordings.length)],[t.mission,label]].map(([name,value])=><div key={name} className="rounded-xl bg-slate-950 px-3 py-2 text-center shadow-[0_8px_24px_rgba(2,8,23,.24)]"><strong className="block tabular-nums text-lg text-white">{value}</strong><span className="text-[11px] font-bold text-slate-300">{name}</span></div>)}
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-[0_18px_50px_rgba(2,8,23,.32)]">
        <canvas ref={canvasRef} width={960} height={540} tabIndex={0} aria-label={t.area} className="block aspect-video w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300" />
        {status === "idle" && <button type="button" onClick={start} className="absolute inset-0 m-auto h-14 w-fit rounded-xl bg-teal-300 px-8 font-black text-teal-950 shadow-[0_12px_32px_rgba(45,212,191,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{t.start}</button>}
      </div>
      <p className="min-h-12 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100" aria-live="polite">{message}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={commit} disabled={status!=="playing"||mission.currentRecording.length===0||mission.phase!=="playing"} className="min-h-11 flex-1 rounded-xl bg-teal-300 px-4 font-black text-teal-950 disabled:cursor-not-allowed disabled:opacity-40">{t.record}</button>
        <button type="button" onClick={()=>{const next=statusRef.current==="playing"?"paused":"playing";statusRef.current=next;setStatus(next);}} disabled={status==="idle"||mission.phase!=="playing"} className="min-h-11 rounded-xl bg-slate-800 px-4 font-bold text-white disabled:opacity-40">{status==="paused"?t.resume:t.pause}</button>
        <button type="button" onClick={()=>{mutedRef.current=!mutedRef.current;setMuted(mutedRef.current);}} className="min-h-11 rounded-xl bg-slate-800 px-4 font-bold text-white">{muted?t.unmute:t.mute}</button>
        <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-slate-800 px-4 font-bold text-white">{t.reset}</button>
      </div>
      <div className="mx-auto grid w-fit grid-cols-3 gap-2 sm:hidden" aria-label={t.hint}>
        <span/><DirectionButton label="▲" direction="up" setDirection={setDirection}/><span/>
        <DirectionButton label="◀" direction="left" setDirection={setDirection}/><DirectionButton label="▼" direction="down" setDirection={setDirection}/><DirectionButton label="▶" direction="right" setDirection={setDirection}/>
      </div>
      <p className="text-center text-xs font-medium text-muted-foreground">{t.hint}</p>
      <details className="rounded-xl bg-muted px-4 py-3 text-xs"><summary className="cursor-pointer font-bold">Replay fingerprint</summary><code className="mt-2 block break-all text-muted-foreground">{timeLoopFingerprint(mission)}</code></details>
    </div>
  </GameContainer>;
}

function DirectionButton({ label, direction, setDirection }: { label:string; direction:Direction; setDirection:(direction:Direction,pressed:boolean)=>void }) {
  return <button type="button" aria-label={direction} onPointerDown={(event)=>{event.currentTarget.setPointerCapture(event.pointerId);setDirection(direction,true);}} onPointerUp={()=>setDirection(direction,false)} onPointerCancel={()=>setDirection(direction,false)} onPointerLeave={()=>setDirection(direction,false)} className="h-14 w-14 rounded-xl bg-slate-800 text-lg font-black text-white shadow-[0_7px_18px_rgba(2,8,23,.26)] active:translate-y-px active:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">{label}</button>;
}
