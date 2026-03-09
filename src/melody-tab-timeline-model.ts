import type { MelodyDefinition } from './melody-library';
import { buildMelodyFingeredEvents } from './melody-fingering';
import { getPlayableMelodyEventNotes } from './melody-playable-event-notes';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from './melody-fingering';
import { normalizeMelodyStudyRange, type MelodyStudyRange } from './melody-study-range';
import type {
  PerformanceTimelineAttempt,
  PerformanceTimelineAttemptStatus,
  PerformanceTimelineFeedbackByEvent,
} from './performance-timeline-feedback';

export interface TimelineNoteChip {
  note: string;
  stringName: string;
  fret: number;
  finger: number;
  noteIndex: number;
  performanceStatus: PerformanceTimelineAttemptStatus | null;
}

export interface TimelineCell {
  eventIndex: number;
  isActive: boolean;
  isInStudyRange: boolean;
  isStudyRangeStart: boolean;
  isStudyRangeEnd: boolean;
  notes: TimelineNoteChip[];
  playedNotes: PerformanceTimelineAttempt[];
  unmatchedPlayedNotes: PerformanceTimelineAttempt[];
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
  studyRange?: MelodyStudyRange | null,
  performanceFeedbackByEvent?: PerformanceTimelineFeedbackByEvent | null,
  fingeringStrategy: MelodyFingeringStrategy = 'minimax',
  fingeringLevel: MelodyFingeringLevel = 'beginner'
): MelodyTabTimelineViewModel {
  const fingeredEvents = buildMelodyFingeredEvents(melody.events, {
    strategy: fingeringStrategy,
    level: fingeringLevel,
  });
  const clampedActive = clampEventIndex(activeEventIndex, fingeredEvents.length);
  const normalizedStudyRange =
    fingeredEvents.length > 0 ? normalizeMelodyStudyRange(studyRange, fingeredEvents.length) : null;

  const rows = stringOrder.map((stringName) => {
    const cells = fingeredEvents.map((eventNotes, eventIndex) => {
      const event = melody.events[eventIndex];
      const playedNotes = (performanceFeedbackByEvent?.[eventIndex] ?? []).filter(
        (attempt) => attempt.stringName === stringName && typeof attempt.fret === 'number'
      );
      const matchedPlayedNoteIndexes = new Set<number>();
      const playableNotes = getPlayableMelodyEventNotes(event, eventNotes);
      const notes = playableNotes
        .filter((note) => note.string === stringName && typeof note.fret === 'number')
        .map((note, noteIndex) => {
          const sourceNoteIndex =
            event?.notes.findIndex(
              (candidate) =>
                candidate.note === note.note &&
                candidate.stringName === note.string &&
                candidate.fret === note.fret
            ) ?? -1;
          const correctAttemptIndex = playedNotes.findIndex(
            (attempt, attemptIndex) =>
              !matchedPlayedNoteIndexes.has(attemptIndex) &&
              attempt.status === 'correct' &&
              attempt.fret === note.fret
          );
          const wrongAttemptIndex =
            correctAttemptIndex >= 0
              ? -1
              : playedNotes.findIndex(
                  (attempt, attemptIndex) =>
                    !matchedPlayedNoteIndexes.has(attemptIndex) &&
                    attempt.status === 'wrong' &&
                    attempt.fret === note.fret
                );
          const missedAttemptIndex =
            correctAttemptIndex >= 0 || wrongAttemptIndex >= 0
              ? -1
              : playedNotes.findIndex(
                  (attempt, attemptIndex) =>
                    !matchedPlayedNoteIndexes.has(attemptIndex) &&
                    attempt.status === 'missed' &&
                    attempt.fret === note.fret
                );
          const matchedAttemptIndex =
            correctAttemptIndex >= 0
              ? correctAttemptIndex
              : wrongAttemptIndex >= 0
                ? wrongAttemptIndex
                : missedAttemptIndex;
          const performanceStatus =
            matchedAttemptIndex >= 0 ? playedNotes[matchedAttemptIndex]?.status ?? null : null;
          if (matchedAttemptIndex >= 0) {
            matchedPlayedNoteIndexes.add(matchedAttemptIndex);
          }
          return {
            note: note.note,
            stringName,
            fret: note.fret,
            finger: typeof note.finger === 'number' ? note.finger : 0,
            noteIndex: sourceNoteIndex >= 0 ? sourceNoteIndex : noteIndex,
            performanceStatus,
          };
        })
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
        playedNotes,
        unmatchedPlayedNotes: playedNotes.filter((_, attemptIndex) => !matchedPlayedNoteIndexes.has(attemptIndex)),
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

