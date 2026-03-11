import type {
  CalibrationViewState,
  ModalKey,
  ModalVisibilityState,
  ProfileActionsState,
} from './ui-modal-views';

export function resolveNextModalVisibilityState(
  currentVisibility: ModalVisibilityState,
  modal: ModalKey,
  isVisible: boolean
): ModalVisibilityState | null {
  if (currentVisibility[modal] === isVisible) {
    return null;
  }

  return {
    ...currentVisibility,
    [modal]: isVisible,
  };
}

export function resolveNextProfileActionsState(
  currentState: ProfileActionsState,
  updateDisabled: boolean,
  deleteDisabled: boolean
): ProfileActionsState | null {
  if (
    currentState.updateDisabled === updateDisabled &&
    currentState.deleteDisabled === deleteDisabled
  ) {
    return null;
  }

  return {
    updateDisabled,
    deleteDisabled,
  };
}

export function resolveNextCalibrationViewState(
  currentState: CalibrationViewState,
  partialState: Partial<CalibrationViewState>
): CalibrationViewState | null {
  const nextState = { ...currentState, ...partialState };
  const isSame =
    currentState.isVisible === nextState.isVisible &&
    currentState.progressPercent === nextState.progressPercent &&
    currentState.statusText === nextState.statusText;

  return isSame ? null : nextState;
}

export function createVisibleCalibrationViewState(statusText = 'Listening...'): CalibrationViewState {
  return {
    isVisible: true,
    progressPercent: 0,
    statusText,
  };
}
