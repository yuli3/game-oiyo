import { describe, it, expect } from "vitest";
import {
  MinerRng,
  generateMinerWorld,
  createMinerGame,
  stepMiner,
  MINER_WORLD_WIDTH,
  MINER_WORLD_DEPTH,
  BlockType,
  getBlockIndex,
  getUpgradeCost,
} from "./dot-miner";

describe("DotMiner Engine", () => {
  describe("MinerRng (Deterministic PRNG)", () => {
    it("produces identical sequences for identical seeds", () => {
      const rng1 = new MinerRng(123456);
      const rng2 = new MinerRng(123456);

      const seq1 = [rng1.next(), rng1.range(1, 10), rng1.range(50, 100)];
      const seq2 = [rng2.next(), rng2.range(1, 10), rng2.range(50, 100)];

      expect(seq1).toEqual(seq2);
    });

    it("respects range boundaries", () => {
      const rng = new MinerRng(8888);
      for (let i = 0; i < 50; i++) {
        const val = rng.range(10, 20);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
      }
    });
  });

  describe("Subterranean World Generation", () => {
    it("generates surface entrance and subterranean strata", () => {
      const rng = new MinerRng(777);
      const { blocks, blockDamage } = generateMinerWorld(rng);

      // Check dimensions
      expect(blocks.length).toBe(MINER_WORLD_WIDTH * MINER_WORLD_DEPTH);
      expect(blockDamage.length).toBe(blocks.length);

      // Surface sky and grass
      expect(blocks[getBlockIndex(0, 0)]).toBe(BlockType.Air);
      expect(blocks[getBlockIndex(5, 1)]).toBe(BlockType.SurfaceGrass);

      // Surface entrance at x=15,16
      expect(blocks[getBlockIndex(15, 1)]).toBe(BlockType.Air);
      expect(blocks[getBlockIndex(15, 2)]).toBe(BlockType.Air);

      // Deep obsidian zone (y >= 120)
      let foundDeepRock = false;
      for (let y = 120; y < MINER_WORLD_DEPTH; y++) {
        for (let x = 0; x < MINER_WORLD_WIDTH; x++) {
          const b = blocks[getBlockIndex(x, y)];
          if (b === BlockType.Obsidian || b === BlockType.Granite) {
            foundDeepRock = true;
            break;
          }
        }
      }
      expect(foundDeepRock).toBe(true);
    });

    it("guarantees the Ancient Core Star at deep abyss", () => {
      const rng = new MinerRng(999);
      const { blocks } = generateMinerWorld(rng);

      const coreStarFound = blocks.some((b) => b === BlockType.CoreStar);
      expect(coreStarFound).toBe(true);
    });
  });

  describe("Miner Movement, Drilling & Cargo", () => {
    it("moves freely into air and consumes light fuel", () => {
      const game = createMinerGame(100);
      // Place miner underground at y=5 so surface refuel does not reset fuel
      game.x = 15;
      game.y = 5;
      game.blocks[getBlockIndex(15, 6)] = BlockType.Air;

      const initialFuel = game.fuel;
      const { state, events } = stepMiner(game, { type: "move", dir: "down" });

      expect(events.moved).toBe(true);
      expect(state.y).toBe(6);
      expect(state.fuel).toBeLessThan(initialFuel);
    });

    it("drills soft dirt and breaks it into air", () => {
      const game = createMinerGame(200);
      game.x = 10;
      game.y = 10;
      const targetIdx = getBlockIndex(10, 11);
      game.blocks[targetIdx] = BlockType.Dirt;
      game.blockDamage[targetIdx] = 1;

      const { state, events } = stepMiner(game, { type: "move", dir: "down" });

      expect(events.drilled).toBe(true);
      expect(events.brokeBlock).toBe(true);
      expect(state.blocks[targetIdx]).toBe(BlockType.Air);
      expect(state.y).toBe(11);
    });

    it("mines gold ore, adds to cargo, and sells at surface", () => {
      const game = createMinerGame(300);
      game.x = 10;
      game.y = 10;
      const targetIdx = getBlockIndex(10, 11);
      game.blocks[targetIdx] = BlockType.Gold;
      game.blockDamage[targetIdx] = 1;

      // Dig gold
      const { state: dugState, events } = stepMiner(game, { type: "move", dir: "down" });
      expect(events.collectedOre).toBe(true);
      expect(dugState.cargo.length).toBe(1);
      expect(dugState.cargo[0].name).toContain("Gold");

      // Move miner back to surface y=2
      dugState.y = 2;
      const { state: surfaceState, events: surfEvents } = stepMiner(dugState, { type: "move", dir: "up" });
      expect(surfEvents.refueledAtSurface).toBe(true);
      expect(surfaceState.cash).toBeGreaterThanOrEqual(400); // Gold sold
      expect(surfaceState.cargo.length).toBe(0); // Cargo cleared
      expect(surfaceState.fuel).toBe(surfaceState.maxFuel); // Refueled
    });

    it("handles hazard damage from lava and boulders", () => {
      const game = createMinerGame(400);
      game.x = 10;
      game.y = 10;
      const lavaIdx = getBlockIndex(10, 11);
      game.blocks[lavaIdx] = BlockType.Lava;

      const { state, events } = stepMiner(game, { type: "move", dir: "down" });
      expect(events.tookDamage).toBe(true);
      expect(state.hull).toBe(75); // 100 - 25
      expect(state.y).toBe(10); // Didn't move into lava
    });

    it("handles boulder falling physics when directly above", () => {
      const game = createMinerGame(500);
      game.x = 10;
      game.y = 10;
      // Moving right to (11, 10) where (11, 9) has a boulder
      game.blocks[getBlockIndex(11, 10)] = BlockType.Air;
      game.blocks[getBlockIndex(11, 9)] = BlockType.Boulder;

      const { state, events } = stepMiner(game, { type: "move", dir: "right" });

      expect(events.boulderFell).toBe(true);
      expect(events.tookDamage).toBe(true);
      expect(state.hull).toBe(60); // 100 - 40
    });
  });

  describe("Upgrades & Economy", () => {
    it("allows purchasing drill and fuel upgrades when having enough cash", () => {
      const game = createMinerGame(600);
      game.cash = 500;

      const cost = getUpgradeCost("drill", 1);
      const { state } = stepMiner(game, { type: "upgrade", upgradeType: "drill" });

      expect(state.upgrades.drill).toBe(2);
      expect(state.cash).toBe(500 - cost);
    });
  });

  describe("Victory Condition", () => {
    it("triggers victory when returning to surface with Core Star", () => {
      const game = createMinerGame(700);
      game.hasCoreStar = true;
      game.x = 15;
      game.y = 3;

      // Move up to y=2 (surface)
      const { state, events } = stepMiner(game, { type: "move", dir: "up" });

      expect(events.victory).toBe(true);
      expect(state.status).toBe("victory");
      expect(state.cash).toBeGreaterThanOrEqual(10000);
    });
  });

  describe("Monte Carlo Determinism Audit", () => {
    it("maintains 100% deterministic state progression", () => {
      const seed = 43210;
      const actions: ("down" | "left" | "right" | "up")[] = [
        "down", "down", "right", "left", "down", "right", "right", "down",
      ];

      let stateA = createMinerGame(seed);
      let stateB = createMinerGame(seed);

      for (const act of actions) {
        stateA = stepMiner(stateA, { type: "move", dir: act }).state;
        stateB = stepMiner(stateB, { type: "move", dir: act }).state;
      }

      expect(stateA.turns).toBe(stateB.turns);
      expect(stateA.fuel).toBe(stateB.fuel);
      expect(stateA.hull).toBe(stateB.hull);
      expect(stateA.x).toBe(stateB.x);
      expect(stateA.y).toBe(stateB.y);
      expect(stateA.cash).toBe(stateB.cash);
      expect(stateA.cargo.length).toBe(stateB.cargo.length);
    });
  });
});
