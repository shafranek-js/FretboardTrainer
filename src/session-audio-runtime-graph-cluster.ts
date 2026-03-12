import { dom } from './dom';
import { state } from './state';
import { createSessionAudioRuntimeCluster } from './session-audio-runtime-cluster';

interface SessionAudioRuntimeGraphClusterDeps {
  dom: Pick<typeof dom, 'trainingMode' | 'metronomeEnabled' | 'melodyDemoBpm' | 'melodySelector'>;
  state: typeof state;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  calculateRmsLevel: typeof import('./audio-frame-processing').calculateRmsLevel;
  setVolumeLevel: (volume: number) => void;
  handleAudioFrame: (volume: number) => void;
  onRuntimeError: (context: string, error: unknown) => void;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getMelodyById: typeof import('./melody-library').getMelodyById;
  getPracticeAdjustedMelody: (
    melody: NonNullable<ReturnType<typeof import('./melody-library').getMelodyById>>
  ) => ReturnType<typeof import('./melody-string-shift').getMelodyWithPracticeAdjustments>;
  resolveMelodyMetronomeMeterProfile: typeof import('./melody-meter').resolveMelodyMetronomeMeterProfile;
  setMetronomeMeter: typeof import('./metronome').setMetronomeMeter;
  isMetronomeRunning: typeof import('./metronome').isMetronomeRunning;
  stopMetronome: typeof import('./metronome').stopMetronome;
  getMetronomeBpm: typeof import('./metronome').getMetronomeBpm;
  setMetronomeTempo: typeof import('./metronome').setMetronomeTempo;
  startMetronome: typeof import('./metronome').startMetronome;
  clampMelodyPlaybackBpm: typeof import('./melody-timeline-duration').clampMelodyPlaybackBpm;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  getOpenATuningInfoFromTuning: typeof import('./calibration-utils').getOpenATuningInfoFromTuning;
  computeCalibratedA4FromSamples: typeof import('./calibration-utils').computeCalibratedA4FromSamples;
  buildFinishCalibrationOutcome: typeof import('./calibration-session-flow').buildFinishCalibrationOutcome;
  setCalibrationStatus: (text: string) => void;
  saveSettings: typeof import('./storage').saveSettings;
  hideCalibrationModal: () => void;
  stopListening: (keepStreamOpen?: boolean) => void;
  scheduleTrackedTimeout: typeof import('./session-timeouts').scheduleTrackedTimeout;
  scheduleTrackedCooldown: typeof import('./session-timeouts').scheduleTrackedCooldown;
}

export function createSessionAudioRuntimeGraphCluster(deps: SessionAudioRuntimeGraphClusterDeps) {
  return createSessionAudioRuntimeCluster({
    audioProcessLoop: {
      state: deps.state,
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
      state: deps.state,
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
      state: deps.state,
      getOpenATuningInfoFromTuning: deps.getOpenATuningInfoFromTuning,
      computeCalibratedA4FromSamples: deps.computeCalibratedA4FromSamples,
      buildFinishCalibrationOutcome: deps.buildFinishCalibrationOutcome,
      setCalibrationStatus: deps.setCalibrationStatus,
      saveSettings: deps.saveSettings,
      hideCalibrationModal: deps.hideCalibrationModal,
      stopListening: deps.stopListening,
    },
    timeout: {
      state: deps.state,
      scheduleTrackedTimeout: deps.scheduleTrackedTimeout,
      scheduleTrackedCooldown: deps.scheduleTrackedCooldown,
      onRuntimeError: deps.onRuntimeError,
    },
  });
}
