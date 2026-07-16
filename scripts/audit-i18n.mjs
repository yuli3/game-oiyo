#!/usr/bin/env node
/**
 * i18n Audit Script for blog-oiyo (Astro)
 *
 * Checks:
 *   1. Deep key parity — every key in en.json must exist in all other locales
 *   2. Empty string values ("") in non-en locales (likely untranslated)
 *   3. Values identical to en.json in non-en locales (English text left in place)
 *
 * Exit 0 = clean, Exit 1 = errors found
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "../src/locales");

// Active locales only. `cn` is retired and should remain redirect-only, not a
// parity requirement for new UI copy.
const LOCALES = ["ko", "ja", "es", "fr", "zh"];
const SOURCE = "en";

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadJson(locale) {
  const path = join(LOCALES_DIR, `${locale}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    console.error(`  ERROR: Could not read ${locale}.json — ${err.message}`);
    process.exit(1);
  }
}

/**
 * Recursively collect all leaf key paths from an object.
 * Returns an array of dot-separated path strings.
 */
function collectLeafPaths(obj, prefix = "") {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...collectLeafPaths(value, fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

/**
 * Get a deeply nested value by dot-separated path.
 */
function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const enData = loadJson(SOURCE);
const enLeafPaths = collectLeafPaths(enData);

let totalErrors = 0;
const results = {};

for (const locale of LOCALES) {
  const data = loadJson(locale);
  const issues = { missingKeys: [], emptyValues: [], identicalToEn: [] };

  for (const keyPath of enLeafPaths) {
    const enValue = getByPath(enData, keyPath);
    const localeValue = getByPath(data, keyPath);

    // 1. Missing key
    if (localeValue === undefined) {
      issues.missingKeys.push(keyPath);
      continue;
    }

    // 2. Empty string
    if (typeof localeValue === "string" && localeValue.trim() === "") {
      issues.emptyValues.push(keyPath);
      continue;
    }

    // 3. Identical to en (untranslated copy)
    if (typeof localeValue === "string" && localeValue === enValue) {
      issues.identicalToEn.push(keyPath);
    }
  }

  results[locale] = issues;
  const errorCount = issues.missingKeys.length + issues.emptyValues.length;
  totalErrors += errorCount;
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  i18n Audit — blog-oiyo");
console.log(`  Source: en.json (${enLeafPaths.length} keys)`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

for (const locale of LOCALES) {
  const { missingKeys, emptyValues, identicalToEn } = results[locale];
  const hasErrors = missingKeys.length > 0 || emptyValues.length > 0;
  const hasWarnings = identicalToEn.length > 0;
  const status = hasErrors ? "FAIL" : hasWarnings ? "WARN" : "OK";
  const statusLabel =
    status === "FAIL" ? "[ FAIL ]" : status === "WARN" ? "[ WARN ]" : "[  OK  ]";

  console.log(`${statusLabel}  ${locale}.json`);

  if (missingKeys.length > 0) {
    console.log(`         Missing keys (${missingKeys.length}):`);
    missingKeys.forEach((k) => console.log(`           - ${k}`));
  }

  if (emptyValues.length > 0) {
    console.log(`         Empty values (${emptyValues.length}):`);
    emptyValues.forEach((k) => console.log(`           - ${k}`));
  }

  if (identicalToEn.length > 0) {
    console.log(
      `         Identical to en (likely untranslated) (${identicalToEn.length}):`
    );
    identicalToEn.forEach((k) => console.log(`           ~ ${k}`));
  }

  if (!hasErrors && !hasWarnings) {
    console.log(`         All ${enLeafPaths.length} keys present and translated.`);
  }

  console.log();
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
if (totalErrors === 0) {
  console.log("  RESULT: PASS — No missing keys or empty values found.");
  const totalIdentical = LOCALES.reduce(
    (sum, l) => sum + results[l].identicalToEn.length,
    0
  );
  if (totalIdentical > 0) {
    console.log(
      `  NOTE:   ${totalIdentical} value(s) across all locales are identical to en.json`
    );
    console.log("          (warnings only — review if intentional).");
  }
} else {
  console.log(`  RESULT: FAIL — ${totalErrors} error(s) found. Fix before committing.`);
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

process.exit(totalErrors > 0 ? 1 : 0);
