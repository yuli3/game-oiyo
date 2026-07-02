import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "data/catalog/magazine-compatibility-audit.csv");
const outputCsv = path.join(root, "data/catalog/magazine-compatibility-triage.csv");
const outputMd = path.join(root, "reports/260509-magazine-compatibility-triage.md");

function parseCsvLine(line) {
  const parts = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function classify(row) {
  const outside = row.outside ? row.outside.split("|").filter(Boolean) : [];
  const bridge = row.bridge ? row.bridge.split("|").filter(Boolean) : [];
  const slug = row.slug;

  const usesLecture = outside.some((name) => name.startsWith("Lecture")) || outside.includes("NegotiationSimulator");
  const usesIslands =
    bridge.length > 0 ||
    outside.some((name) =>
      [
        "CAPMCalculator",
        "WACCCalculator",
        "BondPricer",
        "PortfolioVisualizer",
        "AutonomicBalanceGraph",
        "MindWeatherStation",
        "GutGardenSimulator",
        "MBTIQuickTest",
        "AgeCalculator",
        "CaffeineCalculator",
        "ChildHeightCalculator",
        "HeightPredictor",
        "GpaCalculator",
        "FastingTimer",
        "DeveloperUnitConverter",
        "CVPLab",
        "PrisonersDilemma",
        "NPVCalculator",
        "ISLMSimulator",
        "SamplingErrorLab",
        "SWOTBuilder",
        "CompAdvantageCalculator",
        "VarianceAnalysis",
        "MeetingCostCalculator",
        "PetAgeCalculator",
        "PregnancyCalculator",
      ].includes(name),
    );

  if (slug.startsWith("education-technical-analysis-ch")) {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "academy",
      batch: "academy-reclassify-technical-analysis",
      reason: "lecture-series content is still inferred as magazine because of legacy category usage",
    };
  }

  if (slug.startsWith("education-korean-logic-ch")) {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "academy",
      batch: "academy-reclassify-korean-logic",
      reason: "chaptered lecture content should not remain on the magazine rendering surface",
    };
  }

  if (slug.startsWith("education-negotiation-ch")) {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "academy",
      batch: "academy-reclassify-negotiation",
      reason: "lecture-specific tables and process blocks indicate academy ownership",
    };
  }

  if (slug.startsWith("magazine-education-") || slug === "magazine-lost-ark-stone-odds" || slug === "magazine-typing-agility") {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "interactive",
      batch: "interactive-reclassify-magazine-labs",
      reason: "reading-plus-island lab content fits interactive better than magazine",
    };
  }

  if (
    [
      "autonomic-nervous-system-balance",
      "emotional-regulation-weather",
      "gut-microbiome-intuition",
      "mindfulness-monkey-mind",
      "personal-color-spring-warm-light-guide",
      "age-calculator-korean-standards",
      "caffeine-half-life-sleep",
      "caffeine-sensitivity-guide",
      "child-growth-height-guide",
      "child-height-prediction-factors",
      "gpa-academic-performance-strategy",
      "intermittent-fasting-metabolism",
      "meeting-cost-corporate-efficiency",
      "meeting-cost-productivity",
      "pet-age-human-comparison",
      "pregnancy-cycle-womens-health",
    ].includes(slug)
  ) {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "interactive",
      batch: "interactive-reclassify-guide-calculators",
      reason: "guide-plus-tool pages align with the interactive track",
    };
  }

  if (slug === "magazine-future-jobs-certifications" || slug === "magazine-enneagram-introduction" || slug === "magazine-mbti-cognitive-functions" || slug === "magazine-riasec-career-test") {
    return {
      recommendedAction: "keep-track-replace-components",
      targetTrack: "magazine",
      batch: "magazine-replace-lecture-table",
      reason: "editorial essay can remain magazine, but lecture-style blocks should be replaced with magazine-safe components",
    };
  }

  if (slug === "magazine-mbti-compass-test") {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "interactive",
      batch: "interactive-reclassify-quick-tests",
      reason: "test-first experience belongs on interactive unless rewritten into essay-first magazine form",
    };
  }

  if (usesLecture) {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "academy",
      batch: "academy-reclassify-legacy-lectures",
      reason: "lecture-only components on magazine track indicate a misclassified instructional page",
    };
  }

  if (usesIslands) {
    return {
      recommendedAction: "reclassify-track",
      targetTrack: "interactive",
      batch: "interactive-reclassify-legacy-islands",
      reason: "tool-first or simulator-first content should move to interactive",
    };
  }

  return {
    recommendedAction: "hold-review",
    targetTrack: row.inferredTrack,
    batch: "manual-review",
    reason: "no confident automatic triage rule matched",
  };
}

const lines = fs.readFileSync(inputPath, "utf8").trim().split(/\n/);
const rows = lines.slice(1).map((line) => {
  const p = parseCsvLine(line);
  return {
    file: p[0],
    locale: p[1],
    slug: p[2],
    category: p[3],
    explicitTrack: p[4],
    inferredTrack: p[5],
    bridge: p[6],
    outside: p[7],
    componentCount: p[8],
  };
});

function hasSlugPatternMatch(slug) {
  return (
    slug.startsWith("education-technical-analysis-ch") ||
    slug.startsWith("education-korean-logic-ch") ||
    slug.startsWith("education-negotiation-ch") ||
    slug.startsWith("magazine-education-") ||
    slug === "magazine-lost-ark-stone-odds" ||
    slug === "magazine-typing-agility" ||
    slug === "magazine-future-jobs-certifications" ||
    slug === "magazine-enneagram-introduction" ||
    slug === "magazine-mbti-cognitive-functions" ||
    slug === "magazine-riasec-career-test" ||
    slug === "magazine-mbti-compass-test" ||
    [
      "autonomic-nervous-system-balance",
      "emotional-regulation-weather",
      "gut-microbiome-intuition",
      "mindfulness-monkey-mind",
      "personal-color-spring-warm-light-guide",
      "age-calculator-korean-standards",
      "caffeine-half-life-sleep",
      "caffeine-sensitivity-guide",
      "child-growth-height-guide",
      "child-height-prediction-factors",
      "gpa-academic-performance-strategy",
      "intermittent-fasting-metabolism",
      "meeting-cost-corporate-efficiency",
      "meeting-cost-productivity",
      "pet-age-human-comparison",
      "pregnancy-cycle-womens-health",
    ].includes(slug)
  );
}

const affected = rows.filter(
  (row) =>
    (row.bridge && row.bridge.length > 0) ||
    (row.outside && row.outside.length > 0) ||
    hasSlugPatternMatch(row.slug),
);
const triaged = affected.map((row) => ({ ...row, ...classify(row) }));

triaged.sort((a, b) => a.batch.localeCompare(b.batch) || a.file.localeCompare(b.file));

const summary = new Map();
for (const row of triaged) {
  const key = `${row.recommendedAction}|${row.targetTrack}|${row.batch}`;
  summary.set(key, (summary.get(key) ?? 0) + 1);
}

const csvLines = [
  "file,locale,slug,category,current_track,recommended_action,target_track,batch,bridge_components,outside_magazine_surface,reason,status",
  ...triaged.map((row) =>
    [
      row.file,
      row.locale,
      row.slug,
      row.category,
      row.inferredTrack,
      row.recommendedAction,
      row.targetTrack,
      row.batch,
      row.bridge,
      row.outside,
      row.reason,
      "queued",
    ]
      .map(csvEscape)
      .join(","),
  ),
];

fs.writeFileSync(outputCsv, `${csvLines.join("\n")}\n`);

const md = [
  "# 260509 Magazine Compatibility Triage",
  "",
  "## Summary",
  "",
  `1. affected files triaged: ${triaged.length}`,
  ...[...summary.entries()].map(([key, count], index) => {
    const [action, target, batch] = key.split("|");
    return `${index + 2}. \`${action}\` -> \`${target}\` | batch=\`${batch}\`: ${count} files`;
  }),
  "",
  "## Recommended Execution Order",
  "",
  "1. `academy-reclassify-technical-analysis`",
  "2. `academy-reclassify-korean-logic`",
  "3. `academy-reclassify-negotiation`",
  "4. `interactive-reclassify-magazine-labs`",
  "5. `interactive-reclassify-guide-calculators`",
  "6. `magazine-replace-lecture-table`",
  "7. `interactive-reclassify-quick-tests`",
  "8. `manual-review`",
  "",
  "## Output Files",
  "",
  "1. [data/catalog/magazine-compatibility-triage.csv](/Users/seuncho/coding/blog/data/catalog/magazine-compatibility-triage.csv)",
  "2. [reports/260509-magazine-compatibility-triage.md](/Users/seuncho/coding/blog/reports/260509-magazine-compatibility-triage.md)",
];

fs.writeFileSync(outputMd, `${md.join("\n")}\n`);

console.log(`magazine triage complete: ${triaged.length} affected files`);
