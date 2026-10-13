import { describe, expect, it } from 'vitest';
import { calculateSupporterInfo, generateDistribution, inferDistributionSettings, parsePlayerLines } from './distribution';

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

  // 2026-10-13: numbered or comma-separated lines, full-width letters and conjoining jamo.
  it('ignores numbering and separators and maps look-alike letters', () => {
    const pasted = '1. ㄷ,ㄷ,ㄷ,ㅍ\n2) ㄷ/ㄷ/ㅍ/ㅍ\n3- ㅍ|ㄷ|ㄷ|ㄷ\n4 \u1103\u1103\u1103\u1103';
    expect(parsePlayerLines([pasted])).toEqual(party);
    expect(parsePlayerLines(['ＤＤｓＳ'])).toEqual(['DDsS']);
    expect(generateDistribution([pasted], '1-3', '4').error).toBeNull();
  });
});

describe('lostark distribution settings inference', () => {
  const eight = [...party, ...party];

  it('finds the party size an 8-player lineup fits under the 16-player default', () => {
    expect(inferDistributionSettings([party.join('\n'), party.join('\n'), '', ''], '1-3', '16')).toEqual({ raidType: '1-3', partySize: '8' });
    expect(generateDistribution([eight.join('\n')], '1-3', '8').error).toBeNull();
  });

  it('finds 본1부1 when every line has two letters', () => {
    expect(inferDistributionSettings([['ㄷㅍ', 'ㄷㄷ', 'ㅍㄷ', 'ㄷㄷ'].join('\n')], '1-3', '4')).toEqual({ raidType: '1-1', partySize: '4' });
  });

  it('stays out of the way when the input is ambiguous or already fits', () => {
    expect(inferDistributionSettings([party.join('\n')], '1-3', '4')).toBeNull();
    expect(inferDistributionSettings([party.slice(0, 3).join('\n')], '1-3', '4')).toBeNull();
    expect(inferDistributionSettings([['ㄷㄷㄷㅍ', 'ㄷㅍ', 'ㄷㄷㄷㄷ', 'ㄷㄷㄷㄷ'].join('\n')], '1-3', '16')).toBeNull();
    expect(inferDistributionSettings([['ㄷㄷㄷX', 'ㄷㄷㄷㅍ', 'ㄷㄷㄷㄷ', 'ㄷㄷㄷㄷ'].join('\n')], '1-3', '8')).toBeNull();
    expect(inferDistributionSettings([''], '1-3', '16')).toBeNull();
  });
});
