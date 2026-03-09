import { dom, state } from '../state';
import { startListening, cancelCalibration, clearRetainedSessionTimelineFeedback } from '../logic';
import { displayStats, handleModeChange, redrawFretboard, updateInstrumentUI } from '../ui';
import { loadSettings, resetSavedSettings, resetStats, saveSettings } from '../storage';
import { setModalVisible, setResultMessage, showCalibrationModal } from '../ui-signals';
import { instruments } from '../instruments';
import { loadInstrumentSoundfont } from '../audio';
import { refreshAudioInputDeviceOptions } from '../audio-input-devices';
import {
  normalizeInputSource,
  refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices,
  setInputSourcePreference,
} from '../midi-runtime';
import { confirmUserAction } from '../user-feedback-port';
import { createSettingsModalLayoutController } from './settings-modal-layout-controller';
import { refreshMelodyOptionsForCurrentInstrument } from './session-controller';
import {
  applyAppUserDataSnapshot,
  buildAppUserDataSnapshot,
  formatAppUserDataSnapshotFileName,
  parseAppUserDataSnapshot,
} from '../user-data-transfer';
import {
  formatSessionAnalysisBundleFileName,
} from '../session-analysis-bundle';
import { ONBOARDING_COMPLETED_KEY } from '../app-storage-keys';
import { getDefaultTrainingModeForUiWorkflow, normalizeUiWorkflow } from '../training-workflows';
import { type ContextHelpTopic, getContextHelpContent } from '../context-help-content';

function downloadTextFile(fileName: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function registerModalControls() {
  const markOnboardingCompleted = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, '1');
    dom.workflowLearnNotesRecommendedBadge.classList.add('hidden');
    dom.practiceInputPresetRecommendedBadge.classList.add('hidden');
    dom.practiceTimingPresetRecommendedBadge.classList.add('hidden');
  };
  const isOnboardingCompleted = () => localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1';
  const closeOnboardingModal = () => setModalVisible('onboarding', false);
  const closeQuickHelpModal = () => setModalVisible('quickHelp', false);
  const openQuickHelpModal = (topic: ContextHelpTopic) => {
    const content = getContextHelpContent(topic);
    dom.quickHelpTitle.textContent = content.title;
    dom.quickHelpBody.innerHTML = '';
    content.body.forEach((paragraph) => {
      const node = document.createElement('p');
      node.textContent = paragraph;
      dom.quickHelpBody.appendChild(node);
    });
    setModalVisible('quickHelp', true);
  };
  const openOnboardingModal = () => {
    dom.onboardingInstrumentSelector.value = state.currentInstrument.name;
    dom.onboardingInputSource.value = state.inputSource;
    dom.onboardingGoal.value = state.uiWorkflow;
    dom.onboardingDirectInputMode.checked = state.isDirectInputMode;
    setModalVisible('onboarding', true);
  };
  const applyOnboardingSetup = async () => {
    const nextInstrument =
      instruments[dom.onboardingInstrumentSelector.value as keyof typeof instruments] ?? instruments.guitar;
    const instrumentChanged = nextInstrument.name !== state.currentInstrument.name;
    state.currentInstrument = nextInstrument;
    dom.instrumentSelector.value = nextInstrument.name;
    updateInstrumentUI(undefined, state.currentTuningPresetKey);
    refreshMelodyOptionsForCurrentInstrument();

    const nextInputSource = normalizeInputSource(dom.onboardingInputSource.value);
    setInputSourcePreference(nextInputSource);
    refreshInputSourceAvailabilityUi();
    await refreshAudioInputDeviceOptions();
    await refreshMidiInputDevices(true);

    state.isDirectInputMode = dom.onboardingDirectInputMode.checked;
    dom.micDirectInputMode.checked = state.isDirectInputMode;
    if (state.isDirectInputMode) {
      state.ignorePromptAudioUntilMs = 0;
    }

    const workflow = normalizeUiWorkflow(dom.onboardingGoal.value);
    dom.trainingMode.value = getDefaultTrainingModeForUiWorkflow(workflow);
    handleModeChange();
    redrawFretboard();

    if (instrumentChanged) {
      await loadInstrumentSoundfont(state.currentInstrument.name);
    }

    saveSettings();
    markOnboardingCompleted();
    closeOnboardingModal();
    setResultMessage('Quick start setup applied.', 'success');
  };

  // --- Settings Modal and its Children ---
  const settingsModalLayoutController = createSettingsModalLayoutController({
    settingsHubView: dom.settingsHubView,
    settingsSectionView: dom.settingsSectionView,
    settingsSectionTitle: dom.settingsSectionTitle,
    settingsSectionDescription: dom.settingsSectionDescription,
    settingsSectionAppDefaults: dom.settingsSectionAppDefaults,
    settingsSectionInputDetection: dom.settingsSectionInputDetection,
    settingsSectionDiagnostics: dom.settingsSectionDiagnostics,
    settingsSectionRhythm: dom.settingsSectionRhythm,
    settingsSectionProfiles: dom.settingsSectionProfiles,
    settingsSectionTools: dom.settingsSectionTools,
    settingsSectionMelodyLibrary: dom.settingsSectionMelodyLibrary,
  });
  const mountDiagnosticsControls = () => {
    const diagnosticsNodes = [
      dom.micAttackFilterRow,
      dom.micHoldFilterRow,
      dom.micPolyphonicDetectorRow,
      dom.micNoiseGateInfo,
      dom.micPolyphonicActionsRow,
      dom.micPolyphonicBenchmarkInfo,
    ];
    diagnosticsNodes.forEach((node) => {
      if (node.parentElement !== dom.settingsDiagnosticsSlot) {
        dom.settingsDiagnosticsSlot.appendChild(node);
      }
    });
  };
  mountDiagnosticsControls();
  const closeSettingsModal = () => {
    settingsModalLayoutController.showHub();
    setModalVisible('settings', false);
  };

  dom.openSessionSummaryBtn.addEventListener('click', () => {
    if (!state.lastSessionStats) {
      setResultMessage('No session summary yet. Finish a session first.');
      return;
    }
    closeSettingsModal();
    setModalVisible('sessionSummary', true);
  });
  dom.openHelpBtn.addEventListener('click', () => {
    closeSettingsModal();
    setModalVisible('help', true);
  });
  dom.closeHelpBtn.addEventListener('click', () => setModalVisible('help', false));
  dom.helpModal.addEventListener('click', (e) => {
    if (e.target === dom.helpModal) setModalVisible('help', false);
  });
  dom.closeQuickHelpBtn.addEventListener('click', closeQuickHelpModal);
  dom.quickHelpDoneBtn.addEventListener('click', closeQuickHelpModal);
  dom.quickHelpModal.addEventListener('click', (e) => {
    if (e.target === dom.quickHelpModal) closeQuickHelpModal();
  });
  dom.quickHelpOpenGuideBtn.addEventListener('click', () => {
    closeQuickHelpModal();
    setModalVisible('guide', true);
  });
  dom.startSessionHelpBtn.addEventListener('click', () => openQuickHelpModal('start-session'));
  dom.inputSourceHelpBtn.addEventListener('click', () => openQuickHelpModal('input-source'));
  dom.melodyLibraryHelpBtn.addEventListener('click', () => openQuickHelpModal('melody-library'));
  dom.workflowPerformHelpBtn.addEventListener('click', () => openQuickHelpModal('perform-workflow'));
  dom.closeOnboardingBtn.addEventListener('click', () => {
    markOnboardingCompleted();
    closeOnboardingModal();
  });
  dom.onboardingSkipBtn.addEventListener('click', () => {
    markOnboardingCompleted();
    closeOnboardingModal();
  });
  dom.onboardingFinishBtn.addEventListener('click', async () => {
    await applyOnboardingSetup();
  });
  dom.onboardingModal.addEventListener('click', (e) => {
    if (e.target === dom.onboardingModal) {
      markOnboardingCompleted();
      closeOnboardingModal();
    }
  });

  dom.settingsBtn.addEventListener('click', () => {
    refreshInputSourceAvailabilityUi();
    void refreshAudioInputDeviceOptions();
    void refreshMidiInputDevices(true);
    settingsModalLayoutController.showHub();
    setModalVisible('settings', true);
  });

  dom.closeSettingsBtn.addEventListener('click', closeSettingsModal);

  dom.settingsModal.addEventListener('click', (e) => {
    if (e.target === dom.settingsModal) closeSettingsModal();
  });
  dom.settingsSectionBackBtn.addEventListener('click', () => settingsModalLayoutController.showHub());
  dom.settingsOpenOnboardingBtn.addEventListener('click', () => {
    closeSettingsModal();
    openOnboardingModal();
  });
  dom.settingsOpenAppDefaultsBtn.addEventListener('click', () =>
    settingsModalLayoutController.openSection('appDefaults')
  );
  dom.settingsOpenInputDetectionBtn.addEventListener('click', () =>
    settingsModalLayoutController.openSection('inputDetection')
  );
  dom.settingsOpenDiagnosticsBtn.addEventListener('click', () =>
    settingsModalLayoutController.openSection('diagnostics')
  );
  dom.settingsOpenRhythmBtn.addEventListener('click', () =>
    settingsModalLayoutController.openSection('rhythm')
  );
  dom.settingsOpenProfilesBtn.addEventListener('click', () =>
    settingsModalLayoutController.openSection('profiles')
  );
  dom.settingsOpenToolsBtn.addEventListener('click', () => settingsModalLayoutController.openSection('tools'));
  dom.settingsOpenMelodyLibraryBtn.addEventListener('click', () =>
    settingsModalLayoutController.openSection('melodyLibrary')
  );
  dom.openUserDataBtn.addEventListener('click', () => {
    closeSettingsModal();
    setModalVisible('userData', true);
  });
  dom.closeUserDataBtn.addEventListener('click', () => setModalVisible('userData', false));
  dom.userDataModal.addEventListener('click', (e) => {
    if (e.target === dom.userDataModal) setModalVisible('userData', false);
  });
  function maybeAutoExportSessionAnalysisBundle() {
    const bundle = state.lastSessionAnalysisBundle;
    if (!bundle) return;
    const autoDownloadKey = bundle.generatedAtIso;
    if (state.lastSessionAnalysisAutoDownloadKey === autoDownloadKey) return;
    downloadTextFile(
      formatSessionAnalysisBundleFileName(),
      `${JSON.stringify(bundle, null, 2)}\n`,
      'application/json'
    );
    state.lastSessionAnalysisAutoDownloadKey = autoDownloadKey;
    setResultMessage('Session analysis bundle saved.', 'success');
  }

  const closeSessionSummaryModal = () => {
    maybeAutoExportSessionAnalysisBundle();
    clearRetainedSessionTimelineFeedback();
    setModalVisible('sessionSummary', false);
  };
  dom.closeSessionSummaryBtn.addEventListener('click', closeSessionSummaryModal);
  dom.closeSummaryFooterBtn.addEventListener('click', closeSessionSummaryModal);
  dom.sessionSummaryModal.addEventListener('click', (e) => {
    if (e.target === dom.sessionSummaryModal) closeSessionSummaryModal();
  });
  dom.openSummaryStatsBtn.addEventListener('click', () => {
    closeSessionSummaryModal();
    displayStats();
    setModalVisible('stats', true);
  });

  dom.openCalibrateBtn.addEventListener('click', async () => {
    closeSettingsModal();
    showCalibrationModal('Listening...');
    if (!(await startListening(true))) {
      cancelCalibration();
    }
  });
  dom.cancelCalibrationBtn.addEventListener('click', cancelCalibration);

  dom.openStatsBtn.addEventListener('click', () => {
    closeSettingsModal();
    displayStats();
    setModalVisible('stats', true);
  });
  dom.closeStatsBtn.addEventListener('click', () => setModalVisible('stats', false));
  dom.statsModal.addEventListener('click', (e) => {
    if (e.target === dom.statsModal) setModalVisible('stats', false);
  });
  dom.resetStatsBtn.addEventListener('click', async () => {
    const shouldReset = await confirmUserAction(
      'Are you sure you want to reset all your statistics? This cannot be undone.'
    );
    if (!shouldReset) return;
    resetStats();
    displayStats(); // Re-display the cleared stats
  });
  dom.repeatLastSessionBtn.addEventListener('click', () => {
    const lastSession = state.lastSessionStats;
    if (!lastSession) {
      setResultMessage('No last session setup is available yet.');
      return;
    }
    if (state.isListening) {
      setResultMessage('Stop the current session before applying a saved setup.', 'error');
      return;
    }

    const targetInstrument = instruments[lastSession.instrumentName as keyof typeof instruments];
    if (targetInstrument) {
      state.currentInstrument = targetInstrument;
      dom.instrumentSelector.value = targetInstrument.name;
      const compatibleEnabledStrings = lastSession.enabledStrings.filter((stringName) =>
        targetInstrument.STRING_ORDER.includes(stringName)
      );
      const requestedTuningPresetKey =
        typeof lastSession.tuningPresetKey === 'string' && lastSession.tuningPresetKey.length > 0
          ? lastSession.tuningPresetKey
          : state.currentTuningPresetKey;
      updateInstrumentUI(compatibleEnabledStrings, requestedTuningPresetKey);
    }

    dom.curriculumPreset.value = 'custom';
    dom.startFret.value = String(lastSession.minFret);
    dom.endFret.value = String(lastSession.maxFret);
    const matchingModeOption = [...dom.trainingMode.options].find(
      (option) => option.value === lastSession.modeKey && !option.disabled
    );
    dom.trainingMode.value = matchingModeOption ? lastSession.modeKey : 'random';

    handleModeChange();
    redrawFretboard();
    saveSettings();
    setModalVisible('stats', false);
    setResultMessage(
      `Restored last session setup (${lastSession.modeLabel}, frets ${lastSession.minFret}-${lastSession.maxFret}).`
    );
  });
  dom.practiceWeakSpotsBtn.addEventListener('click', () => {
    dom.trainingMode.value = 'adaptive';
    dom.sessionGoal.value = 'correct_20';
    dom.showAllNotes.checked = false;
    state.showingAllNotes = false;

    handleModeChange();
    redrawFretboard();
    saveSettings();
    setModalVisible('stats', false);
    setResultMessage('Configured Practice Weak Spots (goal: 20 correct).');
  });

  dom.openGuideBtn.addEventListener('click', () => {
    setModalVisible('help', false);
    setModalVisible('guide', true);
  });
  dom.closeGuideBtn.addEventListener('click', () => setModalVisible('guide', false));
  dom.guideModal.addEventListener('click', (e) => {
    if (e.target === dom.guideModal) setModalVisible('guide', false);
  });

  dom.openLinksBtn.addEventListener('click', () => {
    setModalVisible('help', false);
    setModalVisible('links', true);
  });
  dom.closeLinksBtn.addEventListener('click', () => setModalVisible('links', false));
  dom.linksModal.addEventListener('click', (e) => {
    if (e.target === dom.linksModal) setModalVisible('links', false);
  });

  dom.resetSavedSettingsBtn.addEventListener('click', async () => {
    if (state.isListening) {
      setResultMessage('Stop the current session before resetting saved settings.', 'error');
      return;
    }

    const shouldReset = await confirmUserAction(
      'Reset saved settings and profiles to defaults? Statistics and custom melodies will be kept.'
    );
    if (!shouldReset) return;

    resetSavedSettings();
    await loadSettings();
    refreshMelodyOptionsForCurrentInstrument();
    setResultMessage('Saved settings were reset to defaults.', 'success');
  });

  dom.exportUserDataBtn.addEventListener('click', () => {
    const exportedAtMs = Date.now();
    const snapshot = buildAppUserDataSnapshot(localStorage, exportedAtMs);
    downloadTextFile(
      formatAppUserDataSnapshotFileName(exportedAtMs),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      'application/json'
    );
    setResultMessage('User data exported.', 'success');
  });

  dom.importUserDataBtn.addEventListener('click', () => {
    dom.importUserDataFileInput.click();
  });

  dom.importUserDataFileInput.addEventListener('change', async () => {
    const file = dom.importUserDataFileInput.files?.[0];
    dom.importUserDataFileInput.value = '';
    if (!file) return;
    if (state.isListening) {
      setResultMessage('Stop the current session before importing user data.', 'error');
      return;
    }

    const shouldImport = await confirmUserAction(
      'Importing user data will overwrite current saved settings, profiles, stats, and custom melodies. Continue?'
    );
    if (!shouldImport) return;

    try {
      const text = await file.text();
      const snapshot = parseAppUserDataSnapshot(text);
      applyAppUserDataSnapshot(snapshot, localStorage);
      setResultMessage('User data imported. Reloading app...', 'success');
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import user data.';
      setResultMessage(message, 'error');
    }
  });

  if (!isOnboardingCompleted()) {
    openOnboardingModal();
  }
}


