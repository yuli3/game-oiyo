import {describe,expect,it} from "vitest";import {GRAVITY_GARDEN_STEP,createGravityGarden,gravityGardenFingerprint,gravityGardenScore,plantGardenSeed,startGravityGarden,stepGravityGarden} from "./gravity-garden";
const run=(state:ReturnType<typeof createGravityGarden>)=>{let s=startGravityGarden(state);for(let i=0;i<12/GRAVITY_GARDEN_STEP;i++)s=stepGravityGarden(s);return s;};
describe("gravity garden",()=>{
 it("is deterministic at a fixed step",()=>{const setup=plantGardenSeed(plantGardenSeed(createGravityGarden(),"wind-reed",180,110),"gravity-bloom",590,300);expect(gravityGardenFingerprint(run(setup))).toBe(gravityGardenFingerprint(run(setup)));});
 it("does not start without a planted field",()=>{const s=createGravityGarden();expect(startGravityGarden(s)).toBe(s);});
 it("caps the garden at six seeds",()=>{let s=createGravityGarden();for(let i=0;i<9;i++)s=plantGardenSeed(s,"moss",40+i*40,200);expect(s.seeds).toHaveLength(6);});
 it("rejects planting while the simulation runs",()=>{const s=startGravityGarden(plantGardenSeed(createGravityGarden(),"wind-reed",120,100));expect(plantGardenSeed(s,"moss",200,200)).toBe(s);});
 it("scores saved water and rewards fewer seeds",()=>{const base=createGravityGarden();const saved={...base,drops:base.drops.map((d,i)=>({...d,saved:i<3}))};expect(gravityGardenScore({...saved,seeds:[]})).toBe(360);expect(gravityGardenScore({...saved,seeds:[{id:0,type:"moss",x:1,y:1}]})).toBe(350);});
 it("ships with physics that admits a complete rescue",()=>{let s=createGravityGarden();for(const [type,x,y] of [["gravity-bloom",333,176],["wind-reed",122,234],["gravity-bloom",465,210],["wind-reed",189,165]] as const)s=plantGardenSeed(s,type,x,y);expect(run(s).drops.filter(d=>d.saved)).toHaveLength(5);});
});
