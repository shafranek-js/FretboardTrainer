import { NOTE_TO_SEMITONE } from './constants';
import type { IInstrument } from './instruments/instrument';
import type { MelodyEvent, MelodyEventNote } from './melody-library';
import {
  DEFAULT_TABLATURE_MAX_FRET,
  buildPositionCandidatesByMidi,
  chooseEventPositions,
  createFallbackEmptyAssignment,
  selectOptimalAssignmentPath,
  toPitchClassFromMidi,
  type EventMidiOccurrence,
  type PositionCandidate,
} from './tablature-optimizer';

const FLAT_TO_SHARP_MAP: Record<string, string> = {
  Bb: 'A#',
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  'E#': 'F',
  'B#': 'C',
};

interface ResolvedExplicitPosition {
  candidate: PositionCandidate;
  pitchClassAtPosition: string;
}

export interface ResolvedMelodyEventPositions {
  events: MelodyEvent[];
  filledPositions: number;
  unresolvedPositions: number;
}

function normalizePitchClass(noteName: string | null | undefined): string | null {
  if (typeof noteName !== 'string') return null;
  const cleaned = noteName
    .trim()
    .replace(/-?\d+$/, '')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b');
  const match = /^([A-Ga-g])([#b]?)$/.exec(cleaned);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2] ?? '';
  const canonical = `${letter}${accidental}`;
  const sharp = FLAT_TO_SHARP_MAP[canonical] ?? canonical;
  return typeof NOTE_TO_SEMITONE[sharp] === 'number' ? sharp : null;
}

function stripOctaveSuffix(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

function cloneEventNote(note: MelodyEventNote): MelodyEventNote {
  return {
    note: note.note,
    stringName: note.stringName,
    fret: note.fret,
  };
}

function resolveExplicitPosition(
  note: MelodyEventNote,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): ResolvedExplicitPosition | null {
  if (typeof note.stringName !== 'string' || typeof note.fret !== 'number' || !Number.isFinite(note.fret)) {
    return null;
  }
  const stringIndex = instrument.STRING_ORDER.indexOf(note.stringName);
  if (stringIndex < 0) return null;
  const noteWithOctave = instrument.getNoteWithOctave(note.stringName, note.fret);
  if (!noteWithOctave) return null;
  const pitchClass = normalizePitchClass(stripOctaveSuffix(noteWithOctave));
  if (!pitchClass) return null;
  return {
    candidate: {
      stringName: note.stringName,
      fret: note.fret,
      stringIndex,
    },
    pitchClassAtPosition: pitchClass,
  };
}

function buildPitchClassCandidateMap(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  maxFret: number
) {
  const byMidi = buildPositionCandidatesByMidi(instrument, maxFret);
  const bySemitone = new Map<number, PositionCandidate[]>();
  byMidi.forEach((positions, midi) => {
    const pitchClass = toPitchClassFromMidi(midi);
    const semitone = NOTE_TO_SEMITONE[pitchClass];
    if (typeof semitone !== 'number') return;
    const list = bySemitone.get(semitone) ?? [];
    list.push(...positions);
    bySemitone.set(semitone, list);
  });
  bySemitone.forEach((positions) => positions.sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex));
  return bySemitone;
}

interface ResolverEventContext {
  event: MelodyEvent;
  occurrences: EventMidiOccurrence[];
  assignments: ReturnType<typeof chooseEventPositions>;
}

export function resolveMelodyEventPositions(
  events: MelodyEvent[],
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  options: { maxFret?: number } = {}
): ResolvedMelodyEventPositions {
  const maxFret =
    typeof options.maxFret === 'number' && Number.isFinite(options.maxFret)
      ? Math.max(0, Math.round(options.maxFret))
      : DEFAULT_TABLATURE_MAX_FRET;

  const contexts: ResolverEventContext[] = [];
  const pitchClassCandidates = buildPitchClassCandidateMap(instrument, maxFret);
  let nextOccurrenceKey = 1;

  for (const event of events) {
    const eventCandidateMap = new Map<number, PositionCandidate[]>();
    const occurrences: EventMidiOccurrence[] = [];

    event.notes.forEach((note, noteIndex) => {
      const explicit = resolveExplicitPosition(note, instrument);
      const normalizedInput = normalizePitchClass(note.note);
      if (explicit) {
        const key = nextOccurrenceKey++;
        occurrences.push({
          midi: key,
          pitchClass: normalizedInput ?? explicit.pitchClassAtPosition,
          occurrenceIndex: noteIndex,
        });
        eventCandidateMap.set(key, [explicit.candidate]);
        return;
      }

      if (!normalizedInput) return;
      const semitone = NOTE_TO_SEMITONE[normalizedInput];
      if (typeof semitone !== 'number') return;

      const key = nextOccurrenceKey++;
      occurrences.push({
        midi: key,
        pitchClass: normalizedInput,
        occurrenceIndex: noteIndex,
      });
      eventCandidateMap.set(key, pitchClassCandidates.get(semitone) ?? []);
    });

    const assignments =
      occurrences.length > 0
        ? chooseEventPositions(occurrences, eventCandidateMap)
        : [createFallbackEmptyAssignment(0)];
    contexts.push({
      event,
      occurrences,
      assignments: assignments.length > 0 ? assignments : [createFallbackEmptyAssignment(occurrences.length)],
    });
  }

  const assignmentPath = selectOptimalAssignmentPath(contexts, { unresolvedPenalty: 28 });
  let filledPositions = 0;
  let unresolvedPositions = 0;

  const resolvedEvents = contexts.map((context, eventIndex) => {
    const selected = assignmentPath.selectedAssignments[eventIndex] ?? createFallbackEmptyAssignment(0);
    const byOccurrenceIndex = new Map<number, { pitchClass: string; assigned: PositionCandidate }>();
    selected.occurrenceAssignments.forEach((assignment) => {
      byOccurrenceIndex.set(assignment.occurrenceIndex, {
        pitchClass: assignment.pitchClass,
        assigned: assignment.assigned,
      });
    });

    const notes = context.event.notes.map((note, noteIndex) => {
      const resolved = byOccurrenceIndex.get(noteIndex);
      const hadValidPosition = resolveExplicitPosition(note, instrument) !== null;
      if (resolved) {
        if (!hadValidPosition) {
          filledPositions++;
        }
        return {
          note: resolved.pitchClass,
          stringName: resolved.assigned.stringName,
          fret: resolved.assigned.fret,
        };
      }

      if (!hadValidPosition) {
        unresolvedPositions++;
      }
      return cloneEventNote(note);
    });

    return {
      column: context.event.column,
      durationColumns: context.event.durationColumns,
      durationCountSteps: context.event.durationCountSteps,
      durationBeats: context.event.durationBeats,
      notes,
    };
  });

  return {
    events: resolvedEvents,
    filledPositions,
    unresolvedPositions,
  };
}
