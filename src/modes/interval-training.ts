/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode, DetectionType } from './training-mode';
import { Prompt } from '../types';
import { dom, state } from '../state';
import {
  NATURAL_NOTES,
  ALL_NOTES,
  INTERVALS,
  NOTE_TO_SEMITONE,
  SEMITONE_TO_NOTE,
} from '../constants';
import { getEnabledStrings, getSelectedFretRange } from '../fretboard-ui-state';
import { notifyUserError } from '../user-feedback-port';

export class IntervalTrainingMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    const FRETBOARD = state.currentInstrument.FRETBOARD;
    const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
    const notePool = dom.difficulty.value === 'natural' ? NATURAL_NOTES : ALL_NOTES;
    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));

    const allPossibleRootNotes = enabledStrings.flatMap((string) =>
      Object.entries(FRETBOARD[string as keyof typeof FRETBOARD])
        .filter(([note, fret]) => fret >= minFret && fret <= maxFret && notePool.includes(note))
        .map(([note, _]) => ({ note, string }))
    );

    if (allPossibleRootNotes.length === 0) {
      notifyUserError(
        'No notes available for the selected strings, difficulty, and fret range. Please adjust your settings.'
      );
      return null;
    }

    // Try a few times to find a valid interval before giving up
    for (let i = 0; i < 20; i++) {
      const rootNoteInfo =
        allPossibleRootNotes[Math.floor(Math.random() * allPossibleRootNotes.length)];
      const intervalKeys = Object.keys(INTERVALS);
      const intervalName = intervalKeys[
        Math.floor(Math.random() * intervalKeys.length)
      ] as keyof typeof INTERVALS;
      const intervalSemitones = INTERVALS[intervalName];
      const rootSemitone = NOTE_TO_SEMITONE[rootNoteInfo.note];
      const targetSemitone = (rootSemitone + intervalSemitones) % 12;
      const targetNote = SEMITONE_TO_NOTE[targetSemitone];

      // Check if the target note is playable within the user's settings
      const isTargetPlayable = enabledStrings.some((string) => {
        const fret =
          FRETBOARD[string as keyof typeof FRETBOARD][targetNote as keyof typeof FRETBOARD.e];
        return typeof fret === 'number' && fret >= minFret && fret <= maxFret;
      });

      if (isTargetPlayable) {
        return {
          displayText: `Find: ${intervalName} of ${rootNoteInfo.note}`,
          targetNote: targetNote,
          targetString: null, // String is not specified for the user
          targetChordNotes: [],
          targetChordFingering: [],
          baseChordName: null,
        };
      }
    }

    console.warn('Could not find a valid interval in 20 attempts for current settings.');
    notifyUserError(
      'Could not find a playable interval with current settings. Please adjust strings, fret range, or difficulty.'
    );
    return null;
  }
}
