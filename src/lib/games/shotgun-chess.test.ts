import { describe, it, expect } from "vitest";
import {
  initShotgunChess,
  getValidKingMoves,
  movePlayerKing,
  shootShotgun,
  applyUpgrade,
} from "./shotgun-chess";

describe("Shotgun Chess Core Engine", () => {
  it("initializes floor 1 game state with player king, shotgun, and white pieces", () => {
    const game = initShotgunChess(1);
    expect(game.floor).toBe(1);
    expect(game.player.r).toBe(7);
    expect(game.player.c).toBe(4);
    expect(game.shotgun.ammo).toBe(2);
    expect(game.status).toBe("playing");
    expect(game.pieces.length).toBeGreaterThan(5);

    const whiteKing = game.pieces.find((p) => p.type === "king");
    expect(whiteKing).toBeDefined();
    expect(whiteKing?.color).toBe("white");
  });

  it("calculates valid king movement within bounds", () => {
    const game = initShotgunChess(1);
    const moves = getValidKingMoves(game);
    expect(moves.length).toBe(5); // At (7, 4), can move to (6,3), (6,4), (6,5), (7,3), (7,5)
    expect(moves.every((m) => m.r >= 0 && m.r < 8 && m.c >= 0 && m.c < 8)).toBe(true);
  });

  it("moves king to adjacent tile and reloads 1 shell up to maxAmmo", () => {
    let game = initShotgunChess(1);
    // Expend 1 ammo first
    game.shotgun.ammo = 1;

    game = movePlayerKing(game, { r: 6, c: 4 });
    expect(game.player.r).toBe(6);
    expect(game.player.c).toBe(4);
    expect(game.shotgun.ammo).toBe(2); // reloaded
    expect(game.turn).toBe(2);
  });

  it("fires shotgun in direction, damages enemy, knocks back, and applies recoil", () => {
    let game = initShotgunChess(1);
    // Place a pawn right in front of player king at (5, 4)
    game.pieces = [
      { id: "p1", type: "pawn", color: "white", hp: 1, maxHp: 1, r: 5, c: 4 },
      { id: "k1", type: "king", color: "white", hp: 4, maxHp: 4, r: 0, c: 4 },
    ];
    game.player.r = 6;
    game.player.c = 4;

    const initialAmmo = game.shotgun.ammo;
    // Shoot North (dr: -1, dc: 0)
    game = shootShotgun(game, -1, 0);

    expect(game.shotgun.ammo).toBe(initialAmmo - 1);
    // The pawn at (5,4) had 1 hp and should be killed by point blank blast
    const p1 = game.pieces.find((p) => p.id === "p1");
    expect(p1).toBeUndefined();
    expect(game.souls).toBeGreaterThan(0);

    // Recoil: Player should be knocked back South (+1 r) if vacant (to 7, 4)
    expect(game.player.r).toBe(7);
  });

  it("triggers wave_clear when white king is eliminated", () => {
    let game = initShotgunChess(1);
    // Set white king right in front with 1 HP
    game.pieces = [
      { id: "k1", type: "king", color: "white", hp: 1, maxHp: 4, r: 5, c: 4 },
    ];
    game.player.r = 6;
    game.player.c = 4;

    game = shootShotgun(game, -1, 0);
    expect(game.status).toBe("wave_clear");
  });

  it("applies upgrade card and advances floor with fresh pieces", () => {
    let game = initShotgunChess(1);
    game.status = "wave_clear";

    const upgraded = applyUpgrade(game, "extra_chamber");
    expect(upgraded.floor).toBe(2);
    expect(upgraded.shotgun.maxAmmo).toBe(3);
    expect(upgraded.shotgun.ammo).toBe(3);
    expect(upgraded.status).toBe("playing");
    expect(upgraded.upgrades).toContain("extra_chamber");
  });
});
