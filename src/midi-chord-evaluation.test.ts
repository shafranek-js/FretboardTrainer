import { describe, expect, it } from 'vitest';
import {
  areMidiHeldNotesMatchingTargetChord,
  formatDetectedMidiChordNotes,
} from './midi-chord-evaluation';

describe('midi-chord-evaluation', () => {
  it('formats detected MIDI chord notes as unique sorted text', () => {
    expect(formatDetectedMidiChordNotes([])).toBe('...');
    expect(formatDetectedMidiChordNotes(['G', 'C', 'E'])).toBe('C,E,G');
    expect(formatDetectedMidiChordNotes(['C', 'E', 'C', 'G'])).toBe('C,E,G');
  });

  it('matches target chord by unique pitch classes regardless of order', () => {
    expect(areMidiHeldNotesMatchingTargetChord(['G', 'C', 'E'], ['C', 'E', 'G'])).toBe(true);
    expect(areMidiHeldNotesMatchingTargetChord(['C', 'E', 'G', 'C'], ['C', 'E', 'G'])).toBe(true);
    expect(areMidiHeldNotesMatchingTargetChord(['C', 'E'], ['C', 'E', 'G'])).toBe(false);
    expect(areMidiHeldNotesMatchingTargetChord(['C', 'E', 'G', 'A'], ['C', 'E', 'G'])).toBe(false);
    expect(areMidiHeldNotesMatchingTargetChord(['C', 'D#', 'G'], ['C', 'E', 'G'])).toBe(false);
  });

  it('returns false for empty target chord', () => {
    expect(areMidiHeldNotesMatchingTargetChord(['C'], [])).toBe(false);
  });
});
