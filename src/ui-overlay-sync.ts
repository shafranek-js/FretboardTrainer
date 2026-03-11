import {
  renderCalibrationView,
  renderModalVisibility,
  renderProfileActions,
  type CalibrationViewState,
  type ModalVisibilityState,
  type ProfileActionsState,
} from './ui-modal-views';

export function syncModalUiState(visibility: ModalVisibilityState) {
  renderModalVisibility(visibility);
}

export function syncProfileActionsUiState(state: ProfileActionsState) {
  renderProfileActions(state);
}

export function syncCalibrationUiState(state: CalibrationViewState) {
  renderCalibrationView(state);
}
