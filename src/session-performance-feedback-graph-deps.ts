import { createSessionPerformanceFeedbackGraphCluster } from './session-performance-feedback-graph-cluster';

type SessionPerformanceFeedbackGraphDeps = Parameters<typeof createSessionPerformanceFeedbackGraphCluster>[0];

export function buildSessionPerformanceFeedbackGraphDeps(
  args: SessionPerformanceFeedbackGraphDeps
): SessionPerformanceFeedbackGraphDeps {
  return {
    dom: args.dom,
    state: args.state,
    isPerformanceStyleMode: args.isPerformanceStyleMode,
    buildPerformanceTimelineFeedbackKey: args.buildPerformanceTimelineFeedbackKey,
    redrawFretboard: args.redrawFretboard,
    scheduleMelodyTimelineRenderFromState: args.scheduleMelodyTimelineRenderFromState,
    refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
    refreshMicPolyphonicDetectorAudioInfoUi: args.refreshMicPolyphonicDetectorAudioInfoUi,
    getEnabledStrings: args.getEnabledStrings,
    freqToScientificNoteName: args.freqToScientificNoteName,
    shouldIgnorePerformanceOctaveMismatch: args.shouldIgnorePerformanceOctaveMismatch,
  };
}
