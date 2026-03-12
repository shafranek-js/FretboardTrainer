import { createSessionPerformanceFeedbackCluster } from './session-performance-feedback-cluster';
import type { PerformanceOctavePolicyInput } from './performance-octave-policy';

interface SessionPerformanceFeedbackGraphClusterDeps {
  dom: {
    trainingMode: HTMLSelectElement;
    stringSelector: HTMLElement;
  };
  state: typeof import('./state').state;
  isPerformanceStyleMode: (mode: string) => boolean;
  buildPerformanceTimelineFeedbackKey: typeof import('./performance-timeline-feedback').buildPerformanceTimelineFeedbackKey;
  redrawFretboard: () => void;
  scheduleMelodyTimelineRenderFromState: () => void;
  refreshMicPerformanceReadinessUi: (nowMs?: number) => void;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  getEnabledStrings: (selector: HTMLElement) => Set<string>;
  freqToScientificNoteName: (frequency: number) => string;
  shouldIgnorePerformanceOctaveMismatch: (input: PerformanceOctavePolicyInput) => boolean;
}

export function createSessionPerformanceFeedbackGraphCluster(
  deps: SessionPerformanceFeedbackGraphClusterDeps
) {
  return createSessionPerformanceFeedbackCluster({
    performanceTimelineContext: {
      dom: {
        trainingMode: deps.dom.trainingMode,
      },
      state: deps.state,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      buildPerformanceTimelineFeedbackKey: deps.buildPerformanceTimelineFeedbackKey,
    },
    performanceTimelineFeedback: {
      state: deps.state,
      redrawFretboard: deps.redrawFretboard,
      scheduleTimelineRender: deps.scheduleMelodyTimelineRenderFromState,
    },
    performanceMicTelemetry: {
      state: deps.state,
    },
    micPerformanceRuntimeStatus: {
      state: deps.state,
      refreshMicPerformanceReadinessUi: (nowMs) => deps.refreshMicPerformanceReadinessUi(nowMs),
      refreshMicPolyphonicDetectorAudioInfoUi: deps.refreshMicPolyphonicDetectorAudioInfoUi,
    },
    detectedNoteFeedback: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        stringSelector: deps.dom.stringSelector,
      },
      state: deps.state,
      getEnabledStrings: deps.getEnabledStrings,
      redrawFretboard: deps.redrawFretboard,
      freqToScientificNoteName: deps.freqToScientificNoteName,
      shouldIgnorePerformanceOctaveMismatch: deps.shouldIgnorePerformanceOctaveMismatch,
    },
    performanceAdaptive: {
      state: deps.state,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
    },
  });
}
