import{describe,expect,it}from'vitest';import{chargeJump,createJumpState,jumpHeight,parseJump,platformAt,releaseJump,serializeJump,stepJump}from'./dot-jumpking';
describe('dot jump king engine',()=>{
 it('generates deterministic reachable-width platforms',()=>{expect(platformAt(7,4)).toEqual(platformAt(7,4));expect(platformAt(7,4).x).toBeGreaterThanOrEqual(0);expect(platformAt(7,4).x).toBeLessThanOrEqual(310);});
 it('replays the same tower from the same seed',()=>{expect(createJumpState(11)).toEqual(createJumpState(11));expect(createJumpState(11).seed).not.toBe(createJumpState(12).seed);});
 it('charges, releases and advances immutable physics',()=>{const a=createJumpState(1),b=chargeJump(a,50,300),c=releaseJump(b),d=stepJump(c);expect(a.charge).toBe(0);expect(c.vy).toBeLessThan(0);expect(d.y).toBeLessThan(c.y);});
 it('tracks climb and rejects malformed saves',()=>{let s=releaseJump(chargeJump(createJumpState(2),100,200));for(let i=0;i<20;i++)s=stepJump(s);expect(jumpHeight(s)).toBeGreaterThan(0);const raw=serializeJump(s);expect(parseJump(raw)?.seed).toBe(2);expect(parseJump(JSON.stringify({...JSON.parse(raw),x:900}))).toBeNull();});
});
