import { describe, expect, it } from 'vitest';
import { getMelodyPromptPitchClasses, isPolyphonicMelodyPrompt } from './melody-prompt-polyphony';
import type { Prompt } from './types';

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    displayText: 'Test',
    targetNote: null,
    targetString: null,
    targetChordNotes: [],
    targetChordFingering: [],
    targetMelodyEventNotes: [],
    baseChordName: null,
    ...overrides,
  };
}

describe('melody-prompt-polyphony', () => {
  it('treats duplicate positions of the same note as monophonic', () => {
    const prompt = createPrompt({
      targetNote: 'C',
      targetMelodyEventNotes: [
        { note: 'C', string: 'A', fret: 3 },
        { note: 'C', string: 'G', fret: 5 },
      ],
    });

    expect(getMelodyPromptPitchClasses(prompt)).toEqual(['C']);
    expect(isPolyphonicMelodyPrompt(prompt)).toBe(false);
  });

  it('normalizes scientific notes and flats to pitch classes', () => {
    const prompt = createPrompt({
      targetChordNotes: ['Bb3', 'A#4', 'C4'],
      targetMelodyEventNotes: [
        { note: 'Bb3', string: 'A', fret: 1 },
        { note: 'A#4', string: 'G', fret: 3 },
        { note: 'C4', string: 'B', fret: 1 },
      ],
    });

    expect(getMelodyPromptPitchClasses(prompt)).toEqual(['A#', 'C']);
    expect(isPolyphonicMelodyPrompt(prompt)).toBe(true);
  });
  it('treats distinct pitch classes as polyphonic', () => {
    const prompt = createPrompt({
      targetChordNotes: ['C', 'E'],
      targetMelodyEventNotes: [
        { note: 'C', string: 'A', fret: 3 },
        { note: 'E', string: 'D', fret: 2 },
      ],
    });

    expect(getMelodyPromptPitchClasses(prompt)).toEqual(['C', 'E']);
    expect(isPolyphonicMelodyPrompt(prompt)).toBe(true);
  });
});

