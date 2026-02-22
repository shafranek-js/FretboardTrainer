/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ITrainingMode, DetectionType } from './training-mode';
import type { Prompt, NoteStat } from '../types';
import { dom, state } from '../state';
import { NATURAL_NOTES, ALL_NOTES } from '../constants';
import { getEnabledStrings, getSelectedFretRange } from '../fretboard-ui-state';

interface AdaptiveCandidate {
  note: string;
  string: string;
  weight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeCandidateWeight(stat: NoteStat | undefined) {
  if (!stat || stat.attempts <= 0) {
    // New material should appear often enough to map the whole neck.
    return 4.5;
  }

  const accuracy = stat.correct / Math.max(1, stat.attempts);
  const avgCorrectTime = stat.correct > 0 ? stat.totalTime / stat.correct : 0;

  let weight = 1;
  weight += (1 - accuracy) * 4; // prioritize low-accuracy targets
  weight += clamp(avgCorrectTime / 1.8, 0, 2.25); // slower notes get extra reps

  if (stat.correct === 0) {
    weight += 1.5; // attempted but never hit correctly
  }

  return clamp(weight, 0.25, 8);
}

function pickWeightedCandidate(candidates: AdaptiveCandidate[]) {
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (totalWeight <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  let threshold = Math.random() * totalWeight;
  for (const candidate of candidates) {
    threshold -= candidate.weight;
    if (threshold <= 0) return candidate;
  }
  return candidates[candidates.length - 1] ?? null;
}

export class AdaptivePracticeMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    const fretboard = state.currentInstrument.FRETBOARD;
    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));

    if (enabledStrings.length === 0) {
      alert('Please select at least one string to practice on.');
      return null;
    }

    const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
    const allowedNotes = new Set(dom.difficulty.value === 'natural' ? NATURAL_NOTES : ALL_NOTES);

    const candidates: AdaptiveCandidate[] = [];
    for (const stringName of enabledStrings) {
      const notesOnString = fretboard[stringName as keyof typeof fretboard];
      if (!notesOnString) continue;

      for (const [note, fret] of Object.entries(notesOnString)) {
        if (!allowedNotes.has(note)) continue;
        if (fret < minFret || fret > maxFret) continue;

        const noteKey = `${note}-${stringName}`;
        const stat = state.stats.noteStats[noteKey];
        let weight = computeCandidateWeight(stat);

        // Avoid immediate repeats unless the pool is very small.
        if (candidates.length > 0 && note === state.previousNote) {
          weight *= 0.25;
        }

        candidates.push({ note, string: stringName, weight });
      }
    }

    if (candidates.length === 0) {
      alert(
        'No notes available for the selected strings, difficulty, and fret range. Please adjust your settings.'
      );
      return null;
    }

    const selected = pickWeightedCandidate(candidates);
    if (!selected) return null;

    state.previousNote = selected.note;

    return {
      displayText: `Adaptive: Find ${selected.note} on ${selected.string} string`,
      targetNote: selected.note,
      targetString: selected.string,
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };
  }
}
