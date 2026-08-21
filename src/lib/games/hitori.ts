import { validateHitori } from './logic-puzzles';

export const HITORI_SIZE = 5;
const BASE_VALUES = [[2,2,1,5,3],[2,3,1,4,5],[1,1,1,3,5],[1,3,5,4,2],[5,4,3,2,1]];
const BASE_SOLUTION = [[true,false,true,false,false],[false,false,false,false,true],[true,false,true,false,false],[false,true,false,true,false],[false,false,false,false,false]];

export type HitoriState = { seed: number; values: number[][]; dark: boolean[][]; history: number[]; moves: number; hints: number; won: boolean };
const rotate = <T,>(grid: T[][]) => grid[0].map((_, x) => grid.map(row => row[x]).reverse());
const transform = <T,>(grid: T[][], turns: number) => { let next = grid.map(row => [...row]); for (let i=0;i<turns;i++) next=rotate(next); return next; };

export function createHitori(seed = 0): HitoriState {
  const turns = Math.abs(seed) % 4;
  return { seed, values: transform(BASE_VALUES, turns), dark: Array.from({length:HITORI_SIZE},()=>Array(HITORI_SIZE).fill(false)), history: [], moves: 0, hints: 0, won: false };
}
export function hitoriSolution(seed: number) { return transform(BASE_SOLUTION, Math.abs(seed) % 4); }
export function toggleHitori(state: HitoriState, index: number): HitoriState {
  if (state.won || index < 0 || index >= 25) return state;
  const dark = state.dark.map(row => [...row]); dark[Math.floor(index/5)][index%5] = !dark[Math.floor(index/5)][index%5];
  return { ...state, dark, history: [...state.history, index], moves: state.moves + 1, won: validateHitori(state.values, dark).valid };
}
export function undoHitori(state: HitoriState): HitoriState {
  if (!state.history.length || state.won) return state;
  const history=[...state.history], index=history.pop()!, dark=state.dark.map(row=>[...row]); dark[Math.floor(index/5)][index%5]=!dark[Math.floor(index/5)][index%5];
  return {...state,dark,history,moves:Math.max(0,state.moves-1),won:false};
}
export type HitoriHint = { reason:'duplicate'|'adjacent'|'connected'; cells:number[] };
export function explainHitoriHint(state:HitoriState):HitoriHint{
  const size=HITORI_SIZE;
  for(let r=0;r<size;r++)for(let a=0;a<size;a++)if(!state.dark[r][a])for(let b=a+1;b<size;b++)if(!state.dark[r][b]&&state.values[r][a]===state.values[r][b])return{reason:'duplicate',cells:[r*size+a,r*size+b]};
  for(let c=0;c<size;c++)for(let a=0;a<size;a++)if(!state.dark[a][c])for(let b=a+1;b<size;b++)if(!state.dark[b][c]&&state.values[a][c]===state.values[b][c])return{reason:'duplicate',cells:[a*size+c,b*size+c]};
  for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(state.dark[r][c])for(const[dr,dc]of[[1,0],[0,1]])if(state.dark[r+dr]?.[c+dc])return{reason:'adjacent',cells:[r*size+c,(r+dr)*size+c+dc]};
  return{reason:'connected',cells:[]};
}
export function hintHitori(state: HitoriState): HitoriState {
  return state.won ? state : {...state,hints:state.hints+1};
}
export function serializeHitori(state:HitoriState){return JSON.stringify({v:1,seed:state.seed,history:state.history});}
export function parseHitori(raw:string|null):HitoriState|null{try{const x=JSON.parse(raw??'');if(x?.v!==1||!Number.isInteger(x.seed)||!Array.isArray(x.history)||x.history.some((i:unknown)=>!Number.isInteger(i)||Number(i)<0||Number(i)>=25))return null;return x.history.reduce((s:HitoriState,i:number)=>toggleHitori(s,i),createHitori(x.seed));}catch{return null;}}
