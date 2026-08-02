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
export function hintHitori(state: HitoriState): HitoriState {
  if (state.won) return state; const solution=hitoriSolution(state.seed);
  for(let i=0;i<25;i++){const r=Math.floor(i/5),c=i%5;if(state.dark[r][c]!==solution[r][c]) return {...toggleHitori(state,i),hints:state.hints+1};}
  return state;
}
export function serializeHitori(state:HitoriState){return JSON.stringify({v:1,seed:state.seed,history:state.history});}
export function parseHitori(raw:string|null):HitoriState|null{try{const x=JSON.parse(raw??'');if(x?.v!==1||!Number.isInteger(x.seed)||!Array.isArray(x.history)||x.history.some((i:unknown)=>!Number.isInteger(i)||Number(i)<0||Number(i)>=25))return null;return x.history.reduce((s:HitoriState,i:number)=>toggleHitori(s,i),createHitori(x.seed));}catch{return null;}}
