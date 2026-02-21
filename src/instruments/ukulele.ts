/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { IInstrument } from './instrument';
import type { ChordNote } from '../types';
import { ALL_NOTES } from '../constants';

// --- UKULELE-SPECIFIC DATA (Standard GCEA tuning) ---
const UKULELE_TUNING: { [key: string]: string } = { A: 'A4', E: 'E4', C: 'C4', G: 'G4' };
const UKULELE_FRETBOARD: { [key: string]: { [key: string]: number } } = {
  G: { G: 0, 'G#': 1, A: 2, 'A#': 3, B: 4, C: 5, 'C#': 6, D: 7, 'D#': 8, E: 9, F: 10, 'F#': 11 },
  C: { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 },
  E: { E: 0, F: 1, 'F#': 2, G: 3, 'G#': 4, A: 5, 'A#': 6, B: 7, C: 8, 'C#': 9, D: 10, 'D#': 11 },
  A: { A: 0, 'A#': 1, B: 2, C: 3, 'C#': 4, D: 5, 'D#': 6, E: 7, F: 8, 'F#': 9, G: 10, 'G#': 11 },
};
const UKULELE_CHORD_FINGERINGS: { [key: string]: (ChordNote | null)[] } = {
  'C Major': [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 0, note: 'C' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 3, note: 'C' },
  ],
  'G Major': [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 2, note: 'D' },
    { string: 'E', fret: 3, note: 'G' },
    { string: 'A', fret: 2, note: 'B' },
  ],
  'D Major': [
    { string: 'G', fret: 2, note: 'A' },
    { string: 'C', fret: 2, note: 'D' },
    { string: 'E', fret: 2, note: 'F#' },
    { string: 'A', fret: 0, note: 'A' },
  ],
  'A Major': [
    { string: 'G', fret: 2, note: 'A' },
    { string: 'C', fret: 1, note: 'C#' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 0, note: 'A' },
  ],
  'E Major': [
    { string: 'G', fret: 4, note: 'B' },
    { string: 'C', fret: 4, note: 'E' },
    { string: 'E', fret: 4, note: 'G#' },
    { string: 'A', fret: 2, note: 'B' },
  ],
  'F Major': [
    { string: 'G', fret: 2, note: 'A' },
    { string: 'C', fret: 0, note: 'C' },
    { string: 'E', fret: 1, note: 'F' },
    { string: 'A', fret: 0, note: 'A' },
  ],
  'A Minor': [
    { string: 'G', fret: 2, note: 'A' },
    { string: 'C', fret: 0, note: 'C' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 0, note: 'A' },
  ],
  'E Minor': [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 4, note: 'E' },
    { string: 'E', fret: 3, note: 'G' },
    { string: 'A', fret: 2, note: 'B' },
  ],
  'D Minor': [
    { string: 'G', fret: 2, note: 'A' },
    { string: 'C', fret: 2, note: 'D' },
    { string: 'E', fret: 1, note: 'F' },
    { string: 'A', fret: 0, note: 'A' },
  ],
  G7: [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 2, note: 'D' },
    { string: 'E', fret: 1, note: 'F' },
    { string: 'A', fret: 2, note: 'B' },
  ],
  C7: [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 0, note: 'C' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 1, note: 'A#' },
  ],
  E7: [
    { string: 'G', fret: 1, note: 'G#' },
    { string: 'C', fret: 2, note: 'D' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 2, note: 'B' },
  ],
  Am7: [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 0, note: 'C' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 0, note: 'A' },
  ],
  Cmaj7: [
    { string: 'G', fret: 0, note: 'G' },
    { string: 'C', fret: 0, note: 'C' },
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 2, note: 'B' },
  ],
  Dm7: [
    { string: 'G', fret: 2, note: 'A' },
    { string: 'C', fret: 2, note: 'D' },
    { string: 'E', fret: 1, note: 'F' },
    { string: 'A', fret: 3, note: 'C' },
  ],
};
const UKULELE_CHORDS_BY_TYPE = {
  Major: ['C Major', 'G Major', 'D Major', 'A Major', 'F Major', 'E Major'],
  Minor: ['A Minor', 'E Minor', 'D Minor'],
  '7ths': ['G7', 'C7', 'E7', 'Am7', 'Cmaj7', 'Dm7'],
};
const UKULELE_CHORD_PROGRESSIONS: { [key: string]: string[] } = {
  'Island Strum (I-V-vi-IV)': ['C Major', 'G Major', 'A Minor', 'F Major'],
  'Simple Minor (i-iv-V7)': ['A Minor', 'D Minor', 'E7'],
  'Jazzy (ii-V-I)': ['Dm7', 'G7', 'Cmaj7'],
  'Classic Pop (I-vi-IV-V)': ['C Major', 'A Minor', 'F Major', 'G Major'],
};

export class Ukulele implements IInstrument {
  readonly name = 'ukulele' as const;
  STRING_ORDER = ['A', 'E', 'C', 'G'];
  TUNING = UKULELE_TUNING;
  FRETBOARD = UKULELE_FRETBOARD;
  MARKER_POSITIONS = [3, 5, 7, 10, 12];
  CHORD_FINGERINGS = UKULELE_CHORD_FINGERINGS;
  CHORDS_BY_TYPE = UKULELE_CHORDS_BY_TYPE;
  CHORD_PROGRESSIONS = UKULELE_CHORD_PROGRESSIONS;

  getNoteWithOctave(stringName: string, fret: number): string | null {
    if (!this.TUNING[stringName]) return null;

    const baseNote = this.TUNING[stringName]; // e.g., 'A4'
    const noteName = baseNote.slice(0, -1).replace('s', '#');
    const octave = parseInt(baseNote.slice(-1));

    const baseNoteIndex = ALL_NOTES.indexOf(noteName);
    if (baseNoteIndex === -1) return null;

    const targetNoteIndex = (baseNoteIndex + fret) % 12;
    const octaveOffset = Math.floor((baseNoteIndex + fret) / 12);

    const targetOctave = octave + octaveOffset;
    const targetNoteName = ALL_NOTES[targetNoteIndex];

    return `${targetNoteName}${targetOctave}`;
  }
}
