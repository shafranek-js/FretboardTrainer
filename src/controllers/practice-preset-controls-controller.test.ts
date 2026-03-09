import { describe, expect, it, vi } from 'vitest';
import { createPracticePresetControlsController } from './practice-preset-controls-controller';

type Listener = () => void;

function createInput(value = '') {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    checked: false,
    textContent: '',
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLInputElement & { listeners: Record<string, Listener>; textContent?: string };
}

function createSelect(value = '') {
  return createInput(value) as unknown as HTMLSelectElement & { listeners: Record<string, Listener> };
}

function createDeps() {
  const dom = {
    micDirectInputMode: createInput(),
    practiceInputPreset: createSelect('headphones_direct'),
    micSensitivityPreset: createSelect('normal'),
    micNoteAttackFilter: createSelect('balanced'),
    micNoteHoldFilter: createSelect('80ms'),
    performanceMicTolerancePreset: createSelect('normal'),
    performanceTimingLeniencyPreset: createSelect('normal'),
    practiceTimingPreset: createSelect('performance'),
    performanceMicLatencyCompensation: createInput('0'),
    performanceMicLatencyCompensationExact: createInput('0'),
    performanceMicLatencyCompensationValue: { textContent: '' } as HTMLElement,
  };
  return {
    dom,
    state: {
      isDirectInputMode: false,
      ignorePromptAudioUntilMs: 123,
      micSensitivityPreset: 'normal',
      micNoteAttackFilterPreset: 'balanced',
      micNoteHoldFilterPreset: '80ms',
      performanceMicTolerancePreset: 'normal',
      performanceTimingLeniencyPreset: 'normal',
      performanceMicLatencyCompensationMs: 0,
      micPerformanceSuggestedLatencyMs: 42,
      micPerformanceLatencyCalibrationActive: false,
      micPerformanceJudgmentCount: 4,
      micPerformanceJudgmentTotalLatencyMs: 100,
      micPerformanceJudgmentLastLatencyMs: 20,
      micPerformanceJudgmentMaxLatencyMs: 30,
    },
    refreshMicPerformanceReadinessUi: vi.fn(),
    syncPracticePresetUi: vi.fn(),
    updateMicNoiseGateInfo: vi.fn(),
    saveSettings: vi.fn(),
  };
}

describe('practice-preset-controls-controller', () => {
  it('toggles direct input mode and clears prompt ignore window', () => {
    const deps = createDeps();
    const controller = createPracticePresetControlsController(deps);

    controller.register();
    deps.dom.micDirectInputMode.checked = true;
    deps.dom.micDirectInputMode.listeners.change();

    expect(deps.state.isDirectInputMode).toBe(true);
    expect(deps.state.ignorePromptAudioUntilMs).toBe(0);
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
    expect(deps.syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('applies a non-custom practice input preset to underlying fields', () => {
    const deps = createDeps();
    const controller = createPracticePresetControlsController(deps);

    controller.register();
    deps.dom.practiceInputPreset.value = 'headphones_direct';
    deps.dom.practiceInputPreset.listeners.change();

    expect(deps.state.isDirectInputMode).toBe(true);
    expect(deps.dom.micDirectInputMode.checked).toBe(true);
    expect(deps.updateMicNoiseGateInfo).toHaveBeenCalledTimes(1);
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
    expect(deps.syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('applies timing preset and normalizes direct tolerance fields', () => {
    const deps = createDeps();
    const controller = createPracticePresetControlsController(deps);

    controller.register();
    deps.dom.practiceTimingPreset.value = 'performance';
    deps.dom.practiceTimingPreset.listeners.change();

    expect(deps.dom.performanceMicTolerancePreset.value.length).toBeGreaterThan(0);
    expect(deps.dom.performanceTimingLeniencyPreset.value.length).toBeGreaterThan(0);
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
    expect(deps.syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('updates latency compensation from slider and suggested action', () => {
    const deps = createDeps();
    const controller = createPracticePresetControlsController(deps);

    controller.register();
    deps.dom.performanceMicLatencyCompensation.value = '17';
    deps.dom.performanceMicLatencyCompensation.listeners.input();
    controller.applySuggestedMicLatency();

    expect(deps.state.performanceMicLatencyCompensationMs).toBe(42);
    expect(deps.dom.performanceMicLatencyCompensation.value).toBe('42');
    expect(deps.dom.performanceMicLatencyCompensationExact.value).toBe('42');
    expect(deps.dom.performanceMicLatencyCompensationValue.textContent).toBe('42 ms');
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(2);
    expect(deps.saveSettings).toHaveBeenCalledTimes(2);
  });

  it('starts latency calibration by resetting telemetry counters', () => {
    const deps = createDeps();
    const controller = createPracticePresetControlsController(deps);

    controller.startMicLatencyCalibration();

    expect(deps.state.micPerformanceLatencyCalibrationActive).toBe(true);
    expect(deps.state.micPerformanceJudgmentCount).toBe(0);
    expect(deps.state.micPerformanceJudgmentTotalLatencyMs).toBe(0);
    expect(deps.state.micPerformanceJudgmentLastLatencyMs).toBeNull();
    expect(deps.state.micPerformanceJudgmentMaxLatencyMs).toBe(0);
    expect(deps.state.micPerformanceSuggestedLatencyMs).toBeNull();
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
  });
});
