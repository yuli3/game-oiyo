#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "src/content/blog");
const repoName = path.basename(root);
const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : "";

const allowedMarkets = new Set(["KR", "US", "JP", "GLOBAL", "EU", "LATAM", "CN", "TW"]);
const allowedScopes = new Set(["global", "local", "regional"]);
const allowedModes = new Set(["original", "localized", "translated", "redirect-only"]);

const localeDefaultMarket = {
  ko: "KR",
  en: "US",
  ja: "JP",
};

const localSignals = [
  {
    market: "KR",
    patterns: [
      /Q-net|큐넷|한국산업인력공단|대한상공회의소|한국세무사회|국사편찬위원회/i,
      /정보처리기사|컴퓨터활용능력|컴활|전산세무|전산회계|한국사능력검정|공공기관|NCS/,
      /연말정산|종합소득세|부가세|전세|월세|건강검진|운전면허|대체공휴일/,
    ],
  },
  {
    market: "US",
    patterns: [
      /\bIRS\b|\bW-2\b|\b1099\b|\bDMV\b|\bCPA\b|\bPMP\b|CompTIA|Roth IRA|401\(k\)/i,
      /federal tax|state tax|credit score|health insurance/i,
    ],
  },
  {
    market: "JP",
    patterns: [
      /ITパスポート|基本情報技術者|簿記|宅建|年末調整|確定申告|消費税/,
      /国民健康保険|厚生労働省|国税庁|履歴書|職務経歴書|運転免許/,
    ],
  },
];

const errors = [];
const warnings = [];
const warningEntries = [];
const warningCountsByMarket = new Map();
const stats = {
  files: 0,
  withMarket: 0,
  localSignal: 0,
};

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

function inferredLocale(file, frontmatter) {
  return field(frontmatter, "locale") || path.relative(contentRoot, file).split(path.sep)[0];
}

function detectLocalSignal(text) {
  for (const signal of localSignals) {
    if (signal.patterns.some((pattern) => pattern.test(text))) {
      return signal.market;
    }
  }
  return "";
}

function warn(message, market = "unknown") {
  warnings.push(message);
  warningEntries.push({ market, message });
  warningCountsByMarket.set(market, (warningCountsByMarket.get(market) ?? 0) + 1);
}

for (const file of listMdxFiles(contentRoot)) {
  stats.files += 1;
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  const frontmatter = frontmatterOf(text);
  const locale = inferredLocale(file, frontmatter);
  const market = field(frontmatter, "market");
  const audienceMarket = field(frontmatter, "audienceMarket");
  const contentScope = field(frontmatter, "contentScope");
  const localizationMode = field(frontmatter, "localizationMode");

  if (market) {
    stats.withMarket += 1;
    if (!allowedMarkets.has(market)) {
      errors.push(`${rel}: invalid market "${market}"`);
    }
  }

  if (audienceMarket && !allowedMarkets.has(audienceMarket)) {
    errors.push(`${rel}: invalid audienceMarket "${audienceMarket}"`);
  }

  if (contentScope && !allowedScopes.has(contentScope)) {
    errors.push(`${rel}: invalid contentScope "${contentScope}"`);
  }

  if (localizationMode && !allowedModes.has(localizationMode)) {
    errors.push(`${rel}: invalid localizationMode "${localizationMode}"`);
  }

  if ((contentScope || localizationMode) && !market) {
    warn(`${rel}: has localization metadata but no market`);
  }

  const detectedMarket = detectLocalSignal(`${frontmatter}\n${text.slice(0, 5000)}`);
  if (!detectedMarket) continue;

  stats.localSignal += 1;
  const expectedMarket = localeDefaultMarket[locale];

  if (!market) {
    warn(`${rel}: likely ${detectedMarket}-local content without market metadata`, detectedMarket);
    continue;
  }

  if (market !== detectedMarket && audienceMarket !== detectedMarket && market !== "GLOBAL") {
    warn(`${rel}: detected ${detectedMarket}-local signals but market is ${market}`, detectedMarket);
  }

  if (expectedMarket && market !== expectedMarket && localizationMode === "translated") {
    warn(
      `${rel}: translated ${market}-local content appears under ${locale}; consider market-specific original content`,
      market,
    );
  }
}

console.log(`localization audit — ${repoName}`);
console.log(`files: ${stats.files}`);
console.log(`with market metadata: ${stats.withMarket}`);
console.log(`local-signal files: ${stats.localSignal}`);
if (warningCountsByMarket.size) {
  const warningSummary = Array.from(warningCountsByMarket.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([market, count]) => `${market}:${count}`)
    .join(", ");
  console.log(`warning markets: ${warningSummary}`);
}

for (const warning of warnings.slice(0, 80)) {
  console.warn(`warning: ${warning}`);
}
if (warnings.length > 80) {
  console.warn(`warning: ${warnings.length - 80} more warning(s) omitted`);
}

if (errors.length) {
  for (const error of errors) {
    console.error(`error: ${error}`);
  }
  console.error(`localization audit failed: ${errors.length} error(s)`);
  process.exit(1);
}

if (reportPath) {
  const resolvedReportPath = path.resolve(root, reportPath);
  fs.mkdirSync(path.dirname(resolvedReportPath), { recursive: true });
  fs.writeFileSync(
    resolvedReportPath,
    `${JSON.stringify(
      {
        repo: repoName,
        generatedAt: new Date().toISOString(),
        stats,
        warningCountsByMarket: Object.fromEntries(warningCountsByMarket),
        warnings: warningEntries,
        errors,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`localization report written: ${path.relative(root, resolvedReportPath)}`);
}

console.log(`localization audit passed (${warnings.length} warning(s))`);
