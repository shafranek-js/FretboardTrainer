import type { TimelineCell } from './melody-tab-timeline-model';
import { createPlayedFeedbackChip, getClassicCellText } from './melody-tab-timeline-render-utils';
import type { PerformanceTimelineAttemptStatus } from './performance-timeline-feedback';

export function buildClassicTimelineFeedbackSegment(cell: TimelineCell, width: number) {
  return getClassicCellText(
    cell.unmatchedPlayedNotes.map((attempt, attemptIndex) => ({
      note: attempt.note,
      stringName: cell.notes[0]?.stringName ?? '',
      fret: typeof attempt.fret === 'number' ? attempt.fret : attemptIndex,
      finger: 0,
      noteIndex: -1 - attemptIndex,
      performanceStatus: attempt.status as PerformanceTimelineAttemptStatus,
    })),
    width
  );
}

export function appendGridTimelinePlayedFeedback(
  parent: HTMLElement,
  unmatchedPlayedNotes: TimelineCell['unmatchedPlayedNotes'],
  zoomScale: number
) {
  unmatchedPlayedNotes.forEach((attempt) => {
    parent.appendChild(createPlayedFeedbackChip(attempt, zoomScale));
  });
}
