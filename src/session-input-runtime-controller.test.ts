import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionInputRuntimeController } from './session-input-runtime-controller';

function createState(overrides = {}) {
  return {
    inputSource: 'microphone' as const,
    preferredAudioInputDeviceId: 'mic-1',
    audioContext: null as {
      state: 'running' | 'suspended';
      resume: () => Promise<void>;
    } | null,
    isListening: true,
    cooldown: false,
    isCalibrating: false,
    performanceMicHoldCalibrationLevel: 'off' as const,
    performanceMicLastJudgedOnsetNote: 'E4',
    performanceMicLastJudgedOnsetAtMs: 100,
    performanceMicLastUncertainOnsetNote: 'F4',
    performanceMicLastUncertainOnsetAtMs: 120,
    micLastInputRms: 0.2,
    micLastMonophonicConfidence: 0.95,
    micLastMonophonicPitchSpreadCents: 8,
    micLastMonophonicDetectedAtMs: 222,
    currentMelodyId: null as string | null,
    ...overrides,
  };
}

function createDom(overrides = {}) {
  return {
    trainingMode: { value: 'performance' },
    inputSource: { value: 'microphone' },
    melodySelector: { value: 'builtin:guitar:ode_to_joy_intro' },
    ...overrides,
  };
}

function createDeps(stateOverrides = {}, domOverrides = {}) {
  const state = createState(stateOverrides);
  const dom = createDom(domOverrides);
  const midiHandler = { kind: 'handler' } as never;
  const deps = {
    dom,
    state,
    normalizeInputSource: vi.fn((value: unknown) => (value === 'midi' ? 'midi' : 'microphone')),
    setInputSourcePreference: vi.fn((inputSource: 'microphone' | 'midi') => {
      state.inputSource = inputSource;
    }),
    resolveSessionMicHoldCalibrationLevel: vi.fn(() => 'balanced'),
    resetReadinessAndJudgmentTelemetry: vi.fn(),
    resetOnsetGateStatus: vi.fn(),
    resetOnsetRejectTelemetry: vi.fn(),
    clearPerformanceTimelineFeedback: vi.fn(),
    resetMicPolyphonicDetectorTelemetry: vi.fn(),
    clearAudioInputGuidanceError: vi.fn(),
    refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
    refreshMicPerformanceReadinessUi: vi.fn(),
    createMidiSessionMessageHandler: vi.fn(() => midiHandler),
    startMidiInput: vi.fn(async () => {}),
    ensureAudioRuntime: vi.fn(async () => {}),
    refreshAudioInputDeviceOptions: vi.fn(async () => {}),
    isPerformanceStyleMode: vi.fn((trainingMode: string) => trainingMode === 'performance' || trainingMode === 'practice'),
    getCurrentModeDetectionType: vi.fn(() => 'monophonic'),
    handleMelodyUpdate: vi.fn(),
    handlePolyphonicUpdate: vi.fn(),
    clearLiveDetectedHighlight: vi.fn(),
    handleStableMonophonicDetectedNote: vi.fn(),
    onRuntimeError: vi.fn(),
    warn: vi.fn(),
  };

  return { state, dom, deps, midiHandler };
}

describe('session-input-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepares MIDI input sessions and resets performance telemetry', async () => {
    const { state, deps, midiHandler } = createDeps({}, { inputSource: { value: 'midi' } });
    const controller = createSessionInputRuntimeController(deps);

    const result = await controller.prepareSessionInput(false);

    expect(result.selectedInputSource).toBe('midi');
    expect(deps.setInputSourcePreference).toHaveBeenCalledWith('midi');
    expect(state.performanceMicHoldCalibrationLevel).toBe('balanced');
    expect(state.performanceMicLastJudgedOnsetNote).toBeNull();
    expect(state.performanceMicLastJudgedOnsetAtMs).toBeNull();
    expect(state.performanceMicLastUncertainOnsetNote).toBeNull();
    expect(state.performanceMicLastUncertainOnsetAtMs).toBeNull();
    expect(state.micLastInputRms).toBe(0);
    expect(state.micLastMonophonicConfidence).toBeNull();
    expect(state.micLastMonophonicPitchSpreadCents).toBeNull();
    expect(state.micLastMonophonicDetectedAtMs).toBeNull();
    expect(state.currentMelodyId).toBe('builtin:guitar:ode_to_joy_intro');
    expect(deps.resetReadinessAndJudgmentTelemetry).toHaveBeenCalledTimes(1);
    expect(deps.resetOnsetGateStatus).toHaveBeenCalledTimes(1);
    expect(deps.resetOnsetRejectTelemetry).toHaveBeenCalledTimes(1);
    expect(deps.clearPerformanceTimelineFeedback).toHaveBeenCalledTimes(1);
    expect(deps.resetMicPolyphonicDetectorTelemetry).toHaveBeenCalledTimes(1);
    expect(deps.clearAudioInputGuidanceError).not.toHaveBeenCalled();
    expect(deps.ensureAudioRuntime).not.toHaveBeenCalled();
    expect(deps.refreshAudioInputDeviceOptions).not.toHaveBeenCalled();
    expect(deps.createMidiSessionMessageHandler).toHaveBeenCalledTimes(1);
    expect(deps.startMidiInput).toHaveBeenCalledWith(midiHandler);
  });

  it('prepares microphone runtime with low-latency analyser profile and resumes audio context', async () => {
    const { state, deps } = createDeps();
    const resume = vi.fn(async () => {
      state.audioContext!.state = 'running';
    });
    state.audioContext = { state: 'suspended', resume };
    const controller = createSessionInputRuntimeController(deps);

    const result = await controller.prepareSessionInput(false);

    expect(result.selectedInputSource).toBe('microphone');
    expect(deps.ensureAudioRuntime).toHaveBeenCalledWith(state, {
      audioInputDeviceId: 'mic-1',
      analyserProfile: 'low-latency-performance',
    });
    expect(deps.refreshAudioInputDeviceOptions).toHaveBeenCalledTimes(1);
    expect(deps.clearAudioInputGuidanceError).toHaveBeenCalledTimes(1);
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).toHaveBeenCalledTimes(1);
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(deps.startMidiInput).not.toHaveBeenCalled();
  });

  it('throws when microphone audio context remains suspended after resume attempt', async () => {
    const resume = vi.fn(async () => {});
    const { deps } = createDeps({
      audioContext: { state: 'suspended' as const, resume },
    });
    const controller = createSessionInputRuntimeController(deps);

    await expect(controller.prepareSessionInput(false)).rejects.toThrow(
      'Audio context is suspended. Click anywhere in the page and press Start Session again.'
    );
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
