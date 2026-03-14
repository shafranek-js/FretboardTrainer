import type { CurriculumPresetKey } from '../../curriculum-presets';
import { createSessionBootstrapGraphCluster } from '../session-bootstrap';
import type { SessionBootstrapControllerDeps } from '../session-bootstrap';
import { createSessionEditorBootstrapGraphCluster } from './graph-cluster';
import { createSessionEditorGraphCluster } from '../session-editor';

type EditorGraphDeps = Parameters<typeof createSessionEditorGraphCluster>[0];
type BootstrapGraphDeps = Parameters<typeof createSessionBootstrapGraphCluster>[0];
type BootstrapControllers = Omit<
  BootstrapGraphDeps['controllers'],
  'melodyEditingControlsController' | 'melodyPlaybackControlsController' | 'melodyLibraryControlsController' | 'studyMelodyMicTuningController'
>;
type SessionEditorGraphState = EditorGraphDeps['state'];
type SessionBootstrapGraphState = BootstrapGraphDeps['bootstrap']['state'];
type SessionEditorBootstrapGraphState = SessionEditorGraphState & SessionBootstrapGraphState;

type SessionEditorBootstrapGraphDepsBuilderArgs = Omit<
  EditorGraphDeps,
  'state' | 'selectedMelodyContextController' | 'melodyDemoRuntimeController' | 'curriculumPresetBridgeController'
> & {
  state: SessionEditorBootstrapGraphState;
  selectedMelodyContextController: EditorGraphDeps['selectedMelodyContextController'] & {
    syncMetronomeMeterFromSelectedMelody: SessionBootstrapControllerDeps['syncMetronomeMeterFromSelectedMelody'];
  };
  melodyDemoRuntimeController: EditorGraphDeps['melodyDemoRuntimeController'] & {
    getClampedBpmFromInput: SessionBootstrapControllerDeps['getClampedMelodyDemoBpmFromInput'];
    seekToEvent: SessionBootstrapControllerDeps['seekMelodyTimelineToEvent'];
    syncBpmDisplay: SessionBootstrapControllerDeps['syncMelodyDemoBpmDisplay'];
    renderButtonState: SessionBootstrapControllerDeps['renderMelodyDemoButtonState'];
  };
  curriculumPresetBridgeController: EditorGraphDeps['curriculumPresetBridgeController'] & {
    setSelection: (key: CurriculumPresetKey) => void;
  };
  melodyPracticeSettingsBridgeController: {
    syncMelodyLoopRangeDisplay: SessionBootstrapControllerDeps['syncMelodyLoopRangeDisplay'];
    getStoredMelodyStudyRange(melodyId: string, totalEvents: number): unknown;
  };
  melodyPracticeActionsController: {
    handleStudyRangeChange(range: unknown, options: { stopMessage: string }): void;
  };
  melodyImportWorkspaceController: {
    resetDraft: SessionBootstrapControllerDeps['resetMelodyImportDraft'];
    syncUi: SessionBootstrapControllerDeps['syncMelodyImportModalUi'];
  };
  registerMelodyTimelineEditingInteractionHandlers: SessionBootstrapControllerDeps['registerMelodyTimelineEditingInteractionHandlers'];
  setMelodyTimelineStudyRangeCommitHandler: SessionBootstrapControllerDeps['setMelodyTimelineStudyRangeCommitHandler'];
  setMelodyTimelineSeekHandler: SessionBootstrapControllerDeps['setMelodyTimelineSeekHandler'];
  metronomeRuntimeBridgeController: {
    getClampedBpmFromInput: SessionBootstrapControllerDeps['getClampedMetronomeBpmFromInput'];
    syncBpmDisplay: SessionBootstrapControllerDeps['syncMetronomeBpmDisplay'];
    resetVisualIndicator: SessionBootstrapControllerDeps['resetMetronomeVisualIndicator'];
  };
  metronomeBridgeController: {
    syncMelodyTimelineZoomDisplay: SessionBootstrapControllerDeps['syncMelodyTimelineZoomDisplay'];
    syncScrollingTabZoomDisplay: SessionBootstrapControllerDeps['syncScrollingTabZoomDisplay'];
    syncHiddenMetronomeTempoFromSharedTempo: SessionBootstrapControllerDeps['syncHiddenMetronomeTempoFromSharedTempo'];
    syncMetronomeVolumeDisplayAndRuntime: SessionBootstrapControllerDeps['syncMetronomeVolumeDisplayAndRuntime'];
    renderMetronomeToggleButton: SessionBootstrapControllerDeps['renderMetronomeToggleButton'];
  };
  micSettingsController: {
    updateNoiseGateInfo: SessionBootstrapControllerDeps['updateMicNoiseGateInfo'];
  };
  refreshMicPolyphonicDetectorAudioInfoUi: SessionBootstrapControllerDeps['refreshMicPolyphonicDetectorAudioInfoUi'];
  refreshMicPerformanceReadinessUi: SessionBootstrapControllerDeps['refreshMicPerformanceReadinessUi'];
  practicePresetUiController: {
    syncPracticePresetUi: SessionBootstrapControllerDeps['syncPracticePresetUi'];
  };
  micPolyphonicTelemetryController: {
    syncButtonState: SessionBootstrapControllerDeps['syncMicPolyphonicTelemetryButtonState'];
  };
  workflowController: {
    mountWorkspaceControls: SessionBootstrapControllerDeps['mountWorkspaceControls'];
    syncUiWorkflowFromTrainingMode: SessionBootstrapControllerDeps['syncUiWorkflowFromTrainingMode'];
    applyUiWorkflowLayout: SessionBootstrapControllerDeps['applyUiWorkflowLayout'];
  };
  setUiMode: SessionBootstrapControllerDeps['setUiMode'];
  refreshInputSourceAvailabilityUi: SessionBootstrapControllerDeps['refreshInputSourceAvailabilityUi'];
  refreshAudioInputDeviceOptions: SessionBootstrapControllerDeps['refreshAudioInputDeviceOptions'];
  refreshMidiInputDevices: SessionBootstrapControllerDeps['refreshMidiInputDevices'];
  melodyImportControlsController: BootstrapControllers['melodyImportControlsController'];
  workflowLayoutControlsController: BootstrapControllers['workflowLayoutControlsController'];
  practicePresetControlsController: BootstrapControllers['practicePresetControlsController'];
  practiceSetupControlsController: BootstrapControllers['practiceSetupControlsController'];
  instrumentDisplayControlsController: BootstrapControllers['instrumentDisplayControlsController'];
  melodySetupControlsController: BootstrapControllers['melodySetupControlsController'];
  melodyPracticeControlsController: BootstrapControllers['melodyPracticeControlsController'];
  sessionTransportControlsController: BootstrapControllers['sessionTransportControlsController'];
  audioInputControlsController: BootstrapControllers['audioInputControlsController'];
  metronomeControlsController: BootstrapControllers['metronomeControlsController'];
  metronomeController: BootstrapControllers['metronomeController'];
  registerModalControls: BootstrapGraphDeps['registrations']['registerModalControls'];
  registerConfirmControls: BootstrapGraphDeps['registrations']['registerConfirmControls'];
  registerProfileControls: BootstrapGraphDeps['registrations']['registerProfileControls'];
};

type SessionEditorBootstrapGraphDepsBuilderContext = SessionEditorBootstrapGraphDepsBuilderArgs;
type EditorGraphBuilderContext = ReturnType<typeof createEditorGraphContext>;
type BootstrapGraphBuilderContext = ReturnType<typeof createBootstrapGraphContext>;
type BootstrapControllersBuilderContext = ReturnType<typeof createBootstrapControllersContext>;
type BootstrapSelectionBuilderContext = ReturnType<typeof createBootstrapSelectionContext>;
type BootstrapTimelineBuilderContext = ReturnType<typeof createBootstrapTimelineContext>;
type BootstrapMelodyImportBuilderContext = ReturnType<typeof createBootstrapMelodyImportContext>;
type BootstrapMetronomeBuilderContext = ReturnType<typeof createBootstrapMetronomeContext>;
type BootstrapUiBuilderContext = ReturnType<typeof createBootstrapUiContext>;

function createEditorGraphState(state: SessionEditorBootstrapGraphState): SessionEditorGraphState {
  return state;
}

function createBootstrapGraphState(
  state: SessionEditorBootstrapGraphState
): SessionBootstrapGraphState {
  return state;
}

function createEditorGraphContext(context: SessionEditorBootstrapGraphDepsBuilderContext) {
  return {
    dom: context.dom,
    state: createEditorGraphState(context.state),
    maxFret: context.maxFret,
    saveSettings: context.saveSettings,
    stopListening: context.stopListening,
    setPracticeSetupCollapsed: context.setPracticeSetupCollapsed,
    setResultMessage: context.setResultMessage,
    isMelodyWorkflowMode: context.isMelodyWorkflowMode,
    isTextEntryElement: context.isTextEntryElement,
    isElementWithin: context.isElementWithin,
    isAnyBlockingModalOpen: context.isAnyBlockingModalOpen,
    clearMelodyTimelineContextMenu: context.clearMelodyTimelineContextMenu,
    renderMelodyTabTimelineFromState: context.renderMelodyTabTimelineFromState,
    showNonBlockingError: context.showNonBlockingError,
    formatUserFacingError: context.formatUserFacingError,
    confirmUserAction: context.confirmUserAction,
    isCustomMelodyId: context.isCustomMelodyId,
    deleteCustomMelody: context.deleteCustomMelody,
    refreshMelodyOptionsForCurrentInstrument: context.refreshMelodyOptionsForCurrentInstrument,
    selectedMelodyContextController: context.selectedMelodyContextController,
    melodyTimelineEditingBridgeController: context.melodyTimelineEditingBridgeController,
    melodyEventEditorBridgeController: context.melodyEventEditorBridgeController,
    melodyTimelineUiController: context.melodyTimelineUiController,
    melodyDemoRuntimeController: context.melodyDemoRuntimeController,
    melodyLibraryActionsController: context.melodyLibraryActionsController,
    curriculumPresetBridgeController: context.curriculumPresetBridgeController,
    practiceSetupSummaryController: context.practiceSetupSummaryController,
  };
}

function createBootstrapGraphContext(context: SessionEditorBootstrapGraphDepsBuilderContext) {
  return {
    dom: context.dom,
    state: createBootstrapGraphState(context.state),
    selectedMelodyContextController: context.selectedMelodyContextController,
    melodyDemoRuntimeController: context.melodyDemoRuntimeController,
    curriculumPresetBridgeController: context.curriculumPresetBridgeController,
    melodyPracticeSettingsBridgeController: context.melodyPracticeSettingsBridgeController,
    melodyPracticeActionsController: context.melodyPracticeActionsController,
    melodyImportWorkspaceController: context.melodyImportWorkspaceController,
    registerMelodyTimelineEditingInteractionHandlers:
      context.registerMelodyTimelineEditingInteractionHandlers,
    setMelodyTimelineStudyRangeCommitHandler: context.setMelodyTimelineStudyRangeCommitHandler,
    setMelodyTimelineSeekHandler: context.setMelodyTimelineSeekHandler,
    metronomeRuntimeBridgeController: context.metronomeRuntimeBridgeController,
    metronomeBridgeController: context.metronomeBridgeController,
    micSettingsController: context.micSettingsController,
    refreshMicPolyphonicDetectorAudioInfoUi: context.refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi: context.refreshMicPerformanceReadinessUi,
    practicePresetUiController: context.practicePresetUiController,
    micPolyphonicTelemetryController: context.micPolyphonicTelemetryController,
    workflowController: context.workflowController,
    setUiMode: context.setUiMode,
    refreshInputSourceAvailabilityUi: context.refreshInputSourceAvailabilityUi,
    refreshAudioInputDeviceOptions: context.refreshAudioInputDeviceOptions,
    refreshMidiInputDevices: context.refreshMidiInputDevices,
    practiceSetupSummaryController: context.practiceSetupSummaryController,
    melodyTimelineEditingBridgeController: context.melodyTimelineEditingBridgeController,
    refreshMelodyOptionsForCurrentInstrument: context.refreshMelodyOptionsForCurrentInstrument,
    melodyImportControlsController: context.melodyImportControlsController,
    workflowLayoutControlsController: context.workflowLayoutControlsController,
    practicePresetControlsController: context.practicePresetControlsController,
    practiceSetupControlsController: context.practiceSetupControlsController,
    instrumentDisplayControlsController: context.instrumentDisplayControlsController,
    melodySetupControlsController: context.melodySetupControlsController,
    melodyPracticeControlsController: context.melodyPracticeControlsController,
    sessionTransportControlsController: context.sessionTransportControlsController,
    audioInputControlsController: context.audioInputControlsController,
    metronomeControlsController: context.metronomeControlsController,
    metronomeController: context.metronomeController,
    registerModalControls: context.registerModalControls,
    registerConfirmControls: context.registerConfirmControls,
    registerProfileControls: context.registerProfileControls,
  };
}

function createBootstrapControllersContext(context: BootstrapGraphBuilderContext) {
  return {
    melodyImportControlsController: context.melodyImportControlsController,
    workflowLayoutControlsController: context.workflowLayoutControlsController,
    practicePresetControlsController: context.practicePresetControlsController,
    practiceSetupControlsController: context.practiceSetupControlsController,
    instrumentDisplayControlsController: context.instrumentDisplayControlsController,
    melodySetupControlsController: context.melodySetupControlsController,
    melodyPracticeControlsController: context.melodyPracticeControlsController,
    sessionTransportControlsController: context.sessionTransportControlsController,
    audioInputControlsController: context.audioInputControlsController,
    metronomeControlsController: context.metronomeControlsController,
    metronomeController: context.metronomeController,
  };
}

function createBootstrapSelectionContext(context: BootstrapGraphBuilderContext) {
  return {
    curriculumPresetBridgeController: context.curriculumPresetBridgeController,
    metronomeRuntimeBridgeController: context.metronomeRuntimeBridgeController,
    melodyDemoRuntimeController: context.melodyDemoRuntimeController,
    refreshMelodyOptionsForCurrentInstrument: context.refreshMelodyOptionsForCurrentInstrument,
    selectedMelodyContextController: context.selectedMelodyContextController,
  };
}

function createBootstrapTimelineContext(context: BootstrapGraphBuilderContext) {
  return {
    melodyPracticeSettingsBridgeController: context.melodyPracticeSettingsBridgeController,
    setMelodyTimelineStudyRangeCommitHandler: context.setMelodyTimelineStudyRangeCommitHandler,
    melodyPracticeActionsController: context.melodyPracticeActionsController,
    registerMelodyTimelineEditingInteractionHandlers:
      context.registerMelodyTimelineEditingInteractionHandlers,
    setMelodyTimelineSeekHandler: context.setMelodyTimelineSeekHandler,
    melodyDemoRuntimeController: context.melodyDemoRuntimeController,
    melodyTimelineEditingBridgeController: context.melodyTimelineEditingBridgeController,
  };
}

function createBootstrapMelodyImportContext(context: BootstrapGraphBuilderContext) {
  return {
    melodyImportWorkspaceController: context.melodyImportWorkspaceController,
  };
}

function createBootstrapMetronomeContext(context: BootstrapGraphBuilderContext) {
  return {
    metronomeBridgeController: context.metronomeBridgeController,
    selectedMelodyContextController: context.selectedMelodyContextController,
    metronomeRuntimeBridgeController: context.metronomeRuntimeBridgeController,
    melodyDemoRuntimeController: context.melodyDemoRuntimeController,
  };
}

function createBootstrapUiContext(context: BootstrapGraphBuilderContext) {
  return {
    melodyDemoRuntimeController: context.melodyDemoRuntimeController,
    micSettingsController: context.micSettingsController,
    refreshMicPolyphonicDetectorAudioInfoUi: context.refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi: context.refreshMicPerformanceReadinessUi,
    practicePresetUiController: context.practicePresetUiController,
    micPolyphonicTelemetryController: context.micPolyphonicTelemetryController,
    workflowController: context.workflowController,
    setUiMode: context.setUiMode,
    practiceSetupSummaryController: context.practiceSetupSummaryController,
    refreshInputSourceAvailabilityUi: context.refreshInputSourceAvailabilityUi,
    refreshAudioInputDeviceOptions: context.refreshAudioInputDeviceOptions,
    refreshMidiInputDevices: context.refreshMidiInputDevices,
  };
}

function buildEditorGraph(args: EditorGraphBuilderContext): EditorGraphDeps {
  return {
    dom: args.dom,
    state: args.state,
    maxFret: args.maxFret,
    saveSettings: args.saveSettings,
    stopListening: args.stopListening,
    setPracticeSetupCollapsed: args.setPracticeSetupCollapsed,
    setResultMessage: args.setResultMessage,
    isMelodyWorkflowMode: args.isMelodyWorkflowMode,
    isTextEntryElement: args.isTextEntryElement,
    isElementWithin: args.isElementWithin,
    isAnyBlockingModalOpen: args.isAnyBlockingModalOpen,
    clearMelodyTimelineContextMenu: args.clearMelodyTimelineContextMenu,
    renderMelodyTabTimelineFromState: args.renderMelodyTabTimelineFromState,
    showNonBlockingError: args.showNonBlockingError,
    formatUserFacingError: args.formatUserFacingError,
    confirmUserAction: args.confirmUserAction,
    isCustomMelodyId: args.isCustomMelodyId,
    deleteCustomMelody: args.deleteCustomMelody,
    refreshMelodyOptionsForCurrentInstrument: args.refreshMelodyOptionsForCurrentInstrument,
    selectedMelodyContextController: args.selectedMelodyContextController,
    melodyTimelineEditingBridgeController: args.melodyTimelineEditingBridgeController,
    melodyEventEditorBridgeController: args.melodyEventEditorBridgeController,
    melodyTimelineUiController: args.melodyTimelineUiController,
    melodyDemoRuntimeController: args.melodyDemoRuntimeController,
    melodyLibraryActionsController: args.melodyLibraryActionsController,
    curriculumPresetBridgeController: args.curriculumPresetBridgeController,
    practiceSetupSummaryController: args.practiceSetupSummaryController,
  };
}

function buildBootstrapControllers(
  args: BootstrapControllersBuilderContext
): BootstrapControllers {
  return {
    melodyImportControlsController: args.melodyImportControlsController,
    workflowLayoutControlsController: args.workflowLayoutControlsController,
    practicePresetControlsController: args.practicePresetControlsController,
    practiceSetupControlsController: args.practiceSetupControlsController,
    instrumentDisplayControlsController: args.instrumentDisplayControlsController,
    melodySetupControlsController: args.melodySetupControlsController,
    melodyPracticeControlsController: args.melodyPracticeControlsController,
    sessionTransportControlsController: args.sessionTransportControlsController,
    audioInputControlsController: args.audioInputControlsController,
    metronomeControlsController: args.metronomeControlsController,
    metronomeController: args.metronomeController,
  };
}

function buildBootstrapSelection(
  args: BootstrapSelectionBuilderContext
): BootstrapGraphDeps['bootstrap']['selection'] {
  return {
    setCurriculumPresetSelection: (key) =>
      args.curriculumPresetBridgeController.setSelection(key as CurriculumPresetKey),
    getClampedMetronomeBpmFromInput: () =>
      args.metronomeRuntimeBridgeController.getClampedBpmFromInput(),
    getClampedMelodyDemoBpmFromInput: () =>
      args.melodyDemoRuntimeController.getClampedBpmFromInput(),
    refreshMelodyOptionsForCurrentInstrument: args.refreshMelodyOptionsForCurrentInstrument,
    getSelectedMelodyId: () => args.selectedMelodyContextController.getSelectedMelodyId(),
  };
}

function buildBootstrapTimeline(
  args: BootstrapTimelineBuilderContext
): BootstrapGraphDeps['bootstrap']['timeline'] {
  return {
    syncMelodyLoopRangeDisplay: () =>
      args.melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
    setMelodyTimelineStudyRangeCommitHandler: args.setMelodyTimelineStudyRangeCommitHandler,
    handleStudyRangeCommit: (range) => {
      args.melodyPracticeActionsController.handleStudyRangeChange(range, {
        stopMessage: 'Study range adjusted. Session stopped; press Start to continue.',
      });
    },
    registerMelodyTimelineEditingInteractionHandlers:
      args.registerMelodyTimelineEditingInteractionHandlers,
    setMelodyTimelineSeekHandler: args.setMelodyTimelineSeekHandler,
    seekMelodyTimelineToEvent: (eventIndex, options) =>
      args.melodyDemoRuntimeController.seekToEvent(eventIndex, options),
    syncMelodyTimelineEditingState: () => args.melodyTimelineEditingBridgeController.syncState(),
  };
}

function buildBootstrapMelodyImport(
  args: BootstrapMelodyImportBuilderContext
): BootstrapGraphDeps['bootstrap']['melodyImport'] {
  return {
    resetMelodyImportDraft: () => args.melodyImportWorkspaceController.resetDraft(),
    syncMelodyImportModalUi: () => args.melodyImportWorkspaceController.syncUi(),
  };
}

function buildBootstrapMetronome(
  args: BootstrapMetronomeBuilderContext
): BootstrapGraphDeps['bootstrap']['metronome'] {
  return {
    syncMelodyTimelineZoomDisplay: () => args.metronomeBridgeController.syncMelodyTimelineZoomDisplay(),
    syncScrollingTabZoomDisplay: () => args.metronomeBridgeController.syncScrollingTabZoomDisplay(),
    syncMetronomeMeterFromSelectedMelody: () =>
      args.selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
    syncHiddenMetronomeTempoFromSharedTempo: () =>
      args.metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
    syncMetronomeBpmDisplay: () => args.metronomeRuntimeBridgeController.syncBpmDisplay(),
    syncMetronomeVolumeDisplayAndRuntime: () =>
      args.metronomeBridgeController.syncMetronomeVolumeDisplayAndRuntime(),
    syncMelodyDemoBpmDisplay: () => args.melodyDemoRuntimeController.syncBpmDisplay(),
    resetMetronomeVisualIndicator: () =>
      args.metronomeRuntimeBridgeController.resetVisualIndicator(),
    renderMetronomeToggleButton: () => args.metronomeBridgeController.renderMetronomeToggleButton(),
  };
}

function buildBootstrapUi(
  args: BootstrapUiBuilderContext
): BootstrapGraphDeps['bootstrap']['ui'] {
  return {
    renderMelodyDemoButtonState: () => args.melodyDemoRuntimeController.renderButtonState(),
    updateMicNoiseGateInfo: () => args.micSettingsController.updateNoiseGateInfo(),
    refreshMicPolyphonicDetectorAudioInfoUi: args.refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
    syncPracticePresetUi: () => args.practicePresetUiController.syncPracticePresetUi(),
    syncMicPolyphonicTelemetryButtonState: () =>
      args.micPolyphonicTelemetryController.syncButtonState(),
    mountWorkspaceControls: () => args.workflowController.mountWorkspaceControls(),
    syncUiWorkflowFromTrainingMode: () =>
      args.workflowController.syncUiWorkflowFromTrainingMode(),
    applyUiWorkflowLayout: (workflow) => args.workflowController.applyUiWorkflowLayout(workflow),
    setUiMode: args.setUiMode,
    updatePracticeSetupSummary: () => args.practiceSetupSummaryController.update(),
    refreshInputSourceAvailabilityUi: args.refreshInputSourceAvailabilityUi,
    refreshAudioInputDeviceOptions: args.refreshAudioInputDeviceOptions,
    refreshMidiInputDevices: args.refreshMidiInputDevices,
  };
}

function buildBootstrapGraph(
  args: BootstrapGraphBuilderContext
): Parameters<typeof createSessionEditorBootstrapGraphCluster>[0]['bootstrapGraph'] {
  return {
    bootstrap: {
      dom: args.dom,
      state: args.state,
      selection: buildBootstrapSelection(createBootstrapSelectionContext(args)),
      timeline: buildBootstrapTimeline(createBootstrapTimelineContext(args)),
      melodyImport: buildBootstrapMelodyImport(createBootstrapMelodyImportContext(args)),
      metronome: buildBootstrapMetronome(createBootstrapMetronomeContext(args)),
      ui: buildBootstrapUi(createBootstrapUiContext(args)),
    },
    controllers: buildBootstrapControllers(createBootstrapControllersContext(args)),
    registrations: {
      registerModalControls: args.registerModalControls,
      registerConfirmControls: args.registerConfirmControls,
      registerProfileControls: args.registerProfileControls,
    },
  };
}

export function buildSessionEditorBootstrapGraphDeps(
  args: SessionEditorBootstrapGraphDepsBuilderArgs
): Parameters<typeof createSessionEditorBootstrapGraphCluster>[0] {
  const context = args;

  return {
    editorGraph: buildEditorGraph(createEditorGraphContext(context)),
    bootstrapGraph: buildBootstrapGraph(createBootstrapGraphContext(context)),
  };
}



