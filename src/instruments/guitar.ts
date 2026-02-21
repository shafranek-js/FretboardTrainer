/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { IInstrument } from './instrument';
import type { ChordNote } from '../types';
import { ALL_NOTES } from '../constants';

// --- GUITAR-SPECIFIC DATA ---
const GUITAR_TUNING: { [key: string]: string } = {
  e: 'E4',
  B: 'B3',
  G: 'G3',
  D: 'D3',
  A: 'A2',
  E: 'E2',
};
const GUITAR_FRETBOARD: { [key: string]: { [key: string]: number } } = {
  E: { E: 0, F: 1, 'F#': 2, G: 3, 'G#': 4, A: 5, 'A#': 6, B: 7, C: 8, 'C#': 9, D: 10, 'D#': 11 },
  A: { A: 0, 'A#': 1, B: 2, C: 3, 'C#': 4, D: 5, 'D#': 6, E: 7, F: 8, 'F#': 9, G: 10, 'G#': 11 },
  D: { D: 0, 'D#': 1, E: 2, F: 3, 'F#': 4, G: 5, 'G#': 6, A: 7, 'A#': 8, B: 9, C: 10, 'C#': 11 },
  G: { G: 0, 'G#': 1, A: 2, 'A#': 3, B: 4, C: 5, 'C#': 6, D: 7, 'D#': 8, E: 9, F: 10, 'F#': 11 },
  B: { B: 0, C: 1, 'C#': 2, D: 3, 'D#': 4, E: 5, F: 6, 'F#': 7, G: 8, 'G#': 9, A: 10, 'A#': 11 },
  e: { E: 0, F: 1, 'F#': 2, G: 3, 'G#': 4, A: 5, 'A#': 6, B: 7, C: 8, 'C#': 9, D: 10, 'D#': 11 },
};
const GUITAR_CHORD_FINGERINGS: { [key: string]: (ChordNote | null)[] } = {
  'C Major': [
    null,
    { string: 'A', fret: 3, note: 'C' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  'G Major': [
    { string: 'E', fret: 3, note: 'G' },
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 3, note: 'G' },
  ],
  'D Major': [
    null,
    null,
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 3, note: 'D' },
    { string: 'e', fret: 2, note: 'F#' },
  ],
  'A Major': [
    null,
    { string: 'A', fret: 0, note: 'A' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 2, note: 'C#' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  'E Major': [
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 1, note: 'G#' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  'F Major': [
    { string: 'E', fret: 1, note: 'F' },
    { string: 'A', fret: 3, note: 'C' },
    { string: 'D', fret: 3, note: 'F' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 1, note: 'F' },
  ],
  'A Minor': [
    null,
    { string: 'A', fret: 0, note: 'A' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  'E Minor': [
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  'D Minor': [
    null,
    null,
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 3, note: 'D' },
    { string: 'e', fret: 1, note: 'F' },
  ],
  'B Minor': [
    null,
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 4, note: 'F#' },
    { string: 'G', fret: 4, note: 'B' },
    { string: 'B', fret: 3, note: 'D' },
    { string: 'e', fret: 2, note: 'F#' },
  ],
  C7: [
    null,
    { string: 'A', fret: 3, note: 'C' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 3, note: 'A#' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  G7: [
    { string: 'E', fret: 3, note: 'G' },
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 1, note: 'F' },
  ],
  D7: [
    null,
    null,
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 2, note: 'F#' },
  ],
  A7: [
    null,
    { string: 'A', fret: 0, note: 'A' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 2, note: 'C#' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  E7: [
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 1, note: 'G#' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  B7: [
    null,
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 1, note: 'D#' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 2, note: 'F#' },
  ],
  Cmaj7: [
    null,
    { string: 'A', fret: 3, note: 'C' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  Am7: [
    null,
    { string: 'A', fret: 0, note: 'A' },
    { string: 'D', fret: 2, note: 'E' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 0, note: 'E' },
  ],
  Dm7: [
    null,
    null,
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 2, note: 'A' },
    { string: 'B', fret: 1, note: 'C' },
    { string: 'e', fret: 1, note: 'F' },
  ],
  Em7: [
    { string: 'E', fret: 0, note: 'E' },
    { string: 'A', fret: 2, note: 'B' },
    { string: 'D', fret: 0, note: 'D' },
    { string: 'G', fret: 0, note: 'G' },
    { string: 'B', fret: 0, note: 'B' },
    { string: 'e', fret: 0, note: 'E' },
  ],
};
const GUITAR_CHORDS_BY_TYPE = {
  Major: ['C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'F Major'],
  Minor: ['A Minor', 'E Minor', 'D Minor', 'B Minor'],
  'Dominant 7th': ['C7', 'G7', 'D7', 'A7', 'E7', 'B7'],
  'Other 7ths': ['Cmaj7', 'Am7', 'Dm7', 'Em7'],
};
const GUITAR_CHORD_PROGRESSIONS: { [key: string]: string[] } = {
  'Axis of Awesome (I-V-vi-IV)': ['C Major', 'G Major', 'A Minor', 'F Major'],
  'Simple Folk (I-IV-V)': ['G Major', 'C Major', 'D Major'],
  '50s Progression (I-vi-IV-V)': ['C Major', 'A Minor', 'F Major', 'G Major'],
  'Pop Anthem (vi-IV-I-V)': ['A Minor', 'F Major', 'C Major', 'G Major'],
  'Classic Jazz (ii-V-I)': ['Dm7', 'G7', 'Cmaj7'],
  'Minor Blues (i-iv-v)': ['A Minor', 'D Minor', 'E7'],
  'Andalusian Cadence (vi-V-IV-III)': ['A Minor', 'G Major', 'F Major', 'E Major'],
};

export class Guitar implements IInstrument {
  readonly name = 'guitar' as const;
  STRING_ORDER = ['e', 'B', 'G', 'D', 'A', 'E'];
  TUNING = GUITAR_TUNING;
  FRETBOARD = GUITAR_FRETBOARD;
  MARKER_POSITIONS = [3, 5, 7, 9, 12];
  CHORD_FINGERINGS = GUITAR_CHORD_FINGERINGS;
  CHORDS_BY_TYPE = GUITAR_CHORDS_BY_TYPE;
  CHORD_PROGRESSIONS = GUITAR_CHORD_PROGRESSIONS;

  getNoteWithOctave(stringName: string, fret: number): string | null {
    if (!this.TUNING[stringName]) return null;

    const baseNote = this.TUNING[stringName]; // e.g., 'E4'
    const noteName = baseNote.slice(0, -1).replace('s', '#'); // 'E' or 'A#'
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
