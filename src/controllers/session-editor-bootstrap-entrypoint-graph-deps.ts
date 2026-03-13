import { dom } from '../dom';
import { state } from '../state';
import { saveSettings } from '../storage';
import { renderMelodyTabTimelineFromState } from '../ui';
import { stopListening } from '../logic';
import { setPracticeSetupCollapsed, setResultMessage, setUiMode } from '../ui-signals';
import { refreshAudioInputDeviceOptions } from '../audio-input-devices';
import { refreshInputSourceAvailabilityUi, refreshMidiInputDevices } from '../midi-runtime';
import { formatUserFacingError, showNonBlockingError } from '../app-feedback';
import { deleteCustomMelody, isCustomMelodyId } from '../melody-library';
import { confirmUserAction } from '../user-feedback-port';
import { refreshMicPolyphonicDetectorAudioInfoUi } from '../mic-polyphonic-detector-ui';
import { refreshMicPerformanceReadinessUi } from '../mic-performance-readiness-ui';
import {
  clearMelodyTimelineContextMenu,
  setMelodyTimelineSeekHandler,
  setMelodyTimelineStudyRangeCommitHandler,
} from '../melody-tab-timeline';
import { DEFAULT_TABLATURE_MAX_FRET } from '../tablature-optimizer';
import { isMelodyWorkflowMode } from '../training-mode-groups';
import { registerModalControls } from './modal-controller';
import { registerConfirmControls } from './confirm-controller';
import { registerProfileControls } from './profile-controller';
import { buildSessionEditorBootstrapGraphDeps } from './session-editor-bootstrap-graph-deps';

type SessionEditorBootstrapGraphEntrypointDeps = Parameters<
  typeof buildSessionEditorBootstrapGraphDeps
>[0];

type SessionEditorBootstrapInteractionGuards = Pick<
  SessionEditorBootstrapGraphEntrypointDeps,
  'isTextEntryElement' | 'isElementWithin' | 'isAnyBlockingModalOpen'
>;

type SessionEditorBootstrapControllerRefs = Pick<
  SessionEditorBootstrapGraphEntrypointDeps,
  | 'refreshMelodyOptionsForCurrentInstrument'
  | 'selectedMelodyContextController'
  | 'melodyPracticeSettingsBridgeController'
  | 'melodyTimelineEditingBridgeController'
  | 'melodyEventEditorBridgeController'
  | 'melodyTimelineUiController'
  | 'melodyDemoRuntimeController'
  | 'melodyLibraryActionsController'
  | 'curriculumPresetBridgeController'
  | 'practiceSetupSummaryController'
  | 'melodyPracticeActionsController'
  | 'melodyImportWorkspaceController'
  | 'registerMelodyTimelineEditingInteractionHandlers'
  | 'metronomeRuntimeBridgeController'
  | 'metronomeBridgeController'
  | 'micSettingsController'
  | 'practicePresetUiController'
  | 'micPolyphonicTelemetryController'
  | 'workflowController'
>;

type SessionEditorBootstrapClusterControllers = Pick<
  SessionEditorBootstrapGraphEntrypointDeps,
  | 'melodyImportControlsController'
  | 'workflowLayoutControlsController'
  | 'practicePresetControlsController'
  | 'practiceSetupControlsController'
  | 'instrumentDisplayControlsController'
  | 'melodySetupControlsController'
  | 'melodyPracticeControlsController'
  | 'sessionTransportControlsController'
  | 'audioInputControlsController'
  | 'metronomeControlsController'
  | 'metronomeController'
>;

type SessionEditorBootstrapStaticAppDeps = Pick<
  SessionEditorBootstrapGraphEntrypointDeps,
  'dom' | 'state'
>;

type SessionEditorBootstrapStaticRuntimeDeps = Omit<
  Pick<
    SessionEditorBootstrapGraphEntrypointDeps,
    | 'dom'
    | 'state'
    | 'maxFret'
    | 'saveSettings'
    | 'stopListening'
    | 'setPracticeSetupCollapsed'
    | 'setResultMessage'
    | 'isMelodyWorkflowMode'
    | 'clearMelodyTimelineContextMenu'
    | 'renderMelodyTabTimelineFromState'
    | 'showNonBlockingError'
    | 'formatUserFacingError'
    | 'confirmUserAction'
    | 'isCustomMelodyId'
    | 'deleteCustomMelody'
    | 'setMelodyTimelineStudyRangeCommitHandler'
    | 'setMelodyTimelineSeekHandler'
    | 'refreshMicPolyphonicDetectorAudioInfoUi'
    | 'refreshMicPerformanceReadinessUi'
    | 'setUiMode'
    | 'refreshInputSourceAvailabilityUi'
    | 'refreshAudioInputDeviceOptions'
    | 'refreshMidiInputDevices'
    | 'registerModalControls'
    | 'registerConfirmControls'
    | 'registerProfileControls'
  >,
  'dom' | 'state'
>;

type SessionEditorBootstrapStaticDeps =
  SessionEditorBootstrapStaticAppDeps & SessionEditorBootstrapStaticRuntimeDeps;

function buildStaticAppDeps(): SessionEditorBootstrapStaticAppDeps {
  return {
    dom,
    state,
  };
}

function buildStaticRuntimeDeps(): SessionEditorBootstrapStaticRuntimeDeps {
  return {
    maxFret: DEFAULT_TABLATURE_MAX_FRET,
    saveSettings,
    stopListening,
    setPracticeSetupCollapsed,
    setResultMessage,
    isMelodyWorkflowMode,
    clearMelodyTimelineContextMenu,
    renderMelodyTabTimelineFromState,
    showNonBlockingError,
    formatUserFacingError,
    confirmUserAction,
    isCustomMelodyId,
    deleteCustomMelody,
    setMelodyTimelineStudyRangeCommitHandler,
    setMelodyTimelineSeekHandler,
    refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi,
    setUiMode,
    refreshInputSourceAvailabilityUi,
    refreshAudioInputDeviceOptions,
    refreshMidiInputDevices,
    registerModalControls,
    registerConfirmControls,
    registerProfileControls,
  };
}

interface SessionEditorBootstrapGraphEntrypointArgs {
  interactionGuards: SessionEditorBootstrapInteractionGuards;
  controllers: SessionEditorBootstrapControllerRefs;
  bootstrapControllers: SessionEditorBootstrapClusterControllers;
}

function buildStaticEntrypointDeps(): SessionEditorBootstrapStaticDeps {
  return {
    ...buildStaticAppDeps(),
    ...buildStaticRuntimeDeps(),
  };
}

function buildInteractionGuardDeps(
  guards: SessionEditorBootstrapInteractionGuards
): SessionEditorBootstrapInteractionGuards {
  return {
    isTextEntryElement: guards.isTextEntryElement,
    isElementWithin: guards.isElementWithin,
    isAnyBlockingModalOpen: guards.isAnyBlockingModalOpen,
  };
}

function buildControllerDeps(
  controllers: SessionEditorBootstrapControllerRefs
): SessionEditorBootstrapControllerRefs {
  return {
    refreshMelodyOptionsForCurrentInstrument: controllers.refreshMelodyOptionsForCurrentInstrument,
    selectedMelodyContextController: controllers.selectedMelodyContextController,
    melodyPracticeSettingsBridgeController: controllers.melodyPracticeSettingsBridgeController,
    melodyTimelineEditingBridgeController: controllers.melodyTimelineEditingBridgeController,
    melodyEventEditorBridgeController: controllers.melodyEventEditorBridgeController,
    melodyTimelineUiController: controllers.melodyTimelineUiController,
    melodyDemoRuntimeController: controllers.melodyDemoRuntimeController,
    melodyLibraryActionsController: controllers.melodyLibraryActionsController,
    curriculumPresetBridgeController: controllers.curriculumPresetBridgeController,
    practiceSetupSummaryController: controllers.practiceSetupSummaryController,
    melodyPracticeActionsController: controllers.melodyPracticeActionsController,
    melodyImportWorkspaceController: controllers.melodyImportWorkspaceController,
    registerMelodyTimelineEditingInteractionHandlers:
      controllers.registerMelodyTimelineEditingInteractionHandlers,
    metronomeRuntimeBridgeController: controllers.metronomeRuntimeBridgeController,
    metronomeBridgeController: controllers.metronomeBridgeController,
    micSettingsController: controllers.micSettingsController,
    practicePresetUiController: controllers.practicePresetUiController,
    micPolyphonicTelemetryController: controllers.micPolyphonicTelemetryController,
    workflowController: controllers.workflowController,
  };
}

function buildBootstrapControllerDeps(
  controllers: SessionEditorBootstrapClusterControllers
): SessionEditorBootstrapClusterControllers {
  return {
    melodyImportControlsController: controllers.melodyImportControlsController,
    workflowLayoutControlsController: controllers.workflowLayoutControlsController,
    practicePresetControlsController: controllers.practicePresetControlsController,
    practiceSetupControlsController: controllers.practiceSetupControlsController,
    instrumentDisplayControlsController: controllers.instrumentDisplayControlsController,
    melodySetupControlsController: controllers.melodySetupControlsController,
    melodyPracticeControlsController: controllers.melodyPracticeControlsController,
    sessionTransportControlsController: controllers.sessionTransportControlsController,
    audioInputControlsController: controllers.audioInputControlsController,
    metronomeControlsController: controllers.metronomeControlsController,
    metronomeController: controllers.metronomeController,
  };
}

export function buildSessionEditorBootstrapGraphEntrypointDeps(
  args: SessionEditorBootstrapGraphEntrypointArgs
): SessionEditorBootstrapGraphEntrypointDeps {
  return {
    ...buildStaticEntrypointDeps(),
    ...buildInteractionGuardDeps(args.interactionGuards),
    ...buildControllerDeps(args.controllers),
    ...buildBootstrapControllerDeps(args.bootstrapControllers),
  };
}
