/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode } from './training-mode';
import { RandomNoteMode } from './random-note';

/**
 * The Timed Challenge uses the same prompt generation logic as the Random Note mode,
 * but its session handling (timer, scoring) is different, which is managed in `logic.ts`.
 * This class simply re-uses the prompt generation from RandomNoteMode.
 */
export class TimedChallengeMode extends RandomNoteMode implements ITrainingMode {
  // Inherits detectionType and generatePrompt from RandomNoteMode
}
