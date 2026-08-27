import { describe, expect, it } from 'vitest';
import { normalizeWheelItems, parseStoredWheelItems, WHEEL_ITEM_LENGTH_LIMIT } from './wheel-spinner';

describe('wheel spinner saved choices', () => {
  it('restores a valid saved list', () => {
    expect(parseStoredWheelItems('["Lunch", "Movie", "Walk"]')).toEqual(['Lunch', 'Movie', 'Walk']);
  });

  it('rejects malformed storage without breaking the tool', () => {
    expect(parseStoredWheelItems('{oops')).toEqual([]);
  });

  it('trims, deduplicates, and bounds user choices', () => {
    expect(normalizeWheelItems(['  Lunch ', 'lunch', '', 42, 'x'.repeat(80)])).toEqual([
      'Lunch',
      'x'.repeat(WHEEL_ITEM_LENGTH_LIMIT),
    ]);
  });
});
