import {
  DEFAULT_STUDY_MELODY_MIC_TUNING,
  formatStudyMelodyMicAutoFrameValue,
  formatStudyMelodyMicPercent,
  formatStudyMelodyPreEmphasisFrequency,
  formatStudyMelodyPreEmphasisGain,
  normalizeStudyMelodyMicGatePercent,
  normalizeStudyMelodyMicNoiseGuardPercent,
  normalizeStudyMelodyMicSilenceResetFrames,
  normalizeStudyMelodyMicStableFrames,
  normalizeStudyMelodyPreEmphasisFrequencyHz,
  normalizeStudyMelodyPreEmphasisGainDb,
} from '../study-melody-mic-tuning';

interface StudyMelodyMicTuningControllerDom {
  studyMelodyMicTuningHost: HTMLElement;
  studyMelodyMicTuningToggleBtn: HTMLButtonElement;
  studyMelodyMicTuningPanel: HTMLElement;
  studyMelodyMicGatePercent: HTMLInputElement;
  studyMelodyMicGatePercentValue: HTMLElement;
  studyMelodyMicNoiseGuardPercent: HTMLInputElement;
  studyMelodyMicNoiseGuardPercentValue: HTMLElement;
  studyMelodyMicSilenceResetFrames: HTMLInputElement;
  studyMelodyMicSilenceResetFramesValue: HTMLElement;
  studyMelodyMicStableFrames: HTMLInputElement;
  studyMelodyMicStableFramesValue: HTMLElement;
  studyMelodyPreEmphasisFrequencyHz: HTMLInputElement;
  studyMelodyPreEmphasisFrequencyHzValue: HTMLElement;
  studyMelodyPreEmphasisGainDb: HTMLInputElement;
  studyMelodyPreEmphasisGainDbValue: HTMLElement;
  studyMelodyMicTuningResetBtn: HTMLButtonElement;
}

interface StudyMelodyMicTuningControllerState {
  preEmphasisFilter: BiquadFilterNode | null;
  studyMelodyMicGatePercent: number;
  studyMelodyMicNoiseGuardPercent: number;
  studyMelodyMicSilenceResetFrames: number;
  studyMelodyMicStableFrames: number;
  studyMelodyPreEmphasisFrequencyHz: number;
  studyMelodyPreEmphasisGainDb: number;
}

export interface StudyMelodyMicTuningControllerDeps {
  dom: StudyMelodyMicTuningControllerDom;
  state: StudyMelodyMicTuningControllerState;
  saveSettings: () => void;
}

export function createStudyMelodyMicTuningController(deps: StudyMelodyMicTuningControllerDeps) {
  function renderValues() {
    deps.dom.studyMelodyMicGatePercent.value = String(deps.state.studyMelodyMicGatePercent);
    deps.dom.studyMelodyMicGatePercentValue.textContent = formatStudyMelodyMicPercent(
      deps.state.studyMelodyMicGatePercent
    );
    deps.dom.studyMelodyMicNoiseGuardPercent.value = String(deps.state.studyMelodyMicNoiseGuardPercent);
    deps.dom.studyMelodyMicNoiseGuardPercentValue.textContent = formatStudyMelodyMicPercent(
      deps.state.studyMelodyMicNoiseGuardPercent
    );
    deps.dom.studyMelodyMicSilenceResetFrames.value = String(deps.state.studyMelodyMicSilenceResetFrames);
    deps.dom.studyMelodyMicSilenceResetFramesValue.textContent = formatStudyMelodyMicAutoFrameValue(
      deps.state.studyMelodyMicSilenceResetFrames
    );
    deps.dom.studyMelodyMicStableFrames.value = String(deps.state.studyMelodyMicStableFrames);
    deps.dom.studyMelodyMicStableFramesValue.textContent = formatStudyMelodyMicAutoFrameValue(
      deps.state.studyMelodyMicStableFrames
    );
    deps.dom.studyMelodyPreEmphasisFrequencyHz.value = String(deps.state.studyMelodyPreEmphasisFrequencyHz);
    deps.dom.studyMelodyPreEmphasisFrequencyHzValue.textContent = formatStudyMelodyPreEmphasisFrequency(
      deps.state.studyMelodyPreEmphasisFrequencyHz
    );
    deps.dom.studyMelodyPreEmphasisGainDb.value = String(deps.state.studyMelodyPreEmphasisGainDb);
    deps.dom.studyMelodyPreEmphasisGainDbValue.textContent = formatStudyMelodyPreEmphasisGain(
      deps.state.studyMelodyPreEmphasisGainDb
    );
  }

  function hidePanel() {
    deps.dom.studyMelodyMicTuningPanel.classList.add('hidden');
    deps.dom.studyMelodyMicTuningPanel.style.display = 'none';
    deps.dom.studyMelodyMicTuningToggleBtn.setAttribute('aria-expanded', 'false');
  }

  function showPanel() {
    deps.dom.studyMelodyMicTuningPanel.classList.remove('hidden');
    deps.dom.studyMelodyMicTuningPanel.style.display = 'flex';
    deps.dom.studyMelodyMicTuningToggleBtn.setAttribute('aria-expanded', 'true');
  }

  function togglePanel() {
    if (deps.dom.studyMelodyMicTuningPanel.classList.contains('hidden')) {
      showPanel();
      return;
    }
    hidePanel();
  }

  function persistAndRender() {
    renderValues();
    deps.saveSettings();
  }

  function syncPreEmphasisFilter() {
    if (!deps.state.preEmphasisFilter) return;
    deps.state.preEmphasisFilter.frequency.value = deps.state.studyMelodyPreEmphasisFrequencyHz;
    deps.state.preEmphasisFilter.gain.value = deps.state.studyMelodyPreEmphasisGainDb;
  }

  function resetToDefaults() {
    deps.state.studyMelodyMicGatePercent = DEFAULT_STUDY_MELODY_MIC_TUNING.gatePercent;
    deps.state.studyMelodyMicNoiseGuardPercent = DEFAULT_STUDY_MELODY_MIC_TUNING.noiseGuardPercent;
    deps.state.studyMelodyMicSilenceResetFrames = DEFAULT_STUDY_MELODY_MIC_TUNING.silenceResetFrames;
    deps.state.studyMelodyMicStableFrames = DEFAULT_STUDY_MELODY_MIC_TUNING.stableFrames;
    deps.state.studyMelodyPreEmphasisFrequencyHz = DEFAULT_STUDY_MELODY_MIC_TUNING.preEmphasisFrequencyHz;
    deps.state.studyMelodyPreEmphasisGainDb = DEFAULT_STUDY_MELODY_MIC_TUNING.preEmphasisGainDb;
    syncPreEmphasisFilter();
    persistAndRender();
  }

  function registerSlider(input: HTMLInputElement, onUpdate: (value: string) => void) {
    input.addEventListener('input', () => {
      onUpdate(input.value);
      persistAndRender();
    });
  }

  function register() {
    renderValues();

    deps.dom.studyMelodyMicTuningToggleBtn.addEventListener('click', () => {
      togglePanel();
    });

    deps.dom.studyMelodyMicTuningResetBtn.addEventListener('click', () => {
      resetToDefaults();
    });

    registerSlider(deps.dom.studyMelodyMicGatePercent, (value) => {
      deps.state.studyMelodyMicGatePercent = normalizeStudyMelodyMicGatePercent(value);
    });
    registerSlider(deps.dom.studyMelodyMicNoiseGuardPercent, (value) => {
      deps.state.studyMelodyMicNoiseGuardPercent = normalizeStudyMelodyMicNoiseGuardPercent(value);
    });
    registerSlider(deps.dom.studyMelodyMicSilenceResetFrames, (value) => {
      deps.state.studyMelodyMicSilenceResetFrames = normalizeStudyMelodyMicSilenceResetFrames(value);
    });
    registerSlider(deps.dom.studyMelodyMicStableFrames, (value) => {
      deps.state.studyMelodyMicStableFrames = normalizeStudyMelodyMicStableFrames(value);
    });
    registerSlider(deps.dom.studyMelodyPreEmphasisFrequencyHz, (value) => {
      deps.state.studyMelodyPreEmphasisFrequencyHz = normalizeStudyMelodyPreEmphasisFrequencyHz(value);
      syncPreEmphasisFilter();
    });
    registerSlider(deps.dom.studyMelodyPreEmphasisGainDb, (value) => {
      deps.state.studyMelodyPreEmphasisGainDb = normalizeStudyMelodyPreEmphasisGainDb(value);
      syncPreEmphasisFilter();
    });

    document.addEventListener('pointerdown', (event) => {
      if (deps.dom.studyMelodyMicTuningPanel.classList.contains('hidden')) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (deps.dom.studyMelodyMicTuningHost.contains(target)) return;
      hidePanel();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hidePanel();
      }
    });
  }

  return {
    hidePanel,
    register,
    syncUi: renderValues,
  };
}
