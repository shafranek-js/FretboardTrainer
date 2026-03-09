import type { MelodyDefinition } from './melody-library';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from './melody-fingering';
import { buildMelodyContentSignature } from './melody-tab-timeline-metadata';
import type { PerformanceTimelineFeedbackByEvent } from './performance-timeline-feedback';

export function getPerformanceFeedbackSignature(
  feedbackByEvent: PerformanceTimelineFeedbackByEvent | null | undefined
) {
  if (!feedbackByEvent) return '';
  return Object.entries(feedbackByEvent)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([eventIndex, attempts]) =>
      `${eventIndex}:${attempts
        .map((attempt) => `${attempt.status}:${attempt.note}:${attempt.stringName ?? '-'}:${attempt.fret ?? '-'}`)
        .join(',')}`
    )
    .join('|');
}

export function buildScrollingTabPanelStructuralKey(input: {
  melody: MelodyDefinition;
  bpm: number;
  zoomScale: number;
  studyRange: { startIndex: number; endIndex: number };
  fingeringStrategy?: MelodyFingeringStrategy;
  fingeringLevel?: MelodyFingeringLevel;
  leadInSec?: number;
  performanceFeedbackByEvent?: PerformanceTimelineFeedbackByEvent | null;
}) {
  return JSON.stringify({
    melodyId: input.melody.id,
    melodyContentSignature: buildMelodyContentSignature(input.melody),
    eventCount: input.melody.events.length,
    bpm: input.bpm,
    zoomScale: input.zoomScale,
    studyRange: input.studyRange,
    fingeringStrategy: input.fingeringStrategy ?? 'minimax',
    fingeringLevel: input.fingeringLevel ?? 'beginner',
    leadInSec: input.leadInSec,
    feedbackSignature: getPerformanceFeedbackSignature(input.performanceFeedbackByEvent),
  });
}
