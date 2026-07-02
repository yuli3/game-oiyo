import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const contentRoot = path.join(root, "src/content/blog");
const outputCsv = path.join(root, "data/catalog/magazine-compatibility-audit.csv");
const outputMd = path.join(root, "reports/260509-magazine-compatibility-audit.md");

const academyCategories = new Set([
  "Accounting",
  "Economics",
  "Statistics",
  "Public Admin",
  "Law",
  "Business",
  "Financial Engineering",
  "AI Literacy",
  "Behavioral Economics",
  "Crypto",
  "Game Theory",
  "History",
  "Product Management",
  "Psychology",
  "Actuarial Science",
  "Computer Science",
  "Finance",
  "Behavioral Science",
  "Nursing",
  "Medicine",
  "Art Psychotherapy",
  "Music History",
  "Zoology",
  "English Grammar",
  "Technical Analysis",
  "Negotiation",
  "Advanced Bonds",
  "Academy",
  "Tax",
]);

const transitionalBridge = new Set([
  "AttachmentTest",
  "PersonalColorMiniTest",
  "StoneSimulator",
  "TruthTableGenerator",
  "TypingSpeedTest",
]);

const magazineAllowed = new Set([
  "Callout",
  "HighlightBox",
  "Term",
  "ResearchReference",
  "Reference",
  "Quiz",
  "ToolCTA",
  "ToolCTAInline",
  "TestCTA",
  "FlowChart",
  "CompareTable",
  "Timeline",
  "ProgressBar",
  "StatCards",
  "QuadrantMatrix",
  "PyramidDiagram",
  "ForceDiagram",
  "ValueChain",
  "ConceptCard",
  "OrgChart",
  "PolicyCycle",
  "FormulaBlock",
  "FormulaBox",
  "Fraction",
  "ResultGraph",
  "BarChart",
  "LineChart",
  "PieChart",
  "RadarChart",
  "HeatMap",
  "SupplyDemandChart",
  "ASADChart",
  "PhillipsCurveChart",
  "LorenzCurve",
  "PPFChart",
  "BusinessCycle",
  "ProductLifeCycle",
  "KeynesianCross",
  ...transitionalBridge,
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (entry.isFile() && full.endsWith(".mdx")) files.push(full);
  }
  return files;
}

function inferTrack(category, explicitTrack) {
  if (explicitTrack === "academy" || explicitTrack === "magazine" || explicitTrack === "interactive") {
    return explicitTrack;
  }
  if (!category) return "magazine";
  return academyCategories.has(category) ? "academy" : "magazine";
}

function extractComponents(content) {
  const matches = content.matchAll(/<([A-Z][A-Za-z0-9]+)\b/g);
  return [...new Set([...matches].map((m) => m[1]))].sort();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

const rows = [];
const allFiles = walk(contentRoot);

for (const file of allFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const explicitTrack = parsed.data.track;
  const category = parsed.data.category ?? "";
  const inferredTrack = inferTrack(category, explicitTrack);

  if (inferredTrack !== "magazine") continue;

  const locale = path.basename(path.dirname(file));
  const slug = path.basename(file, ".mdx");
  const components = extractComponents(parsed.content);
  const bridgeUsed = components.filter((name) => transitionalBridge.has(name));
  const outsideMagazineSurface = components.filter((name) => !magazineAllowed.has(name));

  rows.push({
    file: path.relative(root, file),
    locale,
    slug,
    category,
    explicitTrack: explicitTrack ?? "",
    inferredTrack,
    bridgeUsed,
    outsideMagazineSurface,
    componentCount: components.length,
  });
}

rows.sort((a, b) => {
  const aScore = a.bridgeUsed.length + a.outsideMagazineSurface.length;
  const bScore = b.bridgeUsed.length + b.outsideMagazineSurface.length;
  return bScore - aScore || a.file.localeCompare(b.file);
});

const bridgeCount = rows.filter((row) => row.bridgeUsed.length > 0).length;
const outsideCount = rows.filter((row) => row.outsideMagazineSurface.length > 0).length;
const totalMagazine = rows.length;

const bridgeUsageMap = new Map();
for (const row of rows) {
  for (const name of row.bridgeUsed) {
    bridgeUsageMap.set(name, (bridgeUsageMap.get(name) ?? 0) + 1);
  }
}

const bridgeSummary = [...bridgeUsageMap.entries()].sort((a, b) => b[1] - a[1]);

const csvLines = [
  "file,locale,slug,category,explicit_track,inferred_track,bridge_components,outside_magazine_surface,component_count",
  ...rows.map((row) =>
    [
      row.file,
      row.locale,
      row.slug,
      row.category,
      row.explicitTrack,
      row.inferredTrack,
      row.bridgeUsed.join("|"),
      row.outsideMagazineSurface.join("|"),
      row.componentCount,
    ]
      .map(csvEscape)
      .join(","),
  ),
];

fs.writeFileSync(outputCsv, `${csvLines.join("\n")}\n`);

const md = [
  "# 260509 Magazine Compatibility Audit",
  "",
  "## Summary",
  "",
  `1. total magazine-track files audited: ${totalMagazine}`,
  `2. files using transitional bridge components: ${bridgeCount}`,
  `3. files using components outside the current magazine surface: ${outsideCount}`,
  "",
  "## Transitional Bridge Usage",
  "",
  ...(bridgeSummary.length
    ? bridgeSummary.map(([name, count], index) => `${index + 1}. \`${name}\`: ${count} files`)
    : ["1. none"]),
  "",
  "## Highest-Priority Files",
  "",
  ...rows
    .filter((row) => row.bridgeUsed.length > 0 || row.outsideMagazineSurface.length > 0)
    .slice(0, 25)
    .map((row, index) => {
      const bridge = row.bridgeUsed.length ? row.bridgeUsed.join(", ") : "none";
      const outside = row.outsideMagazineSurface.length ? row.outsideMagazineSurface.join(", ") : "none";
      return `${index + 1}. \`${row.file}\` | category=\`${row.category}\` | bridge=\`${bridge}\` | outside=\`${outside}\``;
    }),
  "",
  "## Output Files",
  "",
  `1. [data/catalog/magazine-compatibility-audit.csv](/Users/seuncho/coding/blog/data/catalog/magazine-compatibility-audit.csv)`,
  `2. [reports/260509-magazine-compatibility-audit.md](/Users/seuncho/coding/blog/reports/260509-magazine-compatibility-audit.md)`,
  "",
  "## Working Note",
  "",
  "This audit uses explicit `track` when present and falls back to current category-based inference for legacy content. It is designed to support narrowing the `magazine` compatibility bridge over time.",
];

fs.writeFileSync(outputMd, `${md.join("\n")}\n`);

console.log(`magazine audit complete: ${totalMagazine} files, ${bridgeCount} bridge users, ${outsideCount} outside-surface users`);
