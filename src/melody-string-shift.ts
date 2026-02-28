import type { IInstrument } from './instruments/instrument';
import type { MelodyDefinition, MelodyEvent, MelodyEventNote } from './melody-library';
import { DEFAULT_TABLATURE_MAX_FRET } from './tablature-optimizer';
import { getMelodyWithTranspose, normalizeMelodyTransposeSemitones } from './melody-transposition';

const STRING_SHIFT_CACHE_LIMIT = 48;
const stringShiftCache = new Map<string, MelodyDefinition>();

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cloneEventNote(note: MelodyEventNote): MelodyEventNote {
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
    notes: event.notes.map(cloneEventNote),
  }));
}

function getInstrumentShiftBounds(instrument: Pick<IInstrument, 'STRING_ORDER'>) {
  const maxAbsoluteShift = Math.max(0, instrument.STRING_ORDER.length - 1);
  return {
    min: -maxAbsoluteShift,
    max: maxAbsoluteShift,
  };
}

function getMidiAtPosition(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  stringName: string,
  fret: number
) {
  if (!instrument.STRING_ORDER.includes(stringName)) return null;
  const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) return null;
  return parseScientificNoteToMidi(noteWithOctave);
}

function buildMelodyContentSignature(melody: Pick<MelodyDefinition, 'events'>) {
  let hash = 2166136261;
  for (const event of melody.events) {
    hash ^= (event.barIndex ?? -1) + 17;
    hash = Math.imul(hash, 16777619);
    hash ^= (event.column ?? -1) + 31;
    hash = Math.imul(hash, 16777619);
    for (const note of event.notes) {
      const text = `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
  }
  return (hash >>> 0).toString(16);
}

function buildStringShiftCacheKey(
  melody: Pick<MelodyDefinition, 'id' | 'events'>,
  stringShift: number,
  instrument: Pick<IInstrument, 'name'>
) {
  return [
    instrument.name,
    melody.id,
    normalizeMelodyStringShift(stringShift, instrument),
    melody.events.length,
    buildMelodyContentSignature(melody),
  ].join('|');
}

function shiftMelodyEvents(
  events: MelodyEvent[],
  stringShift: number,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const normalized = normalizeMelodyStringShift(stringShift, instrument);
  if (normalized === 0 || events.length === 0) {
    return {
      feasible: true,
      events: cloneMelodyEvents(events),
    };
  }

  const shiftedEvents: MelodyEvent[] = [];
  for (const event of events) {
    const usedTargetStrings = new Set<string>();
    const shiftedNotes: MelodyEventNote[] = [];

    for (const note of event.notes) {
      if (
        typeof note.stringName !== 'string' ||
        typeof note.fret !== 'number' ||
        !Number.isFinite(note.fret)
      ) {
        return { feasible: false, events: cloneMelodyEvents(events) };
      }

      const sourceStringIndex = instrument.STRING_ORDER.indexOf(note.stringName);
      if (sourceStringIndex < 0) {
        return { feasible: false, events: cloneMelodyEvents(events) };
      }

      const targetStringIndex = sourceStringIndex + normalized;
      if (targetStringIndex < 0 || targetStringIndex >= instrument.STRING_ORDER.length) {
        return { feasible: false, events: cloneMelodyEvents(events) };
      }

      const targetStringName = instrument.STRING_ORDER[targetStringIndex]!;
      if (usedTargetStrings.has(targetStringName)) {
        return { feasible: false, events: cloneMelodyEvents(events) };
      }

      const sourceMidi = getMidiAtPosition(instrument, note.stringName, note.fret);
      const targetOpenMidi = getMidiAtPosition(instrument, targetStringName, 0);
      if (sourceMidi === null || targetOpenMidi === null) {
        return { feasible: false, events: cloneMelodyEvents(events) };
      }

      const targetFret = sourceMidi - targetOpenMidi;
      if (targetFret < 0 || targetFret > DEFAULT_TABLATURE_MAX_FRET) {
        return { feasible: false, events: cloneMelodyEvents(events) };
      }

      usedTargetStrings.add(targetStringName);
      shiftedNotes.push({
        note: note.note,
        stringName: targetStringName,
        fret: targetFret,
      });
    }

    shiftedEvents.push({
      barIndex: event.barIndex,
      column: event.column,
      durationColumns: event.durationColumns,
      durationCountSteps: event.durationCountSteps,
      durationBeats: event.durationBeats,
      notes: shiftedNotes,
    });
  }

  return {
    feasible: true,
    events: shiftedEvents,
  };
}

export function normalizeMelodyStringShift(
  value: unknown,
  instrumentOrMaxAbsoluteShift?: Pick<IInstrument, 'STRING_ORDER'> | number
) {
  let parsedValue = 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    parsedValue = Math.round(value);
  } else if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      parsedValue = Math.round(parsed);
    }
  }

  const maxAbsoluteShift =
    typeof instrumentOrMaxAbsoluteShift === 'number'
      ? Math.max(0, Math.round(instrumentOrMaxAbsoluteShift))
      : getInstrumentShiftBounds(
          instrumentOrMaxAbsoluteShift ?? { STRING_ORDER: ['1', '2', '3', '4', '5', '6'] }
        ).max;

  return clamp(parsedValue, -maxAbsoluteShift, maxAbsoluteShift);
}

export function formatMelodyStringShift(value: number) {
  const normalized = normalizeMelodyStringShift(value);
  if (normalized > 0) return `+${normalized} str`;
  if (normalized < 0) return `${normalized} str`;
  return '0 str';
}

export function isMelodyStringShiftFeasible(
  melody: MelodyDefinition,
  stringShift: number,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  return shiftMelodyEvents(melody.events, stringShift, instrument).feasible;
}

export function coerceMelodyStringShiftToFeasible(
  melody: MelodyDefinition,
  stringShift: number,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const preferred = normalizeMelodyStringShift(stringShift, instrument);
  if (preferred === 0) return 0;
  if (isMelodyStringShiftFeasible(melody, preferred, instrument)) return preferred;

  const direction = Math.sign(preferred);
  for (let distance = Math.abs(preferred) - 1; distance >= 0; distance--) {
    const candidate = distance === 0 ? 0 : direction * distance;
    if (isMelodyStringShiftFeasible(melody, candidate, instrument)) {
      return candidate;
    }
  }

  return 0;
}

export function getMelodyWithStringShift(
  melody: MelodyDefinition,
  stringShift: number,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const normalized = normalizeMelodyStringShift(stringShift, instrument);
  if (normalized === 0) return melody;

  const cacheKey = buildStringShiftCacheKey(melody, normalized, instrument);
  const cached = stringShiftCache.get(cacheKey);
  if (cached) return cached;

  const shifted = shiftMelodyEvents(melody.events, normalized, instrument);
  if (!shifted.feasible) {
    return melody;
  }

  const nextMelody: MelodyDefinition = {
    ...melody,
    events: shifted.events,
  };

  if (stringShiftCache.size >= STRING_SHIFT_CACHE_LIMIT) {
    const firstKey = stringShiftCache.keys().next().value;
    if (typeof firstKey === 'string') {
      stringShiftCache.delete(firstKey);
    }
  }
  stringShiftCache.set(cacheKey, nextMelody);
  return nextMelody;
}

export function getMelodyWithPracticeAdjustments(
  melody: MelodyDefinition,
  transposeSemitones: number,
  stringShift: number,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const transposed = getMelodyWithTranspose(
    melody,
    normalizeMelodyTransposeSemitones(transposeSemitones),
    instrument
  );
  return getMelodyWithStringShift(transposed, stringShift, instrument);
}

export function clearMelodyStringShiftCache() {
  stringShiftCache.clear();
}
