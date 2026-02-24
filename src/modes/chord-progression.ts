/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode, DetectionType } from './training-mode';
import { Prompt, ChordNote } from '../types';
import { state } from '../state';
import { CHORDS } from '../constants';
import { notifyUserError } from '../user-feedback-port';

export class ChordProgressionMode implements ITrainingMode {
  detectionType: DetectionType = 'polyphonic';

  generatePrompt(): Prompt | null {
    // Loop the progression if we've reached the end
    if (
      state.currentProgression.length === 0 ||
      state.currentProgressionIndex >= state.currentProgression.length
    ) {
      state.currentProgressionIndex = 0;
    }
    const chordName = state.currentProgression[state.currentProgressionIndex];

    if (!chordName) {
      notifyUserError(`Invalid chord found in progression. Stopping session.`);
      return null;
    }

    const chordNotes = CHORDS[chordName as keyof typeof CHORDS];
    const chordFingering =
      state.currentInstrument.CHORD_FINGERINGS[chordName as keyof typeof CHORDS];

    if (!chordNotes || chordNotes.length === 0 || !chordFingering) {
      notifyUserError(
        `Could not find complete data for chord "${chordName}" in the progression. Stopping session.`
      );
      return null;
    }

    const promptText = `Progression (${state.currentProgressionIndex + 1}/${state.currentProgression.length}): Play ${chordName}`;
    state.currentProgressionIndex++;

    return {
      displayText: promptText,
      targetNote: null,
      targetString: null,
      targetChordNotes: chordNotes,
      targetChordFingering: (chordFingering || []).filter((cn) => cn !== null) as ChordNote[],
      baseChordName: chordName,
    };
  }
}
