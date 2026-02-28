import { NOTE_TO_SEMITONE, SEMITONE_TO_NOTE } from './constants';
import type { IInstrument } from './instruments/instrument';
import type { MelodyDefinition, MelodyEvent, MelodyEventNote } from './melody-library';
import {
  DEFAULT_TABLATURE_MAX_FRET,
  buildPositionCandidatesByMidi,
  chooseEventPositions,
  toPitchClassFromMidi,
} from './tablature-optimizer';

export const MIN_MELODY_TRANSPOSE_SEMITONES = -12;
export const MAX_MELODY_TRANSPOSE_SEMITONES = 12;

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

const transposeCache = new Map<string, MelodyDefinition>();
const TRANSPOSE_CACHE_LIMIT = 32;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePitchClass(noteName: string | null | undefined): string | null {
  if (typeof noteName !== 'string') return null;

  const cleaned = noteName
    .trim()
    .replace(/-?\d+$/, '')
    .replace(/\u266f/g, '#')
    .replace(/\u266d/g, 'b');
  const match = /^([A-Ga-g])([#b]?)$/.exec(cleaned);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const accidental = match[2] ?? '';
  const canonical = `${letter}${accidental}`;
  const sharpName = FLAT_TO_SHARP_MAP[canonical] ?? canonical;
  return typeof NOTE_TO_SEMITONE[sharpName] === 'number' ? sharpName : null;
}

function cloneMelodyEventNote(note: MelodyEventNote): MelodyEventNote {
  return {
    note: note.note,
    stringName: note.stringName,
    fret: note.fret,
  };
}

function cloneMelodyEvents(events: MelodyEvent[]): MelodyEvent[] {
  return events.map((event) => ({
    barIndex: event.barIndex,
    column: event.column,
    durationColumns: event.durationColumns,
    durationCountSteps: event.durationCountSteps,
    durationBeats: event.durationBeats,
    notes: event.notes.map(cloneMelodyEventNote),
  }));
}

function parseScientificNoteToMidi(noteWithOctave: string): number | null {
  const cleaned = noteWithOctave
    .trim()
    .replace(/\u266f/g, '#')
    .replace(/\u266d/g, 'b');
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(cleaned);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const accidental = match[2] ?? '';
  const octave = Number.parseInt(match[3], 10);
  if (!Number.isFinite(octave)) return null;

  const canonical = `${letter}${accidental}`;
  const sharpName = FLAT_TO_SHARP_MAP[canonical] ?? canonical;
  const semitone = NOTE_TO_SEMITONE[sharpName];
  if (typeof semitone !== 'number') return null;
  return (octave + 1) * 12 + semitone;
}

function getMidiFromInstrumentPosition(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  stringName: string,
  fret: number
) {
  if (!instrument.STRING_ORDER.includes(stringName)) return null;
  const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) return null;
  return parseScientificNoteToMidi(noteWithOctave);
}

function resolveSourceNoteMidi(
  note: MelodyEventNote,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  if (typeof note.stringName === 'string' && typeof note.fret === 'number' && Number.isFinite(note.fret)) {
    const midi = getMidiFromInstrumentPosition(instrument, note.stringName, note.fret);
    if (midi !== null) return midi;
  }
  return parseScientificNoteToMidi(note.note);
}

function chooseNearestMidi(candidates: number[], targetMidi: number) {
  let best = candidates[0] ?? null;
  if (best === null) return null;
  let bestDistance = Math.abs(best - targetMidi);
  for (let index = 1; index < candidates.length; index++) {
    const candidate = candidates[index];
    const distance = Math.abs(candidate - targetMidi);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function resolvePlayableTargetMidi(
  targetMidi: number,
  candidatesByMidi: Map<number, { stringName: string; fret: number; stringIndex: number }[]>
) {
  if (candidatesByMidi.has(targetMidi)) return targetMidi;
  for (let octaveShift = 1; octaveShift <= 8; octaveShift++) {
    const up = targetMidi + octaveShift * 12;
    if (candidatesByMidi.has(up)) return up;
    const down = targetMidi - octaveShift * 12;
    if (candidatesByMidi.has(down)) return down;
  }
  return null;
}

function buildPitchClassToMidiMap(
  candidatesByMidi: Map<number, { stringName: string; fret: number; stringIndex: number }[]>
) {
  const bySemitone = new Map<number, number[]>();
  candidatesByMidi.forEach((positions, midi) => {
    if (positions.length === 0) return;
    const semitone = ((midi % 12) + 12) % 12;
    const list = bySemitone.get(semitone) ?? [];
    list.push(midi);
    bySemitone.set(semitone, list);
  });
  bySemitone.forEach((list) => list.sort((a, b) => a - b));
  return bySemitone;
}

function inferMidiForPitchClass(
  pitchClass: string,
  previousMidi: number | null,
  pitchClassToMidis: Map<number, number[]>
) {
  const semitone = NOTE_TO_SEMITONE[pitchClass];
  if (typeof semitone !== 'number') return null;
  const candidates = pitchClassToMidis.get(semitone) ?? [];
  if (candidates.length === 0) return null;
  if (previousMidi === null) {
    return candidates[Math.floor(candidates.length / 2)] ?? null;
  }
  return chooseNearestMidi(candidates, previousMidi);
}

export function normalizeMelodyTransposeSemitones(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.round(value), MIN_MELODY_TRANSPOSE_SEMITONES, MAX_MELODY_TRANSPOSE_SEMITONES);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return clamp(Math.round(parsed), MIN_MELODY_TRANSPOSE_SEMITONES, MAX_MELODY_TRANSPOSE_SEMITONES);
    }
  }

  return 0;
}

export function formatMelodyTransposeSemitones(value: number) {
  const normalized = normalizeMelodyTransposeSemitones(value);
  if (normalized > 0) return `+${normalized} st`;
  if (normalized < 0) return `${normalized} st`;
  return '0 st';
}

export function transposePitchClass(noteName: string, semitones: number): string | null {
  const normalized = normalizePitchClass(noteName);
  if (!normalized) return null;

  const rootSemitone = NOTE_TO_SEMITONE[normalized];
  if (typeof rootSemitone !== 'number') return null;

  const offset = normalizeMelodyTransposeSemitones(semitones);
  const transposed = ((rootSemitone + offset) % 12 + 12) % 12;
  return SEMITONE_TO_NOTE[transposed] ?? null;
}

export function transposeMelodyEvents(
  events: MelodyEvent[],
  semitones: number,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const normalized = normalizeMelodyTransposeSemitones(semitones);
  if (normalized === 0 || events.length === 0) {
    return cloneMelodyEvents(events);
  }

  const candidatesByMidi = buildPositionCandidatesByMidi(instrument, DEFAULT_TABLATURE_MAX_FRET);
  const pitchClassToMidis = buildPitchClassToMidiMap(candidatesByMidi);
  let previousAssignedMidi: number | null = null;

  return events.map((event) => {
    const occurrences: { midi: number; pitchClass: string; occurrenceIndex: number }[] = [];
    const candidateMap = new Map<number, { stringName: string; fret: number; stringIndex: number }[]>();
    const fallbackByOccurrence = new Map<number, MelodyEventNote>();

    event.notes.forEach((note, noteIndex) => {
      const sourceMidi = resolveSourceNoteMidi(note, instrument);
      let targetMidi: number | null = null;

      if (sourceMidi !== null) {
        targetMidi = resolvePlayableTargetMidi(sourceMidi + normalized, candidatesByMidi);
      }

      if (targetMidi === null) {
        const transposedPitchClass = transposePitchClass(note.note, normalized);
        if (transposedPitchClass) {
          const inferredMidi = inferMidiForPitchClass(
            transposedPitchClass,
            previousAssignedMidi,
            pitchClassToMidis
          );
          if (inferredMidi !== null) {
            targetMidi = resolvePlayableTargetMidi(inferredMidi, candidatesByMidi);
          }
        }
      }

      if (targetMidi !== null) {
        const pitchClass = toPitchClassFromMidi(targetMidi);
        occurrences.push({
          midi: targetMidi,
          pitchClass,
          occurrenceIndex: noteIndex,
        });
        candidateMap.set(targetMidi, candidatesByMidi.get(targetMidi) ?? []);
        return;
      }

      const transposedPitchClass = transposePitchClass(note.note, normalized);
      fallbackByOccurrence.set(noteIndex, {
        note: transposedPitchClass ?? note.note,
        stringName: null,
        fret: null,
      });
    });

    const assignments = occurrences.length > 0 ? chooseEventPositions(occurrences, candidateMap, 32) : [];
    const selected = assignments[0] ?? null;
    const assignedByOccurrence = new Map<
      number,
      { pitchClass: string; assigned: { stringName: string; fret: number; stringIndex: number } }
    >();
    selected?.occurrenceAssignments.forEach((assignment) => {
      assignedByOccurrence.set(assignment.occurrenceIndex, {
        pitchClass: assignment.pitchClass,
        assigned: assignment.assigned,
      });
    });

    const notes = event.notes.map((note, noteIndex) => {
      const assigned = assignedByOccurrence.get(noteIndex);
      if (assigned) {
        const resolvedNote: MelodyEventNote = {
          note: assigned.pitchClass,
          stringName: assigned.assigned.stringName,
          fret: assigned.assigned.fret,
        };
        const midi = getMidiFromInstrumentPosition(
          instrument,
          resolvedNote.stringName,
          resolvedNote.fret
        );
        if (midi !== null) {
          previousAssignedMidi = midi;
        }
        return resolvedNote;
      }

      const fallback = fallbackByOccurrence.get(noteIndex);
      if (fallback) return fallback;

      const transposedPitchClass = transposePitchClass(note.note, normalized);
      return {
        note: transposedPitchClass ?? note.note,
        stringName: null,
        fret: null,
      };
    });

    return {
      barIndex: event.barIndex,
      column: event.column,
      durationColumns: event.durationColumns,
      durationCountSteps: event.durationCountSteps,
      durationBeats: event.durationBeats,
      notes,
    };
  });
}

function buildTransposeCacheKey(
  melody: Pick<MelodyDefinition, 'id' | 'events'>,
  semitones: number,
  instrument: Pick<IInstrument, 'name'>
) {
  const normalized = normalizeMelodyTransposeSemitones(semitones);
  const firstNote = melody.events[0]?.notes[0]?.note ?? '';
  const lastEvent = melody.events[melody.events.length - 1];
  const lastNote = lastEvent?.notes[lastEvent.notes.length - 1]?.note ?? '';
  return `${instrument.name}|${melody.id}|${normalized}|${melody.events.length}|${firstNote}|${lastNote}`;
}

export function getMelodyWithTranspose(
  melody: MelodyDefinition,
  semitones: number,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const normalized = normalizeMelodyTransposeSemitones(semitones);
  if (normalized === 0) return melody;

  const cacheKey = buildTransposeCacheKey(melody, normalized, instrument);
  const cached = transposeCache.get(cacheKey);
  if (cached) return cached;

  const transposed: MelodyDefinition = {
    ...melody,
    events: transposeMelodyEvents(melody.events, normalized, instrument),
  };

  if (transposeCache.size >= TRANSPOSE_CACHE_LIMIT) {
    const firstKey = transposeCache.keys().next().value;
    if (typeof firstKey === 'string') {
      transposeCache.delete(firstKey);
    }
  }
  transposeCache.set(cacheKey, transposed);
  return transposed;
}

export function clearMelodyTransposeCache() {
  transposeCache.clear();
}
