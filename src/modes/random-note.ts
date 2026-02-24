/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode, DetectionType } from './training-mode';
import { Prompt } from '../types';
import { dom, state } from '../state';
import { NATURAL_NOTES, ALL_NOTES } from '../constants';
import { getEnabledStrings, getSelectedFretRange } from '../fretboard-ui-state';
import { notifyUserError } from '../user-feedback-port';

export class RandomNoteMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    const FRETBOARD = state.currentInstrument.FRETBOARD;
    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));

    if (enabledStrings.length === 0) {
      notifyUserError('Please select at least one string to practice on.');
      return null;
    }

    const targetString = enabledStrings[Math.floor(Math.random() * enabledStrings.length)];
    const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);

    const notesInFretRange = Object.entries(FRETBOARD[targetString as keyof typeof FRETBOARD])
      .filter(([_, fret]) => fret >= minFret && fret <= maxFret)
      .map(([note, _]) => note);

    const allAvailableNotes = dom.difficulty.value === 'natural' ? NATURAL_NOTES : ALL_NOTES;
    const availableNotes = notesInFretRange.filter((note) => allAvailableNotes.includes(note));

    if (availableNotes.length === 0) {
      notifyUserError(
        'No notes available for the selected strings, difficulty, and fret range. Please adjust your settings.'
      );
      return null;
    }

    let targetNote: string;
    do {
      targetNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
    } while (availableNotes.length > 1 && targetNote === state.previousNote);

    state.previousNote = targetNote; // Update global state to avoid repeats

    return {
      displayText: `Find: ${targetNote} on ${targetString} string`,
      targetNote: targetNote,
      targetString: targetString,
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };
  }
}
