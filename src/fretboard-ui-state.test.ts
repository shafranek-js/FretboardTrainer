import { describe, expect, it } from 'vitest';
import {
  getEnabledStrings,
  getSelectedFretRange,
  isChordTrainingModeActive,
} from './fretboard-ui-state';

describe('fretboard-ui-state', () => {
  it('detects active chord training modes only while listening', () => {
    expect(isChordTrainingModeActive('chords', true)).toBe(true);
    expect(isChordTrainingModeActive('progressions', true)).toBe(true);
    expect(isChordTrainingModeActive('arpeggios', true)).toBe(true);
    expect(isChordTrainingModeActive('random', true)).toBe(false);
    expect(isChordTrainingModeActive('chords', false)).toBe(false);
  });

  it('normalizes fret range order', () => {
    expect(getSelectedFretRange('12', '3')).toEqual({ minFret: 3, maxFret: 12 });
  });

  it('falls back to safe defaults on invalid fret inputs', () => {
    expect(getSelectedFretRange('abc', '')).toEqual({ minFret: 0, maxFret: 20 });
  });

  it('extracts enabled string values from checked inputs', () => {
    const selectorRoot = {
      querySelectorAll: () => [{ value: 'E' }, { value: 'A' }],
    } as unknown as ParentNode;

    expect([...getEnabledStrings(selectorRoot)]).toEqual(['E', 'A']);
  });
});
