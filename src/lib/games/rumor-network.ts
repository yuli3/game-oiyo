export const RUMOR_RULESET = 'rumor-network-v1';
export type RumorEffect = 'source' | 'amplify' | 'omit' | 'twist' | 'relay' | 'target';
export type RumorMessage = readonly [number, number, number];
export type RumorState = Readonly<{seed:number; node:number; message:RumorMessage; corrections:number; phase:'playing'|'won'|'lost'; path:readonly number[]; log:readonly Readonly<{node:number; before:RumorMessage; after:RumorMessage; corrected:number|null}>[]}>;
export const RUMOR_LINKS: readonly (readonly number[])[] = [[1,2],[3,4],[4,5],[6],[6,7],[6],[7],[]];
export const ORIGINAL: RumorMessage = [0,0,0];
export function rumorEffects(seed:number):readonly RumorEffect[]{
  const rotation=Math.abs(Number.isFinite(seed)?Math.trunc(seed):0)%3;
  const kinds:readonly RumorEffect[]=['amplify','omit','twist'];
  return ['source',kinds[rotation]!,kinds[(rotation+1)%3]!,kinds[(rotation+2)%3]!,kinds[(rotation+1)%3]!,'relay','relay','target'];
}
export function createRumorNetwork(seed:number):RumorState{return {seed:Number.isFinite(seed)?Math.trunc(seed):0,node:0,message:ORIGINAL,corrections:2,phase:'playing',path:[0],log:[]};}
export function transmitRumor(state:RumorState,node:number):RumorState{
  if(state.phase!=='playing'||!RUMOR_LINKS[state.node]?.includes(node))return state;
  const message:[number,number,number]=[...state.message];
  const effect=rumorEffects(state.seed)[node];
  if(effect==='amplify')message[0]=Math.min(2,message[0]+1);
  if(effect==='omit')message[2]=1;
  if(effect==='twist')message[1]=1-message[1];
  const phase=node===7?(message.every(v=>v===0)?'won':'lost'):'playing';
  return {...state,node,message,phase,path:[...state.path,node],log:[...state.log,{node,before:state.message,after:message,corrected:null}]};
}
export function correctRumor(state:RumorState,field:number):RumorState{
  if(state.phase!=='playing'||state.corrections===0||!Number.isInteger(field)||field<0||field>2||state.message[field]===0)return state;
  const message:[number,number,number]=[...state.message];message[field]=0;
  return {...state,message,corrections:state.corrections-1,log:[...state.log,{node:state.node,before:state.message,after:message,corrected:field}]};
}
export function rumorScore(state:RumorState):number{return state.phase==='won'?100-(state.path.length-1)*5-(2-state.corrections)*10:0;}
