export const ECHO_RULESET='echo-shift-v1';
export const ECHO_WIDTH=11, ECHO_HEIGHT=9, ECHO_MAX_TURNS=80;
export type EchoPoint=Readonly<{x:number;y:number}>;
export type EchoAction='up'|'down'|'left'|'right'|'wait'|'soft'|'loud';
export type EchoState=Readonly<{seed:number;turn:number;player:EchoPoint;hunter:EchoPoint;phase:'playing'|'escaped'|'caught'|'expired';carrying:boolean;alert:number;heard:EchoPoint|null;reveal:readonly string[];revealUntil:number;pulses:number;lastPulse:'soft'|'loud'|null;echo:Readonly<{dx:number;dy:number;distance:number}>|null}>;
export const ECHO_START:EchoPoint={x:1,y:7},ECHO_RELIC:EchoPoint={x:9,y:1},ECHO_EXIT:EchoPoint={x:9,y:7};
const PARTITIONS=new Set(['4,1','4,2','4,4','4,5','4,6','7,2','7,3','7,4']);
const PATROL:readonly EchoPoint[]=[{x:5,y:3},{x:6,y:3},{x:6,y:4},{x:6,y:5},{x:5,y:5},{x:5,y:4}];
const DELTA:Record<string,EchoPoint>={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
export function echoWall(p:EchoPoint):boolean{return !Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<=0||p.y<=0||p.x>=ECHO_WIDTH-1||p.y>=ECHO_HEIGHT-1||PARTITIONS.has(`${p.x},${p.y}`);}
const same=(a:EchoPoint,b:EchoPoint)=>a.x===b.x&&a.y===b.y;
const distance=(a:EchoPoint,b:EchoPoint)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function createEchoShift(seed:number):EchoState{seed=Number.isFinite(seed)?Math.abs(Math.trunc(seed)):0;return {seed,turn:0,player:ECHO_START,hunter:PATROL[seed%PATROL.length]!,phase:'playing',carrying:false,alert:0,heard:null,reveal:[],revealUntil:0,pulses:0,lastPulse:null,echo:null};}
function pursuit(from:EchoPoint,to:EchoPoint):EchoPoint{
 const queue:{point:EchoPoint;first:EchoPoint}[]=[],seen=new Set([`${from.x},${from.y}`]);
 if(same(from,to))return from;
 for(const d of Object.values(DELTA)){const p={x:from.x+d.x,y:from.y+d.y};if(!echoWall(p))queue.push({point:p,first:p});}
 for(let i=0;i<queue.length;i++){const {point,first}=queue[i]!,key=`${point.x},${point.y}`;if(seen.has(key))continue;seen.add(key);if(same(point,to))return first;for(const d of Object.values(DELTA)){const p={x:point.x+d.x,y:point.y+d.y};if(!echoWall(p)&&!seen.has(`${p.x},${p.y}`))queue.push({point:p,first});}}
 return from;
}
export function echoVisible(state:EchoState,p:EchoPoint):boolean{return same(p,state.player)||distance(p,state.player)<=1||(state.turn<=state.revealUntil&&state.reveal.includes(`${p.x},${p.y}`));}
export function advanceEchoShift(state:EchoState,action:EchoAction):EchoState{
 if(state.phase!=='playing'||!['up','down','left','right','wait','soft','loud'].includes(action))return state;
 const turn=state.turn+1,delta=DELTA[action];let player=state.player;
 if(delta){const p={x:player.x+delta.x,y:player.y+delta.y};if(!echoWall(p))player=p;}
 const pulse=action==='soft'||action==='loud';
 let heard=state.heard,alert=Math.max(0,state.alert-1);
 if(pulse&&(action==='loud'||distance(state.hunter,player)<=3)){heard=player;alert=action==='loud'?7:3;}
 let hunter=state.hunter;
 if(alert&&heard)hunter=pursuit(hunter,heard);
 else {const target=PATROL[(state.seed+turn)%PATROL.length]!;hunter=pursuit(hunter,target);heard=null;}
 const carrying=state.carrying||same(player,ECHO_RELIC);
 const caught=same(player,state.hunter)||same(player,hunter);
 const phase=caught?'caught':carrying&&same(player,ECHO_EXIT)?'escaped':turn>=ECHO_MAX_TURNS?'expired':'playing';
 const reveal:string[]=[];
 if(pulse)for(let y=0;y<ECHO_HEIGHT;y++)for(let x=0;x<ECHO_WIDTH;x++)if(action==='loud'||distance({x,y},player)<=3)reveal.push(`${x},${y}`);
 return {...state,turn,player,hunter,carrying,phase,heard,alert,pulses:state.pulses+(pulse?1:0),lastPulse:pulse?action:state.lastPulse,reveal:pulse?reveal:state.reveal,revealUntil:pulse?turn+(action==='loud'?3:2):state.revealUntil,echo:pulse?{dx:hunter.x-player.x,dy:hunter.y-player.y,distance:distance(hunter,player)}:state.echo};
}
