import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "src/content/blog");
const inventoryPath = path.join(root, "data/catalog/content-inventory.master.csv");

const hardFailures = [];
const languageWarnings = [];
const categoryCounts = new Map();

const forbiddenTitlePatterns = [
  /강목체/,
  /서브노트/,
  /정리본/,
  /요약자료/,
  /^매거진:/,
  /^\[[^\]]*매거진[^\]]*\]/,
  /^\[생활\s*점검리스트\]/,
];

const categoryRegistry = fs.readFileSync(
  path.join(root, "data/catalog/category-registry.yaml"),
  "utf8",
);
const registeredCategories = new Set();
for (const match of categoryRegistry.matchAll(/^\s+- slug: ([^\n]+)$/gm)) {
  registeredCategories.add(match[1].trim());
}
for (const match of categoryRegistry.matchAll(/^\s+label: ([^\n]+)$/gm)) {
  registeredCategories.add(match[1].trim());
}

function listMdxFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMdxFiles(full);
    return entry.isFile() && entry.name.endsWith(".mdx") ? [full] : [];
  });
}

function frontmatterOf(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? "";
}

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`, "m"));
  return match?.[1]?.trim() ?? "";
}

for (const file of listMdxFiles(contentRoot)) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  const frontmatter = frontmatterOf(text);
  const locale = path.relative(contentRoot, file).split(path.sep)[0];
  const title = field(frontmatter, "title");
  const category = field(frontmatter, "category");

  if (text.includes("file:///")) {
    hardFailures.push(`${rel}: contains file:/// link`);
  }

  for (const pattern of forbiddenTitlePatterns) {
    if (pattern.test(title)) {
      hardFailures.push(`${rel}: forbidden title wording: ${title}`);
      break;
    }
  }

  if (category && !registeredCategories.has(category)) {
    const count = categoryCounts.get(category) ?? 0;
    categoryCounts.set(category, count + 1);
  }

  if (locale === "ja" && /[가-힣]/.test(title)) {
    languageWarnings.push(`${rel}: Japanese title contains Hangul: ${title}`);
  }
}

if (fs.existsSync(inventoryPath)) {
  const inventory = fs.readFileSync(inventoryPath, "utf8");
  if (inventory.includes("file:///")) {
    hardFailures.push("data/catalog/content-inventory.master.csv: contains file:/// link");
  }
  for (const line of inventory.split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const [contentId] = line.split(",");
    for (const pattern of forbiddenTitlePatterns) {
      if (pattern.test(line)) {
        hardFailures.push(`data/catalog/content-inventory.master.csv: forbidden title wording for ${contentId}`);
        break;
      }
    }
  }
}

const categoryWarningCount = Array.from(categoryCounts.values()).reduce(
  (sum, count) => sum + count,
  0,
);
const categorySummary = Array.from(categoryCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([category, count]) => `${category} (${count})`);

if (categoryWarningCount) {
  console.warn(
    `warning: ${categoryWarningCount} content item(s) use categories outside the registry`,
  );
  console.warn(`warning: top unregistered categories: ${categorySummary.join(", ")}`);
}

for (const warning of languageWarnings.slice(0, 40)) {
  console.warn(`warning: ${warning}`);
}
if (languageWarnings.length > 40) {
  console.warn(`warning: ${languageWarnings.length - 40} more language warnings omitted`);
}

if (hardFailures.length) {
  for (const failure of hardFailures) {
    console.error(`error: ${failure}`);
  }
  console.error(`content quality audit failed: ${hardFailures.length} blocking issue(s)`);
  process.exit(1);
}

const warningCount = categoryWarningCount + languageWarnings.length;
console.log(`content quality audit passed (${warningCount} warning(s))`);
