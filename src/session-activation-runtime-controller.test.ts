import { describe, expect, it, vi, beforeEach } from 'vitest';
import { instruments } from './instruments';
import { createSessionActivationRuntimeController } from './session-activation-runtime-controller';

const melodyLibraryMocks = vi.hoisted(() => ({
  getMelodyById: vi.fn((melodyId: string) => {
    if (melodyId !== 'builtin:guitar:compound') return null;
    return {
      id: 'builtin:guitar:compound',
      name: 'Compound Time Tune',
      source: 'builtin' as const,
      instrumentName: 'guitar' as const,
      events: [{ durationBeats: 1, notes: [{ note: 'E4', stringName: 'e', fret: 0 }] }],
      sourceTimeSignature: '6/8',
    };
  }),
}));

vi.mock('./melody-library', () => ({
  getMelodyById: melodyLibraryMocks.getMelodyById,
}));

function createDeps() {
  const state = {
    isListening: true,
    activeSessionStats: null,
    currentInstrument: instruments.guitar,
    currentTuningPresetKey: 'standard',
    melodyStudyRangeStartIndex: 2,
    melodyStudyRangeEndIndex: 5,
    melodyTransposeSemitones: 1,
    melodyStringShift: -1,
    pendingTimeoutIds: new Set<number>(),
  };
  const dom = {
    trainingMode: { value: 'performance', selectedOptions: [{ textContent: 'Performance' }] },
    melodySelector: { value: 'builtin:guitar:compound' },
    melodyDemoBpm: { value: '120' },
    startFret: { value: '1' },
    endFret: { value: '5' },
    stringSelector: {} as never,
    audioInputDevice: { selectedOptions: [{ textContent: 'USB Mic' }] },
    midiInputDevice: { selectedOptions: [{ textContent: 'Launchkey' }] },
  };
  const executeSessionRuntimeActivation = vi.fn();
  const deps = {
    dom,
    state,
    getSelectedFretRange: vi.fn(() => ({ minFret: 1, maxFret: 5 })),
    getEnabledStrings: vi.fn(() => new Set(['E', 'A'])),
    executeSessionRuntimeActivation,
    setIsListening: vi.fn(),
    setActiveSessionStats: vi.fn(),
    resetPromptCycleTracking: vi.fn(),
    setStatusText: vi.fn(),
    processAudio: vi.fn(),
    nextPrompt: vi.fn(),
    setPromptText: vi.fn(),
    setResultMessage: vi.fn(),
    clearResultMessage: vi.fn(),
    applyInitialTimelinePreview: vi.fn(),
    clearInitialTimelinePreview: vi.fn(),
    startRuntimeClock: vi.fn(),
    beginPrerollTimeline: vi.fn(),
    advancePrerollTimeline: vi.fn(),
    finishPrerollTimeline: vi.fn(),
    playMetronomeCue: vi.fn(async () => {}),
    scheduleSessionTimeout: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
  };

  return { state, dom, deps, executeSessionRuntimeActivation };
}

describe('session-activation-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a meter-aware initial prompt plan for performance sessions', () => {
    const { deps } = createDeps();
    const controller = createSessionActivationRuntimeController(deps);

    const plan = controller.buildActivationInitialPromptPlan(false);

    expect(plan).toEqual({
      delayMs: Math.round((60000 / 120) * (4 / 8) * 6),
      prepMessage: 'Get ready...',
      pulseCount: 6,
      secondaryAccentStepIndices: [3],
    });
  });

  it('runs preroll prompt scheduling before advancing to the first prompt', () => {
    const { state, deps } = createDeps();
    const controller = createSessionActivationRuntimeController(deps);

    controller.runInitialPrompt({
      delayMs: 1500,
      prepMessage: 'Get ready...',
      pulseCount: 3,
      secondaryAccentStepIndices: [1],
    });

    expect(deps.setPromptText).toHaveBeenCalledWith('');
    expect(deps.setResultMessage).toHaveBeenCalledWith('Get ready...');
    expect(deps.applyInitialTimelinePreview).toHaveBeenCalledWith('Get ready...');
    expect(deps.beginPrerollTimeline).toHaveBeenCalledWith(3, 1500);
    expect(deps.playMetronomeCue).toHaveBeenCalledWith(true);
    expect(deps.scheduleSessionTimeout).toHaveBeenCalledTimes(3);

    const secondPulse = deps.scheduleSessionTimeout.mock.calls[0];
    expect(secondPulse[0]).toBe(500);
    expect(secondPulse[2]).toBe('session initial prompt preroll pulse 2');
    secondPulse[1]();
    expect(deps.playMetronomeCue).toHaveBeenLastCalledWith(true);
    expect(deps.advancePrerollTimeline).toHaveBeenCalledWith(1, 3);

    const finalAdvance = deps.scheduleSessionTimeout.mock.calls[2];
    expect(finalAdvance[0]).toBe(1500);
    finalAdvance[1]();
    expect(deps.finishPrerollTimeline).toHaveBeenCalledTimes(1);
    expect(deps.clearInitialTimelinePreview).toHaveBeenCalledTimes(1);
    expect(deps.clearResultMessage).toHaveBeenCalledTimes(1);
    expect(deps.startRuntimeClock).toHaveBeenCalledTimes(1);
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
    expect(state.isListening).toBe(true);
  });

  it('wraps session activation with the preroll-aware nextPrompt callback', () => {
    const { deps, executeSessionRuntimeActivation } = createDeps();
    const controller = createSessionActivationRuntimeController(deps);

    controller.activateSession(false, 'microphone');

    expect(executeSessionRuntimeActivation).toHaveBeenCalledTimes(1);
    const [input, runtimeDeps] = executeSessionRuntimeActivation.mock.calls[0];
    expect(input).toEqual(
      expect.objectContaining({
        forCalibration: false,
        selectedInputSource: 'microphone',
        sessionInputSource: 'microphone',
        modeKey: 'performance',
        modeLabel: 'Performance',
        instrumentName: instruments.guitar.name,
        tuningPresetKey: 'standard',
        enabledStrings: ['E', 'A'],
        minFret: 1,
        maxFret: 5,
        melodyId: 'builtin:guitar:compound',
        melodyStudyRangeStartIndex: 2,
        melodyStudyRangeEndIndex: 5,
        melodyTransposeSemitones: 1,
        melodyStringShift: -1,
        audioInputDeviceLabel: 'USB Mic',
        midiInputDeviceLabel: 'Launchkey',
      })
    );
    expect(runtimeDeps.processAudio).toBe(deps.processAudio);
    runtimeDeps.nextPrompt();
    expect(deps.beginPrerollTimeline).toHaveBeenCalledTimes(1);
  });
});
