import { describe, expect, it } from 'vitest';
import { computeStringLabelPositions } from './fretboard-string-labels';

describe('computeStringLabelPositions', () => {
  it('returns empty list for invalid string count', () => {
    expect(computeStringLabelPositions(0, 0, 20, 100, 10)).toEqual([]);
  });

  it('computes aligned positions from layout values', () => {
    const positions = computeStringLabelPositions(3, 10, 15, 100, 20);
    expect(positions).toEqual([
      { index: 0, x: 99, y: 10 },
      { index: 1, x: 99, y: 25 },
      { index: 2, x: 99, y: 40 },
    ]);
  });
});
