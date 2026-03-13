import { createSessionControllerGraphCluster } from './session-controller-graph-cluster';
import { buildSessionControllerGraphDeps } from './session-controller-graph-deps';
import { buildSessionControllerGraphEntrypointDeps } from './session-controller-entrypoint-graph-deps';
import { createSessionEditorBootstrapGraphCluster } from './session-editor-bootstrap-graph-cluster';
import { buildSessionEditorBootstrapGraphDeps } from './session-editor-bootstrap-graph-deps';
import { buildSessionEditorBootstrapGraphEntrypointDeps } from './session-editor-bootstrap-entrypoint-graph-deps';

const sessionControllerGraphDeps = buildSessionControllerGraphDeps(
  buildSessionControllerGraphEntrypointDeps({
    controllerBridges: {
      getSelectedMelody: () => selectedMelodyContextController.getSelectedMelody(),
      getStoredMelodyStudyRange: (melodyId, totalEvents) =>
        melodyPracticeSettingsBridgeController.getStoredMelodyStudyRange(melodyId, totalEvents),
      syncMetronomeMeterFromSelectedMelody: () =>
        selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
      syncMelodyDemoBpmDisplay: () => melodyDemoRuntimeController.syncBpmDisplay(),
      isMelodyDemoPlaying: () => melodyDemoRuntimeController.isPlaying(),
      getClampedMetronomeBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
      stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
      updateMicNoiseGateInfo: () => micSettingsController.updateNoiseGateInfo(),
    },
  })
);

const {
  selectedMelodyContextController,
  melodyPracticeSettingsBridgeController,
  melodyTimelineEditingBridgeController,
  melodyTimelineUiController,
  interactionGuardsController,
  melodyDemoRuntimeController,
  sessionTransportControlsController,
  melodyEventEditorBridgeController,
  melodyImportWorkspaceController,
  melodyLibraryActionsController,
  melodyImportControlsController,
  metronomeController,
  metronomeRuntimeBridgeController,
  metronomeBridgeController,
  metronomeControlsController,
  curriculumPresetBridgeController,
  micSettingsController,
  micPolyphonicTelemetryController,
  audioInputControlsController,
  practiceSetupSummaryController,
  practicePresetUiController,
  workflowController,
  workflowLayoutControlsController,
  melodySetupControlsController,
  melodyPracticeActionsController,
  melodyPracticeControlsController,
  melodySelectionController,
  practicePresetControlsController,
  practiceSetupControlsController,
  instrumentDisplayControlsController,
} = createSessionControllerGraphCluster(sessionControllerGraphDeps);

const isTextEntryElement = interactionGuardsController.isTextEntryElement;
const isElementWithin = interactionGuardsController.isElementWithin;
const isAnyBlockingModalOpen = interactionGuardsController.isAnyBlockingModalOpen;

export function refreshMelodyOptionsForCurrentInstrument() {
  melodySelectionController.refreshOptionsForCurrentInstrument();
}

const {
  melodyTimelineEditingController,
  registerSessionControls: registerSessionControlsEntryPoint,
} = createSessionEditorBootstrapGraphCluster(
  buildSessionEditorBootstrapGraphDeps(
    buildSessionEditorBootstrapGraphEntrypointDeps({
      interactionGuards: {
        isTextEntryElement,
        isElementWithin,
        isAnyBlockingModalOpen,
      },
      controllers: {
        refreshMelodyOptionsForCurrentInstrument,
        selectedMelodyContextController,
        melodyPracticeSettingsBridgeController,
        melodyTimelineEditingBridgeController,
        melodyEventEditorBridgeController,
        melodyTimelineUiController,
        melodyDemoRuntimeController,
        melodyLibraryActionsController,
        curriculumPresetBridgeController,
        practiceSetupSummaryController,
        melodyPracticeActionsController,
        melodyImportWorkspaceController,
        registerMelodyTimelineEditingInteractionHandlers: () =>
          melodyTimelineEditingController.registerInteractionHandlers(),
        metronomeRuntimeBridgeController,
        metronomeBridgeController,
        micSettingsController,
        practicePresetUiController,
        micPolyphonicTelemetryController,
        workflowController,
      },
      bootstrapControllers: {
        melodyImportControlsController,
        workflowLayoutControlsController,
        practicePresetControlsController,
        practiceSetupControlsController,
        instrumentDisplayControlsController,
        melodySetupControlsController,
        melodyPracticeControlsController,
        sessionTransportControlsController,
        audioInputControlsController,
        metronomeControlsController,
        metronomeController,
      },
    })
  )
);

export function registerSessionControls() {
  registerSessionControlsEntryPoint();
}
