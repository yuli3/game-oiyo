import { describe, it, expect } from "vitest";
import {
  createDungeonFloor,
  moveDungeonPlayer,
  useDungeonPotion,
} from "./dungeon-crawler";

describe("Dungeon Crawler 3D Game Engine", () => {
  it("initializes a valid dungeon floor with player at (1, 1)", () => {
    const state = createDungeonFloor(1);
    expect(state.playerX).toBe(1);
    expect(state.playerZ).toBe(1);
    expect(state.hp).toBe(100);
    expect(state.floor).toBe(1);
    expect(state.enemies.length).toBeGreaterThan(0);
    expect(state.gameOver).toBe(false);
  });

  it("blocks movement into perimeter wall", () => {
    const state = createDungeonFloor(1);
    // Player is at (1, 1), moving left (-1, 0) goes to (0, 1) which is a perimeter wall
    const next = moveDungeonPlayer(state, -1, 0);
    expect(next.playerX).toBe(1);
    expect(next.playerZ).toBe(1);
  });

  it("updates player facing direction on move attempt", () => {
    const state = createDungeonFloor(1);
    const facingEast = moveDungeonPlayer(state, 1, 0);
    expect(facingEast.playerFacing).toBe(1); // East

    const facingSouth = moveDungeonPlayer(state, 0, 1);
    expect(facingSouth.playerFacing).toBe(2); // South
  });

  it("engages in combat when moving into an enemy tile", () => {
    const state = createDungeonFloor(1);
    // Position an enemy right next to player at (2, 1)
    state.map[1][2] = 0; // ensure floor
    state.enemies = [
      {
        id: "target-slime",
        type: "slime",
        x: 2,
        z: 1,
        hp: 20,
        maxHp: 20,
        attack: 10,
        isDead: false,
      },
    ];

    const afterAttack = moveDungeonPlayer(state, 1, 0);
    // Enemy had 20 HP, player does 30 attack -> enemy should be killed!
    expect(afterAttack.enemies[0].isDead).toBe(true);
    expect(afterAttack.kills).toBe(1);
    expect(afterAttack.gold).toBe(50);
  });

  it("takes counter-attack damage if enemy survives", () => {
    const state = createDungeonFloor(1);
    state.map[1][2] = 0;
    state.enemies = [
      {
        id: "tank-skeleton",
        type: "skeleton",
        x: 2,
        z: 1,
        hp: 100, // survives player attack of 30
        maxHp: 100,
        attack: 20,
        isDead: false,
      },
    ];

    const afterAttack = moveDungeonPlayer(state, 1, 0);
    expect(afterAttack.enemies[0].isDead).toBe(false);
    expect(afterAttack.enemies[0].hp).toBe(70);
    // Player has 100 HP, takes 20 - 5 defense = 15 damage
    expect(afterAttack.hp).toBe(85);
  });

  it("drinks health potion to restore HP", () => {
    let state = createDungeonFloor(1);
    state.hp = 40;
    state.potions = 2;

    state = useDungeonPotion(state);
    expect(state.hp).toBe(85);
    expect(state.potions).toBe(1);
  });

  it("picks up chests and loots gold", () => {
    const state = createDungeonFloor(1);
    // Put a chest at (1, 2)
    state.map[2][1] = 3; // Chest

    const next = moveDungeonPlayer(state, 0, 1);
    expect(next.playerZ).toBe(2);
    expect(next.gold).toBe(100);
    expect(next.map[2][1]).toBe(0); // tile cleared
  });

  it("reaches exit stairs to clear the floor", () => {
    const state = createDungeonFloor(1);
    state.map[2][1] = 4; // Exit ladder

    const next = moveDungeonPlayer(state, 0, 1);
    expect(next.floorCleared).toBe(true);
  });
});
