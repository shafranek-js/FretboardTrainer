import { describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({
  dom: { melodySelector: {} },
  state: { currentInstrument: { name: 'guitar' } },
  saveSettings: vi.fn(),
  handleModeChange: vi.fn(),
  redrawFretboard: vi.fn(),
  scheduleMelodyTimelineRenderFromState: vi.fn(),
  updateInstrumentUI: vi.fn(),
  drawFretboard: vi.fn(),
  renderMelodyTabTimelineFromState: vi.fn(),
  playSound: vi.fn(),
  loadInstrumentSoundfont: vi.fn(),
  scheduleSessionTimeout: vi.fn(),
  seekActiveMelodySessionToEvent: vi.fn(),
  resetMicPolyphonicDetectorTelemetry: vi.fn(),
  startListening: vi.fn(),
  ensureAudioRuntime: vi.fn(),
  clearResultMessage: vi.fn(),
  refreshDisplayFormatting: vi.fn(),
  setMelodySetupSummary: vi.fn(),
  setMelodySetupCollapsed: vi.fn(),
  setPracticeSetupSummary: vi.fn(),
  setSessionToolsCollapsed: vi.fn(),
  setSessionToolsSummary: vi.fn(),
  setModalVisible: vi.fn(),
  setPromptText: vi.fn(),
  refreshLayoutControlsVisibility: vi.fn(),
  setUiWorkflow: vi.fn(),
  setLayoutControlsExpanded: vi.fn(),
  toggleLayoutControlsExpanded: vi.fn(),
  clampMetronomeVolumePercent: vi.fn((value: number) => value),
  DEFAULT_METRONOME_BEATS_PER_BAR: 7,
  setMetronomeMeter: vi.fn(),
  setMetronomeTempo: vi.fn(),
  setMetronomeVolume: vi.fn(),
  startMetronome: vi.fn(),
  stopMetronome: vi.fn(),
  isMetronomeRunning: vi.fn(),
  subscribeMetronomeBeat: vi.fn(),
  resolveMelodyMetronomeMeterProfile: vi.fn(),
  setNoteNamingPreference: vi.fn(),
  normalizeAudioInputDeviceId: vi.fn(),
  setPreferredAudioInputDeviceId: vi.fn(),
  normalizeInputSource: vi.fn(),
  normalizeMidiInputDeviceId: vi.fn(),
  setInputSourcePreference: vi.fn(),
  setPreferredMidiInputDeviceId: vi.fn(),
  getMelodyById: vi.fn(),
  listMelodiesForInstrument: vi.fn(),
  saveCustomAsciiTabMelody: vi.fn(),
  saveCustomEventMelody: vi.fn(),
  updateCustomEventMelody: vi.fn(),
  updateCustomAsciiTabMelody: vi.fn(),
  detectMicPolyphonicFrame: vi.fn(),
  normalizeMicPolyphonicDetectorProvider: vi.fn(),
  parseAsciiTabToMelodyEvents: vi.fn(),
  convertLoadedGpScoreTrackToImportedMelody: vi.fn(),
  loadGpScoreFromBytes: vi.fn(),
  convertLoadedMidiTrackToImportedMelody: vi.fn(),
  loadMidiFileFromBytes: vi.fn(),
  convertLoadedMusescoreTrackToImportedMelody: vi.fn(),
  loadMusescoreFileFromBytes: vi.fn(),
  buildExportMidiFileName: vi.fn(),
  exportMelodyToMidiBytes: vi.fn(),
  updateScrollingTabPanelRuntime: vi.fn(),
  isPerformanceStyleMode: vi.fn(),
  stopListening: vi.fn(),
  setPracticeSetupCollapsed: vi.fn(),
  setResultMessage: vi.fn(),
  isMelodyWorkflowMode: vi.fn(),
  clearMelodyTimelineContextMenu: vi.fn(),
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

vi.mock('../../dom', () => ({ dom: shared.dom }));
vi.mock('../../state', () => ({ state: shared.state }));
vi.mock('../../storage', () => ({ saveSettings: shared.saveSettings }));
vi.mock('../../audio', () => ({
  playSound: shared.playSound,
  loadInstrumentSoundfont: shared.loadInstrumentSoundfont,
}));
vi.mock('../../logic', () => ({
  scheduleSessionTimeout: shared.scheduleSessionTimeout,
  seekActiveMelodySessionToEvent: shared.seekActiveMelodySessionToEvent,
  resetMicPolyphonicDetectorTelemetry: shared.resetMicPolyphonicDetectorTelemetry,
  startListening: shared.startListening,
  stopListening: shared.stopListening,
}));
vi.mock('../../audio-runtime', () => ({ ensureAudioRuntime: shared.ensureAudioRuntime }));
vi.mock('../../ui-signals', () => ({
  clearResultMessage: shared.clearResultMessage,
  refreshDisplayFormatting: shared.refreshDisplayFormatting,
  setMelodySetupSummary: shared.setMelodySetupSummary,
  setMelodySetupCollapsed: shared.setMelodySetupCollapsed,
  setPracticeSetupCollapsed: shared.setPracticeSetupCollapsed,
  setPracticeSetupSummary: shared.setPracticeSetupSummary,
  setSessionToolsCollapsed: shared.setSessionToolsCollapsed,
  setSessionToolsSummary: shared.setSessionToolsSummary,
  setModalVisible: shared.setModalVisible,
  setPromptText: shared.setPromptText,
  refreshLayoutControlsVisibility: shared.refreshLayoutControlsVisibility,
  setResultMessage: shared.setResultMessage,
  setUiMode: shared.setUiMode,
  setUiWorkflow: shared.setUiWorkflow,
  setLayoutControlsExpanded: shared.setLayoutControlsExpanded,
  toggleLayoutControlsExpanded: shared.toggleLayoutControlsExpanded,
}));
vi.mock('../../metronome', () => ({
  clampMetronomeVolumePercent: shared.clampMetronomeVolumePercent,
  DEFAULT_METRONOME_BEATS_PER_BAR: shared.DEFAULT_METRONOME_BEATS_PER_BAR,
  setMetronomeMeter: shared.setMetronomeMeter,
  setMetronomeTempo: shared.setMetronomeTempo,
  setMetronomeVolume: shared.setMetronomeVolume,
  startMetronome: shared.startMetronome,
  stopMetronome: shared.stopMetronome,
  isMetronomeRunning: shared.isMetronomeRunning,
  subscribeMetronomeBeat: shared.subscribeMetronomeBeat,
}));
vi.mock('../../melody-meter', () => ({
  resolveMelodyMetronomeMeterProfile: shared.resolveMelodyMetronomeMeterProfile,
}));
vi.mock('../../note-display', () => ({ setNoteNamingPreference: shared.setNoteNamingPreference }));
vi.mock('../../audio-input-devices', () => ({
  normalizeAudioInputDeviceId: shared.normalizeAudioInputDeviceId,
  refreshAudioInputDeviceOptions: shared.refreshAudioInputDeviceOptions,
  setPreferredAudioInputDeviceId: shared.setPreferredAudioInputDeviceId,
}));
vi.mock('../../midi-runtime', () => ({
  normalizeInputSource: shared.normalizeInputSource,
  normalizeMidiInputDeviceId: shared.normalizeMidiInputDeviceId,
  refreshInputSourceAvailabilityUi: shared.refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices: shared.refreshMidiInputDevices,
  setInputSourcePreference: shared.setInputSourcePreference,
  setPreferredMidiInputDeviceId: shared.setPreferredMidiInputDeviceId,
}));
vi.mock('../../app-feedback', () => ({
  formatUserFacingError: shared.formatUserFacingError,
  showNonBlockingError: shared.showNonBlockingError,
}));
vi.mock('../../melody-library', () => ({
  deleteCustomMelody: shared.deleteCustomMelody,
  getMelodyById: shared.getMelodyById,
  isCustomMelodyId: shared.isCustomMelodyId,
  listMelodiesForInstrument: shared.listMelodiesForInstrument,
  saveCustomAsciiTabMelody: shared.saveCustomAsciiTabMelody,
  saveCustomEventMelody: shared.saveCustomEventMelody,
  updateCustomEventMelody: shared.updateCustomEventMelody,
  updateCustomAsciiTabMelody: shared.updateCustomAsciiTabMelody,
}));
vi.mock('../../user-feedback-port', () => ({
  confirmUserAction: shared.confirmUserAction,
}));
vi.mock('../../mic-polyphonic-detector-ui', () => ({
  refreshMicPolyphonicDetectorAudioInfoUi: shared.refreshMicPolyphonicDetectorAudioInfoUi,
}));
vi.mock('../../mic-performance-readiness-ui', () => ({
  refreshMicPerformanceReadinessUi: shared.refreshMicPerformanceReadinessUi,
}));
vi.mock('../../mic-polyphonic-detector', () => ({
  detectMicPolyphonicFrame: shared.detectMicPolyphonicFrame,
  normalizeMicPolyphonicDetectorProvider: shared.normalizeMicPolyphonicDetectorProvider,
}));
vi.mock('../../ascii-tab-melody-parser', () => ({
  parseAsciiTabToMelodyEvents: shared.parseAsciiTabToMelodyEvents,
}));
vi.mock('../../gp-import', () => ({
  convertLoadedGpScoreTrackToImportedMelody: shared.convertLoadedGpScoreTrackToImportedMelody,
  loadGpScoreFromBytes: shared.loadGpScoreFromBytes,
}));
vi.mock('../../midi-file-import', () => ({
  convertLoadedMidiTrackToImportedMelody: shared.convertLoadedMidiTrackToImportedMelody,
  loadMidiFileFromBytes: shared.loadMidiFileFromBytes,
}));
vi.mock('../../musescore-file-import', () => ({
  convertLoadedMusescoreTrackToImportedMelody: shared.convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes: shared.loadMusescoreFileFromBytes,
}));
vi.mock('../../midi-file-export', () => ({
  buildExportMidiFileName: shared.buildExportMidiFileName,
  exportMelodyToMidiBytes: shared.exportMelodyToMidiBytes,
}));
vi.mock('../../scrolling-tab-panel', () => ({
  updateScrollingTabPanelRuntime: shared.updateScrollingTabPanelRuntime,
}));
vi.mock('../../melody-tab-timeline', () => ({
  clearMelodyTimelineContextMenu: shared.clearMelodyTimelineContextMenu,
  setMelodyTimelineSeekHandler: vi.fn(),
  setMelodyTimelineStudyRangeCommitHandler: vi.fn(),
}));
vi.mock('../../tablature-optimizer', () => ({
  DEFAULT_TABLATURE_MAX_FRET: shared.DEFAULT_TABLATURE_MAX_FRET,
}));
vi.mock('../../training-mode-groups', () => ({
  isMelodyWorkflowMode: shared.isMelodyWorkflowMode,
  isPerformanceStyleMode: shared.isPerformanceStyleMode,
}));
vi.mock('../modal-controller', () => ({
  registerModalControls: shared.registerModalControls,
}));
vi.mock('../confirm-controller', () => ({
  registerConfirmControls: shared.registerConfirmControls,
}));
vi.mock('../profile-controller', () => ({
  registerProfileControls: shared.registerProfileControls,
}));
vi.mock('../../ui', () => ({
  handleModeChange: shared.handleModeChange,
  redrawFretboard: shared.redrawFretboard,
  scheduleMelodyTimelineRenderFromState: shared.scheduleMelodyTimelineRenderFromState,
  updateInstrumentUI: shared.updateInstrumentUI,
  drawFretboard: shared.drawFretboard,
  renderMelodyTabTimelineFromState: shared.renderMelodyTabTimelineFromState,
}));

type SessionEditorBootstrapGraphEntrypointArgs = Parameters<
  typeof import('./entrypoint-graph-deps').buildSessionEditorBootstrapGraphEntrypointDeps
>[0];

function createStub<T>(): T {
  return {} as T;
}

describe('session-editor-bootstrap-entrypoint-graph-deps', () => {
  it('builds bootstrap graph deps from grouped entrypoint imports and controller refs', async () => {
    const { buildSessionEditorBootstrapGraphEntrypointDeps } = await import('./entrypoint-graph-deps');

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
