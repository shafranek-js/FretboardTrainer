import { describe, expect, it, vi } from 'vitest';
import { instruments } from '../../instruments';
import { buildSessionConfigurationGraphDeps } from './graph-deps';

type SessionConfigurationGraphDepsBuilderArgs = Parameters<
  typeof buildSessionConfigurationGraphDeps
>[0];

function createStub<T>(): T {
  return {} as T;
}

describe('session-configuration-graph-deps', () => {
  it('builds configuration graph sections through grouped domain builders', () => {
    const checkboxE = { value: 'E', checked: false };
    const checkboxA = { value: 'A', checked: false };
    const stringSelector = {
      querySelectorAll: vi.fn(() => [checkboxE, checkboxA]),
    };
    const dummyElement = {} as HTMLElement;
    const dom = new Proxy(
      {
        stringSelector,
        trainingMode: { value: 'melody' },
        melodyDemoBpm: { value: '132' },
      },
      {
        get(target, prop) {
          return typeof prop === 'string' && prop in target
            ? target[prop as keyof typeof target]
            : dummyElement;
        },
      }
    ) as unknown as SessionConfigurationGraphDepsBuilderArgs['app']['dom'];

    const state = {
      isListening: false,
      currentInstrument: instruments.guitar,
      showingAllNotes: false,
      performanceRuntimeStartedAtMs: null,
      performancePrerollLeadInVisible: false,
      melodyPlaybackBpmById: undefined,
      melodyTimelineZoomPercent: 100,
      scrollingTabZoomPercent: 100,
      inputSource: 'microphone',
      preferredAudioInputDeviceId: null,
      micSensitivityPreset: 'auto',
      micAutoNoiseFloorRms: null,
      micNoteAttackFilterPreset: 'balanced',
      micNoteHoldFilterPreset: '80ms',
      micPolyphonicDetectorProvider: 'spectrum',
      lastMicPolyphonicDetectorProviderUsed: null,
      lastMicPolyphonicDetectorFallbackFrom: null,
      lastMicPolyphonicDetectorWarning: null,
      micPolyphonicDetectorTelemetryFrames: 0,
      micPolyphonicDetectorTelemetryTotalLatencyMs: 0,
      micPolyphonicDetectorTelemetryMaxLatencyMs: 0,
      micPolyphonicDetectorTelemetryLastLatencyMs: null,
      micPolyphonicDetectorTelemetryFallbackFrames: 0,
      micPolyphonicDetectorTelemetryWarningFrames: 0,
      micPolyphonicDetectorTelemetryWindowStartedAtMs: 0,
      micPolyphonicDetectorTelemetryLastUiRefreshAtMs: 0,
      audioContext: null,
      analyser: null,
      dataArray: null,
    } as unknown as SessionConfigurationGraphDepsBuilderArgs['app']['state'];

    const selectedMelody = createStub<
      ReturnType<SessionConfigurationGraphDepsBuilderArgs['metronome']['melodyTempo']['getSelectedMelody']>
    >();
    const listMelodiesForCurrentInstrument = vi.fn(() => [selectedMelody]);
    const stopMelodyDemoPlayback = vi.fn();
    const updateMicNoiseGateInfo = vi.fn();
    const downloadTextFile = vi.fn();
    const resetTelemetry = vi.fn();

    const args = {
      app: {
        dom,
        state,
      },
      workspace: {
        saveSettings: vi.fn(),
        handleModeChange: vi.fn(),
        stopListening: vi.fn(),
        redrawFretboard: vi.fn(),
        updateInstrumentUI: vi.fn(),
        loadInstrumentSoundfont: vi.fn(async () => {}),
        renderMelodyTabTimelineFromState: vi.fn(),
        setPracticeSetupSummary: vi.fn(),
        setSessionToolsSummary: vi.fn(),
        setMelodySetupSummary: vi.fn(),
        setPracticeSetupCollapsed: vi.fn(),
        setMelodySetupCollapsed: vi.fn(),
        setSessionToolsCollapsed: vi.fn(),
        setLayoutControlsExpanded: vi.fn(),
        toggleLayoutControlsExpanded: vi.fn(),
        setUiWorkflow: vi.fn(),
        setUiMode: vi.fn(),
        setResultMessage: vi.fn(),
        refreshDisplayFormatting: vi.fn(),
        refreshLayoutControlsVisibility: vi.fn(),
        refreshMicPerformanceReadinessUi: vi.fn(),
        setNoteNamingPreference: vi.fn(),
        getEnabledStringsCount: vi.fn(() => 2),
        getEnabledStrings: vi.fn(() => ['E', 'A']),
        listMelodiesForCurrentInstrument,
        getAdjustedMelody: vi.fn((melody) => melody),
        isStringShiftFeasible: vi.fn(() => true),
        isDefaultStudyRange: vi.fn(() => false),
        isMelodyWorkflowMode: vi.fn(() => true),
        isCustomMelodyId: vi.fn(() => false),
        formatMelodyStudyRange: vi.fn(() => '1-2'),
        formatMelodyTransposeSemitones: vi.fn(() => '+2'),
        formatMelodyStringShift: vi.fn(() => '+1 string'),
        normalizeMelodyTransposeSemitones: vi.fn(() => 0),
        normalizeMelodyStringShift: vi.fn(() => 0),
        hasCompletedOnboarding: vi.fn(() => true),
        confirmUserAction: vi.fn(async () => true),
      },
      metronome: {
        metronome: {
          clampMetronomeBpm: vi.fn((value) => value),
          startMetronome: vi.fn(),
          stopMetronome: vi.fn(),
          setMetronomeTempo: vi.fn(async () => {}),
          subscribeMetronomeBeat: vi.fn(),
          saveSettings: vi.fn(),
          formatUserFacingError: vi.fn(),
          showNonBlockingError: vi.fn(),
        },
        melodyTempo: {
          getSelectedMelody: vi.fn(() => selectedMelody),
          syncMelodyDemoBpmDisplay: vi.fn(),
          syncMetronomeMeterFromSelectedMelody: vi.fn(),
          startMetronome: vi.fn(),
          stopMetronome: vi.fn(),
          setMetronomeTempo: vi.fn(async () => {}),
          isMetronomeRunning: vi.fn(() => false),
          showNonBlockingError: vi.fn(),
          formatUserFacingError: vi.fn(),
          isMelodyDemoPlaying: vi.fn(() => true),
          isMelodyWorkflowMode: vi.fn(() => true),
          isPerformanceStyleMode: vi.fn(() => false),
        },
        metronomeBridge: {
          clampMetronomeVolumePercent: vi.fn((value) => value),
          setMetronomeVolume: vi.fn(),
        },
        metronomeControls: {
          saveSettings: vi.fn(),
        },
      },
      curriculumPreset: {
        getClampedMetronomeBpmFromInput: vi.fn(() => 120),
        handleModeChange: vi.fn(),
        redrawFretboard: vi.fn(),
        saveSettings: vi.fn(),
        setResultMessage: vi.fn(),
        stopListening: vi.fn(),
      },
      inputControls: {
        micSettings: {
          ensureAudioRuntime: vi.fn(),
          refreshAudioInputDeviceOptions: vi.fn(),
          refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
          refreshMicPerformanceReadinessUi: vi.fn(),
          saveSettings: vi.fn(),
          setResultMessage: vi.fn(),
          formatUserFacingError: vi.fn(),
          showNonBlockingError: vi.fn(),
        },
        inputDevice: {
          normalizeAudioInputDeviceId: vi.fn(),
          setPreferredAudioInputDeviceId: vi.fn(),
          normalizeInputSource: vi.fn(),
          setInputSourcePreference: vi.fn(),
          refreshMidiInputDevices: vi.fn(),
          normalizeMidiInputDeviceId: vi.fn(),
          setPreferredMidiInputDeviceId: vi.fn(),
          stopMelodyDemoPlayback,
          stopListening: vi.fn(),
          saveSettings: vi.fn(),
          updateMicNoiseGateInfo,
          refreshMicPerformanceReadinessUi: vi.fn(),
          setResultMessage: vi.fn(),
        },
        micPolyphonicBenchmark: {
          detectMicPolyphonicFrame: vi.fn((input) => input),
          now: vi.fn(() => 1),
          setResultMessage: vi.fn(),
          showNonBlockingError: vi.fn(),
          formatUserFacingError: vi.fn(),
        },
        micPolyphonicTelemetry: {
          now: vi.fn(() => 2),
          getUserAgent: vi.fn(() => 'test-agent'),
          getHardwareConcurrency: vi.fn(() => 8),
          getAnalyserSampleRate: vi.fn(() => 44100),
          getAnalyserFftSize: vi.fn(() => 2048),
          downloadTextFile,
          resetTelemetry,
          refreshTelemetryUi: vi.fn(),
          setResultMessage: vi.fn(),
          showNonBlockingError: vi.fn(),
          formatUserFacingError: vi.fn(),
        },
      },
    } satisfies SessionConfigurationGraphDepsBuilderArgs;

    const result = buildSessionConfigurationGraphDeps(args);
    const firstInstrumentId = Object.keys(instruments)[0] as keyof typeof instruments;

    expect(result.metronome.melodyTempo.getSelectedMelody()).toBe(selectedMelody);
    expect(result.metronome.melodyTempo.isMelodyDemoPlaying()).toBe(true);
    expect(result.metronome.melodyTempo.state).not.toBe(state);
    expect(result.curriculumPreset.curriculumPreset.state).not.toBe(state);
    expect(result.inputControls.micSettings.state).not.toBe(state);
    expect(result.inputControls.inputDevice.state).not.toBe(state);
    expect(result.inputControls.micPolyphonicBenchmark.state).not.toBe(state);
    expect(result.inputControls.micPolyphonicTelemetry.state).not.toBe(state);

    result.metronome.melodyTempo.state.melodyTimelineZoomPercent = 140;
    result.curriculumPreset.curriculumPreset.state.showingAllNotes = true;
    result.curriculumPreset.curriculumPreset.applyEnabledStrings(['E']);
    expect(checkboxE.checked).toBe(true);
    expect(checkboxA.checked).toBe(false);

    result.inputControls.inputDevice.state.inputSource = 'midi';
    result.inputControls.micSettings.state.micSensitivityPreset = 'high';
    result.inputControls.inputDevice.stopMelodyDemoPlayback({ clearUi: true });
    result.inputControls.inputDevice.updateMicNoiseGateInfo();
    result.inputControls.micPolyphonicTelemetry.downloadTextFile(
      'telemetry.json',
      '{}',
      'application/json'
    );
    result.inputControls.micPolyphonicTelemetry.resetTelemetry();

    expect(stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(updateMicNoiseGateInfo).toHaveBeenCalledTimes(1);
    expect(state.melodyTimelineZoomPercent).toBe(140);
    expect(state.showingAllNotes).toBe(true);
    expect(state.inputSource).toBe('midi');
    expect(state.micSensitivityPreset).toBe('high');
    expect(downloadTextFile).toHaveBeenCalledWith('telemetry.json', '{}', 'application/json');
    expect(resetTelemetry).toHaveBeenCalledTimes(1);

    expect(result.workspaceGraph.resolveInstrumentById(firstInstrumentId)).toBe(
      instruments[firstInstrumentId]
    );
    expect(result.workspaceGraph.listMelodiesForCurrentInstrument()).toEqual([selectedMelody]);
    expect(listMelodiesForCurrentInstrument).toHaveBeenCalledTimes(1);
  });
});
