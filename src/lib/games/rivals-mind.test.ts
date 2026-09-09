import {describe,expect,it} from "vitest";
import {chooseRivalAction,createRivalsMind,playRivalsMindRound,readRivalHabit,rivalsMindFingerprint} from "./rivals-mind";

describe("rivals mind",()=>{
 it("is deterministic for the same seed and actions",()=>{const run=()=>["strike","strike","evade-left","guard","strike"].reduce((s,a)=>playRivalsMindRound(s,a as never),createRivalsMind(9));expect(rivalsMindFingerprint(run())).toBe(rivalsMindFingerprint(run()));});
 it("learns a repeated aggressive habit and guards",()=>{let s=createRivalsMind(1);s=playRivalsMindRound(s,"strike");s=playRivalsMindRound(s,"strike");expect(readRivalHabit(s.history).read).toBe("aggressive");expect(chooseRivalAction(s).action).toBe("guard");});
 it("publishes the evidence used for adaptation",()=>{let s=createRivalsMind(0);s=playRivalsMindRound(s,"evade-left");s=playRivalsMindRound(s,"evade-left");s=playRivalsMindRound(s,"guard");expect(s.history.at(-1)?.reason).toBe("evade-left:2/2");});
 it("ends after five rounds and ignores later input",()=>{let s=createRivalsMind(3);for(let i=0;i<5;i++)s=playRivalsMindRound(s,"guard");expect(s.phase).not.toBe("playing");expect(playRivalsMindRound(s,"strike")).toBe(s);});
});
