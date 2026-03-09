import { beforeEach, describe, expect, it, vi } from 'vitest';

type ListenerMap = Record<string, (event?: unknown) => unknown>;

function createEventTargetStub() {
  const listeners: ListenerMap = {};
  const stub = {
    listeners,
    addEventListener: vi.fn((type: string, handler: (event?: unknown) => unknown) => {
      listeners[type] = handler;
    }),
    appendChild: vi.fn((child: { parentElement?: unknown }) => {
      if (child && typeof child === 'object') {
        child.parentElement = stub;
      }
      return child;
    }),
  };
  return stub;
}

function createClassListStub() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    contains: vi.fn(() => false),
  };
}

const locationReload = vi.fn();
const mockLocation = { reload: locationReload };

const harness = vi.hoisted(() => {
  const clearRetainedSessionTimelineFeedback = vi.fn();
  const dom = {
    onboardingModal: createEventTargetStub(),
    closeOnboardingBtn: createEventTargetStub(),
    onboardingInstrumentSelector: { value: 'guitar' } as HTMLSelectElement,
    onboardingInputSource: { value: 'microphone' } as HTMLSelectElement,
    onboardingGoal: { value: 'study-melody' } as HTMLSelectElement,
    onboardingDirectInputMode: { checked: false } as HTMLInputElement,
    onboardingFinishBtn: createEventTargetStub(),
    onboardingSkipBtn: createEventTargetStub(),
    settingsBtn: createEventTargetStub(),
    closeSettingsBtn: createEventTargetStub(),
    settingsModal: createEventTargetStub(),
    settingsHubView: createEventTargetStub(),
    settingsSectionView: createEventTargetStub(),
    settingsSectionTitle: { textContent: '' } as HTMLElement,
    settingsSectionDescription: { textContent: '' } as HTMLElement,
    settingsSectionBackBtn: createEventTargetStub(),
    settingsOpenAppDefaultsBtn: createEventTargetStub(),
    settingsOpenOnboardingBtn: createEventTargetStub(),
    settingsOpenInputDetectionBtn: createEventTargetStub(),
    settingsOpenDiagnosticsBtn: createEventTargetStub(),
    settingsOpenRhythmBtn: createEventTargetStub(),
    settingsOpenProfilesBtn: createEventTargetStub(),
    settingsOpenToolsBtn: createEventTargetStub(),
    settingsOpenMelodyLibraryBtn: createEventTargetStub(),
    settingsSectionAppDefaults: createEventTargetStub(),
    settingsSectionInputDetection: createEventTargetStub(),
    settingsSectionDiagnostics: createEventTargetStub(),
    settingsSectionRhythm: createEventTargetStub(),
    settingsSectionProfiles: createEventTargetStub(),
    settingsSectionTools: createEventTargetStub(),
    settingsSectionMelodyLibrary: createEventTargetStub(),
    settingsDiagnosticsSlot: createEventTargetStub(),
    openUserDataBtn: createEventTargetStub(),
    userDataModal: createEventTargetStub(),
    closeUserDataBtn: createEventTargetStub(),
    openCalibrateBtn: createEventTargetStub(),
    cancelCalibrationBtn: createEventTargetStub(),
    sessionSummaryModal: createEventTargetStub(),
    closeSessionSummaryBtn: createEventTargetStub(),
    sessionSummaryMode: { textContent: '' } as HTMLElement,
    sessionSummaryInput: { textContent: '', title: '' } as unknown as HTMLElement,
    sessionSummaryDuration: { textContent: '' } as HTMLElement,
    sessionSummaryAccuracy: { textContent: '' } as HTMLElement,
    sessionSummaryCorrect: { textContent: '' } as HTMLElement,
    sessionSummaryWrong: { textContent: '' } as HTMLElement,
    sessionSummaryTimingAccuracy: { textContent: '' } as HTMLElement,
    sessionSummaryTimingOffset: { textContent: '' } as HTMLElement,
    sessionSummaryTimingBreakdown: { textContent: '' } as HTMLElement,
    sessionSummaryAvgTime: { textContent: '' } as HTMLElement,
    sessionSummaryBestStreak: { textContent: '' } as HTMLElement,
    sessionSummaryCoachTip: { textContent: '' } as HTMLElement,
    sessionSummaryWeakSpots: { innerHTML: '', appendChild: vi.fn() } as unknown as HTMLElement,
    openSummaryStatsBtn: createEventTargetStub(),
    closeSummaryFooterBtn: createEventTargetStub(),
    openStatsBtn: createEventTargetStub(),
    openSessionSummaryBtn: createEventTargetStub(),
    openHelpBtn: createEventTargetStub(),
    quickHelpModal: createEventTargetStub(),
    closeQuickHelpBtn: createEventTargetStub(),
    quickHelpTitle: { textContent: '' } as HTMLElement,
    quickHelpBody: { innerHTML: '', appendChild: vi.fn() } as unknown as HTMLElement,
    quickHelpOpenGuideBtn: createEventTargetStub(),
    quickHelpDoneBtn: createEventTargetStub(),
    closeStatsBtn: createEventTargetStub(),
    statsModal: createEventTargetStub(),
    resetStatsBtn: createEventTargetStub(),
    repeatLastSessionBtn: createEventTargetStub(),
    practiceWeakSpotsBtn: createEventTargetStub(),
    helpModal: createEventTargetStub(),
    closeHelpBtn: createEventTargetStub(),
    openGuideBtn: createEventTargetStub(),
    closeGuideBtn: createEventTargetStub(),
    guideModal: createEventTargetStub(),
    openLinksBtn: createEventTargetStub(),
    closeLinksBtn: createEventTargetStub(),
    linksModal: createEventTargetStub(),
    startSessionHelpBtn: createEventTargetStub(),
    inputSourceHelpBtn: createEventTargetStub(),
    melodyLibraryHelpBtn: createEventTargetStub(),
    workflowPerformHelpBtn: createEventTargetStub(),
    workflowLearnNotesRecommendedBadge: { classList: createClassListStub() } as unknown as HTMLElement,
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
    melodyStudyStart: { value: '1' } as HTMLInputElement,
    melodyStudyEnd: { value: '8' } as HTMLInputElement,
    melodyDemoBpm: { value: '90' } as HTMLInputElement,
    melodySelector: { value: 'melody-1' } as HTMLSelectElement,
    audioInputDevice: {
      selectedOptions: [{ textContent: 'Default microphone' }],
    } as unknown as HTMLSelectElement,
    practiceInputPresetRecommendedBadge: { classList: createClassListStub() } as unknown as HTMLElement,
    practiceTimingPresetRecommendedBadge: { classList: createClassListStub() } as unknown as HTMLElement,
    midiInputDevice: {
      selectedOptions: [{ textContent: 'Default midi' }],
    } as unknown as HTMLSelectElement,
    micDirectInputMode: { checked: false } as HTMLInputElement,
    micAttackFilterRow: createEventTargetStub(),
    micHoldFilterRow: createEventTargetStub(),
    micPolyphonicDetectorRow: createEventTargetStub(),
    micNoiseGateInfo: createEventTargetStub(),
    micPolyphonicActionsRow: createEventTargetStub(),
    micPolyphonicBenchmarkInfo: createEventTargetStub(),
  };

  return {
    dom,
    state: {
      isListening: false,
      lastSessionStats: null,
      lastSessionPerformanceNoteLog: null,
      lastSessionAnalysisBundle: null,
      lastSessionAnalysisAutoDownloadKey: null,
      currentInstrument: { name: 'guitar', STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
      currentTuningPresetKey: 'standard',
      uiWorkflow: 'learn-notes',
      showingAllNotes: false,
      inputSource: 'microphone',
      isDirectInputMode: false,
      ignorePromptAudioUntilMs: 0,
      micSensitivityPreset: 'normal',
      micNoteAttackFilterPreset: 'balanced',
      micNoteHoldFilterPreset: '80ms',
      micPolyphonicDetectorProvider: 'spectrum',
      performanceMicTolerancePreset: 'normal',
      performanceTimingLeniencyPreset: 'normal',
      performanceMicLatencyCompensationMs: 0,
      performanceTimingBiasMs: 0,
      micLastInputRms: 0,
      micLastMonophonicConfidence: null,
      micLastMonophonicPitchSpreadCents: null,
      micPerformanceSuggestedLatencyMs: null,
      micPerformanceJudgmentCount: 0,
      micPerformanceJudgmentTotalLatencyMs: 0,
      micPerformanceJudgmentLastLatencyMs: null,
      micPerformanceOnsetRejectedWeakAttackCount: 0,
      micPerformanceOnsetRejectedLowConfidenceCount: 0,
      micPerformanceOnsetRejectedLowVoicingCount: 0,
      micPerformanceOnsetRejectedShortHoldCount: 0,
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
    setInputSourcePreference: vi.fn(),
    loadInstrumentSoundfont: vi.fn(async () => {}),
    refreshMelodyOptionsForCurrentInstrument: vi.fn(),
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
    settingsModalLayoutShowHub: vi.fn(),
    settingsModalLayoutOpenSection: vi.fn(),
    clearRetainedSessionTimelineFeedback,
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
  clearRetainedSessionTimelineFeedback: harness.clearRetainedSessionTimelineFeedback,
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
    ukulele: { name: 'ukulele', STRING_ORDER: ['G', 'C', 'E', 'A'] },
  },
}));

vi.mock('../audio', () => ({
  loadInstrumentSoundfont: harness.loadInstrumentSoundfont,
}));

vi.mock('../audio-input-devices', () => ({
  refreshAudioInputDeviceOptions: harness.refreshAudioInputDeviceOptions,
}));

vi.mock('../midi-runtime', () => ({
  normalizeInputSource: (value: unknown) => (value === 'midi' ? 'midi' : 'microphone'),
  refreshInputSourceAvailabilityUi: harness.refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices: harness.refreshMidiInputDevices,
  setInputSourcePreference: harness.setInputSourcePreference,
}));

vi.mock('./session-controller', () => ({
  refreshMelodyOptionsForCurrentInstrument: harness.refreshMelodyOptionsForCurrentInstrument,
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

vi.mock('./settings-modal-layout-controller', () => ({
  createSettingsModalLayoutController: vi.fn(() => ({
    showHub: harness.settingsModalLayoutShowHub,
    openSection: harness.settingsModalLayoutOpenSection,
  })),
}));

import { registerModalControls } from './modal-controller';

describe('modal-controller', () => {
  beforeEach(() => {
    harness.state.isListening = false;
    harness.state.uiWorkflow = 'learn-notes';
    harness.state.inputSource = 'microphone';
    harness.state.isDirectInputMode = false;
    harness.state.ignorePromptAudioUntilMs = 0;
    harness.dom.onboardingInstrumentSelector.value = 'guitar';
    harness.dom.onboardingInputSource.value = 'microphone';
    harness.dom.onboardingGoal.value = 'study-melody';
    harness.dom.onboardingDirectInputMode.checked = false;
    harness.confirmUserAction.mockResolvedValue(true);
    harness.loadSettings.mockClear();
    harness.resetSavedSettings.mockClear();
    harness.setResultMessage.mockClear();
    harness.setModalVisible.mockClear();
    harness.buildAppUserDataSnapshot.mockClear();
    harness.parseAppUserDataSnapshot.mockClear();
    harness.applyAppUserDataSnapshot.mockClear();
    harness.settingsModalLayoutShowHub.mockClear();
    harness.settingsModalLayoutOpenSection.mockClear();
    harness.refreshMelodyOptionsForCurrentInstrument.mockClear();
    harness.refreshAudioInputDeviceOptions.mockClear();
    harness.refreshMidiInputDevices.mockClear();
    harness.setInputSourcePreference.mockClear();
    harness.loadInstrumentSoundfont.mockClear();
    harness.updateInstrumentUI.mockClear();
    harness.handleModeChange.mockClear();
    harness.saveSettings.mockClear();
    harness.dom.importUserDataFileInput.files = null;
    harness.dom.importUserDataFileInput.value = '';
    locationReload.mockClear();
    (localStorage.getItem as unknown as { mockReset?: () => void; mockReturnValue?: (value: string | null) => void })
      .mockReset?.();
    (localStorage.getItem as unknown as { mockReturnValue?: (value: string | null) => void }).mockReturnValue?.(null);
    (localStorage.setItem as unknown as { mockClear?: () => void }).mockClear?.();
    (URL.createObjectURL as unknown as { mockClear?: () => void }).mockClear?.();
  });

  it('opens settings in section-hub mode', async () => {
    registerModalControls();

    await harness.dom.settingsBtn.listeners.click?.();

    expect(harness.settingsModalLayoutShowHub).toHaveBeenCalledTimes(1);
    expect(harness.setModalVisible).toHaveBeenCalledWith('settings', true);
  });

  it('opens quick start onboarding on first launch', () => {
    registerModalControls();

    expect(harness.setModalVisible).toHaveBeenCalledWith('onboarding', true);
  });

  it('applies quick start setup and persists onboarding completion', async () => {
    registerModalControls();
    harness.dom.onboardingInstrumentSelector.value = 'ukulele';
    harness.dom.onboardingInputSource.value = 'midi';
    harness.dom.onboardingGoal.value = 'perform';
    harness.dom.onboardingDirectInputMode.checked = true;

    await harness.dom.onboardingFinishBtn.listeners.click?.();

    expect(harness.updateInstrumentUI).toHaveBeenCalledTimes(1);
    expect(harness.setInputSourcePreference).toHaveBeenCalledWith('midi');
    expect(harness.handleModeChange).toHaveBeenCalledTimes(1);
    expect(harness.saveSettings).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith('fretboardTrainer.onboardingCompleted.v1', '1');
    expect(harness.setModalVisible).toHaveBeenCalledWith('onboarding', false);
  });

  it('opens the requested settings section from the hub', async () => {
    registerModalControls();

    await harness.dom.settingsOpenToolsBtn.listeners.click?.();

    expect(harness.settingsModalLayoutOpenSection).toHaveBeenCalledWith('tools');
  });

  it('opens contextual quick help and can route to the full guide', async () => {
    registerModalControls();

    await harness.dom.startSessionHelpBtn.listeners.click?.();
    expect(harness.setModalVisible).toHaveBeenCalledWith('quickHelp', true);
    expect(harness.dom.quickHelpTitle.textContent).toBe('Main Action');

    await harness.dom.quickHelpOpenGuideBtn.listeners.click?.();
    expect(harness.setModalVisible).toHaveBeenCalledWith('quickHelp', false);
    expect(harness.setModalVisible).toHaveBeenCalledWith('guide', true);
  });

  it('opens the diagnostics settings section from the hub', async () => {
    registerModalControls();

    await harness.dom.settingsOpenDiagnosticsBtn.listeners.click?.();

    expect(harness.settingsModalLayoutOpenSection).toHaveBeenCalledWith('diagnostics');
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

  it('opens user data tools from app settings', async () => {
    registerModalControls();

    await harness.dom.openUserDataBtn.listeners.click?.();

    expect(harness.setModalVisible).toHaveBeenCalledWith('settings', false);
    expect(harness.setModalVisible).toHaveBeenCalledWith('userData', true);
  });

  it('opens help from settings tools and routes into the guide modal', async () => {
    registerModalControls();

    await harness.dom.openHelpBtn.listeners.click?.();
    await harness.dom.openGuideBtn.listeners.click?.();

    expect(harness.setModalVisible).toHaveBeenCalledWith('settings', false);
    expect(harness.setModalVisible).toHaveBeenCalledWith('help', true);
    expect(harness.setModalVisible).toHaveBeenCalledWith('help', false);
    expect(harness.setModalVisible).toHaveBeenCalledWith('guide', true);
  });

  it('opens full stats from the session summary modal', async () => {
    registerModalControls();

    await harness.dom.openSummaryStatsBtn.listeners.click?.();

    expect(harness.setModalVisible).toHaveBeenCalledWith('sessionSummary', false);
    expect(harness.displayStats).toHaveBeenCalledTimes(1);
    expect(harness.setModalVisible).toHaveBeenCalledWith('stats', true);
  });

  it('auto-exports session analysis bundle from session summary', async () => {
    registerModalControls();
    harness.state.lastSessionAnalysisBundle = {
      schemaVersion: 1,
      generatedAtIso: '2026-03-05T10:00:00.000Z',
      sessionStats: null,
      performanceNoteLog: null,
      performanceFeedbackByEvent: {},
      performanceTimingByEvent: {},
      performanceOnsetRejectsByEvent: {},
      performanceCaptureTelemetryByEvent: {},
      context: {
        selectedMelodyId: 'melody-1',
        melodyTempoBpm: 90,
        melodyStudyRange: { startIndex: 0, endIndex: 7 },
        inputSource: 'microphone',
        inputDeviceLabel: 'Default microphone',
        isDirectInputMode: false,
        micSensitivityPreset: 'normal',
        micNoteAttackFilterPreset: 'balanced',
        micNoteHoldFilterPreset: '80ms',
        micPolyphonicDetectorProvider: 'spectrum',
        performanceMicTolerancePreset: 'normal',
        performanceTimingLeniencyPreset: 'normal',
        performanceMicLatencyCompensationMs: 0,
        performanceTimingBiasMs: 0,
        activeAudioTrack: {
          requestedContentHint: null,
          appliedContentHint: null,
          settings: {
            sampleRate: null,
            channelCount: null,
            echoCancellation: null,
            noiseSuppression: null,
            autoGainControl: null,
          },
        },
      },
      diagnostics: {
        micLastInputRms: 0,
        micLastMonophonicConfidence: null,
        micLastMonophonicPitchSpreadCents: null,
        micPerformanceSuggestedLatencyMs: null,
        micPerformanceJudgmentCount: 0,
        micPerformanceJudgmentAvgLatencyMs: null,
        micPerformanceJudgmentLastLatencyMs: null,
        micPerformanceOnsetRejected: {
          weakAttack: 0,
          lowConfidence: 0,
          lowVoicing: 0,
          shortHold: 0,
        },
        micPerformanceOnsetGate: {
          status: 'idle',
          reason: null,
          atMs: null,
        },
        micPolyphonicTelemetry: {
          frames: 0,
          totalLatencyMs: 0,
          maxLatencyMs: 0,
          lastLatencyMs: null,
          fallbackFrames: 0,
          warningFrames: 0,
          providerUsed: null,
          fallbackFrom: null,
          warning: null,
          windowStartedAtMs: 0,
        },
      },
    };
    harness.state.lastSessionStats = {
      modeKey: 'performance',
      modeLabel: 'Performance (Full Run)',
      startedAtMs: 1,
      endedAtMs: 2,
      instrumentName: 'guitar',
      tuningPresetKey: 'standard',
      inputSource: 'microphone',
      inputDeviceLabel: 'Default microphone',
      stringOrder: [],
      enabledStrings: [],
      minFret: 0,
      maxFret: 12,
      totalAttempts: 10,
      correctAttempts: 7,
      performanceWrongAttempts: 2,
      performanceMissedNoInputAttempts: 1,
      totalTime: 0,
      currentCorrectStreak: 0,
      bestCorrectStreak: 0,
      noteStats: {},
      targetZoneStats: {},
      rhythmStats: {
        totalJudged: 0,
        onBeat: 0,
        early: 0,
        late: 0,
        totalAbsOffsetMs: 0,
        bestAbsOffsetMs: null,
      },
      performanceTimingStats: {
        totalGraded: 0,
        perfect: 0,
        aBitEarly: 0,
        early: 0,
        tooEarly: 0,
        aBitLate: 0,
        late: 0,
        tooLate: 0,
        weightedScoreTotal: 0,
        totalAbsOffsetMs: 0,
      },
    };

    await harness.dom.closeSessionSummaryBtn.listeners.click?.();

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(harness.setResultMessage).toHaveBeenCalledWith('Session analysis bundle saved.', 'success');
  });

  it('does not auto-export bundle when there is no last session stats', async () => {
    registerModalControls();
    harness.state.lastSessionStats = null;
    harness.state.lastSessionAnalysisBundle = null;

    await harness.dom.closeSessionSummaryBtn.listeners.click?.();

    expect(harness.setResultMessage).not.toHaveBeenCalledWith('Session analysis bundle saved.', 'success');
  });

  it('opens session summary from settings tools when last-session data exists', async () => {
    registerModalControls();
    harness.state.lastSessionStats = { modeKey: 'performance' };

    await harness.dom.openSessionSummaryBtn.listeners.click?.();

    expect(harness.setModalVisible).toHaveBeenCalledWith('settings', false);
    expect(harness.setModalVisible).toHaveBeenCalledWith('sessionSummary', true);
  });

  it('shows a hint when session summary is requested before any finished session', async () => {
    registerModalControls();
    harness.state.lastSessionStats = null;

    await harness.dom.openSessionSummaryBtn.listeners.click?.();

    expect(harness.setResultMessage).toHaveBeenCalledWith(
      'No session summary yet. Finish a session first.'
    );
  });

  it('clears saved settings and reloads defaults after confirmation', async () => {
    registerModalControls();

    await harness.dom.resetSavedSettingsBtn.listeners.click?.();

    expect(harness.confirmUserAction).toHaveBeenCalledWith(
      'Reset saved settings and profiles to defaults? Statistics and custom melodies will be kept.'
    );
    expect(harness.resetSavedSettings).toHaveBeenCalledTimes(1);
    expect(harness.loadSettings).toHaveBeenCalledTimes(1);
    expect(harness.refreshMelodyOptionsForCurrentInstrument).toHaveBeenCalledTimes(1);
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


