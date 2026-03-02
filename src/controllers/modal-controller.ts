import { dom, state } from '../state';
import { startListening, cancelCalibration } from '../logic';
import { displayStats, handleModeChange, redrawFretboard, updateInstrumentUI } from '../ui';
import { loadSettings, resetSavedSettings, resetStats, saveSettings } from '../storage';
import { setModalVisible, setResultMessage, showCalibrationModal } from '../ui-signals';
import { instruments } from '../instruments';
import { refreshAudioInputDeviceOptions } from '../audio-input-devices';
import { refreshInputSourceAvailabilityUi, refreshMidiInputDevices } from '../midi-runtime';
import { confirmUserAction } from '../user-feedback-port';
import {
  applyAppUserDataSnapshot,
  buildAppUserDataSnapshot,
  formatAppUserDataSnapshotFileName,
  parseAppUserDataSnapshot,
} from '../user-data-transfer';

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
  // --- Settings Modal and its Children ---
  dom.settingsBtn.addEventListener('click', () => {
    refreshInputSourceAvailabilityUi();
    void refreshAudioInputDeviceOptions();
    void refreshMidiInputDevices(true);
    setModalVisible('settings', true);
  });

  dom.closeSettingsBtn.addEventListener('click', () => setModalVisible('settings', false));

  dom.settingsModal.addEventListener('click', (e) => {
    if (e.target === dom.settingsModal) setModalVisible('settings', false);
  });

  dom.openCalibrateBtn.addEventListener('click', async () => {
    setModalVisible('settings', false);
    showCalibrationModal('Listening...');
    if (!(await startListening(true))) {
      cancelCalibration();
    }
  });
  dom.cancelCalibrationBtn.addEventListener('click', cancelCalibration);

  dom.openStatsBtn.addEventListener('click', () => {
    setModalVisible('settings', false);
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
    setResultMessage('Configured Adaptive Practice for weak spots (goal: 20 correct).');
  });

  dom.openGuideBtn.addEventListener('click', () => {
    setModalVisible('settings', false);
    setModalVisible('guide', true);
  });
  dom.closeGuideBtn.addEventListener('click', () => setModalVisible('guide', false));
  dom.guideModal.addEventListener('click', (e) => {
    if (e.target === dom.guideModal) setModalVisible('guide', false);
  });

  dom.openLinksBtn.addEventListener('click', () => {
    setModalVisible('settings', false);
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
}
