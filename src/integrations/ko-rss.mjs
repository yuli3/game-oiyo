// Korean RSS feed for Naver Search Advisor (2026-11-22).
//
// WHY: Naver had 0 pages of this host in its index even though the site is
// registered, and Search Advisor's RSS submission is the fastest way to get
// pages collected. The head already advertised /rss.xml but nothing served it
// (404). This runs after the build, reads the real Korean pages from dist/ko/,
// and writes dist/rss.xml with each page's own title, description and
// canonical. Noindex pages are left out. pubDate is the last commit date of
// the page's source file; without git history the item has no pubDate rather
// than a fake build-time date.
//
// Identical copy in game/tools. Keep them in lockstep.
import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function pick(html, re) {
  const m = html.match(re);
  return m ? unesc(m[1].trim()) : "";
}

/** "a/b" (path under /ko/) -> last commit ISO date of its source page. */
function sourceDates(root) {
  const out = new Map();
  try {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 });
    if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") {
      try { git(["fetch", "--unshallow", "--quiet"]); } catch { /* offline */ }
      if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") return out;
    }
    let current = "";
    for (const line of git(["log", "--name-only", "--format=@%cI", "--", "src/pages"]).split("\n")) {
      if (line.startsWith("@")) { current = line.slice(1); continue; }
      const m = line.match(/^src\/pages\/\[[^\]]+\]\/(.+?)(?:\/index)?\.(?:astro|mdx?)$/);
      if (m && !out.has(m[1])) out.set(m[1], current);
    }
  } catch {
    return new Map();
  }
  return out;
}

async function htmlFiles(dir, depth = 0) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && depth < 2) out.push(...(await htmlFiles(p, depth + 1)));
    else if (e.name === "index.html" && depth > 0) out.push(p);
  }
  return out;
}

/** @param {{ site: string, title: string, description: string, maxItems?: number }} opts */
export default function koRss(opts) {
  return {
    name: "oiyo-ko-rss",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const root = process.cwd();
        const site = opts.site.replace(/\/$/, "");
        const dates = sourceDates(root);
        const items = [];
        for (const file of await htmlFiles(path.join(dist, "ko"))) {
          const html = await readFile(file, "utf8");
          if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) continue;
          const rel = path.relative(path.join(dist, "ko"), path.dirname(file)).split(path.sep).join("/");
          const link = pick(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) || `${site}/ko/${rel}/`;
          if (!link.startsWith(`${site}/ko/`)) continue; // canonical points elsewhere
          const title = pick(html, /<title>([^<]*)<\/title>/i);
          if (!title) continue;
          const description = pick(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
          items.push({ title, link, description, date: dates.get(rel) ?? "" });
        }
        items.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.link.localeCompare(b.link));
        const top = items.slice(0, opts.maxItems ?? 500);
        const newest = top.find((i) => i.date)?.date;
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
          "<channel>",
          `<title>${esc(opts.title)}</title>`,
          `<link>${site}/ko/</link>`,
          `<description>${esc(opts.description)}</description>`,
          "<language>ko</language>",
          `<atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>`,
          newest ? `<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>` : "",
          ...top.map((i) =>
            [
              "<item>",
              `<title>${esc(i.title)}</title>`,
              `<link>${esc(i.link)}</link>`,
              `<guid isPermaLink="true">${esc(i.link)}</guid>`,
              i.description ? `<description>${esc(i.description)}</description>` : "",
              i.date ? `<pubDate>${new Date(i.date).toUTCString()}</pubDate>` : "",
              "</item>",
            ].filter(Boolean).join(""),
          ),
          "</channel>",
          "</rss>",
        ].filter(Boolean).join("\n");
        await writeFile(path.join(dist, "rss.xml"), xml + "\n");
        logger.info(`rss.xml: ${top.length} Korean pages (${items.length} found, ${dates.size ? "with" : "without"} git dates)`);
      },
    },
  };
}
