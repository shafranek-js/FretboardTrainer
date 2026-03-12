import { createAudioProcessLoopRuntimeController } from './audio-process-loop-runtime-controller';
import { createSessionCalibrationRuntimeController } from './session-calibration-runtime-controller';
import { createSessionMetronomeSyncRuntimeController } from './session-metronome-sync-runtime-controller';
import { createSessionTimeoutRuntimeController } from './session-timeout-runtime-controller';

interface SessionAudioRuntimeClusterDeps {
  audioProcessLoop: Parameters<typeof createAudioProcessLoopRuntimeController>[0];
  metronome: Parameters<typeof createSessionMetronomeSyncRuntimeController>[0];
  calibration: Omit<Parameters<typeof createSessionCalibrationRuntimeController>[0], 'scheduleSessionTimeout'>;
  timeout: Parameters<typeof createSessionTimeoutRuntimeController>[0];
}

export function createSessionAudioRuntimeCluster(deps: SessionAudioRuntimeClusterDeps) {
  const sessionTimeoutRuntimeController = createSessionTimeoutRuntimeController(deps.timeout);

  function scheduleSessionTimeout(delayMs: number, callback: () => void, context: string) {
    return sessionTimeoutRuntimeController.scheduleTimeout(delayMs, callback, context);
  }

  function scheduleSessionCooldown(context: string, delayMs: number, callback: () => void) {
    sessionTimeoutRuntimeController.scheduleCooldown(context, delayMs, callback);
  }

  const audioProcessLoopRuntimeController = createAudioProcessLoopRuntimeController(deps.audioProcessLoop);
  const sessionMetronomeSyncRuntimeController = createSessionMetronomeSyncRuntimeController(deps.metronome);
  const sessionCalibrationRuntimeController = createSessionCalibrationRuntimeController({
    ...deps.calibration,
    scheduleSessionTimeout,
  });

  function finishCalibration() {
    sessionCalibrationRuntimeController.finishCalibration();
  }

  function cancelCalibration() {
    sessionCalibrationRuntimeController.cancelCalibration();
  }

  return {
    audioProcessLoopRuntimeController,
    sessionMetronomeSyncRuntimeController,
    sessionCalibrationRuntimeController,
    sessionTimeoutRuntimeController,
    scheduleSessionTimeout,
    scheduleSessionCooldown,
    finishCalibration,
    cancelCalibration,
  };
}
