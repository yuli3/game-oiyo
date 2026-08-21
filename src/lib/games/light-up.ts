import { evaluateAkari, type AkariSpec } from './logic-puzzles';

export const LIGHT_UP_SIZE=7;
export const LIGHT_UP_SPEC:AkariSpec=Array.from({length:7},()=>Array<number|null>(7).fill(null));
[[1,1,1],[1,5,2],[3,3,0],[5,1,1],[5,5,2]].forEach(([r,c,n])=>{LIGHT_UP_SPEC[r][c]=n;});
export type LightUpState={seed:number;bulbs:boolean[][];history:number[];moves:number;hints:number;won:boolean};
export function createLightUp(seed=0):LightUpState{return{seed,bulbs:Array.from({length:7},()=>Array(7).fill(false)),history:[],moves:0,hints:0,won:false};}
export function toggleLightUp(state:LightUpState,index:number):LightUpState{const r=Math.floor(index/7),c=index%7;if(state.won||index<0||index>=49||LIGHT_UP_SPEC[r][c]!==null)return state;const bulbs=state.bulbs.map(row=>[...row]);bulbs[r][c]=!bulbs[r][c];return{...state,bulbs,history:[...state.history,index],moves:state.moves+1,won:evaluateAkari(LIGHT_UP_SPEC,bulbs).solved};}
export function undoLightUp(state:LightUpState):LightUpState{if(!state.history.length||state.won)return state;const history=[...state.history],i=history.pop()!,bulbs=state.bulbs.map(row=>[...row]);bulbs[Math.floor(i/7)][i%7]=!bulbs[Math.floor(i/7)][i%7];return{...state,bulbs,history,moves:Math.max(0,state.moves-1),won:false};}
export type LightUpHint={reason:'clue'|'conflict'|'dark';cells:number[]};
export function explainLightUpHint(state:LightUpState):LightUpHint{const ev=evaluateAkari(LIGHT_UP_SPEC,state.bulbs);for(let r=0;r<7;r++)for(let c=0;c<7;c++)if(ev.clueErrors[r][c])return{reason:'clue',cells:[r*7+c]};for(let r=0;r<7;r++)for(let c=0;c<7;c++)if(ev.bulbErrors[r][c])return{reason:'conflict',cells:[r*7+c]};for(let r=0;r<7;r++)for(let c=0;c<7;c++)if(LIGHT_UP_SPEC[r][c]===null&&!ev.lit[r][c])return{reason:'dark',cells:[r*7+c]};return{reason:'dark',cells:[]};}
export function hintLightUp(state:LightUpState):LightUpState{return state.won?state:{...state,hints:state.hints+1};}
export function serializeLightUp(state:LightUpState){return JSON.stringify({v:1,seed:state.seed,history:state.history});}
export function parseLightUp(raw:string|null):LightUpState|null{try{const x=JSON.parse(raw??'');if(x?.v!==1||!Number.isInteger(x.seed)||!Array.isArray(x.history)||x.history.some((i:unknown)=>!Number.isInteger(i)||Number(i)<0||Number(i)>=49))return null;return x.history.reduce((s:LightUpState,i:number)=>toggleLightUp(s,i),createLightUp(x.seed));}catch{return null;}}
