import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import type { MelodyDefinition } from './melody-library';
import {
  coerceMelodyStringShiftToFeasible,
  formatMelodyStringShift,
  getMelodyWithPracticeAdjustments,
  getMelodyWithStringShift,
  isMelodyStringShiftFeasible,
  normalizeMelodyStringShift,
} from './melody-string-shift';

describe('melody-string-shift', () => {
  it('normalizes and formats string shift values', () => {
    expect(normalizeMelodyStringShift(2.7, instruments.guitar)).toBe(3);
    expect(normalizeMelodyStringShift(-99, instruments.guitar)).toBe(-5);
    expect(normalizeMelodyStringShift('2', instruments.guitar)).toBe(2);
    expect(formatMelodyStringShift(0)).toBe('0 str');
    expect(formatMelodyStringShift(1)).toBe('+1 str');
    expect(formatMelodyStringShift(-2)).toBe('-2 str');
  });

  it('moves melody notes to shifted strings while preserving pitch', () => {
    const melody: MelodyDefinition = {
      id: 'test:string-shift',
      name: 'String Shift',
      source: 'custom',
      instrumentName: 'guitar',
      events: [
        { notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
        { notes: [{ note: 'E', stringName: 'D', fret: 2 }] },
      ],
    };

    const shifted = getMelodyWithStringShift(melody, 1, instruments.guitar);
    expect(shifted.events[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'E',
      fret: 8,
    });
    expect(shifted.events[1]?.notes[0]).toEqual({
      note: 'E',
      stringName: 'A',
      fret: 7,
    });
  });

  it('detects infeasible shifts and coerces them back toward zero', () => {
    const melody: MelodyDefinition = {
      id: 'test:open-low-e',
      name: 'Open Low E',
      source: 'custom',
      instrumentName: 'guitar',
      events: [{ notes: [{ note: 'E', stringName: 'E', fret: 0 }] }],
    };

    expect(isMelodyStringShiftFeasible(melody, 1, instruments.guitar)).toBe(false);
    expect(coerceMelodyStringShiftToFeasible(melody, 1, instruments.guitar)).toBe(0);
  });

  it('applies transpose before string shift in the practice adjustment pipeline', () => {
    const melody: MelodyDefinition = {
      id: 'test:practice-adjustments',
      name: 'Practice Adjustments',
      source: 'custom',
      instrumentName: 'guitar',
      events: [{ notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
    };

    const adjusted = getMelodyWithPracticeAdjustments(melody, 2, 1, instruments.guitar);
    expect(adjusted.events[0]?.notes[0]).toEqual({
      note: 'D',
      stringName: 'A',
      fret: 5,
    });
  });
});
