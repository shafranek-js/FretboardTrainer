import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from './types';
import { createSessionDisplayResultRuntimeController } from './session-display-result-runtime-controller';

const displayResultSuccessFlowMocks = vi.hoisted(() => ({
  executeDisplayResultSuccessFlow: vi.fn(),
}));

vi.mock('./display-result-success-flow-executor', () => ({
  executeDisplayResultSuccessFlow: displayResultSuccessFlowMocks.executeDisplayResultSuccessFlow,
}));

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    displayText: 'Find: E',
    targetNote: 'E',
    targetString: 'A',
    targetChordNotes: [],
    targetChordFingering: [],
    baseChordName: null,
    ...overrides,
  };
}

function createDeps(overrides = {}) {
  const state = {
    currentPrompt: createPrompt(),
    activeSessionStats: { correctAttempts: 2 },
    currentInstrument: { name: 'Guitar' },
    currentArpeggioIndex: 3,
    showingAllNotes: false,
    sessionPace: 'normal' as const,
    showSessionSummaryOnStop: false,
    currentMelodyEventIndex: 4,
    currentScore: 10,
    ...overrides,
  };
  const deps = {
    dom: { sessionGoal: { value: 'correct_10' } },
    state,
    getTrainingMode: vi.fn(() => 'random'),
    getMode: vi.fn(() => ({ detectionType: 'monophonic' as const })),
    recordSessionAttempt: vi.fn(),
    updateStats: vi.fn(),
    setInfoSlots: vi.fn(),
    setSessionGoalProgress: vi.fn(),
    stopListening: vi.fn(),
    setResultMessage: vi.fn(),
    setScoreValue: vi.fn(),
    setTunerVisible: vi.fn(),
    redrawFretboard: vi.fn(),
    drawFretboard: vi.fn(),
    scheduleSessionTimeout: vi.fn(),
    scheduleSessionCooldown: vi.fn(),
    nextPrompt: vi.fn(),
  };

  return { state, deps };
}

describe('session-display-result-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    displayResultSuccessFlowMocks.executeDisplayResultSuccessFlow.mockReturnValue('success_plan_executed');
  });

  it('records attempts and stats for incorrect answers without running success flow', () => {
    const { state, deps } = createDeps();
    const controller = createSessionDisplayResultRuntimeController(deps);

    controller.handleResult(false, 1.25);

    expect(deps.recordSessionAttempt).toHaveBeenCalledWith(
      state.activeSessionStats,
      state.currentPrompt,
      false,
      1.25,
      state.currentInstrument
    );
    expect(deps.updateStats).toHaveBeenCalledWith(false, 1.25);
    expect(displayResultSuccessFlowMocks.executeDisplayResultSuccessFlow).not.toHaveBeenCalled();
  });

  it('wires correct answers into the success flow with mutable session callbacks', () => {
    const { state, deps } = createDeps();
    displayResultSuccessFlowMocks.executeDisplayResultSuccessFlow.mockImplementation((_input, flowDeps) => {
      flowDeps.requestSessionSummaryOnStop();
      flowDeps.setCurrentArpeggioIndex(7);
      flowDeps.advanceMelodyPromptIndex();
      flowDeps.addScore(5);
      return 'success_plan_executed';
    });
    const controller = createSessionDisplayResultRuntimeController(deps);

    controller.handleResult(true, 0.75);

    expect(deps.recordSessionAttempt).toHaveBeenCalledWith(
      state.activeSessionStats,
      state.currentPrompt,
      true,
      0.75,
      state.currentInstrument
    );
    expect(deps.updateStats).toHaveBeenCalledWith(true, 0.75);
    expect(displayResultSuccessFlowMocks.executeDisplayResultSuccessFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: state.currentPrompt,
        trainingMode: 'random',
        modeDetectionType: 'monophonic',
        elapsedSeconds: 0.75,
        currentArpeggioIndex: 3,
        showingAllNotes: false,
        sessionPace: 'normal',
        goalTargetCorrect: 10,
        correctAttempts: 2,
      }),
      expect.any(Object)
    );
    expect(state.showSessionSummaryOnStop).toBe(true);
    expect(state.currentArpeggioIndex).toBe(7);
    expect(state.currentMelodyEventIndex).toBe(4);
    expect(state.currentScore).toBe(15);
  });

  it('only advances melody prompt index when the current mode is melody', () => {
    const { state, deps } = createDeps();
    deps.getTrainingMode = vi.fn(() => 'melody');
    displayResultSuccessFlowMocks.executeDisplayResultSuccessFlow.mockImplementation((_input, flowDeps) => {
      flowDeps.advanceMelodyPromptIndex();
      return 'success_plan_executed';
    });
    const controller = createSessionDisplayResultRuntimeController(deps);

    controller.handleResult(true, 0.5);

    expect(state.currentMelodyEventIndex).toBe(5);
  });
});
