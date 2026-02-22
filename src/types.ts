/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteStat {
  attempts: number;
  correct: number;
  totalTime: number;
}

export interface Stats {
  highScore: number;
  totalAttempts: number;
  correctAttempts: number;
  totalTime: number;
  noteStats: { [key: string]: NoteStat };
}

export interface SessionStats {
  modeKey: string;
  modeLabel: string;
  startedAtMs: number;
  endedAtMs: number | null;
  instrumentName: string;
  tuningPresetKey: string;
  inputSource?: 'microphone' | 'midi';
  inputDeviceLabel?: string;
  stringOrder: string[];
  enabledStrings: string[];
  minFret: number;
  maxFret: number;
  totalAttempts: number;
  correctAttempts: number;
  totalTime: number;
  currentCorrectStreak: number;
  bestCorrectStreak: number;
  noteStats: { [key: string]: NoteStat };
  targetZoneStats: { [key: string]: NoteStat };
  rhythmStats: RhythmSessionStats;
}

export interface RhythmSessionStats {
  totalJudged: number;
  onBeat: number;
  early: number;
  late: number;
  totalAbsOffsetMs: number;
  bestAbsOffsetMs: number | null;
}

export type ChordNote = { note: string; string: string; fret: number };

/** Represents all the necessary data for a single user challenge. */
export interface Prompt {
  // Text to show the user (e.g., "Find: G on D string")
  displayText: string;
  // The single note to listen for in monophonic modes
  targetNote: string | null;
  // The specific string for the note, if applicable
  targetString: string | null;
  // The notes that make up the target chord for polyphonic modes
  targetChordNotes: string[];
  // The specific fingering for a chord, used for drawing on the fretboard
  targetChordFingering: ChordNote[];
  // For modes that build on a chord structure (like arpeggios or progressions)
  baseChordName: string | null;
}
