/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ChordNote } from '../types';

/**
 * Defines the "contract" that every instrument class must follow.
 * This ensures that the main application logic can interact with any instrument
 * without needing to know its specific details.
 */
export interface IInstrument {
  name: 'guitar' | 'ukulele';
  STRING_ORDER: string[];
  TUNING: { [key: string]: string };
  FRETBOARD: { [key: string]: { [key: string]: number } };
  MARKER_POSITIONS: number[];
  CHORD_FINGERINGS: { [key: string]: (ChordNote | null)[] };
  CHORDS_BY_TYPE: { [key: string]: string[] };
  CHORD_PROGRESSIONS: { [key: string]: string[] };

  /** Calculates the scientific pitch name (e.g., 'E4', 'G#2') for a note on a given string and fret. */
  getNoteWithOctave(stringName: string, fret: number): string | null;
}
