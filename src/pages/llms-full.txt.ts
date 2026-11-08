import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site.config';
import { locales } from '../lib/i18n';
import { GAME_GUIDES } from '../data/game-guides';
import { getFallbackGameGuide } from '../lib/seo/game-guide-fallback';

/**
 * Machine-readable Comprehensive LLM Context File (llms-full.txt)
 * Adheres to the /llms-full.txt standard for AI search engines and agents
 * (ChatGPT Search, Perplexity, Claude, Google SGE, Copilot).
 * Provides full contextual E-E-A-T game mechanics, categories, rules, and endpoint registry.
 */

const humanize = (s: string) =>
  s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const AI_OPPONENT_GAMES = new Set([
  'chess', 'checkers', 'gomoku', 'janggi', 'connect-four', 'reversi',
  'blackjack', 'bad-north-tactics', 'tents-and-trees',
]);

export const GET: APIRoute = async () => {
  const base = siteConfig.url;
  const modules = import.meta.glob('/src/pages/[...lang]/*.astro');

  const seen = new Set<string>();
  const games: {
    slug: string;
    title: string;
    hasAiOpponent: boolean;
    howToPlayEn: string;
    howToPlayKo: string;
    rules: string[];
    originEn: string;
  }[] = [];

  for (const filePath of Object.keys(modules)) {
    const slug = filePath
      .replace(/^\/src\/pages\/\[\.\.\.lang\]\//, '')
      .replace(/\.astro$/, '');

    // Skip index, error, or meta pages
    if (['index', '404', 'achievements', 'tier-list'].includes(slug)) {
      continue;
    }

    if (seen.has(slug)) continue;
    seen.add(slug);

    const title = humanize(slug);
    const guide = GAME_GUIDES[slug] ?? getFallbackGameGuide(slug, title);

    games.push({
      slug,
      title,
      hasAiOpponent: AI_OPPONENT_GAMES.has(slug),
      howToPlayEn: guide.how.en,
      howToPlayKo: guide.how.ko,
      rules: guide.rules?.en || [
        'Browser-based instant play with no download or account needed.',
        'Supports intuitive mouse, keyboard, or touchscreen controls.',
        'High scores and progress are preserved in browser storage.',
      ],
      originEn: guide.origin.en,
    });
  }

  // Sort alphabetically by slug
  games.sort((a, b) => a.slug.localeCompare(b.slug));

  let out = `# OIYO Arcade Full Catalog (llms-full.txt)\n\n`;
  out += `> Free web browser games from the OIYO family. Playable instantly with zero installation, zero downloads, and zero paywalls.\n`;
  out += `> Canonical Host: ${base}\n`;
  out += `> Supported Locales: ${locales.join(', ')}\n`;
  out += `> Total Interactive Games & Tools: ${games.length}\n\n`;

  out += `## Core Features & AI Capabilities\n`;
  out += `- 100% Client-side Execution: Canvas/WebGL-powered gameplay for sub-second start and minimal latency.\n`;
  out += `- Multi-tier AI Opponents: Algorithmic bots available on select board and strategy games (e.g., Minimax, Alpha-Beta, heuristic search).\n`;
  out += `- Fully Localized: Comprehensive UX, rulebooks, and FAQ in English, Korean, Japanese, Chinese, French, and Spanish.\n\n`;

  out += `## Games Directory\n\n`;

  for (const g of games) {
    out += `### ${g.title} (${g.slug})\n`;
    out += `- Canonical URL (EN): ${base}/en/${g.slug}/\n`;
    out += `- Canonical URL (KO): ${base}/ko/${g.slug}/\n`;
    out += `- AI Opponent Supported: ${g.hasAiOpponent ? 'Yes (Built-in Web AI)' : 'Single Player / Puzzle / Score Attack'}\n`;
    out += `- Gameplay Summary: ${g.howToPlayEn}\n`;
    out += `- Korean Summary: ${g.howToPlayKo}\n`;
    out += `- Core Rules:\n`;
    for (const r of g.rules) {
      out += `  * ${r}\n`;
    }
    out += `- Origin & Context: ${g.originEn}\n`;
    out += `- Direct Endpoints: ` + locales.map((l) => `[${l}](${base}/${l}/${g.slug}/)`).join(' · ') + `\n\n`;
  }

  out += `## Machine-Readable API & Schema Endpoints\n`;
  out += `- Catalog manifest: ${base}/knowledge/index.json\n`;
  out += `- RSS Feed: ${base}/rss.xml\n`;
  out += `- Sitemap Index: ${base}/sitemap-index.xml\n`;
  out += `- Short LLM Manifest: ${base}/llms.txt\n`;
  out += `- Organization & Publisher: https://oiyo.net/#organization\n`;

  return new Response(out, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};
