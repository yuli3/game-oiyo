export const SHADOW_ARCHITECT_RULESET="shadow-architect-v1";
export const SHADOW_WALL_WIDTH=7;
export const SHADOW_WALL_HEIGHT=6;
export type ShadowBlockId=0|1|2|3|4;
export type ShadowPose=Readonly<{x:number;y:number;z:number;rotation:0|1|2|3}>;
export type ShadowArchitectState=Readonly<{puzzle:number;selected:ShadowBlockId;moves:number;poses:readonly ShadowPose[]}>;
type Voxel=Readonly<{x:number;y:number;z:number}>;

export const SHADOW_BLOCKS:readonly (readonly Voxel[])[]=Object.freeze([
 [{x:0,y:0,z:0},{x:0,y:1,z:0},{x:0,y:2,z:0}],
 [{x:0,y:0,z:0},{x:0,y:1,z:0},{x:1,y:0,z:0}],
 [{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}],
 [{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0},{x:1,y:1,z:0}],
 [{x:0,y:0,z:0},{x:1,y:0,z:0},{x:1,y:1,z:0}],
]);

export const SHADOW_SOLUTIONS:readonly (readonly ShadowPose[])[]=Object.freeze([
 [{x:0,y:0,z:0,rotation:0},{x:1,y:0,z:1,rotation:0},{x:3,y:0,z:0,rotation:0},{x:2,y:2,z:2,rotation:0},{x:5,y:0,z:1,rotation:0}],
 [{x:0,y:0,z:2,rotation:1},{x:2,y:1,z:0,rotation:0},{x:4,y:0,z:1,rotation:1},{x:1,y:3,z:2,rotation:0},{x:5,y:2,z:0,rotation:2}],
 [{x:1,y:0,z:0,rotation:0},{x:2,y:2,z:1,rotation:1},{x:4,y:0,z:2,rotation:0},{x:0,y:3,z:0,rotation:1},{x:5,y:3,z:1,rotation:3}],
 [{x:0,y:1,z:1,rotation:0},{x:1,y:0,z:2,rotation:2},{x:3,y:1,z:0,rotation:1},{x:2,y:3,z:2,rotation:0},{x:5,y:0,z:0,rotation:0}],
 [{x:1,y:0,z:2,rotation:1},{x:0,y:2,z:0,rotation:0},{x:3,y:0,z:1,rotation:0},{x:3,y:3,z:0,rotation:1},{x:5,y:1,z:2,rotation:2}],
 [{x:0,y:0,z:0,rotation:0},{x:2,y:0,z:2,rotation:1},{x:4,y:0,z:1,rotation:2},{x:1,y:3,z:0,rotation:0},{x:5,y:2,z:2,rotation:3}],
 [{x:0,y:2,z:2,rotation:1},{x:1,y:0,z:0,rotation:0},{x:3,y:1,z:1,rotation:0},{x:2,y:3,z:2,rotation:1},{x:5,y:0,z:0,rotation:0}],
 [{x:1,y:0,z:1,rotation:0},{x:0,y:3,z:2,rotation:1},{x:3,y:0,z:0,rotation:0},{x:3,y:2,z:1,rotation:0},{x:5,y:3,z:2,rotation:2}],
 [{x:0,y:1,z:0,rotation:1},{x:2,y:0,z:1,rotation:0},{x:4,y:1,z:2,rotation:1},{x:1,y:3,z:0,rotation:0},{x:5,y:0,z:1,rotation:3}],
 [{x:0,y:0,z:2,rotation:0},{x:1,y:2,z:0,rotation:2},{x:4,y:0,z:1,rotation:0},{x:2,y:3,z:2,rotation:1},{x:5,y:2,z:0,rotation:0}],
]);

function rotate(v:Voxel,r:number):Voxel{if(r===1)return{x:-v.z,y:v.y,z:v.x};if(r===2)return{x:-v.x,y:v.y,z:-v.z};if(r===3)return{x:v.z,y:v.y,z:-v.x};return v;}
export function worldVoxels(poses:readonly ShadowPose[]):ReadonlyArray<Voxel&{block:ShadowBlockId}>{
 return poses.flatMap((pose,index)=>SHADOW_BLOCKS[index]!.map(voxel=>{const v=rotate(voxel,pose.rotation);return{x:v.x+pose.x,y:v.y+pose.y,z:v.z+pose.z,block:index as ShadowBlockId};}));
}
export function shadowCells(poses:readonly ShadowPose[]):readonly string[]{
 return [...new Set(worldVoxels(poses).filter(v=>v.x>=0&&v.y>=0&&v.x<SHADOW_WALL_WIDTH&&v.y<SHADOW_WALL_HEIGHT).map(v=>`${v.x},${v.y}`))].sort();
}
export function targetShadow(puzzle:number):readonly string[]{return shadowCells(SHADOW_SOLUTIONS[puzzle%SHADOW_SOLUTIONS.length]!);}
export function shadowMatch(state:ShadowArchitectState):Readonly<{matched:number;target:number;extra:number;percent:number}>{
 const current=new Set(shadowCells(state.poses)),target=new Set(targetShadow(state.puzzle));let matched=0;for(const cell of current)if(target.has(cell))matched++;
 const extra=current.size-matched;return{matched,target:target.size,extra,percent:Math.round(matched/Math.max(1,new Set([...current,...target]).size)*100)};
}
export function isShadowComplete(state:ShadowArchitectState):boolean{const m=shadowMatch(state);return m.matched===m.target&&m.extra===0;}
export function createShadowArchitect(puzzle=0):ShadowArchitectState{
 const solution=SHADOW_SOLUTIONS[puzzle%SHADOW_SOLUTIONS.length]!;
 return{puzzle:puzzle%SHADOW_SOLUTIONS.length,selected:0,moves:0,poses:solution.map((p,i)=>({...p,x:(p.x+1+i%2)%6,rotation:((p.rotation+1)%4) as ShadowPose["rotation"]}))};
}
export function selectShadowBlock(state:ShadowArchitectState,selected:ShadowBlockId):ShadowArchitectState{return{...state,selected};}
export function transformShadowBlock(state:ShadowArchitectState,change:Partial<Pick<ShadowPose,"x"|"y"|"z">>&{rotate?:number}):ShadowArchitectState{
 const poses=state.poses.map((pose,index)=>{if(index!==state.selected)return pose;return{x:Math.max(0,Math.min(6,pose.x+(change.x??0))),y:Math.max(0,Math.min(5,pose.y+(change.y??0))),z:Math.max(0,Math.min(3,pose.z+(change.z??0))),rotation:((pose.rotation+(change.rotate??0)+4)%4) as ShadowPose["rotation"]};});
 return{...state,poses,moves:state.moves+1};
}
export function solveShadowArchitect(state:ShadowArchitectState):ShadowArchitectState{return{...state,poses:SHADOW_SOLUTIONS[state.puzzle]!.map(p=>({...p}))};}
export function shadowArchitectScore(state:ShadowArchitectState):number{return isShadowComplete(state)?Math.max(100,1200-state.moves*20):shadowMatch(state).percent;}
export function shadowArchitectFingerprint(state:ShadowArchitectState):string{return JSON.stringify({ruleset:SHADOW_ARCHITECT_RULESET,...state,shadow:shadowCells(state.poses)});}
