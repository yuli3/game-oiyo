import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CURSOR.md",
  ".cursor/rules/project-harness.mdc",
  // Internal prose moved to company-brain/AI-Sessions/raw/project-docs/game/docs/
  // on 2026-08-12 before this repo went public. Nothing here parsed those files —
  // this list only checked that they existed.
  "data/catalog/category-registry.yaml",
  "data/catalog/content-inventory.master.csv",
  "src/lib/mdx-component-registry.ts",
];

// NOTE: no "validate:personality" here — game repo has no public/data/personality
// (that requirement belongs to blog/wiki, where the harness script originated).
const requiredScripts = [
  "build",
  "type-check",
  "lint",
  "validate:i18n",
  "verify:harness",
];

let ok = true;

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`missing file: ${rel}`);
    ok = false;
  }
}

const pkgPath = path.join(root, "package.json");
if (!fs.existsSync(pkgPath)) {
  console.error("missing file: package.json");
  ok = false;
} else {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const scripts = pkg.scripts ?? {};
  for (const name of requiredScripts) {
    if (!scripts[name]) {
      console.error(`missing package script: ${name}`);
      ok = false;
    }
  }
}

if (!ok) {
  console.error("harness verification failed");
  process.exit(1);
}

console.log("harness verification passed");
