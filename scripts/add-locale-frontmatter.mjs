import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '../src/content/blog');

const locales = ['en', 'ko', 'ja', 'fr', 'es', 'zh'];

const stats = {};

for (const locale of locales) {
  const localeDir = join(BLOG_DIR, locale);
  let files;
  try {
    files = readdirSync(localeDir).filter((f) => f.endsWith('.mdx'));
  } catch {
    console.warn(`Directory not found: ${localeDir}`);
    continue;
  }

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = join(localeDir, file);
    const content = readFileSync(filePath, 'utf-8');

    // Check if frontmatter already has a locale: field
    // Frontmatter is between the first two --- delimiters
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.warn(`No frontmatter found in ${filePath}`);
      skipped++;
      continue;
    }

    const frontmatterBody = frontmatterMatch[1];
    // Check if locale: field already exists (at start of line)
    if (/^locale:/m.test(frontmatterBody)) {
      skipped++;
      continue;
    }

    // Insert locale as the second line (right after opening ---)
    // Content starts with "---\n", so we insert after the first newline
    const newContent = content.replace(/^---\n/, `---\nlocale: ${locale}\n`);

    writeFileSync(filePath, newContent, 'utf-8');
    updated++;
  }

  stats[locale] = { total: files.length, updated, skipped };
  console.log(`${locale}: ${files.length} total, ${updated} updated, ${skipped} already had locale`);
}

console.log('\nDone.');
console.log('\nSummary:');
for (const [locale, s] of Object.entries(stats)) {
  console.log(`  ${locale}: ${s.total} files (${s.updated} updated, ${s.skipped} skipped)`);
}
