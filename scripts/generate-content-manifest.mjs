// Content manifest generator (WW18) + category fragmentation report (WW19).
//
// Walks src/content/blog/<locale>/*.mdx, parses frontmatter (gray-matter),
// and emits:
//   - src/data/content-manifest.json   machine/API SSOT (api.oiyo.net-ready)
//   - CONTENT_INDEX.md                  human-readable index
//   - docs/CATEGORY_FRAGMENTATION_REPORT.md   drift vs canonical registry
//
// Run: node scripts/generate-content-manifest.mjs   (or: npm run content:manifest)
// No hand-editing — regenerate from the MDX corpus, which stays the source of truth.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const contentRoot = path.join(root, "src/content/blog");
const LOCALES = ["ko", "en", "ja", "fr", "es", "zh"];

// ── Canonical category registry ───────────────────────────────────────────────
const registryText = fs.readFileSync(
  path.join(root, "data/catalog/category-registry.yaml"),
  "utf8",
);
const canonicalSlugs = [...registryText.matchAll(/^\s+- slug:\s*(.+)$/gm)].map((m) => m[1].trim());
const canonicalLabels = [...registryText.matchAll(/^\s+label:\s*(.+)$/gm)].map((m) => m[1].trim());
const canonicalSet = new Set([...canonicalSlugs, ...canonicalLabels].map((s) => s.toLowerCase()));
const TRACKS = new Set(["academy", "magazine", "interactive"]);

// ── Walk corpus ───────────────────────────────────────────────────────────────
function listMdx(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => path.join(dir, f));
}

const items = [];
for (const locale of LOCALES) {
  for (const file of listMdx(path.join(contentRoot, locale))) {
    let fm;
    try {
      fm = matter(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const d = fm.data ?? {};
    if (d.draft === true) continue;
    const base = path.basename(file, ".mdx");
    const category = (d.category ?? "").toString().replace(/^["']|["']$/g, "").trim();
    const words = (fm.content ?? "").split(/\s+/).filter(Boolean).length;
    const chMatch = base.match(/-ch(\d+)$/);
    items.push({
      slug: base,
      locale,
      track: d.track ?? null,
      category: category || null,
      series: d.series ?? null,
      chapter: d.chapter ?? (chMatch ? Number(chMatch[1]) : null),
      title: d.title ?? null,
      description: d.description ?? null,
      pubDate: d.pubDate ? new Date(d.pubDate).toISOString().slice(0, 10) : null,
      tags: Array.isArray(d.tags) ? d.tags : [],
      words,
      url: `/${locale}/${base}/`,
    });
  }
}

items.sort((a, b) => a.locale.localeCompare(b.locale) || a.slug.localeCompare(b.slug));

// ── Aggregates ────────────────────────────────────────────────────────────────
const tally = (arr, key) => {
  const m = {};
  for (const it of arr) {
    const k = (typeof key === "function" ? key(it) : it[key]) ?? "(none)";
    m[k] = (m[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};

const byLocale = tally(items, "locale");
const byTrack = tally(items, "track");
const byCategory = tally(items, "category");

// ── Write manifest JSON ───────────────────────────────────────────────────────
const manifest = {
  generatedAt: new Date().toISOString(),
  source: "src/content/blog/**/*.mdx (frontmatter)",
  counts: { total: items.length, byLocale, byTrack },
  categoriesCanonical: canonicalSlugs,
  items,
};
fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
fs.writeFileSync(path.join(root, "src/data/content-manifest.json"), JSON.stringify(manifest));
console.log(`✓ src/data/content-manifest.json — ${items.length} items`);

// ── Write human index (MD) ────────────────────────────────────────────────────
let md = `# Content Index (auto-generated)\n\n`;
md += `> Generated ${manifest.generatedAt} from MDX frontmatter. Do not edit by hand — run \`npm run content:manifest\`.\n\n`;
md += `Total: **${items.length}** entries · ${Object.entries(byLocale).map(([k, v]) => `${k} ${v}`).join(" · ")}\n\n`;
md += `## By track\n\n${Object.entries(byTrack).map(([k, v]) => `- **${k}**: ${v}`).join("\n")}\n\n`;
md += `## By category (raw)\n\n| Category | Count | In registry? |\n|---|--:|:--:|\n`;
for (const [cat, n] of Object.entries(byCategory)) {
  const inReg = canonicalSet.has(cat.toLowerCase());
  const isTrack = TRACKS.has(cat.toLowerCase());
  md += `| ${cat} | ${n} | ${isTrack ? "⚠️ track" : inReg ? "✅" : "❌ drift"} |\n`;
}
fs.writeFileSync(path.join(root, "CONTENT_INDEX.md"), md);
console.log("✓ CONTENT_INDEX.md");

// ── Category fragmentation report (WW19) ──────────────────────────────────────
// Cluster near-duplicate categories by a normalized key.
const normKey = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
const clusters = {};
for (const [cat, n] of Object.entries(byCategory)) {
  if (cat === "(none)") continue;
  const k = normKey(cat);
  (clusters[k] ??= []).push([cat, n]);
}

const trackAsCat = Object.entries(byCategory).filter(([c]) => TRACKS.has(c.toLowerCase()));
const driftCats = Object.entries(byCategory).filter(
  ([c]) => c !== "(none)" && !canonicalSet.has(c.toLowerCase()) && !TRACKS.has(c.toLowerCase()),
);

// Manual consolidation proposal for the biggest fragmentation clusters.
const PROPOSE = {
  "psychology-self-discovery": ["Psychology", "Mind & Psychology", "Self-Improvement", "Lifestyle & Growth"],
  "philosophy-spirit": ["Philosophy", "Philosophy & Spirit"],
  "myth-culture": ["Mythology", "Myth & Culture", "History"],
  "mysticism": ["Mysticism", "Fortune & Spirituality"],
  "science-health": ["Health", "Science & Health", "Natural Science", "Science"],
  "finance-tax": ["Finance", "Economy", "Tax", "Money & Finance"],
  "computer-it": ["Computer Science", "IT", "Programming", "AI 실무"],
};

let rep = `# Category Fragmentation Report (WW19, auto-generated)\n\n`;
rep += `> Generated ${manifest.generatedAt}. Canonical registry: \`data/catalog/category-registry.yaml\` (${canonicalSlugs.length} categories, status active-draft).\n\n`;
rep += `## Summary\n\n`;
rep += `- Distinct raw categories in content: **${Object.keys(byCategory).filter((c) => c !== "(none)").length}**\n`;
rep += `- Canonical categories in registry: **${canonicalSlugs.length}**\n`;
rep += `- ⚠️ Track-name used as category: **${trackAsCat.length}** (${trackAsCat.map(([c, n]) => `${c} ${n}`).join(", ") || "none"})\n`;
rep += `- ❌ Categories NOT in registry (drift): **${driftCats.length}**\n\n`;

rep += `## ⚠️ Track-as-category (fix: these are tracks, not categories)\n\n`;
rep += trackAsCat.length
  ? trackAsCat.map(([c, n]) => `- **${c}** (${n}) → set a real category; \`track\` already carries this.`).join("\n") + "\n\n"
  : "_none_\n\n";

rep += `## Proposed consolidation (fragmented → canonical)\n\n`;
for (const [target, members] of Object.entries(PROPOSE)) {
  const present = members.map((m) => [m, byCategory[m]]).filter(([, n]) => n);
  if (!present.length) continue;
  const total = present.reduce((s, [, n]) => s + n, 0);
  rep += `### → \`${target}\` (${total} entries)\n`;
  rep += present.map(([m, n]) => `- ${m} (${n})`).join("\n") + "\n\n";
}

rep += `## All drift categories (not in registry, not a track)\n\n`;
rep += `| Category | Count |\n|---|--:|\n`;
for (const [c, n] of driftCats.sort((a, b) => b[1] - a[1])) rep += `| ${c} | ${n} |\n`;

rep += `\n## Note\n\nThe canonical registry (May, active-draft) only covers ahoxy-migration domains (management, economics, ncs, tax/finance, etc.) and omits large live domains (Mysticism, Mythology, Philosophy, Health). Two fixes are needed: (1) expand the registry to cover all live domains, (2) migrate content categories to the consolidated canonical set. This report is advisory — it does not rewrite content.\n`;

fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/CATEGORY_FRAGMENTATION_REPORT.md"), rep);
console.log("✓ docs/CATEGORY_FRAGMENTATION_REPORT.md");
