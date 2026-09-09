import {describe, expect, it} from "vitest";
import {MEMORY_PALACE_OBSERVE_TURNS, createMemoryPalace, memoryPalaceFingerprint, moveMemoryPalace, observeMemoryPalace, palaceLineOfSight, palacePatrol, revealMemoryPalace} from "./memory-palace-thieves";

describe("memory palace thieves", () => {
  it("creates deterministic daily patrols", () => {
    expect(palacePatrol(42)).toEqual(palacePatrol(42));
    expect(memoryPalaceFingerprint(createMemoryPalace(42))).toBe(memoryPalaceFingerprint(createMemoryPalace(42)));
  });

  it("shows the complete patrol before infiltration", () => {
    let state=createMemoryPalace(2);
    for(let i=0;i<MEMORY_PALACE_OBSERVE_TURNS;i+=1) state=observeMemoryPalace(state);
    expect(state.phase).toBe("infiltrating");
    expect(state.guard).toEqual(palacePatrol(2)[0]);
  });

  it("blocks walls without skipping the guard clock", () => {
    let state=createMemoryPalace(0);
    for(let i=0;i<MEMORY_PALACE_OBSERVE_TURNS;i+=1) state=observeMemoryPalace(state);
    const next=moveMemoryPalace(state,"left");
    expect(next.player).toEqual(state.player);
    expect(next.turn).toBe(1);
  });

  it("uses walls to break line of sight", () => {
    expect(palaceLineOfSight({x:1,y:1},{x:1,y:5})).toBe(true);
    expect(palaceLineOfSight({x:1,y:1},{x:5,y:1})).toBe(false);
  });

  it("spends only the two allowed memory reveals", () => {
    let state=createMemoryPalace(1);
    for(let i=0;i<MEMORY_PALACE_OBSERVE_TURNS;i+=1) state=observeMemoryPalace(state);
    state=revealMemoryPalace(revealMemoryPalace(revealMemoryPalace(state)));
    expect(state.reveals).toBe(0);
  });

  it("keeps every daily patrol phase solvable", () => {
    const directions=["up","down","left","right","wait"] as const;
    for(let seed=0;seed<12;seed+=1){
      let initial=createMemoryPalace(seed);
      for(let i=0;i<MEMORY_PALACE_OBSERVE_TURNS;i+=1) initial=observeMemoryPalace(initial);
      const queue:[typeof initial,number][]=[[initial,0]]; const seen=new Set<string>(); let escaped=false;
      while(queue.length){
        const [state,depth]=queue.shift()!; if(depth>80) continue;
        const key=`${state.player.x},${state.player.y},${state.turn%12},${state.carrying}`;
        if(seen.has(key)) continue; seen.add(key);
        if(state.phase==="escaped"){escaped=true;break;}
        for(const direction of directions){const next=moveMemoryPalace(state,direction);if(next.phase!=="caught")queue.push([next,depth+1]);}
      }
      expect(escaped,`seed ${seed}`).toBe(true);
    }
  });
});
