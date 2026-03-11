import { describe, expect, it } from 'vitest';
import {
  createVisibleCalibrationViewState,
  resolveNextCalibrationViewState,
  resolveNextModalVisibilityState,
  resolveNextProfileActionsState,
} from './ui-overlay-state';

describe('ui-overlay-state', () => {
  it('returns next modal visibility only when value changes', () => {
    const current = {
      onboarding: false,
      settings: false,
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

    expect(resolveNextModalVisibilityState(current, 'help', false)).toBeNull();
    expect(resolveNextModalVisibilityState(current, 'help', true)).toEqual({
      ...current,
      help: true,
    });
  });

  it('returns next profile actions state only when values change', () => {
    const current = { updateDisabled: true, deleteDisabled: false };

    expect(resolveNextProfileActionsState(current, true, false)).toBeNull();
    expect(resolveNextProfileActionsState(current, false, true)).toEqual({
      updateDisabled: false,
      deleteDisabled: true,
    });
  });

  it('merges calibration state and creates visible defaults', () => {
    const current = {
      isVisible: false,
      progressPercent: 0,
      statusText: 'Listening...',
    };

    expect(resolveNextCalibrationViewState(current, { isVisible: false })).toBeNull();
    expect(resolveNextCalibrationViewState(current, { progressPercent: 40 })).toEqual({
      isVisible: false,
      progressPercent: 40,
      statusText: 'Listening...',
    });
    expect(createVisibleCalibrationViewState('Calibrating')).toEqual({
      isVisible: true,
      progressPercent: 0,
      statusText: 'Calibrating',
    });
  });
});
