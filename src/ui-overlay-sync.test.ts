import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  renderModalVisibility: vi.fn(),
  renderProfileActions: vi.fn(),
  renderCalibrationView: vi.fn(),
}));

vi.mock('./ui-modal-views', () => ({
  renderModalVisibility: mocks.renderModalVisibility,
  renderProfileActions: mocks.renderProfileActions,
  renderCalibrationView: mocks.renderCalibrationView,
}));

import {
  syncCalibrationUiState,
  syncModalUiState,
  syncProfileActionsUiState,
} from './ui-overlay-sync';

describe('ui-overlay-sync', () => {
  it('forwards modal visibility to the modal view', () => {
    const visibility = {
      onboarding: false,
      settings: true,
      userData: false,
      help: false,
      quickHelp: false,
      sessionSummary: false,
      stats: false,
      guide: false,
      links: false,
      profileName: false,
      melodyImport: false,
    };

    syncModalUiState(visibility);
    expect(mocks.renderModalVisibility).toHaveBeenCalledWith(visibility);
  });

  it('forwards profile actions and calibration state', () => {
    const profileActions = { updateDisabled: true, deleteDisabled: false };
    const calibration = { isVisible: true, progressPercent: 50, statusText: 'Listening...' };

    syncProfileActionsUiState(profileActions);
    syncCalibrationUiState(calibration);

    expect(mocks.renderProfileActions).toHaveBeenCalledWith(profileActions);
    expect(mocks.renderCalibrationView).toHaveBeenCalledWith(calibration);
  });
});
