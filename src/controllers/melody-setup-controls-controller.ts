import { buildDefaultMelodyStudyRange } from '../melody-study-range';

interface MelodySetupControlsDom {
  melodySelector: HTMLSelectElement;
  trainingMode: HTMLSelectElement;
  melodyStudyStart: HTMLInputElement;
  melodyStudyEnd: HTMLInputElement;
  melodyStudyResetBtn: HTMLButtonElement;
  melodyShowNote: HTMLInputElement;
  melodyShowTabTimeline: HTMLInputElement;
  melodyShowScrollingTab: HTMLInputElement;
  melodyTimelineZoom: HTMLInputElement;
  scrollingTabZoom: HTMLInputElement;
  melodyLoopRange: HTMLInputElement;
  melodyDemoBpm: HTMLInputElement;
}

interface MelodySetupControlsState {
  preferredMelodyId: string | null;
  isListening: boolean;
  showMelodyTabTimeline: boolean;
  showScrollingTabPanel: boolean;
  melodyLoopRangeEnabled: boolean;
}

export interface MelodySetupControlsControllerDeps {
  dom: MelodySetupControlsDom;
  state: MelodySetupControlsState;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  markCurriculumPresetAsCustom: () => void;
  resetMelodyTimelineEditingState: () => void;
  hydrateMelodyTransposeForSelectedMelody: () => void;
  hydrateMelodyStringShiftForSelectedMelody: () => void;
  hydrateMelodyStudyRangeForSelectedMelody: () => void;
  hydrateMelodyTempoForSelectedMelody: () => void;
  syncMetronomeMeterFromSelectedMelody: () => void;
  clearMelodyDemoPreviewState: () => void;
  updateMelodyActionButtonsForSelection: () => void;
  isMelodyWorkflowMode: (mode: string) => boolean;
  stopListening: () => void;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  updatePracticeSetupSummary: () => void;
  saveSettings: () => void;
  refreshMelodyTimelineUi: () => void;
  refreshLayoutControlsVisibility: () => void;
  syncMelodyTimelineZoomDisplay: () => void;
  syncScrollingTabZoomDisplay: () => void;
  syncMelodyLoopRangeDisplay: () => void;
  clampMelodyDemoBpmInput: () => void;
  persistSelectedMelodyTempoOverride: () => void;
  syncMetronomeTempoFromMelodyIfLinked: () => Promise<void>;
  getSelectedMelodyEventCount: () => number | null;
}

export function createMelodySetupControlsController(deps: MelodySetupControlsControllerDeps) {
  function handleMelodySelectionChange() {
    deps.stopMelodyDemoPlayback({ clearUi: true });
    deps.markCurriculumPresetAsCustom();
    deps.state.preferredMelodyId = deps.dom.melodySelector.value || null;
    deps.resetMelodyTimelineEditingState();
    deps.hydrateMelodyTransposeForSelectedMelody();
    deps.hydrateMelodyStringShiftForSelectedMelody();
    deps.hydrateMelodyStudyRangeForSelectedMelody();
    deps.hydrateMelodyTempoForSelectedMelody();
    deps.syncMetronomeMeterFromSelectedMelody();
    deps.clearMelodyDemoPreviewState();
    deps.updateMelodyActionButtonsForSelection();
    if (deps.state.isListening && deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)) {
      deps.stopListening();
      deps.setResultMessage('Melody changed. Session stopped; press Start to begin from the first event.');
    }
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.refreshMelodyTimelineUi();
  }

  function handleStudyReset() {
    const eventCount = deps.getSelectedMelodyEventCount();
    if (typeof eventCount !== 'number' || eventCount <= 0) return;
    const fullRange = buildDefaultMelodyStudyRange(eventCount);
    deps.dom.melodyStudyStart.value = String(fullRange.startIndex + 1);
    deps.dom.melodyStudyEnd.value = String(fullRange.endIndex + 1);
    deps.dom.melodyStudyStart.dispatchEvent(new Event('change'));
  }

  function handleMelodyShowTabTimelineChange() {
    deps.state.showMelodyTabTimeline = deps.dom.melodyShowTabTimeline.checked;
    deps.saveSettings();
    deps.refreshLayoutControlsVisibility();
    deps.refreshMelodyTimelineUi();
  }

  function handleMelodyShowScrollingTabChange() {
    deps.state.showScrollingTabPanel = deps.dom.melodyShowScrollingTab.checked;
    deps.saveSettings();
    deps.refreshLayoutControlsVisibility();
    deps.refreshMelodyTimelineUi();
  }

  function handleMelodyTimelineZoomChange() {
    deps.syncMelodyTimelineZoomDisplay();
    deps.saveSettings();
    deps.refreshMelodyTimelineUi();
  }

  function handleScrollingTabZoomChange() {
    deps.syncScrollingTabZoomDisplay();
    deps.saveSettings();
    deps.refreshMelodyTimelineUi();
  }

  function handleLoopRangeChange() {
    deps.state.melodyLoopRangeEnabled = deps.dom.melodyLoopRange.checked;
    deps.syncMelodyLoopRangeDisplay();
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
  }

  function handleMelodyDemoBpmChange() {
    deps.clampMelodyDemoBpmInput();
    deps.persistSelectedMelodyTempoOverride();
    void deps.syncMetronomeTempoFromMelodyIfLinked();
    deps.saveSettings();
  }

  function register() {
    deps.dom.melodySelector.addEventListener('change', () => {
      handleMelodySelectionChange();
    });

    deps.dom.melodyStudyResetBtn.addEventListener('click', () => {
      handleStudyReset();
    });

    deps.dom.melodyShowNote.addEventListener('change', () => {
      deps.markCurriculumPresetAsCustom();
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
    });

    deps.dom.melodyShowTabTimeline.addEventListener('change', () => {
      handleMelodyShowTabTimelineChange();
    });

    deps.dom.melodyShowScrollingTab.addEventListener('change', () => {
      handleMelodyShowScrollingTabChange();
    });

    deps.dom.melodyTimelineZoom.addEventListener('input', () => {
      handleMelodyTimelineZoomChange();
    });

    deps.dom.melodyTimelineZoom.addEventListener('change', () => {
      handleMelodyTimelineZoomChange();
    });

    deps.dom.scrollingTabZoom.addEventListener('input', () => {
      handleScrollingTabZoomChange();
    });

    deps.dom.scrollingTabZoom.addEventListener('change', () => {
      handleScrollingTabZoomChange();
    });

    deps.dom.melodyLoopRange.addEventListener('change', () => {
      handleLoopRangeChange();
    });

    deps.dom.melodyDemoBpm.addEventListener('input', () => {
      handleMelodyDemoBpmChange();
    });

    deps.dom.melodyDemoBpm.addEventListener('change', () => {
      handleMelodyDemoBpmChange();
    });
  }

  return {
    handleMelodySelectionChange,
    register,
  };
}
