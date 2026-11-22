#!/usr/bin/env node
// Adds the page bridge (public/prototypes/unity-frame-bridge.js) to every Unity WebGL
// build's index.html. Idempotent. Run after staging a new Unity build:
//   node scripts/unity/patch-unity-index.mjs
// src/lib/games/unity-frame-bridge.test.ts fails CI when a build is missing it.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const BRIDGE_TAG = '<script src="../unity-frame-bridge.js"></script>';
const root = new URL("../../public/prototypes/", import.meta.url).pathname;

let changed = 0;
for (const dir of readdirSync(root)) {
  if (!dir.endsWith("-unity")) continue;
  const file = join(root, dir, "index.html");
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  if (html.includes(BRIDGE_TAG)) continue;
  const anchor = '<link rel="stylesheet"';
  if (html.split(anchor).length !== 2) {
    console.error(`${dir}: expected exactly one ${anchor}`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(file, html.replace(anchor, `${BRIDGE_TAG}\n    ${anchor}`));
  changed += 1;
}
console.log(`patched ${changed} Unity index.html file(s)`);
