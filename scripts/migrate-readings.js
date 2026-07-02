import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const readingsDir = "./src/content/readings";
const blogDir = "./src/content/blog";

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

    // Extract info from filename and path
    const fileName = path.basename(filePath);
    const relativePath = path.relative(readingsDir, filePath);
    const folderParts = relativePath.split(path.sep);
    const categoryName =
      folderParts.length > 1 ? folderParts[0].toUpperCase() : "GENERAL";

    // Determine slug and locale from filename (e.g., [slug].[locale].mdx)
    let slug = fileName.replace(/\.mdx$/, "");
    let locale = "en"; // default

    const nameParts = slug.split(".");
    if (nameParts.length > 1) {
      const possibleLocale = nameParts[nameParts.length - 1];
      if (["en", "ko", "ja", "fr", "es", "zh", "cn"].includes(possibleLocale)) {
        locale = possibleLocale;
        slug = nameParts.slice(0, -1).join(".");
      } else {
        // e.g. "finance-01-foundation" without a locale segment
      }
    }

    // Update frontmatter
    const data = parsed.data;

    // Required fields: title, description, pubDate
    if (!data.title) {
      data.title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (data.title.length < 10) data.title += " Overview";
    }

    // Map description
    if (!data.description) {
      if (data.excerpt && data.excerpt.length >= 10) {
        data.description = data.excerpt;
      } else {
        const titlePart = data.title;
        data.description =
          `A comprehensive overview of ${titlePart} and its principles.`.slice(
            0,
            200,
          );
      }
    }

    // Ensure length bounds
    if (data.description.length < 10)
      data.description = data.description.padEnd(10, ".");
    if (data.description.length > 200)
      data.description = data.description.substring(0, 197) + "...";
    if (data.title.length < 10) data.title = data.title.padEnd(10, " ");
    if (data.title.length > 100)
      data.title = data.title.substring(0, 97) + "...";

    // Map dates
    if (!data.pubDate) {
      let srcDateStr = data.publishDate || data.date;
      if (srcDateStr) {
        data.pubDate = new Date(srcDateStr).toISOString().split("T")[0];
      } else {
        data.pubDate = "2025-01-01";
      }
    } else {
      if (data.pubDate instanceof Date) {
        data.pubDate = data.pubDate.toISOString().split("T")[0];
      } else {
        data.pubDate = new Date(data.pubDate).toISOString().split("T")[0];
      }
    }

    // Map category
    if (!data.category) {
      data.category = categoryName;
    }

    // Clean up
    delete data.id;
    delete data.excerpt;
    delete data.publishDate;
    delete data.readingTimeMinutes;
    if (!data.author) data.author = "Oiyo";
    if (!data.tags) data.tags = [];

    const newContent = matter.stringify(parsed.content, data);

    const targetDir = path.join(blogDir, locale);
    const targetPath = path.join(targetDir, `${slug}.mdx`);

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetPath, newContent, "utf-8");

    console.log(`Migrated: ${filePath} -> ${targetPath}`);
  } catch (err) {
    console.error(`Failed to process ${filePath}:`, err);
  }
}

async function run() {
  console.log("Starting migration...");
  await processDirectory(readingsDir);
  console.log("Migration completed.");
}

run();
