import{describe,expect,it}from"vitest";import{SHADOW_SOLUTIONS,createShadowArchitect,isShadowComplete,selectShadowBlock,shadowArchitectFingerprint,shadowMatch,shadowCells,solveShadowArchitect,targetShadow,transformShadowBlock}from"./shadow-architect";
describe("shadow architect",()=>{
 it("ships ten distinct target silhouettes",()=>{const targets=SHADOW_SOLUTIONS.map((_,i)=>targetShadow(i).join("|"));expect(new Set(targets).size).toBe(10);});
 it("every target has a certified five-block solution",()=>{for(let i=0;i<10;i++){const solved=solveShadowArchitect(createShadowArchitect(i));expect(isShadowComplete(solved)).toBe(true);expect(shadowCells(solved.poses)).toEqual(targetShadow(i));}});
 it("starts unsolved and reports a bounded match",()=>{for(let i=0;i<10;i++){const state=createShadowArchitect(i),match=shadowMatch(state);expect(isShadowComplete(state)).toBe(false);expect(match.percent).toBeGreaterThanOrEqual(0);expect(match.percent).toBeLessThanOrEqual(100);}});
 it("moves only the selected block and counts the action",()=>{const state=selectShadowBlock(createShadowArchitect(0),2);const next=transformShadowBlock(state,{x:-1,z:1,rotate:1});expect(next.poses[0]).toEqual(state.poses[0]);expect(next.poses[2]).not.toEqual(state.poses[2]);expect(next.moves).toBe(1);});
 it("clamps construction inside the editor bounds",()=>{let state=selectShadowBlock(createShadowArchitect(0),0);for(let i=0;i<20;i++)state=transformShadowBlock(state,{x:-1,y:-1,z:-1});expect(state.poses[0]).toMatchObject({x:0,y:0,z:0});});
 it("depth variants can share the same shadow",()=>{const solved=solveShadowArchitect(createShadowArchitect(0));const moved=selectShadowBlock(solved,0);const deeper=transformShadowBlock(moved,{z:1});expect(shadowCells(deeper.poses)).toEqual(shadowCells(solved.poses));});
 it("has a stable fingerprint",()=>{const state=createShadowArchitect(4);expect(shadowArchitectFingerprint(state)).toBe(shadowArchitectFingerprint(createShadowArchitect(4)));});
});
