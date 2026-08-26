import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CAVE_DASH_SPRITES,
  CHESS_SPRITES,
  MEMORY_SPRITES,
  SNAKE_SPRITES,
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
      MEMORY_SPRITES.back,
      ...MEMORY_SPRITES.faces,
    ];
    expect(Object.keys(CHESS_SPRITES)).toHaveLength(12);
    expect(MEMORY_SPRITES.faces).toHaveLength(8);
    for (const url of urls) {
      expect(existsSync(publicFile(url)), url).toBe(true);
    }
  });
});
