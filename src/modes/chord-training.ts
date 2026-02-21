/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode, DetectionType } from './training-mode';
import { Prompt } from '../types';
import { generateChordPrompt } from './modes-util';

export class ChordTrainingMode implements ITrainingMode {
  detectionType: DetectionType = 'polyphonic';

  generatePrompt(): Prompt | null {
    return generateChordPrompt();
  }
}
