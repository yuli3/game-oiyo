import { describe, expect, it } from "vitest";
import {
  WINDWARD_SAVE_KEY,
  clearWindwardSave,
  loadWindwardSave,
  parseWindwardSave,
  serializeWindwardSave,
  storeWindwardSave,
} from "./windward-save";
import { STARTING_GOLD, VOYAGE_SECONDS, createTradeState, type VesselState } from "./windward-horizons";

const NOW = 2_000_000;

const vessel: VesselState = { x: -30, z: 44, heading: 1.2, speed: 4.1, sail: 0.6, rudder: -0.2, heel: -0.05 };

function validSave() {
  return {
    vessel,
    trade: createTradeState(),
    foundMarks: ["astral-arch"],
    elapsedSeconds: 120,
    savedAtEpochMs: NOW - 1_000,
  };
}

describe("windward horizons save v1 parser", () => {
  it("round-trips a valid mid-voyage state", () => {
    const save = validSave();
    const parsed = parseWindwardSave(serializeWindwardSave(save), NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.vessel).toEqual(vessel);
    expect(parsed?.trade.visited).toEqual(["azurehaven"]);
    expect(parsed?.foundMarks).toEqual(["astral-arch"]);
  });

  it("rejects malformed, missing or future-dated payloads", () => {
    expect(parseWindwardSave(null, NOW)).toBeNull();
    expect(parseWindwardSave("not json", NOW)).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...validSave(), version: 2 }), NOW)).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...validSave(), savedAtEpochMs: NOW + 1_000_000 }), NOW)).toBeNull();
  });

  it("rejects a vessel outside its physical envelope", () => {
    expect(parseWindwardSave(JSON.stringify({ ...validSave(), vessel: { ...vessel, sail: 1.4 } }), NOW)).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...validSave(), vessel: { ...vessel, rudder: -2 } }), NOW)).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...validSave(), vessel: { ...vessel, heading: -0.1 } }), NOW)).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...validSave(), vessel: { ...vessel, speed: -1 } }), NOW)).toBeNull();
  });

  it("rejects a trade state that fabricates gold or overfills the hold", () => {
    const base = validSave();
    expect(parseWindwardSave(JSON.stringify({ ...base, trade: { ...base.trade, gold: -5 } }), NOW)).toBeNull();
    expect(
      parseWindwardSave(
        JSON.stringify({ ...base, trade: { ...base.trade, cargo: { ...base.trade.cargo, timber: 40 } } }),
        NOW,
      ),
    ).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...base, trade: { ...base.trade, capacity: 999 } }), NOW)).toBeNull();
    expect(
      parseWindwardSave(JSON.stringify({ ...base, trade: { ...base.trade, visited: ["sunspire"] } }), NOW),
    ).toBeNull(); // every voyage must start at azurehaven
    expect(
      parseWindwardSave(
        JSON.stringify({ ...base, trade: { ...base.trade, visited: ["azurehaven", "azurehaven"] } }),
        NOW,
      ),
    ).toBeNull(); // no duplicate visits
  });

  it("rejects unknown or duplicated discovery mark ids, and an elapsed time past voyage end", () => {
    const base = validSave();
    expect(parseWindwardSave(JSON.stringify({ ...base, foundMarks: ["treasure-planet"] }), NOW)).toBeNull();
    expect(
      parseWindwardSave(JSON.stringify({ ...base, foundMarks: ["astral-arch", "astral-arch"] }), NOW),
    ).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...base, elapsedSeconds: VOYAGE_SECONDS + 1 }), NOW)).toBeNull();
    expect(parseWindwardSave(JSON.stringify({ ...base, elapsedSeconds: -1 }), NOW)).toBeNull();
  });

  it("round-trips through storage and clears on demand", () => {
    const calls: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => calls[key] ?? null,
      setItem: (key: string, value: string) => { calls[key] = value; },
      removeItem: (key: string) => { delete calls[key]; },
    };
    storeWindwardSave(validSave(), storage);
    expect(loadWindwardSave(NOW, storage)?.trade.gold).toBe(STARTING_GOLD);
    expect(calls[WINDWARD_SAVE_KEY]).toBeDefined();
    clearWindwardSave(storage);
    expect(loadWindwardSave(NOW, storage)).toBeNull();
  });
});
