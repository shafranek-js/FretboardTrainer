import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStartRuntimeController } from './session-start-runtime-controller';

function createState(overrides = {}) {
  return {
    isCalibrating: false,
    calibrationFrequencies: [440, 441],
    pendingTimeoutIds: new Set([1, 2]),
    performanceRuntimeStartedAtMs: 1000,
    performancePrerollLeadInVisible: true,
    performancePrerollStartedAtMs: 900,
    performancePrerollDurationMs: 1200,
    performancePrerollStepIndex: 2,
    performanceActiveEventIndex: 7,
    performanceRunCompleted: true,
    currentInstrument: {
      CHORD_PROGRESSIONS: { I_IV_V: ['C', 'F', 'G'] },
    },
    melodyTransposeSemitones: 2,
    melodyStringShift: 1,
    timeLeft: 0,
    currentScore: 0,
    timerId: null as number | null,
    currentProgression: ['old'],
    currentProgressionIndex: 9,
    currentArpeggioIndex: 5,
    ...overrides,
  };
}

function createDom(overrides = {}) {
  return {
    trainingMode: { value: 'performance' },
    progressionSelector: { value: 'I_IV_V' },
    melodySelector: { value: 'builtin:guitar:ode_to_joy_intro' },
    sessionGoal: { value: 'correct_10' },
    ...overrides,
  };
}

function createDeps(stateOverrides = {}, domOverrides = {}, planOverrides = {}) {
  const state = createState(stateOverrides);
  const dom = createDom(domOverrides);
  const plan = {
    shouldStart: true,
    errorMessage: null,
    sessionButtons: { startHidden: true, stopHidden: false, playSoundDisabled: false },
    timed: { enabled: false, durationSeconds: 60, initialScore: 0 },
    progression: { isRequired: false, selected: [] },
    resetArpeggioIndex: false,
    ...planOverrides,
  };
  const deps = {
    dom,
    state,
    isPerformanceStyleMode: vi.fn((trainingMode: string) => trainingMode === 'performance' || trainingMode === 'practice'),
    stopPerformanceTransportLoop: vi.fn(),
    clearTrackedTimeouts: vi.fn(),
    invalidatePendingAdvance: vi.fn(),
    getModeDetectionType: vi.fn(() => 'monophonic'),
    timedDurationSeconds: 30,
    buildSessionStartPlan: vi.fn(() => plan),
    setSessionButtonsState: vi.fn(),
    setTimerValue: vi.fn(),
    setScoreValue: vi.fn(),
    setTimedInfoVisible: vi.fn(),
    clearSessionGoalProgress: vi.fn(),
    createTimedSessionIntervalHandler: vi.fn(() => vi.fn()),
    setInterval: vi.fn(() => 77),
    handleTimeUp: vi.fn(),
    onRuntimeError: vi.fn(),
    setSessionGoalProgress: vi.fn(),
  };

  return { state, dom, deps, plan };
}

describe('session-start-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepares calibration sessions by resetting calibration capture state', () => {
    const { state, deps } = createDeps();
    const controller = createSessionStartRuntimeController(deps);

    const result = controller.prepare(true);

    expect(result).toEqual({ shouldProceed: true, errorMessage: null });
    expect(state.isCalibrating).toBe(true);
    expect(state.calibrationFrequencies).toEqual([]);
    expect(deps.buildSessionStartPlan).not.toHaveBeenCalled();
  });

  it('resets performance runtime state and configures timed sessions from the start plan', () => {
    const { state, deps, plan } = createDeps(
      {},
      {},
      {
        timed: { enabled: true, durationSeconds: 45, initialScore: 3 },
        progression: { isRequired: true, selected: ['C', 'F', 'G'] },
        resetArpeggioIndex: true,
      }
    );
    const controller = createSessionStartRuntimeController(deps);

    const result = controller.prepare(false);

    expect(result).toEqual({ shouldProceed: true, errorMessage: null });
    expect(deps.stopPerformanceTransportLoop).toHaveBeenCalledTimes(1);
    expect(deps.clearTrackedTimeouts).toHaveBeenCalledWith(state.pendingTimeoutIds);
    expect(deps.invalidatePendingAdvance).toHaveBeenCalledTimes(1);
    expect(state.performanceRuntimeStartedAtMs).toBeNull();
    expect(state.performancePrerollLeadInVisible).toBe(false);
    expect(state.performancePrerollStartedAtMs).toBeNull();
    expect(state.performancePrerollDurationMs).toBe(0);
    expect(state.performancePrerollStepIndex).toBeNull();
    expect(state.performanceActiveEventIndex).toBeNull();
    expect(state.performanceRunCompleted).toBe(false);
    expect(deps.setSessionButtonsState).toHaveBeenCalledWith(plan.sessionButtons);
    expect(state.timeLeft).toBe(45);
    expect(state.currentScore).toBe(3);
    expect(deps.setTimerValue).toHaveBeenCalledWith(45);
    expect(deps.setScoreValue).toHaveBeenCalledWith(3);
    expect(deps.setTimedInfoVisible).toHaveBeenCalledWith(true);
    expect(state.timerId).toBe(77);
    expect(deps.createTimedSessionIntervalHandler).toHaveBeenCalledTimes(1);
    expect(deps.setInterval).toHaveBeenCalledTimes(1);
    expect(state.currentProgression).toEqual(['C', 'F', 'G']);
    expect(state.currentProgressionIndex).toBe(0);
    expect(state.currentArpeggioIndex).toBe(0);
  });

  it('returns the start-plan error without applying goal progress when session should not start', () => {
    const { deps } = createDeps(
      {},
      { trainingMode: { value: 'melody' } },
      {
        shouldStart: false,
        errorMessage: 'Select a melody first.',
      }
    );
    const controller = createSessionStartRuntimeController(deps);

    const result = controller.prepare(false);

    expect(result).toEqual({ shouldProceed: false, errorMessage: 'Select a melody first.' });
    expect(deps.setSessionGoalProgress).not.toHaveBeenCalled();
  });
});

