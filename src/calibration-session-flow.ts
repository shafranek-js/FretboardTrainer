export interface FinishCalibrationOutcomeInput {
  hasSamples: boolean;
  calibratedA4: number | null;
}

export interface FinishCalibrationOutcome {
  kind: 'retry' | 'success';
  statusText: string;
  delayMs: number;
  timeoutContext: string;
  nextCalibratedA4: number | null;
}

const CALIBRATION_RETRY_STATUS = 'Could not detect A string. Please try again.';

export function buildFinishCalibrationOutcome({
  hasSamples,
  calibratedA4,
}: FinishCalibrationOutcomeInput): FinishCalibrationOutcome {
  if (!hasSamples) {
    return {
      kind: 'retry',
      statusText: CALIBRATION_RETRY_STATUS,
      delayMs: 2000,
      timeoutContext: 'finishCalibration empty-samples',
      nextCalibratedA4: null,
    };
  }

  if (calibratedA4 === null) {
    return {
      kind: 'retry',
      statusText: CALIBRATION_RETRY_STATUS,
      delayMs: 2000,
      timeoutContext: 'finishCalibration invalid-samples',
      nextCalibratedA4: null,
    };
  }

  return {
    kind: 'success',
    statusText: `Calibration complete! New A4 = ${calibratedA4.toFixed(2)} Hz`,
    delayMs: 2000,
    timeoutContext: 'finishCalibration timeout',
    nextCalibratedA4: calibratedA4,
  };
}

export interface CalibrationSessionStateRef {
  isCalibrating: boolean;
  calibrationFrequencies: number[];
  isListening: boolean;
}

export function closeCalibrationSession(
  stateRef: CalibrationSessionStateRef,
  deps: {
    hideCalibrationModal: () => void;
    stopListening: (keepStreamOpen?: boolean) => void;
  }
) {
  deps.hideCalibrationModal();
  stateRef.isCalibrating = false;
  stateRef.calibrationFrequencies = [];
  deps.stopListening(!stateRef.isListening);
}
