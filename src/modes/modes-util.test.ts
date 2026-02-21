import { describe, expect, it } from 'vitest';
import { getIntervalNameFromIndex } from './interval-name';

describe('getIntervalNameFromIndex', () => {
  it('returns triad interval labels', () => {
    expect(getIntervalNameFromIndex(0, 3)).toBe('Root');
    expect(getIntervalNameFromIndex(1, 3)).toBe('Third');
    expect(getIntervalNameFromIndex(2, 3)).toBe('Fifth');
  });

  it('returns seventh for four-note chords', () => {
    expect(getIntervalNameFromIndex(3, 4)).toBe('Seventh');
  });

  it('returns generic labels for out-of-pattern indexes', () => {
    expect(getIntervalNameFromIndex(5, 6)).toBe('Note 6');
  });
});
