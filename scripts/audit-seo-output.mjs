import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const siteUrl = "https://game.oiyo.net";

const failures = [];

if (!fs.existsSync(dist)) {
  failures.push("dist directory is missing; run npm run build first");
} else {
  const sitemapIndex = path.join(dist, "sitemap-index.xml");
  if (!fs.existsSync(sitemapIndex)) {
    failures.push("missing sitemap-index.xml");
  } else {
    const indexXml = fs.readFileSync(sitemapIndex, "utf8");
    const shardUrls = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    if (!shardUrls.length) failures.push("sitemap-index.xml has no sitemap shards");
    for (const shardUrl of shardUrls) {
      const parsed = new URL(shardUrl);
      if (parsed.origin !== siteUrl) {
        failures.push(`sitemap-index.xml references a foreign host: ${shardUrl}`);
        continue;
      }
      const shard = parsed.pathname.replace(/^\//, "");
      if (!fs.existsSync(path.join(dist, shard))) failures.push(`missing referenced sitemap shard: ${shard}`);
    }
  }
}

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(full);
    return entry.isFile() && entry.name === "index.html" ? [full] : [];
  });
}

function urlToDistPath(url) {
  if (!url.startsWith(siteUrl)) return null;
  const pathname = new URL(url).pathname;
  return path.join(dist, pathname, "index.html");
}

let checkedHtml = 0;
for (const file of listHtmlFiles(dist)) {
  checkedHtml += 1;
  const rel = path.relative(dist, file);
  const html = fs.readFileSync(file, "utf8");

  // Bridge stubs are noindex and may canonicalize cross-domain to a family host.
  const isNoindex = /<meta name="robots" content="noindex/.test(html);
  const canonicalRe = isNoindex
    ? /<link rel="canonical" href="https:\/\/([a-z]+\.)?oiyo\.net\//
    : /<link rel="canonical" href="https:\/\/game\.oiyo\.net\//;
  if (!canonicalRe.test(html)) {
    failures.push(`${rel}: missing canonical link`);
  }

  for (const match of html.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)"\/?>/g)) {
    const target = urlToDistPath(match[1]);
    if (target && !fs.existsSync(target)) {
      failures.push(`${rel}: hreflang target does not exist: ${match[1]}`);
    }
  }
}

if (failures.length) {
  for (const failure of failures.slice(0, 80)) {
    console.error(`error: ${failure}`);
  }
  if (failures.length > 80) {
    console.error(`error: ${failures.length - 80} more SEO failures omitted`);
  }
  console.error(`SEO output audit failed: ${failures.length} issue(s)`);
  process.exit(1);
}

console.log(`SEO output audit passed (${checkedHtml} HTML file(s) checked)`);
