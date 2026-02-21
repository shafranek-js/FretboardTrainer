/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Prompt } from '../types';

export type DetectionType = 'monophonic' | 'polyphonic';

/**
 * Defines the "contract" that all training mode classes must follow.
 */
export interface ITrainingMode {
  /** Specifies the type of audio detection required for this mode. */
  detectionType: DetectionType;

  /** Generates the next challenge for the user. Returns null if a prompt cannot be generated. */
  generatePrompt(): Prompt | null;
}
