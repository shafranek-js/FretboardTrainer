import { describe, expect, it, vi } from 'vitest';

const { createSessionDetectionRuntimeCluster } = vi.hoisted(() => ({
  createSessionDetectionRuntimeCluster: vi.fn(),
}));

vi.mock('./dom', () => ({ dom: {} }));
vi.mock('./state', () => ({ state: {} }));
vi.mock('./session-detection-runtime-cluster', () => ({
  createSessionDetectionRuntimeCluster,
}));

describe('session-detection-runtime-graph-cluster', () => {
  it('wires cyclic detection callbacks through the graph layer', async () => {
    const handleMismatch = vi.fn();
    const handleDetectedNote = vi.fn();
    const handleFrame = vi.fn();
    const handleMicrophonePolyphonicMelodyFrame = vi.fn();
    const handleAudioChordFrame = vi.fn();
    const clusterResult = {
      melodyPolyphonicFeedbackController: { handleMismatch },
      stableMonophonicDetectionController: { handleDetectedNote },
      monophonicAudioFrameController: { handleFrame },
      audioFrameRuntimeController: {},
      melodyRuntimeDetectionController: { handleMicrophonePolyphonicMelodyFrame },
      polyphonicChordDetectionController: { handleAudioChordFrame },
    };
    createSessionDetectionRuntimeCluster.mockReturnValue(clusterResult);

    const { createSessionDetectionRuntimeGraphCluster } = await import('./session-detection-runtime-graph-cluster');

    const deps = {
      dom: {
        trainingMode: { value: 'perform' },
      },
      state: {} as any,
      recordSessionAttempt: vi.fn(),
      recordPerformanceTimelineWrongAttempt: vi.fn(),
      redrawFretboard: vi.fn(),
      drawFretboard: vi.fn(),
      setResultMessage: vi.fn(),
      scheduleSessionCooldown: vi.fn(),
      clearWrongDetectedHighlight: vi.fn(),
      setWrongDetectedHighlight: vi.fn(),
      markPerformancePromptAttempt: vi.fn(),
      markPerformanceMicOnsetJudged: vi.fn(),
      recordPerformanceMicJudgmentLatency: vi.fn(),
      isPerformancePitchWithinTolerance: vi.fn(() => true),
      detectMonophonicOctaveMismatch: vi.fn(() => null),
      performanceResolveSuccess: vi.fn(),
      displayResult: vi.fn(),
      handleRhythmModeStableNote: vi.fn(),
      updateFreePlayLiveHighlight: vi.fn(),
      freqToScientificNoteName: vi.fn(() => 'A4'),
      detectPitch: vi.fn(),
      noteResolver: vi.fn(() => 'A'),
      detectMonophonicFrame: vi.fn(),
      buildAudioMonophonicReactionPlan: vi.fn(),
      executeAudioMonophonicReaction: vi.fn(),
      updateTuner: vi.fn(),
      refreshReadinessUiThrottled: vi.fn(),
      recordCaptureFrame: vi.fn(),
      recordStableDetection: vi.fn(),
      recordUncertainFrame: vi.fn(),
      setOnsetGateStatus: vi.fn(),
      resolveUncertainReasonKey: vi.fn(() => null),
      resolveEffectiveRuntimeMicHoldCalibrationLevel: vi.fn(() => 'off'),
      updateAttackTracking: vi.fn(() => ({})),
      clearFreshAttackGuard: vi.fn(),
      resolveMicNoteAttackRequiredPeak: vi.fn(() => 0),
      shouldAcceptMicNoteByAttackStrength: vi.fn(() => true),
      resolveMicNoteHoldRequiredDurationMs: vi.fn(() => 0),
      shouldAcceptMicNoteByHoldDuration: vi.fn(() => true),
      resolvePerformanceMicJudgingThresholds: vi.fn(),
      shouldReportPerformanceMicUncertainFrame: vi.fn(() => false),
      resolveLatencyCompensatedPromptStartedAtMs: vi.fn(() => 0),
      getModeDetectionType: vi.fn(() => 'monophonic'),
      isMelodyWorkflowMode: vi.fn(() => true),
      isPerformanceStyleMode: vi.fn(() => true),
      isPolyphonicMelodyPrompt: vi.fn(() => false),
      resetStabilityTracking: vi.fn(),
      clearFreeHighlight: vi.fn(),
      markSilenceDuringFreshAttackWait: vi.fn(),
      resetAttackTracking: vi.fn(),
      resolveMicVolumeThreshold: vi.fn(() => 0.1),
      resolveStudyMelodyMicVolumeThreshold: vi.fn(() => 0.1),
      resolvePerformanceMicVolumeThreshold: vi.fn(() => 0.1),
      resolvePerformanceSilenceResetAfterFrames: vi.fn(() => 3),
      resolveEffectiveStudyMelodySilenceResetFrames: vi.fn(() => 3),
      resolveEffectiveStudyMelodyStableFrames: vi.fn(() => 2),
      resolvePerformanceRequiredStableFrames: vi.fn(() => 2),
      buildProcessAudioFramePreflightPlan: vi.fn(),
      defaultRequiredStableFrames: 2,
      calibrationSamples: 8,
      detectCalibrationFrame: vi.fn(),
      buildCalibrationFrameReactionPlan: vi.fn(),
      executeCalibrationFrameReaction: vi.fn(),
      setCalibrationProgress: vi.fn(),
      finishCalibration: vi.fn(),
      requiredStableFrames: 2,
      detectMicPolyphonicFrame: vi.fn(() => ({
        detectedNotesText: '',
        detectedNoteNames: [],
        nextStableChordCounter: 0,
        isStableMatch: false,
        isStableMismatch: false,
      })),
      updateMicPolyphonicDetectorRuntimeStatus: vi.fn(),
      now: vi.fn(() => 1),
      performanceNow: vi.fn(() => 1),
    };

    const result = createSessionDetectionRuntimeGraphCluster(deps as any);
    const args = createSessionDetectionRuntimeCluster.mock.calls[0][0];

    args.stableMonophonicDetection.handleMelodyPolyphonicMismatch('prompt', 'heard', 'ctx');
    args.monophonicAudioFrame.handleStableDetectedNote('A', 440);
    args.audioFrame.handleMonophonicFrame({ kind: 'mono' });
    args.audioFrame.handleMicrophonePolyphonicMelodyFrame(0.5);
    args.audioFrame.handlePolyphonicChordFrame(0.6);
    args.melodyRuntimeDetection.handleStableMonophonicDetectedNote('B');

    expect(args.melodyPolyphonicFeedback.redrawFretboard).toBe(deps.redrawFretboard);
    expect(args.audioFrame.getTrainingMode()).toBe('perform');
    expect(handleMismatch).toHaveBeenCalledWith('prompt', 'heard', 'ctx');
    expect(handleDetectedNote).toHaveBeenNthCalledWith(1, 'A', 440);
    expect(handleDetectedNote).toHaveBeenNthCalledWith(2, 'B');
    expect(handleFrame).toHaveBeenCalledWith({ kind: 'mono' });
    expect(handleMicrophonePolyphonicMelodyFrame).toHaveBeenCalledWith(0.5);
    expect(handleAudioChordFrame).toHaveBeenCalledWith(0.6);
    expect(result).toBe(clusterResult);
  });
});
