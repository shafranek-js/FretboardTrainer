import type { IInstrument } from './instruments/instrument';
import type { MelodyEventNote } from './melody-library';

export const DEFAULT_TABLATURE_MAX_FRET = 24;
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface PositionCandidate {
  stringName: string;
  fret: number;
  stringIndex: number;
}

export interface EventMidiOccurrence {
  midi: number;
  pitchClass: string;
  occurrenceIndex: number;
}

interface AssignedEventMidiOccurrence extends EventMidiOccurrence {
  assigned: PositionCandidate;
}

interface FingeringProfile {
  handPosition: number | null;
  handShiftCount: number;
  clampedFingerCount: number;
  openStringCount: number;
}

export interface EventPositionAssignment {
  notes: MelodyEventNote[];
  positions: PositionCandidate[];
  occurrenceAssignments: { occurrenceIndex: number; pitchClass: string; assigned: PositionCandidate }[];
  unresolvedCount: number;
  internalCost: number;
  handPosition: number | null;
}

export interface AssignmentPathEvent<T = unknown> {
  payload: T;
  assignments: EventPositionAssignment[];
}

export interface SelectedAssignmentPath<T = unknown> {
  selectedAssignmentIndexes: number[];
  selectedAssignments: EventPositionAssignment[];
  events: AssignmentPathEvent<T>[];
  totalCost: number;
}

function parseScientificNoteToMidi(noteWithOctave: string): number | null {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(noteWithOctave.trim());
  if (!match) return null;
  const [, letter, sharp, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  const baseByLetter: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = baseByLetter[letter];
  if (!Number.isFinite(base)) return null;
  return (octave + 1) * 12 + base + (sharp ? 1 : 0);
}

export function toPitchClassFromMidi(midi: number) {
  const normalized = ((Math.round(midi) % 12) + 12) % 12;
  return PITCH_CLASS_NAMES[normalized] ?? 'C';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildPositionCandidatesByMidi(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  maxFret = DEFAULT_TABLATURE_MAX_FRET
) {
  const byMidi = new Map<number, PositionCandidate[]>();
  instrument.STRING_ORDER.forEach((stringName, stringIndex) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
      if (!noteWithOctave) continue;
      const midi = parseScientificNoteToMidi(noteWithOctave);
      if (midi === null) continue;
      const list = byMidi.get(midi) ?? [];
      list.push({ stringName, fret, stringIndex });
      byMidi.set(midi, list);
    }
  });
  byMidi.forEach((list) => list.sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex));
  return byMidi;
}

function buildFingeringProfile(positions: PositionCandidate[]): FingeringProfile {
  if (positions.length === 0) {
    return {
      handPosition: null,
      handShiftCount: 0,
      clampedFingerCount: 0,
      openStringCount: 0,
    };
  }

  const sorted = [...positions].sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex);
  const positiveFrets = sorted.map((position) => position.fret).filter((fret) => fret > 0);
  let handPosition = positiveFrets[0] ?? null;
  let handShiftCount = 0;
  let clampedFingerCount = 0;
  let openStringCount = 0;

  sorted.forEach((position) => {
    if (position.fret === 0) {
      openStringCount++;
      return;
    }

    if (handPosition === null) {
      handPosition = position.fret;
    }

    if (Math.abs(position.fret - handPosition) > 4) {
      handPosition = Math.max(1, position.fret - 3);
      handShiftCount++;
    }

    const rawFinger = position.fret - handPosition + 1;
    const finger = clamp(rawFinger, 1, 4);
    if (finger !== rawFinger) {
      clampedFingerCount++;
    }
  });

  return {
    handPosition,
    handShiftCount,
    clampedFingerCount,
    openStringCount,
  };
}

export function getInternalFingeringCost(positions: PositionCandidate[], profile: FingeringProfile) {
  if (positions.length === 0) return 1000;
  const frets = positions.map((position) => position.fret);
  const strings = positions.map((position) => position.stringIndex);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);
  const spread = maxFret - minFret;
  const stringSpread = Math.max(...strings) - Math.min(...strings);
  const averageFret = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;
  const handAnchor = profile.handPosition ?? minFret;
  const isPolyphonic = positions.length > 1;

  const stretchPenalty = Math.max(0, spread - 4) * 2.1 + Math.max(0, spread - 6) * 2.6;
  const highFretPenalty = Math.max(0, averageFret - 12) * 0.65 + Math.max(0, maxFret - 16) * 0.75;
  const openStringBonusWeight = isPolyphonic ? 0.2 : 0.45;

  return (
    averageFret * 0.5 +
    maxFret * 0.18 +
    spread * 1.35 +
    stringSpread * 0.6 +
    Math.abs(handAnchor - minFret) * 0.45 +
    profile.handShiftCount * 1.6 +
    profile.clampedFingerCount * 1.25 +
    stretchPenalty +
    highFretPenalty -
    profile.openStringCount * openStringBonusWeight
  );
}

export function chooseEventPositions(
  eventMidiOccurrences: EventMidiOccurrence[],
  candidateMap: Map<number, PositionCandidate[]>,
  maxAssignments = 24
) {
  const sortedOccurrences = [...eventMidiOccurrences].sort(
    (a, b) => b.midi - a.midi || a.occurrenceIndex - b.occurrenceIndex
  );
  const candidateLimitPerNote = Math.max(4, Math.ceil(12 / Math.max(1, eventMidiOccurrences.length)));
  const working: AssignedEventMidiOccurrence[] = [];
  const usedStrings = new Set<string>();
  const assignments = new Map<string, EventPositionAssignment>();

  const captureAssignment = () => {
    const assignedByOccurrence = new Map<number, AssignedEventMidiOccurrence>();
    working.forEach((item) => assignedByOccurrence.set(item.occurrenceIndex, item));
    const notes: MelodyEventNote[] = [];
    const positions: PositionCandidate[] = [];
    const occurrenceAssignments: { occurrenceIndex: number; pitchClass: string; assigned: PositionCandidate }[] = [];
    let unresolvedCount = 0;

    for (const occurrence of eventMidiOccurrences) {
      const assigned = assignedByOccurrence.get(occurrence.occurrenceIndex);
      if (!assigned) {
        unresolvedCount++;
        continue;
      }
      notes.push({
        note: occurrence.pitchClass,
        stringName: assigned.assigned.stringName,
        fret: assigned.assigned.fret,
      });
      positions.push(assigned.assigned);
      occurrenceAssignments.push({
        occurrenceIndex: occurrence.occurrenceIndex,
        pitchClass: occurrence.pitchClass,
        assigned: assigned.assigned,
      });
    }

    const fingeringProfile = buildFingeringProfile(positions);
    const internalCost = getInternalFingeringCost(positions, fingeringProfile);
    const signature = notes
      .map((note, index) => `${index}:${note.stringName ?? '?'}:${note.fret ?? -1}`)
      .join('|');
    const nextAssignment: EventPositionAssignment = {
      notes,
      positions,
      occurrenceAssignments,
      unresolvedCount,
      internalCost,
      handPosition: fingeringProfile.handPosition,
    };
    const existing = assignments.get(signature);
    if (
      !existing ||
      nextAssignment.internalCost + nextAssignment.unresolvedCount <
        existing.internalCost + existing.unresolvedCount
    ) {
      assignments.set(signature, nextAssignment);
    }
  };

  const backtrack = (index: number) => {
    if (index >= sortedOccurrences.length) {
      captureAssignment();
      return;
    }

    const occurrence = sortedOccurrences[index];
    const candidates = (candidateMap.get(occurrence.midi) ?? [])
      .filter((candidate) => !usedStrings.has(candidate.stringName))
      .slice(0, candidateLimitPerNote);

    for (const candidate of candidates) {
      usedStrings.add(candidate.stringName);
      working.push({ ...occurrence, assigned: candidate });
      backtrack(index + 1);
      working.pop();
      usedStrings.delete(candidate.stringName);
    }

    // Allow unresolved notes for branches where this note cannot be placed on a free string.
    backtrack(index + 1);
  };

  backtrack(0);

  return [...assignments.values()]
    .sort((a, b) => {
      if (a.unresolvedCount !== b.unresolvedCount) return a.unresolvedCount - b.unresolvedCount;
      if (a.internalCost !== b.internalCost) return a.internalCost - b.internalCost;
      return a.notes.length - b.notes.length;
    })
    .slice(0, maxAssignments);
}

export function getTransitionCost(previous: EventPositionAssignment, next: EventPositionAssignment) {
  if (previous.positions.length === 0 || next.positions.length === 0) return 8;

  const previousAvgFret =
    previous.positions.reduce((sum, item) => sum + item.fret, 0) / previous.positions.length;
  const nextAvgFret = next.positions.reduce((sum, item) => sum + item.fret, 0) / next.positions.length;
  const previousAvgString =
    previous.positions.reduce((sum, item) => sum + item.stringIndex, 0) / previous.positions.length;
  const nextAvgString =
    next.positions.reduce((sum, item) => sum + item.stringIndex, 0) / next.positions.length;

  const fretShift = Math.abs(nextAvgFret - previousAvgFret);
  const stringShift = Math.abs(nextAvgString - previousAvgString);
  const pairwiseMinDistance =
    next.positions.reduce((sum, nextPos) => {
      const nearest = previous.positions.reduce((minDistance, prevPos) => {
        const distance =
          Math.abs(nextPos.fret - prevPos.fret) + Math.abs(nextPos.stringIndex - prevPos.stringIndex) * 1.25;
        return Math.min(minDistance, distance);
      }, Number.POSITIVE_INFINITY);
      return sum + nearest;
    }, 0) / Math.max(1, next.positions.length);

  const previousMaxFret = Math.max(...previous.positions.map((item) => item.fret));
  const nextMaxFret = Math.max(...next.positions.map((item) => item.fret));
  const largeJumpPenalty = Math.max(0, Math.abs(nextMaxFret - previousMaxFret) - 5) * 1.2;
  const handShift =
    previous.handPosition !== null && next.handPosition !== null
      ? Math.abs(next.handPosition - previous.handPosition)
      : 0;

  return fretShift * 1.45 + stringShift * 1.1 + pairwiseMinDistance * 0.7 + largeJumpPenalty + handShift * 0.85;
}

export function createFallbackEmptyAssignment(unresolvedCount: number): EventPositionAssignment {
  return {
    notes: [],
    positions: [],
    occurrenceAssignments: [],
    unresolvedCount,
    internalCost: 1000,
    handPosition: null,
  };
}

export function selectOptimalAssignmentPath<T>(
  events: AssignmentPathEvent<T>[],
  options: { unresolvedPenalty?: number } = {}
): SelectedAssignmentPath<T> {
  const unresolvedPenalty = Number.isFinite(options.unresolvedPenalty) ? Number(options.unresolvedPenalty) : 28;
  if (events.length === 0) {
    return {
      selectedAssignmentIndexes: [],
      selectedAssignments: [],
      events,
      totalCost: 0,
    };
  }

  const dpCosts: number[][] = events.map((event) => event.assignments.map(() => Number.POSITIVE_INFINITY));
  const backPointers: number[][] = events.map((event) => event.assignments.map(() => -1));

  events[0].assignments.forEach((assignment, index) => {
    dpCosts[0][index] = assignment.internalCost + assignment.unresolvedCount * unresolvedPenalty;
  });

  for (let eventIndex = 1; eventIndex < events.length; eventIndex++) {
    const previousEvent = events[eventIndex - 1];
    const currentEvent = events[eventIndex];
    currentEvent.assignments.forEach((currentAssignment, currentIndex) => {
      const currentCostBase = currentAssignment.internalCost + currentAssignment.unresolvedCount * unresolvedPenalty;
      let bestCost = Number.POSITIVE_INFINITY;
      let bestPreviousIndex = -1;
      previousEvent.assignments.forEach((previousAssignment, previousIndex) => {
        const previousCost = dpCosts[eventIndex - 1][previousIndex];
        if (!Number.isFinite(previousCost)) return;
        const transitionCost = getTransitionCost(previousAssignment, currentAssignment);
        const candidateCost = previousCost + currentCostBase + transitionCost;
        if (candidateCost < bestCost) {
          bestCost = candidateCost;
          bestPreviousIndex = previousIndex;
        }
      });
      dpCosts[eventIndex][currentIndex] = bestCost;
      backPointers[eventIndex][currentIndex] = bestPreviousIndex;
    });
  }

  const lastEventIndex = events.length - 1;
  let bestLastAssignmentIndex = 0;
  let bestLastCost = Number.POSITIVE_INFINITY;
  dpCosts[lastEventIndex].forEach((cost, index) => {
    if (cost < bestLastCost) {
      bestLastCost = cost;
      bestLastAssignmentIndex = index;
    }
  });

  const selectedAssignmentIndexes = new Array<number>(events.length).fill(0);
  let cursor = bestLastAssignmentIndex;
  for (let eventIndex = lastEventIndex; eventIndex >= 0; eventIndex--) {
    selectedAssignmentIndexes[eventIndex] = cursor;
    cursor = backPointers[eventIndex][cursor] ?? -1;
    if (cursor < 0 && eventIndex > 0) {
      cursor = 0;
    }
  }

  const selectedAssignments = events.map(
    (event, eventIndex) =>
      event.assignments[selectedAssignmentIndexes[eventIndex]] ?? createFallbackEmptyAssignment(0)
  );

  return {
    selectedAssignmentIndexes,
    selectedAssignments,
    events,
    totalCost: Number.isFinite(bestLastCost) ? bestLastCost : 0,
  };
}
