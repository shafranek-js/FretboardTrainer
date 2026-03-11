import { describe, expect, it, vi } from 'vitest';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((value: string) => {
      classes.add(value);
    }),
    remove: vi.fn((value: string) => {
      classes.delete(value);
    }),
    toggle: vi.fn((value: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    }),
    contains: (value: string) => classes.has(value),
  };
}

function createElementStub() {
  return {
    classList: createClassListState(),
    style: { width: '' },
    textContent: '',
    disabled: false,
  };
}

const harness = vi.hoisted(() => ({
  dom: {
    onboardingModal: createElementStub(),
    settingsModal: createElementStub(),
    userDataModal: createElementStub(),
    helpModal: createElementStub(),
    quickHelpModal: createElementStub(),
    sessionSummaryModal: createElementStub(),
    statsModal: createElementStub(),
    guideModal: createElementStub(),
    linksModal: createElementStub(),
    profileNameModal: createElementStub(),
    melodyImportModal: createElementStub(),
    updateProfileBtn: createElementStub(),
    deleteProfileBtn: createElementStub(),
    calibrationProgress: createElementStub(),
    calibrationStatus: createElementStub(),
    calibrationModal: createElementStub(),
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

import {
  renderCalibrationView,
  renderModalVisibility,
  renderProfileActions,
  type ModalVisibilityState,
} from './ui-modal-views';

describe('ui-modal-views', () => {
  it('toggles hidden state for each modal from visibility map', () => {
    const visibility: ModalVisibilityState = {
      onboarding: true,
      settings: false,
      userData: true,
      help: false,
      quickHelp: true,
      sessionSummary: false,
      stats: true,
      guide: false,
      links: true,
      profileName: false,
      melodyImport: true,
    };

    renderModalVisibility(visibility);

    expect(harness.dom.onboardingModal.classList.contains('hidden')).toBe(false);
    expect(harness.dom.settingsModal.classList.contains('hidden')).toBe(true);
    expect(harness.dom.userDataModal.classList.contains('hidden')).toBe(false);
    expect(harness.dom.helpModal.classList.contains('hidden')).toBe(true);
    expect(harness.dom.quickHelpModal.classList.contains('hidden')).toBe(false);
    expect(harness.dom.sessionSummaryModal.classList.contains('hidden')).toBe(true);
    expect(harness.dom.statsModal.classList.contains('hidden')).toBe(false);
    expect(harness.dom.guideModal.classList.contains('hidden')).toBe(true);
    expect(harness.dom.linksModal.classList.contains('hidden')).toBe(false);
    expect(harness.dom.profileNameModal.classList.contains('hidden')).toBe(true);
    expect(harness.dom.melodyImportModal.classList.contains('hidden')).toBe(false);
  });

  it('updates profile action buttons', () => {
    renderProfileActions({ updateDisabled: true, deleteDisabled: false });

    expect(harness.dom.updateProfileBtn.disabled).toBe(true);
    expect(harness.dom.deleteProfileBtn.disabled).toBe(false);
  });

  it('renders calibration state with clamped progress and visibility', () => {
    renderCalibrationView({
      isVisible: true,
      progressPercent: 140,
      statusText: 'Listening...',
    });

    expect(harness.dom.calibrationProgress.style.width).toBe('100%');
    expect(harness.dom.calibrationStatus.textContent).toBe('Listening...');
    expect(harness.dom.calibrationModal.classList.contains('hidden')).toBe(false);

    renderCalibrationView({
      isVisible: false,
      progressPercent: -25,
      statusText: 'Done',
    });

    expect(harness.dom.calibrationProgress.style.width).toBe('0%');
    expect(harness.dom.calibrationStatus.textContent).toBe('Done');
    expect(harness.dom.calibrationModal.classList.contains('hidden')).toBe(true);
  });
});
