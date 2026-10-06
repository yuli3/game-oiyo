import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  BUILDING_IDS,
  COMMAND_IDS,
  EVENT_CHOICES,
  VILLAGE_AP,
  VILLAGE_GRADE_MARKS,
  VILLAGE_TURNS,
  canBuild,
  canChoose,
  canCommand,
  chooseEvent,
  command,
  createVillage,
  endMonth,
  parseVillage,
  parseVillageCode,
  parseVillageSave,
  serializeVillage,
  villageDone,
  villageGrade,
  villageHousing,
  villageSafety,
  villageSaveCode,
  villageScore,
  villageSeason,
  villageStorageCap,
  type BuildingId,
  type CommandId,
  type VillageState,
} from "./village";

const mkRand = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x1_0000_0000; };
const settle = (s: VillageState) => { for (let c = 0; c < 3 && !s.eventDone; c++) s = chooseEvent(s, c); return s; };
/** A month with no event pending, whatever the seed drew. */
const calm = (seed = 1, patch: Partial<VillageState> = {}): VillageState => ({ ...createVillage(seed), event: null, eventDone: true, ...patch });
function play(turn: (s: VillageState, rand: () => number) => VillageState, seed: number) {
  const rand = mkRand(seed * 7 + 1);
  let s = createVillage(seed);
  for (let guard = 0; !villageDone(s) && guard < 100; guard++) s = endMonth(turn(settle(s), rand));
  return s;
}
const repeat = (id: CommandId, build?: BuildingId) => (s: VillageState) => { for (let i = 0; i < VILLAGE_AP; i++) s = command(s, id, build); return s; };

describe("village month", () => {
  it("starts the same for the same seed", () => {
    expect(createVillage(5)).toEqual(createVillage(5));
    expect(createVillage(5).turn).toBe(0);
    expect(villageSeason(0)).toBe(0);
    expect(villageSeason(11)).toBe(3);
    expect(villageSeason(12)).toBe(0);
  });

  it("gives the same next month for the same choices", () => {
    const run = () => { let s = createVillage(42); for (let i = 0; i < 12; i++) s = endMonth(command(command(settle(s), "lumber"), "hunt")); return s; };
    expect(run()).toEqual(run());
  });

  it("blocks commands and the month end while an event waits", () => {
    let seed = 1;
    while (createVillage(seed).eventDone) seed++;
    const s = createVillage(seed);
    expect(canCommand(s, "lumber")).toBe(false);
    expect(command(s, "lumber")).toBe(s);
    expect(endMonth(s)).toBe(s);
    expect(canChoose(s, 0) || canChoose(s, 1) || canChoose(s, 2)).toBe(true);
    const chosen = settle(s);
    expect(chosen.eventDone).toBe(true);
    expect(chooseEvent(chosen, 0)).toBe(chosen);
  });

  it("spends one action point per command and stops at zero", () => {
    let s = calm();
    s = command(s, "lumber");
    expect(s.ap).toBe(2);
    expect(s.wood).toBe(28);
    s = command(command(s, "quarry"), "hunt");
    expect(s.ap).toBe(0);
    expect(command(s, "lumber")).toBe(s);
    expect(endMonth(s).ap).toBe(VILLAGE_AP);
  });

  it("grows nothing in winter and burns firewood", () => {
    const winter = calm(1, { turn: 9, food: 40, wood: 20 });
    expect(canCommand(winter, "tend")).toBe(false);
    const next = endMonth(winter);
    expect(next.report.some((line) => line.k === "harvest")).toBe(false);
    expect(next.report).toContainEqual({ k: "firewood", n: 2 });
    expect(next.food).toBe(40 - winter.pop * 2);
    const cold = endMonth(calm(1, { turn: 9, food: 40, wood: 0 }));
    expect(cold.report).toContainEqual({ k: "cold" });
    expect(cold.fatigue).toBeGreaterThan(winter.fatigue);
  });

  it("makes tending raise the harvest", () => {
    const base = calm(1, { turn: 6, food: 0 });
    const plain = endMonth(base).report.find((line) => line.k === "harvest")!.n!;
    const tended = endMonth(command(command(base, "tend"), "tend")).report.find((line) => line.k === "harvest")!.n!;
    expect(tended).toBe(plain * 2);
  });

  it("loses a villager when the larder is empty, but never the last two", () => {
    const hungry = endMonth(calm(1, { turn: 9, food: 0, pop: 3 }));
    expect(hungry.pop).toBe(2);
    expect(hungry.hungryMonths).toBe(1);
    expect(endMonth({ ...hungry, event: null, eventDone: true, food: 0 }).pop).toBe(2);
  });

  it("pays for a building once and finishes it at its work total", () => {
    let s = calm(1, { wood: 40 });
    expect(canBuild(s, "house")).toBe(true);
    s = command(s, "build", "house");
    expect(s.wood).toBe(20);
    expect(s.project).toEqual({ id: "house", progress: 30 });
    expect(canBuild(s, "field")).toBe(false);
    s = command(s, "build");
    expect(s.project).toBeNull();
    expect(s.buildings.house).toBe(2);
    expect(villageHousing(s)).toBe(6);
    expect(command(calm(1, { wood: 0 }), "build", "house").project).toBeNull();
  });

  it("caps storage and raises the cap with a storehouse", () => {
    let s = calm(1, { wood: 58 });
    expect(villageStorageCap(s)).toBe(60);
    s = command(s, "lumber");
    expect(s.wood).toBe(60);
    expect(villageStorageCap({ ...s, buildings: { ...s.buildings, storehouse: 1 } })).toBe(120);
  });

  it("counts fences and this month's patrols toward safety", () => {
    const s = calm();
    expect(villageSafety(s)).toBe(30);
    expect(villageSafety(command(s, "patrol"))).toBe(40);
    expect(villageSafety({ ...s, buildings: { ...s.buildings, fence: 3 }, patrols: 3 })).toBe(100);
    expect(endMonth(command(s, "patrol")).patrols).toBe(0);
  });

  it("lets a fenced village stand against wolves for less", () => {
    const base = calm(1, { event: "wolves", eventDone: false, food: 30, fatigue: 10 });
    const open = chooseEvent(base, 0);
    const fenced = chooseEvent({ ...base, buildings: { ...base.buildings, fence: 1 } }, 0);
    expect(open.food).toBe(24);
    expect(fenced.food).toBe(30);
    expect(fenced.fatigue).toBeLessThan(open.fatigue);
    expect(chooseEvent(base, 1).food).toBe(18);
  });

  it("refuses an event choice the village cannot pay for", () => {
    const trader = calm(1, { event: "trader", eventDone: false, wood: 5, gold: 3 });
    expect(canChoose(trader, 0)).toBe(false);
    expect(canChoose(trader, 1)).toBe(false);
    expect(chooseEvent(trader, 0)).toBe(trader);
    expect(chooseEvent(trader, 2).eventDone).toBe(true);
    const full = calm(1, { event: "traveler", eventDone: false, pop: 4 });
    expect(canChoose(full, 0)).toBe(false);
    expect(chooseEvent(full, 1).gold).toBe(full.gold + 5);
  });

  it("ends after thirty-six months and then stays put", () => {
    const done = play((s) => s, 3);
    expect(done.turn).toBe(VILLAGE_TURNS);
    expect(villageDone(done)).toBe(true);
    expect(endMonth(done)).toBe(done);
    expect(command(done, "lumber")).toBe(done);
  });
});

describe("village balance", () => {
  it("survives a thousand random games with every number in range", () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const done = play((s, rand) => {
        for (let i = 0; i < 6; i++) s = command(s, COMMAND_IDS[Math.floor(rand() * COMMAND_IDS.length)], BUILDING_IDS[Math.floor(rand() * BUILDING_IDS.length)]);
        return s;
      }, seed);
      expect(done.turn).toBe(VILLAGE_TURNS);
      expect(parseVillage(JSON.parse(serializeVillage(done)))).toEqual(done);
      expect(Number.isFinite(villageScore(done))).toBe(true);
    }
  });

  it("does not hand the top grade, or even the middle one, to a single repeated command", () => {
    const lines: Array<[CommandId, BuildingId?]> = [["tend"], ["lumber"], ["quarry"], ["hunt"], ["patrol"], ["feast"], ["build", "field"], ["build", "house"]];
    for (const [id, build] of lines) {
      for (let seed = 1; seed <= 60; seed++) expect(villageScore(play(repeat(id, build), seed))).toBeLessThan(VILLAGE_GRADE_MARKS[0]);
    }
  });

  it("starves a village whose chief does nothing", () => {
    let hungry = 0;
    for (let seed = 1; seed <= 60; seed++) hungry += play((s) => s, seed).hungryMonths;
    expect(hungry / 60).toBeGreaterThan(3);
  });

  it("lets a sensible build order reach the top grade", () => {
    const sensible = (s: VillageState) => {
      const winter = villageSeason(s.turn) === 3;
      for (let i = 0; i < VILLAGE_AP; i++) {
        const order: BuildingId[] = [];
        if (s.pop >= villageHousing(s)) order.push("house");
        if (s.buildings.lumberCamp < 1) order.push("lumberCamp");
        if (s.buildings.field < Math.min(BUILDINGS.field.max, s.pop * 2)) order.push("field");
        order.push("house", "field", "storehouse", "fence", "quarry");
        const want = s.project ? undefined : order.find((id) => canBuild(s, id));
        if (s.fatigue > 60 && canCommand(s, "feast")) s = command(s, "feast");
        else if (winter && s.food < s.pop * 6) s = command(s, "hunt");
        else if (s.project) s = command(s, "build");
        else if (want) s = command(s, "build", want);
        else if (canCommand(s, "tend") && s.tended < 2) s = command(s, "tend");
        else if (s.wood < 30) s = command(s, "lumber");
        else if (s.stone < 12) s = command(s, "quarry");
        else s = command(s, "hunt");
      }
      return s;
    };
    let top = 0;
    for (let seed = 1; seed <= 100; seed++) if (villageGrade(villageScore(play(sensible, seed))) === 2) top++;
    expect(top).toBeGreaterThan(20);
    expect(top).toBeLessThan(100);
  });
});

describe("village save", () => {
  it("round-trips the save and the save code", () => {
    let s = createVillage(77);
    for (let i = 0; i < 7; i++) s = endMonth(command(command(settle(s), "lumber"), "build", "field"));
    s = command(settle(s), "patrol");
    expect(parseVillageSave(serializeVillage(s))).toEqual(s);
    const code = villageSaveCode(s);
    expect(code).toMatch(/^V1\.[A-Za-z0-9_-]+$/);
    expect(parseVillageCode(`  ${code}\n`)).toEqual({ ...s, report: [] });
    expect(endMonth(parseVillageCode(code)!)).toEqual({ ...endMonth(s) });
  });

  it("rejects a broken, foreign or out-of-range save without throwing", () => {
    const good = JSON.parse(serializeVillage(calm(4)));
    for (const bad of [
      null, [], "x", { ...good, v: 2 }, { ...good, food: -1 }, { ...good, food: 1e9 }, { ...good, wood: 2.5 },
      { ...good, pop: 0 }, { ...good, pop: 99 }, { ...good, ap: 4 }, { ...good, ap: 3, tended: 2 }, { ...good, turn: 37 },
      { ...good, buildings: { ...good.buildings, field: 13 } }, { ...good, buildings: null }, { ...good, harvestMod: 9 },
      { ...good, event: "meteor", eventDone: false }, { ...good, event: null, eventDone: false },
      { ...good, project: { id: "castle", progress: 1 } }, { ...good, project: { id: "house", progress: 400 } },
    ]) expect(parseVillage(bad)).toBeNull();
    expect(parseVillageSave("{")).toBeNull();
    expect(parseVillageSave(null)).toBeNull();
    for (const code of ["", "V1.", "V1.@@@", "V2.abcd", "hello", `V1.${"A".repeat(5000)}`]) expect(parseVillageCode(code)).toBeNull();
  });

  it("keeps event choice counts in step with what the engine accepts", () => {
    for (const [id, count] of Object.entries(EVENT_CHOICES)) {
      const s = calm(1, { event: id as VillageState["event"], eventDone: false, wood: 50, gold: 50, food: 50, pop: 3 });
      for (let c = 0; c < count; c++) expect(canChoose(s, c)).toBe(true);
      expect(canChoose(s, count)).toBe(false);
    }
  });
});
