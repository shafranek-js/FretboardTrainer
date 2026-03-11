import { getOpenATuningInfoFromTuning } from './calibration-utils';

type AppState = typeof import('./state').state;

interface AudioFrameRuntimeControllerDeps {
  state: Pick<
    AppState,
    | 'isCalibrating'
    | 'inputSource'
    | 'ignorePromptAudioUntilMs'
    | 'micMonophonicAttackTrackedNote'
    | 'consecutiveSilence'
    | 'currentPrompt'
    | 'targetFrequency'
    | 'micSensitivityPreset'
    | 'micAutoNoiseFloorRms'
    | 'studyMelodyMicGatePercent'
    | 'studyMelodyMicNoiseGuardPercent'
    | 'studyMelodyMicSilenceResetFrames'
    | 'studyMelodyMicStableFrames'
    | 'currentInstrument'
    | 'dataArray'
    | 'audioContext'
    | 'calibrationFrequencies'
  >;
  getTrainingMode: () => string;
  getModeDetectionType: (trainingMode: string) => string | null;
  now?: () => number;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  isPolyphonicMelodyPrompt: typeof import('./melody-prompt-polyphony').isPolyphonicMelodyPrompt;
  resetStabilityTracking: () => void;
  clearFreeHighlight: () => void;
  updateAttackTracking: (detectedNote: string | null, volume: number) => void;
  markSilenceDuringFreshAttackWait: () => void;
  resetAttackTracking: () => void;
  updateTuner: (frequency: number | null) => void;
  resolveMicVolumeThreshold: typeof import('./mic-input-sensitivity').resolveMicVolumeThreshold;
  resolveStudyMelodyMicVolumeThreshold:
    typeof import('./performance-mic-volume-threshold').resolveStudyMelodyMicVolumeThreshold;
  resolvePerformanceMicVolumeThreshold:
    typeof import('./performance-mic-volume-threshold').resolvePerformanceMicVolumeThreshold;
  resolvePerformanceSilenceResetAfterFrames:
    typeof import('./performance-mic-adaptive-gating').resolvePerformanceSilenceResetAfterFrames;
  resolveEffectiveStudyMelodySilenceResetFrames:
    typeof import('./study-melody-mic-tuning').resolveEffectiveStudyMelodySilenceResetFrames;
  resolveEffectiveStudyMelodyStableFrames:
    typeof import('./study-melody-mic-tuning').resolveEffectiveStudyMelodyStableFrames;
  resolvePerformanceRequiredStableFrames:
    typeof import('./performance-mic-adaptive-gating').resolvePerformanceRequiredStableFrames;
  buildProcessAudioFramePreflightPlan:
    typeof import('./process-audio-frame-preflight').buildProcessAudioFramePreflightPlan;
  handleMicrophonePolyphonicMelodyFrame: (frameVolumeRms: number) => void;
  handlePolyphonicChordFrame: (frameVolumeRms: number) => void;
  handleMonophonicFrame: (input: {
    volume: number;
    micVolumeThreshold: number;
    requiredStableFrames: number;
    melodyAdaptiveMicInput: boolean;
    performanceAdaptiveMicInput: boolean;
  }) => void;
  defaultRequiredStableFrames: number;
  calibrationSamples: number;
  detectPitch: typeof import('./audio').detectPitch;
  detectCalibrationFrame: typeof import('./audio-detection-handlers').detectCalibrationFrame;
  buildCalibrationFrameReactionPlan:
    typeof import('./session-detection-reactions').buildCalibrationFrameReactionPlan;
  executeCalibrationFrameReaction:
    typeof import('./process-audio-reaction-executors').executeCalibrationFrameReaction;
  setCalibrationProgress: (progressPercent: number) => void;
  finishCalibration: () => void;
}

export function createAudioFrameRuntimeController(deps: AudioFrameRuntimeControllerDeps) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function handleFrame(volume: number) {
    const trainingMode = deps.getTrainingMode();

    if (
      !deps.state.isCalibrating &&
      deps.state.inputSource !== 'midi' &&
      now() < deps.state.ignorePromptAudioUntilMs
    ) {
      deps.resetStabilityTracking();
      if (trainingMode === 'free') {
        deps.clearFreeHighlight();
      }
      deps.updateAttackTracking(deps.state.micMonophonicAttackTrackedNote, volume);
      return;
    }

    const modeDetectionType = deps.getModeDetectionType(trainingMode);
    const baseMicVolumeThreshold = deps.resolveMicVolumeThreshold(
      deps.state.micSensitivityPreset,
      deps.state.micAutoNoiseFloorRms
    );
    const studyMelodyMicInput = deps.state.inputSource !== 'midi' && trainingMode === 'melody';
    const melodyAdaptiveMicInput =
      deps.state.inputSource !== 'midi' && deps.isMelodyWorkflowMode(trainingMode);
    const performanceAdaptiveMicInput =
      deps.state.inputSource !== 'midi' && deps.isPerformanceStyleMode(trainingMode);
    const automaticSilenceResetFrames = melodyAdaptiveMicInput
      ? deps.resolvePerformanceSilenceResetAfterFrames(
          deps.state.currentPrompt?.melodyEventDurationMs ?? null
        )
      : undefined;
    const micVolumeThreshold = studyMelodyMicInput
      ? deps.resolveStudyMelodyMicVolumeThreshold({
          baseThreshold: baseMicVolumeThreshold,
          sensitivityPreset: deps.state.micSensitivityPreset,
          autoNoiseFloorRms: deps.state.micAutoNoiseFloorRms,
          gatePercent: deps.state.studyMelodyMicGatePercent,
          noiseGuardPercent: deps.state.studyMelodyMicNoiseGuardPercent,
        })
      : melodyAdaptiveMicInput
        ? deps.resolvePerformanceMicVolumeThreshold({
            baseThreshold: baseMicVolumeThreshold,
            sensitivityPreset: deps.state.micSensitivityPreset,
            autoNoiseFloorRms: deps.state.micAutoNoiseFloorRms,
          })
        : baseMicVolumeThreshold;

    const preflightPlan = deps.buildProcessAudioFramePreflightPlan({
      volume,
      volumeThreshold: micVolumeThreshold,
      consecutiveSilence: deps.state.consecutiveSilence,
      silenceResetAfterFrames: studyMelodyMicInput
        ? deps.resolveEffectiveStudyMelodySilenceResetFrames(
            automaticSilenceResetFrames ?? 6,
            deps.state.studyMelodyMicSilenceResetFrames
          )
        : automaticSilenceResetFrames,
      isCalibrating: deps.state.isCalibrating,
      trainingMode,
      hasMode: modeDetectionType !== null,
      hasCurrentPrompt: Boolean(deps.state.currentPrompt),
    });
    deps.state.consecutiveSilence = preflightPlan.nextConsecutiveSilence;

    if (preflightPlan.kind === 'silence_wait') {
      deps.markSilenceDuringFreshAttackWait();
      if (preflightPlan.shouldResetTracking) {
        deps.resetStabilityTracking();
        deps.resetAttackTracking();
        if (preflightPlan.shouldResetTuner) deps.updateTuner(null);
        if (preflightPlan.shouldClearFreeHighlight) deps.clearFreeHighlight();
      }
      return;
    }

    if (preflightPlan.kind === 'missing_mode_or_prompt') {
      return;
    }

    const shouldUseMicrophonePolyphonicMelodyDetection =
      deps.isMelodyWorkflowMode(trainingMode) &&
      deps.state.inputSource !== 'midi' &&
      deps.isPolyphonicMelodyPrompt(deps.state.currentPrompt);

    if (shouldUseMicrophonePolyphonicMelodyDetection) {
      deps.handleMicrophonePolyphonicMelodyFrame(volume);
      return;
    }

    if (modeDetectionType === 'polyphonic') {
      deps.handlePolyphonicChordFrame(volume);
      return;
    }

    const frequency = deps.detectPitch(
      deps.state.dataArray!,
      deps.state.audioContext!.sampleRate,
      micVolumeThreshold,
      {
        expectedFrequency: melodyAdaptiveMicInput ? deps.state.targetFrequency : null,
        preferLowLatency: melodyAdaptiveMicInput,
      }
    );

    if (deps.state.isCalibrating) {
      const { expectedFrequency } = getOpenATuningInfoFromTuning(deps.state.currentInstrument.TUNING);
      const calibrationResult = deps.detectCalibrationFrame({
        frequency,
        expectedFrequency,
        currentSampleCount: deps.state.calibrationFrequencies.length,
        requiredSamples: deps.calibrationSamples,
      });
      const calibrationReactionPlan = deps.buildCalibrationFrameReactionPlan({
        accepted: calibrationResult.accepted,
        progressPercent: calibrationResult.progressPercent,
        isComplete: calibrationResult.isComplete,
      });
      if (calibrationReactionPlan.kind === 'accept_sample') {
        deps.executeCalibrationFrameReaction({
          reactionPlan: calibrationReactionPlan,
          acceptedFrequency: frequency,
          pushCalibrationFrequency: (value) => {
            deps.state.calibrationFrequencies.push(value);
          },
          setCalibrationProgress: deps.setCalibrationProgress,
          finishCalibration: deps.finishCalibration,
        });
      }
      return;
    }

    const requiredStableFrames = studyMelodyMicInput
      ? deps.resolveEffectiveStudyMelodyStableFrames(
          deps.resolvePerformanceRequiredStableFrames(
            deps.state.currentPrompt?.melodyEventDurationMs ?? null
          ),
          deps.state.studyMelodyMicStableFrames
        )
      : melodyAdaptiveMicInput
        ? deps.resolvePerformanceRequiredStableFrames(
            deps.state.currentPrompt?.melodyEventDurationMs ?? null
          )
        : deps.defaultRequiredStableFrames;

    deps.handleMonophonicFrame({
      volume,
      micVolumeThreshold,
      requiredStableFrames,
      melodyAdaptiveMicInput,
      performanceAdaptiveMicInput,
    });
  }

  return {
    handleFrame,
  };
}

