import type { MelodyDefinition, MelodyEvent } from './melody-library';
import { buildMelodyFingeredEvents } from './melody-fingering';
import { normalizeMelodyStudyRange, type MelodyStudyRange } from './melody-study-range';

export interface TimelineNoteChip {
  note: string;
  stringName: string;
  fret: number;
  finger: number;
  noteIndex: number;
}

export interface TimelineCell {
  eventIndex: number;
  isActive: boolean;
  isInStudyRange: boolean;
  isStudyRangeStart: boolean;
  isStudyRangeEnd: boolean;
  notes: TimelineNoteChip[];
}

export interface TimelineRow {
  stringName: string;
  cells: TimelineCell[];
}

export interface MelodyTabTimelineViewModel {
  rows: TimelineRow[];
  totalEvents: number;
  activeEventIndex: number | null;
}

function clampEventIndex(value: number | null | undefined, totalEvents: number) {
  if (!Number.isFinite(value)) return null;
  if (totalEvents <= 0) return null;
  const rounded = Math.round(Number(value));
  return Math.max(0, Math.min(totalEvents - 1, rounded));
}

export function buildMelodyTabTimelineViewModel(
  melody: Pick<MelodyDefinition, 'events'>,
  stringOrder: string[],
  activeEventIndex: number | null,
  studyRange?: MelodyStudyRange | null
): MelodyTabTimelineViewModel {
  const fingeredEvents = buildMelodyFingeredEvents(melody.events);
  const clampedActive = clampEventIndex(activeEventIndex, fingeredEvents.length);
  const normalizedStudyRange =
    fingeredEvents.length > 0 ? normalizeMelodyStudyRange(studyRange, fingeredEvents.length) : null;

  const rows = stringOrder.map((stringName) => {
    const cells = fingeredEvents.map((eventNotes, eventIndex) => {
      const event = melody.events[eventIndex];
      const notes = (event?.notes ?? [])
        .map((note, noteIndex) => {
          if (note.stringName !== stringName || typeof note.fret !== 'number') return null;
          const playableIndex = event.notes
            .slice(0, noteIndex + 1)
            .filter(
              (candidate): candidate is MelodyEvent['notes'][number] & { stringName: string; fret: number } =>
                candidate.stringName !== null && typeof candidate.fret === 'number'
            ).length - 1;
          const fingered = eventNotes[playableIndex];
          return {
            note: note.note,
            stringName,
            fret: note.fret,
            finger: typeof fingered?.finger === 'number' ? fingered.finger : 0,
            noteIndex,
          };
        })
        .filter((note): note is TimelineNoteChip => note !== null)
        .sort((a, b) => a.fret - b.fret || a.note.localeCompare(b.note));
      return {
        eventIndex,
        isActive: clampedActive === eventIndex,
        isInStudyRange:
          normalizedStudyRange !== null &&
          eventIndex >= normalizedStudyRange.startIndex &&
          eventIndex <= normalizedStudyRange.endIndex,
        isStudyRangeStart: normalizedStudyRange?.startIndex === eventIndex,
        isStudyRangeEnd: normalizedStudyRange?.endIndex === eventIndex,
        notes,
      };
    });
    return {
      stringName,
      cells,
    };
  });

  return {
    rows,
    totalEvents: melody.events.length,
    activeEventIndex: clampedActive,
  };
}
