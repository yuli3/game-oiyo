import assert from 'node:assert/strict';
import test from 'node:test';
import { toolCtaHref, TOOL_CTA_BLOG_SLUGS, TOOL_CTA_FAMILY_OVERRIDES } from './tool-cta-href.ts';

test('never points at ahoxy.com', () => {
  const samples = [
    ...Object.keys(TOOL_CTA_FAMILY_OVERRIDES),
    ...Object.keys(TOOL_CTA_BLOG_SLUGS),
    'crypto-tax-calculator',
    'totally-unknown-tool',
  ];
  for (const tool of samples) {
    const href = toolCtaHref(tool, 'ko');
    assert.equal(href.includes('ahoxy.com'), false, href);
    assert.ok(
      /^https:\/\/((blog|game)\.)?oiyo\.net\//.test(href) || href.startsWith('/'),
      href,
    );
  }
});

test('maps used calculators to live blog tool slugs', () => {
  assert.equal(
    toolCtaHref('bmi', 'ko'),
    'https://blog.oiyo.net/ko/bmi-calculator/?utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta',
  );
  assert.equal(
    toolCtaHref('compound', 'en'),
    'https://blog.oiyo.net/en/compound-interest-calculator/?utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta',
  );
});

test('keeps oiyo overrides, game-local chess/gomoku, hubs unknown tools', () => {
  assert.match(toolCtaHref('adhd-screening', 'ko'), /^https:\/\/oiyo\.net\/ko\/adhd\/test\?/);
  assert.equal(toolCtaHref('chess', 'ko'), '/ko/chess/');
  assert.equal(toolCtaHref('gomoku', 'en'), '/en/gomoku/');
  assert.equal(
    toolCtaHref('crypto-tax-calculator', 'ko'),
    'https://blog.oiyo.net/ko/tools/?utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta',
  );
});
