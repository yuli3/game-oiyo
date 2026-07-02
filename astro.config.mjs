// @ts-check

import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import robotsTxt from "astro-robots-txt";

// Bridge pages are noindex stubs that canonicalize to oiyo.net —
// they must never appear in the sitemap.
const BRIDGE_SLUGS = new Set(
  JSON.parse(readFileSync(new URL("./src/config/bridge-slugs.json", import.meta.url), "utf8")),
);

// https://astro.build/config
export default defineConfig({
  site: "https://game.oiyo.net",
  output: "static",
  integrations: [
    react(),
    mdx(),
    sitemap({
      // Keep sitemap shards predictable for search console inspection.
      // With the current corpus this produces sitemap-0.xml through sitemap-2.xml.
      entryLimit: 3000,
      // Exclude dev/utility paths and underscore-prefixed routes
      filter: (page) => {
        const url = new URL(page);
        const path = url.pathname;
        // Exclude paths with underscore segments
        if (path.split("/").some((seg) => seg.startsWith("_"))) return false;
        // Exclude /index duplicate (trailing slash version is canonical)
        if (path.endsWith("/index/") || path === "/index") return false;
        // Exclude noindex bridge stubs (canonical lives on oiyo.net)
        const segs = path.split("/").filter(Boolean);
        if (segs.length === 2 && BRIDGE_SLUGS.has(segs[1])) return false;
        return true;
      },
      // Set lastmod to today's build date
      lastmod: new Date(),
      // Use serialize for per-URL priority and changefreq
      serialize: (item) => {
        const url = new URL(item.url);
        const path = url.pathname;
        // Homepage — highest priority
        if (path === "/" || path === "") {
          return { ...item, priority: 1.0 };
        }
        // Locale homepages (e.g. /ko/, /ja/, /fr/)
        if (/^\/(ko|ja|fr|es|zh)\/$/.test(path)) {
          return { ...item, priority: 0.9 };
        }
        // Blog article pages
        if (/^\/(en|ko|ja|fr|es|zh)\/[^/]+\/$/.test(path)) {
          return { ...item, priority: 0.8 };
        }
        // Pagination pages (/2/, /3/, …)
        if (/\/\d+\/$/.test(path)) {
          return { ...item, priority: 0.4 };
        }
        // Everything else
        return { ...item, priority: 0.6 };
      },
    }),
    robotsTxt(),
  ],
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ko", "ja", "fr", "es", "zh"],
    routing: "manual",
  },
  build: {
    format: "directory",
    concurrency: 1,
  },
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
    build: {
      minify: "esbuild",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/recharts")) return "recharts";
            if (id.includes("node_modules/react-dom")) return "react-dom";
            if (id.includes("node_modules/react")) return "react-vendor";
            if (id.includes("node_modules/lucide-react")) return "lucide";
          },
        },
      },
    },
  },
  markdown: {
    // Disable built-in GFM so we can re-apply it with singleTilde: false.
    // Korean content uses ~ as a range character (e.g. "1~2번 12일~13일"),
    // which MDX would otherwise parse as strikethrough.
    // Intentional strikethrough should use <del>text</del> instead.
    gfm: false,
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
    remarkPlugins: [
      [remarkGfm, { singleTilde: false }],
      remarkMath,
    ],
    rehypePlugins: [
      [rehypeKatex, { strict: "ignore" }],
    ],
  },
});
