// Fill missing `track` frontmatter (review fix ①).
// Slug-based inference (safe, matches content reality):
//   academy-*                     -> academy
//   tool-*/game-*/-test/-game/... -> interactive
//   everything else               -> magazine
// DRY-RUN by default; --apply inserts a `track:` line after the opening ---.
// Idempotent: skips files that already have a track: line.

import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const contentRoot = path.join(process.cwd(), "src/content/blog");
const LOCALES = ["ko", "en", "ja", "fr", "es", "zh"];

const INTERACTIVE = /^(tool-|game-)|-(test|game|calculator|quiz|simulator|generator)$/;

function inferTrack(slug) {
  if (slug.startsWith("academy-")) return "academy";
  if (INTERACTIVE.test(slug)) return "interactive";
  return "magazine";
}

function listMdx(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => path.join(dir, f));
}

const dist = {};
let filled = 0;
for (const locale of LOCALES) {
  for (const file of listMdx(path.join(contentRoot, locale))) {
    const text = fs.readFileSync(file, "utf8");
    const fmEnd = text.indexOf("\n---", 3);
    const fm = fmEnd > 0 ? text.slice(0, fmEnd) : text.slice(0, 400);
    if (/^track:\s*\S/m.test(fm)) continue; // already has track
    const slug = path.basename(file, ".mdx");
    const track = inferTrack(slug);
    dist[track] = (dist[track] ?? 0) + 1;
    filled++;
    if (APPLY) {
      // insert right after the first '---\n'
      const next = text.replace(/^---\n/, `---\ntrack: ${track}\n`);
      if (next !== text) fs.writeFileSync(file, next);
    }
  }
}

console.log(APPLY ? "=== APPLIED ===" : "=== DRY-RUN ===");
console.log(`files to fill: ${filled}`);
console.log("assigned track distribution:");
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${n}  ${t}`));
