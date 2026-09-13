import {describe,it,expect} from 'vitest';
import {createEchoShift,advanceEchoShift,echoWall,echoVisible,ECHO_MAX_TURNS,type EchoState,type EchoAction} from './echo-shift';
const run=(s:EchoState,action:EchoAction,n:number)=>{for(let i=0;i<n;i++)s=advanceEchoShift(s,action);return s;};
describe('echo shift',()=>{
 it('uses distinct reveal and detection ranges',()=>{const s=createEchoShift(0),soft=advanceEchoShift(s,'soft'),loud=advanceEchoShift(s,'loud');expect(soft.alert).toBe(0);expect(loud.alert).toBe(7);expect(soft.reveal.length).toBeLessThan(loud.reveal.length);expect(echoVisible(loud,{x:9,y:1})).toBe(true);expect(echoVisible(soft,{x:9,y:1})).toBe(false);});
 it('forgets remote geometry after the pulse expires',()=>{let s=advanceEchoShift(createEchoShift(0),'soft');expect(echoVisible(s,{x:1,y:4})).toBe(true);s=run(s,'wait',3);expect(echoVisible(s,{x:1,y:4})).toBe(false);});
 it('blocks walls while still spending a turn',()=>{const s=advanceEchoShift(createEchoShift(0),'left');expect(s.player).toEqual({x:1,y:7});expect(s.turn).toBe(1);expect(echoWall({x:NaN,y:1})).toBe(true);});
 it('can recover the relic and return for every patrol phase',()=>{for(let seed=0;seed<6;seed++){let s=advanceEchoShift(createEchoShift(seed),'soft');s=run(s,'right',8);s=run(s,'up',6);expect(s.carrying).toBe(true);s=run(s,'down',6);expect(s.phase,`seed ${seed}`).toBe('escaped');expect(advanceEchoShift(s,'loud')).toBe(s);}});
 it('makes repeated loud pulses dangerous',()=>{const s=run(createEchoShift(0),'loud',20);expect(s.phase).toBe('caught');});
 it('cannot walk through the hunter during a position swap',()=>{const s:EchoState={...createEchoShift(0),player:{x:5,y:5},hunter:{x:6,y:5},heard:{x:5,y:5},alert:3};expect(advanceEchoShift(s,'right').phase).toBe('caught');});
 it('ends idle runs and normalizes invalid seeds',()=>{expect(run(createEchoShift(0),'wait',ECHO_MAX_TURNS).phase).toBe('expired');expect(createEchoShift(NaN)).toEqual(createEchoShift(0));});
});
