import { ALL_NOTES, NOTE_TO_SEMITONE, SEMITONE_TO_NOTE } from './constants';

/** Converts a frequency in Hz to the closest note name using a provided A4 reference. */
export function freqToNoteNameFromA4(freq: number, a4Frequency: number): string | null {
  if (freq <= 0 || a4Frequency <= 0) return null;

  const n = Math.round(12 * Math.log2(freq / a4Frequency));
  const noteIndex = (((n + 9) % 12) + 12) % 12;
  return ALL_NOTES[noteIndex];
}

/** Returns major-third and perfect-fifth notes for a root note. */
export function calculateTriadIntervals(rootNote: string): {
  majorThird: string;
  perfectFifth: string;
} {
  const rootSemitone = NOTE_TO_SEMITONE[rootNote];
  if (typeof rootSemitone !== 'number') {
    return { majorThird: '?', perfectFifth: '?' };
  }

  const majorThirdSemitone = (rootSemitone + 4) % 12;
  const perfectFifthSemitone = (rootSemitone + 7) % 12;

  return {
    majorThird: SEMITONE_TO_NOTE[majorThirdSemitone],
    perfectFifth: SEMITONE_TO_NOTE[perfectFifthSemitone],
  };
}
