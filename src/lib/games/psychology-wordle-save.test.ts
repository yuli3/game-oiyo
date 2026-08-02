import { describe, expect, it } from "vitest";
import { createPsychologyWordle, inputPsychologyWordle, submitPsychologyWordle } from "./psychology-wordle";
import { clearPsychologyWordleSave, loadPsychologyWordleSave, parsePsychologyWordleSave, storePsychologyWordleSave } from "./psychology-wordle-save";
class MemoryStorage { data = new Map<string,string>(); getItem(k:string){return this.data.get(k)??null} setItem(k:string,v:string){this.data.set(k,v)} removeItem(k:string){this.data.delete(k)} }

describe("psychology wordle save", () => {
  it("round-trips a replay-validated active daily state", () => {
    const storage = new MemoryStorage(); let state = createPsychologyWordle(42, "latin"); state = inputPsychologyWordle(state, "A");
    storePsychologyWordleSave(state, "daily", "2026-08-02", 1000, storage);
    expect(loadPsychologyWordleSave(1000, storage)).toEqual({ version: 1, state, mode: "daily", dateKey: "2026-08-02", savedAtEpochMs: 1000 });
  });
  it("rejects forged targets, terminal progress, invalid mode dates, and stale saves", () => {
    const state = createPsychologyWordle(42, "latin"); const wrap = (extra: Record<string,unknown>={}) => JSON.stringify({version:1,state,mode:"random",dateKey:null,savedAtEpochMs:10,...extra});
    expect(parsePsychologyWordleSave(wrap({state:{...state,targetDisplay:"ANGER"}}),10)).toBeNull();
    let won = state; for(const symbol of state.target) won=inputPsychologyWordle(won,symbol); won=submitPsychologyWordle(won);
    expect(parsePsychologyWordleSave(wrap({state:won}),10)).toBeNull();
    expect(parsePsychologyWordleSave(wrap({mode:"daily",dateKey:null}),10)).toBeNull();
    expect(parsePsychologyWordleSave(wrap(),8*24*60*60*1000)).toBeNull();
  });
  it("clears only its own storage key",()=>{const storage=new MemoryStorage();storage.setItem("other","keep");clearPsychologyWordleSave(storage);expect(storage.getItem("other")).toBe("keep")});
});
