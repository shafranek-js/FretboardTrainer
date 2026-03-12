import { describe, expect, it, vi } from 'vitest';

const { createSessionLifecycleRuntimeCluster } = vi.hoisted(() => ({
  createSessionLifecycleRuntimeCluster: vi.fn(),
}));

vi.mock('./dom', () => ({ dom: {} }));
vi.mock('./state', () => ({ state: {} }));
vi.mock('./session-lifecycle-runtime-cluster', () => ({
  createSessionLifecycleRuntimeCluster,
}));

describe('session-lifecycle-runtime-graph-cluster', () => {
  it('maps compact lifecycle deps into nested lifecycle cluster deps', async () => {
    const clusterResult = {
      stopListening: vi.fn(),
      nextPrompt: vi.fn(),
      displayResult: vi.fn(),
      handleTimeUp: vi.fn(),
      seekActiveMelodySessionToEvent: vi.fn(),
    };
    createSessionLifecycleRuntimeCluster.mockReturnValue(clusterResult);

    const { createSessionLifecycleRuntimeGraphCluster } = await import('./session-lifecycle-runtime-graph-cluster');

    const captureMicPerformanceLatencyCalibrationState = vi.fn(() => ({ micPerformanceJudgmentCount: 1 }));
    const restoreMicPerformanceLatencyCalibrationState = vi.fn();
    const clearWrongDetectedHighlight = vi.fn();
    const startRuntimeClock = vi.fn();
    const syncPromptTransition = vi.fn();

    const deps = {
      dom: {
        trainingMode: { value: 'perform' },
        inputSource: { value: 'microphone' },
        melodySelector: { value: 'melody-1' },
        melodyDemoBpm: { value: '120' },
        melodyStudyStart: { value: '1' },
        melodyStudyEnd: { value: '8' },
        audioInputDevice: { value: 'mic-1' },
        midiInputDevice: { value: 'midi-1' },
        melodyTabTimelineGrid: {},
        progressionSelector: { value: 'i-iv-v' },
        sessionGoal: { value: '10' },
        startFret: { value: '1' },
        endFret: { value: '5' },
        stringSelector: {},
      },
      state: {} as any,
      timedDurationSeconds: 90,
      captureMicPerformanceLatencyCalibrationState,
      restoreMicPerformanceLatencyCalibrationState,
      flushPendingStatsSave: vi.fn(),
      saveLastSessionStats: vi.fn(),
      saveLastSessionAnalysisBundle: vi.fn(),
      savePerformanceStarResults: vi.fn(),
      displayStats: vi.fn(),
      displaySessionSummary: vi.fn(),
      stopMetronome: vi.fn(),
      stopPerformanceTransportLoop: vi.fn(),
      clearTrackedTimeouts: vi.fn(),
      invalidatePendingAdvance: vi.fn(),
      resetAttackTracking: vi.fn(),
      resetMicPolyphonicDetectorTelemetry: vi.fn(),
      stopMidiInput: vi.fn(),
      teardownAudioRuntime: vi.fn(),
      setStatusText: vi.fn(),
      setTunerVisible: vi.fn(),
      updateTuner: vi.fn(),
      setVolumeLevel: vi.fn(),
      resetSessionButtonsState: vi.fn(),
      setPromptText: vi.fn(),
      clearResultMessage: vi.fn(),
      clearSessionGoalProgress: vi.fn(),
      setInfoSlots: vi.fn(),
      setTimedInfoVisible: vi.fn(),
      createSessionStopResetState: vi.fn(() => ({})),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      redrawFretboard: vi.fn(),
      scheduleMelodyTimelineRenderFromState: vi.fn(),
      normalizeInputSource: vi.fn(() => 'microphone'),
      setInputSourcePreference: vi.fn(),
      resolveSessionMicHoldCalibrationLevel: vi.fn(() => 'medium'),
      resetReadinessAndJudgmentTelemetry: vi.fn(),
      resetOnsetGateStatus: vi.fn(),
      resetOnsetRejectTelemetry: vi.fn(),
      clearPerformanceTimelineFeedback: vi.fn(),
      clearAudioInputGuidanceError: vi.fn(),
      createMidiSessionMessageHandler: vi.fn(),
      startMidiInput: vi.fn(),
      ensureAudioRuntime: vi.fn(),
      refreshAudioInputDeviceOptions: vi.fn(),
      isPerformanceStyleMode: vi.fn(() => true),
      getCurrentModeDetectionType: vi.fn(() => 'monophonic'),
      handleMelodyUpdate: vi.fn(),
      handlePolyphonicUpdate: vi.fn(),
      clearLiveDetectedHighlight: vi.fn(),
      clearWrongDetectedHighlight,
      handleStableMonophonicDetectedNote: vi.fn(),
      onRuntimeError: vi.fn(),
      warn: vi.fn(),
      getModeDetectionType: vi.fn(() => 'monophonic'),
      buildSessionStartPlan: vi.fn(),
      setSessionButtonsState: vi.fn(),
      setTimerValue: vi.fn(),
      setScoreValue: vi.fn(),
      createTimedSessionIntervalHandler: vi.fn(),
      onStartRuntimeError: vi.fn(),
      getSelectedFretRange: vi.fn(() => ({ start: 1, end: 5 })),
      getEnabledStrings: vi.fn(() => new Set(['E'])),
      executeSessionRuntimeActivation: vi.fn(),
      resetPromptCycleTracking: vi.fn(),
      processAudio: vi.fn(),
      setResultMessage: vi.fn(),
      applyInitialTimelinePreview: vi.fn(),
      clearInitialTimelinePreview: vi.fn(),
      startRuntimeClock,
      beginPrerollTimeline: vi.fn(),
      advancePrerollTimeline: vi.fn(),
      finishPrerollTimeline: vi.fn(),
      playMetronomeCue: vi.fn(),
      scheduleSessionTimeout: vi.fn(() => 1),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
      setAudioInputGuidanceError: vi.fn(),
      getMode: vi.fn(() => null),
      syncPromptEventFromRuntime: vi.fn(),
      buildPerformancePromptForEvent: vi.fn(),
      buildSessionNextPromptPlan: vi.fn(),
      executeSessionNextPromptPlan: vi.fn(),
      requestSessionSummaryOnStop: vi.fn(),
      syncPromptTransition,
      configurePromptAudio: vi.fn(),
      syncMetronomeToPromptStart: vi.fn(),
      schedulePerformancePromptAdvance: vi.fn(),
      recordSessionAttempt: vi.fn(),
      updateStats: vi.fn(),
      setSessionGoalProgress: vi.fn(),
      scheduleSessionCooldown: vi.fn(),
      saveStats: vi.fn(),
      resetPromptResolution: vi.fn(),
      drawFretboard: vi.fn(),
      isMelodyWorkflowMode: vi.fn(() => true),
    };

    const result = createSessionLifecycleRuntimeGraphCluster(deps as any);
    const args = createSessionLifecycleRuntimeCluster.mock.calls[0][0];
    const snapshot = args.stop.captureMicPerformanceLatencyCalibrationState();

    args.stop.restoreMicPerformanceLatencyCalibrationState(snapshot);
    args.seek.clearWrongDetectedHighlight();
    args.activation.startRuntimeClock();
    args.seek.startRuntimeClock(12);
    args.nextPrompt.syncPromptTransition('prev', 'next');

    expect(args.stop.dom.melodySelector).toBe(deps.dom.melodySelector);
    expect(args.input.dom.inputSource).toBe(deps.dom.inputSource);
    expect(args.displayResult.drawFretboard).toBe(deps.drawFretboard);
    expect(args.seek.isMelodyWorkflowMode).toBe(deps.isMelodyWorkflowMode);
    expect(captureMicPerformanceLatencyCalibrationState).toHaveBeenCalledTimes(1);
    expect(restoreMicPerformanceLatencyCalibrationState).toHaveBeenCalledWith(snapshot);
    expect(clearWrongDetectedHighlight).toHaveBeenCalledTimes(1);
    expect(startRuntimeClock).toHaveBeenNthCalledWith(1);
    expect(startRuntimeClock).toHaveBeenNthCalledWith(2, 12);
    expect(syncPromptTransition).toHaveBeenCalledWith('prev', 'next');
    expect(result).toBe(clusterResult);
  });
});
