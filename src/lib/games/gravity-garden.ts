export const GRAVITY_GARDEN_RULESET="gravity-garden-v1";
export const GRAVITY_GARDEN_WIDTH=720;
export const GRAVITY_GARDEN_HEIGHT=420;
export const GRAVITY_GARDEN_STEP=1/60;
export const GRAVITY_GARDEN_DURATION=12;
export type GardenSeedType="gravity-bloom"|"moss"|"wind-reed";
export type GardenSeed=Readonly<{id:number;type:GardenSeedType;x:number;y:number}>;
export type GardenDrop=Readonly<{id:number;x:number;y:number;vx:number;vy:number;saved:boolean;lost:boolean}>;
export type GravityGardenState=Readonly<{time:number;running:boolean;seeds:readonly GardenSeed[];drops:readonly GardenDrop[]}>;
export const GARDEN_POOL=Object.freeze({x:635,y:338,radius:48});
export const GARDEN_ROCKS=Object.freeze([{x:305,y:205,radius:48},{x:475,y:105,radius:38},{x:500,y:305,radius:34}]);

export function createGravityGarden():GravityGardenState{return {time:0,running:false,seeds:[],drops:Array.from({length:5},(_,id)=>({id,x:72-id*7,y:54+id*13,vx:16+id*1.5,vy:0,saved:false,lost:false}))};}

export function plantGardenSeed(state:GravityGardenState,type:GardenSeedType,x:number,y:number):GravityGardenState{
 if(state.running||state.seeds.length>=6||x<24||y<24||x>GRAVITY_GARDEN_WIDTH-24||y>GRAVITY_GARDEN_HEIGHT-24)return state;
 return {...state,seeds:[...state.seeds,{id:state.seeds.length,type,x:Math.round(x),y:Math.round(y)}]};
}

export function startGravityGarden(state:GravityGardenState):GravityGardenState{return state.seeds.length===0?state:{...state,running:true};}

function field(drop:GardenDrop,seeds:readonly GardenSeed[]){let ax=12,ay=22,damping=1;for(const seed of seeds){const dx=seed.x-drop.x,dy=seed.y-drop.y,d2=dx*dx+dy*dy;if(d2>170*170)continue;const distance=Math.max(24,Math.sqrt(d2)),falloff=1-distance/170;if(seed.type==="gravity-bloom"){ax+=dx/distance*92*falloff;ay+=dy/distance*92*falloff;}else if(seed.type==="wind-reed"){ax+=105*falloff;ay-=20*falloff;}else damping*=1-0.75*falloff;}return {ax,ay,damping};}

function collideRock(drop:GardenDrop):GardenDrop{let d=drop;for(const rock of GARDEN_ROCKS){const dx=d.x-rock.x,dy=d.y-rock.y,dist=Math.sqrt(dx*dx+dy*dy),min=rock.radius+8;if(dist>=min||dist===0)continue;const nx=dx/dist,ny=dy/dist,dot=d.vx*nx+d.vy*ny;d={...d,x:rock.x+nx*min,y:rock.y+ny*min,vx:(d.vx-2*dot*nx)*.72,vy:(d.vy-2*dot*ny)*.72};}return d;}

export function stepGravityGarden(state:GravityGardenState,dt=GRAVITY_GARDEN_STEP):GravityGardenState{
 if(!state.running)return state;const time=Math.min(GRAVITY_GARDEN_DURATION,state.time+dt);
 const drops=state.drops.map(original=>{if(original.saved||original.lost)return original;const f=field(original,state.seeds);let d:GardenDrop={...original,vx:(original.vx+f.ax*dt)*f.damping,vy:(original.vy+f.ay*dt)*f.damping,x:original.x+(original.vx+f.ax*dt)*dt,y:original.y+(original.vy+f.ay*dt)*dt};d=collideRock(d);if(d.x<8){d={...d,x:8,vx:Math.abs(d.vx)*.7};}if(d.x>GRAVITY_GARDEN_WIDTH-8){d={...d,x:GRAVITY_GARDEN_WIDTH-8,vx:-Math.abs(d.vx)*.7};}if(d.y<8){d={...d,y:8,vy:Math.abs(d.vy)*.7};}const pdx=d.x-GARDEN_POOL.x,pdy=d.y-GARDEN_POOL.y;if(pdx*pdx+pdy*pdy<GARDEN_POOL.radius*GARDEN_POOL.radius)return {...d,saved:true,vx:0,vy:0};if(d.y>GRAVITY_GARDEN_HEIGHT+12)return {...d,lost:true};return d;});
 return {...state,time,running:time<GRAVITY_GARDEN_DURATION&&drops.some(d=>!d.saved&&!d.lost),drops};
}

export function gravityGardenScore(state:GravityGardenState):number{return state.drops.filter(d=>d.saved).length*100+Math.max(0,60-state.seeds.length*10);}
export function gravityGardenFingerprint(state:GravityGardenState):string{return JSON.stringify({ruleset:GRAVITY_GARDEN_RULESET,...state});}

