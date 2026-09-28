import { describe, expect, it } from 'vitest';
import { formatDistributionShare } from './distribution-share';

const result = [
  ['ㄷ(M)', 'ㄷ', 'ㄷ', 'ㅍ'],
  ['ㅍ', 'ㄷ(M)', 'ㄷ', 'ㄷ'],
];

describe('Lost Ark distribution share text', () => {
  it('keeps the existing player lines and adds a header and the tool link', () => {
    expect(formatDistributionShare({ result, header: '본1부3 분배 · 게임 4판', url: 'https://game.oiyo.net/ko/lostark-raid-distribution/' })).toBe(
      ['[본1부3 분배 · 게임 4판]', '1-1 ㄷㄷㄷㅍ', '1-2 ㅍㄷㄷㄷ', '', 'https://game.oiyo.net/ko/lostark-raid-distribution/'].join('\n'),
    );
  });

  it('includes the room line only after a room was generated', () => {
    const text = formatDistributionShare({ result, header: 'H', url: 'U', room: { roomCode: 'AB12CD', password: '4821' }, roomLine: '방제 {room} · 비번 {pw}' });
    expect(text.split('\n')).toEqual(['[H]', '1-1 ㄷㄷㄷㅍ', '1-2 ㅍㄷㄷㄷ', '방제 AB12CD · 비번 4821', '', 'U']);
  });
});
