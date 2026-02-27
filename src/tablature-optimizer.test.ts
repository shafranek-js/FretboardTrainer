import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import {
  buildPositionCandidatesByMidi,
  chooseEventPositions,
  createFallbackEmptyAssignment,
  selectOptimalAssignmentPath,
  toPitchClassFromMidi,
} from './tablature-optimizer';

describe('tablature-optimizer', () => {
  it('keeps duplicated pitch classes on different strings when generating event positions', () => {
    const candidateMap = buildPositionCandidatesByMidi(instruments.guitar);
    const occurrences = [52, 64, 67, 71].map((midi, occurrenceIndex) => ({
      midi,
      pitchClass: toPitchClassFromMidi(midi),
      occurrenceIndex,
    }));

    const assignments = chooseEventPositions(occurrences, candidateMap);
    expect(assignments.length).toBeGreaterThan(0);

    const best = assignments[0];
    expect(best?.unresolvedCount).toBe(0);
    expect(best?.notes.length).toBe(4);
    const eNotes = best?.notes.filter((note) => note.note === 'E') ?? [];
    expect(eNotes.length).toBe(2);
    expect(new Set(eNotes.map((note) => note.stringName)).size).toBe(2);
  });

  it('uses DP path selection to avoid unnecessary position jumps', () => {
    const lowRegion = {
      notes: [{ note: 'E', stringName: 'e', fret: 0 }],
      positions: [{ stringName: 'e', fret: 0, stringIndex: 0 }],
      occurrenceAssignments: [
        { occurrenceIndex: 0, pitchClass: 'E', assigned: { stringName: 'e', fret: 0, stringIndex: 0 } },
      ],
      unresolvedCount: 0,
      internalCost: 0.5,
      handPosition: 1,
    };
    const highRegion = {
      notes: [{ note: 'E', stringName: 'G', fret: 9 }],
      positions: [{ stringName: 'G', fret: 9, stringIndex: 2 }],
      occurrenceAssignments: [
        { occurrenceIndex: 0, pitchClass: 'E', assigned: { stringName: 'G', fret: 9, stringIndex: 2 } },
      ],
      unresolvedCount: 0,
      internalCost: 1.1,
      handPosition: 9,
    };
    const highNext = {
      notes: [{ note: 'G', stringName: 'B', fret: 8 }],
      positions: [{ stringName: 'B', fret: 8, stringIndex: 1 }],
      occurrenceAssignments: [
        { occurrenceIndex: 0, pitchClass: 'G', assigned: { stringName: 'B', fret: 8, stringIndex: 1 } },
      ],
      unresolvedCount: 0,
      internalCost: 1.3,
      handPosition: 8,
    };

    const selection = selectOptimalAssignmentPath([
      {
        payload: { step: 1 },
        assignments: [lowRegion, highRegion],
      },
      {
        payload: { step: 2 },
        assignments: [highNext, createFallbackEmptyAssignment(1)],
      },
    ]);

    expect(selection.selectedAssignmentIndexes).toEqual([1, 0]);
  });
});
