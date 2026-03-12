import { type CalibrationViewState, type ModalKey } from './ui-modal-views';
import {
  createVisibleCalibrationViewState,
  resolveNextCalibrationViewState,
  resolveNextModalVisibilityState,
  resolveNextProfileActionsState,
} from './ui-overlay-state';
import { calibrationViewSignal, modalVisibilitySignal, profileActionsSignal } from './ui-signal-store';

export function setModalVisible(modal: ModalKey, isVisible: boolean) {
  const nextState = resolveNextModalVisibilityState(modalVisibilitySignal.get(), modal, isVisible);
  if (!nextState) return;
  modalVisibilitySignal.set(nextState);
}

export function setProfileActionsState(updateDisabled: boolean, deleteDisabled: boolean) {
  const nextState = resolveNextProfileActionsState(
    profileActionsSignal.get(),
    updateDisabled,
    deleteDisabled
  );
  if (!nextState) return;
  profileActionsSignal.set(nextState);
}

function setCalibrationView(partialState: Partial<CalibrationViewState>) {
  const nextState = resolveNextCalibrationViewState(calibrationViewSignal.get(), partialState);
  if (!nextState) return;
  calibrationViewSignal.set(nextState);
}

export function showCalibrationModal(statusText = 'Listening...') {
  calibrationViewSignal.set(createVisibleCalibrationViewState(statusText));
}

export function hideCalibrationModal() {
  setCalibrationView({ isVisible: false });
}

export function setCalibrationProgress(progressPercent: number) {
  setCalibrationView({ progressPercent });
}

export function setCalibrationStatus(statusText: string) {
  setCalibrationView({ statusText });
}
