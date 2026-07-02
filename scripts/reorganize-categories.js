import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const blogDir = "./src/content/blog";

const categoryMap = {
  // Mind & Psychology
  PSYCHOLOGY: "Mind & Psychology",
  ATTACHMENT: "Mind & Psychology",
  MBTI: "Mind & Psychology",
  NEUROSCIENCE: "Mind & Psychology",
  "MENTAL-HEALTH": "Mind & Psychology",
  SLEEP: "Mind & Psychology",
  BIOLOGY: "Mind & Psychology",
  TCI: "Mind & Psychology",
  BIG5: "Mind & Psychology",
  HEXACO: "Mind & Psychology",
  HSP: "Mind & Psychology",

  // Philosophy & Spirit
  PHILOSOPHY: "Philosophy & Spirit",
  SPIRITUALITY: "Philosophy & Spirit",
  TAOISM: "Philosophy & Spirit",
  TIME: "Philosophy & Spirit",
  QUANTUM: "Philosophy & Spirit",
  RESONANCE: "Philosophy & Spirit",

  // Myth & Culture
  MYTHOLOGY: "Myth & Culture",
  HISTORY: "Myth & Culture",
  CULTURE: "Myth & Culture",
  SOCIAL: "Myth & Culture",

  // Mysticism
  ASTROLOGY: "Mysticism",
  SAJU: "Mysticism",
  TAROT: "Mysticism",
  RUNES: "Mysticism",
  KABBALAH: "Mysticism",
  NUMEROLOGY: "Mysticism",
  FENG_SHUI: "Mysticism",
  FENGSHUI: "Mysticism",
  EGYPTIAN: "Mysticism",
  ALMANAC: "Mysticism",
  ARCHETYPES: "Mysticism",
  BIORHYTHM: "Mysticism",
  DREAM: "Mysticism",
  "HUMAN-DESIGN": "Mysticism",
  MAYAN: "Mysticism",
  SHAMANISM: "Mysticism",
  VEDIC: "Mysticism",
  ZIWEI: "Mysticism",
  ENNEAGRAM: "Mysticism",
  PROBABILITY: "Mysticism",

  // Society & Wealth
  FINANCE: "Society & Wealth",
  ECONOMICS: "Society & Wealth",
  "PUBLIC-MANAGEMENT": "Society & Wealth",
  MANAGEMENT: "Society & Wealth",
  ACCOUNTING: "Society & Wealth",
  "ACTUARIAL SCIENCE": "Society & Wealth",
  BUSINESS: "Society & Wealth",
  LAW: "Society & Wealth",
  NEGOTIATION: "Society & Wealth",
  "PRODUCT MANAGEMENT": "Society & Wealth",
  "PUBLIC ADMINISTRATION": "Society & Wealth",
  STATISTICS: "Society & Wealth",

  // Lifestyle & Growth
  LIFESTYLE: "Lifestyle & Growth",
  TRAVEL: "Lifestyle & Growth",
  CAREER: "Lifestyle & Growth",
  EDUCATION: "Lifestyle & Growth",
  LEARNING: "Lifestyle & Growth",
  SCIENCE: "Lifestyle & Growth",
  PHYSICAL: "Lifestyle & Growth",
  TECHNOLOGY: "Lifestyle & Growth",
  "COMPUTER SCIENCE": "Lifestyle & Growth",
  HEALTH: "Lifestyle & Growth",
  "HEALTH-SCIENCE": "Lifestyle & Growth",

  // Catchall / edge cases mapping
  "QUANTUM MECHANICS": "Philosophy & Spirit",
  COLOR: "Mysticism",
  HELLENISTIC: "Mysticism",
  BIO_HACKING: "Lifestyle & Growth",
  HUMAN_DESIGN: "Mysticism",
  MENTAL_HEALTH: "Mind & Psychology",
  WISDOM: "Philosophy & Spirit",
  COSMIC: "Mysticism",
  신화: "Myth & Culture",
  양자역학: "Philosophy & Spirit",
};

const processedCategories = new Set();

async function processDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      await processFile(fullPath);
    }
  }
}

async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = matter(content);

    // Update frontmatter category
    const data = parsed.data;
    const oldCat = data.category;

    if (oldCat) {
      const normalizedOld = oldCat.toUpperCase();
      // Match from map, otherwise keep as is or bucket to a default
      if (categoryMap[normalizedOld]) {
        data.category = categoryMap[normalizedOld];
        processedCategories.add(data.category);
      } else {
        // Fallback for an unmapped category to just captitalize it
        data.category = oldCat;
        processedCategories.add(data.category);
      }

      const newContent = matter.stringify(parsed.content, data);
      await fs.writeFile(filePath, newContent, "utf-8");
    }
  } catch (err) {
    console.error(`Failed to process ${filePath}:`, err);
  }
}

async function run() {
  console.log("Starting category reorganization...");
  await processDirectory(blogDir);
  console.log("Final resolved categories list:");
  console.log(Array.from(processedCategories));
  console.log("Reorganization completed.");
}

run();
