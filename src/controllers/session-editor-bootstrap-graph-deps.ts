import type { CurriculumPresetKey } from '../curriculum-presets';
import type { SessionBootstrapControllerDeps } from './session-bootstrap-controller';
import { createSessionBootstrapGraphCluster } from './session-bootstrap-graph-cluster';
import { createSessionEditorBootstrapGraphCluster } from './session-editor-bootstrap-graph-cluster';
import { createSessionEditorGraphCluster } from './session-editor-graph-cluster';

type EditorGraphDeps = Parameters<typeof createSessionEditorGraphCluster>[0];
type BootstrapGraphDeps = Parameters<typeof createSessionBootstrapGraphCluster>[0];
type BootstrapControllers = Omit<
  BootstrapGraphDeps['controllers'],
  'melodyEditingControlsController' | 'melodyPlaybackControlsController' | 'melodyLibraryControlsController' | 'studyMelodyMicTuningController'
>;

type SessionEditorBootstrapGraphDepsBuilderArgs = Omit<
  EditorGraphDeps,
  'selectedMelodyContextController' | 'melodyDemoRuntimeController' | 'curriculumPresetBridgeController'
> & {
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

export function buildSessionEditorBootstrapGraphDeps(
  args: SessionEditorBootstrapGraphDepsBuilderArgs
): Parameters<typeof createSessionEditorBootstrapGraphCluster>[0] {
  const editorGraph: EditorGraphDeps = {
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

  const controllers: BootstrapControllers = {
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

  return {
    editorGraph,
    bootstrapGraph: {
      bootstrap: {
        dom: args.dom,
        state: args.state,
        selection: {
          setCurriculumPresetSelection: (key) => args.curriculumPresetBridgeController.setSelection(key as CurriculumPresetKey),
          getClampedMetronomeBpmFromInput: () => args.metronomeRuntimeBridgeController.getClampedBpmFromInput(),
          getClampedMelodyDemoBpmFromInput: () => args.melodyDemoRuntimeController.getClampedBpmFromInput(),
          refreshMelodyOptionsForCurrentInstrument: args.refreshMelodyOptionsForCurrentInstrument,
          getSelectedMelodyId: () => args.selectedMelodyContextController.getSelectedMelodyId(),
        },
        timeline: {
          syncMelodyLoopRangeDisplay: () => args.melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
          setMelodyTimelineStudyRangeCommitHandler: args.setMelodyTimelineStudyRangeCommitHandler,
          handleStudyRangeCommit: (range) => {
            args.melodyPracticeActionsController.handleStudyRangeChange(range, {
              stopMessage: 'Study range adjusted. Session stopped; press Start to continue.',
            });
          },
          registerMelodyTimelineEditingInteractionHandlers: args.registerMelodyTimelineEditingInteractionHandlers,
          setMelodyTimelineSeekHandler: args.setMelodyTimelineSeekHandler,
          seekMelodyTimelineToEvent: (eventIndex, options) => args.melodyDemoRuntimeController.seekToEvent(eventIndex, options),
          syncMelodyTimelineEditingState: () => args.melodyTimelineEditingBridgeController.syncState(),
        },
        melodyImport: {
          resetMelodyImportDraft: () => args.melodyImportWorkspaceController.resetDraft(),
          syncMelodyImportModalUi: () => args.melodyImportWorkspaceController.syncUi(),
        },
        metronome: {
          syncMelodyTimelineZoomDisplay: () => args.metronomeBridgeController.syncMelodyTimelineZoomDisplay(),
          syncScrollingTabZoomDisplay: () => args.metronomeBridgeController.syncScrollingTabZoomDisplay(),
          syncMetronomeMeterFromSelectedMelody: () => args.selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
          syncHiddenMetronomeTempoFromSharedTempo: () => args.metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
          syncMetronomeBpmDisplay: () => args.metronomeRuntimeBridgeController.syncBpmDisplay(),
          syncMetronomeVolumeDisplayAndRuntime: () => args.metronomeBridgeController.syncMetronomeVolumeDisplayAndRuntime(),
          syncMelodyDemoBpmDisplay: () => args.melodyDemoRuntimeController.syncBpmDisplay(),
          resetMetronomeVisualIndicator: () => args.metronomeRuntimeBridgeController.resetVisualIndicator(),
          renderMetronomeToggleButton: () => args.metronomeBridgeController.renderMetronomeToggleButton(),
        },
        ui: {
          renderMelodyDemoButtonState: () => args.melodyDemoRuntimeController.renderButtonState(),
          updateMicNoiseGateInfo: () => args.micSettingsController.updateNoiseGateInfo(),
          refreshMicPolyphonicDetectorAudioInfoUi: args.refreshMicPolyphonicDetectorAudioInfoUi,
          refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
          syncPracticePresetUi: () => args.practicePresetUiController.syncPracticePresetUi(),
          syncMicPolyphonicTelemetryButtonState: () => args.micPolyphonicTelemetryController.syncButtonState(),
          mountWorkspaceControls: () => args.workflowController.mountWorkspaceControls(),
          syncUiWorkflowFromTrainingMode: () => args.workflowController.syncUiWorkflowFromTrainingMode(),
          applyUiWorkflowLayout: (workflow) => args.workflowController.applyUiWorkflowLayout(workflow),
          setUiMode: args.setUiMode,
          updatePracticeSetupSummary: () => args.practiceSetupSummaryController.update(),
          refreshInputSourceAvailabilityUi: args.refreshInputSourceAvailabilityUi,
          refreshAudioInputDeviceOptions: args.refreshAudioInputDeviceOptions,
          refreshMidiInputDevices: args.refreshMidiInputDevices,
        },
      },
      controllers,
      registrations: {
        registerModalControls: args.registerModalControls,
        registerConfirmControls: args.registerConfirmControls,
        registerProfileControls: args.registerProfileControls,
      },
    },
  };
}
