import { afterEach, describe, expect, it } from 'vitest';
import { calibrationViewSignal, modalVisibilitySignal, profileActionsSignal } from './ui-signal-store';
import {
  hideCalibrationModal,
  setCalibrationProgress,
  setCalibrationStatus,
  setModalVisible,
  setProfileActionsState,
  showCalibrationModal,
} from './ui-overlay-signal-actions';

describe('ui-overlay-signal-actions', () => {
  afterEach(() => {
    setModalVisible('settings', false);
    setProfileActionsState(true, true);
    hideCalibrationModal();
    setCalibrationProgress(0);
    setCalibrationStatus('Listening...');
  });

  it('updates overlay-related signal state', () => {
    setModalVisible('settings', true);
    setProfileActionsState(false, true);
    showCalibrationModal('Calibrating');
    setCalibrationProgress(35);
    setCalibrationStatus('Almost there');

    expect(modalVisibilitySignal.get().settings).toBe(true);
    expect(profileActionsSignal.get()).toEqual({ updateDisabled: false, deleteDisabled: true });
    expect(calibrationViewSignal.get()).toEqual({
      isVisible: true,
      progressPercent: 35,
      statusText: 'Almost there',
    });
  });
});
