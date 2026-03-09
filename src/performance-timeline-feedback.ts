import type { Prompt } from './types';

export type PerformanceTimelineAttemptStatus = 'correct' | 'wrong' | 'missed';

export interface PerformanceTimelineAttempt {
  note: string;
  stringName: string | null;
  fret: number | null;
  status: PerformanceTimelineAttemptStatus;
}

export type PerformanceTimelineFeedbackByEvent = Record<number, PerformanceTimelineAttempt[]>;

export function buildPerformanceTimelineFeedbackKey(input: {
  melodyId: string | null;
  instrumentName: string;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
}) {
  if (!input.melodyId) return null;
  return [
    input.melodyId,
    input.instrumentName,
    Math.round(input.melodyTransposeSemitones),
    Math.round(input.melodyStringShift),
  ].join('|');
}

export function clearPerformanceTimelineFeedbackState(state: {
  performanceTimelineFeedbackKey: string | null;
  performanceTimelineFeedbackByEvent: PerformanceTimelineFeedbackByEvent;
}) {
  state.performanceTimelineFeedbackKey = null;
  state.performanceTimelineFeedbackByEvent = {};
}

export function appendPerformanceTimelineAttempts(
  feedbackByEvent: PerformanceTimelineFeedbackByEvent,
  eventIndex: number,
  attempts: PerformanceTimelineAttempt[]
) {
  if (!Number.isInteger(eventIndex) || eventIndex < 0) return;
  const nextAttempts = attempts.filter(
    (attempt) => typeof attempt.note === 'string' && attempt.note.trim().length > 0
  );
  if (nextAttempts.length === 0) return;
  const bucket = feedbackByEvent[eventIndex] ?? [];
  nextAttempts.forEach((attempt) => {
    const normalized = {
      note: attempt.note,
      stringName: attempt.stringName ?? null,
      fret: typeof attempt.fret === 'number' ? attempt.fret : null,
      status: attempt.status,
    };
    const lastAttempt = bucket[bucket.length - 1];
    if (
      lastAttempt &&
      lastAttempt.note === normalized.note &&
      lastAttempt.stringName === normalized.stringName &&
      lastAttempt.fret === normalized.fret &&
      lastAttempt.status === normalized.status
    ) {
      return;
    }
    bucket.push(normalized);
  });
  feedbackByEvent[eventIndex] = bucket;
}

export function buildPerformanceTimelineSuccessAttempts(prompt: Prompt): PerformanceTimelineAttempt[] {
  return buildPositionedTimelineAttempts(prompt, 'correct');
}

export function buildPerformanceTimelineWrongAttempt(input: {
  note: string;
  stringName?: string | null;
  fret?: number | null;
}): PerformanceTimelineAttempt[] {
  if (!input.note.trim()) return [];
  return [
    {
      note: input.note,
      stringName: input.stringName ?? null,
      fret: typeof input.fret === 'number' ? input.fret : null,
      status: 'wrong',
    },
  ];
}

export function buildPerformanceTimelineMissedAttempts(prompt: Prompt): PerformanceTimelineAttempt[] {
  return buildPositionedTimelineAttempts(prompt, 'missed');
}

export function buildPerformanceTimelineWrongAttempts(
  prompt: Prompt | null | undefined,
  fallback?: {
    note: string;
    stringName?: string | null;
    fret?: number | null;
  }
): PerformanceTimelineAttempt[] {
  const positionedAttempts = prompt ? buildPositionedTimelineAttempts(prompt, 'wrong') : [];
  if (positionedAttempts.length > 0) {
    return positionedAttempts;
  }
  return fallback ? buildPerformanceTimelineWrongAttempt(fallback) : [];
}

function buildPositionedTimelineAttempts(
  prompt: Prompt,
  status: PerformanceTimelineAttemptStatus
): PerformanceTimelineAttempt[] {
  const melodyNotes =
    prompt.targetMelodyEventNotes?.length && prompt.targetMelodyEventNotes.length > 0
      ? prompt.targetMelodyEventNotes
      : prompt.targetChordFingering;

  return melodyNotes
    .filter(
      (note): note is typeof note & { string: string; fret: number } =>
        typeof note.string === 'string' && typeof note.fret === 'number'
    )
    .map((note) => ({
      note: note.note,
      stringName: note.string,
      fret: note.fret,
      status,
    }));
}
