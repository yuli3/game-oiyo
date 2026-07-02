// Category normalization migration (WW19 fix).
// Consolidates high-confidence synonym categories to a canonical label.
// DRY-RUN by default; pass --apply to rewrite frontmatter `category:` lines.
//
//   node scripts/normalize-categories.mjs           # dry-run (report only)
//   node scripts/normalize-categories.mjs --apply    # rewrite files
//
// Conservative: only merges clear same-domain synonyms. Track-as-category
// ("Magazine"/"Academy") and ambiguous broad labels are left untouched (flagged).

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const APPLY = process.argv.includes("--apply");
const root = process.cwd();
const contentRoot = path.join(root, "src/content/blog");
const LOCALES = ["ko", "en", "ja", "fr", "es", "zh"];

// raw category (as written in frontmatter) → canonical label
const MAP = {
  // Mind & Psychology
  "Psychology": "Mind & Psychology",
  "Psychology & Productivity": "Mind & Psychology",
  "Psychology & Society": "Mind & Psychology",
  // Philosophy & Spirit
  "Philosophy": "Philosophy & Spirit",
  "Logic & Philosophy": "Philosophy & Spirit",
  "Logic": "Philosophy & Spirit",
  // Myth & Culture
  "Mythology": "Myth & Culture",
  "History": "Myth & Culture",
  // Mysticism
  "Fortune & Spirituality": "Mysticism",
  // Finance
  "Economy": "Finance",
  "Money & Finance": "Finance",
  "Personal Finance": "Finance",
  "Investment": "Finance",
  // Computer Science
  "IT": "Computer Science",
  "Programming": "Computer Science",
  "Technology": "Computer Science",
  "Engineering": "Computer Science",
  // Science & Nature
  "Science": "Science & Nature",
  "Natural Science": "Science & Nature",
  // Health
  "Health & Wellness": "Health",
  "Wellness": "Health",
  // Culture / Humanities
  "Arts & Culture": "Culture",
  // ── second-order consolidation (WW19-3) ──
  "Lifestyle & Growth": "Lifestyle",
  "Life": "Lifestyle",
  "Lifestyle & How-to": "Lifestyle",
  "Self-Improvement": "Lifestyle",
  "Productivity": "Lifestyle",
  "Culture": "Humanities",
  "Liberal Arts": "Humanities",
  "Social Science": "Humanities",
  "Education & Language": "Education",
  "Language": "Education",
  "Game": "Games",
  "AI 실무": "Computer Science",
  "Tools": "Computer Science",
  "Science & Health": "Science & Nature",
  "Legal & Tax": "Law & Exam",
};

function listMdx(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => path.join(dir, f));
}

const before = {};
const after = {};
let changed = 0;
const urlChanges = new Set();
const slugify = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-");

for (const locale of LOCALES) {
  for (const file of listMdx(path.join(contentRoot, locale))) {
    const text = fs.readFileSync(file, "utf8");
    let data;
    try { data = matter(text).data; } catch { continue; }
    const raw = (data.category ?? "").toString().replace(/^["']|["']$/g, "").trim();
    if (!raw) continue;
    before[raw] = (before[raw] ?? 0) + 1;
    const target = MAP[raw];
    const final = target ?? raw;
    after[final] = (after[final] ?? 0) + 1;
    if (target && target !== raw) {
      changed++;
      urlChanges.add(`/${locale}/category/${slugify(raw)}/ /${locale}/category/${slugify(target)}/ 301`);
      if (APPLY) {
        // rewrite the category: line only (preserve everything else)
        const re = /^(category:\s*)["']?[^"'\n]+["']?\s*$/m;
        const next = text.replace(re, `$1"${target}"`);
        if (next !== text) fs.writeFileSync(file, next);
      }
    }
  }
}

console.log(APPLY ? "=== APPLIED ===" : "=== DRY-RUN (no files written) ===");
console.log(`Files whose category would change: ${changed}`);
console.log(`Distinct categories: before ${Object.keys(before).length} → after ${Object.keys(after).length}`);
console.log("\nConsolidations:");
for (const [raw, target] of Object.entries(MAP)) {
  if (before[raw]) console.log(`  ${raw} (${before[raw]}) → ${target}`);
}
const redirects = [...urlChanges].sort();
console.log(`\nCategory-hub URL changes (301 redirects): ${redirects.length} locale-specific pairs`);

if (APPLY) {
  const redirectsFile = path.join(root, "public/_redirects");
  const current = fs.readFileSync(redirectsFile, "utf8");
  // Append only redirect lines not already present (idempotent across re-runs).
  const existing = new Set(current.split("\n").map((l) => l.trim()));
  const fresh = redirects.filter((r) => !existing.has(r.trim()));
  if (fresh.length) {
    fs.appendFileSync(redirectsFile, `\n# ── category normalization 301 (WW19, ${new Date().toISOString().slice(0, 10)}) ──\n${fresh.join("\n")}\n`);
    console.log(`✓ appended ${fresh.length} new redirects to public/_redirects`);
  } else {
    console.log("• no new redirects to append");
  }
}
