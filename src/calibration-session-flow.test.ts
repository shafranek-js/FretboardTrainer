import { describe, expect, it, vi } from 'vitest';
import {
  buildFinishCalibrationOutcome,
  closeCalibrationSession,
} from './calibration-session-flow';

describe('buildFinishCalibrationOutcome', () => {
  it('returns retry outcome when no samples were collected', () => {
    expect(buildFinishCalibrationOutcome({ hasSamples: false, calibratedA4: null })).toEqual({
      kind: 'retry',
      statusText: 'Could not detect A string. Please try again.',
      delayMs: 2000,
      timeoutContext: 'finishCalibration empty-samples',
      nextCalibratedA4: null,
    });
  });

  it('returns retry outcome for invalid calibration result', () => {
    expect(buildFinishCalibrationOutcome({ hasSamples: true, calibratedA4: null })).toMatchObject({
      kind: 'retry',
      timeoutContext: 'finishCalibration invalid-samples',
    });
  });

  it('returns success outcome with formatted A4 text', () => {
    expect(buildFinishCalibrationOutcome({ hasSamples: true, calibratedA4: 441.234 })).toEqual({
      kind: 'success',
      statusText: 'Calibration complete! New A4 = 441.23 Hz',
      delayMs: 2000,
      timeoutContext: 'finishCalibration timeout',
      nextCalibratedA4: 441.234,
    });
  });
});

describe('closeCalibrationSession', () => {
  it('resets calibration state and stops listening with keepStreamOpen derived from current state', () => {
    const stateRef = {
      isCalibrating: true,
      calibrationFrequencies: [439, 440],
      isListening: false,
    };
    const hideCalibrationModal = vi.fn();
    const stopListening = vi.fn();

    closeCalibrationSession(stateRef, { hideCalibrationModal, stopListening });

    expect(hideCalibrationModal).toHaveBeenCalledTimes(1);
    expect(stateRef.isCalibrating).toBe(false);
    expect(stateRef.calibrationFrequencies).toEqual([]);
    expect(stopListening).toHaveBeenCalledWith(true);
  });
});
