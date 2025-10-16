/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { dom, state } from '../state';
import { Prompt, ChordNote } from '../types';
import { CHORDS } from '../constants';


/** Shared logic for generating a prompt for a single chord. Used by Chord and Arpeggio modes. */
export function generateChordPrompt(): Prompt | null {
    let chordName: string;
    if (dom.randomizeChords.checked) {
        const allChords = Array.from(dom.chordSelector.options).map(opt => opt.value);
        if (allChords.length === 0) {
            alert('No chords available to practice. Please check instrument settings.');
            return null;
        }
        chordName = allChords[Math.floor(Math.random() * allChords.length)];
        dom.chordSelector.value = chordName;
    } else {
        chordName = dom.chordSelector.value;
    }

    if (!chordName) {
        alert('No chord selected. Please select one from the dropdown.');
        return null;
    }

    const chordNotes = CHORDS[chordName as keyof typeof CHORDS];
    const chordFingering = state.currentInstrument.CHORD_FINGERINGS[chordName as keyof typeof CHORDS];

    if (!chordNotes || chordNotes.length === 0 || !chordFingering) {
        alert(`Could not find complete data for chord "${chordName}". Stopping session.`);
        return null;
    }

    return {
        displayText: `Play a ${chordName} chord`,
        targetNote: null,
        targetString: null,
        targetChordNotes: chordNotes,
        targetChordFingering: (chordFingering || []).filter(cn => cn !== null) as ChordNote[],
        baseChordName: chordName
    };
}


/** Gets the musical interval name for a note's position in a chord (e.g., Root, Third, Fifth). */
export function getIntervalNameFromIndex(index: number, noteCount: number): string {
    if (index === 0) return 'Root';
    if (index === 1) return 'Third';
    if (index === 2) return 'Fifth';
    if (index === 3 && noteCount === 4) return 'Seventh';
    return `Note ${index + 1}`;
}
