import type { Prompt } from './types';
import type { PerformanceTimingGrade } from './performance-timing-grade';
import {
  appendPerformanceTimelineAttempts,
  buildPerformanceTimelineMissedAttempts,
  buildPerformanceTimelineSuccessAttempts,
  buildPerformanceTimelineWrongAttempts,
  clearPerformanceTimelineFeedbackState,
} from './performance-timeline-feedback';

type AppState = typeof import('./state').state;

interface PerformanceTimelineFeedbackControllerDeps {
  state: Pick<
    AppState,
    | 'performanceTimelineFeedbackKey'
    | 'performanceTimelineFeedbackByEvent'
    | 'performanceTimingByEvent'
    | 'performanceOnsetRejectsByEvent'
    | 'performanceCaptureTelemetryByEvent'
    | 'performancePromptHadWrongAttempt'
    | 'currentPrompt'
    | 'wrongDetectedString'
    | 'wrongDetectedFret'
  >;
  getCurrentEventIndex: () => number | null;
  getFeedbackKey: () => string | null;
  redrawFretboard: () => void;
  scheduleTimelineRender: () => void;
}

export function createPerformanceTimelineFeedbackController(deps: PerformanceTimelineFeedbackControllerDeps) {
  function clearFeedback() {
    clearPerformanceTimelineFeedbackState(deps.state);
    deps.state.performanceTimingByEvent = {};
    deps.state.performanceOnsetRejectsByEvent = {};
    deps.state.performanceCaptureTelemetryByEvent = {};
  }

  function ensureFeedbackBucket() {
    const feedbackKey = deps.getFeedbackKey();
    if (!feedbackKey) return false;
    if (deps.state.performanceTimelineFeedbackKey !== feedbackKey) {
      deps.state.performanceTimelineFeedbackKey = feedbackKey;
      deps.state.performanceTimelineFeedbackByEvent = {};
      deps.state.performanceTimingByEvent = {};
      deps.state.performanceOnsetRejectsByEvent = {};
      deps.state.performanceCaptureTelemetryByEvent = {};
    }
    return true;
  }

  function recordSuccess(prompt: Prompt, redraw = true) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    if (!ensureFeedbackBucket()) return;
    appendPerformanceTimelineAttempts(
      deps.state.performanceTimelineFeedbackByEvent,
      eventIndex,
      buildPerformanceTimelineSuccessAttempts(prompt)
    );
    if (redraw) {
      deps.redrawFretboard();
      return;
    }
    deps.scheduleTimelineRender();
  }

  function recordWrongAttempt(note: string) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    if (!ensureFeedbackBucket()) return;
    deps.state.performancePromptHadWrongAttempt = true;
    appendPerformanceTimelineAttempts(
      deps.state.performanceTimelineFeedbackByEvent,
      eventIndex,
      buildPerformanceTimelineWrongAttempts(deps.state.currentPrompt, {
        note,
        stringName: deps.state.wrongDetectedString,
        fret: deps.state.wrongDetectedFret,
      })
    );
    deps.scheduleTimelineRender();
  }

  function recordMissed(prompt: Prompt) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    if (!ensureFeedbackBucket()) return;
    appendPerformanceTimelineAttempts(
      deps.state.performanceTimelineFeedbackByEvent,
      eventIndex,
      buildPerformanceTimelineMissedAttempts(prompt)
    );
    deps.scheduleTimelineRender();
  }

  function recordTiming(grade: PerformanceTimingGrade | null | undefined) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null || !grade) return;
    const bucket = deps.state.performanceTimingByEvent[eventIndex] ?? [];
    bucket.push({
      bucket: grade.bucket,
      label: grade.label,
      weight: grade.weight,
      signedOffsetMs: grade.signedOffsetMs,
      judgedAtMs: Date.now(),
    });
    deps.state.performanceTimingByEvent[eventIndex] = bucket;
  }

  return {
    clearFeedback,
    recordSuccess,
    recordWrongAttempt,
    recordMissed,
    recordTiming,
  };
}
