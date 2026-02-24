/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- GLOBAL CONSTANTS ---
export const VOLUME_THRESHOLD = 0.03;
export const REQUIRED_STABLE_FRAMES = 3;
export const PROMPT_AUDIO_INPUT_IGNORE_MS = 700;
export const DEFAULT_A4_FREQUENCY = 440;
export const CENTS_TOLERANCE = 10;
export const CENTS_VISUAL_RANGE = 50;
export const CALIBRATION_SAMPLES = 30;
export const TIMED_CHALLENGE_DURATION = 60;

export const NATURAL_NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const NOTE_TO_SEMITONE: { [key: string]: number } = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

export const SEMITONE_TO_NOTE = Object.fromEntries(
  Object.entries(NOTE_TO_SEMITONE).map(([k, v]) => [v, k])
);

export const SCALES: { [key: string]: string[] } = {
  'C Major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G Major': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'A Minor Pentatonic': ['A', 'C', 'D', 'E', 'G'],
};

// Universal chord note definitions. A C Major chord is C-E-G on any instrument.
export const CHORDS: { [key: string]: string[] } = {
  // Major
  'C Major': ['C', 'E', 'G'],
  'G Major': ['G', 'B', 'D'],
  'D Major': ['D', 'F#', 'A'],
  'A Major': ['A', 'C#', 'E'],
  'E Major': ['E', 'G#', 'B'],
  'F Major': ['F', 'A', 'C'],
  // Minor
  'A Minor': ['A', 'C', 'E'],
  'E Minor': ['E', 'G', 'B'],
  'D Minor': ['D', 'F', 'A'],
  'B Minor': ['B', 'D', 'F#'],
  // Dominant 7th
  C7: ['C', 'E', 'G', 'A#'],
  G7: ['G', 'B', 'D', 'F'],
  D7: ['D', 'F#', 'A', 'C'],
  A7: ['A', 'C#', 'E', 'G'],
  E7: ['E', 'G#', 'B', 'D'],
  B7: ['B', 'D#', 'F#', 'A'],
  // Other 7ths
  Cmaj7: ['C', 'E', 'G', 'B'],
  Am7: ['A', 'C', 'E', 'G'],
  Dm7: ['D', 'F', 'A', 'C'],
  Em7: ['E', 'G', 'B', 'D'],
};

export const INTERVALS = {
  'Minor Third': 3,
  'Major Third': 4,
  'Perfect Fourth': 5,
  'Perfect Fifth': 7,
  'Major Sixth': 9,
};
