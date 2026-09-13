export type GardenPlanet = Readonly<{ baseRadius:number; flowers:number; health:number; angle:number }>;
export type OrbitGarden = Readonly<{ mission:number; planets:readonly GardenPlanet[]; seeds:number; day:number; target:number; phase:'planning'|'running'|'balanced'|'collision'|'withered' }>;
export const orbitRadius = (p:GardenPlanet) => p.baseRadius - p.flowers * 6;
export const planetSize = (p:GardenPlanet) => 8 + p.flowers;
export const planetPosition = (p:GardenPlanet) => ({x: Math.cos(p.angle)*orbitRadius(p), y:Math.sin(p.angle)*orbitRadius(p)});
export function createOrbitGarden(mission=0):OrbitGarden {
 mission=Number.isFinite(mission)?Math.abs(Math.trunc(mission))%3:0;
 return {mission,seeds:[12,9,8][mission]!,day:0,target:[90,120,150][mission]!,phase:'planning',planets:[80,132,184].map(baseRadius=>({baseRadius,flowers:0,health:40,angle:mission*.7}))};
}
export function plantOrbit(s:OrbitGarden,index:number,delta:1|-1):OrbitGarden {
 if(s.phase!=='planning'||!Number.isInteger(index)||!s.planets[index]||(delta!==1&&delta!==-1))return s;
 const p=s.planets[index]!;
 if(delta===1&&(s.seeds<1||p.flowers>=8)||delta===-1&&p.flowers===0)return s;
 return {...s,seeds:s.seeds-delta,planets:s.planets.map((p,i)=>i===index?{...p,flowers:p.flowers+delta}:p)};
}
export function orbitClearance(s:OrbitGarden):number {
 let clearance=Infinity;
 for(let i=0;i<s.planets.length;i++)for(let j=i+1;j<s.planets.length;j++) {
 const a=s.planets[i]!,b=s.planets[j]!;
 clearance=Math.min(clearance,Math.abs(orbitRadius(a)-orbitRadius(b))-planetSize(a)-planetSize(b));
 }
 return clearance;
}
function collision(planets:readonly GardenPlanet[]):boolean {
 return planets.some((a,i)=>planets.slice(i+1).some(b=>{const p=planetPosition(a),q=planetPosition(b);return Math.hypot(p.x-q.x,p.y-q.y)<=planetSize(a)+planetSize(b);}));
}
export function launchOrbit(s:OrbitGarden):OrbitGarden {
 if(s.phase!=='planning')return s;
 return {...s,phase:collision(s.planets)?'collision':'running'};
}
export function stepOrbit(s:OrbitGarden):OrbitGarden {
 if(s.phase!=='running')return s;
 // One deterministic day; collision substeps prevent fast bodies crossing undetected.
 let planets=s.planets.map(p=>({...p}));
 for(let sub=0;sub<8;sub++) {
 planets=planets.map(p=>({...p,angle:(p.angle + .06*Math.sqrt(1+p.flowers*.2)*Math.pow(80/orbitRadius(p),1.5)/8)%(2*Math.PI)}));
 if(collision(planets))return {...s,planets,day:s.day+1,phase:'collision'};
 }
 planets=planets.map(p=>({...p,health:Math.max(0,Math.min(100,p.health+(p.flowers>=2?1:-2)))}));
 const day=s.day+1;
 return {...s,planets,day,phase:planets.some(p=>p.health===0)?'withered':day>=s.target?'balanced':'running'};
}
