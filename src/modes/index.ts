/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode } from './training-mode';
import { RandomNoteMode } from './random-note';
import { ScalePracticeMode } from './scale-practice';
import { IntervalTrainingMode } from './interval-training';
import { ChordTrainingMode } from './chord-training';
import { ArpeggioTrainingMode } from './arpeggio-training';
import { ChordProgressionMode } from './chord-progression';
import { TimedChallengeMode } from './timed-challenge';

/**
 * A centralized map of all available training mode instances.
 * This allows the main session logic to easily switch between modes
 * by referencing them by name (e.g., modes['random']).
 */
export const modes: { [key: string]: ITrainingMode } = {
  random: new RandomNoteMode(),
  scales: new ScalePracticeMode(),
  intervals: new IntervalTrainingMode(),
  chords: new ChordTrainingMode(),
  arpeggios: new ArpeggioTrainingMode(),
  progressions: new ChordProgressionMode(),
  timed: new TimedChallengeMode(),
};
