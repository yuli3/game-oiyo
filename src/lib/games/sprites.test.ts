import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CAVE_DASH_SPRITES,
  CHECKERS_SPRITES,
  CHESS_SPRITES,
  CONNECT_FOUR_SPRITES,
  DOMINO_SPRITES,
  GOMOKU_SPRITES,
  KINGDOMINO_SPRITES,
  MEMORY_SPRITES,
  PIP_SPRITES,
  PLAYING_CARD_SPRITES,
  REVERSI_SPRITES,
  SNAKE_SPRITES,
  pipSprite,
} from "./sprites";

const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../public");

function publicFile(url: string) {
  return resolve(publicRoot, url.replace(/^\//, ""));
}

describe("in-game sprite maps", () => {
  it("exposes snake, cave, chess, and memory face URLs that exist on disk", () => {
    const urls = [
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
      MEMORY_SPRITES.back,
      ...MEMORY_SPRITES.faces,
    ];
    expect(Object.keys(CHESS_SPRITES)).toHaveLength(12);
    expect(Object.keys(CHECKERS_SPRITES)).toHaveLength(4);
    expect(Object.keys(PIP_SPRITES)).toHaveLength(7);
    expect(pipSprite(-1)).toBe(PIP_SPRITES[0]);
    expect(pipSprite(6)).toBe(PIP_SPRITES[6]);
    expect(pipSprite(9)).toBe(PIP_SPRITES[6]);
    expect(MEMORY_SPRITES.faces).toHaveLength(8);
    for (const url of urls) {
      expect(existsSync(publicFile(url)), url).toBe(true);
    }
  });
});
