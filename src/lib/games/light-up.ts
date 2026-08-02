import { evaluateAkari, type AkariSpec } from './logic-puzzles';

export const LIGHT_UP_SIZE=7;
export const LIGHT_UP_SPEC:AkariSpec=Array.from({length:7},()=>Array<number|null>(7).fill(null));
[[1,1,1],[1,5,2],[3,3,0],[5,1,1],[5,5,2]].forEach(([r,c,n])=>{LIGHT_UP_SPEC[r][c]=n;});
const SOLUTION=[[0,3],[1,4],[1,6],[2,1],[3,0],[4,5],[5,2],[6,5]].map(([r,c])=>r*7+c);
export type LightUpState={seed:number;bulbs:boolean[][];history:number[];moves:number;hints:number;won:boolean};
export function createLightUp(seed=0):LightUpState{return{seed,bulbs:Array.from({length:7},()=>Array(7).fill(false)),history:[],moves:0,hints:0,won:false};}
export function toggleLightUp(state:LightUpState,index:number):LightUpState{const r=Math.floor(index/7),c=index%7;if(state.won||index<0||index>=49||LIGHT_UP_SPEC[r][c]!==null)return state;const bulbs=state.bulbs.map(row=>[...row]);bulbs[r][c]=!bulbs[r][c];return{...state,bulbs,history:[...state.history,index],moves:state.moves+1,won:evaluateAkari(LIGHT_UP_SPEC,bulbs).solved};}
export function undoLightUp(state:LightUpState):LightUpState{if(!state.history.length||state.won)return state;const history=[...state.history],i=history.pop()!,bulbs=state.bulbs.map(row=>[...row]);bulbs[Math.floor(i/7)][i%7]=!bulbs[Math.floor(i/7)][i%7];return{...state,bulbs,history,moves:Math.max(0,state.moves-1),won:false};}
export function hintLightUp(state:LightUpState):LightUpState{if(state.won)return state;for(const i of SOLUTION)if(!state.bulbs[Math.floor(i/7)][i%7])return{...toggleLightUp(state,i),hints:state.hints+1};for(let i=0;i<49;i++)if(state.bulbs[Math.floor(i/7)][i%7]&&!SOLUTION.includes(i))return{...toggleLightUp(state,i),hints:state.hints+1};return state;}
export function serializeLightUp(state:LightUpState){return JSON.stringify({v:1,seed:state.seed,history:state.history});}
export function parseLightUp(raw:string|null):LightUpState|null{try{const x=JSON.parse(raw??'');if(x?.v!==1||!Number.isInteger(x.seed)||!Array.isArray(x.history)||x.history.some((i:unknown)=>!Number.isInteger(i)||Number(i)<0||Number(i)>=49))return null;return x.history.reduce((s:LightUpState,i:number)=>toggleLightUp(s,i),createLightUp(x.seed));}catch{return null;}}
