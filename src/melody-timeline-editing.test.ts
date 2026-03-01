import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import type { MelodyEvent } from './melody-library';
import {
  addMelodyTimelineEditingEventAfterSelection,
  addMelodyTimelineEditingNote,
  canMergeMelodyEventWithNext,
  canSplitMelodyEvent,
  deleteSelectedMelodyTimelineEditingNote,
  duplicateSelectedMelodyTimelineEvent,
  ensureMelodyTimelineEditingDraftLoaded,
  ensureMelodyTimelineEditingSelection,
  mergeSelectedMelodyTimelineEventWithNext,
  moveSelectedMelodyTimelineEditingNoteToString,
  moveSelectedMelodyTimelineEvent,
  pushMelodyTimelineEditingHistory,
  redoMelodyTimelineEditingMutation,
  splitSelectedMelodyTimelineEvent,
  type MelodyTimelineEditingSelection,
  type MelodyTimelineEditingSession,
  undoMelodyTimelineEditingMutation,
  updateSelectedMelodyTimelineEditingNotePosition,
} from './melody-timeline-editing';

function createSession(): MelodyTimelineEditingSession {
  return {
    melodyId: null,
    draft: null,
    history: [],
    future: [],
  };
}

function createSelection(
  eventIndex: number | null = null,
  noteIndex: number | null = null
): MelodyTimelineEditingSelection {
  return { eventIndex, noteIndex };
}

describe('melody-timeline-editing', () => {
  it('loads a draft and normalizes selection to the first playable note', () => {
    const events: MelodyEvent[] = [
      { durationBeats: 1, notes: [] },
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
    ];
    const session = createSession();
    const selection = createSelection(99, 99);

    ensureMelodyTimelineEditingDraftLoaded(session, 'melody:test', events);
    ensureMelodyTimelineEditingSelection(session, selection);

    expect(session.melodyId).toBe('melody:test');
    expect(selection).toEqual({ eventIndex: 1, noteIndex: 0 });
    expect(session.draft).not.toBe(events);
    expect(session.draft?.[1]).not.toBe(events[1]);
  });

  it('moves a selected note to another string while preserving pitch', () => {
    const events: MelodyEvent[] = [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }];
    const session = createSession();
    const selection = createSelection(0, 0);

    ensureMelodyTimelineEditingDraftLoaded(session, 'melody:test', events);
    moveSelectedMelodyTimelineEditingNoteToString(
      session,
      selection,
      instruments.guitar,
      24,
      'E'
    );

    expect(session.draft?.[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'E',
      fret: 8,
    });
  });

  it('adds, duplicates, moves, splits and merges events', () => {
    const events: MelodyEvent[] = [
      { durationBeats: 2, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 1, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
    ];
    const session = createSession();
    const selection = createSelection(0, 0);

    ensureMelodyTimelineEditingDraftLoaded(session, 'melody:test', events);

    addMelodyTimelineEditingEventAfterSelection(session, selection, instruments.guitar);
    expect(session.draft).toHaveLength(3);
    expect(selection).toEqual({ eventIndex: 1, noteIndex: 0 });

    duplicateSelectedMelodyTimelineEvent(session, selection);
    expect(session.draft).toHaveLength(4);
    expect(selection.eventIndex).toBe(2);

    moveSelectedMelodyTimelineEvent(session, selection, 1);
    expect(selection.eventIndex).toBe(3);

    selection.eventIndex = 0;
    selection.noteIndex = 0;
    expect(canSplitMelodyEvent(session.draft?.[0])).toBe(true);
    splitSelectedMelodyTimelineEvent(session, selection);
    expect(session.draft).toHaveLength(5);
    expect(session.draft?.[0]?.durationBeats).toBe(1);
    expect(session.draft?.[1]?.durationBeats).toBe(1);
    expect(canMergeMelodyEventWithNext(session.draft ?? null, 0)).toBe(true);

    mergeSelectedMelodyTimelineEventWithNext(session, selection);
    expect(session.draft).toHaveLength(4);
    expect(session.draft?.[0]?.durationBeats).toBe(2);
  });

  it('tracks history and restores state through undo and redo', () => {
    const events: MelodyEvent[] = [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }];
    const session = createSession();
    const selection = createSelection(0, 0);

    ensureMelodyTimelineEditingDraftLoaded(session, 'melody:test', events);
    pushMelodyTimelineEditingHistory(session);
    updateSelectedMelodyTimelineEditingNotePosition(session, selection, instruments.guitar, 24, 'E', 8);

    expect(session.draft?.[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'E',
      fret: 8,
    });

    const undone = undoMelodyTimelineEditingMutation(session, selection);
    expect(undone).toBe(true);
    expect(session.draft?.[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'A',
      fret: 3,
    });

    const redone = redoMelodyTimelineEditingMutation(session, selection);
    expect(redone).toBe(true);
    expect(session.draft?.[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'E',
      fret: 8,
    });
  });

  it('adds and deletes notes while enforcing at least one note in the melody', () => {
    const events: MelodyEvent[] = [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }];
    const session = createSession();
    const selection = createSelection(0, 0);

    ensureMelodyTimelineEditingDraftLoaded(session, 'melody:test', events);

    addMelodyTimelineEditingNote(session, selection, instruments.guitar);
    expect(session.draft?.[0]?.notes).toHaveLength(2);
    expect(selection.noteIndex).toBe(1);

    deleteSelectedMelodyTimelineEditingNote(session, selection);
    expect(session.draft?.[0]?.notes).toHaveLength(1);

    expect(() => deleteSelectedMelodyTimelineEditingNote(session, createSelection(0, 0))).toThrow(
      'A melody must contain at least one note.'
    );
  });

  it('removes the whole event when deleting its last note', () => {
    const events: MelodyEvent[] = [
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 2, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
    ];
    const session = createSession();
    const selection = createSelection(0, 0);

    ensureMelodyTimelineEditingDraftLoaded(session, 'melody:test', events);
    deleteSelectedMelodyTimelineEditingNote(session, selection);

    expect(session.draft).toHaveLength(1);
    expect(session.draft?.[0]?.notes[0]).toEqual({
      note: 'D',
      stringName: 'A',
      fret: 5,
    });
    expect(selection).toEqual({ eventIndex: 0, noteIndex: 0 });
  });
});
