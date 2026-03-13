import { describe, expect, it, vi } from 'vitest';
import { buildSessionControllerGraphDeps } from './session-controller-graph-deps';

type SessionControllerGraphDepsBuilderArgs = Parameters<typeof buildSessionControllerGraphDeps>[0];

describe('session-controller-graph-deps', () => {
  it('builds top-level graph deps from app context and controller bridges', () => {
    const dummyElement = {} as HTMLElement;
    const domTarget = {
      melodyMidiQuantize: { value: '1/8' },
      melodyDemoBpm: { value: '132' },
      melodySelector: { value: 'melody-1' },
      trainingMode: { value: 'melody' },
      stringSelector: dummyElement,
    };
    const dom = new Proxy(domTarget, {
      get(target, prop) {
        return typeof prop === 'string' && prop in target
          ? target[prop as keyof typeof target]
          : dummyElement;
      },
    }) as unknown as SessionControllerGraphDepsBuilderArgs['app']['dom'];

    const state = {
      preferredMelodyId: null,
      currentInstrument: { name: 'guitar' },
      melodyTransposeById: undefined,
      melodyTransposeSemitones: 2,
      melodyStringShiftById: undefined,
      melodyStringShift: 1,
      melodyTimelineSelectedEventIndex: 4,
      melodyTimelineSelectedNoteIndex: 1,
      uiWorkflow: 'study-melody',
      isListening: false,
      melodyTimelinePreviewIndex: 9,
      melodyTimelinePreviewLabel: 'preview',
      currentPrompt: null,
      calibratedA4: 440,
      cooldown: false,
      melodyStudyRangeById: undefined,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 1,
      melodyLoopRangeEnabled: false,
      audioContext: null,
      analyser: null,
    } as unknown as SessionControllerGraphDepsBuilderArgs['app']['state'];

    const selectedMelody = {
      id: 'melody-1',
      events: [{}, {}],
    } as unknown as ReturnType<SessionControllerGraphDepsBuilderArgs['controllerBridges']['getSelectedMelody']>;
    const getSelectedMelody = vi.fn(() => selectedMelody);
    const getStoredMelodyStudyRange = vi.fn(() => ({ startIndex: 0, endIndex: 1 }));
    const syncMetronomeMeterFromSelectedMelody = vi.fn();
    const syncMelodyDemoBpmDisplay = vi.fn();
    const isMelodyDemoPlaying = vi.fn(() => true);
    const getClampedMetronomeBpmFromInput = vi.fn(() => 120);
    const stopMelodyDemoPlayback = vi.fn();
    const updateMicNoiseGateInfo = vi.fn();
    const normalizeMicPolyphonicDetectorProvider = vi.fn(() => 'spectrum');
    const detectMicPolyphonicFrame = vi.fn((input) => input);

    const runtime = {
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
      clampMetronomeVolumePercent: vi.fn((value) => value),
      defaultMetronomeBeatsPerBar: 4,
      setMetronomeMeter: vi.fn(),
      setMetronomeTempo: vi.fn(),
      setMetronomeVolume: vi.fn(),
      startMetronome: vi.fn(),
      stopMetronome: vi.fn(),
      isMetronomeRunning: vi.fn(() => false),
      subscribeMetronomeBeat: vi.fn(),
      resolveMelodyMetronomeMeterProfile: vi.fn(() => ({
        beatsPerBar: 4,
        beatUnitDenominator: 4,
        secondaryAccentBeatIndices: [],
      })),
      setNoteNamingPreference: vi.fn(),
      normalizeAudioInputDeviceId: vi.fn(),
      refreshAudioInputDeviceOptions: vi.fn(),
      setPreferredAudioInputDeviceId: vi.fn(),
      normalizeInputSource: vi.fn(),
      refreshInputSourceAvailabilityUi: vi.fn(),
      refreshMidiInputDevices: vi.fn(),
      setInputSourcePreference: vi.fn(),
      normalizeMidiInputDeviceId: vi.fn(),
      setPreferredMidiInputDeviceId: vi.fn(),
      formatUserFacingError: vi.fn(),
      showNonBlockingError: vi.fn(),
      deleteCustomMelody: vi.fn(),
      getMelodyById: vi.fn(() => selectedMelody),
      isCustomMelodyId: vi.fn(() => false),
      listMelodiesForInstrument: vi.fn(() => [selectedMelody]),
      saveCustomAsciiTabMelody: vi.fn(),
      saveCustomEventMelody: vi.fn(),
      updateCustomEventMelody: vi.fn(),
      updateCustomAsciiTabMelody: vi.fn(),
      confirmUserAction: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      detectMicPolyphonicFrame,
      normalizeMicPolyphonicDetectorProvider,
      parseAsciiTabToMelodyEvents: vi.fn(),
      convertLoadedGpScoreTrackToImportedMelody: vi.fn(),
      loadGpScoreFromBytes: vi.fn(),
      convertLoadedMidiTrackToImportedMelody: vi.fn(),
      loadMidiFileFromBytes: vi.fn(),
      convertLoadedMusescoreTrackToImportedMelody: vi.fn(),
      loadMusescoreFileFromBytes: vi.fn(),
      buildExportMidiFileName: vi.fn(),
      exportMelodyToMidiBytes: vi.fn(),
      isMelodyWorkflowMode: vi.fn(() => true),
      isPerformanceStyleMode: vi.fn(() => false),
      updateScrollingTabPanelRuntime: vi.fn(),
    } as unknown as SessionControllerGraphDepsBuilderArgs['runtime'];

    const ui = {
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
    } as unknown as SessionControllerGraphDepsBuilderArgs['ui'];

    const result = buildSessionControllerGraphDeps({
      app: { dom, state },
      runtime,
      ui,
      controllerBridges: {
        getSelectedMelody,
        getStoredMelodyStudyRange,
        syncMetronomeMeterFromSelectedMelody,
        syncMelodyDemoBpmDisplay,
        isMelodyDemoPlaying,
        getClampedMetronomeBpmFromInput,
        stopMelodyDemoPlayback,
        updateMicNoiseGateInfo,
      },
    });

    expect(result.importEditor.getSelectedMidiImportQuantize()).toBe('1/8');
    expect(result.importEditor.state).not.toBe(state);
    expect(result.importEditor.state.currentInstrument).toBe(state.currentInstrument);
    expect(result.importEditor.getPracticeAdjustmentSummary()).toEqual({
      transposeSemitones: 2,
      stringShift: 1,
    });
    expect(
      result.melodyRuntime.melodyTimelineEditing.melodyTimelineEditingOrchestrator.getSelectedMelody()
    ).toBe(selectedMelody);
    expect(result.configurationGraph.metronome.melodyTempo.getSelectedMelody()).toBe(selectedMelody);
    expect(result.configurationGraph.metronome.melodyTempo.isMelodyDemoPlaying()).toBe(true);
    expect(result.melodyRuntime.melodySettings.selectedMelodyContext.state).not.toBe(state);
    expect(result.melodyRuntime.melodySettings.melodyPracticeSettings.state).not.toBe(state);
    expect(result.configurationGraph.curriculumPreset.curriculumPreset.getClampedMetronomeBpmFromInput()).toBe(120);

    result.configurationGraph.inputControls.inputDevice.stopMelodyDemoPlayback({ clearUi: true });
    result.configurationGraph.inputControls.inputDevice.updateMicNoiseGateInfo();
    result.melodyRuntime.melodyTimelineEditing.melodyTimelineEditingOrchestrator.setTimelineSelection({
      eventIndex: 7,
      noteIndex: 3,
    });
    result.melodyRuntime.runtimeUi.sessionStart.clearMelodyTimelinePreviewState();
    result.melodyRuntime.melodySettings.melodyPracticeSettings.state.melodyTransposeSemitones = 6;
    result.melodyRuntime.melodySettings.melodyPracticeSettings.state.melodyLoopRangeEnabled = true;
    result.melodyRuntime.melodyDemo.melodyDemoRuntime.state.currentMelodyEventIndex = 5;
    result.melodyRuntime.melodyDemo.sessionTransportControls.state.cooldown = true;

    result.configurationGraph.inputControls.micPolyphonicBenchmark.detectMicPolyphonicFrame(
      { provider: 'invalid' } as unknown as Parameters<
        typeof result.configurationGraph.inputControls.micPolyphonicBenchmark.detectMicPolyphonicFrame
      >[0]
    );

    expect(stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(updateMicNoiseGateInfo).toHaveBeenCalledTimes(1);
    expect(normalizeMicPolyphonicDetectorProvider).toHaveBeenCalledWith('invalid');
    expect(detectMicPolyphonicFrame).toHaveBeenCalledWith({ provider: 'spectrum' });
    expect(state.melodyTimelineSelectedEventIndex).toBe(7);
    expect(state.melodyTimelineSelectedNoteIndex).toBe(3);
    expect(state.melodyTimelinePreviewIndex).toBeNull();
    expect(state.melodyTimelinePreviewLabel).toBeNull();
    expect(state.melodyTransposeSemitones).toBe(6);
    expect(state.melodyLoopRangeEnabled).toBe(true);
    expect(result.melodyRuntime.melodyDemo.melodyDemoRuntime.state).not.toBe(state);
    expect(result.melodyRuntime.melodyDemo.sessionTransportControls.state).not.toBe(state);
    expect(state.currentMelodyEventIndex).toBe(5);
    expect(state.cooldown).toBe(true);
    expect(getStoredMelodyStudyRange).not.toHaveBeenCalled();
  });
});
