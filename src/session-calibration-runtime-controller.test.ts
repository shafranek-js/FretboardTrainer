import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionCalibrationRuntimeController } from './session-calibration-runtime-controller';

function createDeps() {
  const state = {
    currentInstrument: {
      TUNING: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    },
    calibrationFrequencies: [109.5, 110.3],
    calibratedA4: 440,
    isCalibrating: true,
    isListening: true,
  };
  const deps = {
    state,
    getOpenATuningInfoFromTuning: vi.fn(() => ({ octave: 2 })),
    computeCalibratedA4FromSamples: vi.fn(() => 442.25),
    buildFinishCalibrationOutcome: vi.fn(() => ({
      kind: 'success' as const,
      statusText: 'Calibration complete! New A4 = 442.25 Hz',
      delayMs: 2000,
      timeoutContext: 'finishCalibration timeout',
      nextCalibratedA4: 442.25,
    })),
    setCalibrationStatus: vi.fn(),
    saveSettings: vi.fn(),
    scheduleSessionTimeout: vi.fn(),
    hideCalibrationModal: vi.fn(),
    stopListening: vi.fn(),
  };

  return { state, deps };
}

describe('session-calibration-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules a retry when calibration samples are unusable', () => {
    const { state, deps } = createDeps();
    state.calibrationFrequencies = [];
    deps.computeCalibratedA4FromSamples.mockReturnValue(null);
    deps.buildFinishCalibrationOutcome.mockReturnValue({
      kind: 'retry',
      statusText: 'Could not detect A string. Please try again.',
      delayMs: 2000,
      timeoutContext: 'finishCalibration empty-samples',
      nextCalibratedA4: null,
    });
    const controller = createSessionCalibrationRuntimeController(deps);

    controller.finishCalibration();

    expect(deps.buildFinishCalibrationOutcome).toHaveBeenCalledWith({
      hasSamples: false,
      calibratedA4: null,
    });
    expect(deps.setCalibrationStatus).toHaveBeenCalledWith('Could not detect A string. Please try again.');
    expect(deps.saveSettings).not.toHaveBeenCalled();
    expect(deps.scheduleSessionTimeout).toHaveBeenCalledTimes(1);

    const [, scheduledCallback, context] = deps.scheduleSessionTimeout.mock.calls[0];
    expect(context).toBe('finishCalibration empty-samples');
    scheduledCallback();
    expect(deps.hideCalibrationModal).toHaveBeenCalledTimes(1);
    expect(deps.stopListening).toHaveBeenCalledWith(false);
  });

  it('persists calibrated A4 and closes the calibration session after the timeout', () => {
    const { state, deps } = createDeps();
    const controller = createSessionCalibrationRuntimeController(deps);

    controller.finishCalibration();

    expect(state.calibratedA4).toBe(442.25);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.setCalibrationStatus).toHaveBeenCalledWith('Calibration complete! New A4 = 442.25 Hz');
    expect(deps.scheduleSessionTimeout).toHaveBeenCalledTimes(1);

    const [, scheduledCallback, context] = deps.scheduleSessionTimeout.mock.calls[0];
    expect(context).toBe('finishCalibration timeout');
    scheduledCallback();
    expect(deps.hideCalibrationModal).toHaveBeenCalledTimes(1);
    expect(state.isCalibrating).toBe(false);
    expect(state.calibrationFrequencies).toEqual([]);
    expect(deps.stopListening).toHaveBeenCalledWith(false);
  });

  it('cancels calibration immediately', () => {
    const { state, deps } = createDeps();
    const controller = createSessionCalibrationRuntimeController(deps);

    controller.cancelCalibration();

    expect(deps.hideCalibrationModal).toHaveBeenCalledTimes(1);
    expect(state.isCalibrating).toBe(false);
    expect(state.calibrationFrequencies).toEqual([]);
    expect(deps.stopListening).toHaveBeenCalledWith(false);
  });
});
