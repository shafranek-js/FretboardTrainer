/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ITrainingMode, DetectionType } from './training-mode';
import { Prompt } from '../types';
import { dom, state } from '../state';
import { CHORDS } from '../constants';
import { generateChordPrompt, getIntervalNameFromIndex } from './modes-util';

export class ArpeggioTrainingMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    // If it's the start of a new arpeggio, generate a new chord and apply the selected pattern.
    if (state.currentArpeggioIndex === 0) {
      const chordPrompt = generateChordPrompt();
      if (!chordPrompt) return null; // Error generating chord

      // The arpeggio will be the notes of this new chord, patterned.
      state.currentPrompt = chordPrompt;

      const pattern = dom.arpeggioPatternSelector.value;
      const rootPositionNotes = [...chordPrompt.targetChordNotes];
      let patternedNotes: string[] = [];

      switch (pattern) {
        case 'descending':
          patternedNotes = rootPositionNotes.reverse();
          break;
        case 'asc-desc':
          // e.g., [C, E, G] -> [C, E, G, E, C]
          patternedNotes = [...rootPositionNotes, ...rootPositionNotes.slice(0, -1).reverse()];
          break;
        case 'first-inversion':
          // e.g., [C, E, G] -> [E, G, C]
          patternedNotes = [...rootPositionNotes.slice(1), rootPositionNotes[0]];
          break;
        case 'second-inversion':
          // e.g., [C, E, G] -> [G, C, E].
          if (rootPositionNotes.length >= 3) {
            patternedNotes = [...rootPositionNotes.slice(2), ...rootPositionNotes.slice(0, 2)];
          } else {
            // Fallback for smaller 'chords'
            patternedNotes = rootPositionNotes.reverse(); // Descending is a reasonable fallback
          }
          break;
        case 'ascending':
        default:
          patternedNotes = rootPositionNotes;
          break;
      }
      // Update the prompt's target notes to the new patterned sequence
      state.currentPrompt.targetChordNotes = patternedNotes;
    }

    const baseChordName = state.currentPrompt?.baseChordName;
    const arpeggioNotes = state.currentPrompt?.targetChordNotes;

    if (!baseChordName || !arpeggioNotes || !arpeggioNotes.length) {
      console.error('Arpeggio mode cannot proceed without a valid chord.');
      return null;
    }

    // The main logic loop in logic.ts handles advancing and checking the index against length.
    // We just need to provide the prompt for the current index.
    const targetNote = arpeggioNotes[state.currentArpeggioIndex];

    // Find the note's interval name based on its position in the original root-position chord.
    const rootPositionNotes = CHORDS[baseChordName as keyof typeof CHORDS] || [];
    const noteIndexInRootPosition = rootPositionNotes.indexOf(targetNote);
    const intervalName = getIntervalNameFromIndex(
      noteIndexInRootPosition,
      rootPositionNotes.length
    );

    return {
      displayText: `Play: ${targetNote} (${intervalName} of ${baseChordName})`,
      targetNote: targetNote,
      targetString: null, // Arpeggios can be played anywhere on the fretboard
      targetChordNotes: arpeggioNotes,
      targetChordFingering: state.currentPrompt?.targetChordFingering || [],
      baseChordName: baseChordName,
    };
  }
}
