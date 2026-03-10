import { normalizeSessionPace } from '../session-pace';
import type { CurriculumPresetKey } from '../curriculum-presets';
import type { UiWorkflow } from '../training-workflows';

interface PracticeSetupControlsDom {
  showAllNotes: HTMLInputElement;
  showStringToggles: HTMLInputElement;
  stringSelector: HTMLElement;
  autoPlayPromptSound: HTMLInputElement;
  relaxPerformanceOctaveCheck: HTMLInputElement;
  noteNaming: HTMLSelectElement;
  trainingMode: HTMLSelectElement;
  sessionGoal: HTMLSelectElement;
  sessionPace: HTMLSelectElement;
  curriculumPreset: HTMLSelectElement;
  startFret: HTMLInputElement;
  endFret: HTMLInputElement;
  rhythmTimingWindow: HTMLSelectElement;
  difficulty: HTMLSelectElement;
  scaleSelector: HTMLSelectElement;
  chordSelector: HTMLSelectElement;
  randomizeChords: HTMLInputElement;
  progressionSelector: HTMLSelectElement;
  arpeggioPatternSelector: HTMLSelectElement;
}

interface PracticeSetupControlsState {
  uiWorkflow: UiWorkflow;
  showingAllNotes: boolean;
  autoPlayPromptSound: boolean;
  relaxPerformanceOctaveCheck: boolean;
  sessionPace: string;
}

interface SessionToolsVisibility {
  showShowStringTogglesRow: boolean;
}

export interface PracticeSetupControlsControllerDeps {
  dom: PracticeSetupControlsDom;
  state: PracticeSetupControlsState;
  markCurriculumPresetAsCustom: () => void;
  saveSettings: () => void;
  redrawFretboard: () => void;
  refreshDisplayFormatting: () => void;
  setNoteNamingPreference: (value: string) => void;
  resolveSessionToolsVisibility: (workflow: UiWorkflow) => SessionToolsVisibility;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  handleModeChange: () => void;
  applyUiWorkflowLayout: (workflow: UiWorkflow) => void;
  syncHiddenMetronomeTempoFromSharedTempo: () => void;
  syncMelodyMetronomeRuntime: () => Promise<void>;
  updatePracticeSetupSummary: () => void;
  refreshMicPerformanceReadinessUi: () => void;
  syncMelodyTimelineEditingState: () => void;
  setCurriculumPresetInfo: (text: string) => void;
  applyCurriculumPreset: (key: CurriculumPresetKey) => void;
  persistSelectedMelodyTempoOverride: () => void;
  renderMetronomeToggleButton: () => void;
}

export function createPracticeSetupControlsController(deps: PracticeSetupControlsControllerDeps) {
  function syncStringSelectorVisibility() {
    const visibility = deps.resolveSessionToolsVisibility(deps.state.uiWorkflow);
    const shouldShowStringSelector =
      visibility.showShowStringTogglesRow && deps.dom.showStringToggles.checked;
    deps.dom.stringSelector.hidden = !shouldShowStringSelector;
    deps.dom.stringSelector.classList.toggle('hidden', !shouldShowStringSelector);
    deps.dom.stringSelector.style.display = shouldShowStringSelector ? '' : 'none';
  }

  function markCustomAndRefreshSummary() {
    deps.markCurriculumPresetAsCustom();
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
  }

  function register() {
    deps.dom.showAllNotes.addEventListener('change', () => {
      deps.markCurriculumPresetAsCustom();
      deps.state.showingAllNotes = deps.dom.showAllNotes.checked;
      deps.saveSettings();
      deps.redrawFretboard();
    });

    deps.dom.showStringToggles.addEventListener('change', () => {
      syncStringSelectorVisibility();
      deps.saveSettings();
    });

    deps.dom.autoPlayPromptSound.addEventListener('change', () => {
      deps.state.autoPlayPromptSound = deps.dom.autoPlayPromptSound.checked;
      deps.saveSettings();
    });

    deps.dom.relaxPerformanceOctaveCheck.addEventListener('change', () => {
      deps.state.relaxPerformanceOctaveCheck = deps.dom.relaxPerformanceOctaveCheck.checked;
      deps.saveSettings();
    });

    deps.dom.stringSelector.addEventListener('change', () => {
      deps.markCurriculumPresetAsCustom();
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
    });

    deps.dom.noteNaming.addEventListener('change', () => {
      deps.setNoteNamingPreference(deps.dom.noteNaming.value);
      deps.saveSettings();
      deps.redrawFretboard();
      deps.refreshDisplayFormatting();
    });

    deps.dom.trainingMode.addEventListener('change', () => {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      deps.markCurriculumPresetAsCustom();
      deps.handleModeChange();
      deps.applyUiWorkflowLayout(deps.state.uiWorkflow);
      deps.syncHiddenMetronomeTempoFromSharedTempo();
      void deps.syncMelodyMetronomeRuntime();
      deps.updatePracticeSetupSummary();
      deps.refreshMicPerformanceReadinessUi();
      deps.saveSettings();
      deps.syncMelodyTimelineEditingState();
    });

    deps.dom.sessionGoal.addEventListener('change', () => {
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
    });

    deps.dom.sessionPace.addEventListener('change', () => {
      deps.markCurriculumPresetAsCustom();
      deps.state.sessionPace = normalizeSessionPace(deps.dom.sessionPace.value);
      deps.dom.sessionPace.value = deps.state.sessionPace;
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
    });

    deps.dom.curriculumPreset.addEventListener('change', () => {
      const key = deps.dom.curriculumPreset.value as CurriculumPresetKey;
      if (key === 'custom') {
        deps.setCurriculumPresetInfo('');
        deps.updatePracticeSetupSummary();
        deps.saveSettings();
        return;
      }
      deps.applyCurriculumPreset(key);
      deps.persistSelectedMelodyTempoOverride();
      deps.syncHiddenMetronomeTempoFromSharedTempo();
      deps.renderMetronomeToggleButton();
      deps.updatePracticeSetupSummary();
    });

    deps.dom.startFret.addEventListener('input', () => {
      deps.markCurriculumPresetAsCustom();
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
      deps.redrawFretboard();
    });

    deps.dom.endFret.addEventListener('input', () => {
      deps.markCurriculumPresetAsCustom();
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
      deps.redrawFretboard();
    });

    deps.dom.rhythmTimingWindow.addEventListener('change', () => {
      deps.saveSettings();
    });

    deps.dom.difficulty.addEventListener('change', () => {
      markCustomAndRefreshSummary();
    });

    deps.dom.scaleSelector.addEventListener('change', () => {
      markCustomAndRefreshSummary();
    });

    deps.dom.chordSelector.addEventListener('change', () => {
      markCustomAndRefreshSummary();
    });

    deps.dom.randomizeChords.addEventListener('change', () => {
      deps.markCurriculumPresetAsCustom();
      deps.saveSettings();
    });

    deps.dom.progressionSelector.addEventListener('change', () => {
      markCustomAndRefreshSummary();
    });

    deps.dom.arpeggioPatternSelector.addEventListener('change', () => {
      markCustomAndRefreshSummary();
    });
  }

  return {
    register,
    syncStringSelectorVisibility,
  };
}

