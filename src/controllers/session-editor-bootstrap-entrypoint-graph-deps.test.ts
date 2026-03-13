import { describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({
  dom: { melodySelector: {} },
  state: { currentInstrument: { name: 'guitar' } },
  saveSettings: vi.fn(),
  stopListening: vi.fn(),
  setPracticeSetupCollapsed: vi.fn(),
  setResultMessage: vi.fn(),
  isMelodyWorkflowMode: vi.fn(),
  clearMelodyTimelineContextMenu: vi.fn(),
  renderMelodyTabTimelineFromState: vi.fn(),
  showNonBlockingError: vi.fn(),
  formatUserFacingError: vi.fn(),
  confirmUserAction: vi.fn(),
  isCustomMelodyId: vi.fn(),
  deleteCustomMelody: vi.fn(),
  refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
  refreshMicPerformanceReadinessUi: vi.fn(),
  setUiMode: vi.fn(),
  refreshInputSourceAvailabilityUi: vi.fn(),
  refreshAudioInputDeviceOptions: vi.fn(),
  refreshMidiInputDevices: vi.fn(),
  registerModalControls: vi.fn(),
  registerConfirmControls: vi.fn(),
  registerProfileControls: vi.fn(),
  DEFAULT_TABLATURE_MAX_FRET: 21,
}));

vi.mock('../dom', () => ({ dom: shared.dom }));
vi.mock('../state', () => ({ state: shared.state }));
vi.mock('../storage', () => ({ saveSettings: shared.saveSettings }));
vi.mock('../logic', () => ({ stopListening: shared.stopListening }));
vi.mock('../ui-signals', () => ({
  setPracticeSetupCollapsed: shared.setPracticeSetupCollapsed,
  setResultMessage: shared.setResultMessage,
  setUiMode: shared.setUiMode,
}));
vi.mock('../audio-input-devices', () => ({
  refreshAudioInputDeviceOptions: shared.refreshAudioInputDeviceOptions,
}));
vi.mock('../midi-runtime', () => ({
  refreshInputSourceAvailabilityUi: shared.refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices: shared.refreshMidiInputDevices,
}));
vi.mock('../app-feedback', () => ({
  formatUserFacingError: shared.formatUserFacingError,
  showNonBlockingError: shared.showNonBlockingError,
}));
vi.mock('../melody-library', () => ({
  deleteCustomMelody: shared.deleteCustomMelody,
  isCustomMelodyId: shared.isCustomMelodyId,
}));
vi.mock('../user-feedback-port', () => ({
  confirmUserAction: shared.confirmUserAction,
}));
vi.mock('../mic-polyphonic-detector-ui', () => ({
  refreshMicPolyphonicDetectorAudioInfoUi: shared.refreshMicPolyphonicDetectorAudioInfoUi,
}));
vi.mock('../mic-performance-readiness-ui', () => ({
  refreshMicPerformanceReadinessUi: shared.refreshMicPerformanceReadinessUi,
}));
vi.mock('../melody-tab-timeline', () => ({
  clearMelodyTimelineContextMenu: shared.clearMelodyTimelineContextMenu,
  setMelodyTimelineSeekHandler: vi.fn(),
  setMelodyTimelineStudyRangeCommitHandler: vi.fn(),
}));
vi.mock('../tablature-optimizer', () => ({
  DEFAULT_TABLATURE_MAX_FRET: shared.DEFAULT_TABLATURE_MAX_FRET,
}));
vi.mock('../training-mode-groups', () => ({
  isMelodyWorkflowMode: shared.isMelodyWorkflowMode,
}));
vi.mock('./modal-controller', () => ({
  registerModalControls: shared.registerModalControls,
}));
vi.mock('./confirm-controller', () => ({
  registerConfirmControls: shared.registerConfirmControls,
}));
vi.mock('./profile-controller', () => ({
  registerProfileControls: shared.registerProfileControls,
}));
vi.mock('../ui', () => ({
  renderMelodyTabTimelineFromState: shared.renderMelodyTabTimelineFromState,
}));

type SessionEditorBootstrapGraphEntrypointArgs = Parameters<
  typeof import('./session-editor-bootstrap-entrypoint-graph-deps').buildSessionEditorBootstrapGraphEntrypointDeps
>[0];

function createStub<T>(): T {
  return {} as T;
}

describe('session-editor-bootstrap-entrypoint-graph-deps', () => {
  it('builds bootstrap graph deps from grouped entrypoint imports and controller refs', async () => {
    const { buildSessionEditorBootstrapGraphEntrypointDeps } = await import(
      './session-editor-bootstrap-entrypoint-graph-deps'
    );

    const args = {
      interactionGuards: {
        isTextEntryElement: vi.fn(),
        isElementWithin: vi.fn(),
        isAnyBlockingModalOpen: vi.fn(),
      },
      controllers: {
        refreshMelodyOptionsForCurrentInstrument: vi.fn(),
        selectedMelodyContextController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['selectedMelodyContextController']
        >(),
        melodyPracticeSettingsBridgeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyPracticeSettingsBridgeController']
        >(),
        melodyTimelineEditingBridgeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyTimelineEditingBridgeController']
        >(),
        melodyEventEditorBridgeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyEventEditorBridgeController']
        >(),
        melodyTimelineUiController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyTimelineUiController']
        >(),
        melodyDemoRuntimeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyDemoRuntimeController']
        >(),
        melodyLibraryActionsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyLibraryActionsController']
        >(),
        curriculumPresetBridgeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['curriculumPresetBridgeController']
        >(),
        practiceSetupSummaryController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['practiceSetupSummaryController']
        >(),
        melodyPracticeActionsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyPracticeActionsController']
        >(),
        melodyImportWorkspaceController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['melodyImportWorkspaceController']
        >(),
        registerMelodyTimelineEditingInteractionHandlers: vi.fn(),
        metronomeRuntimeBridgeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['metronomeRuntimeBridgeController']
        >(),
        metronomeBridgeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['metronomeBridgeController']
        >(),
        micSettingsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['micSettingsController']
        >(),
        practicePresetUiController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['practicePresetUiController']
        >(),
        micPolyphonicTelemetryController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['micPolyphonicTelemetryController']
        >(),
        workflowController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['controllers']['workflowController']
        >(),
      },
      bootstrapControllers: {
        melodyImportControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['melodyImportControlsController']
        >(),
        workflowLayoutControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['workflowLayoutControlsController']
        >(),
        practicePresetControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['practicePresetControlsController']
        >(),
        practiceSetupControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['practiceSetupControlsController']
        >(),
        instrumentDisplayControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['instrumentDisplayControlsController']
        >(),
        melodySetupControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['melodySetupControlsController']
        >(),
        melodyPracticeControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['melodyPracticeControlsController']
        >(),
        sessionTransportControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['sessionTransportControlsController']
        >(),
        audioInputControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['audioInputControlsController']
        >(),
        metronomeControlsController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['metronomeControlsController']
        >(),
        metronomeController: createStub<
          SessionEditorBootstrapGraphEntrypointArgs['bootstrapControllers']['metronomeController']
        >(),
      },
    } satisfies SessionEditorBootstrapGraphEntrypointArgs;

    const result = buildSessionEditorBootstrapGraphEntrypointDeps(args);

    expect(result.dom).toBe(shared.dom);
    expect(result.state).toBe(shared.state);
    expect(result.maxFret).toBe(21);
    expect(result.saveSettings).toBe(shared.saveSettings);
    expect(result.stopListening).toBe(shared.stopListening);
    expect(result.setPracticeSetupCollapsed).toBe(shared.setPracticeSetupCollapsed);
    expect(result.setResultMessage).toBe(shared.setResultMessage);
    expect(result.isMelodyWorkflowMode).toBe(shared.isMelodyWorkflowMode);
    expect(result.refreshAudioInputDeviceOptions).toBe(shared.refreshAudioInputDeviceOptions);
    expect(result.refreshMidiInputDevices).toBe(shared.refreshMidiInputDevices);
    expect(result.registerModalControls).toBe(shared.registerModalControls);
    expect(result.registerConfirmControls).toBe(shared.registerConfirmControls);
    expect(result.registerProfileControls).toBe(shared.registerProfileControls);
    expect(result.selectedMelodyContextController).toBe(
      args.controllers.selectedMelodyContextController
    );
    expect(result.workflowController).toBe(args.controllers.workflowController);
    expect(result.registerMelodyTimelineEditingInteractionHandlers).toBe(
      args.controllers.registerMelodyTimelineEditingInteractionHandlers
    );
    expect(result.melodyImportControlsController).toBe(
      args.bootstrapControllers.melodyImportControlsController
    );
    expect(result.metronomeController).toBe(args.bootstrapControllers.metronomeController);
    expect(result.isTextEntryElement).toBe(args.interactionGuards.isTextEntryElement);
    expect(result.isElementWithin).toBe(args.interactionGuards.isElementWithin);
    expect(result.isAnyBlockingModalOpen).toBe(args.interactionGuards.isAnyBlockingModalOpen);
  });
});
