import { closeCalibrationSession } from './calibration-session-flow';
import type { AppState } from './state';

type FinishCalibrationOutcome = ReturnType<typeof import('./calibration-session-flow').buildFinishCalibrationOutcome>;

interface SessionCalibrationRuntimeControllerDeps {
  state: Pick<
    AppState,
    | 'currentInstrument'
    | 'calibrationFrequencies'
    | 'calibratedA4'
    | 'isCalibrating'
    | 'isListening'
  >;
  getOpenATuningInfoFromTuning: typeof import('./calibration-utils').getOpenATuningInfoFromTuning;
  computeCalibratedA4FromSamples: typeof import('./calibration-utils').computeCalibratedA4FromSamples;
  buildFinishCalibrationOutcome: typeof import('./calibration-session-flow').buildFinishCalibrationOutcome;
  setCalibrationStatus: (text: string) => void;
  saveSettings: () => void;
  scheduleSessionTimeout: (delayMs: number, callback: () => void, context: string) => unknown;
  hideCalibrationModal: () => void;
  stopListening: (keepStreamOpen?: boolean) => void;
}

export function createSessionCalibrationRuntimeController(
  deps: SessionCalibrationRuntimeControllerDeps
) {
  function cancelCalibration() {
    closeCalibrationSession(deps.state, {
      hideCalibrationModal: deps.hideCalibrationModal,
      stopListening: deps.stopListening,
    });
  }

  function buildCalibrationFinishOutcome(): FinishCalibrationOutcome {
    const { octave } = deps.getOpenATuningInfoFromTuning(deps.state.currentInstrument.TUNING);
    const calibratedA4 = deps.computeCalibratedA4FromSamples(deps.state.calibrationFrequencies, octave);
    return deps.buildFinishCalibrationOutcome({
      hasSamples: deps.state.calibrationFrequencies.length > 0,
      calibratedA4,
    });
  }

  function finishCalibration() {
    const finishOutcome = buildCalibrationFinishOutcome();

    deps.setCalibrationStatus(finishOutcome.statusText);
    if (finishOutcome.kind === 'retry') {
      deps.scheduleSessionTimeout(finishOutcome.delayMs, cancelCalibration, finishOutcome.timeoutContext);
      return;
    }

    deps.state.calibratedA4 = finishOutcome.nextCalibratedA4!;
    deps.saveSettings();
    deps.scheduleSessionTimeout(
      finishOutcome.delayMs,
      () => {
        cancelCalibration();
      },
      finishOutcome.timeoutContext
    );
  }

  return {
    buildCalibrationFinishOutcome,
    finishCalibration,
    cancelCalibration,
  };
}
