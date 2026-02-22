/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ITrainingMode, DetectionType } from './training-mode';
import type { Prompt } from '../types';

export class RhythmTrainingMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt {
    return {
      displayText: 'Rhythm: Play any note on the click',
      targetNote: null,
      targetString: null,
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };
  }
}

