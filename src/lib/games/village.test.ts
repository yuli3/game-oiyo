import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  BUILDING_IDS,
  COMMAND_IDS,
  EVENTS,
  EVENT_IDS,
  TERRAINS,
  VILLAGE_GRADE_MARKS,
  VILLAGE_TILES,
  VILLAGE_TURNS,
  assignVillager,
  autoAssign,
  canBuild,
  canChoose,
  canCommand,
  canPlace,
  chooseEvent,
  command,
  createVillage,
  endMonth,
  eventChoiceCount,
  eventChoiceInfo,
  parseVillage,
  parseVillageCode,
  parseVillageSave,
  serializeVillage,
  tileOutput,
  villageCount,
  villageDone,
  villageGrade,
  villageHousing,
  villageMaxAp,
  villageNeighbors,
  villagePop,
  villageSafety,
  villageSaveCode,
  villageScore,
  villageSeason,
  villageStorageCap,
  villageWorkerAt,
  type BuildingId,
  type CommandId,
  type EventId,
  type Terrain,
  type VillageState,
} from "./village";

const mkRand = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x1_0000_0000; };
const settle = (s: VillageState) => { for (let c = 0; c < 3 && !s.eventDone; c++) s = chooseEvent(s, c); return s; };
/** A month with no event pending and clear skies, whatever the seed drew. */
const calm = (seed = 1, patch: Partial<VillageState> = {}): VillageState => ({ ...createVillage(seed), event: null, eventDone: true, weather: "clear", trait: "lucky", fatigue: 10, ...patch });
/** An all-plain map with the starting house and fields, so adjacency is whatever the test paints. */
function flat(patch: Partial<VillageState> = {}, paint: Record<number, Terrain> = {}): VillageState {
  const terrain = Array<Terrain>(VILLAGE_TILES).fill("plain");
  for (const [tile, kind] of Object.entries(paint)) terrain[Number(tile)] = kind;
  return calm(1, { terrain, food: 40, wood: 60, stone: 60, gold: 60, ...patch });
}
const put = (s: VillageState, id: BuildingId, tile: number): VillageState => { const built = [...s.built]; built[tile] = id; return autoAssign({ ...s, built }); };
const bestTile = (s: VillageState, id: BuildingId) => { for (let t = 0; t < VILLAGE_TILES; t++) if (canPlace(s, id, t)) return t; return -1; };
const tryBuild = (s: VillageState, id: BuildingId) => { const t = bestTile(s, id); return t >= 0 ? command(s, "build", id, t) : s; };
function play(turn: (s: VillageState, rand: () => number) => VillageState, seed: number) {
  const rand = mkRand(seed * 7 + 1);
  let s = createVillage(seed);
  for (let guard = 0; !villageDone(s) && guard < 100; guard++) s = endMonth(turn(settle(s), rand));
  return s;
}
const repeat = (id: CommandId, build?: BuildingId) => (s: VillageState) => { for (let i = 0; i < 4; i++) s = id === "build" && !s.project ? tryBuild(s, build!) : command(s, id); return s; };

describe("village: a new run", () => {
  it("is the same village for the same seed and a different one for another", () => {
    expect(createVillage(5)).toEqual(createVillage(5));
    const maps = new Set(Array.from({ length: 40 }, (_, seed) => createVillage(seed + 1).terrain.join("")));
    expect(maps.size).toBeGreaterThan(35);
    const traits = new Set(Array.from({ length: 80 }, (_, seed) => createVillage(seed + 1).trait));
    expect(traits.size).toBe(7);
  });

  it("always leaves room for a lumber camp and a quarry, and starts with a staffed home", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = createVillage(seed);
      expect(bestTile(s, "lumberCamp")).toBeGreaterThanOrEqual(0);
      expect(bestTile(s, "quarry")).toBeGreaterThanOrEqual(0);
      expect(s.built[14]).toBe("house");
      expect(villageCount(s, "field")).toBe(2);
      expect(villagePop(s)).toBe(3);
      expect(s.villagers.filter((v) => v.at >= 0)).toHaveLength(2);
      expect(new Set(s.villagers.map((v) => v.n)).size).toBe(3);
      expect(parseVillage(JSON.parse(serializeVillage(s)))).toEqual(s);
    }
  });

  it("gives the same next month for the same choices", () => {
    const run = () => { let s = createVillage(42); for (let i = 0; i < 14; i++) s = endMonth(command(command(settle(s), "lumber"), "explore")); return s; };
    expect(run()).toEqual(run());
  });
});

describe("village: the map", () => {
  it("knows its neighbours at the edges", () => {
    expect(villageNeighbors(0).sort((a, b) => a - b)).toEqual([1, 6]);
    expect(villageNeighbors(35).sort((a, b) => a - b)).toEqual([29, 34]);
    expect(villageNeighbors(14)).toHaveLength(4);
  });

  it("builds only on open ground, and camps only beside what they work", () => {
    const s = flat({}, { 0: "forest", 5: "rock", 30: "water" });
    expect(canPlace(s, "house", 0)).toBe(false);
    expect(canPlace(s, "house", 30)).toBe(false);
    expect(canPlace(s, "house", 14)).toBe(false);
    expect(canPlace(s, "house", 2)).toBe(true);
    expect(canPlace(s, "lumberCamp", 1)).toBe(true);
    expect(canPlace(s, "lumberCamp", 2)).toBe(false);
    expect(canPlace(s, "hut", 6)).toBe(true);
    expect(canPlace(s, "quarry", 4)).toBe(true);
    expect(canPlace(s, "quarry", 1)).toBe(false);
    expect(command(s, "build", "quarry", 1)).toBe(s);
  });

  it("grows more on fertile ground and beside water or a well", () => {
    const worked = (s: VillageState) => tileOutput(s, 2)!.amount;
    const base = put(flat({ turn: 3 }), "field", 2);
    const plain = worked(base);
    expect(worked(put(flat({ turn: 3 }, { 2: "fertile" }), "field", 2)) / plain).toBeCloseTo(1.5);
    expect(worked(put(flat({ turn: 3 }, { 3: "water" }), "field", 2)) / plain).toBeCloseTo(1.25);
    expect(worked(put(base, "well", 8)) / plain).toBeCloseTo(1.25);
    expect(worked({ ...base, weather: "rain" }) / plain).toBeCloseTo(1.25);
    expect(worked({ ...base, tended: 2 }) / plain).toBeCloseTo(2);
    expect(tileOutput({ ...base, turn: 9 }, 2)!.amount).toBe(0);
  });

  it("makes nothing at a workplace nobody is sent to", () => {
    let s = put(flat({}, { 0: "forest" }), "lumberCamp", 1);
    const worker = villageWorkerAt(s, 1);
    expect(worker).toBeGreaterThanOrEqual(0);
    expect(tileOutput(s, 1)!.res).toBe("wood");
    s = assignVillager(s, worker, -1);
    expect(tileOutput(s, 1)).toBeNull();
    expect(tileOutput(s, 14)).toBeNull();
  });
});

describe("village: people", () => {
  it("fills empty workplaces with idle villagers and leaves placed ones alone", () => {
    const s = createVillage(3);
    const before = s.villagers.map((v) => v.at);
    expect(autoAssign(s).villagers.map((v) => v.at)).toEqual(before);
    const more = put(flat({}, { 0: "forest" }), "hut", 1);
    expect(more.villagers.filter((v) => v.at < 0)).toHaveLength(0);
  });

  it("swaps two villagers when one is sent to a taken workplace", () => {
    const s = createVillage(3);
    const a = s.villagers.findIndex((v) => v.at >= 0);
    const b = s.villagers.findIndex((v, i) => i !== a && v.at >= 0);
    const swapped = assignVillager(s, a, s.villagers[b].at);
    expect(swapped.villagers[a].at).toBe(s.villagers[b].at);
    expect(swapped.villagers[b].at).toBe(s.villagers[a].at);
    expect(assignVillager(s, a, 14)).toBe(s);
    expect(assignVillager(s, a, 99)).toBe(s);
    expect(assignVillager(s, 99, -1)).toBe(s);
  });

  it("feeds a glutton more and a frugal villager less", () => {
    const eat = (t: VillageState["villagers"][number]["t"]) => {
      const s = flat({ turn: 9, food: 40, villagers: [{ n: 0, t, at: -1 }, { n: 1, t, at: -1 }] });
      return -endMonth(s).report.find((line) => line.k === "eaten")!.n!;
    };
    expect(eat("glutton")).toBe(6);
    expect(eat("diligent")).toBe(4);
    expect(eat("frugal")).toBe(2);
  });

  it("loses a villager to hunger, but never the last two", () => {
    const hungry = endMonth(flat({ turn: 9, food: 0 }));
    expect(villagePop(hungry)).toBe(2);
    expect(hungry.hungryMonths).toBe(1);
    expect(villagePop(endMonth({ ...hungry, event: null, eventDone: true, food: 0 }))).toBe(2);
  });
});

describe("village: orders", () => {
  it("blocks orders and the month end while news is waiting", () => {
    let seed = 1;
    while (createVillage(seed).eventDone) seed++;
    const s = createVillage(seed);
    expect(canCommand(s, "lumber")).toBe(false);
    expect(command(s, "lumber")).toBe(s);
    expect(endMonth(s)).toBe(s);
    const chosen = settle(s);
    expect(chosen.eventDone).toBe(true);
    expect(chooseEvent(chosen, 0)).toBe(chosen);
  });

  it("spends one action per order and rolls each result inside its range", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = calm(seed, { wood: 0, stone: 0, food: 0, turn: 3 });
      const wood = command(s, "lumber");
      expect(wood.ap).toBe(s.ap - 1);
      expect(wood.wood).toBeGreaterThanOrEqual(6);
      expect(wood.wood).toBeLessThanOrEqual(10);
      const stone = command(s, "quarry").stone;
      expect(stone >= 4 && stone <= 6).toBe(true);
      const food = command(s, "hunt").food;
      expect(food >= 3 && food <= 9).toBe(true);
      expect(command(s, "explore").last.length).toBeGreaterThan(0);
    }
    const spent = calm(1, { ap: 0 });
    expect(command(spent, "lumber")).toBe(spent);
  });

  it("rolls differently from one order to the next, but the same on a replay", () => {
    const amounts = new Set<number>();
    let s = calm(7, { wood: 0, ap: 3 });
    for (let i = 0; i < 3; i++) { const before = s.wood; s = command(s, "lumber"); amounts.add(s.wood - before); }
    let again = calm(7, { wood: 0, ap: 3 });
    for (let i = 0; i < 3; i++) again = command(again, "lumber");
    expect(again).toEqual(s);
    const spread = new Set(Array.from({ length: 60 }, (_, seed) => command(calm(seed + 1, { wood: 0 }), "lumber").wood));
    expect(spread.size).toBeGreaterThanOrEqual(4);
    expect(amounts.size).toBeGreaterThanOrEqual(1);
  });

  it("pays for a building once, raises it on its tile and staffs it", () => {
    let s = flat({ wood: 40, stone: 0 }, { 0: "forest" });
    s = command(s, "build", "lumberCamp", 1);
    expect(s.wood).toBe(25);
    expect(s.project).toEqual({ id: "lumberCamp", tile: 1, progress: 30 });
    expect(canBuild(s, "field")).toBe(false);
    expect(canPlace(s, "house", 1)).toBe(true);
    s = command(s, "build");
    expect(s.project).toBeNull();
    expect(s.built[1]).toBe("lumberCamp");
    expect(villageWorkerAt(s, 1)).toBeGreaterThanOrEqual(0);
    expect(command(flat({ wood: 0 }), "build", "house", 2).project).toBeNull();
  });

  it("gives a fourth action once the hall stands", () => {
    let s = flat({ wood: 60, stone: 60, gold: 60 });
    expect(villageMaxAp(s)).toBe(3);
    s = command(s, "build", "hall", 2);
    s = endMonth(s);
    for (let i = 0; i < 12 && s.project; i++) s = endMonth(command(command(command({ ...settle(s) }, "build"), "build"), "build"));
    expect(villageCount(s, "hall")).toBe(1);
    expect(villageMaxAp(s)).toBe(4);
    expect(s.ap).toBe(4);
  });

  it("caps storage and raises the cap with a storehouse", () => {
    const s = flat({ wood: 58 });
    expect(villageStorageCap(s)).toBe(60);
    expect(command(s, "lumber").wood).toBe(60);
    expect(villageStorageCap(put(s, "storehouse", 2))).toBe(120);
    expect(villageHousing(put(s, "house", 2))).toBe(6);
  });

  it("counts towers, their guards, patrols, brave villagers, the valley and the fog toward safety", () => {
    const s = flat({ villagers: [{ n: 0, t: "lazy", at: -1 }] });
    expect(villageSafety(s)).toBe(30);
    expect(villageSafety(command(s, "patrol"))).toBe(40);
    expect(villageSafety({ ...put(s, "watchtower", 2), villagers: [{ n: 0, t: "lazy", at: 2 }] })).toBe(55);
    expect(villageSafety({ ...put(s, "watchtower", 2), villagers: [{ n: 0, t: "lazy", at: -1 }] })).toBe(45);
    expect(villageSafety({ ...s, villagers: [{ n: 0, t: "brave", at: -1 }] })).toBe(35);
    expect(villageSafety({ ...s, trait: "wolfValley", weather: "fog" })).toBe(10);
  });
});

describe("village: news", () => {
  const facing = (id: EventId, patch: Partial<VillageState> = {}) => flat({ event: id, eventDone: false, food: 40, wood: 40, stone: 40, gold: 40, ...patch });

  it("offers every choice when the village can pay, and no more than the event has", () => {
    for (const id of EVENT_IDS) {
      const s = put(facing(id), "house", 2);
      for (let c = 0; c < eventChoiceCount(id); c++) expect(canChoose(s, c)).toBe(true);
      expect(canChoose(s, eventChoiceCount(id))).toBe(false);
      expect(canChoose(s, -1)).toBe(false);
    }
  });

  it("refuses a choice the village cannot pay for or house", () => {
    const poor = facing("trader", { wood: 5, gold: 3 });
    expect(canChoose(poor, 0)).toBe(false);
    expect(canChoose(poor, 1)).toBe(false);
    expect(chooseEvent(poor, 0)).toBe(poor);
    expect(chooseEvent(poor, 2).eventDone).toBe(true);
    const full = facing("family", { villagers: [0, 1, 2].map((n) => ({ n, t: "lazy" as const, at: -1 })) });
    expect(canChoose(full, 0)).toBe(false);
    expect(chooseEvent(full, 1).gold).toBe(43);
    const roomy = put(facing("family"), "house", 2);
    expect(villagePop(chooseEvent(roomy, 0))).toBe(5);
  });

  it("decides a guarded choice by safety, not by luck", () => {
    const open = chooseEvent(facing("wolves"), 0);
    expect(open.last[0]).toEqual({ k: "bad" });
    expect(open.food).toBe(34);
    const guarded = chooseEvent(put(facing("wolves"), "watchtower", 2), 0);
    expect(guarded.last[0]).toEqual({ k: "good" });
    expect(guarded.food).toBe(40);
  });

  it("decides a risky choice by its odds, both ways across seeds", () => {
    let good = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const after = chooseEvent({ ...facing("gambler"), rng: seed * 2654435761 >>> 0, trait: "fertile" }, 0);
      expect([35, 50]).toContain(after.gold);
      if (after.gold === 50) good++;
    }
    expect(good).toBeGreaterThan(150);
    expect(good).toBeLessThan(250);
    expect(eventChoiceInfo(facing("gambler", { trait: "lucky" }), "gambler", 0).odds).toBeCloseTo(0.6);
    expect(eventChoiceInfo(facing("gambler", { trait: "harsh" }), "gambler", 0).odds).toBeCloseTo(0.5);
  });

  it("draws many different events and weathers over a run, each in its season", () => {
    const events = new Set<string>();
    const weathers = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      let s = createVillage(seed);
      for (let guard = 0; !villageDone(s) && guard < 100; guard++) {
        if (s.event) { events.add(s.event); expect(EVENTS[s.event].seasons as readonly number[]).toContain(villageSeason(s.turn)); }
        weathers.add(s.weather);
        if (villageSeason(s.turn) === 3) expect(["snow", "frost", "mild"]).toContain(s.weather);
        s = endMonth(settle(s));
      }
    }
    expect(events.size).toBe(EVENT_IDS.length);
    expect(weathers.size).toBe(9);
  });
});

describe("village: the month end", () => {
  it("burns firewood in winter by the weather, and none in a mild one", () => {
    const burn = (weather: VillageState["weather"]) => endMonth(flat({ turn: 9, wood: 30, weather })).report.find((line) => line.k === "firewood")?.n ?? 0;
    expect(burn("snow")).toBe(-3);
    expect(burn("frost")).toBe(-4);
    expect(burn("mild")).toBe(0);
    expect(endMonth(flat({ turn: 9, wood: 0, weather: "frost" })).report).toContainEqual({ k: "cold" });
  });

  it("gives each workplace a month of its own within a fifth either way", () => {
    const totals = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      const s = put(flat({ turn: 4, food: 0, rng: seed * 7919, villagers: [{ n: 0, t: "frugal", at: -1 }] }), "field", 2);
      const made = endMonth({ ...s, built: s.built.map((b, t) => (t === 15 || t === 20 ? null : b)), villagers: [{ n: 0, t: "frugal", at: 2 }] }).report.find((line) => line.k === "made")!.n!;
      expect(made).toBeGreaterThanOrEqual(4);
      expect(made).toBeLessThanOrEqual(6);
      totals.add(made);
    }
    expect(totals.size).toBe(3);
  });

  it("ends after thirty-six months and then stays put", () => {
    const done = play((s) => s, 3);
    expect(done.turn).toBe(VILLAGE_TURNS);
    expect(endMonth(done)).toBe(done);
    expect(command(done, "lumber")).toBe(done);
    expect(assignVillager(done, 0, -1)).toBe(done);
  });
});

describe("village: balance", () => {
  it("survives a thousand random games with a save that always reads back", () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const done = play((s, rand) => {
        for (let i = 0; i < 8; i++) {
          const id = COMMAND_IDS[Math.floor(rand() * COMMAND_IDS.length)];
          s = id === "build" && !s.project ? command(s, "build", BUILDING_IDS[Math.floor(rand() * BUILDING_IDS.length)], Math.floor(rand() * VILLAGE_TILES)) : command(s, id);
          if (rand() < 0.2) s = assignVillager(s, Math.floor(rand() * villagePop(s)), Math.floor(rand() * VILLAGE_TILES) - 1);
        }
        return s;
      }, seed);
      expect(done.turn).toBe(VILLAGE_TURNS);
      expect(parseVillage(JSON.parse(serializeVillage(done)))).toEqual(done);
      expect(parseVillageCode(villageSaveCode(done))).toEqual({ ...done, report: [], last: [] });
      expect(villagePop(done)).toBeLessThanOrEqual(villageHousing(done));
      for (const id of BUILDING_IDS) expect(villageCount(done, id)).toBeLessThanOrEqual(BUILDINGS[id].max);
    }
  });

  it("does not give even the middle grade to one repeated order", () => {
    const lines: Array<[CommandId, BuildingId?]> = [["tend"], ["lumber"], ["quarry"], ["hunt"], ["patrol"], ["feast"], ["explore"], ["build", "field"], ["build", "house"]];
    for (const [id, build] of lines) {
      for (let seed = 1; seed <= 80; seed++) expect(villageScore(play(repeat(id, build), seed))).toBeLessThan(VILLAGE_GRADE_MARKS[0]);
    }
  });

  it("lets a sensible build order reach the top grade often, but not always", () => {
    const sensible = (s: VillageState) => {
      for (let i = 0; i < 4; i++) {
        const pop = villagePop(s);
        const jobs = s.built.filter((b) => b && BUILDINGS[b].job).length;
        const order: BuildingId[] = [];
        if (pop >= villageHousing(s)) order.push("house");
        if (villageCount(s, "lumberCamp") < 1) order.push("lumberCamp");
        if (jobs < pop) order.push("field", "hut", "quarry");
        order.push("storehouse", "well", "watchtower", "house", "kitchen", "smithy", "market", "field");
        const want = s.project ? undefined : order.find((id) => canBuild(s, id));
        if (s.fatigue > 60 && canCommand(s, "feast")) s = command(s, "feast");
        else if (s.food < pop * 5) s = command(s, "hunt");
        else if (s.project) s = command(s, "build");
        else if (want) s = tryBuild(s, want);
        else if (canCommand(s, "tend") && s.tended < 2) s = command(s, "tend");
        else if (s.wood < 30) s = command(s, "lumber");
        else if (s.stone < 25) s = command(s, "quarry");
        else s = command(s, "explore");
      }
      return s;
    };
    let top = 0;
    const scores = new Set<number>();
    for (let seed = 1; seed <= 120; seed++) { const score = villageScore(play(sensible, seed)); scores.add(score); if (villageGrade(score) === 2) top++; }
    expect(top).toBeGreaterThan(15);
    expect(top).toBeLessThan(110);
    expect(scores.size).toBeGreaterThan(60);
  });
});

describe("village: save", () => {
  it("round-trips the save and the save code mid-month", () => {
    let s = createVillage(77);
    for (let i = 0; i < 9; i++) s = endMonth(tryBuild(command(settle(s), "lumber"), "field"));
    s = command(settle(s), "patrol");
    expect(parseVillageSave(serializeVillage(s))).toEqual(s);
    const code = villageSaveCode(s);
    expect(code).toMatch(/^V2\.[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(2500);
    expect(parseVillageCode(`  ${code}\n`)).toEqual({ ...s, report: [], last: [] });
    expect(endMonth(parseVillageCode(code)!).villagers).toEqual(endMonth(s).villagers);
  });

  it("rejects a broken, foreign or out-of-range save without throwing", () => {
    const good = JSON.parse(serializeVillage(flat()));
    const withBuilt = (tile: number, id: unknown) => ({ ...good, built: good.built.map((b: unknown, t: number) => (t === tile ? id : b)) });
    for (const bad of [
      null, [], "x", { ...good, v: 1 }, { ...good, food: -1 }, { ...good, food: 1e9 }, { ...good, wood: 2.5 },
      { ...good, ap: 4 }, { ...good, ap: 3, tended: 2 }, { ...good, turn: 37 }, { ...good, harvestMod: 9 },
      { ...good, trait: "rich" }, { ...good, weather: "meteor" }, { ...good, event: "meteor", eventDone: false }, { ...good, event: null, eventDone: false },
      { ...good, terrain: good.terrain.slice(1) }, { ...good, terrain: good.terrain.map(() => "lava") }, { ...good, built: null },
      withBuilt(2, "castle"), { ...withBuilt(2, "house"), terrain: good.terrain.map((t: string, i: number) => (i === 2 ? "water" : t)) },
      withBuilt(2, "hall") && { ...good, built: good.built.map((b: unknown, t: number) => (t === 2 || t === 3 ? "hall" : b)) },
      { ...good, villagers: [] }, { ...good, villagers: Array.from({ length: 9 }, (_, n) => ({ n, t: "lazy", at: -1 })) },
      { ...good, villagers: [{ n: 0, t: "wizard", at: -1 }] }, { ...good, villagers: [{ n: 99, t: "lazy", at: -1 }] },
      { ...good, villagers: [{ n: 0, t: "lazy", at: 14 }] }, { ...good, villagers: [{ n: 0, t: "lazy", at: 15 }, { n: 1, t: "lazy", at: 15 }] },
      { ...good, project: { id: "castle", tile: 2, progress: 1 } }, { ...good, project: { id: "house", tile: 14, progress: 1 } }, { ...good, project: { id: "house", tile: 2, progress: 400 } },
    ]) expect(parseVillage(bad)).toBeNull();
    expect(parseVillageSave("{")).toBeNull();
    expect(parseVillageSave(null)).toBeNull();
    for (const code of ["", "V2.", "V2.@@@", "V1.abcd", "hello", `V2.${"A".repeat(7000)}`]) expect(parseVillageCode(code)).toBeNull();
    expect(TERRAINS).toHaveLength(5);
  });
});
