import {describe,expect,it} from "vitest";
import {chooseRivalAction,createRivalsMind,playRivalsMindRound,readRivalHabit,rivalsMindFingerprint} from "./rivals-mind";

describe("rivals mind",()=>{
 it.each(["strike","guard","evade-left","evade-right"] as const)("punishes a learned repeated %s instead of countering itself",action=>{
  let state=createRivalsMind(2);
  state=playRivalsMindRound(state,action);state=playRivalsMindRound(state,action);
  const next=playRivalsMindRound(state,action),round=next.history.at(-1)!;
  expect(round.playerDamage).toBeGreaterThan(round.rivalDamage);
 });
 it("decides using previous rounds rather than the current input",()=>{
  let state=createRivalsMind(1);state=playRivalsMindRound(state,"strike");state=playRivalsMindRound(state,"strike");
  expect(playRivalsMindRound(state,"strike").history.at(-1)?.rival).toBe(playRivalsMindRound(state,"evade-right").history.at(-1)?.rival);
 });
 it("is deterministic for the same seed and actions",()=>{const run=()=>["strike","strike","evade-left","guard","strike"].reduce((s,a)=>playRivalsMindRound(s,a as never),createRivalsMind(9));expect(rivalsMindFingerprint(run())).toBe(rivalsMindFingerprint(run()));});
 it("learns a repeated aggressive habit and guards",()=>{let s=createRivalsMind(1);s=playRivalsMindRound(s,"strike");s=playRivalsMindRound(s,"strike");expect(readRivalHabit(s.history).read).toBe("aggressive");expect(chooseRivalAction(s).action).toBe("guard");});
 it("publishes the evidence used for adaptation",()=>{let s=createRivalsMind(0);s=playRivalsMindRound(s,"evade-left");s=playRivalsMindRound(s,"evade-left");s=playRivalsMindRound(s,"guard");expect(s.history.at(-1)?.reason).toBe("evade-left:2/2");});
 it("ends after five rounds and ignores later input",()=>{let s=createRivalsMind(3);for(let i=0;i<5;i++)s=playRivalsMindRound(s,"guard");expect(s.phase).not.toBe("playing");expect(playRivalsMindRound(s,"strike")).toBe(s);});
});
