// Post-build hreflang reconciliation (2026-09-24).
//
// The SEO components build each page's hreflang cluster from the route shape
// (/{locale}/{rest}), so they cannot know whether a translation was actually
// built or whether it is noindex for its own reasons (bridge, gate, pagination,
// category, search, noindex slug). Advertising those URLs sends Google to 404s
// and noindex pages. This runs after the build, reads the real output, and
// keeps an alternate only when:
//   - the source page itself is indexable (noindex pages emit no hreflang),
//   - the target is same-host, was built (HTML exists) and is not noindex,
//   - the pair is reciprocal (the target lists this page as well).
// A cluster left with fewer than two languages is removed entirely (x-default
// included). Noindex/sitemap decisions are untouched: those are made by the
// page and the sitemap filter, and this only makes hreflang follow them.
//
// Identical copy in oiyo/blog/wiki/game. Keep them in lockstep.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LINK_RE = /<link\b[^>]*\bhreflang\s*=\s*"[^"]*"[^>]*>/gi;
const ROBOTS_RE = /<meta\b[^>]*\bname\s*=\s*"robots"[^>]*>/gi;

/** @param {string} tag @param {string} name */
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

/** @param {string} dir @returns {Promise<string[]>} */
async function listHtml(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtml(full)));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/** @param {string} root @param {string} file */
function routeOf(root, file) {
  const rel = "/" + path.relative(root, file).split(path.sep).join("/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
}

/** @param {string} href @param {string} host */
function sameHostPath(href, host) {
  try {
    const url = new URL(href);
    return url.host === host ? url.pathname : null;
  } catch {
    return null;
  }
}

/** @returns {import("astro").AstroIntegration} */
export default function hreflangReconcile() {
  let host = "";
  return {
    name: "oiyo-hreflang-reconcile",
    hooks: {
      "astro:config:done": ({ config }) => {
        host = config.site ? new URL(config.site).host : "";
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (!host) {
          logger.warn("site is not set; hreflang reconciliation skipped");
          return;
        }
        const root = fileURLToPath(dir);
        /** @type {Map<string, { file: string, html: string, noindex: boolean, alts: { tag: string, lang: string, target: string | null }[] }>} */
        const pages = new Map();
        for (const file of await listHtml(root)) {
          const html = await readFile(file, "utf8");
          const headEnd = html.indexOf("</head>");
          const head = headEnd === -1 ? html : html.slice(0, headEnd);
          const noindex = (head.match(ROBOTS_RE) ?? []).some((t) => /noindex/i.test(attr(t, "content") ?? ""));
          const alts = (head.match(LINK_RE) ?? [])
            .filter((tag) => (attr(tag, "rel") ?? "").toLowerCase() === "alternate")
            .map((tag) => ({ tag, lang: attr(tag, "hreflang") ?? "", target: sameHostPath(attr(tag, "href") ?? "", host) }));
          pages.set(routeOf(root, file), { file, html, noindex, alts });
        }

        let rewritten = 0;
        let removed = 0;
        for (const [route, page] of pages) {
          if (page.alts.length === 0) continue;
          let keep = [];
          if (!page.noindex) {
            keep = page.alts.filter(({ lang, target }) => {
              if (!target) return false;
              const other = pages.get(target);
              if (!other || other.noindex) return false;
              if (lang.toLowerCase() === "x-default" || target === route) return true;
              return other.alts.some((a) => a.target === route && a.lang.toLowerCase() !== "x-default");
            });
            const languages = keep.filter((a) => a.lang.toLowerCase() !== "x-default").length;
            if (languages < 2) keep = [];
          }
          if (keep.length === page.alts.length) continue;
          const kept = new Set(keep.map((a) => a.tag));
          let html = page.html;
          for (const { tag } of page.alts) {
            if (kept.has(tag)) continue;
            html = html.replace(tag, "");
            removed += 1;
          }
          await writeFile(page.file, html);
          rewritten += 1;
        }
        logger.info(`hreflang: ${removed} alternate link(s) removed from ${rewritten} page(s)`);
      },
    },
  };
}
