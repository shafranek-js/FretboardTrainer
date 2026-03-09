import { normalizeMelodyFingeringLevel, normalizeMelodyFingeringStrategy } from '../melody-fingering';

interface InstrumentDisplayControlsDom {
  instrumentSelector: HTMLSelectElement;
  tuningPreset: HTMLSelectElement;
  showTimelineSteps: HTMLInputElement;
  showTimelineDetails: HTMLInputElement;
  melodyFingeringStrategy: HTMLSelectElement;
  melodyFingeringStrategyQuick: HTMLSelectElement;
  melodyFingeringLevel: HTMLSelectElement;
}

interface InstrumentDisplayControlsState {
  currentInstrument: { name: string };
  currentTuningPresetKey: string;
  isListening: boolean;
  showMelodyTimelineSteps: boolean;
  showMelodyTimelineDetails: boolean;
  melodyFingeringStrategy: string;
  melodyFingeringLevel: string;
}

export interface InstrumentDisplayControlsControllerDeps {
  dom: InstrumentDisplayControlsDom;
  state: InstrumentDisplayControlsState;
  resolveInstrumentById: (instrumentId: string) => { name: string };
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  markCurriculumPresetAsCustom: () => void;
  resetMelodyTimelineEditingState: () => void;
  updateInstrumentUI: (enabledStrings?: string[], tuningPresetKey?: string) => void;
  getEnabledStrings: () => string[];
  refreshMelodyOptionsForCurrentInstrument: () => void;
  updatePracticeSetupSummary: () => void;
  loadInstrumentSoundfont: (instrumentName: string) => Promise<void>;
  saveSettings: () => void;
  refreshMelodyTimelineUi: () => void;
  stopListening: () => void;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  redrawFretboard: () => void;
}

export function createInstrumentDisplayControlsController(
  deps: InstrumentDisplayControlsControllerDeps
) {
  async function handleInstrumentChange() {
    deps.stopMelodyDemoPlayback({ clearUi: true });
    deps.markCurriculumPresetAsCustom();
    deps.resetMelodyTimelineEditingState();
    deps.state.currentInstrument = deps.resolveInstrumentById(deps.dom.instrumentSelector.value);
    deps.state.currentTuningPresetKey = deps.dom.tuningPreset.value;
    deps.updateInstrumentUI();
    deps.refreshMelodyOptionsForCurrentInstrument();
    deps.updatePracticeSetupSummary();
    await deps.loadInstrumentSoundfont(deps.state.currentInstrument.name);
    deps.saveSettings();
    deps.refreshMelodyTimelineUi();
  }

  function handleTuningChange() {
    deps.stopMelodyDemoPlayback({ clearUi: true });
    deps.markCurriculumPresetAsCustom();
    deps.resetMelodyTimelineEditingState();
    if (deps.state.isListening) {
      deps.stopListening();
    }

    deps.state.currentTuningPresetKey = deps.dom.tuningPreset.value;
    deps.updateInstrumentUI(deps.getEnabledStrings(), deps.state.currentTuningPresetKey);
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.setResultMessage(
      `Tuning set: ${deps.dom.tuningPreset.selectedOptions[0]?.textContent ?? deps.dom.tuningPreset.value}`
    );
    deps.refreshMelodyTimelineUi();
  }

  function applyMelodyFingeringStrategy(rawValue: unknown) {
    deps.state.melodyFingeringStrategy =
      rawValue === 'minimax' ? normalizeMelodyFingeringStrategy(rawValue) : 'minimax';
    deps.dom.melodyFingeringStrategy.value = deps.state.melodyFingeringStrategy;
    deps.dom.melodyFingeringStrategyQuick.value = deps.state.melodyFingeringStrategy;
    deps.saveSettings();
    deps.redrawFretboard();
    deps.refreshMelodyTimelineUi();
  }

  function handleFingeringLevelChange() {
    deps.state.melodyFingeringLevel = normalizeMelodyFingeringLevel(deps.dom.melodyFingeringLevel.value);
    deps.dom.melodyFingeringLevel.value = deps.state.melodyFingeringLevel;
    deps.saveSettings();
    deps.redrawFretboard();
    deps.refreshMelodyTimelineUi();
  }

  function register() {
    deps.dom.instrumentSelector.addEventListener('change', async () => {
      await handleInstrumentChange();
    });

    deps.dom.tuningPreset.addEventListener('change', () => {
      handleTuningChange();
    });

    deps.dom.showTimelineSteps.addEventListener('change', () => {
      deps.state.showMelodyTimelineSteps = deps.dom.showTimelineSteps.checked;
      deps.saveSettings();
      deps.refreshMelodyTimelineUi();
    });

    deps.dom.showTimelineDetails.addEventListener('change', () => {
      deps.state.showMelodyTimelineDetails = deps.dom.showTimelineDetails.checked;
      deps.saveSettings();
      deps.refreshMelodyTimelineUi();
    });

    deps.dom.melodyFingeringStrategy.addEventListener('change', () => {
      applyMelodyFingeringStrategy(deps.dom.melodyFingeringStrategy.value);
    });

    deps.dom.melodyFingeringStrategyQuick.addEventListener('change', () => {
      applyMelodyFingeringStrategy(deps.dom.melodyFingeringStrategyQuick.value);
    });

    deps.dom.melodyFingeringLevel.addEventListener('change', () => {
      handleFingeringLevelChange();
    });
  }

  return {
    handleInstrumentChange,
    handleTuningChange,
    register,
  };
}
