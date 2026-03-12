import { createSessionAudioRuntimeGraphCluster } from './session-audio-runtime-graph-cluster';

type SessionAudioRuntimeGraphDeps = Parameters<typeof createSessionAudioRuntimeGraphCluster>[0];

export interface SessionAudioRuntimeGraphDepsBuilderArgs {
  dom: SessionAudioRuntimeGraphDeps['dom'];
  state: SessionAudioRuntimeGraphDeps['state'];
  requestAnimationFrame: SessionAudioRuntimeGraphDeps['requestAnimationFrame'];
  calculateRmsLevel: SessionAudioRuntimeGraphDeps['calculateRmsLevel'];
  setVolumeLevel: SessionAudioRuntimeGraphDeps['setVolumeLevel'];
  handleAudioFrame: SessionAudioRuntimeGraphDeps['handleAudioFrame'];
  onRuntimeError: SessionAudioRuntimeGraphDeps['onRuntimeError'];
  isMelodyWorkflowMode: SessionAudioRuntimeGraphDeps['isMelodyWorkflowMode'];
  isPerformanceStyleMode: SessionAudioRuntimeGraphDeps['isPerformanceStyleMode'];
  getMelodyById: SessionAudioRuntimeGraphDeps['getMelodyById'];
  getPracticeAdjustedMelody: SessionAudioRuntimeGraphDeps['getPracticeAdjustedMelody'];
  resolveMelodyMetronomeMeterProfile: SessionAudioRuntimeGraphDeps['resolveMelodyMetronomeMeterProfile'];
  setMetronomeMeter: SessionAudioRuntimeGraphDeps['setMetronomeMeter'];
  isMetronomeRunning: SessionAudioRuntimeGraphDeps['isMetronomeRunning'];
  stopMetronome: SessionAudioRuntimeGraphDeps['stopMetronome'];
  getMetronomeBpm: SessionAudioRuntimeGraphDeps['getMetronomeBpm'];
  setMetronomeTempo: SessionAudioRuntimeGraphDeps['setMetronomeTempo'];
  startMetronome: SessionAudioRuntimeGraphDeps['startMetronome'];
  clampMelodyPlaybackBpm: SessionAudioRuntimeGraphDeps['clampMelodyPlaybackBpm'];
  showNonBlockingError: SessionAudioRuntimeGraphDeps['showNonBlockingError'];
  formatUserFacingError: SessionAudioRuntimeGraphDeps['formatUserFacingError'];
  getOpenATuningInfoFromTuning: SessionAudioRuntimeGraphDeps['getOpenATuningInfoFromTuning'];
  computeCalibratedA4FromSamples: SessionAudioRuntimeGraphDeps['computeCalibratedA4FromSamples'];
  buildFinishCalibrationOutcome: SessionAudioRuntimeGraphDeps['buildFinishCalibrationOutcome'];
  setCalibrationStatus: SessionAudioRuntimeGraphDeps['setCalibrationStatus'];
  saveSettings: SessionAudioRuntimeGraphDeps['saveSettings'];
  hideCalibrationModal: SessionAudioRuntimeGraphDeps['hideCalibrationModal'];
  stopListening: SessionAudioRuntimeGraphDeps['stopListening'];
  scheduleTrackedTimeout: SessionAudioRuntimeGraphDeps['scheduleTrackedTimeout'];
  scheduleTrackedCooldown: SessionAudioRuntimeGraphDeps['scheduleTrackedCooldown'];
}

export function buildSessionAudioRuntimeGraphDeps(
  args: SessionAudioRuntimeGraphDepsBuilderArgs
): SessionAudioRuntimeGraphDeps {
  return {
    dom: args.dom,
    state: args.state,
    requestAnimationFrame: args.requestAnimationFrame,
    calculateRmsLevel: args.calculateRmsLevel,
    setVolumeLevel: args.setVolumeLevel,
    handleAudioFrame: args.handleAudioFrame,
    onRuntimeError: args.onRuntimeError,
    isMelodyWorkflowMode: args.isMelodyWorkflowMode,
    isPerformanceStyleMode: args.isPerformanceStyleMode,
    getMelodyById: args.getMelodyById,
    getPracticeAdjustedMelody: args.getPracticeAdjustedMelody,
    resolveMelodyMetronomeMeterProfile: args.resolveMelodyMetronomeMeterProfile,
    setMetronomeMeter: args.setMetronomeMeter,
    isMetronomeRunning: args.isMetronomeRunning,
    stopMetronome: args.stopMetronome,
    getMetronomeBpm: args.getMetronomeBpm,
    setMetronomeTempo: args.setMetronomeTempo,
    startMetronome: args.startMetronome,
    clampMelodyPlaybackBpm: args.clampMelodyPlaybackBpm,
    showNonBlockingError: args.showNonBlockingError,
    formatUserFacingError: args.formatUserFacingError,
    getOpenATuningInfoFromTuning: args.getOpenATuningInfoFromTuning,
    computeCalibratedA4FromSamples: args.computeCalibratedA4FromSamples,
    buildFinishCalibrationOutcome: args.buildFinishCalibrationOutcome,
    setCalibrationStatus: args.setCalibrationStatus,
    saveSettings: args.saveSettings,
    hideCalibrationModal: args.hideCalibrationModal,
    stopListening: args.stopListening,
    scheduleTrackedTimeout: args.scheduleTrackedTimeout,
    scheduleTrackedCooldown: args.scheduleTrackedCooldown,
  };
}
