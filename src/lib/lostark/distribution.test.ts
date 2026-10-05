import { describe, expect, it } from 'vitest';
import { calculateSupporterInfo, generateDistribution, parsePlayerLines } from './distribution';

const party = ['ㄷㄷㄷㅍ', 'ㄷㄷㅍㅍ', 'ㅍㄷㄷㄷ', 'ㄷㄷㄷㄷ'];

describe('lostark distribution input', () => {
  it('distributes a clean 4-player party', () => {
    const out = generateDistribution([party.join('\n')], '1-3', '4');
    expect(out.error).toBeNull();
    expect(out.result).toHaveLength(4);
  });

  // 2026-10-05: pasted text from Windows chat apps ends each line with \r.
  it('accepts CRLF line endings, trailing spaces and spaced letters', () => {
    const pasted = 'ㄷㄷㄷㅍ\r\nㄷㄷㅍㅍ \r\nㅍ ㄷ ㄷ ㄷ\r\n\tㄷㄷㄷㄷ\r\n';
    expect(parsePlayerLines([pasted])).toEqual(party);
    const out = generateDistribution([pasted], '1-3', '4');
    expect(out.error).toBeNull();
    expect(out.result).toEqual(generateDistribution([party.join('\n')], '1-3', '4').result);
  });

  it('still rejects a wrong player count and unknown letters', () => {
    expect(generateDistribution([party.slice(0, 3).join('\n')], '1-3', '4')).toMatchObject({
      error: 'count',
      errorDetail: { expected: 4, actual: 3 },
    });
    expect(generateDistribution([['ㄷㄷㄷㅍ', 'ㄷㄷX', 'ㅍㄷㄷㄷ', 'ㄷㄷㄷㄷ'].join('\n')], '1-3', '4')).toMatchObject({
      error: 'invalid',
      errorDetail: { lines: '2' },
    });
  });

  it('counts supporters the same way with or without stray whitespace', () => {
    const clean = calculateSupporterInfo([party.join('\n')], '4', '1-3');
    const messy = calculateSupporterInfo([party.join(' \r\n')], '4', '1-3');
    expect(messy.supporterCount).toBe(clean.supporterCount);
    expect(clean.supporterCount).toBe(4);
  });
});
