import { dom } from '../../dom';
import type { AppState } from '../../state';
import { createSessionAudioRuntimeCluster } from '../../session-audio-runtime-cluster';

type SessionAudioRuntimeClusterDeps = Parameters<typeof createSessionAudioRuntimeCluster>[0];
type SessionAudioRuntimeGraphState = Pick<
  AppState,
  | 'analyser'
  | 'animationId'
  | 'audioContext'
  | 'calibratedA4'
  | 'calibrationFrequencies'
  | 'cooldown'
  | 'currentInstrument'
  | 'dataArray'
  | 'isCalibrating'
  | 'isListening'
  | 'micLastInputRms'
  | 'pendingTimeoutIds'
  | 'performancePrerollLeadInVisible'
  | 'performanceRuntimeStartedAtMs'
>;
type AudioProcessLoopState = SessionAudioRuntimeClusterDeps['audioProcessLoop']['state'];
type MetronomeState = SessionAudioRuntimeClusterDeps['metronome']['state'];
type CalibrationState = SessionAudioRuntimeClusterDeps['calibration']['state'];
type TimeoutState = SessionAudioRuntimeClusterDeps['timeout']['state'];

interface SessionAudioRuntimeGraphClusterDeps {
  dom: Pick<typeof dom, 'trainingMode' | 'metronomeEnabled' | 'melodyDemoBpm' | 'melodySelector'>;
  state: SessionAudioRuntimeGraphState;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  calculateRmsLevel: typeof import('../../audio-frame-processing').calculateRmsLevel;
  setVolumeLevel: (volume: number) => void;
  handleAudioFrame: (volume: number) => void;
  onRuntimeError: (context: string, error: unknown) => void;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getMelodyById: typeof import('../../melody-library').getMelodyById;
  getPracticeAdjustedMelody: (
    melody: NonNullable<ReturnType<typeof import('../../melody-library').getMelodyById>>
  ) => ReturnType<typeof import('../../melody-string-shift').getMelodyWithPracticeAdjustments>;
  resolveMelodyMetronomeMeterProfile: typeof import('../../melody-meter').resolveMelodyMetronomeMeterProfile;
  setMetronomeMeter: typeof import('../../metronome').setMetronomeMeter;
  isMetronomeRunning: typeof import('../../metronome').isMetronomeRunning;
  stopMetronome: typeof import('../../metronome').stopMetronome;
  getMetronomeBpm: typeof import('../../metronome').getMetronomeBpm;
  setMetronomeTempo: typeof import('../../metronome').setMetronomeTempo;
  startMetronome: typeof import('../../metronome').startMetronome;
  clampMelodyPlaybackBpm: typeof import('../../melody-timeline-duration').clampMelodyPlaybackBpm;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  getOpenATuningInfoFromTuning: typeof import('../../calibration-utils').getOpenATuningInfoFromTuning;
  computeCalibratedA4FromSamples: typeof import('../../calibration-utils').computeCalibratedA4FromSamples;
  buildFinishCalibrationOutcome: typeof import('../../calibration-session-flow').buildFinishCalibrationOutcome;
  setCalibrationStatus: (text: string) => void;
  saveSettings: typeof import('../../storage').saveSettings;
  hideCalibrationModal: () => void;
  stopListening: (keepStreamOpen?: boolean) => void;
  scheduleTrackedTimeout: typeof import('../../session-timeouts').scheduleTrackedTimeout;
  scheduleTrackedCooldown: typeof import('../../session-timeouts').scheduleTrackedCooldown;
}

export function createSessionAudioRuntimeGraphCluster(deps: SessionAudioRuntimeGraphClusterDeps) {
  const audioProcessLoopState = createAudioProcessLoopState(deps.state);
  const metronomeState = createMetronomeState(deps.state);
  const calibrationState = createCalibrationState(deps.state);
  const timeoutState = createTimeoutState(deps.state);

  return createSessionAudioRuntimeCluster({
    audioProcessLoop: {
      state: audioProcessLoopState,
      requestAnimationFrame: deps.requestAnimationFrame,
      calculateRmsLevel: deps.calculateRmsLevel,
      setVolumeLevel: deps.setVolumeLevel,
      handleAudioFrame: deps.handleAudioFrame,
      onRuntimeError: deps.onRuntimeError,
    },
    metronome: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        metronomeEnabled: deps.dom.metronomeEnabled,
        melodyDemoBpm: deps.dom.melodyDemoBpm,
      },
      state: metronomeState,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      getSelectedAdjustedMelody: () => {
        const selectedMelodyId = deps.dom.melodySelector.value.trim();
        const selectedBaseMelody = selectedMelodyId
          ? deps.getMelodyById(selectedMelodyId, deps.state.currentInstrument)
          : null;
        return selectedBaseMelody === null ? null : deps.getPracticeAdjustedMelody(selectedBaseMelody);
      },
      resolveMelodyMetronomeMeterProfile: deps.resolveMelodyMetronomeMeterProfile,
      setMetronomeMeter: deps.setMetronomeMeter,
      isMetronomeRunning: deps.isMetronomeRunning,
      stopMetronome: deps.stopMetronome,
      getMetronomeBpm: deps.getMetronomeBpm,
      setMetronomeTempo: deps.setMetronomeTempo,
      startMetronome: deps.startMetronome,
      clampMelodyPlaybackBpm: deps.clampMelodyPlaybackBpm,
      showNonBlockingError: deps.showNonBlockingError,
      formatUserFacingError: deps.formatUserFacingError,
    },
    calibration: {
      state: calibrationState,
      getOpenATuningInfoFromTuning: deps.getOpenATuningInfoFromTuning,
      computeCalibratedA4FromSamples: deps.computeCalibratedA4FromSamples,
      buildFinishCalibrationOutcome: deps.buildFinishCalibrationOutcome,
      setCalibrationStatus: deps.setCalibrationStatus,
      saveSettings: deps.saveSettings,
      hideCalibrationModal: deps.hideCalibrationModal,
      stopListening: deps.stopListening,
    },
    timeout: {
      state: timeoutState,
      scheduleTrackedTimeout: deps.scheduleTrackedTimeout,
      scheduleTrackedCooldown: deps.scheduleTrackedCooldown,
      onRuntimeError: deps.onRuntimeError,
    },
  });
}

function createAudioProcessLoopState(state: AudioProcessLoopState): AudioProcessLoopState {
  return {
    isListening: state.isListening,
    analyser: state.analyser,
    audioContext: state.audioContext,
    cooldown: state.cooldown,
    isCalibrating: state.isCalibrating,
    animationId: state.animationId,
    dataArray: state.dataArray,
    micLastInputRms: state.micLastInputRms,
  };
}

function createMetronomeState(state: MetronomeState): MetronomeState {
  return {
    isListening: state.isListening,
    performanceRuntimeStartedAtMs: state.performanceRuntimeStartedAtMs,
    performancePrerollLeadInVisible: state.performancePrerollLeadInVisible,
  };
}

function createCalibrationState(state: CalibrationState): CalibrationState {
  return {
    currentInstrument: state.currentInstrument,
    calibrationFrequencies: state.calibrationFrequencies,
    calibratedA4: state.calibratedA4,
    isCalibrating: state.isCalibrating,
    isListening: state.isListening,
  };
}

function createTimeoutState(state: TimeoutState): TimeoutState {
  return {
    pendingTimeoutIds: state.pendingTimeoutIds,
    cooldown: state.cooldown,
  };
}
