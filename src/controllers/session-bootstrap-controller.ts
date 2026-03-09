import type { UiWorkflow } from '../training-workflows';
import type { UiMode } from '../ui-mode';
interface SessionBootstrapControllerDom {
  metronomeBpm: HTMLInputElement;
  melodyDemoBpm: HTMLInputElement;
  timelineViewMode: HTMLSelectElement;
  showTimelineSteps: HTMLInputElement;
  showTimelineDetails: HTMLInputElement;
}

interface SessionBootstrapControllerState {
  melodyTransposeById?: Record<string, number>;
  melodyPlaybackBpmById?: Record<string, number>;
  melodyStringShiftById?: Record<string, number>;
  melodyStudyRangeById?: Record<string, unknown>;
  melodyTimelineViewMode: string;
  showMelodyTimelineSteps: boolean;
  showMelodyTimelineDetails: boolean;
  uiWorkflow: UiWorkflow;
  uiMode: UiMode;
}

export interface SessionBootstrapControllerDeps {
  dom: SessionBootstrapControllerDom;
  state: SessionBootstrapControllerState;
  setCurriculumPresetSelection: (key: string) => void;
  getClampedMetronomeBpmFromInput: () => number;
  getClampedMelodyDemoBpmFromInput: () => number;
  syncMelodyLoopRangeDisplay: () => void;
  syncMelodyTimelineZoomDisplay: () => void;
  syncScrollingTabZoomDisplay: () => void;
  syncMetronomeMeterFromSelectedMelody: () => void;
  syncHiddenMetronomeTempoFromSharedTempo: () => void;
  syncMetronomeBpmDisplay: () => void;
  syncMetronomeVolumeDisplayAndRuntime: () => void;
  syncMelodyDemoBpmDisplay: () => void;
  refreshMelodyOptionsForCurrentInstrument: () => void;
  setMelodyTimelineStudyRangeCommitHandler: (handler: (payload: { melodyId: string; range: unknown }) => void) => void;
  getSelectedMelodyId: () => string | null;
  handleStudyRangeCommit: (range: unknown) => void;
  registerMelodyTimelineEditingInteractionHandlers: () => void;
  setMelodyTimelineSeekHandler: (
    handler: (payload: { melodyId: string; eventIndex: number; commit: boolean }) => void
  ) => void;
  seekMelodyTimelineToEvent: (eventIndex: number, options: { commit: boolean }) => void;
  resetMelodyImportDraft: () => void;
  syncMelodyImportModalUi: () => void;
  renderMelodyDemoButtonState: () => void;
  resetMetronomeVisualIndicator: () => void;
  renderMetronomeToggleButton: () => void;
  updateMicNoiseGateInfo: () => void;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  refreshMicPerformanceReadinessUi: () => void;
  syncPracticePresetUi: () => void;
  syncMicPolyphonicTelemetryButtonState: () => void;
  mountWorkspaceControls: () => void;
  syncUiWorkflowFromTrainingMode: () => void;
  applyUiWorkflowLayout: (workflow: UiWorkflow) => void;
  setUiMode: (uiMode: string) => void;
  updatePracticeSetupSummary: () => void;
  syncMelodyTimelineEditingState: () => void;
  refreshInputSourceAvailabilityUi: () => void;
  refreshAudioInputDeviceOptions: () => Promise<void>;
  refreshMidiInputDevices: (requestAccess?: boolean) => Promise<void>;
  registerMelodyImportControls: () => void;
  registerWorkflowLayoutControls: () => void;
  registerMelodyEditingControls: () => void;
  registerMelodyPlaybackControls: () => void;
  registerMelodyLibraryControls: () => void;
  registerPracticePresetControls: () => void;
  registerPracticeSetupControls: () => void;
  registerInstrumentDisplayControls: () => void;
  registerMelodySetupControls: () => void;
  registerMelodyPracticeControls: () => void;
  registerSessionTransportControls: () => void;
  registerAudioInputControls: () => void;
  registerStudyMelodyMicTuningControls: () => void;
  registerMetronomeControls: () => void;
  registerMetronomeBeatIndicator: () => void;
}

export function createSessionBootstrapController(deps: SessionBootstrapControllerDeps) {
  function initialize() {
    deps.setCurriculumPresetSelection('custom');
    deps.dom.metronomeBpm.value = String(deps.getClampedMetronomeBpmFromInput());
    deps.dom.melodyDemoBpm.value = String(deps.getClampedMelodyDemoBpmFromInput());
    deps.state.melodyTransposeById = deps.state.melodyTransposeById ?? {};
    deps.state.melodyPlaybackBpmById = deps.state.melodyPlaybackBpmById ?? {};
    deps.state.melodyStringShiftById = deps.state.melodyStringShiftById ?? {};
    deps.state.melodyStudyRangeById = deps.state.melodyStudyRangeById ?? {};
    deps.syncMelodyLoopRangeDisplay();
    deps.dom.timelineViewMode.value = deps.state.melodyTimelineViewMode;
    deps.dom.showTimelineSteps.checked = deps.state.showMelodyTimelineSteps;
    deps.dom.showTimelineDetails.checked = deps.state.showMelodyTimelineDetails;
    deps.syncMelodyTimelineZoomDisplay();
    deps.syncScrollingTabZoomDisplay();
    deps.syncMetronomeMeterFromSelectedMelody();
    deps.syncHiddenMetronomeTempoFromSharedTempo();
    deps.syncMetronomeBpmDisplay();
    deps.syncMetronomeVolumeDisplayAndRuntime();
    deps.syncMelodyDemoBpmDisplay();
    deps.refreshMelodyOptionsForCurrentInstrument();
    deps.setMelodyTimelineStudyRangeCommitHandler(({ melodyId, range }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      deps.handleStudyRangeCommit(range);
    });
    deps.registerMelodyTimelineEditingInteractionHandlers();
    deps.setMelodyTimelineSeekHandler(({ melodyId, eventIndex, commit }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      deps.seekMelodyTimelineToEvent(eventIndex, { commit });
    });
    deps.resetMelodyImportDraft();
    deps.syncMelodyImportModalUi();
    deps.renderMelodyDemoButtonState();
    deps.resetMetronomeVisualIndicator();
    deps.renderMetronomeToggleButton();
    deps.updateMicNoiseGateInfo();
    deps.refreshMicPolyphonicDetectorAudioInfoUi();
    deps.refreshMicPerformanceReadinessUi();
    deps.syncPracticePresetUi();
    deps.syncMicPolyphonicTelemetryButtonState();
    deps.mountWorkspaceControls();
    deps.syncUiWorkflowFromTrainingMode();
    deps.applyUiWorkflowLayout(deps.state.uiWorkflow);
    deps.setUiMode(deps.state.uiMode);
    deps.updatePracticeSetupSummary();
    deps.syncMelodyTimelineEditingState();
    deps.refreshInputSourceAvailabilityUi();
    void deps.refreshAudioInputDeviceOptions();
    void deps.refreshMidiInputDevices(false);
    deps.registerMelodyImportControls();
    deps.registerWorkflowLayoutControls();
    deps.registerMelodyEditingControls();
    deps.registerMelodyPlaybackControls();
    deps.registerMelodyLibraryControls();
    deps.registerPracticePresetControls();
    deps.registerPracticeSetupControls();
    deps.registerInstrumentDisplayControls();
    deps.registerMelodySetupControls();
    deps.registerMelodyPracticeControls();
    deps.registerSessionTransportControls();
    deps.registerAudioInputControls();
    deps.registerStudyMelodyMicTuningControls();
    deps.registerMetronomeControls();
    deps.registerMetronomeBeatIndicator();
  }

  return { initialize };
}



