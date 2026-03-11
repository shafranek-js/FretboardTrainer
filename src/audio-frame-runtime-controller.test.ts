import { describe, expect, it, vi } from 'vitest';
import { createAudioFrameRuntimeController } from './audio-frame-runtime-controller';

function createState() {
  return {
    isCalibrating: false,
    inputSource: 'microphone' as const,
    ignorePromptAudioUntilMs: 0,
    micMonophonicAttackTrackedNote: 'C',
    consecutiveSilence: 0,
    currentPrompt: { targetNote: 'C', melodyEventDurationMs: 180 },
    targetFrequency: 261.63,
    micSensitivityPreset: 'balanced' as const,
    micAutoNoiseFloorRms: 0.01,
    studyMelodyMicGatePercent: 100,
    studyMelodyMicNoiseGuardPercent: 100,
    studyMelodyMicSilenceResetFrames: 6,
    studyMelodyMicStableFrames: 4,
    currentInstrument: { TUNING: { A: 'A4' } },
    dataArray: new Float32Array([0.1, 0.2]),
    audioContext: { sampleRate: 48000 },
    calibrationFrequencies: [] as number[],
  };
}

function createDeps() {
  const state = createState();
  return {
    state,
    getTrainingMode: vi.fn(() => 'melody'),
    getModeDetectionType: vi.fn(() => 'monophonic'),
    now: vi.fn(() => 1000),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'practice' || mode === 'performance'),
    isPerformanceStyleMode: vi.fn((mode: string) => mode === 'practice' || mode === 'performance'),
    isPolyphonicMelodyPrompt: vi.fn(() => false),
    resetStabilityTracking: vi.fn(),
    clearFreeHighlight: vi.fn(),
    updateAttackTracking: vi.fn(),
    markSilenceDuringFreshAttackWait: vi.fn(),
    resetAttackTracking: vi.fn(),
    updateTuner: vi.fn(),
    resolveMicVolumeThreshold: vi.fn(() => 0.02),
    resolveStudyMelodyMicVolumeThreshold: vi.fn(() => 0.03),
    resolvePerformanceMicVolumeThreshold: vi.fn(() => 0.025),
    resolvePerformanceSilenceResetAfterFrames: vi.fn(() => 5),
    resolveEffectiveStudyMelodySilenceResetFrames: vi.fn(() => 6),
    resolveEffectiveStudyMelodyStableFrames: vi.fn(() => 4),
    resolvePerformanceRequiredStableFrames: vi.fn(() => 3),
    buildProcessAudioFramePreflightPlan: vi.fn(() => ({
      kind: 'continue',
      nextConsecutiveSilence: 0,
      shouldResetTracking: false,
      shouldResetTuner: false,
      shouldClearFreeHighlight: false,
    })),
    handleMicrophonePolyphonicMelodyFrame: vi.fn(),
    handlePolyphonicChordFrame: vi.fn(),
    handleMonophonicFrame: vi.fn(),
    defaultRequiredStableFrames: 6,
    calibrationSamples: 8,
    detectPitch: vi.fn(() => 261.63),
    detectCalibrationFrame: vi.fn(() => ({ accepted: true, progressPercent: 50, isComplete: false })),
    buildCalibrationFrameReactionPlan: vi.fn(() => ({ kind: 'accept_sample', progressPercent: 50, shouldFinishCalibration: false })),
    executeCalibrationFrameReaction: vi.fn(),
    setCalibrationProgress: vi.fn(),
    finishCalibration: vi.fn(),
  };
}

describe('audio-frame-runtime-controller', () => {
  it('resets tracking during prompt-audio ignore gap but preserves the tracked note', () => {
    const deps = createDeps();
    deps.state.ignorePromptAudioUntilMs = 1500;
    deps.getTrainingMode = vi.fn(() => 'free');
    const controller = createAudioFrameRuntimeController(deps);

    controller.handleFrame(0.08);

    expect(deps.resetStabilityTracking).toHaveBeenCalledTimes(1);
    expect(deps.clearFreeHighlight).toHaveBeenCalledTimes(1);
    expect(deps.updateAttackTracking).toHaveBeenCalledWith('C', 0.08);
    expect(deps.handleMonophonicFrame).not.toHaveBeenCalled();
  });

  it('resets silence-related tracking when preflight requests it', () => {
    const deps = createDeps();
    deps.buildProcessAudioFramePreflightPlan = vi.fn(() => ({
      kind: 'silence_wait',
      nextConsecutiveSilence: 3,
      shouldResetTracking: true,
      shouldResetTuner: true,
      shouldClearFreeHighlight: true,
    }));
    const controller = createAudioFrameRuntimeController(deps);

    controller.handleFrame(0.0001);

    expect(deps.state.consecutiveSilence).toBe(3);
    expect(deps.markSilenceDuringFreshAttackWait).toHaveBeenCalledTimes(1);
    expect(deps.resetStabilityTracking).toHaveBeenCalledTimes(1);
    expect(deps.resetAttackTracking).toHaveBeenCalledTimes(1);
    expect(deps.updateTuner).toHaveBeenCalledWith(null);
    expect(deps.clearFreeHighlight).toHaveBeenCalledTimes(1);
  });

  it('routes calibration monophonic frames through calibration reactions', () => {
    const deps = createDeps();
    deps.state.isCalibrating = true;
    const controller = createAudioFrameRuntimeController(deps);

    controller.handleFrame(0.05);

    expect(deps.detectPitch).toHaveBeenCalledTimes(1);
    expect(deps.detectCalibrationFrame).toHaveBeenCalledWith({
      frequency: 261.63,
      expectedFrequency: expect.any(Number),
      currentSampleCount: 0,
      requiredSamples: 8,
    });
    expect(deps.executeCalibrationFrameReaction).toHaveBeenCalledTimes(1);
    expect(deps.handleMonophonicFrame).not.toHaveBeenCalled();
  });

  it('dispatches audible monophonic frames into the monophonic controller with computed thresholds', () => {
    const deps = createDeps();
    const controller = createAudioFrameRuntimeController(deps);

    controller.handleFrame(0.09);

    expect(deps.handleMonophonicFrame).toHaveBeenCalledWith({
      volume: 0.09,
      micVolumeThreshold: 0.03,
      requiredStableFrames: 4,
      melodyAdaptiveMicInput: true,
      performanceAdaptiveMicInput: false,
    });
  });
});
