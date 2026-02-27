import type { MelodyDefinition } from './melody-library';
import { buildMelodyFingeredEvents } from './melody-fingering';

export interface TimelineNoteChip {
  note: string;
  fret: number;
  finger: number;
}

export interface TimelineCell {
  eventIndex: number;
  isActive: boolean;
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
  activeEventIndex: number | null
): MelodyTabTimelineViewModel {
  const fingeredEvents = buildMelodyFingeredEvents(melody.events);
  const clampedActive = clampEventIndex(activeEventIndex, fingeredEvents.length);

  const rows = stringOrder.map((stringName) => {
    const cells = fingeredEvents.map((eventNotes, eventIndex) => {
      const notes = eventNotes
        .filter((note) => note.string === stringName)
        .map((note) => ({
          note: note.note,
          fret: note.fret,
          finger: typeof note.finger === 'number' ? note.finger : 0,
        }))
        .sort((a, b) => a.fret - b.fret || a.note.localeCompare(b.note));
      return {
        eventIndex,
        isActive: clampedActive === eventIndex,
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
