import type { MelodyDefinition } from './melody-library';
import { getMelodyEventPlaybackDurationExactMs } from './melody-timeline-duration';
import { buildMelodyFingeredEvents } from './melody-fingering';
import type {
  PerformanceTimelineAttemptStatus,
  PerformanceTimelineFeedbackByEvent,
} from './performance-timeline-feedback';

export interface ScrollingTabPanelNote {
  noteIndex: number;
  stringIndex: number;
  stringName: string;
  fret: number;
  note: string;
  finger: number;
  performanceStatus: PerformanceTimelineAttemptStatus | null;
}

export interface ScrollingTabPanelEvent {
  index: number;
  barIndex: number | null;
  startTimeSec: number;
  durationSec: number;
  notes: ScrollingTabPanelNote[];
  isChord: boolean;
}

export interface ScrollingTabPanelBarMarker {
  barIndex: number;
  label: string;
  startTimeSec: number;
}

export interface ScrollingTabPanelModel {
  stringCount: number;
  stringNames: string[];
  events: ScrollingTabPanelEvent[];
  barMarkers: ScrollingTabPanelBarMarker[];
  totalDurationSec: number;
  currentTimeSec: number;
  activeEventIndex: number | null;
  minDurationSec: number;
  leadInSec: number;
}

export interface ScrollingTabPanelModelInput {
  melody: MelodyDefinition;
  stringOrder: string[];
  bpm: number;
  studyRange: { startIndex: number; endIndex: number };
  activeEventIndex: number | null;
  leadInSec?: number;
  currentTimeSec?: number | null;
  performanceFeedbackByEvent?: PerformanceTimelineFeedbackByEvent | null;
}

const DEFAULT_LEAD_IN_SEC = 1.4;

function clampIndex(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function buildScrollingTabPanelModel(
  input: ScrollingTabPanelModelInput
): ScrollingTabPanelModel {
  const eventCount = input.melody.events.length;
  if (eventCount === 0) {
    return {
      stringCount: input.stringOrder.length,
      stringNames: [...input.stringOrder],
      events: [],
      barMarkers: [],
      totalDurationSec: 0,
      currentTimeSec: 0,
      activeEventIndex: null,
      minDurationSec: 0.35,
      leadInSec: input.leadInSec ?? DEFAULT_LEAD_IN_SEC,
    };
  }

  const rangeStart = clampIndex(input.studyRange.startIndex, 0, eventCount - 1);
  const rangeEnd = clampIndex(input.studyRange.endIndex, rangeStart, eventCount - 1);
  const leadInSec = input.leadInSec ?? DEFAULT_LEAD_IN_SEC;
  const stringIndexByName = new Map(input.stringOrder.map((stringName, index) => [stringName, index]));

  const events: ScrollingTabPanelEvent[] = [];
  const barMarkers: ScrollingTabPanelBarMarker[] = [];
  const seenBarIndexes = new Set<number>();
  const fingeredEvents = buildMelodyFingeredEvents(input.melody.events);
  let cursorSec = leadInSec;

  for (let index = rangeStart; index <= rangeEnd; index += 1) {
    const melodyEvent = input.melody.events[index];
    const durationSec =
      getMelodyEventPlaybackDurationExactMs(melodyEvent, input.bpm, input.melody) / 1000;
    const playedNotes = input.performanceFeedbackByEvent?.[index] ?? [];
    const matchedPlayedNoteIndexes = new Set<number>();
    const notes = melodyEvent.notes
      .filter(
        (note): note is { note: string; stringName: string; fret: number } =>
          typeof note.stringName === 'string' && typeof note.fret === 'number'
      )
      .map((note, noteIndex) => {
        const fingeredNote = (fingeredEvents[index] ?? []).find(
          (candidate) => candidate.string === note.stringName && candidate.fret === note.fret
        );
        const matchingCorrectAttempt = playedNotes.findIndex(
          (attempt, attemptIndex) =>
            !matchedPlayedNoteIndexes.has(attemptIndex) &&
            attempt.status === 'correct' &&
            attempt.stringName === note.stringName &&
            attempt.fret === note.fret
        );
        const matchingWrongAttempt =
          matchingCorrectAttempt >= 0
            ? -1
            : playedNotes.findIndex(
                (attempt, attemptIndex) =>
                  !matchedPlayedNoteIndexes.has(attemptIndex) &&
                  attempt.status === 'wrong' &&
                  attempt.stringName === note.stringName &&
                  attempt.fret === note.fret
              );
        const matchingMissedAttempt =
          matchingCorrectAttempt >= 0 || matchingWrongAttempt >= 0
            ? -1
            : playedNotes.findIndex(
                (attempt, attemptIndex) =>
                  !matchedPlayedNoteIndexes.has(attemptIndex) &&
                  attempt.status === 'missed' &&
                  attempt.stringName === note.stringName &&
                  attempt.fret === note.fret
              );
        const matchedAttemptIndex =
          matchingCorrectAttempt >= 0
            ? matchingCorrectAttempt
            : matchingWrongAttempt >= 0
              ? matchingWrongAttempt
              : matchingMissedAttempt;
        const performanceStatus =
          matchedAttemptIndex >= 0 ? playedNotes[matchedAttemptIndex]?.status ?? null : null;
        if (matchedAttemptIndex >= 0) {
          matchedPlayedNoteIndexes.add(matchedAttemptIndex);
        }
        return {
          noteIndex,
          stringIndex: stringIndexByName.get(note.stringName) ?? 0,
          stringName: note.stringName,
          fret: note.fret,
          note: note.note,
          finger: typeof fingeredNote?.finger === 'number' ? fingeredNote.finger : 0,
          performanceStatus,
        };
      })
      .sort((a, b) => a.stringIndex - b.stringIndex);
    const barIndex =
      typeof melodyEvent.barIndex === 'number' && Number.isFinite(melodyEvent.barIndex)
        ? Math.max(0, Math.round(melodyEvent.barIndex))
        : null;

    if (barIndex !== null && !seenBarIndexes.has(barIndex)) {
      seenBarIndexes.add(barIndex);
      barMarkers.push({
        barIndex,
        label: `Bar ${barIndex + 1}`,
        startTimeSec: cursorSec,
      });
    }

    events.push({
      index,
      barIndex,
      startTimeSec: cursorSec,
      durationSec,
      notes,
      isChord: notes.length > 1,
    });

    cursorSec += durationSec;
  }

  const activeEventIndex =
    typeof input.activeEventIndex === 'number' &&
    input.activeEventIndex >= rangeStart &&
    input.activeEventIndex <= rangeEnd
      ? input.activeEventIndex
      : null;
  const activeEvent = activeEventIndex === null
    ? null
    : events.find((event) => event.index === activeEventIndex) ?? null;
  const minDurationSec = Math.min(...events.map((event) => event.durationSec).filter(Boolean), 0.35);

  return {
    stringCount: input.stringOrder.length,
    stringNames: [...input.stringOrder],
    events,
    barMarkers,
    totalDurationSec: cursorSec + leadInSec,
    currentTimeSec:
      typeof input.currentTimeSec === 'number'
        ? Math.max(0, input.currentTimeSec)
        : activeEvent?.startTimeSec ?? 0,
    activeEventIndex,
    minDurationSec,
    leadInSec,
  };
}
