import type { IInstrument } from './instruments/instrument';
import type { MelodyEvent, MelodyEventNote } from './melody-library';

export interface MelodyTimelineEditingSession {
  melodyId: string | null;
  draft: MelodyEvent[] | null;
  history: MelodyEvent[][];
  future: MelodyEvent[][];
}

export interface MelodyTimelineEditingSelection {
  eventIndex: number | null;
  noteIndex: number | null;
}

type TimelineEditingInstrument = Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>;

export function cloneMelodyEventsDraft(events: MelodyEvent[]) {
  return events.map((event) => ({
    ...event,
    notes: event.notes.map((note) => ({ ...note })),
  }));
}

function stripScientificOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

export function resetMelodyTimelineEditingSession(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  session.melodyId = null;
  session.draft = null;
  session.history = [];
  session.future = [];
  selection.eventIndex = null;
  selection.noteIndex = null;
}

export function ensureMelodyTimelineEditingDraftLoaded(
  session: MelodyTimelineEditingSession,
  melodyId: string,
  events: MelodyEvent[]
) {
  if (session.melodyId === melodyId && session.draft) return;
  session.melodyId = melodyId;
  session.draft = cloneMelodyEventsDraft(events);
  session.history = [];
  session.future = [];
}

export function ensureMelodyTimelineEditingSelection(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || session.draft.length === 0) {
    selection.eventIndex = null;
    selection.noteIndex = null;
    return;
  }

  if (selection.eventIndex === null || selection.eventIndex < 0 || selection.eventIndex >= session.draft.length) {
    selection.eventIndex = 0;
  }

  let event = session.draft[selection.eventIndex];
  if (!event || event.notes.length === 0) {
    const nextEventIndex = session.draft.findIndex((candidate) => candidate.notes.length > 0);
    if (nextEventIndex >= 0) {
      selection.eventIndex = nextEventIndex;
      event = session.draft[nextEventIndex]!;
    }
  }

  if (!event || event.notes.length === 0) {
    selection.noteIndex = null;
    return;
  }

  if (selection.noteIndex === null || selection.noteIndex < 0 || selection.noteIndex >= event.notes.length) {
    selection.noteIndex = 0;
  }
}

export function getSelectedMelodyTimelineEditingNote(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || selection.eventIndex === null || selection.noteIndex === null) {
    return null;
  }
  const event = session.draft[selection.eventIndex];
  if (!event) return null;
  const note = event.notes[selection.noteIndex];
  if (!note) return null;
  return { event, note };
}

export function pushMelodyTimelineEditingHistory(session: MelodyTimelineEditingSession) {
  if (!session.draft) return;
  session.history.push(cloneMelodyEventsDraft(session.draft));
  if (session.history.length > 100) {
    session.history.shift();
  }
  session.future = [];
}

export function getMelodyEventDurationMagnitude(event: MelodyEvent) {
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    return event.durationBeats;
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    return event.durationCountSteps;
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    return event.durationColumns;
  }
  return 1;
}

export function canSplitMelodyEvent(event: MelodyEvent | null | undefined) {
  if (!event) return false;
  return getMelodyEventDurationMagnitude(event) > 1;
}

export function areMelodyEventNotesEquivalent(left: MelodyEvent, right: MelodyEvent) {
  if (left.notes.length !== right.notes.length) return false;
  const leftSignature = left.notes.map(toNoteSignature).sort();
  const rightSignature = right.notes.map(toNoteSignature).sort();
  return leftSignature.every((value, index) => value === rightSignature[index]);
}

export function canMergeMelodyEventWithNext(events: MelodyEvent[] | null, eventIndex: number | null) {
  if (!events || eventIndex === null || eventIndex < 0 || eventIndex >= events.length - 1) return false;
  const current = events[eventIndex];
  const next = events[eventIndex + 1];
  if (!current || !next) return false;
  return areMelodyEventNotesEquivalent(current, next);
}

export function splitMelodyEventDuration(event: MelodyEvent) {
  const first = cloneMelodyEventsDraft([event])[0]!;
  const second = cloneMelodyEventsDraft([event])[0]!;

  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    const firstValue = Math.max(0.25, event.durationBeats / 2);
    const secondValue = Math.max(0.25, event.durationBeats - firstValue);
    first.durationBeats = firstValue;
    second.durationBeats = secondValue;
    return { first, second };
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    const firstValue = Math.max(1, Math.floor(event.durationCountSteps / 2));
    const secondValue = Math.max(1, event.durationCountSteps - firstValue);
    first.durationCountSteps = firstValue;
    second.durationCountSteps = secondValue;
    return { first, second };
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    const firstValue = Math.max(1, Math.floor(event.durationColumns / 2));
    const secondValue = Math.max(1, event.durationColumns - firstValue);
    first.durationColumns = firstValue;
    second.durationColumns = secondValue;
    return { first, second };
  }

  first.durationBeats = 0.5;
  second.durationBeats = 0.5;
  return { first, second };
}

export function mergeMelodyEventDurations(current: MelodyEvent, next: MelodyEvent) {
  const merged = cloneMelodyEventsDraft([current])[0]!;
  if (
    typeof current.durationBeats === 'number' &&
    typeof next.durationBeats === 'number' &&
    Number.isFinite(current.durationBeats) &&
    Number.isFinite(next.durationBeats)
  ) {
    merged.durationBeats = current.durationBeats + next.durationBeats;
    return merged;
  }
  if (
    typeof current.durationCountSteps === 'number' &&
    typeof next.durationCountSteps === 'number' &&
    Number.isFinite(current.durationCountSteps) &&
    Number.isFinite(next.durationCountSteps)
  ) {
    merged.durationCountSteps = current.durationCountSteps + next.durationCountSteps;
    return merged;
  }
  if (
    typeof current.durationColumns === 'number' &&
    typeof next.durationColumns === 'number' &&
    Number.isFinite(current.durationColumns) &&
    Number.isFinite(next.durationColumns)
  ) {
    merged.durationColumns = current.durationColumns + next.durationColumns;
    return merged;
  }

  merged.durationBeats = getMelodyEventDurationMagnitude(current) + getMelodyEventDurationMagnitude(next);
  return merged;
}

export function updateSelectedMelodyTimelineEditingNotePosition(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  instrument: TimelineEditingInstrument,
  maxFret: number,
  stringName: string,
  fretValue: number
) {
  const selected = getSelectedMelodyTimelineEditingNote(session, selection);
  if (!selected || !session.draft || selection.eventIndex === null || selection.noteIndex === null) return;

  const fret = Math.max(0, Math.min(maxFret, Math.round(fretValue)));
  const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${stringName} fret ${fret} for the current instrument.`);
  }

  const event = session.draft[selection.eventIndex];
  const note = event?.notes[selection.noteIndex];
  if (!note) return;
  note.stringName = stringName;
  note.fret = fret;
  note.note = stripScientificOctave(noteWithOctave);
}

export function resolveEquivalentStringFretForTimelineNote(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  instrument: TimelineEditingInstrument,
  maxFret: number,
  targetStringName: string
) {
  const selected = getSelectedMelodyTimelineEditingNote(session, selection);
  if (!selected) return null;
  const sourceStringName = selected.note.stringName;
  const sourceFret = selected.note.fret;
  if (!sourceStringName || typeof sourceFret !== 'number' || !Number.isFinite(sourceFret)) {
    return null;
  }
  if (targetStringName === sourceStringName) {
    return sourceFret;
  }

  const noteWithOctave = instrument.getNoteWithOctave(sourceStringName, sourceFret);
  if (!noteWithOctave) return null;
  const targetMidi = parseScientificNoteToMidiValue(noteWithOctave);
  if (targetMidi === null) return null;

  for (let fret = 0; fret <= maxFret; fret += 1) {
    const candidate = instrument.getNoteWithOctave(targetStringName, fret);
    if (!candidate) continue;
    if (parseScientificNoteToMidiValue(candidate) === targetMidi) {
      return fret;
    }
  }
  return null;
}

export function moveSelectedMelodyTimelineEditingNoteToString(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  instrument: TimelineEditingInstrument,
  maxFret: number,
  targetStringName: string,
  options?: { commit?: boolean }
) {
  const selected = getSelectedMelodyTimelineEditingNote(session, selection);
  if (!selected || !session.draft || selection.eventIndex === null || selection.noteIndex === null) return;
  const sourceStringName = selected.note.stringName;
  if (!sourceStringName || sourceStringName === targetStringName) return;

  const selectedEvent = session.draft[selection.eventIndex];
  if (!selectedEvent) return;
  if (
    selectedEvent.notes.some((note, noteIndex) => noteIndex !== selection.noteIndex && note.stringName === targetStringName)
  ) {
    throw new Error(`Target string ${targetStringName} is already occupied in this event.`);
  }

  const targetFret = resolveEquivalentStringFretForTimelineNote(
    session,
    selection,
    instrument,
    maxFret,
    targetStringName
  );
  if (targetFret === null) {
    throw new Error(`Cannot place this note on string ${targetStringName} within the visible fret range.`);
  }

  if (options?.commit === false) return;
  updateSelectedMelodyTimelineEditingNotePosition(session, selection, instrument, maxFret, targetStringName, targetFret);
}

export function addMelodyTimelineEditingNote(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  instrument: TimelineEditingInstrument,
  options?: { preferredStringName?: string; preferredFret?: number }
) {
  if (!session.draft || selection.eventIndex === null) return;
  const selectedEvent = session.draft[selection.eventIndex];
  if (!selectedEvent) return;

  const usedStrings = new Set(selectedEvent.notes.map((note) => note.stringName).filter((value): value is string => !!value));
  const selected = getSelectedMelodyTimelineEditingNote(session, selection);
  const preferredFret =
    typeof options?.preferredFret === 'number' && Number.isFinite(options.preferredFret)
      ? options.preferredFret
      : selected && typeof selected.note.fret === 'number' && Number.isFinite(selected.note.fret)
        ? selected.note.fret
        : 0;
  const candidateStrings = [
    ...(options?.preferredStringName ? [options.preferredStringName] : []),
    ...(selected?.note.stringName ? [selected.note.stringName] : []),
    ...instrument.STRING_ORDER,
  ];
  const targetStringName = candidateStrings.find((stringName) => !usedStrings.has(stringName)) ?? instrument.STRING_ORDER[0] ?? null;
  if (!targetStringName) {
    throw new Error('Current instrument has no available strings.');
  }
  const noteWithOctave = instrument.getNoteWithOctave(targetStringName, preferredFret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${targetStringName} fret ${preferredFret} for the current instrument.`);
  }

  selectedEvent.notes.push({
    note: stripScientificOctave(noteWithOctave),
    stringName: targetStringName,
    fret: preferredFret,
  });
  selection.noteIndex = selectedEvent.notes.length - 1;
}

export function deleteSelectedMelodyTimelineEditingNote(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || selection.eventIndex === null || selection.noteIndex === null) return;

  const totalNotes = session.draft.reduce((sum, event) => sum + event.notes.length, 0);
  if (totalNotes <= 1) {
    throw new Error('A melody must contain at least one note.');
  }

  const event = session.draft[selection.eventIndex];
  if (!event) return;
  event.notes.splice(selection.noteIndex, 1);
  if (event.notes.length === 0) {
    session.draft.splice(selection.eventIndex, 1);
    if (session.draft.length === 0) {
      selection.eventIndex = null;
      selection.noteIndex = null;
      return;
    }
    selection.eventIndex = Math.max(0, Math.min(selection.eventIndex, session.draft.length - 1));
    selection.noteIndex = 0;
  }
}

export function createDefaultMelodyEventFromSelection(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  instrument: TimelineEditingInstrument
) {
  const selected = getSelectedMelodyTimelineEditingNote(session, selection);
  const selectedEvent = selection.eventIndex === null ? null : session.draft?.[selection.eventIndex] ?? null;
  const stringName = selected?.note.stringName ?? instrument.STRING_ORDER[0] ?? null;
  const fret =
    selected && typeof selected.note.fret === 'number' && Number.isFinite(selected.note.fret) ? selected.note.fret : 0;

  if (!stringName) {
    throw new Error('Current instrument has no available strings.');
  }

  const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${stringName} fret ${fret} for the current instrument.`);
  }

  const nextEvent: MelodyEvent = {
    notes: [
      {
        note: stripScientificOctave(noteWithOctave),
        stringName,
        fret,
      },
    ],
  };

  if (typeof selectedEvent?.durationBeats === 'number' && Number.isFinite(selectedEvent.durationBeats)) {
    nextEvent.durationBeats = selectedEvent.durationBeats;
  } else if (
    typeof selectedEvent?.durationCountSteps === 'number' &&
    Number.isFinite(selectedEvent.durationCountSteps)
  ) {
    nextEvent.durationCountSteps = selectedEvent.durationCountSteps;
  } else if (
    typeof selectedEvent?.durationColumns === 'number' &&
    Number.isFinite(selectedEvent.durationColumns)
  ) {
    nextEvent.durationColumns = selectedEvent.durationColumns;
  } else {
    nextEvent.durationBeats = 1;
  }

  if (typeof selectedEvent?.barIndex === 'number' && Number.isFinite(selectedEvent.barIndex)) {
    nextEvent.barIndex = selectedEvent.barIndex;
  }

  return nextEvent;
}

export function adjustSelectedMelodyTimelineEventDuration(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  direction: -1 | 1
) {
  if (!session.draft || selection.eventIndex === null) return;
  const event = session.draft[selection.eventIndex];
  if (!event) return;

  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats)) {
    const next = Math.max(0.25, Math.min(32, event.durationBeats + direction * 0.25));
    event.durationBeats = Math.round(next * 100) / 100;
    return;
  }
  if (typeof event.durationCountSteps === 'number' && Number.isFinite(event.durationCountSteps)) {
    event.durationCountSteps = Math.max(1, Math.min(64, event.durationCountSteps + direction));
    return;
  }
  if (typeof event.durationColumns === 'number' && Number.isFinite(event.durationColumns)) {
    event.durationColumns = Math.max(1, Math.min(64, event.durationColumns + direction));
    return;
  }

  event.durationBeats = direction > 0 ? 1.25 : 0.25;
}

export function addMelodyTimelineEditingEventAfterSelection(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  instrument: TimelineEditingInstrument
) {
  if (!session.draft || selection.eventIndex === null) return;
  const insertIndex = Math.max(0, Math.min(session.draft.length, selection.eventIndex + 1));
  session.draft.splice(insertIndex, 0, createDefaultMelodyEventFromSelection(session, selection, instrument));
  selection.eventIndex = insertIndex;
  selection.noteIndex = 0;
}

export function duplicateSelectedMelodyTimelineEvent(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || selection.eventIndex === null) return;
  const sourceEvent = session.draft[selection.eventIndex];
  if (!sourceEvent || sourceEvent.notes.length === 0) return;

  const clone = cloneMelodyEventsDraft([sourceEvent])[0]!;
  const insertIndex = selection.eventIndex + 1;
  session.draft.splice(insertIndex, 0, clone);
  selection.eventIndex = insertIndex;
  selection.noteIndex = Math.min(selection.noteIndex ?? 0, Math.max(0, clone.notes.length - 1));
}

export function moveSelectedMelodyTimelineEvent(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  direction: -1 | 1
) {
  if (!session.draft || selection.eventIndex === null) return;
  const sourceIndex = selection.eventIndex;
  const targetIndex = sourceIndex + direction;
  if (targetIndex < 0 || targetIndex >= session.draft.length) return;

  const [movedEvent] = session.draft.splice(sourceIndex, 1);
  if (!movedEvent) return;
  session.draft.splice(targetIndex, 0, movedEvent);
  selection.eventIndex = targetIndex;
  selection.noteIndex = Math.min(selection.noteIndex ?? 0, Math.max(0, movedEvent.notes.length - 1));
}

export function moveSelectedMelodyTimelineEventToIndex(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection,
  targetIndex: number
) {
  if (!session.draft || selection.eventIndex === null) return;
  const sourceIndex = selection.eventIndex;
  const normalizedTargetIndex = Math.max(0, Math.min(session.draft.length - 1, Math.round(targetIndex)));
  if (normalizedTargetIndex === sourceIndex) return;

  const [movedEvent] = session.draft.splice(sourceIndex, 1);
  if (!movedEvent) return;
  session.draft.splice(normalizedTargetIndex, 0, movedEvent);
  selection.eventIndex = normalizedTargetIndex;
  selection.noteIndex = Math.min(selection.noteIndex ?? 0, Math.max(0, movedEvent.notes.length - 1));
}

export function deleteSelectedMelodyTimelineEvent(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || selection.eventIndex === null) return;
  if (session.draft.length <= 1) {
    throw new Error('A melody must contain at least one event.');
  }

  session.draft.splice(selection.eventIndex, 1);
  if (session.draft.length === 0) {
    selection.eventIndex = null;
    selection.noteIndex = null;
    return;
  }
  selection.eventIndex = Math.max(0, Math.min(selection.eventIndex, session.draft.length - 1));
  selection.noteIndex = 0;
}

export function splitSelectedMelodyTimelineEvent(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || selection.eventIndex === null) return;
  const sourceEvent = session.draft[selection.eventIndex];
  if (!sourceEvent || !canSplitMelodyEvent(sourceEvent)) {
    throw new Error('Selected event is too short to split.');
  }

  const { first, second } = splitMelodyEventDuration(sourceEvent);
  session.draft.splice(selection.eventIndex, 1, first, second);
  selection.noteIndex = Math.min(selection.noteIndex ?? 0, Math.max(0, first.notes.length - 1));
}

export function mergeSelectedMelodyTimelineEventWithNext(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || selection.eventIndex === null) return;
  if (!canMergeMelodyEventWithNext(session.draft, selection.eventIndex)) {
    throw new Error('Only neighboring events with the same notes can be merged.');
  }

  const current = session.draft[selection.eventIndex];
  const next = session.draft[selection.eventIndex + 1];
  if (!current || !next) return;
  session.draft.splice(selection.eventIndex, 2, mergeMelodyEventDurations(current, next));
  selection.noteIndex = Math.min(selection.noteIndex ?? 0, Math.max(0, session.draft[selection.eventIndex]!.notes.length - 1));
}

export function undoMelodyTimelineEditingMutation(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.draft || session.history.length === 0) return false;
  session.future.push(cloneMelodyEventsDraft(session.draft));
  const previous = session.history.pop();
  if (!previous) return false;
  session.draft = cloneMelodyEventsDraft(previous);
  ensureMelodyTimelineEditingSelection(session, selection);
  return true;
}

export function redoMelodyTimelineEditingMutation(
  session: MelodyTimelineEditingSession,
  selection: MelodyTimelineEditingSelection
) {
  if (!session.future.length) return false;
  if (session.draft) {
    session.history.push(cloneMelodyEventsDraft(session.draft));
  }
  const next = session.future.pop();
  if (!next) return false;
  session.draft = cloneMelodyEventsDraft(next);
  ensureMelodyTimelineEditingSelection(session, selection);
  return true;
}

function toNoteSignature(note: MelodyEventNote) {
  return `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`;
}

function parseScientificNoteToMidiValue(noteWithOctave: string) {
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
