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
  stopListening: vi.fn(),
  ensureAudioRuntime: vi.fn(),
  clearResultMessage: vi.fn(),
  refreshDisplayFormatting: vi.fn(),
  setMelodySetupSummary: vi.fn(),
  setMelodySetupCollapsed: vi.fn(),
  setPracticeSetupCollapsed: vi.fn(),
  setPracticeSetupSummary: vi.fn(),
  setSessionToolsCollapsed: vi.fn(),
  setSessionToolsSummary: vi.fn(),
  setModalVisible: vi.fn(),
  setPromptText: vi.fn(),
  refreshLayoutControlsVisibility: vi.fn(),
  setResultMessage: vi.fn(),
  setUiMode: vi.fn(),
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
  refreshAudioInputDeviceOptions: vi.fn(),
  setPreferredAudioInputDeviceId: vi.fn(),
  normalizeInputSource: vi.fn(),
  normalizeMidiInputDeviceId: vi.fn(),
  refreshInputSourceAvailabilityUi: vi.fn(),
  refreshMidiInputDevices: vi.fn(),
  setInputSourcePreference: vi.fn(),
  setPreferredMidiInputDeviceId: vi.fn(),
  formatUserFacingError: vi.fn(),
  showNonBlockingError: vi.fn(),
  deleteCustomMelody: vi.fn(),
  getMelodyById: vi.fn(),
  isCustomMelodyId: vi.fn(),
  listMelodiesForInstrument: vi.fn(),
  saveCustomAsciiTabMelody: vi.fn(),
  saveCustomEventMelody: vi.fn(),
  updateCustomEventMelody: vi.fn(),
  updateCustomAsciiTabMelody: vi.fn(),
  confirmUserAction: vi.fn(),
  refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
  refreshMicPerformanceReadinessUi: vi.fn(),
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
  isMelodyWorkflowMode: vi.fn(),
  isPerformanceStyleMode: vi.fn(),
}));

vi.mock('../dom', () => ({ dom: shared.dom }));
vi.mock('../state', () => ({ state: shared.state }));
vi.mock('../storage', () => ({ saveSettings: shared.saveSettings }));
vi.mock('../ui', () => ({
  handleModeChange: shared.handleModeChange,
  redrawFretboard: shared.redrawFretboard,
  scheduleMelodyTimelineRenderFromState: shared.scheduleMelodyTimelineRenderFromState,
  updateInstrumentUI: shared.updateInstrumentUI,
  drawFretboard: shared.drawFretboard,
  renderMelodyTabTimelineFromState: shared.renderMelodyTabTimelineFromState,
}));
vi.mock('../audio', () => ({
  playSound: shared.playSound,
  loadInstrumentSoundfont: shared.loadInstrumentSoundfont,
}));
vi.mock('../logic', () => ({
  scheduleSessionTimeout: shared.scheduleSessionTimeout,
  seekActiveMelodySessionToEvent: shared.seekActiveMelodySessionToEvent,
  resetMicPolyphonicDetectorTelemetry: shared.resetMicPolyphonicDetectorTelemetry,
  startListening: shared.startListening,
  stopListening: shared.stopListening,
}));
vi.mock('../audio-runtime', () => ({ ensureAudioRuntime: shared.ensureAudioRuntime }));
vi.mock('../ui-signals', () => ({
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
vi.mock('../metronome', () => ({
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
vi.mock('../melody-meter', () => ({
  resolveMelodyMetronomeMeterProfile: shared.resolveMelodyMetronomeMeterProfile,
}));
vi.mock('../note-display', () => ({ setNoteNamingPreference: shared.setNoteNamingPreference }));
vi.mock('../audio-input-devices', () => ({
  normalizeAudioInputDeviceId: shared.normalizeAudioInputDeviceId,
  refreshAudioInputDeviceOptions: shared.refreshAudioInputDeviceOptions,
  setPreferredAudioInputDeviceId: shared.setPreferredAudioInputDeviceId,
}));
vi.mock('../midi-runtime', () => ({
  normalizeInputSource: shared.normalizeInputSource,
  normalizeMidiInputDeviceId: shared.normalizeMidiInputDeviceId,
  refreshInputSourceAvailabilityUi: shared.refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices: shared.refreshMidiInputDevices,
  setInputSourcePreference: shared.setInputSourcePreference,
  setPreferredMidiInputDeviceId: shared.setPreferredMidiInputDeviceId,
}));
vi.mock('../app-feedback', () => ({
  formatUserFacingError: shared.formatUserFacingError,
  showNonBlockingError: shared.showNonBlockingError,
}));
vi.mock('../melody-library', () => ({
  deleteCustomMelody: shared.deleteCustomMelody,
  getMelodyById: shared.getMelodyById,
  isCustomMelodyId: shared.isCustomMelodyId,
  listMelodiesForInstrument: shared.listMelodiesForInstrument,
  saveCustomAsciiTabMelody: shared.saveCustomAsciiTabMelody,
  saveCustomEventMelody: shared.saveCustomEventMelody,
  updateCustomEventMelody: shared.updateCustomEventMelody,
  updateCustomAsciiTabMelody: shared.updateCustomAsciiTabMelody,
}));
vi.mock('../user-feedback-port', () => ({ confirmUserAction: shared.confirmUserAction }));
vi.mock('../mic-polyphonic-detector-ui', () => ({
  refreshMicPolyphonicDetectorAudioInfoUi: shared.refreshMicPolyphonicDetectorAudioInfoUi,
}));
vi.mock('../mic-performance-readiness-ui', () => ({
  refreshMicPerformanceReadinessUi: shared.refreshMicPerformanceReadinessUi,
}));
vi.mock('../mic-polyphonic-detector', () => ({
  detectMicPolyphonicFrame: shared.detectMicPolyphonicFrame,
  normalizeMicPolyphonicDetectorProvider: shared.normalizeMicPolyphonicDetectorProvider,
}));
vi.mock('../ascii-tab-melody-parser', () => ({
  parseAsciiTabToMelodyEvents: shared.parseAsciiTabToMelodyEvents,
}));
vi.mock('../gp-import', () => ({
  convertLoadedGpScoreTrackToImportedMelody: shared.convertLoadedGpScoreTrackToImportedMelody,
  loadGpScoreFromBytes: shared.loadGpScoreFromBytes,
}));
vi.mock('../midi-file-import', () => ({
  convertLoadedMidiTrackToImportedMelody: shared.convertLoadedMidiTrackToImportedMelody,
  loadMidiFileFromBytes: shared.loadMidiFileFromBytes,
}));
vi.mock('../musescore-file-import', () => ({
  convertLoadedMusescoreTrackToImportedMelody: shared.convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes: shared.loadMusescoreFileFromBytes,
}));
vi.mock('../midi-file-export', () => ({
  buildExportMidiFileName: shared.buildExportMidiFileName,
  exportMelodyToMidiBytes: shared.exportMelodyToMidiBytes,
}));
vi.mock('../scrolling-tab-panel', () => ({
  updateScrollingTabPanelRuntime: shared.updateScrollingTabPanelRuntime,
}));
vi.mock('../training-mode-groups', () => ({
  isMelodyWorkflowMode: shared.isMelodyWorkflowMode,
  isPerformanceStyleMode: shared.isPerformanceStyleMode,
}));

describe('session-controller-entrypoint-graph-deps', () => {
  it('builds app/runtime/ui deps from entrypoint imports and controller bridges', async () => {
    const { buildSessionControllerGraphEntrypointDeps } = await import(
      './session-controller-entrypoint-graph-deps'
    );
    const controllerBridges = {
      getSelectedMelody: vi.fn(),
      getStoredMelodyStudyRange: vi.fn(),
      syncMetronomeMeterFromSelectedMelody: vi.fn(),
      syncMelodyDemoBpmDisplay: vi.fn(),
      isMelodyDemoPlaying: vi.fn(),
      getClampedMetronomeBpmFromInput: vi.fn(),
      stopMelodyDemoPlayback: vi.fn(),
      updateMicNoiseGateInfo: vi.fn(),
    };

    const result = buildSessionControllerGraphEntrypointDeps({ controllerBridges });

    expect(result.app.dom).toBe(shared.dom);
    expect(result.app.state).toBe(shared.state);
    expect(result.runtime.saveSettings).toBe(shared.saveSettings);
    expect(result.runtime.handleModeChange).toBe(shared.handleModeChange);
    expect(result.runtime.defaultMetronomeBeatsPerBar).toBe(7);
    expect(result.runtime.setNoteNamingPreference).toBe(shared.setNoteNamingPreference);
    expect(result.runtime.isMelodyWorkflowMode).toBe(shared.isMelodyWorkflowMode);
    expect(result.runtime.isPerformanceStyleMode).toBe(shared.isPerformanceStyleMode);
    expect(result.ui.setUiMode).toBe(shared.setUiMode);
    expect(result.ui.setResultMessage).toBe(shared.setResultMessage);
    expect(result.controllerBridges).toBe(controllerBridges);
  });
});
