import { buildPerformanceSessionNoteLogSnapshot } from './performance-session-note-log';
import { buildPerformanceStarsRunKey, resolvePerformanceStarView } from './performance-stars';
import { buildSessionAnalysisBundle } from './session-analysis-bundle';
import { finalizeSessionStats } from './session-stats';
import type { AppState } from './state';

type AppDom = typeof import('./dom').dom;

type PreservedMicLatencyCalibrationState =
  ReturnType<typeof import('./mic-performance-latency-calibration-state').captureMicPerformanceLatencyCalibrationState>;

interface PreservedPerformanceTimelineVisualState {
  performanceTimelineFeedbackKey: AppState['performanceTimelineFeedbackKey'];
  performanceTimelineFeedbackByEvent: AppState['performanceTimelineFeedbackByEvent'];
  performanceTimingByEvent: AppState['performanceTimingByEvent'];
  performanceOnsetRejectsByEvent: AppState['performanceOnsetRejectsByEvent'];
  performanceCaptureTelemetryByEvent: AppState['performanceCaptureTelemetryByEvent'];
}

interface SessionStopRuntimeControllerDeps {
  dom: Pick<
    AppDom,
    | 'melodySelector'
    | 'melodyDemoBpm'
    | 'melodyStudyStart'
    | 'melodyStudyEnd'
    | 'audioInputDevice'
    | 'midiInputDevice'
    | 'melodyTabTimelineGrid'
  >;
  state: Pick<
    AppState,
    | 'activeSessionStats'
    | 'animationId'
    | 'cooldown'
    | 'ignorePromptAudioUntilMs'
    | 'inputSource'
    | 'isCalibrating'
    | 'isDirectInputMode'
    | 'isListening'
    | 'isLoadingSamples'
    | 'lastMicPolyphonicDetectorFallbackFrom'
    | 'lastMicPolyphonicDetectorProviderUsed'
    | 'lastMicPolyphonicDetectorWarning'
    | 'lastSessionAnalysisAutoDownloadKey'
    | 'lastSessionAnalysisBundle'
    | 'lastSessionPerformanceNoteLog'
    | 'lastSessionStats'
    | 'micLastInputRms'
    | 'micLastMonophonicConfidence'
    | 'micLastMonophonicDetectedAtMs'
    | 'micLastMonophonicPitchSpreadCents'
    | 'micNoteAttackFilterPreset'
    | 'micNoteHoldFilterPreset'
    | 'micPerformanceJudgmentCount'
    | 'micPerformanceJudgmentLastLatencyMs'
    | 'micPerformanceJudgmentTotalLatencyMs'
    | 'micPerformanceOnsetGateAtMs'
    | 'micPerformanceOnsetGateReason'
    | 'micPerformanceOnsetGateStatus'
    | 'micPerformanceOnsetRejectedLowConfidenceCount'
    | 'micPerformanceOnsetRejectedLowVoicingCount'
    | 'micPerformanceOnsetRejectedShortHoldCount'
    | 'micPerformanceOnsetRejectedWeakAttackCount'
    | 'micPerformanceReadinessLastUiRefreshAtMs'
    | 'micPerformanceSuggestedLatencyMs'
    | 'micPolyphonicDetectorProvider'
    | 'micPolyphonicDetectorTelemetryFallbackFrames'
    | 'micPolyphonicDetectorTelemetryFrames'
    | 'micPolyphonicDetectorTelemetryLastLatencyMs'
    | 'micPolyphonicDetectorTelemetryMaxLatencyMs'
    | 'micPolyphonicDetectorTelemetryTotalLatencyMs'
    | 'micPolyphonicDetectorTelemetryWarningFrames'
    | 'micPolyphonicDetectorTelemetryWindowStartedAtMs'
    | 'pendingTimeoutIds'
    | 'performanceCaptureTelemetryByEvent'
    | 'performanceMicLatencyCompensationMs'
    | 'performanceOnsetRejectsByEvent'
    | 'performanceRunCompleted'
    | 'performanceStarsByRunKey'
    | 'performanceTimelineFeedbackByEvent'
    | 'performanceTimelineFeedbackKey'
    | 'performanceTimingBiasMs'
    | 'performanceTimingByEvent'
    | 'performanceTimingLeniencyPreset'
    | 'performanceTransportAnimationId'
    | 'performanceMicTolerancePreset'
    | 'requestedAudioInputContentHint'
    | 'activeAudioInputTrackContentHint'
    | 'activeAudioInputTrackSettings'
    | 'showSessionSummaryOnStop'
    | 'timerId'
    | 'micSensitivityPreset'
  >;
  captureMicPerformanceLatencyCalibrationState: () => PreservedMicLatencyCalibrationState;
  restoreMicPerformanceLatencyCalibrationState: (captured: PreservedMicLatencyCalibrationState) => void;
  flushPendingStatsSave: () => void;
  saveLastSessionStats: () => void;
  saveLastSessionAnalysisBundle: () => void;
  savePerformanceStarResults: () => void;
  displayStats: () => void;
  displaySessionSummary: () => void;
  stopMetronome: () => void;
  cancelAnimationFrame: (handle: number) => void;
  stopPerformanceTransportLoop: () => void;
  clearTrackedTimeouts: (pendingTimeoutIds: AppState['pendingTimeoutIds']) => void;
  invalidatePendingAdvance: () => void;
  clearInterval: (handle: number) => void;
  resetAttackTracking: () => void;
  resetMicPolyphonicDetectorTelemetry: () => void;
  stopMidiInput: () => void;
  teardownAudioRuntime: () => void;
  setStatusText: (text: string) => void;
  setTunerVisible: (visible: boolean) => void;
  updateTuner: (frequency: number | null) => void;
  setVolumeLevel: (volume: number) => void;
  resetSessionButtonsState: () => void;
  setPromptText: (text: string) => void;
  clearResultMessage: () => void;
  clearSessionGoalProgress: () => void;
  setInfoSlots: () => void;
  setTimedInfoVisible: (visible: boolean) => void;
  createSessionStopResetState: () => ReturnType<typeof import('./session-reset-state').createSessionStopResetState>;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  refreshMicPerformanceReadinessUi: () => void;
  redrawFretboard: () => void;
  scheduleMelodyTimelineRenderFromState: () => void;
}

export function createSessionStopRuntimeController(deps: SessionStopRuntimeControllerDeps) {
  function capturePreservedPerformanceTimelineVisualState(): PreservedPerformanceTimelineVisualState | null {
    if (!deps.state.showSessionSummaryOnStop) return null;

    return {
      performanceTimelineFeedbackKey: deps.state.performanceTimelineFeedbackKey,
      performanceTimelineFeedbackByEvent: structuredClone(deps.state.performanceTimelineFeedbackByEvent),
      performanceTimingByEvent: structuredClone(deps.state.performanceTimingByEvent),
      performanceOnsetRejectsByEvent: structuredClone(deps.state.performanceOnsetRejectsByEvent),
      performanceCaptureTelemetryByEvent: structuredClone(deps.state.performanceCaptureTelemetryByEvent),
    };
  }

  function restorePreservedPerformanceTimelineVisualState(
    preservedState: PreservedPerformanceTimelineVisualState | null
  ) {
    if (!preservedState) return;

    deps.state.performanceTimelineFeedbackKey = preservedState.performanceTimelineFeedbackKey;
    deps.state.performanceTimelineFeedbackByEvent = preservedState.performanceTimelineFeedbackByEvent;
    deps.state.performanceTimingByEvent = preservedState.performanceTimingByEvent;
    deps.state.performanceOnsetRejectsByEvent = preservedState.performanceOnsetRejectsByEvent;
    deps.state.performanceCaptureTelemetryByEvent = preservedState.performanceCaptureTelemetryByEvent;
  }

  function parseMelodyTempoBpm() {
    const parsed = Number.parseInt(deps.dom.melodyDemoBpm.value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseMelodyStudyRange() {
    const start = Number.parseInt(deps.dom.melodyStudyStart.value, 10);
    const end = Number.parseInt(deps.dom.melodyStudyEnd.value, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return {
      startIndex: Math.max(0, start - 1),
      endIndex: Math.max(0, end - 1),
    };
  }

  function finalizeStoppedSession() {
    if (!deps.state.activeSessionStats || deps.state.isCalibrating) {
      return;
    }

    const finalizedSessionStats = finalizeSessionStats(deps.state.activeSessionStats);
    if (finalizedSessionStats && typeof finalizedSessionStats.completedRun !== 'boolean') {
      finalizedSessionStats.completedRun = deps.state.performanceRunCompleted;
    }
    deps.state.lastSessionStats = finalizedSessionStats;

    if (finalizedSessionStats?.modeKey === 'performance') {
      deps.state.lastSessionPerformanceNoteLog = buildPerformanceSessionNoteLogSnapshot({
        sessionStats: finalizedSessionStats,
        feedbackKey: deps.state.performanceTimelineFeedbackKey,
        feedbackByEvent: deps.state.performanceTimelineFeedbackByEvent,
      });
      const performanceStarView = resolvePerformanceStarView(finalizedSessionStats);
      const performanceStarsRunKey = buildPerformanceStarsRunKey(finalizedSessionStats);
      if (performanceStarView && performanceStarsRunKey) {
        const previousBestStars = Math.max(
          0,
          Math.round(deps.state.performanceStarsByRunKey[performanceStarsRunKey] ?? 0)
        );
        if (performanceStarView.stars > previousBestStars) {
          deps.state.performanceStarsByRunKey[performanceStarsRunKey] = performanceStarView.stars;
          deps.savePerformanceStarResults();
        }
      }
    } else {
      deps.state.lastSessionPerformanceNoteLog = null;
    }

    deps.state.lastSessionAnalysisBundle = buildSessionAnalysisBundle({
      sessionStats: finalizedSessionStats,
      performanceNoteLog: deps.state.lastSessionPerformanceNoteLog,
      performanceFeedbackByEvent: deps.state.performanceTimelineFeedbackByEvent,
      performanceTimingByEvent: deps.state.performanceTimingByEvent,
      performanceOnsetRejectsByEvent: deps.state.performanceOnsetRejectsByEvent,
      performanceCaptureTelemetryByEvent: deps.state.performanceCaptureTelemetryByEvent,
      selectedMelodyId: deps.dom.melodySelector.value.trim() || null,
      melodyTempoBpm: parseMelodyTempoBpm(),
      melodyStudyRange: parseMelodyStudyRange(),
      inputSource: deps.state.inputSource,
      inputDeviceLabel:
        deps.state.inputSource === 'midi'
          ? deps.dom.midiInputDevice.selectedOptions[0]?.textContent?.trim() ?? ''
          : deps.dom.audioInputDevice.selectedOptions[0]?.textContent?.trim() ?? '',
      isDirectInputMode: deps.state.isDirectInputMode,
      micSensitivityPreset: deps.state.micSensitivityPreset,
      micNoteAttackFilterPreset: deps.state.micNoteAttackFilterPreset,
      micNoteHoldFilterPreset: deps.state.micNoteHoldFilterPreset,
      micPolyphonicDetectorProvider: deps.state.micPolyphonicDetectorProvider,
      performanceMicTolerancePreset: deps.state.performanceMicTolerancePreset,
      performanceTimingLeniencyPreset: deps.state.performanceTimingLeniencyPreset,
      performanceMicLatencyCompensationMs: deps.state.performanceMicLatencyCompensationMs,
      performanceTimingBiasMs: deps.state.performanceTimingBiasMs,
      requestedAudioInputContentHint: deps.state.requestedAudioInputContentHint,
      activeAudioInputTrackContentHint: deps.state.activeAudioInputTrackContentHint,
      activeAudioInputTrackSettings: deps.state.activeAudioInputTrackSettings
        ? {
            sampleRate: deps.state.activeAudioInputTrackSettings.sampleRate ?? null,
            channelCount: deps.state.activeAudioInputTrackSettings.channelCount ?? null,
            echoCancellation: deps.state.activeAudioInputTrackSettings.echoCancellation ?? null,
            noiseSuppression: deps.state.activeAudioInputTrackSettings.noiseSuppression ?? null,
            autoGainControl: deps.state.activeAudioInputTrackSettings.autoGainControl ?? null,
          }
        : null,
      micLastInputRms: deps.state.micLastInputRms,
      micLastMonophonicConfidence: deps.state.micLastMonophonicConfidence,
      micLastMonophonicPitchSpreadCents: deps.state.micLastMonophonicPitchSpreadCents,
      micPerformanceSuggestedLatencyMs: deps.state.micPerformanceSuggestedLatencyMs,
      micPerformanceJudgmentCount: deps.state.micPerformanceJudgmentCount,
      micPerformanceJudgmentTotalLatencyMs: deps.state.micPerformanceJudgmentTotalLatencyMs,
      micPerformanceJudgmentLastLatencyMs: deps.state.micPerformanceJudgmentLastLatencyMs,
      micPerformanceOnsetRejectedWeakAttackCount: deps.state.micPerformanceOnsetRejectedWeakAttackCount,
      micPerformanceOnsetRejectedLowConfidenceCount: deps.state.micPerformanceOnsetRejectedLowConfidenceCount,
      micPerformanceOnsetRejectedLowVoicingCount: deps.state.micPerformanceOnsetRejectedLowVoicingCount,
      micPerformanceOnsetRejectedShortHoldCount: deps.state.micPerformanceOnsetRejectedShortHoldCount,
      micPerformanceOnsetGateStatus: deps.state.micPerformanceOnsetGateStatus,
      micPerformanceOnsetGateReason: deps.state.micPerformanceOnsetGateReason,
      micPerformanceOnsetGateAtMs: deps.state.micPerformanceOnsetGateAtMs,
      micPolyphonicDetectorTelemetryFrames: deps.state.micPolyphonicDetectorTelemetryFrames,
      micPolyphonicDetectorTelemetryTotalLatencyMs: deps.state.micPolyphonicDetectorTelemetryTotalLatencyMs,
      micPolyphonicDetectorTelemetryMaxLatencyMs: deps.state.micPolyphonicDetectorTelemetryMaxLatencyMs,
      micPolyphonicDetectorTelemetryLastLatencyMs: deps.state.micPolyphonicDetectorTelemetryLastLatencyMs,
      micPolyphonicDetectorTelemetryFallbackFrames: deps.state.micPolyphonicDetectorTelemetryFallbackFrames,
      micPolyphonicDetectorTelemetryWarningFrames: deps.state.micPolyphonicDetectorTelemetryWarningFrames,
      lastMicPolyphonicDetectorProviderUsed: deps.state.lastMicPolyphonicDetectorProviderUsed,
      lastMicPolyphonicDetectorFallbackFrom: deps.state.lastMicPolyphonicDetectorFallbackFrom,
      lastMicPolyphonicDetectorWarning: deps.state.lastMicPolyphonicDetectorWarning,
      micPolyphonicDetectorTelemetryWindowStartedAtMs:
        deps.state.micPolyphonicDetectorTelemetryWindowStartedAtMs,
    });
    deps.state.lastSessionAnalysisAutoDownloadKey = null;
    deps.flushPendingStatsSave();
    deps.saveLastSessionStats();
    deps.saveLastSessionAnalysisBundle();
    deps.displayStats();
    if (deps.state.showSessionSummaryOnStop) {
      deps.displaySessionSummary();
    }
  }

  function stop(keepStreamOpen = false) {
    const preservedMicLatencyCalibrationState = deps.captureMicPerformanceLatencyCalibrationState();
    if (deps.state.isLoadingSamples) return;

    const preservedPerformanceTimelineVisualState =
      capturePreservedPerformanceTimelineVisualState();

    finalizeStoppedSession();

    deps.state.activeSessionStats = null;
    deps.state.isListening = false;
    deps.stopMetronome();
    if (deps.state.animationId) {
      deps.cancelAnimationFrame(deps.state.animationId);
    }
    deps.stopPerformanceTransportLoop();
    deps.clearTrackedTimeouts(deps.state.pendingTimeoutIds);
    deps.invalidatePendingAdvance();
    if (deps.state.timerId) {
      deps.clearInterval(deps.state.timerId);
      deps.state.timerId = null;
    }
    deps.state.cooldown = false;
    deps.state.ignorePromptAudioUntilMs = 0;
    deps.resetAttackTracking();
    deps.resetMicPolyphonicDetectorTelemetry();
    deps.stopMidiInput();
    if (!keepStreamOpen) {
      deps.teardownAudioRuntime();
      deps.setStatusText('Ready');
    }
    deps.setTunerVisible(false);
    deps.updateTuner(null);
    deps.setVolumeLevel(0);
    deps.state.micLastInputRms = 0;
    deps.state.micLastMonophonicConfidence = null;
    deps.state.micLastMonophonicPitchSpreadCents = null;
    deps.state.micLastMonophonicDetectedAtMs = null;
    deps.state.micPerformanceReadinessLastUiRefreshAtMs = 0;
    deps.resetSessionButtonsState();
    deps.setPromptText('');
    deps.clearResultMessage();
    deps.clearSessionGoalProgress();
    deps.setInfoSlots();
    Object.assign(deps.state, deps.createSessionStopResetState());
    restorePreservedPerformanceTimelineVisualState(preservedPerformanceTimelineVisualState);
    deps.restoreMicPerformanceLatencyCalibrationState(preservedMicLatencyCalibrationState);
    deps.dom.melodyTabTimelineGrid.scrollLeft = 0;
    deps.setTimedInfoVisible(false);
    if (deps.state.inputSource === 'microphone') {
      deps.refreshMicPolyphonicDetectorAudioInfoUi();
      deps.refreshMicPerformanceReadinessUi();
    }
    deps.redrawFretboard();
    deps.scheduleMelodyTimelineRenderFromState();
  }

  return {
    stop,
  };
}
