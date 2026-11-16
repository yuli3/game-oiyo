import { describe, expect, it } from "vitest";
import { PALETTE, SPRITES, layoutSheet, renderSheetRGBA, validateArt } from "./hanyang-timeslip-art";
import {
  FIELD_MAPS,
  NPCS,
  PHYSICS,
  SHIFT_SIZE,
  SWORD_COST,
  TILE,
  TOWN_MAP,
  TOWN_RETURN,
  TOWN_START,
  expToNext,
} from "./hanyang-timeslip-config";
import {
  canWalk,
  createField,
  createGame,
  createTown,
  faint,
  fromSave,
  gainExp,
  generateShift,
  heroAttack,
  interact,
  isCorrectCall,
  nextRandom,
  restAtInn,
  riftOpen,
  settleShift,
  stepField,
  stepTown,
  toSave,
  upgradeSword,
  violationOf,
  type FieldInput,
  type FieldState,
  type Game,
} from "./hanyang-timeslip";

const IDLE: FieldInput = { left: false, right: false, jumpHeld: false, jumpPressed: false, attackPressed: false };

/** A simple bot: walk right, swing constantly, jump at walls, pits and nearby mobs. */
function botInput(field: FieldState, frame: number): FieldInput {
  const h = field.hero;
  const aheadX = Math.floor((h.x + h.w + 6) / TILE);
  const footY = Math.floor((h.y + h.h + 2) / TILE);
  const wall = ["#", "r"].includes(field.grid[Math.floor((h.y + 4) / TILE)]?.[aheadX] ?? ".");
  const pit = (field.grid[footY]?.[aheadX] ?? ".") === "." && h.onGround;
  const jump = wall || pit;
  return { left: false, right: true, jumpHeld: jump || !h.onGround, jumpPressed: jump && frame % 6 === 0, attackPressed: frame % 10 === 0 };
}

function run(game: Game, field: FieldState, seconds: number, input: (f: FieldState, frame: number) => FieldInput) {
  const events = [];
  const frames = Math.round(seconds / PHYSICS.step);
  for (let i = 0; i < frames && !field.done; i++) events.push(...stepField(game, field, input(field, i), PHYSICS.step));
  return events;
}

describe("hanyang timeslip art", () => {
  it("every sprite is a full grid of known palette letters", () => {
    expect(() => validateArt()).not.toThrow();
    expect(Object.keys(PALETTE).length).toBeGreaterThanOrEqual(20);
  });

  it("packs sprites without overlap and renders opaque pixels", () => {
    const { frames, width, height } = layoutSheet();
    const seen = new Set<string>();
    for (const f of Object.values(frames)) {
      for (let y = f.y; y < f.y + f.h; y += 16) for (let x = f.x; x < f.x + f.w; x += 16) {
        const key = `${x},${y}`;
        expect(seen.has(key), key).toBe(false);
        seen.add(key);
      }
      expect(f.x + f.w).toBeLessThanOrEqual(width);
      expect(f.y + f.h).toBeLessThanOrEqual(height);
    }
    const sheet = renderSheetRGBA();
    let opaque = 0;
    for (let i = 3; i < sheet.data.length; i += 4) if (sheet.data[i] === 255) opaque++;
    expect(opaque).toBeGreaterThan(Object.keys(SPRITES).length * 40);
  });
});

describe("hanyang timeslip town", () => {
  it("map is a closed 20×16 grid with every NPC and spawn on open ground", () => {
    expect(TOWN_MAP).toHaveLength(16);
    for (const row of TOWN_MAP) expect(row).toHaveLength(20);
    const game = createGame(1);
    for (const at of [TOWN_START, ...Object.values(TOWN_RETURN)]) expect(canWalk(at.tx, at.ty, game.progress), `${at.tx},${at.ty}`).toBe(true);
    for (const npc of NPCS) expect(".,=_".includes(TOWN_MAP[npc.ty][npc.tx]), npc.id).toBe(true);
  });

  it("walks tile by tile, faces NPCs and keeps the rift closed until two shards", () => {
    const game = createGame(1);
    const town = createTown({ tx: 4, ty: 6 }, "down");
    stepTown(town, "up", 0, game.progress);
    expect(town.move).toBeNull(); // innkeeper blocks the way
    expect(interact(town)).toEqual({ kind: "npc", id: "innkeeper" });
    stepTown(town, "right", 0, game.progress);
    expect(town.tx).toBe(5);
    stepTown(town, null, 1, game.progress);
    expect(town.move).toBeNull();

    expect(canWalk(6, 12, game.progress)).toBe(false);
    game.progress.forest = true;
    game.progress.gate = true;
    expect(riftOpen(game.progress)).toBe(true);
    expect(canWalk(6, 12, game.progress)).toBe(true);
  });

  it("stepping on the south road enters the forest", () => {
    const game = createGame(1);
    const town = createTown({ tx: 8, ty: 14 }, "down");
    stepTown(town, "down", 0, game.progress);
    const events = stepTown(town, null, 1, game.progress);
    expect(events).toContainEqual({ type: "enter", field: "forest" });
  });
});

describe("hanyang timeslip fields", () => {
  it("field maps are rectangular with ground under every start", () => {
    for (const [id, map] of Object.entries(FIELD_MAPS)) {
      const width = map[0].length;
      for (const row of map) expect(row.length, id).toBe(width);
      const field = createField(id as "forest" | "rift");
      expect(field.mobs.length).toBeGreaterThan(0);
    }
  });

  it("hero falls onto the ground and stands there", () => {
    const game = createGame(3);
    const field = createField("forest");
    for (let i = 0; i < 60; i++) stepField(game, field, IDLE, PHYSICS.step);
    expect(field.hero.onGround).toBe(true);
    expect(field.hero.y + field.hero.h).toBeCloseTo(7 * TILE, 3);
  });

  it("the forest can be cleared by a simple bot (solvable)", () => {
    const game = createGame(7);
    game.hero.level = 6;
    game.hero.maxHp = 200;
    game.hero.hp = 200;
    const field = createField("forest");
    const events = run(game, field, 90, botInput);
    expect(events.some((e) => e.type === "goal")).toBe(true);
    expect(game.progress.forest).toBe(true);
    expect(game.hero.kills).toBeGreaterThan(0);
  });

  it("is deterministic: same seed and inputs give the same world", () => {
    const a = createGame(42);
    const b = createGame(42);
    const fa = createField("forest");
    const fb = createField("forest");
    run(a, fa, 20, botInput);
    run(b, fb, 20, botInput);
    expect(fa.hero.x).toBe(fb.hero.x);
    expect(a.hero).toEqual(b.hero);
    expect(a.rng).toBe(b.rng);
  });

  it("the boss can be beaten and gives the last shard", () => {
    const game = createGame(9);
    game.hero.level = 10;
    game.hero.maxHp = 400;
    game.hero.hp = 400;
    game.hero.sword = 3;
    const field = createField("rift");
    // Stand still and swing toward the boss; it walks into the blade.
    const events = run(game, field, 120, (f, i) => ({ ...IDLE, right: f.hero.face < 0 && i % 30 === 0, attackPressed: i % 12 === 0 }));
    expect(events.some((e) => e.type === "boss-dead")).toBe(true);
    expect(events.some((e) => e.type === "summon")).toBe(true);
    expect(game.progress.rift).toBe(true);
  });

  it("an idle hero is eventually defeated by the boss", () => {
    const game = createGame(5);
    const field = createField("rift");
    const events = run(game, field, 120, () => IDLE);
    expect(events.some((e) => e.type === "defeat")).toBe(true);
    expect(game.hero.hp).toBe(0);
  });
});

describe("hanyang timeslip hero", () => {
  it("levels up with full heal and growing thresholds", () => {
    const game = createGame(1);
    game.hero.hp = 3;
    const levels = gainExp(game.hero, expToNext(1) + expToNext(2));
    expect(levels).toEqual([2, 3]);
    expect(game.hero.hp).toBe(game.hero.maxHp);
    expect(expToNext(5)).toBeGreaterThan(expToNext(4));
  });

  it("smithy, inn and fainting move coins as promised", () => {
    const game = createGame(1);
    const atk = heroAttack(game.hero);
    expect(upgradeSword(game.hero)).toBe("poor");
    game.hero.coins = SWORD_COST[0] + 10;
    expect(upgradeSword(game.hero)).toBe("ok");
    expect(heroAttack(game.hero)).toBeGreaterThan(atk);
    expect(game.hero.coins).toBe(10);
    expect(restAtInn(game.hero)).toBe("full");
    game.hero.hp = 1;
    expect(restAtInn(game.hero)).toBe("ok");
    expect(game.hero.coins).toBe(5);
    game.hero.coins = 0;
    game.hero.hp = 1;
    expect(restAtInn(game.hero)).toBe("ok"); // nobody is turned away
    game.hero.coins = 100;
    expect(faint(game.hero)).toBe(20);
    expect(game.hero.hp).toBe(game.hero.maxHp);
  });
});

describe("hanyang timeslip gate", () => {
  it("every generated violation is visible and judged correctly", () => {
    for (let seed = 0; seed < 300; seed++) {
      for (let shift = 0; shift < 4; shift++) {
        const s = generateShift(seed, shift);
        expect(s.travelers).toHaveLength(SHIFT_SIZE);
        for (const t of s.travelers) {
          expect(violationOf(t, s)).toBe(t.violation);
          expect(isCorrectCall(t, s, t.violation === null)).toBe(true);
          expect(isCorrectCall(t, s, t.violation !== null)).toBe(false);
        }
        expect(s.travelers[0].violation === null || shift > 0).toBe(true);
      }
    }
  });

  it("shifts vary and contain both honest and dishonest travellers overall", () => {
    const sigs = new Set<string>();
    let honest = 0;
    let liars = 0;
    for (let seed = 0; seed < 500; seed++) {
      const s = generateShift(seed, 2);
      sigs.add(JSON.stringify(s.travelers));
      for (const t of s.travelers) (t.violation ? liars++ : honest++);
    }
    expect(sigs.size / 500).toBeGreaterThan(0.95);
    expect(honest).toBeGreaterThan(500);
    expect(liars).toBeGreaterThan(500);
  });

  it("pays per correct call and grants the shard once at 4/5", () => {
    const game = createGame(1);
    expect(settleShift(game, 3).earnedShard).toBe(false);
    const r = settleShift(game, 5);
    expect(r.earnedShard).toBe(true);
    expect(r.perfect).toBe(true);
    expect(settleShift(game, 5).earnedShard).toBe(false);
    expect(game.progress.shifts).toBe(3);
    expect(game.progress.gateCorrect).toBe(13);
  });
});

describe("hanyang timeslip save", () => {
  it("round-trips and rejects junk", () => {
    const game = createGame(77);
    nextRandom(game);
    game.hero.coins = 12;
    game.progress.forest = true;
    const back = fromSave(JSON.stringify(toSave(game)));
    expect(back).toEqual(game);
    expect(fromSave(null)).toBeNull();
    expect(fromSave("{")).toBeNull();
    expect(fromSave(JSON.stringify({ v: 2 }))).toBeNull();
    expect(fromSave(JSON.stringify({ ...toSave(game), hero: { ...game.hero, coins: -1 } }))).toBeNull();
  });
});
