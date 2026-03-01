import { describe, expect, it, vi } from 'vitest';
import {
  detectMonophonicOctaveMismatch,
  resolveDetectedScientificPosition,
  resolveWrongDetectedHighlight,
  stripScientificOctave,
} from './detected-note-feedback';

function createInstrument() {
  return {
    STRING_ORDER: ['A', 'D'],
    FRETBOARD: {
      A: { C: 3, D: 5 },
      D: { C: 10, D: 0 },
    },
    getNoteWithOctave: vi.fn((stringName: string, fret: number) => {
      const notes: Record<string, Record<number, string>> = {
        A: { 3: 'C3', 5: 'D3' },
        D: { 0: 'D3', 10: 'C4' },
      };
      return notes[stringName]?.[fret] ?? null;
    }),
  };
}

describe('detected-note-feedback', () => {
  it('strips octave suffixes from scientific note names', () => {
    expect(stripScientificOctave('C#4')).toBe('C#');
    expect(stripScientificOctave('A-1')).toBe('A');
  });

  it('resolves an exact scientific position on enabled strings', () => {
    const instrument = createInstrument();

    expect(resolveDetectedScientificPosition('C4', new Set(['A', 'D']), instrument)).toEqual({
      stringName: 'D',
      fret: 10,
    });
    expect(resolveDetectedScientificPosition('C4', new Set(['A']), instrument)).toBeNull();
  });

  it('prefers exact scientific placement for wrong-note highlight and falls back to pitch-class lookup', () => {
    const instrument = createInstrument();
    const freqToScientificNoteName = vi.fn((frequency: number) => (frequency > 300 ? 'C4' : 'C3'));

    expect(
      resolveWrongDetectedHighlight({
        detectedNote: 'C',
        detectedFrequency: 330,
        enabledStrings: new Set(['A', 'D']),
        instrument,
        freqToScientificNoteName,
      })
    ).toEqual({
      wrongDetectedNote: 'C',
      wrongDetectedString: 'D',
      wrongDetectedFret: 10,
    });

    expect(
      resolveWrongDetectedHighlight({
        detectedNote: 'C',
        enabledStrings: new Set(['A']),
        instrument,
        freqToScientificNoteName,
      })
    ).toEqual({
      wrongDetectedNote: 'C',
      wrongDetectedString: 'A',
      wrongDetectedFret: 3,
    });
  });

  it('detects octave mismatch only when pitch class matches but octave differs', () => {
    const freqToScientificNoteName = vi.fn((frequency: number) => (frequency > 300 ? 'C4' : 'C3'));

    expect(
      detectMonophonicOctaveMismatch({
        prompt: {
          displayText: 'Find C',
          targetNote: 'C',
          targetString: 'A',
          targetChordNotes: [],
          targetChordFingering: [],
          baseChordName: null,
        },
        targetFrequency: 200,
        detectedNote: 'C',
        detectedFrequency: 330,
        freqToScientificNoteName,
      })
    ).toEqual({
      detectedScientific: 'C4',
      targetScientific: 'C3',
    });

    expect(
      detectMonophonicOctaveMismatch({
        prompt: {
          displayText: 'Find C',
          targetNote: 'C',
          targetString: 'A',
          targetChordNotes: [],
          targetChordFingering: [],
          baseChordName: null,
        },
        targetFrequency: 330,
        detectedNote: 'C',
        detectedFrequency: 330,
        freqToScientificNoteName,
      })
    ).toBeNull();
  });
});
