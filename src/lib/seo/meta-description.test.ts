import { describe, it, expect } from 'vitest';
import { buildGameMetaDescription } from './meta-description';

describe('buildGameMetaDescription', () => {
  it('expands missing description into informative game description', () => {
    const result = buildGameMetaDescription({
      title: '스이카 드롭 (수박 게임)',
      locale: 'ko',
      pathname: '/ko/suika-drop/',
    });
    expect(result.length).toBeGreaterThanOrEqual(75);
    expect(result.length).toBeLessThanOrEqual(145);
    expect(result).toContain('스이카 드롭');
    expect(result).toContain('무료');
  });

  it('handles raid utility routes appropriately', () => {
    const result = buildGameMetaDescription({
      title: '로스트아크 경매 분배금 계산기',
      locale: 'ko',
      pathname: '/ko/lostark-auction-calculator/',
    });
    expect(result.length).toBeGreaterThanOrEqual(75);
    expect(result).toContain('손익분기점');
    expect(result).toContain('입찰가');
  });

  it('prevents title duplication', () => {
    const result = buildGameMetaDescription({
      title: 'Block Burst 3D',
      description: 'Block Burst 3D',
      locale: 'en',
      pathname: '/en/block-burst/',
    });
    expect(result).not.toBe('Block Burst 3D');
    expect(result.length).toBeGreaterThanOrEqual(95);
    expect(result).toContain('Free browser game');
  });

  it('replaces generic default site description with game-specific description', () => {
    const defaultSiteDesc = 'Free browser games to play instantly. Clean, responsive, and distraction-free gaming experience on game.oiyo.net.';
    const result = buildGameMetaDescription({
      title: 'Chaos Kitchen',
      description: defaultSiteDesc,
      locale: 'en',
      pathname: '/en/chaos-kitchen/',
    });
    expect(result).toContain('Chaos Kitchen');
    expect(result).not.toBe(defaultSiteDesc);
  });
});
