/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode, DetectionType } from './training-mode';
import { Prompt } from '../types';
import { dom, state } from '../state';
import { SCALES } from '../constants';
import { setPromptText } from '../ui-signals';
import { getEnabledStrings, getSelectedFretRange } from '../fretboard-ui-state';

export class ScalePracticeMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  constructor() {
    this.generateScaleSequence(); // Pre-generate the sequence on instantiation
  }

  /** Generates and orders all notes of the selected scale within the user's constraints. */
  generateScaleSequence() {
    const FRETBOARD = state.currentInstrument.FRETBOARD;
    const STRING_ORDER = state.currentInstrument.STRING_ORDER;

    const scaleName = dom.scaleSelector.value as keyof typeof SCALES;
    const notesInScale = SCALES[scaleName];
    if (!notesInScale) {
      state.scaleNotes = [];
      return;
    }

    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));

    const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);

    const allFoundNotes: { note: string; string: string; fret: number }[] = [];

    enabledStrings.forEach((string) => {
      const stringNotes = FRETBOARD[string as keyof typeof FRETBOARD];
      Object.entries(stringNotes).forEach(([note, fret]) => {
        if (notesInScale.includes(note) && fret >= minFret && fret <= maxFret) {
          allFoundNotes.push({ note, string, fret });
        }
      });

      if (maxFret === 12) {
        const openStringNote = Object.keys(FRETBOARD[string as keyof typeof FRETBOARD])[0];
        if (
          notesInScale.includes(openStringNote) &&
          !allFoundNotes.some((n) => n.string === string && n.fret === 12)
        ) {
          allFoundNotes.push({ note: openStringNote, string, fret: 12 });
        }
      }
    });

    allFoundNotes.sort((a, b) => {
      const stringAIndex = STRING_ORDER.indexOf(a.string);
      const stringBIndex = STRING_ORDER.indexOf(b.string);
      if (stringAIndex !== stringBIndex) {
        return stringBIndex - stringAIndex; // Sorts from thickest to thinnest string
      }
      return a.fret - b.fret;
    });

    state.scaleNotes = allFoundNotes.map(({ note, string }) => ({ note, string }));
    state.currentScaleIndex = 0;
  }

  generatePrompt(): Prompt | null {
    // This must be called at the start of a session, not just on construction
    if (state.currentScaleIndex === 0) {
      this.generateScaleSequence();
    }

    if (state.scaleNotes.length === 0) {
      if (state.isListening)
        alert(
          'No notes in the selected scale are available within the specified fret range and on the selected strings. Please adjust your settings.'
        );
      return null;
    }

    if (state.currentScaleIndex >= state.scaleNotes.length) {
      setPromptText('Scale complete!');
      setTimeout(() => {
        // Since we can't call stopListening directly from here, we return null,
        // and the main logic loop will handle the session stop.
      }, 2000);
      return null; // Indicate completion
    }

    const current = state.scaleNotes[state.currentScaleIndex];
    state.currentScaleIndex++;

    return {
      displayText: `Find: ${current.note} on ${current.string} string (${dom.scaleSelector.value})`,
      targetNote: current.note,
      targetString: current.string,
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };
  }
}
