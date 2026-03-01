import type { CurriculumPresetKey, CurriculumPresetPlan } from '../curriculum-presets';
import { buildCurriculumPresetPlan, getCurriculumPresetDefinitions } from '../curriculum-presets';

interface CurriculumPresetControllerDom {
  curriculumPreset: HTMLSelectElement;
  curriculumPresetInfo: HTMLElement;
  sessionGoal: HTMLSelectElement;
  scaleSelector: HTMLSelectElement;
  chordSelector: HTMLSelectElement;
  progressionSelector: HTMLSelectElement;
  arpeggioPatternSelector: HTMLSelectElement;
  rhythmTimingWindow: HTMLSelectElement;
  metronomeEnabled: HTMLInputElement;
  metronomeBpm: HTMLInputElement;
  showAllNotes: HTMLInputElement;
  trainingMode: HTMLSelectElement;
  difficulty: HTMLSelectElement;
  startFret: HTMLInputElement;
  endFret: HTMLInputElement;
}

interface CurriculumPresetControllerState {
  currentInstrument: { STRING_ORDER: string[] };
  showingAllNotes: boolean;
}

interface CurriculumPresetControllerDeps {
  dom: CurriculumPresetControllerDom;
  state: CurriculumPresetControllerState;
  getClampedMetronomeBpmFromInput(): number;
  applyEnabledStrings(enabledStrings: string[]): void;
  handleModeChange(): void;
  redrawFretboard(): void;
  saveSettings(): void;
  setResultMessage(message: string): void;
  isListening(): boolean;
  stopListening(): void;
}

function setSelectValueIfAvailable(select: HTMLSelectElement, value: string | undefined) {
  if (!value) return false;
  const hasOption = Array.from(select.options).some((option) => option.value === value);
  if (!hasOption) return false;
  select.value = value;
  return true;
}

function setFirstAvailableSelectValue(select: HTMLSelectElement, candidates: string[] | undefined) {
  if (!candidates || candidates.length === 0) return false;
  for (const value of candidates) {
    if (setSelectValueIfAvailable(select, value)) return true;
  }
  return false;
}

export function createCurriculumPresetController(deps: CurriculumPresetControllerDeps) {
  function setPresetInfo(text: string) {
    deps.dom.curriculumPresetInfo.textContent = text;
    deps.dom.curriculumPresetInfo.classList.toggle('hidden', text.length === 0);
  }

  function setSelection(key: CurriculumPresetKey) {
    if (deps.dom.curriculumPreset.value === key) return;
    deps.dom.curriculumPreset.value = key;
    const preset = getCurriculumPresetDefinitions().find((item) => item.key === key);
    setPresetInfo(preset?.description ?? '');
  }

  function markAsCustom() {
    setSelection('custom');
  }

  function applyModeSpecificFields(plan: CurriculumPresetPlan) {
    setSelectValueIfAvailable(deps.dom.sessionGoal, plan.sessionGoal);
    setSelectValueIfAvailable(deps.dom.scaleSelector, plan.scaleValue);
    setFirstAvailableSelectValue(deps.dom.chordSelector, plan.chordValueCandidates);
    setFirstAvailableSelectValue(deps.dom.progressionSelector, plan.progressionValueCandidates);
    setSelectValueIfAvailable(deps.dom.arpeggioPatternSelector, plan.arpeggioPatternValue);
    setSelectValueIfAvailable(deps.dom.rhythmTimingWindow, plan.rhythmTimingWindow);

    if (typeof plan.metronomeEnabled === 'boolean') {
      deps.dom.metronomeEnabled.checked = plan.metronomeEnabled;
    }
    if (typeof plan.metronomeBpm === 'number') {
      deps.dom.metronomeBpm.value = String(plan.metronomeBpm);
      deps.dom.metronomeBpm.value = String(deps.getClampedMetronomeBpmFromInput());
    }
  }

  function applyPreset(key: CurriculumPresetKey) {
    const plan = buildCurriculumPresetPlan(key, deps.state.currentInstrument.STRING_ORDER);
    if (!plan) {
      setSelection('custom');
      return;
    }

    if (deps.isListening()) {
      deps.stopListening();
    }

    deps.dom.showAllNotes.checked = plan.showAllNotes;
    deps.state.showingAllNotes = plan.showAllNotes;
    deps.dom.trainingMode.value = plan.trainingMode;
    deps.dom.difficulty.value = plan.difficulty;
    deps.dom.startFret.value = String(plan.startFret);
    deps.dom.endFret.value = String(plan.endFret);
    deps.applyEnabledStrings(plan.enabledStrings);
    applyModeSpecificFields(plan);

    deps.handleModeChange();
    deps.redrawFretboard();
    deps.saveSettings();

    setSelection(key);
    deps.setResultMessage(`Applied ${plan.label}`);
  }

  return {
    setPresetInfo,
    setSelection,
    markAsCustom,
    applyModeSpecificFields,
    applyPreset,
  };
}
