import type {
  PerformanceTimelineAttempt,
  PerformanceTimelineFeedbackByEvent,
  PerformanceTimelineAttemptStatus,
} from './performance-timeline-feedback';
import type { SessionStats } from './types';

export interface PerformanceSessionNoteLogNote {
  note: string;
  stringName: string | null;
  fret: number | null;
}

export interface PerformanceSessionNoteLogEntry {
  eventIndex: number;
  eventNumber: number;
  finalStatus: PerformanceTimelineAttemptStatus | 'unknown';
  expectedNotes: PerformanceSessionNoteLogNote[];
  attempts: PerformanceTimelineAttempt[];
}

export interface PerformanceSessionNoteLogSnapshot {
  schemaVersion: 1;
  generatedAtIso: string;
  session: {
    modeKey: string;
    modeLabel: string;
    startedAtMs: number;
    endedAtMs: number | null;
    instrumentName: string;
    inputSource: 'microphone' | 'midi';
    inputDeviceLabel: string;
  };
  totals: {
    totalAttempts: number;
    correctAttempts: number;
    wrongAttempts: number;
    missedNoInputAttempts: number;
    accuracyPercent: number;
  };
  feedbackKey: string | null;
  entries: PerformanceSessionNoteLogEntry[];
}

function toComparableNoteKey(note: PerformanceSessionNoteLogNote) {
  return `${note.note}|${note.stringName ?? ''}|${note.fret ?? ''}`;
}

function cloneAttempt(attempt: PerformanceTimelineAttempt): PerformanceTimelineAttempt {
  return {
    note: attempt.note,
    stringName: attempt.stringName ?? null,
    fret: typeof attempt.fret === 'number' ? attempt.fret : null,
    status: attempt.status,
  };
}

function resolveExpectedNotes(attempts: PerformanceTimelineAttempt[]) {
  const expected = attempts
    .filter((attempt) => attempt.status === 'correct' || attempt.status === 'missed')
    .map((attempt) => ({
      note: attempt.note,
      stringName: attempt.stringName ?? null,
      fret: typeof attempt.fret === 'number' ? attempt.fret : null,
    }));

  const uniqueExpected = new Map<string, PerformanceSessionNoteLogNote>();
  expected.forEach((note) => {
    uniqueExpected.set(toComparableNoteKey(note), note);
  });
  return [...uniqueExpected.values()];
}

function resolveFinalStatus(attempts: PerformanceTimelineAttempt[]): PerformanceTimelineAttemptStatus | 'unknown' {
  if (attempts.some((attempt) => attempt.status === 'correct')) return 'correct';
  if (attempts.some((attempt) => attempt.status === 'wrong')) return 'wrong';
  if (attempts.some((attempt) => attempt.status === 'missed')) return 'missed';
  return 'unknown';
}

export function buildPerformanceSessionNoteLogSnapshot(input: {
  sessionStats: SessionStats;
  feedbackKey: string | null;
  feedbackByEvent: PerformanceTimelineFeedbackByEvent;
  generatedAtMs?: number;
}): PerformanceSessionNoteLogSnapshot {
  const generatedAtMs = Number.isFinite(input.generatedAtMs) ? Math.round(input.generatedAtMs ?? 0) : Date.now();
  const sessionStats = input.sessionStats;
  const totalAttempts = Math.max(0, sessionStats.totalAttempts);
  const correctAttempts = Math.max(0, sessionStats.correctAttempts);
  const accuracyPercent =
    totalAttempts > 0 ? Math.max(0, Math.min(100, (correctAttempts / totalAttempts) * 100)) : 0;
  const eventIndexes = Object.keys(input.feedbackByEvent)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 0)
    .sort((a, b) => a - b);

  const entries: PerformanceSessionNoteLogEntry[] = eventIndexes.map((eventIndex) => {
    const attempts = (input.feedbackByEvent[eventIndex] ?? []).map(cloneAttempt);
    return {
      eventIndex,
      eventNumber: eventIndex + 1,
      finalStatus: resolveFinalStatus(attempts),
      expectedNotes: resolveExpectedNotes(attempts),
      attempts,
    };
  });

  return {
    schemaVersion: 1,
    generatedAtIso: new Date(generatedAtMs).toISOString(),
    session: {
      modeKey: sessionStats.modeKey,
      modeLabel: sessionStats.modeLabel,
      startedAtMs: sessionStats.startedAtMs,
      endedAtMs: sessionStats.endedAtMs ?? null,
      instrumentName: sessionStats.instrumentName,
      inputSource: sessionStats.inputSource === 'midi' ? 'midi' : 'microphone',
      inputDeviceLabel: sessionStats.inputDeviceLabel ?? '',
    },
    totals: {
      totalAttempts,
      correctAttempts,
      wrongAttempts: Math.max(0, sessionStats.performanceWrongAttempts ?? 0),
      missedNoInputAttempts: Math.max(0, sessionStats.performanceMissedNoInputAttempts ?? 0),
      accuracyPercent,
    },
    feedbackKey: input.feedbackKey,
    entries,
  };
}

export function formatPerformanceSessionNoteLogFileName(
  snapshot: PerformanceSessionNoteLogSnapshot,
  exportedAtMs = Date.now()
) {
  const safeDate = new Date(exportedAtMs).toISOString().replace(/[:.]/g, '-');
  const sourceName = snapshot.session.modeKey || 'session';
  return `fretflow-${sourceName}-note-log-${safeDate}.json`;
}
