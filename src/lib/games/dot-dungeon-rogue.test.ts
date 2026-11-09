import { describe, it, expect } from "vitest";
import {
  RogueRng,
  generateDungeonMap,
  computeFov,
  createDungeonGame,
  stepDungeonTurn,
  DUNGEON_WIDTH,
  DUNGEON_HEIGHT,
  MAX_DEPTH,
  TileType,
  getTileIndex,
  isInsideMap,
} from "./dot-dungeon-rogue";

describe("DotDungeonRogue Engine", () => {
  describe("RogueRng (Deterministic Seeded PRNG)", () => {
    it("produces identical random sequences for identical seeds", () => {
      const rng1 = new RogueRng(424242);
      const rng2 = new RogueRng(424242);

      const seq1 = [rng1.next(), rng1.range(1, 10), rng1.range(50, 100)];
      const seq2 = [rng2.next(), rng2.range(1, 10), rng2.range(50, 100)];

      expect(seq1).toEqual(seq2);
    });

    it("respects range boundaries", () => {
      const rng = new RogueRng(9999);
      for (let i = 0; i < 100; i++) {
        const val = rng.range(5, 12);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(12);
      }
    });
  });

  describe("Procedural Dungeon Generation", () => {
    it("generates a valid map with connected path between player and stairs", () => {
      const rng = new RogueRng(12345);
      const { tiles, playerStart, stairsPos, rooms } = generateDungeonMap(rng, 1);

      expect(rooms.length).toBeGreaterThanOrEqual(1);
      expect(tiles[getTileIndex(playerStart.x, playerStart.y)]).toBe(TileType.Floor);
      expect(tiles[getTileIndex(stairsPos.x, stairsPos.y)]).toBe(TileType.StairsDown);

      // BFS pathfinding from playerStart to stairsPos to guarantee connectivity
      const queue: { x: number; y: number }[] = [playerStart];
      const visited = new Set<number>();
      visited.add(getTileIndex(playerStart.x, playerStart.y));
      let reachedStairs = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr.x === stairsPos.x && curr.y === stairsPos.y) {
          reachedStairs = true;
          break;
        }

        const neighbors = [
          { x: curr.x + 1, y: curr.y },
          { x: curr.x - 1, y: curr.y },
          { x: curr.x, y: curr.y + 1 },
          { x: curr.x, y: curr.y - 1 },
        ];

        for (const n of neighbors) {
          if (isInsideMap(n.x, n.y)) {
            const idx = getTileIndex(n.x, n.y);
            if (!visited.has(idx) && tiles[idx] !== TileType.Wall) {
              visited.add(idx);
              queue.push(n);
            }
          }
        }
      }

      expect(reachedStairs).toBe(true);
    });

    it("spawns the Ancient Dragon Boss on MAX_DEPTH", () => {
      const rng = new RogueRng(777);
      const { monsters } = generateDungeonMap(rng, MAX_DEPTH);
      const dragon = monsters.find((m) => m.type === "dragon");
      expect(dragon).toBeDefined();
      expect(dragon?.hp).toBe(120);
    });
  });

  describe("Field of View (FOV) & Fog-of-War", () => {
    it("reveals tiles around player and updates explored memory", () => {
      const tiles = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(TileType.Floor);
      const visible = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);
      const explored = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);

      computeFov(10, 10, tiles, visible, explored, 5);

      const pIdx = getTileIndex(10, 10);
      expect(visible[pIdx]).toBe(true);
      expect(explored[pIdx]).toBe(true);

      // Adjacent floor should be visible
      expect(visible[getTileIndex(11, 10)]).toBe(true);
      expect(visible[getTileIndex(10, 11)]).toBe(true);
    });

    it("stops light rays at walls", () => {
      const tiles = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(TileType.Floor);
      // Place a solid wall column at x=12
      for (let y = 0; y < DUNGEON_HEIGHT; y++) {
        tiles[getTileIndex(12, y)] = TileType.Wall;
      }

      const visible = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);
      const explored = new Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(false);

      computeFov(10, 10, tiles, visible, explored, 6);

      // Wall at x=12 is visible
      expect(visible[getTileIndex(12, 10)]).toBe(true);
      // Tile behind wall at x=13 should NOT be visible
      expect(visible[getTileIndex(13, 10)]).toBe(false);
    });
  });

  describe("Turn Resolution & Combat", () => {
    it("handles wait action and advances turn counter", () => {
      const game = createDungeonGame(123);
      const initialTurn = game.turn;

      const { state } = stepDungeonTurn(game, { type: "move", dir: "wait" });
      expect(state.turn).toBe(initialTurn + 1);
    });

    it("handles bump combat, monster damage, and item loot", () => {
      const game = createDungeonGame(456);
      // Force a monster directly to the right of the player
      const targetX = game.player.x + 1;
      const targetY = game.player.y;
      game.tiles[getTileIndex(targetX, targetY)] = TileType.Floor;
      game.monsters = [
        {
          id: "test-mob",
          type: "slime",
          name: "Test Slime",
          symbol: "s",
          color: "#00E436",
          x: targetX,
          y: targetY,
          hp: 10,
          maxHp: 10,
          atk: 2,
          def: 1,
          xpReward: 50,
        },
      ];

      // Bump attack right!
      const { state: afterAttack, events } = stepDungeonTurn(game, { type: "move", dir: "right" });
      expect(events.attacked).toBe(true);
      // Player atk (12) - def (1) = 11 damage >= 10 HP => dead!
      expect(afterAttack.monstersSlain).toBe(1);
      // 50 XP gained with 40 needed for level up => level 2 reached, 10 XP carried over!
      expect(afterAttack.player.level).toBe(2);
      expect(afterAttack.player.xp).toBe(10);
    });

    it("handles consumable items (healing potion and strength elixir)", () => {
      const game = createDungeonGame(888);
      game.player.hp = 20;
      game.player.maxHp = 60;
      game.player.inventory = [
        {
          id: "pot-1",
          type: "potion_heal",
          name: "Health Potion",
          symbol: "!",
          color: "#FF004D",
          x: -1,
          y: -1,
          value: 30,
        },
        {
          id: "pot-2",
          type: "potion_str",
          name: "Strength Elixir",
          symbol: "!",
          color: "#FFA300",
          x: -1,
          y: -1,
          value: 5,
        },
      ];

      // Drink healing potion
      const { state: afterHeal } = stepDungeonTurn(game, { type: "use_item", itemIndex: 0 });
      expect(afterHeal.player.hp).toBe(50);
      expect(afterHeal.player.inventory.length).toBe(1);

      // Drink strength elixir
      const baseAtk = afterHeal.player.atk;
      const { state: afterStr } = stepDungeonTurn(afterHeal, { type: "use_item", itemIndex: 0 });
      expect(afterStr.player.atk).toBe(baseAtk + 5);
      expect(afterStr.player.inventory.length).toBe(0);
    });

    it("supports stairs descent and triggers victory on depth 5", () => {
      const game = createDungeonGame(999);
      game.player.depth = MAX_DEPTH;
      const stairsX = game.player.x + 1;
      const stairsY = game.player.y;
      game.tiles[getTileIndex(stairsX, stairsY)] = TileType.StairsDown;
      game.monsters = []; // Clear monsters for clean step

      const { state: victoryState, events } = stepDungeonTurn(game, { type: "move", dir: "right" });
      expect(events.victory).toBe(true);
      expect(victoryState.status).toBe("victory");
    });

    it("handles player death and game over condition", () => {
      const game = createDungeonGame(111);
      game.player.hp = 1;
      game.player.def = 0;
      // Put a strong monster right next to player
      game.monsters = [
        {
          id: "killer-orc",
          type: "orc",
          name: "Killer Orc",
          symbol: "o",
          color: "#FF004D",
          x: game.player.x,
          y: game.player.y - 1,
          hp: 100,
          maxHp: 100,
          atk: 25,
          def: 5,
          xpReward: 100,
        },
      ];

      // Player waits, monster attacks and kills player
      const { state: deadState, events } = stepDungeonTurn(game, { type: "move", dir: "wait" });
      expect(events.gameover).toBe(true);
      expect(deadState.status).toBe("gameover");
      expect(deadState.player.hp).toBe(0);
    });
  });

  describe("Monte Carlo Determinism Audit", () => {
    it("runs 50 turns deterministically given fixed action sequence", () => {
      const seed = 54321;
      const actions: ("up" | "down" | "left" | "right" | "wait")[] = [
        "up", "right", "right", "wait", "down", "left", "wait", "up", "right", "down",
      ];

      let stateA = createDungeonGame(seed);
      let stateB = createDungeonGame(seed);

      for (let t = 0; t < actions.length; t++) {
        const action = { type: "move" as const, dir: actions[t] };
        stateA = stepDungeonTurn(stateA, action).state;
        stateB = stepDungeonTurn(stateB, action).state;
      }

      expect(stateA.turn).toBe(stateB.turn);
      expect(stateA.player.hp).toBe(stateB.player.hp);
      expect(stateA.player.x).toBe(stateB.player.x);
      expect(stateA.player.y).toBe(stateB.player.y);
      expect(stateA.score).toBe(stateB.score);
      expect(stateA.monstersSlain).toBe(stateB.monstersSlain);
    });
  });
});
