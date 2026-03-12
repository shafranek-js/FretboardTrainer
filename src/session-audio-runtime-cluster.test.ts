import { describe, expect, it, vi } from 'vitest';
import { createSessionAudioRuntimeCluster } from './session-audio-runtime-cluster';

function createDeps() {
  return {
    audioProcessLoop: {} as never,
    metronome: {} as never,
    calibration: {
      state: {
        calibrationFrequencies: [],
        currentInstrument: { TUNING: [] },
        calibratedA4: 440,
        isCalibrating: false,
      },
      getOpenATuningInfoFromTuning: vi.fn(() => ({ expectedFrequency: 440 })),
      computeCalibratedA4FromSamples: vi.fn(() => 440),
      buildFinishCalibrationOutcome: vi.fn(() => ({ calibratedA4: 440, statusMessage: 'ok', shouldPersist: false })),
      setCalibrationStatus: vi.fn(),
      saveSettings: vi.fn(),
      hideCalibrationModal: vi.fn(),
      stopListening: vi.fn(),
    },
    timeout: {
      state: { pendingTimeoutIds: new Set<number>() },
      scheduleTrackedTimeout: vi.fn(() => 1),
      scheduleTrackedCooldown: vi.fn(),
      onRuntimeError: vi.fn(),
    },
  };
}

describe('session-audio-runtime-cluster', () => {
  it('creates audio runtime controllers and timeout/calibration entry points', () => {
    const cluster = createSessionAudioRuntimeCluster(createDeps() as never);

    expect(cluster.audioProcessLoopRuntimeController).toBeTruthy();
    expect(cluster.sessionMetronomeSyncRuntimeController).toBeTruthy();
    expect(cluster.sessionCalibrationRuntimeController).toBeTruthy();
    expect(cluster.sessionTimeoutRuntimeController).toBeTruthy();
    expect(typeof cluster.scheduleSessionTimeout).toBe('function');
    expect(typeof cluster.scheduleSessionCooldown).toBe('function');
    expect(typeof cluster.finishCalibration).toBe('function');
    expect(typeof cluster.cancelCalibration).toBe('function');
  });
});
