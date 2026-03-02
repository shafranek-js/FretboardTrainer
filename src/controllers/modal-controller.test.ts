import { beforeEach, describe, expect, it, vi } from 'vitest';

type ListenerMap = Record<string, (event?: unknown) => unknown>;

function createEventTargetStub() {
  const listeners: ListenerMap = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: (event?: unknown) => unknown) => {
      listeners[type] = handler;
    }),
  };
}

const locationReload = vi.fn();
const mockLocation = { reload: locationReload };

const harness = vi.hoisted(() => {
  const dom = {
    settingsBtn: createEventTargetStub(),
    closeSettingsBtn: createEventTargetStub(),
    settingsModal: createEventTargetStub(),
    openCalibrateBtn: createEventTargetStub(),
    cancelCalibrationBtn: createEventTargetStub(),
    openStatsBtn: createEventTargetStub(),
    closeStatsBtn: createEventTargetStub(),
    statsModal: createEventTargetStub(),
    resetStatsBtn: createEventTargetStub(),
    repeatLastSessionBtn: createEventTargetStub(),
    practiceWeakSpotsBtn: createEventTargetStub(),
    openGuideBtn: createEventTargetStub(),
    closeGuideBtn: createEventTargetStub(),
    guideModal: createEventTargetStub(),
    openLinksBtn: createEventTargetStub(),
    closeLinksBtn: createEventTargetStub(),
    linksModal: createEventTargetStub(),
    resetSavedSettingsBtn: createEventTargetStub(),
    exportUserDataBtn: createEventTargetStub(),
    importUserDataBtn: {
      ...createEventTargetStub(),
      click: vi.fn(),
    },
    importUserDataFileInput: {
      ...createEventTargetStub(),
      click: vi.fn(),
      files: null as FileList | null,
      value: '',
    },
    trainingMode: { value: 'random', options: [] } as unknown as HTMLSelectElement,
    sessionGoal: { value: 'none' } as HTMLSelectElement,
    showAllNotes: { checked: false } as HTMLInputElement,
    instrumentSelector: { value: 'guitar' } as HTMLSelectElement,
  };

  return {
    dom,
    state: {
      isListening: false,
      lastSessionStats: null,
      currentInstrument: { name: 'guitar', STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
      currentTuningPresetKey: 'standard',
      showingAllNotes: false,
    },
    startListening: vi.fn(),
    cancelCalibration: vi.fn(),
    displayStats: vi.fn(),
    handleModeChange: vi.fn(),
    redrawFretboard: vi.fn(),
    updateInstrumentUI: vi.fn(),
    resetStats: vi.fn(),
    saveSettings: vi.fn(),
    loadSettings: vi.fn(async () => {}),
    resetSavedSettings: vi.fn(),
    setModalVisible: vi.fn(),
    setResultMessage: vi.fn(),
    showCalibrationModal: vi.fn(),
    refreshAudioInputDeviceOptions: vi.fn(async () => {}),
    refreshInputSourceAvailabilityUi: vi.fn(),
    refreshMidiInputDevices: vi.fn(async () => {}),
    confirmUserAction: vi.fn(async () => true),
    buildAppUserDataSnapshot: vi.fn(() => ({
      type: 'fretflow-user-data',
      version: 1,
      exportedAtIso: '2026-03-02T12:00:00.000Z',
      payloads: {},
    })),
    formatAppUserDataSnapshotFileName: vi.fn(() => 'snapshot.json'),
    parseAppUserDataSnapshot: vi.fn(() => ({
      type: 'fretflow-user-data',
      version: 1,
      exportedAtIso: '2026-03-02T12:00:00.000Z',
      payloads: {},
    })),
    applyAppUserDataSnapshot: vi.fn(),
  };
});

vi.stubGlobal('location', mockLocation);
vi.stubGlobal('window', { location: mockLocation });
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});
vi.stubGlobal(
  'Blob',
  class {
    constructor(_parts?: unknown[], _options?: Record<string, unknown>) {}
  }
);
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
});
vi.stubGlobal('document', {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: vi.fn(),
      };
    }
    return {};
  }),
});

vi.mock('../state', () => ({
  dom: harness.dom,
  state: harness.state,
}));

vi.mock('../logic', () => ({
  startListening: harness.startListening,
  cancelCalibration: harness.cancelCalibration,
}));

vi.mock('../ui', () => ({
  displayStats: harness.displayStats,
  handleModeChange: harness.handleModeChange,
  redrawFretboard: harness.redrawFretboard,
  updateInstrumentUI: harness.updateInstrumentUI,
}));

vi.mock('../storage', () => ({
  resetStats: harness.resetStats,
  saveSettings: harness.saveSettings,
  loadSettings: harness.loadSettings,
  resetSavedSettings: harness.resetSavedSettings,
}));

vi.mock('../ui-signals', () => ({
  setModalVisible: harness.setModalVisible,
  setResultMessage: harness.setResultMessage,
  showCalibrationModal: harness.showCalibrationModal,
}));

vi.mock('../instruments', () => ({
  instruments: {
    guitar: { name: 'guitar', STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
  },
}));

vi.mock('../audio-input-devices', () => ({
  refreshAudioInputDeviceOptions: harness.refreshAudioInputDeviceOptions,
}));

vi.mock('../midi-runtime', () => ({
  refreshInputSourceAvailabilityUi: harness.refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices: harness.refreshMidiInputDevices,
}));

vi.mock('../user-feedback-port', () => ({
  confirmUserAction: harness.confirmUserAction,
}));

vi.mock('../user-data-transfer', () => ({
  buildAppUserDataSnapshot: harness.buildAppUserDataSnapshot,
  formatAppUserDataSnapshotFileName: harness.formatAppUserDataSnapshotFileName,
  parseAppUserDataSnapshot: harness.parseAppUserDataSnapshot,
  applyAppUserDataSnapshot: harness.applyAppUserDataSnapshot,
}));

import { registerModalControls } from './modal-controller';

describe('modal-controller', () => {
  beforeEach(() => {
    harness.state.isListening = false;
    harness.confirmUserAction.mockResolvedValue(true);
    harness.loadSettings.mockClear();
    harness.resetSavedSettings.mockClear();
    harness.setResultMessage.mockClear();
    harness.buildAppUserDataSnapshot.mockClear();
    harness.parseAppUserDataSnapshot.mockClear();
    harness.applyAppUserDataSnapshot.mockClear();
    harness.dom.importUserDataFileInput.files = null;
    harness.dom.importUserDataFileInput.value = '';
    locationReload.mockClear();
  });

  it('blocks resetting saved settings during an active session', async () => {
    registerModalControls();
    harness.state.isListening = true;

    await harness.dom.resetSavedSettingsBtn.listeners.click?.();

    expect(harness.setResultMessage).toHaveBeenCalledWith(
      'Stop the current session before resetting saved settings.',
      'error'
    );
    expect(harness.resetSavedSettings).not.toHaveBeenCalled();
    expect(harness.loadSettings).not.toHaveBeenCalled();
  });

  it('clears saved settings and reloads defaults after confirmation', async () => {
    registerModalControls();

    await harness.dom.resetSavedSettingsBtn.listeners.click?.();

    expect(harness.confirmUserAction).toHaveBeenCalledWith(
      'Reset saved settings and profiles to defaults? Statistics and custom melodies will be kept.'
    );
    expect(harness.resetSavedSettings).toHaveBeenCalledTimes(1);
    expect(harness.loadSettings).toHaveBeenCalledTimes(1);
    expect(harness.setResultMessage).toHaveBeenCalledWith('Saved settings were reset to defaults.', 'success');
  });

  it('exports user data as a json snapshot', async () => {
    registerModalControls();

    await harness.dom.exportUserDataBtn.listeners.click?.();

    expect(harness.buildAppUserDataSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.formatAppUserDataSnapshotFileName).toHaveBeenCalledTimes(1);
    expect(harness.setResultMessage).toHaveBeenCalledWith('User data exported.', 'success');
  });

  it('imports user data and reloads the app after confirmation', async () => {
    registerModalControls();
    harness.dom.importUserDataFileInput.files = [
      {
        text: vi.fn(async () => '{"type":"fretflow-user-data","version":1}'),
      },
    ] as unknown as FileList;

    await harness.dom.importUserDataFileInput.listeners.change?.();

    expect(harness.confirmUserAction).toHaveBeenCalledWith(
      'Importing user data will overwrite current saved settings, profiles, stats, and custom melodies. Continue?'
    );
    expect(harness.parseAppUserDataSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.applyAppUserDataSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.setResultMessage).toHaveBeenCalledWith('User data imported. Reloading app...', 'success');
    expect(locationReload).toHaveBeenCalledTimes(1);
  });
});
