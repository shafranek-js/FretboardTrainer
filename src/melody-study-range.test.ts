import { describe, expect, it } from 'vitest';
import {
  areMelodyStudyRangesEqual,
  buildDefaultMelodyStudyRange,
  formatMelodyStudyStepLabel,
  normalizeMelodyStudyRange,
} from './melody-study-range';

describe('melody-study-range', () => {
  it('normalizes reversed bounds into ascending event indexes', () => {
    expect(normalizeMelodyStudyRange({ startIndex: 7, endIndex: 3 }, 12)).toEqual({
      startIndex: 3,
      endIndex: 7,
    });
  });

  it('treats omitted bounds as the full melody', () => {
    expect(normalizeMelodyStudyRange(undefined, 5)).toEqual(buildDefaultMelodyStudyRange(5));
  });

  it('formats step labels with explicit range context when not using the full melody', () => {
    expect(
      formatMelodyStudyStepLabel(1, 4, { startIndex: 4, endIndex: 7 }, 12)
    ).toBe('[2/4] Steps 5-8');
  });

  it('compares ranges after normalization', () => {
    expect(
      areMelodyStudyRangesEqual({ startIndex: 7, endIndex: 3 }, { startIndex: 3, endIndex: 7 }, 12)
    ).toBe(true);
  });
});
