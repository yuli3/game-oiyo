export const RIVALS_MIND_RULESET="rivals-mind-v1";
export const RIVALS_MIND_MAX_ROUNDS=5;
export type DuelAction="strike"|"guard"|"evade-left"|"evade-right";
export type DuelPhase="playing"|"won"|"lost"|"draw";
export type DuelRead="opening"|"aggressive"|"defensive"|"left-biased"|"right-biased"|"balanced";
export type DuelRound=Readonly<{round:number;player:DuelAction;rival:DuelAction;playerDamage:number;rivalDamage:number;read:DuelRead;reason:string}>;
export type RivalsMindState=Readonly<{seed:number;round:number;playerHealth:number;rivalHealth:number;phase:DuelPhase;history:readonly DuelRound[]}>;

const ACTIONS:readonly DuelAction[]=["strike","guard","evade-left","evade-right"];
const COUNTER:Record<DuelAction,DuelAction>={strike:"guard",guard:"strike","evade-left":"evade-right","evade-right":"evade-left"};

export function createRivalsMind(seed:number):RivalsMindState{return {seed:Math.trunc(seed),round:0,playerHealth:5,rivalHealth:5,phase:"playing",history:[]};}

export function readRivalHabit(history:readonly DuelRound[]):{read:DuelRead;predicted:DuelAction;reason:string}{
 if(history.length===0)return {read:"opening",predicted:"strike",reason:"no-history"};
 const counts=Object.fromEntries(ACTIONS.map(a=>[a,history.filter(r=>r.player===a).length])) as Record<DuelAction,number>;
 const max=Math.max(...Object.values(counts)); const leaders=ACTIONS.filter(a=>counts[a]===max);
 if(leaders.length>1)return {read:"balanced",predicted:leaders[0]!,reason:`tie:${leaders.join("+")}`};
 const predicted=leaders[0]!;
 const read:DuelRead=predicted==="strike"?"aggressive":predicted==="guard"?"defensive":predicted==="evade-left"?"left-biased":"right-biased";
 return {read,predicted,reason:`${predicted}:${counts[predicted]}/${history.length}`};
}

function resolve(player:DuelAction,rival:DuelAction):{playerDamage:number;rivalDamage:number}{
 if(player===rival)return {playerDamage:0,rivalDamage:0};
 if(player==="strike"&&rival!=="guard")return {playerDamage:0,rivalDamage:2};
 if(rival==="strike"&&player!=="guard")return {playerDamage:2,rivalDamage:0};
 if(player==="guard"&&rival==="strike")return {playerDamage:0,rivalDamage:1};
 if(rival==="guard"&&player==="strike")return {playerDamage:1,rivalDamage:0};
 const playerWins=(player==="evade-left"&&rival==="evade-right")||(player==="evade-right"&&rival==="guard")||(player==="guard"&&rival==="evade-left");
 return playerWins?{playerDamage:0,rivalDamage:1}:{playerDamage:1,rivalDamage:0};
}

export function chooseRivalAction(state:RivalsMindState):{action:DuelAction;read:DuelRead;reason:string}{
 const habit=readRivalHabit(state.history);
 if(state.history.length<2){const action=ACTIONS[Math.abs(state.seed+state.round)%ACTIONS.length]!;return {action,read:habit.read,reason:"sampling"};}
 return {action:COUNTER[habit.predicted],read:habit.read,reason:habit.reason};
}

export function playRivalsMindRound(state:RivalsMindState,player:DuelAction):RivalsMindState{
 if(state.phase!=="playing")return state;
 const decision=chooseRivalAction(state);const damage=resolve(player,decision.action);const round=state.round+1;
 const playerHealth=Math.max(0,state.playerHealth-damage.playerDamage);const rivalHealth=Math.max(0,state.rivalHealth-damage.rivalDamage);
 const history=[...state.history,{round,player,rival:decision.action,...damage,read:decision.read,reason:decision.reason}];
 const over=round>=RIVALS_MIND_MAX_ROUNDS||playerHealth===0||rivalHealth===0;
 const phase:DuelPhase=!over?"playing":playerHealth>rivalHealth?"won":playerHealth<rivalHealth?"lost":"draw";
 return {...state,round,playerHealth,rivalHealth,phase,history};
}

export function rivalsMindFingerprint(state:RivalsMindState):string{return JSON.stringify({ruleset:RIVALS_MIND_RULESET,...state});}

