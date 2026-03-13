import { createSessionPerformanceFeedbackCluster } from '../../session-performance-feedback-cluster';
import type { PerformanceOctavePolicyInput } from '../../performance-octave-policy';

type SessionPerformanceFeedbackClusterDeps = Parameters<
  typeof createSessionPerformanceFeedbackCluster
>[0];
type SessionPerformanceTimelineContextState =
  SessionPerformanceFeedbackClusterDeps['performanceTimelineContext']['state'];
type SessionPerformanceTimelineFeedbackState =
  SessionPerformanceFeedbackClusterDeps['performanceTimelineFeedback']['state'];
type SessionPerformanceMicTelemetryState =
  SessionPerformanceFeedbackClusterDeps['performanceMicTelemetry']['state'];
type SessionMicPerformanceRuntimeStatusState =
  SessionPerformanceFeedbackClusterDeps['micPerformanceRuntimeStatus']['state'];
type SessionDetectedNoteFeedbackState =
  SessionPerformanceFeedbackClusterDeps['detectedNoteFeedback']['state'];
type SessionPerformanceAdaptiveState =
  SessionPerformanceFeedbackClusterDeps['performanceAdaptive']['state'];
type SessionPerformanceFeedbackGraphState =
  SessionPerformanceTimelineContextState
  & SessionPerformanceTimelineFeedbackState
  & SessionPerformanceMicTelemetryState
  & SessionMicPerformanceRuntimeStatusState
  & SessionDetectedNoteFeedbackState
  & SessionPerformanceAdaptiveState;

function createPerformanceTimelineContextState(
  state: SessionPerformanceTimelineContextState
): SessionPerformanceTimelineContextState {
  return state;
}

function createPerformanceTimelineFeedbackState(
  state: SessionPerformanceTimelineFeedbackState
): SessionPerformanceTimelineFeedbackState {
  return state;
}

function createPerformanceMicTelemetryState(
  state: SessionPerformanceMicTelemetryState
): SessionPerformanceMicTelemetryState {
  return state;
}

function createMicPerformanceRuntimeStatusState(
  state: SessionMicPerformanceRuntimeStatusState
): SessionMicPerformanceRuntimeStatusState {
  return state;
}

function createDetectedNoteFeedbackState(
  state: SessionDetectedNoteFeedbackState
): SessionDetectedNoteFeedbackState {
  return state;
}

function createPerformanceAdaptiveState(
  state: SessionPerformanceAdaptiveState
): SessionPerformanceAdaptiveState {
  return state;
}
export interface SessionPerformanceFeedbackGraphClusterDeps {
  dom: {
    trainingMode: HTMLSelectElement;
    stringSelector: HTMLElement;
  };
  state: SessionPerformanceFeedbackGraphState;
  isPerformanceStyleMode: (mode: string) => boolean;
  buildPerformanceTimelineFeedbackKey: typeof import('../../performance-timeline-feedback').buildPerformanceTimelineFeedbackKey;
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
      state: createPerformanceTimelineContextState(deps.state),
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      buildPerformanceTimelineFeedbackKey: deps.buildPerformanceTimelineFeedbackKey,
    },
    performanceTimelineFeedback: {
      state: createPerformanceTimelineFeedbackState(deps.state),
      redrawFretboard: deps.redrawFretboard,
      scheduleTimelineRender: deps.scheduleMelodyTimelineRenderFromState,
    },
    performanceMicTelemetry: {
      state: createPerformanceMicTelemetryState(deps.state),
    },
    micPerformanceRuntimeStatus: {
      state: createMicPerformanceRuntimeStatusState(deps.state),
      refreshMicPerformanceReadinessUi: (nowMs) => deps.refreshMicPerformanceReadinessUi(nowMs),
      refreshMicPolyphonicDetectorAudioInfoUi: deps.refreshMicPolyphonicDetectorAudioInfoUi,
    },
    detectedNoteFeedback: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        stringSelector: deps.dom.stringSelector,
      },
      state: createDetectedNoteFeedbackState(deps.state),
      getEnabledStrings: deps.getEnabledStrings,
      redrawFretboard: deps.redrawFretboard,
      freqToScientificNoteName: deps.freqToScientificNoteName,
      shouldIgnorePerformanceOctaveMismatch: deps.shouldIgnorePerformanceOctaveMismatch,
    },
    performanceAdaptive: {
      state: createPerformanceAdaptiveState(deps.state),
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
    },
  });
}