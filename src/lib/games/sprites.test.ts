import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BLOCK_BURST_FX,
  BLOCK_BURST_SPRITES,
  FX_SPRITES,
  CAVE_DASH_SPRITES,
  CHECKERS_SPRITES,
  CHESS_SPRITES,
  CONNECT_FOUR_SPRITES,
  DOMINO_SPRITES,
  GOMOKU_SPRITES,
  KINGDOMINO_SPRITES,
  LIGHT_UP_SPRITES,
  LOGIC_CELL_SPRITES,
  MAHJONG_SPRITES,
  MEMORY_SPRITES,
  MEMORY_FACE_NAMES,
  memoryFaceSrc,
  MAZE_SPRITES,
  DOT_PET_SPRITES,
  DOT_RUNNER_SPRITES,
  dotPetSprite,
  PIP_SPRITES,
  PLAYING_CARD_SPRITES,
  PUZZLE15_SPRITES,
  REVERSI_SPRITES,
  SNAKE_SPRITES,
  STAR_BLASTER_SPRITES,
  JUMP_KING_SPRITES,
  mahjongTileSrc,
  pipSprite,
} from "./sprites";

const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../public");

function publicFile(url: string) {
  return resolve(publicRoot, url.replace(/^\//, ""));
}

describe("in-game sprite maps", () => {
  it("exposes snake, cave, chess, and memory face URLs that exist on disk", () => {
    const urls = [
      ...Object.values(BLOCK_BURST_SPRITES),
      ...Object.values(BLOCK_BURST_FX),
      ...Object.values(FX_SPRITES),
      ...Object.values(STAR_BLASTER_SPRITES),
      ...Object.values(JUMP_KING_SPRITES),
      ...Object.values(SNAKE_SPRITES),
      ...Object.values(CAVE_DASH_SPRITES),
      ...Object.values(CHESS_SPRITES),
      ...Object.values(CHECKERS_SPRITES),
      ...Object.values(GOMOKU_SPRITES),
      ...Object.values(REVERSI_SPRITES),
      ...Object.values(CONNECT_FOUR_SPRITES),
      ...Object.values(KINGDOMINO_SPRITES),
      ...Object.values(PLAYING_CARD_SPRITES),
      ...Object.values(PIP_SPRITES),
      ...Object.values(DOMINO_SPRITES),
      MAHJONG_SPRITES.back,
      ...MAHJONG_SPRITES.kinds,
      ...Object.values(PUZZLE15_SPRITES),
      ...Object.values(LIGHT_UP_SPRITES),
      ...Object.values(LOGIC_CELL_SPRITES),
      MEMORY_SPRITES.back,
      ...MEMORY_SPRITES.faces,
      MAZE_SPRITES.exit,
      ...Object.values(DOT_PET_SPRITES).flatMap((set) => [set.baby, set.adult]),
      ...Object.values(DOT_RUNNER_SPRITES),
    ];
    expect(Object.keys(CHESS_SPRITES)).toHaveLength(12);
    expect(Object.keys(CHECKERS_SPRITES)).toHaveLength(4);
    expect(Object.keys(PIP_SPRITES)).toHaveLength(7);
    expect(pipSprite(-1)).toBe(PIP_SPRITES[0]);
    expect(pipSprite(6)).toBe(PIP_SPRITES[6]);
    expect(pipSprite(9)).toBe(PIP_SPRITES[6]);
    expect(MAHJONG_SPRITES.kinds).toHaveLength(34);
    expect(mahjongTileSrc(-1)).toBe(MAHJONG_SPRITES.kinds[0]);
    expect(mahjongTileSrc(33)).toBe(MAHJONG_SPRITES.kinds[33]);
    expect(mahjongTileSrc(99)).toBe(MAHJONG_SPRITES.kinds[33]);
    expect(MEMORY_SPRITES.faces).toHaveLength(18);
    expect(MEMORY_FACE_NAMES).toHaveLength(18);
    expect(memoryFaceSrc(17)).toBe(MEMORY_SPRITES.faces[17]);
    expect(memoryFaceSrc(99)).toBe(MEMORY_SPRITES.faces[0]);
    expect(new Set(MEMORY_SPRITES.faces).size).toBe(18);
    expect(dotPetSprite("water", "baby")).toBe(DOT_PET_SPRITES.water.baby);
    expect(dotPetSprite("water", "teen")).toBe(DOT_PET_SPRITES.water.adult);
    expect(dotPetSprite("fire", "adult")).not.toBe(DOT_PET_SPRITES.fire.baby);
    for (const url of urls) {
      expect(existsSync(publicFile(url)), url).toBe(true);
    }
  });

  it("keeps memory and maze renderers off emoji tokens", () => {
    const memory = readFileSync(new URL("../../components/games/MemoryCardGame.tsx", import.meta.url), "utf8");
    const maze = readFileSync(new URL("../../components/games/MazeGame.tsx", import.meta.url), "utf8");
    expect(memory).not.toMatch(/EMOJI_POOL/);
    expect(maze).not.toMatch("✨");
  });
});
